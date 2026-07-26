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

  /// Returned by getNftClaimCounts — PUBLIC unauthenticated per-NFT claim
  /// counts. Exposes ONLY nftId, claimedCount, supplyLimit. Deliberately does
  /// NOT include the token string, usedBy, usedAt, or any Nft redacted field
  /// (discountCode, membershipId). This is the public surface for the
  /// Library card indicator (v251 security redactions preserved).
  public type NftClaimCount = {
    nftId : Nat;
    claimedCount : Nat;
    supplyLimit : Nat;
  };

  /// Returned by getNftClaimBreakdown — ADMIN-ONLY per-NFT claim breakdown
  /// joined with the Nft store to include the title for the Health tab
  /// breakdown table. Exposes nftId, title, claimedCount, supplyLimit only —
  /// no discountCode, membershipId, or other redacted fields.
  public type NftClaimBreakdownEntry = {
    nftId : Nat;
    title : Text;
    claimedCount : Nat;
    supplyLimit : Nat;
  };
}
