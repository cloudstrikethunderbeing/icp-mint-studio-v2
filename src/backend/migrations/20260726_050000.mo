import Map "mo:core/Map";
import List "mo:core/List";
import Queue "mo:core/Queue";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Text "mo:core/Text";

module {
  // ── Shared types (inlined — no project imports allowed) ──────────────────

  public type VerifiedEmailsState = { verifiedEmails : Set.Set<Text> };
  public type AlertType = { #mint_confirmation; #subscription_expiry; #draft_purge; #transfer_window };
  public type SubscriptionTier = { #free; #creator; #pro; #org };
  public type NftStatus = { #active; #deleted; #burned };
  public type AuditEntry = { action : Text; caller : Principal; timestamp : Nat; details : ?Text };
  public type RewardTier = { #none; #bronze; #silver; #gold; #platinum };
  public type PaymentProofStatus = { #pending; #approved; #rejected };
  // Referral-rewards RewardType (inlined from types/referral-rewards.mo).
  public type RewardType = { #none; #referralBonus };

  public type ClaimToken = {
    nftId : Nat;
    token : Text;
    createdAt : Int;
    usedBy : ?Principal;
    usedAt : ?Int;
    supplyLimit : Nat;
    claimedCount : Nat;
  };

  // OLD Nft (from 20260726_030000.mo NewActor) — NO rewardType / referralThreshold.
  public type OldNft = {
    id : Nat; ownerId : Principal; creatorId : Text; imageBlob : Blob; assetHash : Text;
    title : Text; description : Text; edition : Text; mintDate : Nat; status : NftStatus;
    auditHistory : [AuditEntry]; collectionId : ?Nat; businessName : ?Text; website : ?Text;
    discountCode : ?Text; membershipId : ?Text; rewardTier : RewardTier; nftUniqueId : Text; tags : [Text];
    claimedAt : ?Nat;
    supplyLimit : Nat;
  };

  // NEW Nft — adds rewardType : RewardType (#none default) and referralThreshold
  // : Nat (DEFAULT_REFERRAL_THRESHOLD = 3, admin-tunable). Both are net-new
  // fields initialized by this migration for existing NFTs and by NftLib.createNft
  // for new NFTs.
  public type NewNft = {
    id : Nat; ownerId : Principal; creatorId : Text; imageBlob : Blob; assetHash : Text;
    title : Text; description : Text; edition : Text; mintDate : Nat; status : NftStatus;
    auditHistory : [AuditEntry]; collectionId : ?Nat; businessName : ?Text; website : ?Text;
    discountCode : ?Text; membershipId : ?Text; rewardTier : RewardTier; nftUniqueId : Text; tags : [Text];
    claimedAt : ?Nat;
    supplyLimit : Nat;
    rewardType : RewardType;
    referralThreshold : Nat;
  };

  public type Collection = {
    id : Nat; ownerId : Principal; name : Text; description : Text;
    tier : SubscriptionTier; maxSize : Nat; createdAt : Nat;
    previewImage : ?Text; nftIds : [Nat]
  };

  // OLD UserProfile (from 20260726_030000.mo NewActor) — has emailVerified but
  // NO referral-rewards fields.
  public type OldUserProfile = {
    principalId : Principal; creatorId : Text; oisyWalletAddress : ?Text; email : ?Text;
    emailVerified : Bool;
    emailAlerts : [AlertType]; subscriptionTier : SubscriptionTier; creditsUsed : Nat;
    creditsTotal : Nat; creditsResetAt : Nat; activeSlots : Nat; maxSlots : Nat; createdAt : Nat;
    stripeProductId : ?Text;
  };

  // NEW UserProfile — adds referralCode : ?Text (null until the caller generates
  // one via getOrCreateMyReferralCode), referralsCount : Nat (0), and
  // awardedTiers : [Nat] (empty — stacking-ready, no tiers awarded yet). NO
  // EXPIRY — referral codes never expire, so there is no expiry field by design.
  public type NewUserProfile = {
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

  // Referral-rewards stable stores (net-new). All three are stable Maps.
  // ReferralCodeStore: referralCode (Text) -> ReferralCodeMapping.
  public type ReferralCodeMapping = {
    code : Text;
    referrerPrincipal : Principal;
    createdAt : Nat;
  };
  // ReferrerCodeIndex: referrerPrincipal -> referralCode (Text).
  // EligiblePendingEntry: referrerPrincipal -> { thresholdTier, enqueuedAt }.
  public type EligiblePendingEntry = {
    referrerPrincipal : Principal;
    thresholdTier : Nat;
    enqueuedAt : Nat;
  };
  // BatchAwardConfig: { batchSize, delaySeconds, cappedPerCycle }.
  public type BatchAwardConfig = {
    batchSize : Nat;
    delaySeconds : Nat;
    cappedPerCycle : Nat;
  };

  // ── OldActor = NewActor of 20260726_030000.mo (chain HEAD), inlined.
  // This is the deployed stable signature we are upgrading from. The
  // stripeConfigStore here uses the NEW shape (mode/publishableKey) and
  // UserProfile here has emailVerified but NO referral-rewards fields. Nft
  // here has NO rewardType / referralThreshold.
  public type OldActor = {
    nftStore : Map.Map<Nat, OldNft>;
    collectionStore : Map.Map<Nat, Collection>;
    userStore : Map.Map<Principal, OldUserProfile>;
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
  };

  // ── NewActor: every stable field in the updated main.mo ──────────────────
  // Changes vs OldActor:
  //   (1) nftStore : Map<Nat, OldNft> → Map<Nat, NewNft>
  //       (rewardType = #none, referralThreshold = 3 added to every NFT).
  //   (2) userStore : Map<Principal, OldUserProfile> → Map<Principal, NewUserProfile>
  //       (referralCode = null, referralsCount = 0, awardedTiers = [] added to
  //       every profile).
  //   (3) Four net-new stable fields: referralCodeStore, referrerCodeIndex,
  //       eligiblePendingStore, batchAwardConfig.
  // The transient batchAwardThrottleStore is NOT stable (rebuilt empty on
  // every restart) and does NOT appear here. All other stable fields pass
  // through unchanged.
  public type NewActor = {
    nftStore : Map.Map<Nat, NewNft>;
    collectionStore : Map.Map<Nat, Collection>;
    userStore : Map.Map<Principal, NewUserProfile>;
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
  };

  // Default referral threshold placeholder (admin-tunable). Mirrors
  // types/referral-rewards.mo DEFAULT_REFERRAL_THRESHOLD. Inlined here because
  // migrations may not import project modules.
  let DEFAULT_REFERRAL_THRESHOLD : Nat = 3;

  // Default batch-award throttle config. Mirrors
  // types/referral-rewards.mo DEFAULT_BATCH_AWARD_CONFIG. Inlined here.
  let DEFAULT_BATCH_AWARD_CONFIG : BatchAwardConfig = {
    batchSize = 25;
    delaySeconds = 1;
    cappedPerCycle = 25;
  };

  public func migration(old : OldActor) : NewActor {
    // Map every existing NFT to add rewardType = #none (default — existing NFTs
    // are NOT referral bonus assets until an admin flips them) and
    // referralThreshold = DEFAULT_REFERRAL_THRESHOLD (3, admin-tunable). Only
    // meaningful when an admin later sets rewardType to #referralBonus.
    let newNftStore = old.nftStore.map<Nat, OldNft, NewNft>(
      func(id, oldNft) {
        {
          id = oldNft.id;
          ownerId = oldNft.ownerId;
          creatorId = oldNft.creatorId;
          imageBlob = oldNft.imageBlob;
          assetHash = oldNft.assetHash;
          title = oldNft.title;
          description = oldNft.description;
          edition = oldNft.edition;
          mintDate = oldNft.mintDate;
          status = oldNft.status;
          auditHistory = oldNft.auditHistory;
          collectionId = oldNft.collectionId;
          businessName = oldNft.businessName;
          website = oldNft.website;
          discountCode = oldNft.discountCode;
          membershipId = oldNft.membershipId;
          rewardTier = oldNft.rewardTier;
          nftUniqueId = oldNft.nftUniqueId;
          tags = oldNft.tags;
          claimedAt = oldNft.claimedAt;
          supplyLimit = oldNft.supplyLimit;
          rewardType = #none;
          referralThreshold = DEFAULT_REFERRAL_THRESHOLD;
        }
      }
    );

    // Map every existing UserProfile to add referralCode = null (no code yet —
    // the caller generates one on demand via getOrCreateMyReferralCode),
    // referralsCount = 0 (no referrals counted yet), and awardedTiers = []
    // (stacking-ready — no tiers awarded yet). NO EXPIRY — codes never expire
    // once generated, so there is no expiry field to initialize.
    let newUserStore = old.userStore.map<Principal, OldUserProfile, NewUserProfile>(
      func(p, oldProfile) {
        {
          principalId = oldProfile.principalId;
          creatorId = oldProfile.creatorId;
          oisyWalletAddress = oldProfile.oisyWalletAddress;
          email = oldProfile.email;
          emailVerified = oldProfile.emailVerified;
          emailAlerts = oldProfile.emailAlerts;
          subscriptionTier = oldProfile.subscriptionTier;
          creditsUsed = oldProfile.creditsUsed;
          creditsTotal = oldProfile.creditsTotal;
          creditsResetAt = oldProfile.creditsResetAt;
          activeSlots = oldProfile.activeSlots;
          maxSlots = oldProfile.maxSlots;
          createdAt = oldProfile.createdAt;
          stripeProductId = oldProfile.stripeProductId;
          referralCode = null;
          referralsCount = 0;
          awardedTiers = [];
        }
      }
    );

    {
      nftStore = newNftStore;
      collectionStore = old.collectionStore;
      userStore = newUserStore;
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
      // Net-new stable stores: all initialized empty (no referral codes, no
      // eligible-pending entries yet). batchAwardConfig gets the default
      // throttle config (admin-tunable via adminUpdateBatchAwardConfig).
      referralCodeStore = Map.empty();
      referrerCodeIndex = Map.empty();
      eligiblePendingStore = Map.empty();
      batchAwardConfig = { var value = DEFAULT_BATCH_AWARD_CONFIG };
    }
  };
}
