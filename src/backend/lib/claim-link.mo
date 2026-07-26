import Map "mo:core/Map";
import Result "mo:core/Result";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Array "mo:core/Array";
import NftTypes "../types/nft";
import NftLib "../lib/nft";
import ClaimTypes "../types/claim-link";
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
}
