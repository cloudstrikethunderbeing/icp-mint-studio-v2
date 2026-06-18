import Queue "mo:core/Queue";
import Result "mo:core/Result";
import Principal "mo:core/Principal";
import NftLib "../lib/nft";
import ClaimLib "../lib/claim-link";
import NftTypes "../types/nft";
import ClaimTypes "../types/claim-link";
import Common "../types/common";
import Random "mo:core/Random";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import UserLib "../lib/user";

mixin (
  adminPrincipal : ?Principal,
  nftStore : NftLib.NftStore,
  claimTokenStore : ClaimLib.ClaimTokenStore,
  nftToClaimToken : ClaimLib.NftToClaimStore,
  globalAuditLog : Queue.Queue<Common.AuditEntry>,
  userStore : UserLib.UserStore,
) {

  /// Admin-only: generate a shareable claim URL for a specific NFT.
  /// Returns the relative path "/claim/" # token.
  public shared ({ caller }) func generateClaimLink(nftId : Nat) : async Result.Result<Text, Text> {
    // Tier check: admin or paid tiers only (Creator, Pro, Org)
    let callerProfile = switch (UserLib.getProfile(userStore, caller)) {
      case (?profile) { profile };
      case (null) {
        return #err("User profile not found. Please create a profile first.");
      };
    };
    let isAdmin = switch (adminPrincipal) {
      case (?admin) { Principal.equal(admin, caller) };
      case (null) { false };
    };
    let isPaidTier = switch (callerProfile.subscriptionTier) {
      case (#creator) { true };
      case (#pro) { true };
      case (#org) { true };
      case (_) { false };
    };
    if (not isAdmin and not isPaidTier) {
      return #err("Free tier cannot generate claim links. Upgrade to Creator, Pro, or Org.");
    };
    // Fetch NFT, validate it exists and is active
    switch (nftStore.get(nftId)) {
      case (null) { return #err("NFT not found") };
      case (?nft) {
        if (nft.status != #active) {
          return #err("Cannot generate claim link: NFT is not active");
        };
        // Use ICP randomness for unpredictable token
        let randomBytes = await Random.blob();
        let token = ClaimLib.buildToken(randomBytes);
        let now = Time.now();
        ClaimLib.storeToken(claimTokenStore, nftToClaimToken, nftId, token, now);
        #ok("/claim/" # token)
      };
    }
  };

  /// Admin-only: return claim status for a given NFT.
  public query ({ caller }) func getClaimStatus(nftId : Nat) : async Result.Result<ClaimTypes.ClaimStatus, Text> {
    // Admin-only guard
    switch (adminPrincipal) {
      case (null) { return #err("Unauthorized: No admin configured") };
      case (?admin) {
        if (not Principal.equal(admin, caller)) {
          return #err("Unauthorized: Admin only");
        };
      };
    };
    switch (ClaimLib.getTokenForNft(nftToClaimToken, nftId)) {
      case (null) {
        // No token ever generated for this NFT
        #ok({ token = ""; claimed = false; claimedBy = null })
      };
      case (?tokenStr) {
        switch (ClaimLib.getToken(claimTokenStore, tokenStr)) {
          case (null) {
            // Token entry missing (shouldn't happen, but handle gracefully)
            #ok({ token = tokenStr; claimed = false; claimedBy = null })
          };
          case (?claimToken) {
            #ok({
              token = tokenStr;
              claimed = claimToken.usedBy != null;
              claimedBy = claimToken.usedBy;
            })
          };
        }
      };
    }
  };

  /// Public: claim an NFT by presenting a valid token.
  /// Atomically transfers ownership to msg.caller.
  public shared ({ caller }) func claimNft(token : Text) : async Result.Result<NftTypes.Nft, Text> {
    // Reject anonymous callers
    if (caller.isAnonymous()) {
      return #err("Authentication required to claim an NFT");
    };
    // Validate token exists
    let claimToken = switch (ClaimLib.getToken(claimTokenStore, token)) {
      case (null) { return #err("Invalid or expired claim token") };
      case (?ct) { ct };
    };
    // Validate not already claimed
    if (claimToken.usedBy != null) {
      return #err("This NFT has already been claimed");
    };
    // Fetch NFT and validate it is active
    let nft = switch (nftStore.get(claimToken.nftId)) {
      case (null) { return #err("NFT not found") };
      case (?n) { n };
    };
    switch (ClaimLib.assertClaimable(nft, claimToken)) {
      case (#err(msg)) { return #err(msg) };
      case (#ok(())) {};
    };
    // Atomically: mark token used and transfer ownership
    let now = Time.now();
    let nowNat = Int.abs(now);
    switch (ClaimLib.useToken(claimTokenStore, token, caller, now)) {
      case (#err(msg)) { return #err(msg) };
      case (#ok(_)) {};
    };
    // Build audit entry for the NFT
    let auditEntry : Common.AuditEntry = {
      action = "NFT_CLAIMED";
      caller;
      timestamp = nowNat;
      details = ?("Claimed via token: " # token);
    };
    let nftWithAudit = NftLib.addAuditEntry(nft, auditEntry);
    // Transfer ownership to claimer, recording the claim timestamp
    let updatedNft : NftTypes.Nft = { nftWithAudit with ownerId = caller; claimedAt = ?nowNat };
    nftStore.add(claimToken.nftId, updatedNft);
    // Append to global audit log
    let globalEntry : Common.AuditEntry = {
      action = "NFT_CLAIMED";
      caller;
      timestamp = nowNat;
      details = ?("NFT " # claimToken.nftId.toText() # " claimed by " # caller.toText() # " token=" # token);
    };
    globalAuditLog.pushBack(globalEntry);
    // Cap audit log at 500 entries
    if (globalAuditLog.size() > 500) {
      ignore globalAuditLog.popFront();
    };
    #ok(updatedNft)
  };

  /// Public (unauthenticated): retrieve NFT metadata for the claim page preview.
  /// Does NOT modify state; returns error if token invalid or NFT not claimable.
  public query func getClaimPreview(token : Text) : async Result.Result<NftTypes.Nft, Text> {
    // Validate token exists
    let claimToken = switch (ClaimLib.getToken(claimTokenStore, token)) {
      case (null) { return #err("Invalid or expired claim token") };
      case (?ct) { ct };
    };
    // Validate not already claimed
    if (claimToken.usedBy != null) {
      return #err("This NFT has already been claimed");
    };
    // Fetch NFT and validate it is active
    switch (nftStore.get(claimToken.nftId)) {
      case (null) { #err("NFT not found") };
      case (?nft) {
        if (nft.status != #active) {
          return #err("NFT is not available for claiming");
        };
        #ok(nft)
      };
    }
  };
}
