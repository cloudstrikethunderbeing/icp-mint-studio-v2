import Common "../types/common";

module {
  public type CollectionId = Nat;

  public type RenameCollectionRequest = {
    collectionId : CollectionId;
    newName : Text;
  };

  public type CollectionSummary = {
    id : CollectionId;
    name : Text;
    ownerId : Principal;
    nftCount : Nat;
  };
}
