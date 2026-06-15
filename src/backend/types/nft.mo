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
  };

  public type Collection = {
    id : Nat;
    ownerId : Principal;
    name : Text;
    description : Text;
    tier : Common.SubscriptionTier;
    maxSize : Nat;
    createdAt : Common.Timestamp;
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
  };
}
