import Map "mo:core/Map";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Queue "mo:core/Queue";
import List "mo:core/List";

module {
  public type UserRole = { #admin; #user; #guest };
  public type AccessControlState = { var adminAssigned : Bool; userRoles : Map.Map<Principal, UserRole> };
  public type VerifiedEmailsState = { verifiedEmails : Set.Set<Text> };
  public type AlertType = { #mint_confirmation; #subscription_expiry; #draft_purge; #transfer_window };
  public type SubscriptionTier = { #free; #creator; #pro; #org; #admin };
  public type AuditEntry = { action : Text; caller : Principal; timestamp : Nat; details : ?Text };
  public type NftStatus = { #active; #deleted; #burned };

  public type PaymentProofStatus = { #pending; #approved; #rejected };
  public type PaymentProof = {
    id : Text; principal : Principal; txHash : Text; tierRequested : Text; networkType : Text;
    status : PaymentProofStatus; submittedAt : Int; reviewedAt : ?Int; reviewedBy : ?Principal;
    rejectionReason : ?Text
  };
  public type ClaimToken = {
    nftId : Nat;
    token : Text;
    createdAt : Int;
    usedBy : ?Principal;
    usedAt : ?Int;
  };

  // Old Nft without assetHash (matches 20250613 NewActor / .most snapshot)
  public type OldNft = { id : Nat; ownerId : Principal; creatorId : Text; imageBlob : Blob; title : Text; description : Text; edition : Text; mintDate : Nat; status : NftStatus; auditHistory : [AuditEntry] };

  public type Collection = { id : Nat; ownerId : Principal; name : Text; description : Text; tier : SubscriptionTier; maxSize : Nat; createdAt : Nat };

  // Old UserProfile without activeSlots/maxSlots (matches 20250613 NewActor / .most snapshot)
  public type OldUserProfile = { principalId : Principal; creatorId : Text; oisyWalletAddress : ?Text; email : ?Text; emailAlerts : [AlertType]; subscriptionTier : SubscriptionTier; creditsUsed : Nat; creditsTotal : Nat; creditsResetAt : Nat; createdAt : Nat };

  // Old stripe config as nested config (matches 20250613 NewActor / .most snapshot)
  public type OldStripeConfiguration = { allowedCountries : [Text]; secretKey : Text };
  public type OldStripeConfigStore = { var config : ?OldStripeConfiguration };

  public type RateLimitEntry = { var count : Nat; var windowStart : Nat };

  public type OldActor = {
    accessControlState : AccessControlState;
    nftStore : Map.Map<Nat, OldNft>;
    collectionStore : Map.Map<Nat, Collection>;
    userStore : Map.Map<Principal, OldUserProfile>;
    rateLimitStore : Map.Map<Principal, RateLimitEntry>;
    stripeConfigStore : OldStripeConfigStore;
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
    backendBuildTimestamp : { var value : Nat };
    nftToClaimToken : Map.Map<Nat, Text>;
  };

  // New Nft with assetHash (matches current main.mo)
  public type NewNft = { id : Nat; ownerId : Principal; creatorId : Text; imageBlob : Blob; assetHash : Text; title : Text; description : Text; edition : Text; mintDate : Nat; status : NftStatus; auditHistory : [AuditEntry] };

  // New UserProfile with activeSlots/maxSlots (matches current main.mo)
  public type NewUserProfile = { principalId : Principal; creatorId : Text; oisyWalletAddress : ?Text; email : ?Text; emailAlerts : [AlertType]; subscriptionTier : SubscriptionTier; creditsUsed : Nat; creditsTotal : Nat; creditsResetAt : Nat; activeSlots : Nat; maxSlots : Nat; createdAt : Nat };

  // New flat stripe config (matches current main.mo)
  public type NewStripeConfigStore = { var secretKey : ?Text; var publicKey : ?Text };

  public type NewActor = {
    accessControlState : AccessControlState;
    nftStore : Map.Map<Nat, NewNft>;
    collectionStore : Map.Map<Nat, Collection>;
    userStore : Map.Map<Principal, NewUserProfile>;
    rateLimitStore : Map.Map<Principal, RateLimitEntry>;
    stripeConfigStore : NewStripeConfigStore;
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
    backendBuildTimestamp : { var value : Nat };
    nftToClaimToken : Map.Map<Nat, Text>;
  };

  func getMaxSlotsForTier(tier : SubscriptionTier) : Nat {
    switch (tier) {
      case (#free) { 1 };
      case (#creator) { 10 };
      case (#pro) { 100 };
      case (#org) { 500 };
      case (#admin) { 999999 };
    }
  };

  public func migration(old : OldActor) : NewActor {
    let newUserStore = Map.empty<Principal, NewUserProfile>();
    for ((principal, profile) in old.userStore.entries()) {
      let newProfile : NewUserProfile = {
        principalId = profile.principalId;
        creatorId = profile.creatorId;
        oisyWalletAddress = profile.oisyWalletAddress;
        email = profile.email;
        emailAlerts = profile.emailAlerts;
        subscriptionTier = profile.subscriptionTier;
        creditsUsed = profile.creditsUsed;
        creditsTotal = profile.creditsTotal;
        creditsResetAt = profile.creditsResetAt;
        activeSlots = 0;
        maxSlots = getMaxSlotsForTier(profile.subscriptionTier);
        createdAt = profile.createdAt;
      };
      newUserStore.add(principal, newProfile);
    };

    let newNftStore = Map.empty<Nat, NewNft>();
    for ((id, nft) in old.nftStore.entries()) {
      newNftStore.add(id, { nft with assetHash = "" });
    };

    {
      accessControlState = old.accessControlState;
      nftStore = newNftStore;
      collectionStore = old.collectionStore;
      userStore = newUserStore;
      rateLimitStore = old.rateLimitStore;
      stripeConfigStore = {
        var secretKey = switch (old.stripeConfigStore.config) {
          case (?config) { ?config.secretKey };
          case (null) { null }
        };
        var publicKey = null;
      };
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
      backendBuildTimestamp = old.backendBuildTimestamp;
      nftToClaimToken = old.nftToClaimToken;
    }
  };
}
