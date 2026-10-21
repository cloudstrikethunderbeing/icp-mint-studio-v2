import Map "mo:core/Map";
import List "mo:core/List";
import Queue "mo:core/Queue";
import Set "mo:core/Set";
import Principal "mo:core/Principal";

module {
  // ── Shared types (inlined — no project imports allowed) ──────────────────

  public type VerifiedEmailsState = { verifiedEmails : Set.Set<Text> };
  public type AlertType = { #mint_confirmation; #subscription_expiry; #draft_purge; #transfer_window };
  public type SubscriptionTier = { #free; #creator; #pro; #org };
  public type NftStatus = { #active; #deleted; #burned };
  public type AuditEntry = { action : Text; caller : Principal; timestamp : Nat; details : ?Text };
  public type RewardTier = { #none; #bronze; #silver; #gold; #platinum };
  public type PaymentProofStatus = { #pending; #approved; #rejected };
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

  public type Nft = {
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

  // ── OldActor = NewActor of 20260726_050000.mo (chain HEAD), inlined.
  // This is the deployed stable signature we are upgrading from. It has NO
  // ownerIndex and NO collectionNftCount.
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
  };

  // ── NewActor: every stable field in the updated main.mo ──────────────────
  // Changes vs OldActor: two net-new stable fields —
  //   (1) ownerIndex : Map<Principal, List<Nat>> — owner -> owned NFT ids.
  //   (2) collectionNftCount : Map<Nat, Nat> — collectionId -> active count.
  // Both are backfilled from the existing nftStore so listings are correct
  // immediately after the upgrade. All other stable fields pass through.
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
  };

  public func migration(old : OldActor) : NewActor {
    // Backfill the owner index from every existing NFT: owner -> [nft ids].
    // Ids are appended in store iteration order; the index is a set-like list
    // (duplicates are impossible because each NFT id appears once).
    let ownerIndex = Map.empty<Principal, List.List<Nat>>();
    for ((id, nft) in old.nftStore.entries()) {
      switch (ownerIndex.get(nft.ownerId)) {
        case (null) {
          let ids = List.empty<Nat>();
          ids.add(id);
          ownerIndex.add(nft.ownerId, ids);
        };
        case (?ids) {
          ids.add(id);
          ownerIndex.add(nft.ownerId, ids);
        };
      };
    };

    // Backfill the per-collection counter from every ACTIVE NFT that has a
    // collectionId — the same predicate countNftsInCollection used.
    let collectionNftCount = Map.empty<Nat, Nat>();
    for ((_, nft) in old.nftStore.entries()) {
      if (nft.status == #active) {
        switch (nft.collectionId) {
          case (?cid) {
            let current = switch (collectionNftCount.get(cid)) { case (?n) n; case (null) 0 };
            collectionNftCount.add(cid, current + 1);
          };
          case (null) {};
        };
      };
    };

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
      ownerIndex;
      collectionNftCount;
    }
  };
}
