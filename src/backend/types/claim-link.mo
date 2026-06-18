import Principal "mo:core/Principal";

module {
  /// A shareable claim token tied to a single NFT.
  /// `usedBy` is null while unclaimed; set atomically when claimed.
  public type ClaimToken = {
    nftId : Nat;
    token : Text;
    createdAt : Int;
    usedBy : ?Principal;
    usedAt : ?Int;
  };

  /// Returned by getClaimStatus — admin-only view of claim state.
  public type ClaimStatus = {
    token : Text;
    claimed : Bool;
    claimedBy : ?Principal;
  };
}
