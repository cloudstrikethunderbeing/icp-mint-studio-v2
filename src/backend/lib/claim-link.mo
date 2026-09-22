import Map "mo:core/Map";
import Result "mo:core/Result";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Queue "mo:core/Queue";
import NftTypes "../types/nft";
import NftLib "../lib/nft";
import ClaimTypes "../types/claim-link";
import Common "../types/common";
import Nat8 "mo:core/Nat8";

module {
  public type ClaimTokenStore = Map.Map<Text, ClaimTypes.ClaimToken>;
  public type NftToClaimStore = Map.Map<Nat, Text>;
  /// Per-principal dedup store for reusable claim links: token Text -> set of
  /// principals who have already claimed that token. A SEPARATE stable
  /// variable from `claimTokenStore` so that adding it does NOT change the
  /// ClaimToken record shape and therefore does NOT trigger M0170. The Set is
  /// a mutable mo:core Set, mutated in place inside `useToken` so the dedup
  /// check, the set insertion, and the `claimedCount` increment are one
  /// synchronous update with NO await between them.
  public type ClaimersStore = Map.Map<Text, Set.Set<Principal>>;

  /// Generate a 32-character hex token using ICP raw randomness blob.
  /// Called from the mixin after awaiting ICP randomness.
  public func buildToken(randomBytes : Blob) : Text {
    let hexChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
    var hex = "";
    var i = 0;
    let iter = randomBytes.vals();
    label buildLoop while (i < 16) {
      switch (iter.next()) {
        case (null) { break buildLoop };
        case (?byte) {
          let high = Nat8.toNat(byte / 16);
          let low = Nat8.toNat(byte % 16);
          hex := hex # hexChars[high] # hexChars[low];
          i += 1;
        };
      };
    };
    hex
  };

  /// Store a new claim token for an NFT, replacing any prior token.
  public func storeToken(
    claimTokenStore : ClaimTokenStore,
    nftToClaimToken : NftToClaimStore,
    nftId : Nat,
    token : Text,
    createdAt : Int,
    supplyLimit : Nat,
    claimedCount : Nat,
  ) : () {
    let claimToken : ClaimTypes.ClaimToken = {
      nftId;
      token;
      createdAt;
      usedBy = null;
      usedAt = null;
      supplyLimit;
      claimedCount;
    };
    // Overwrite any prior token for this nftId (one active token per NFT rule)
    switch (nftToClaimToken.get(nftId)) {
      case (?oldToken) {
        claimTokenStore.remove(oldToken);
      };
      case (null) {};
    };
    claimTokenStore.add(token, claimToken);
    nftToClaimToken.add(nftId, token);
  };

  /// Look up a ClaimToken by its token string.
  public func getToken(
    claimTokenStore : ClaimTokenStore,
    token : Text,
  ) : ?ClaimTypes.ClaimToken {
    claimTokenStore.get(token)
  };

  /// Mark a token as used atomically and update claimedCount.
  /// `claimersStore` is the per-principal dedup store: a Map keyed by token
  /// Text mapping to a Set<Principal> of principals who have already claimed.
  /// The dedup check, the set insertion, and the claimedCount increment are
  /// all synchronous with NO await between them, so the dedup is atomic with
  /// the count bump.
  public func useToken(
    claimTokenStore : ClaimTokenStore,
    claimersStore : ClaimersStore,
    token : Text,
    caller : Principal,
    usedAt : Int,
    newClaimedCount : Nat,
  ) : Result.Result<ClaimTypes.ClaimToken, Text> {
    switch (claimTokenStore.get(token)) {
      case (null) { #err("Claim token not found") };
      case (?claimToken) {
        // Reusable links: enforce the supply cap instead of a single-use flag.
        // usedBy/usedAt still record the most-recent claimer for display, but
        // a non-null usedBy no longer blocks subsequent claims.
        if (claimToken.claimedCount >= claimToken.supplyLimit) {
          return #err("Claim link is fully redeemed");
        };
        // Per-principal dedup: a single principal may not claim the same
        // reusable link more than once. The check, the set insertion, and the
        // claimedCount increment below are all synchronous with NO await
        // between them, so the dedup is atomic with the count bump.
        let existingClaimers = claimersStore.get(token);
        switch (existingClaimers) {
          case (?set) {
            if (set.contains(caller)) {
              return #err("You have already claimed this drop");
            };
            // Mutate the existing mutable Set in place, then re-store the
            // same binding (no-op for the Map but keeps the contract explicit).
            set.add(caller);
          };
          case (null) {
            // First claimer for this token: create a new empty Set, add the
            // caller, and put it in the store.
            let newSet = Set.empty<Principal>();
            newSet.add(caller);
            claimersStore.add(token, newSet);
          };
        };
        let updated : ClaimTypes.ClaimToken = {
          claimToken with
          usedBy = ?caller;
          usedAt = ?usedAt;
          claimedCount = newClaimedCount;
        };
        claimTokenStore.add(token, updated);
        #ok(updated)
      };
    }
  };

  /// Get the active token string for an nftId, if any.
  public func getTokenForNft(
    nftToClaimToken : NftToClaimStore,
    nftId : Nat,
  ) : ?Text {
    nftToClaimToken.get(nftId)
  };

  /// Validate an NFT is claimable: exists, #active status, link not sold out.
  public func assertClaimable(
    nft : NftTypes.Nft,
    claimToken : ClaimTypes.ClaimToken,
  ) : Result.Result<(), Text> {
    if (claimToken.claimedCount >= claimToken.supplyLimit) {
      return #err("Claim link is fully redeemed");
    };
    if (nft.status != #active) {
      return #err("NFT is not available for claiming (burned or deleted)");
    };
    #ok(())
  };

  /// Compute per-NFT claim counts by iterating the claimToken store and
  /// grouping by nftId. Defensively sums claimedCount across multiple tokens
  /// for the same nftId (typically one token per nftId, but handle multiple)
  /// and takes the MAX supplyLimit across tokens for that nftId. Returns an
  /// array of { nftId, claimedCount, supplyLimit } — ONLY those three fields,
  /// no token string, usedBy, usedAt, or any Nft redacted field. Read-only;
  /// does not mutate any store. Used by the PUBLIC getNftClaimCounts() query.
  public func getNftClaimCounts(
    claimTokenStore : ClaimTokenStore,
  ) : [ClaimTypes.NftClaimCount] {
    // Accumulator: nftId -> { claimedCount, supplyLimit } aggregated across
    // all tokens for that nftId. Uses a Map so we can look up and update in
    // O(log n) per token entry.
    let acc : Map.Map<Nat, { var claimedCount : Nat; var supplyLimit : Nat }> = Map.empty();
    for ((_, token) in claimTokenStore.entries()) {
      switch (acc.get(token.nftId)) {
        case (null) {
          acc.add(token.nftId, { var claimedCount = token.claimedCount; var supplyLimit = token.supplyLimit });
        };
        case (?entry) {
          entry.claimedCount += token.claimedCount;
          if (token.supplyLimit > entry.supplyLimit) {
            entry.supplyLimit := token.supplyLimit;
          };
        };
      };
    };
    // Project to the public NftClaimCount shape — ONLY nftId, claimedCount,
    // supplyLimit. No token string, usedBy, usedAt, or Nft redacted fields.
    // Use Map.toArray then Array.map for a clean, type-stable projection.
    acc.toArray().map(
      func((nftId, entry)) : ClaimTypes.NftClaimCount {
        {
          nftId;
          claimedCount = entry.claimedCount;
          supplyLimit = entry.supplyLimit;
        };
      },
    )
  };

  /// Compute the admin-only per-NFT claim breakdown by joining the claimToken
  /// counts with the Nft store to include the title. Returns an array of
  /// { nftId, title, claimedCount, supplyLimit } for every published NFT that
  /// has a ClaimToken. Exposes ONLY those four fields — no discountCode,
  /// membershipId, or other redacted fields. Read-only; does not mutate any
  /// store. Used by the ADMIN-ONLY getNftClaimBreakdown() query.
  public func getNftClaimBreakdown(
    nftStore : NftLib.NftStore,
    claimTokenStore : ClaimTokenStore,
  ) : [ClaimTypes.NftClaimBreakdownEntry] {
    // Reuse the per-NFT count aggregation, then join with the Nft store for
    // the title. The counts come from getNftClaimCounts (already grouped by
    // nftId with summed claimedCount and max supplyLimit).
    let counts = getNftClaimCounts(claimTokenStore);
    counts.map(
      func(c : ClaimTypes.NftClaimCount) : ClaimTypes.NftClaimBreakdownEntry {
        let title : Text = switch (nftStore.get(c.nftId)) {
          case (?nft) { nft.title };
          case (null) { "" };
        };
        {
          nftId = c.nftId;
          title;
          claimedCount = c.claimedCount;
          supplyLimit = c.supplyLimit;
        };
      },
    )
  };

  /// NON-PUBLIC canonical claim/mint path. Contains the canonical validation
  /// flow (anonymous reject, [H3] rate limit, token validation, supply cap,
  /// assertClaimable, atomic useToken, [H2] counter-ordering, new NFT copy).
  /// This is the SAME flow the public claimNft uses; extracting it as a public
  /// lib function lets the claim-link mixin, the referral auto-award, and the
  /// retroactive batch-award REUSE the canonical mint path instead of creating
  /// a parallel mint.
  ///
  /// `claimer` is the principal who will own the new NFT copy. For a public
  /// claim this is the caller; for an auto-award this is the referrer; for a
  /// batch-award this is the eligible-pending referrer. `ref` is the optional
  /// referral code presented by the claimant — it is ONLY acted on by the
  /// PUBLIC claimNft wrapper (which records the referral + triggers the
  /// auto-award AFTER this internal func returns #ok). When the auto-award or
  /// batch-award calls this internal func, it passes `null` for ref so no
  /// referral is recorded on an auto-award (the referrer is being awarded,
  /// not referring).
  ///
  /// All needed stores are passed as params so this function is stateless and
  /// callable from any mixin that has access to the shared claim-link stores.
  public func claimNftInternal(
    claimer : Principal,
    token : Text,
    ref : ?Text,
    nftStore : NftLib.NftStore,
    claimTokenStore : ClaimTokenStore,
    claimersStore : ClaimersStore,
    globalAuditLog : Queue.Queue<Common.AuditEntry>,
    nextNftId : { var value : Nat },
    selfCanisterId : { var value : Text },
    claimRateLimitStore : Map.Map<Principal, { var lastClaimSec : Int }>,
  ) : Result.Result<NftTypes.Nft, Text> {
    // Reject anonymous claimers — a real principal is required to own the
    // new NFT copy. (For auto-award/batch-award the referrer always has a
    // profile, so this is a defensive guard.)
    if (claimer.isAnonymous()) {
      return #err("Authentication required to claim an NFT");
    };
    // [H3] Per-principal rate limit: 1 claim per 60 SECONDS per principal.
    // Uses the DEDICATED claimRateLimitStore (NOT the shared rateLimitStore)
    // so the NFT mint limiter's window resets cannot interfere. Compares
    // elapsed in SECONDS (Time.now() / 1_000_000_000), NOT nanoseconds — the
    // pre-existing NFT limiter bug compares nanoseconds, which is why this
    // store is separate. NOTE: the auto-award reuses this same limiter, so a
    // referrer who just claimed is rate-limited from receiving an auto-award
    // within the same 60s window — this is intentional (the auto-award will
    // be retried by the next batch-award cycle if it cannot fire now).
    let nowNs : Int = Time.now();
    let nowSec : Int = nowNs / 1_000_000_000;
    let claimWindowSec : Int = 60;
    switch (claimRateLimitStore.get(claimer)) {
      case (null) {
        let entry = { var lastClaimSec = nowSec };
        claimRateLimitStore.add(claimer, entry);
      };
      case (?entry) {
        let elapsed : Int = nowSec - entry.lastClaimSec;
        if (elapsed < claimWindowSec) {
          return #err("Rate limit exceeded: please wait at least 60 seconds between claims");
        };
        entry.lastClaimSec := nowSec;
        claimRateLimitStore.add(claimer, entry);
      };
    };
    // Validate token exists
    let claimToken = switch (getToken(claimTokenStore, token)) {
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
    switch (assertClaimable(masterNft, claimToken)) {
      case (#err(msg)) { return #err(msg) };
      case (#ok(())) {};
    };
    // Atomically: mark token used with incremented count
    let nowNat = Int.abs(nowNs);
    let newClaimedCount = claimToken.claimedCount + 1;
    switch (useToken(claimTokenStore, claimersStore, token, claimer, nowNs, newClaimedCount)) {
      case (#err(msg)) { return #err(msg) };
      case (#ok(_)) {};
    };
    // [H2] Counter ordering fix: compute newId from nextNftId.value, build the
    // NFT, and add it to nftStore FIRST. Only bump nextNftId.value AFTER the
    // add succeeds. If nftStore.add traps, the counter is NOT bumped (the
    // trap propagates before the bump line). The previous bug bumped
    // nextNftId.value BEFORE the add, so a failed add would skip an id.
    let newId = nextNftId.value;
    // [NFT-INTEGRITY] Mint-path guard: a claim must be purely additive and
    // must never overwrite/reset/rebuild existing NFT state. Refuse before
    // persisting if the id would clobber an existing NFT.
    switch (NftLib.guardMintAdditive(nftStore, newId)) {
      case (#err(msg)) { return #err(msg) };
      case (#ok) {};
    };
    // [NFT-INTEGRITY] Snapshot the catalog BEFORE the claim so the post-claim
    // integrity check can prove the claim was purely additive.
    let integritySnapshot = NftLib.snapshotIntegrity(nftStore);
    let newNftUniqueId = selfCanisterId.value # ":0:" # newId.toText();
    let refDetail : Text = switch (ref) {
      case (?r) { " ref=" # r };
      case (null) { "" };
    };
    let newAuditEntry : Common.AuditEntry = {
      action = "NFT_CLAIMED";
      caller = claimer;
      timestamp = nowNat;
      details = ?("Claimed via token: " # token # refDetail);
    };
    let newNft : NftTypes.Nft = {
      masterNft with
      id = newId;
      ownerId = claimer;
      edition = newClaimedCount.toText() # "/" # claimToken.supplyLimit.toText();
      claimedAt = ?nowNat;
      collectionId = null;
      status = #active;
      nftUniqueId = newNftUniqueId;
      auditHistory = [newAuditEntry];
    };
    nftStore.add(newId, newNft);
    // [NFT-INTEGRITY] Post-claim integrity check: pre-claim count + 1 must
    // equal post-claim count AND all pre-existing NFT ids must remain listed.
    // If it fails, remove the freshly claimed NFT (leaving the catalog
    // unchanged) and surface a clear error.
    switch (NftLib.verifyMintIntegrity(nftStore, integritySnapshot, newId)) {
      case (#err(msg)) {
        NftLib.removeNft(nftStore, newId);
        return #err(msg);
      };
      case (#ok) {};
    };
    // [H2] Bump the counter LAST, after the add succeeded.
    nextNftId.value += 1;
    // Append to global audit log
    let globalEntry : Common.AuditEntry = {
      action = "NFT_CLAIMED";
      caller = claimer;
      timestamp = nowNat;
      details = ?("NFT " # newId.toText() # " claimed by " # claimer.toText() # " token=" # token # refDetail);
    };
    globalAuditLog.pushBack(globalEntry);
    // Cap audit log at 500 entries
    if (globalAuditLog.size() > 500) {
      ignore globalAuditLog.popFront();
    };
    #ok(newNft)
  };
}
