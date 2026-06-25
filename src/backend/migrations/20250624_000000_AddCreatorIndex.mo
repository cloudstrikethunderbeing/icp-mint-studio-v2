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

  public type Collection = { id : Nat; ownerId : Principal; name : Text; description : Text; tier : SubscriptionTier; maxSize : Nat; createdAt : Nat };

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

  public type ClaimToken = {
    nftId : Nat;
    token : Text;
    createdAt : Int;
    usedBy : ?Principal;
    usedAt : ?Int;
  };

  // OldActor = NewActor of 20250624_000000_AddBackendBuildTimestamp
  public type OldActor = {
    accessControlState : AccessControlState;
    nftStore : Map.Map<Nat, Nft>;
    collectionStore : Map.Map<Nat, Collection>;
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
    backendBuildTimestamp : { var value : Nat };
    claimTokenStore : Map.Map<Text, ClaimToken>;
    creatorIndex : Map.Map<Text, List.List<Nat>>;
    nftToClaimToken : Map.Map<Nat, Text>;
  };

  // NewActor adds creatorIndex (all current fields)
  public type NewActor = {
    accessControlState : AccessControlState;
    nftStore : Map.Map<Nat, Nft>;
    collectionStore : Map.Map<Nat, Collection>;
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
    backendBuildTimestamp : { var value : Nat };
    creatorIndex : Map.Map<Text, List.List<Nat>>;
    claimTokenStore : Map.Map<Text, ClaimToken>;
    nftToClaimToken : Map.Map<Nat, Text>;
  };

  public func migration(old : OldActor) : NewActor {
    let newCreatorIndex = Map.empty<Text, List.List<Nat>>();
    for ((_, nft) in old.nftStore.entries()) {
      if (nft.status == #active) {
        switch (newCreatorIndex.get(nft.creatorId)) {
          case (null) {
            let tokenList = List.empty<Nat>();
            tokenList.add(nft.id);
            newCreatorIndex.add(nft.creatorId, tokenList);
          };
          case (?tokenList) {
            tokenList.add(nft.id);
            newCreatorIndex.add(nft.creatorId, tokenList);
          };
        };
      };
    };
    {
      accessControlState = old.accessControlState;
      nftStore = old.nftStore;
      collectionStore = old.collectionStore;
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
      backendBuildTimestamp = old.backendBuildTimestamp;
      creatorIndex = newCreatorIndex;
      claimTokenStore = old.claimTokenStore;
      nftToClaimToken = old.nftToClaimToken;
    }
  };
}
