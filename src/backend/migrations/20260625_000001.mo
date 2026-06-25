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
  };

  public type Collection = {
    id : Nat; ownerId : Principal; name : Text; description : Text;
    tier : SubscriptionTier; maxSize : Nat; createdAt : Nat;
    previewImage : ?Text; nftIds : [Nat]
  };

  public type UserProfile = {
    principalId : Principal; creatorId : Text; oisyWalletAddress : ?Text; email : ?Text;
    emailAlerts : [AlertType]; subscriptionTier : SubscriptionTier; creditsUsed : Nat;
    creditsTotal : Nat; creditsResetAt : Nat; activeSlots : Nat; maxSlots : Nat; createdAt : Nat;
    stripeProductId : ?Text;
  };

  public type PaymentProof = {
    id : Text; principal : Principal; txHash : Text; tierRequested : Text; networkType : Text;
    status : PaymentProofStatus; submittedAt : Int; reviewedAt : ?Int; reviewedBy : ?Principal;
    rejectionReason : ?Text
  };

  public type StripeConfigStore = { var secretKey : ?Text; var publicKey : ?Text };
  public type RateLimitEntry = { var count : Nat; var windowStart : Nat };

  // ── OldActor = NewActor of 20260625_000000_RemoveAccessControl ───────────
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
  };

  // ── NewActor: adminPrincipals added ──────────────────────────────────────
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
    adminPrincipals : [Principal];
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
      adminPrincipals = [
        Principal.fromText("4upfr-qatay-au6yv-idyna-teuuv-wiu6c-zeche-ifmg3-52rk7-lavtf-uqe"),
        Principal.fromText("62vwb-gcj3s-lhto3-dvrlp-lmf7d-pm3bp-hjf34-swql5-s6zq2-6siyk-4qe"),
      ];
    }
  };
}
