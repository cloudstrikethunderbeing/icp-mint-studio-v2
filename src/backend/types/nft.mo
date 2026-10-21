import Storage "mo:caffeineai-object-storage/Storage";
import Common "common";
import Result "mo:core/Result";
import ReferralTypes "referral-rewards";

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
    // Referral-rewards fields (net-new). rewardType marks an NFT as the bonus
    // asset awarded when a referrer crosses referralThreshold (#none is the
    // default for all non-referral NFTs). referralThreshold is only meaningful
    // when rewardType = #referralBonus. Both initialized by the migration
    // chain (20260726_050000.mo) for existing NFTs and by NftLib.createNft for
    // new NFTs. Admin-tunable via adminSetNftRewardType /
    // adminSetNftReferralThreshold (draft-only).
    rewardType : ReferralTypes.RewardType;
    referralThreshold : Nat;
    // Whole-value USD price (positive integer dollars, no cents). null means
    // the NFT is not listed for sale. Set on mint and editable by the owner.
    priceUsd : ?Nat;
  };

  // [SCALE] Lightweight list projection. Listing endpoints return this summary
  // record (id, title, thumbnail reference, status) instead of the full Nft
  // (which carries imageBlob and every metadata field), so a list response does
  // not decode every image. Full records still come from getNft on demand.
  // `thumbnail` is the assetHash — the frontend resolves it to a gateway URL
  // through the same single image-resolution path used for full records.
  public type NftSummary = {
    id : Nat;
    ownerId : Principal;
    creatorId : Common.CreatorId;
    title : Text;
    thumbnail : Text;
    status : NftStatus;
    collectionId : ?Nat;
    mintDate : Common.Timestamp;
    nftUniqueId : Text;
    // Whole-value USD price (positive integer dollars, no cents); null when
    // the NFT is not listed for sale.
    priceUsd : ?Nat;
  };

  // [SCALE] One page of listing results plus the total count so the frontend
  // can page. `total` is the count of ALL matching records (before offset/limit
  // are applied); `offset`/`limit` echo the applied window.
  public type NftSummaryPage = {
    items : [NftSummary];
    total : Nat;
    offset : Nat;
    limit : Nat;
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
