import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import CollectionTypes "../types/collections";
import CollectionLib "../lib/collections";
import NftLib "../lib/nft";

mixin (
  accessControlState : AccessControl.AccessControlState,
  collectionStore : CollectionLib.CollectionStore,
  nftStore : CollectionLib.NftStore,
) {
  public query ({ caller }) func getCollectionIdByName(name : Text) : async ?CollectionTypes.CollectionId {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous caller");
    };
    CollectionLib.getCollectionIdByName(collectionStore, caller, name)
  };

  public shared ({ caller }) func renameCollection(request : CollectionTypes.RenameCollectionRequest) : async CollectionTypes.CollectionSummary {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous caller");
    };
    CollectionLib.renameCollection(collectionStore, nftStore, request.collectionId, request.newName, caller)
  };

  public shared ({ caller }) func deleteCollectionAndUnassignNfts(collectionId : CollectionTypes.CollectionId) : async CollectionTypes.CollectionSummary {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous caller");
    };
    CollectionLib.deleteCollectionAndUnassignNfts(collectionStore, nftStore, collectionId, caller)
  };
}
