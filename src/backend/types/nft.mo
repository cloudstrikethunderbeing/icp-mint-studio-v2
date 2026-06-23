import Storage "mo:caffeineai-object-storage/Storage";
import Common "common";
import Result "mo:core/Result";

module {
  public type NftStatus = {
    #active;
    #deleted;
    #burned;
  };

  public type Nft = {
    id : Nat;
    ownerId : Principal;
    creatorId : Common.CreatorId;
    imageBlob : Storage.ExternalBlob;
    assetHash : Text;
    title : Text;
    description : Text;
    edition : Text;
    mintDate : Common.Timestamp;
    claimedAt : ?Nat;
    status : NftStatus;
    auditHistory : [Common.AuditEntry];
    collectionId : ?Nat;
    businessName : ?Text;
    website : ?Text;
    discountCode : ?Text;
    membershipId : ?Text;
    rewardTier : Common.RewardTier;
    nftUniqueId : Text;
    tags : [Text];
    supplyLimit : Nat;
  };

  public type Collection = {
    id : Nat;
    ownerId : Principal;
    name : Text;
    description : Text;
    tier : Common.SubscriptionTier;
    maxSize : Nat;
    createdAt : Common.Timestamp;
    previewImage : ?Text;
    nftIds : [Nat];
  };

  public type VerifyResult = {
    tokenId : Nat;
    owner : Principal;
    creatorId : Common.CreatorId;
    mintDate : Common.Timestamp;
    edition : Text;
    network : Text;
    canisterId : Text;
    assetHash : Text;
    collectionId : ?Nat;
    businessName : ?Text;
    website : ?Text;
    discountCode : ?Text;
    membershipId : ?Text;
    rewardTier : Common.RewardTier;
    nftUniqueId : Text;
    tags : [Text];
    supplyLimit : Nat;
    status : NftStatus;
  };
}
