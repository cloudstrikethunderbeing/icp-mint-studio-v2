import Map "mo:core/Map";
import List "mo:core/List";
import Queue "mo:core/Queue";
import Set "mo:core/Set";
import Principal "mo:core/Principal";

module {
  // ── Shared types (inlined — no project imports allowed) ──────────────────

  public type UserRole = { #admin; #user; #guest };
  public type AccessControlState = { var adminAssigned : Bool; userRoles : Map.Map<Principal, UserRole> };
  public type VerifiedEmailsState = { verifiedEmails : Set.Set<Text> };
  public type AlertType = { #mint_confirmation; #subscription_expiry; #draft_purge; #transfer_window };
  public type OldSubscriptionTier = { #free; #creator; #pro; #org; #admin };
  public type NewSubscriptionTier = { #free; #creator; #pro; #org };
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
  };

  public type Nft = {
    id : Nat; ownerId : Principal; creatorId : Text; imageBlob : Blob; assetHash : Text;
    title : Text; description : Text; edition : Text; mintDate : Nat; status : NftStatus;
    auditHistory : [AuditEntry]; collectionId : ?Nat; businessName : ?Text; website : ?Text;
    discountCode : ?Text; membershipId : ?Text; rewardTier : RewardTier; nftUniqueId : Text; tags : [Text];
    claimedAt : ?Nat;
  };

  public type OldCollection = {
    id : Nat; ownerId : Principal; name : Text; description : Text;
    tier : OldSubscriptionTier; maxSize : Nat; createdAt : Nat;
    previewImage : ?Text; nftIds : [Nat]
  };

  public type NewCollection = {
    id : Nat; ownerId : Principal; name : Text; description : Text;
    tier : NewSubscriptionTier; maxSize : Nat; createdAt : Nat;
    previewImage : ?Text; nftIds : [Nat]
  };

  public type OldUserProfile = {
    principalId : Principal; creatorId : Text; oisyWalletAddress : ?Text; email : ?Text;
    emailAlerts : [AlertType]; subscriptionTier : OldSubscriptionTier; creditsUsed : Nat;
    creditsTotal : Nat; creditsResetAt : Nat; activeSlots : Nat; maxSlots : Nat; createdAt : Nat;
    stripeProductId : ?Text
  };

  public type NewUserProfile = {
    principalId : Principal; creatorId : Text; oisyWalletAddress : ?Text; email : ?Text;
    emailAlerts : [AlertType]; subscriptionTier : NewSubscriptionTier; creditsUsed : Nat;
    creditsTotal : Nat; creditsResetAt : Nat; activeSlots : Nat; maxSlots : Nat; createdAt : Nat;
    stripeProductId : ?Text;
    role : { #admin; #creator }
  };

  public type PaymentProof = {
    id : Text; principal : Principal; txHash : Text; tierRequested : Text; networkType : Text;
    status : PaymentProofStatus; submittedAt : Int; reviewedAt : ?Int; reviewedBy : ?Principal;
    rejectionReason : ?Text
  };

  public type StripeConfigStore = { var secretKey : ?Text; var publicKey : ?Text };
  public type RateLimitEntry = { var count : Nat; var windowStart : Nat };

  // ── OldActor = NewActor of 20260617_000000_AddClaimedAt ──────────────────
  public type OldActor = {
    accessControlState : AccessControlState;
    nftStore : Map.Map<Nat, Nft>;
    collectionStore : Map.Map<Nat, OldCollection>;
    userStore : Map.Map<Principal, OldUserProfile>;
    rateLimitStore : Map.Map<Principal, RateLimitEntry>;
    stripeConfigStore : StripeConfigStore;
    verifiedEmails : VerifiedEmailsState;
    nextNftId : { var value : Nat };
    nextCollectionId : { var value : Nat };
    adminPrincipal : ?Principal;
    lastMintTime : { var value : Int };
    mintCount : { var value : Nat };
    selfCanisterId : { var value : Text };
    globalAuditLog : Queue.Queue<AuditEntry>;
    paymentProofStore : Map.Map<Text, PaymentProof>;
    creatorIndex : Map.Map<Text, List.List<Nat>>;
    claimTokenStore : Map.Map<Text, ClaimToken>;
    nftToClaimToken : Map.Map<Nat, Text>;
  };

  public type NewActor = {
    accessControlState : AccessControlState;
    nftStore : Map.Map<Nat, Nft>;
    collectionStore : Map.Map<Nat, NewCollection>;
    userStore : Map.Map<Principal, NewUserProfile>;
    rateLimitStore : Map.Map<Principal, RateLimitEntry>;
    stripeConfigStore : StripeConfigStore;
    verifiedEmails : VerifiedEmailsState;
    nextNftId : { var value : Nat };
    nextCollectionId : { var value : Nat };
    adminPrincipal : ?Principal;
    lastMintTime : { var value : Int };
    mintCount : { var value : Nat };
    selfCanisterId : { var value : Text };
    globalAuditLog : Queue.Queue<AuditEntry>;
    paymentProofStore : Map.Map<Text, PaymentProof>;
    creatorIndex : Map.Map<Text, List.List<Nat>>;
    claimTokenStore : Map.Map<Text, ClaimToken>;
    nftToClaimToken : Map.Map<Nat, Text>;
  };

  public func migration(old : OldActor) : NewActor {
    // Migrate collections: #admin tier -> #org
    let newCollectionStore = old.collectionStore.map<Nat, OldCollection, NewCollection>(
      func(_, col) {
        let newTier = switch (col.tier) {
          case (#admin) { #org };
          case (#free) { #free };
          case (#creator) { #creator };
          case (#pro) { #pro };
          case (#org) { #org };
        };
        {
          id = col.id;
          ownerId = col.ownerId;
          name = col.name;
          description = col.description;
          tier = newTier;
          maxSize = col.maxSize;
          createdAt = col.createdAt;
          previewImage = col.previewImage;
          nftIds = col.nftIds;
        }
      }
    );

    // Migrate user profiles: add role field
    let adminPrincipal = old.adminPrincipal;
    let newUserStore = old.userStore.map<Principal, OldUserProfile, NewUserProfile>(
      func(principal, profile) {
        let isAdmin = switch (adminPrincipal) {
          case (?admin) { Principal.equal(admin, principal) };
          case (null) { false };
        };
        let newTier = switch (profile.subscriptionTier) {
          case (#admin) { #org };
          case (#free) { #free };
          case (#creator) { #creator };
          case (#pro) { #pro };
          case (#org) { #org };
        };
        {
          principalId = profile.principalId;
          creatorId = profile.creatorId;
          oisyWalletAddress = profile.oisyWalletAddress;
          email = profile.email;
          emailAlerts = profile.emailAlerts;
          subscriptionTier = newTier;
          creditsUsed = profile.creditsUsed;
          creditsTotal = profile.creditsTotal;
          creditsResetAt = profile.creditsResetAt;
          activeSlots = profile.activeSlots;
          maxSlots = profile.maxSlots;
          createdAt = profile.createdAt;
          stripeProductId = profile.stripeProductId;
          role = if (isAdmin) { #admin } else { #creator };
        }
      }
    );

    {
      accessControlState = old.accessControlState;
      nftStore = old.nftStore;
      collectionStore = newCollectionStore;
      userStore = newUserStore;
      rateLimitStore = old.rateLimitStore;
      stripeConfigStore = old.stripeConfigStore;
      verifiedEmails = old.verifiedEmails;
      nextNftId = old.nextNftId;
      nextCollectionId = old.nextCollectionId;
      adminPrincipal = old.adminPrincipal;
      lastMintTime = old.lastMintTime;
      mintCount = old.mintCount;
      selfCanisterId = old.selfCanisterId;
      globalAuditLog = old.globalAuditLog;
      paymentProofStore = old.paymentProofStore;
      creatorIndex = old.creatorIndex;
      claimTokenStore = old.claimTokenStore;
      nftToClaimToken = old.nftToClaimToken;
    }
  };
}
