import Map "mo:core/Map";
import Result "mo:core/Result";
import Principal "mo:core/Principal";
import NftTypes "../types/nft";
import ClaimTypes "../types/claim-link";
import Nat8 "mo:core/Nat8";

module {
  public type ClaimTokenStore = Map.Map<Text, ClaimTypes.ClaimToken>;
  public type NftToClaimStore = Map.Map<Nat, Text>;

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
  public func useToken(
    claimTokenStore : ClaimTokenStore,
    token : Text,
    caller : Principal,
    usedAt : Int,
    newClaimedCount : Nat,
  ) : Result.Result<ClaimTypes.ClaimToken, Text> {
    switch (claimTokenStore.get(token)) {
      case (null) { #err("Claim token not found") };
      case (?claimToken) {
        if (claimToken.usedBy != null) {
          return #err("Claim token has already been used");
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

  /// Validate an NFT is claimable: exists, #active status, token not yet used.
  public func assertClaimable(
    nft : NftTypes.Nft,
    claimToken : ClaimTypes.ClaimToken,
  ) : Result.Result<(), Text> {
    if (claimToken.usedBy != null) {
      return #err("This NFT has already been claimed");
    };
    if (nft.status != #active) {
      return #err("NFT is not available for claiming (burned or deleted)");
    };
    #ok(())
  };
}
