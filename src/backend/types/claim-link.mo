import Principal "mo:core/Principal";
import NftTypes "../types/nft";

module {
  /// A shareable claim token tied to a single NFT.
  /// `usedBy` is null while unclaimed; set atomically when claimed.
  /// Per-principal dedup for reusable links is tracked in a SEPARATE store
  /// (see lib/claim-link.mo `ClaimersStore`) rather than on this record, so
  /// that adding it does NOT change the ClaimToken shape and therefore does
  /// NOT trigger M0170 stable-compatibility errors.
  public type ClaimToken = {
    nftId : Nat;
    token : Text;
    createdAt : Int;
    usedBy : ?Principal;
    usedAt : ?Int;
    supplyLimit : Nat;
    claimedCount : Nat;
  };

  /// Returned by getClaimStatus — admin-only view of claim state.
  public type ClaimStatus = {
    token : Text;
    claimed : Bool;
    claimedBy : ?Principal;
    supplyLimit : Nat;
    claimedCount : Nat;
  };

  /// Returned by getClaimPreview — public preview of claimable NFT.
  public type ClaimPreview = {
    nft : NftTypes.Nft;
    supplyLimit : Nat;
    claimedCount : Nat;
  };
}
