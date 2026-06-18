import Map "mo:core/Map";
import List "mo:core/List";
import Queue "mo:core/Queue";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Text "mo:core/Text";

module {
  public type UserRole = { #admin; #user; #guest };
  public type AccessControlState = { var adminAssigned : Bool; userRoles : Map.Map<Principal, UserRole> };
  public type VerifiedEmailsState = { verifiedEmails : Set.Set<Text> };
  public type AlertType = { #mint_confirmation; #subscription_expiry; #draft_purge; #transfer_window };
  public type SubscriptionTier = { #free; #creator; #pro; #org; #admin };
  public type AuditEntry = { action : Text; caller : Principal; timestamp : Nat; details : ?Text };
  public type NftStatus = { #active; #deleted; #burned };
  public type RewardTier = { #none; #bronze; #silver; #gold; #platinum };

  public type Nft = {
    id : Nat; ownerId : Principal; creatorId : Text; imageBlob : Blob; assetHash : Text;
    title : Text; description : Text; edition : Text; mintDate : Nat; status : NftStatus;
    auditHistory : [AuditEntry]; collectionId : ?Nat; businessName : ?Text; website : ?Text;
    discountCode : ?Text; membershipId : ?Text; rewardTier : RewardTier; nftUniqueId : Text; tags : [Text]
  };

  public type OldCollection = { id : Nat; ownerId : Principal; name : Text; description : Text; tier : SubscriptionTier; maxSize : Nat; createdAt : Nat };
  public type NewCollection = { id : Nat; ownerId : Principal; name : Text; description : Text; tier : SubscriptionTier; maxSize : Nat; createdAt : Nat; previewImage : ?Text; nftIds : [Nat] };

  public type UserProfile = {
    principalId : Principal; creatorId : Text; oisyWalletAddress : ?Text; email : ?Text;
    emailAlerts : [AlertType]; subscriptionTier : SubscriptionTier; creditsUsed : Nat;
    creditsTotal : Nat; creditsResetAt : Nat; activeSlots : Nat; maxSlots : Nat; createdAt : Nat;
    stripeProductId : ?Text
  };

  public type PaymentProofStatus = { #pending; #approved; #rejected };
  public type PaymentProof = {
    id : Text; principal : Principal; txHash : Text; tierRequested : Text; networkType : Text;
    status : PaymentProofStatus; submittedAt : Int; reviewedAt : ?Int; reviewedBy : ?Principal;
    rejectionReason : ?Text
  };

  public type StripeConfigStore = { var secretKey : ?Text; var publicKey : ?Text };
  public type RateLimitEntry = { var count : Nat; var windowStart : Nat };

  public type OldActor = {
    accessControlState : AccessControlState;
    nftStore : Map.Map<Nat, Nft>;
    collectionStore : Map.Map<Nat, OldCollection>;
    userStore : Map.Map<Principal, UserProfile>;
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
  };

  public type NewActor = {
    accessControlState : AccessControlState;
    nftStore : Map.Map<Nat, Nft>;
    collectionStore : Map.Map<Nat, NewCollection>;
    userStore : Map.Map<Principal, UserProfile>;
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
  };

  public func migration(old : OldActor) : NewActor {
    let newCollectionStore = Map.empty<Nat, NewCollection>();
    for ((id, col) in old.collectionStore.entries()) {
      let nftIds = List.empty<Nat>();
      var previewImage : ?Text = null;
      for ((_, nft) in old.nftStore.entries()) {
        if (nft.status == #active) {
          switch (nft.collectionId) {
            case (?cid) {
              if (cid == id) {
                nftIds.add(nft.id);
                if (previewImage == null) {
                  previewImage := ?nft.assetHash;
                };
              };
            };
            case (null) {};
          };
        };
      };
      let newCol : NewCollection = {
        id = col.id;
        ownerId = col.ownerId;
        name = col.name;
        description = col.description;
        tier = col.tier;
        maxSize = col.maxSize;
        createdAt = col.createdAt;
        previewImage = previewImage;
        nftIds = nftIds.toArray();
      };
      newCollectionStore.add(id, newCol);
    };
    {
      accessControlState = old.accessControlState;
      nftStore = old.nftStore;
      collectionStore = newCollectionStore;
      userStore = old.userStore;
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
    }
  };
}
