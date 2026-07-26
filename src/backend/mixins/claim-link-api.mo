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
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

mixin (
  nftStore : NftLib.NftStore,
  claimTokenStore : ClaimLib.ClaimTokenStore,
  claimersStore : ClaimLib.ClaimersStore,
  nftToClaimToken : ClaimLib.NftToClaimStore,
  globalAuditLog : Queue.Queue<Common.AuditEntry>,
  userStore : UserLib.UserStore,
  nextNftId : { var value : Nat },
  selfCanisterId : { var value : Text },
  admins : { var value : [Principal] },
  // [H3] DEDICATED transient rate-limit store for claimNft, SEPARATE from the
  // shared rateLimitStore. The NFT mint rate-limiter (mixins/nft-api.mo
  // checkRateLimit) shares rateLimitStore and resets windowStart/count on
  // every mint; if claimNft used the same store, an attacker minting a single
  // NFT between claim attempts would reset the claim window and bypass the
  // 1-claim-per-60s limit. Transient (rebuilt empty on every restart) —
  // rate-limit state is not durable and does not need to survive upgrades, so
  // no migration is required and the actor's stable state shape is unchanged.
  claimRateLimitStore : Map.Map<Principal, { var lastClaimSec : Int }>,
) {

  /// Admin-only: generate a shareable claim URL for a specific NFT.
  /// Returns the relative path "/claim/" # token.
  public shared ({ caller }) func generateClaimLink(nftId : Nat) : async Result.Result<Text, Text> {
    // Admin check FIRST — bypass profile fetch and tier check entirely
    if (not Auth.isAdmin(caller, admins.value)) {
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
    if (not Auth.isAdmin(caller, admins.value)) {
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
              claimed = claimToken.claimedCount >= claimToken.supplyLimit;
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
    // [H3] Per-principal rate limit: 1 claim per 60 SECONDS per principal.
    // Uses the DEDICATED claimRateLimitStore (NOT the shared rateLimitStore)
    // so the NFT mint limiter's window resets cannot interfere. Compares
    // elapsed in SECONDS (Time.now() / 1_000_000_000), NOT nanoseconds — the
    // pre-existing NFT limiter bug compares nanoseconds, which is why this
    // store is separate.
    let nowNs : Int = Time.now();
    let nowSec : Int = nowNs / 1_000_000_000;
    let claimWindowSec : Int = 60;
    switch (claimRateLimitStore.get(caller)) {
      case (null) {
        let entry = { var lastClaimSec = nowSec };
        claimRateLimitStore.add(caller, entry);
      };
      case (?entry) {
        let elapsed : Int = nowSec - entry.lastClaimSec;
        if (elapsed < claimWindowSec) {
          return #err("Rate limit exceeded: please wait at least 60 seconds between claims");
        };
        entry.lastClaimSec := nowSec;
        claimRateLimitStore.add(caller, entry);
      };
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
    let nowNat = Int.abs(nowNs);
    let newClaimedCount = claimToken.claimedCount + 1;
    switch (ClaimLib.useToken(claimTokenStore, claimersStore, token, caller, nowNs, newClaimedCount)) {
      case (#err(msg)) { return #err(msg) };
      case (#ok(_)) {};
    };
    // [H2] Counter ordering fix: compute newId from nextNftId.value, build the
    // NFT, and add it to nftStore FIRST. Only bump nextNftId.value AFTER the
    // add succeeds. If nftStore.add traps, the counter is NOT bumped (the
    // trap propagates before the bump line). The previous bug bumped
    // nextNftId.value BEFORE the add, so a failed add would skip an id.
    let newId = nextNftId.value;
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
      edition = newClaimedCount.toText() # "/" # claimToken.supplyLimit.toText();
      claimedAt = ?nowNat;
      collectionId = null;
      status = #active;
      nftUniqueId = newNftUniqueId;
      auditHistory = [newAuditEntry];
    };
    nftStore.add(newId, newNft);
    // [H2] Bump the counter LAST, after the add succeeded.
    nextNftId.value += 1;
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
    // Validate link is not fully redeemed (reusable up to supplyLimit)
    if (claimToken.claimedCount >= claimToken.supplyLimit) {
      return #err("Claim link is fully redeemed");
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

  /// PUBLIC (unauthenticated): per-NFT claim counts for every NFT that has a
  /// ClaimToken. Returns an array of { nftId, claimedCount, supplyLimit } —
  /// ONLY those three fields. No token string, usedBy, usedAt, or any Nft
  /// redacted field (discountCode, membershipId) is exposed. Read-only; does
  /// not mutate any store. This is the public surface for the Library card
  /// indicator. Sits alongside getClaimPreview in the public-no-auth query
  /// list. v251 security redactions preserved — only nftId/claimedCount/
  /// supplyLimit are surfaced.
  public query func getNftClaimCounts() : async [ClaimTypes.NftClaimCount] {
    ClaimLib.getNftClaimCounts(claimTokenStore)
  };
}
