import Queue "mo:core/Queue";
import Result "mo:core/Result";
import Principal "mo:core/Principal";
import Auth "../lib/auth";
import NftLib "../lib/nft";
import ClaimLib "../lib/claim-link";
import NftTypes "../types/nft";
import ClaimTypes "../types/claim-link";
import Common "../types/common";
import Time "mo:core/Time";
import UserLib "../lib/user";
import Random "mo:core/Random";

mixin (
  nftStore : NftLib.NftStore,
  claimTokenStore : ClaimLib.ClaimTokenStore,
  nftToClaimToken : ClaimLib.NftToClaimStore,
  globalAuditLog : Queue.Queue<Common.AuditEntry>,
  userStore : UserLib.UserStore,
  nextNftId : { var value : Nat },
  selfCanisterId : { var value : Text },
  admins : [Principal],
) {

  /// Admin-only: generate a shareable claim URL for a specific NFT.
  /// Returns the relative path "/claim/" # token.
  public shared ({ caller }) func generateClaimLink(nftId : Nat) : async Result.Result<Text, Text> {
    // Admin check FIRST — bypass profile fetch and tier check entirely
    if (not Auth.isAdmin(caller, admins)) {
      // Non-admin: fetch profile and enforce tier restriction
      let callerProfile = switch (UserLib.getProfile(userStore, caller)) {
        case (?profile) { profile };
        case (null) {
          return #err("User profile not found. Please create a profile first.");
        };
      };
      let isPaidTier = switch (callerProfile.subscriptionTier) {
        case (#creator) { true };
        case (#pro) { true };
        case (#org) { true };
        case (_) { false };
      };
      if (not isPaidTier) {
        return #err("Free tier cannot generate claim links. Upgrade to Creator, Pro, or Org.");
      };
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
        ClaimLib.storeToken(claimTokenStore, nftToClaimToken, nftId, token, now, nft.supplyLimit, 0);
        #ok("/claim/" # token)
      };
    }
  };

  /// Admin-only: return claim status for a given NFT.
  public query ({ caller }) func getClaimStatus(nftId : Nat) : async Result.Result<ClaimTypes.ClaimStatus, Text> {
    // Admin-only guard using Auth
    if (not Auth.isAdmin(caller, admins)) {
      return #err("Unauthorized: Admin only");
    };
    switch (ClaimLib.getTokenForNft(nftToClaimToken, nftId)) {
      case (null) {
        // No token ever generated for this NFT
        #ok({ token = ""; claimed = false; claimedBy = null; supplyLimit = 0; claimedCount = 0 })
      };
      case (?tokenStr) {
        switch (ClaimLib.getToken(claimTokenStore, tokenStr)) {
          case (null) {
            // Token entry missing (shouldn't happen, but handle gracefully)
            #ok({ token = tokenStr; claimed = false; claimedBy = null; supplyLimit = 0; claimedCount = 0 })
          };
          case (?claimToken) {
            #ok({
              token = tokenStr;
              claimed = claimToken.usedBy != null;
              claimedBy = claimToken.usedBy;
              supplyLimit = claimToken.supplyLimit;
              claimedCount = claimToken.claimedCount;
            })
          };
        }
      };
    }
  };

  /// Public: claim an NFT by presenting a valid token.
  /// Creates a NEW NFT copy from the master; master NFT is never modified.
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
    // Check supply cap
    if (claimToken.claimedCount >= claimToken.supplyLimit) {
      return #err("This drop is sold out");
    };
    // Fetch master NFT and validate it is active
    let masterNft = switch (nftStore.get(claimToken.nftId)) {
      case (null) { return #err("NFT not found") };
      case (?n) { n };
    };
    switch (ClaimLib.assertClaimable(masterNft, claimToken)) {
      case (#err(msg)) { return #err(msg) };
      case (#ok(())) {};
    };
    // Atomically: mark token used with incremented count
    let now = Time.now();
    let nowNat = Int.abs(now);
    let newClaimedCount = claimToken.claimedCount + 1;
    switch (ClaimLib.useToken(claimTokenStore, token, caller, now, newClaimedCount)) {
      case (#err(msg)) { return #err(msg) };
      case (#ok(_)) {};
    };
    // Create a NEW NFT copied from the master
    let newId = nextNftId.value;
    nextNftId.value += 1;
    let newNftUniqueId = selfCanisterId.value # ":0:" # newId.toText();
    let newAuditEntry : Common.AuditEntry = {
      action = "NFT_CLAIMED";
      caller;
      timestamp = nowNat;
      details = ?("Claimed via token: " # token);
    };
    let newNft : NftTypes.Nft = {
      masterNft with
      id = newId;
      ownerId = caller;
      edition = Nat.toText(newClaimedCount) # "/" # Nat.toText(claimToken.supplyLimit);
      claimedAt = ?nowNat;
      collectionId = null;
      status = #active;
      nftUniqueId = newNftUniqueId;
      auditHistory = [newAuditEntry];
    };
    nftStore.add(newId, newNft);
    // Append to global audit log
    let globalEntry : Common.AuditEntry = {
      action = "NFT_CLAIMED";
      caller;
      timestamp = nowNat;
      details = ?("NFT " # newId.toText() # " claimed by " # caller.toText() # " token=" # token);
    };
    globalAuditLog.pushBack(globalEntry);
    // Cap audit log at 500 entries
    if (globalAuditLog.size() > 500) {
      ignore globalAuditLog.popFront();
    };
    #ok(newNft)
  };

  /// Public (unauthenticated): retrieve NFT metadata for the claim page preview.
  /// Does NOT modify state; returns error if token invalid or NFT not claimable.
  public query func getClaimPreview(token : Text) : async Result.Result<ClaimTypes.ClaimPreview, Text> {
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
        #ok({
          nft;
          supplyLimit = claimToken.supplyLimit;
          claimedCount = claimToken.claimedCount;
        })
      };
    }
  };
}
