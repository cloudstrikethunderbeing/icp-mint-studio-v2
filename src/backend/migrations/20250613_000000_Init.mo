import Map "mo:core/Map";
import Queue "mo:core/Queue";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import List "mo:core/List";
import Stripe "mo:caffeineai-stripe/stripe";


module {
  public type OldActor = {};

  public type UserRole = { #admin; #user; #guest };
  public type AccessControlState = { var adminAssigned : Bool; userRoles : Map.Map<Principal, UserRole> };
  public type VerifiedEmailsState = { verifiedEmails : Set.Set<Text> };
  public type AlertType = { #mint_confirmation; #subscription_expiry; #draft_purge; #transfer_window };
  public type SubscriptionTier = { #free; #creator; #pro; #org; #admin };
  public type AuditEntry = { action : Text; caller : Principal; timestamp : Nat; details : ?Text };
  public type NftStatus = { #active; #deleted; #burned };
  public type Nft = { id : Nat; ownerId : Principal; creatorId : Text; imageBlob : Blob; title : Text; description : Text; edition : Text; mintDate : Nat; status : NftStatus; auditHistory : [AuditEntry] };
  public type Collection = { id : Nat; ownerId : Principal; name : Text; description : Text; tier : SubscriptionTier; maxSize : Nat; createdAt : Nat };
  public type UserProfile = { principalId : Principal; creatorId : Text; oisyWalletAddress : ?Text; email : ?Text; emailAlerts : [AlertType]; subscriptionTier : SubscriptionTier; creditsUsed : Nat; creditsTotal : Nat; creditsResetAt : Nat; createdAt : Nat };
  public type StripeConfigStore = { var config : ?Stripe.StripeConfiguration };
  public type RateLimitEntry = { var count : Nat; var windowStart : Nat };
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
    paymentProofStore : Map.Map<Text, PaymentProof>;
    globalAuditLog : Queue.Queue<AuditEntry>;
    creatorIndex : Map.Map<Text, List.List<Nat>>;
    claimTokenStore : Map.Map<Text, ClaimToken>;
    backendBuildTimestamp : { var value : Nat };
    nftToClaimToken : Map.Map<Nat, Text>;
    selfCanisterId : { var value : Text };
  };

  public func migration(_old : OldActor) : NewActor {
    {
      accessControlState = { var adminAssigned = false; userRoles = Map.empty<Principal, UserRole>() };
      nftStore = Map.empty<Nat, Nft>();
      collectionStore = Map.empty<Nat, Collection>();
      userStore = Map.empty<Principal, UserProfile>();
      rateLimitStore = Map.empty<Principal, RateLimitEntry>();
      stripeConfigStore = { var config = null };
      verifiedEmails = { verifiedEmails = Set.empty<Text>() };
      nextNftId = { var value = 0 };
      nextCollectionId = { var value = 0 };
      adminPrincipal = null;
      lastMintTime = { var value = 0 };
      mintCount = { var value = 0 };
      paymentProofStore = Map.empty<Text, PaymentProof>();
      globalAuditLog = Queue.empty<AuditEntry>();
      creatorIndex = Map.empty<Text, List.List<Nat>>();
      claimTokenStore = Map.empty<Text, ClaimToken>();
      backendBuildTimestamp = { var value = 0 };
      nftToClaimToken = Map.empty<Nat, Text>();
      selfCanisterId = { var value = "" };
    }
  };
}
