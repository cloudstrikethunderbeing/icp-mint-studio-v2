import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import NftLib "./nft";
import CollectionTypes "../types/collections";

module {
  public type CollectionStore = NftLib.CollectionStore;
  public type NftStore = NftLib.NftStore;

  public func getCollectionIdByName(store : CollectionStore, ownerId : Principal, name : Text) : ?CollectionTypes.CollectionId {
    for ((_, col) in store.entries()) {
      if (Principal.equal(col.ownerId, ownerId) and col.name == name) {
        return ?col.id;
      };
    };
    null
  };

  public func renameCollection(store : CollectionStore, nftStore : NftStore, collectionId : CollectionTypes.CollectionId, newName : Text, caller : Principal) : CollectionTypes.CollectionSummary {
    switch (store.get(collectionId)) {
      case (null) { Runtime.trap("Collection not found") };
      case (?col) {
        if (not Principal.equal(col.ownerId, caller)) {
          Runtime.trap("Unauthorized: Not the collection owner");
        };
        let sanitizedName = NftLib.sanitizeText(newName, 100);
        if (sanitizedName.size() == 0) {
          Runtime.trap("Name is required");
        };
        let updatedCol = { col with name = sanitizedName };
        store.add(collectionId, updatedCol);
        {
          id = updatedCol.id;
          name = updatedCol.name;
          ownerId = updatedCol.ownerId;
          nftCount = NftLib.countNftsInCollection(nftStore, collectionId);
        }
      };
    }
  };

  public func deleteCollectionAndUnassignNfts(store : CollectionStore, nftStore : NftStore, collectionId : CollectionTypes.CollectionId, caller : Principal) : CollectionTypes.CollectionSummary {
    switch (store.get(collectionId)) {
      case (null) { Runtime.trap("Collection not found") };
      case (?col) {
        if (not Principal.equal(col.ownerId, caller)) {
          Runtime.trap("Unauthorized: Not the collection owner");
        };
        let nftCount = NftLib.countNftsInCollection(nftStore, collectionId);
        // Unassign all NFTs from this collection
        for ((_, nft) in nftStore.entries()) {
          switch (nft.collectionId) {
            case (?cid) {
              if (cid == collectionId) {
                let updatedNft = { nft with collectionId = null };
                nftStore.add(nft.id, updatedNft);
              };
            };
            case (null) {};
          };
        };
        store.remove(collectionId);
        {
          id = col.id;
          name = col.name;
          ownerId = col.ownerId;
          nftCount;
        }
      };
    }
  };
}
