import Map "mo:core/Map";
import List "mo:core/List";
import Queue "mo:core/Queue";
import Set "mo:core/Set";
import Principal "mo:core/Principal";

module {
  // ── Shared types (inlined — no project imports allowed) ──────────────────

  public type VerifiedEmailsState = { verifiedEmails : Set.Set<Text> };
  public type SubscriptionTier = { #free; #creator; #pro; #org };
  public type AlertType = { #mint_confirmation; #subscription_expiry; #draft_purge; #transfer_window };
  public type NftStatus = { #active; #deleted; #burned };
  public type AuditEntry = { action : Text; caller : Principal; timestamp : Nat; details : ?Text };
  public type RewardTier = { #none; #bronze; #silver; #gold; #platinum };
  public type PaymentProofStatus = { #pending; #approved; #rejected };
  public type RewardType = { #none; #referralBonus };
  public type PurchaseStatus = { #pending; #confirmed; #failed };

  public type ClaimToken = {
    nftId : Nat;
    token : Text;
    createdAt : Int;
    usedBy : ?Principal;
    usedAt : ?Int;
    supplyLimit : Nat;
    claimedCount : Nat;
  };

  public type Nft = {
    id : Nat; ownerId : Principal; creatorId : Text; imageBlob : Blob; assetHash : Text;
    title : Text; description : Text; edition : Text; mintDate : Nat; status : NftStatus;
    auditHistory : [AuditEntry]; collectionId : ?Nat; businessName : ?Text; website : ?Text;
    discountCode : ?Text; membershipId : ?Text; rewardTier : RewardTier; nftUniqueId : Text; tags : [Text];
    claimedAt : ?Nat;
    supplyLimit : Nat;
    rewardType : RewardType;
    referralThreshold : Nat;
    priceUsd : ?Nat;
  };

  public type Collection = {
    id : Nat; ownerId : Principal; name : Text; description : Text;
    tier : SubscriptionTier; maxSize : Nat; createdAt : Nat;
    previewImage : ?Text; nftIds : [Nat]
  };

  public type UserProfile = {
    principalId : Principal; creatorId : Text; oisyWalletAddress : ?Text; email : ?Text;
    emailVerified : Bool;
    emailAlerts : [AlertType]; subscriptionTier : SubscriptionTier; creditsUsed : Nat;
    creditsTotal : Nat; creditsResetAt : Nat; activeSlots : Nat; maxSlots : Nat; createdAt : Nat;
    stripeProductId : ?Text;
    referralCode : ?Text;
    referralsCount : Nat;
    awardedTiers : [Nat];
  };

  public type PaymentProof = {
    id : Text; principal : Principal; txHash : Text; tierRequested : Text; networkType : Text;
    status : PaymentProofStatus; submittedAt : Int; reviewedAt : ?Int; reviewedBy : ?Principal;
    rejectionReason : ?Text
  };

  public type StripeConfigStore = { var mode : ?Text; var publishableKey : ?Text };
  public type RateLimitEntry = { var count : Nat; var windowStart : Nat };

  public type ReferralCodeMapping = {
    code : Text;
    referrerPrincipal : Principal;
    createdAt : Nat;
  };
  public type EligiblePendingEntry = {
    referrerPrincipal : Principal;
    thresholdTier : Nat;
    enqueuedAt : Nat;
  };
  public type BatchAwardConfig = {
    batchSize : Nat;
    delaySeconds : Nat;
    cappedPerCycle : Nat;
  };

  public type Purchase = {
    id : Text;
    nftId : Nat;
    buyer : Principal;
    seller : Principal;
    priceUsd : Nat;
    expectedE8s : Nat;
    rateUsed : Nat;
    txRef : Text;
    status : PurchaseStatus;
    submittedAt : Nat;
    verifiedAt : ?Nat;
    failureReason : ?Text;
  };

  public type PaymentConfig = {
    var paymentAddress : Text;
    var rateOverride : ?Nat;
  };

  // ── OldActor = NewActor of 20261002_000000.mo (chain HEAD), inlined. ─────
  public type OldActor = {
    nftStore : Map.Map<Nat, Nft>;
    collectionStore : Map.Map<Nat, Collection>;
    userStore : Map.Map<Principal, UserProfile>;
    rateLimitStore : Map.Map<Principal, RateLimitEntry>;
    stripeConfigStore : StripeConfigStore;
    verifiedEmails : VerifiedEmailsState;
    nextNftId : { var value : Nat };
    nextCollectionId : { var value : Nat };
    lastMintTime : { var value : Int };
    mintCount : { var value : Nat };
    selfCanisterId : { var value : Text };
    globalAuditLog : Queue.Queue<AuditEntry>;
    paymentProofStore : Map.Map<Text, PaymentProof>;
    creatorIndex : Map.Map<Text, List.List<Nat>>;
    claimTokenStore : Map.Map<Text, ClaimToken>;
    nftToClaimToken : Map.Map<Nat, Text>;
    backendBuildTimestamp : { var value : Nat };
    adminPrincipals : { var value : [Principal] };
    claimersStore : Map.Map<Text, Set.Set<Principal>>;
    referralCodeStore : Map.Map<Text, ReferralCodeMapping>;
    referrerCodeIndex : Map.Map<Principal, Text>;
    eligiblePendingStore : Map.Map<Principal, EligiblePendingEntry>;
    batchAwardConfig : { var value : BatchAwardConfig };
    ownerIndex : Map.Map<Principal, List.List<Nat>>;
    collectionNftCount : Map.Map<Nat, Nat>;
    purchaseStore : Map.Map<Text, Purchase>;
    paymentConfig : PaymentConfig;
  };

  // ── NewActor: adds the consumed-ledger-block replay guard. ───────────────
  // consumedBlockIndexStore : Map<Nat, Text> — net-new, empty on upgrade.
  public type NewActor = {
    nftStore : Map.Map<Nat, Nft>;
    collectionStore : Map.Map<Nat, Collection>;
    userStore : Map.Map<Principal, UserProfile>;
    rateLimitStore : Map.Map<Principal, RateLimitEntry>;
    stripeConfigStore : StripeConfigStore;
    verifiedEmails : VerifiedEmailsState;
    nextNftId : { var value : Nat };
    nextCollectionId : { var value : Nat };
    lastMintTime : { var value : Int };
    mintCount : { var value : Nat };
    selfCanisterId : { var value : Text };
    globalAuditLog : Queue.Queue<AuditEntry>;
    paymentProofStore : Map.Map<Text, PaymentProof>;
    creatorIndex : Map.Map<Text, List.List<Nat>>;
    claimTokenStore : Map.Map<Text, ClaimToken>;
    nftToClaimToken : Map.Map<Nat, Text>;
    backendBuildTimestamp : { var value : Nat };
    adminPrincipals : { var value : [Principal] };
    claimersStore : Map.Map<Text, Set.Set<Principal>>;
    referralCodeStore : Map.Map<Text, ReferralCodeMapping>;
    referrerCodeIndex : Map.Map<Principal, Text>;
    eligiblePendingStore : Map.Map<Principal, EligiblePendingEntry>;
    batchAwardConfig : { var value : BatchAwardConfig };
    ownerIndex : Map.Map<Principal, List.List<Nat>>;
    collectionNftCount : Map.Map<Nat, Nat>;
    purchaseStore : Map.Map<Text, Purchase>;
    paymentConfig : PaymentConfig;
    consumedBlockIndexStore : Map.Map<Nat, Text>;
  };

  public func migration(old : OldActor) : NewActor {
    {
      nftStore = old.nftStore;
      collectionStore = old.collectionStore;
      userStore = old.userStore;
      rateLimitStore = old.rateLimitStore;
      stripeConfigStore = old.stripeConfigStore;
      verifiedEmails = old.verifiedEmails;
      nextNftId = old.nextNftId;
      nextCollectionId = old.nextCollectionId;
      lastMintTime = old.lastMintTime;
      mintCount = old.mintCount;
      selfCanisterId = old.selfCanisterId;
      globalAuditLog = old.globalAuditLog;
      paymentProofStore = old.paymentProofStore;
      creatorIndex = old.creatorIndex;
      claimTokenStore = old.claimTokenStore;
      nftToClaimToken = old.nftToClaimToken;
      backendBuildTimestamp = old.backendBuildTimestamp;
      adminPrincipals = old.adminPrincipals;
      claimersStore = old.claimersStore;
      referralCodeStore = old.referralCodeStore;
      referrerCodeIndex = old.referrerCodeIndex;
      eligiblePendingStore = old.eligiblePendingStore;
      batchAwardConfig = old.batchAwardConfig;
      ownerIndex = old.ownerIndex;
      collectionNftCount = old.collectionNftCount;
      purchaseStore = old.purchaseStore;
      paymentConfig = old.paymentConfig;
      consumedBlockIndexStore = Map.empty();
    }
  };
}
