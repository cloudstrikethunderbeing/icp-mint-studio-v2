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

  // OLD UserProfile (from 20260724_000000_AddClaimersStore.mo) — no emailVerified.
  public type OldUserProfile = {
    principalId : Principal; creatorId : Text; oisyWalletAddress : ?Text; email : ?Text;
    emailAlerts : [AlertType]; subscriptionTier : SubscriptionTier; creditsUsed : Nat;
    creditsTotal : Nat; creditsResetAt : Nat; activeSlots : Nat; maxSlots : Nat; createdAt : Nat;
    stripeProductId : ?Text;
  };

  // NEW UserProfile — adds emailVerified : Bool (deny-by-default: false).
  public type NewUserProfile = {
    principalId : Principal; creatorId : Text; oisyWalletAddress : ?Text; email : ?Text;
    emailVerified : Bool;
    emailAlerts : [AlertType]; subscriptionTier : SubscriptionTier; creditsUsed : Nat;
    creditsTotal : Nat; creditsResetAt : Nat; activeSlots : Nat; maxSlots : Nat; createdAt : Nat;
    stripeProductId : ?Text;
  };

  public type PaymentProof = {
    id : Text; principal : Principal; txHash : Text; tierRequested : Text; networkType : Text;
    status : PaymentProofStatus; submittedAt : Int; reviewedAt : ?Int; reviewedBy : ?Principal;
    rejectionReason : ?Text
  };

  // OLD StripeConfigStore (from 20260724_000000_AddClaimersStore.mo) — held the
  // raw secret key on-chain. This is the C1 vulnerability: the secret was
  // persisted in stable storage and survived upgrades.
  public type OldStripeConfigStore = { var secretKey : ?Text; var publicKey : ?Text };

  // NEW StripeConfigStore — holds ONLY mode + publishableKey. The raw secret
  // key is NEVER stored on-chain. See lib/stripe.mo.
  public type NewStripeConfigStore = { var mode : ?Text; var publishableKey : ?Text };

  public type RateLimitEntry = { var count : Nat; var windowStart : Nat };

  // ── OldActor = NewActor of 20260724_000000_AddClaimersStore.mo (chain HEAD)
  // Copied verbatim — this is the deployed stable signature we are upgrading
  // from. The stripeConfigStore here uses the OLD shape (secretKey/publicKey)
  // and UserProfile here has NO emailVerified field.
  public type OldActor = {
    nftStore : Map.Map<Nat, Nft>;
    collectionStore : Map.Map<Nat, Collection>;
    userStore : Map.Map<Principal, OldUserProfile>;
    rateLimitStore : Map.Map<Principal, RateLimitEntry>;
    stripeConfigStore : OldStripeConfigStore;
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
  // Two changes vs OldActor:
  //   (1) stripeConfigStore : OldStripeConfigStore → NewStripeConfigStore
  //       (secretKey dropped, publicKey → publishableKey, mode derived).
  //   (2) userStore : Map<Principal, OldUserProfile> → Map<Principal, NewUserProfile>
  //       (emailVerified = false added to every profile).
  // The transient rate-limit stores (setupAdminRateLimitStore,
  // claimRateLimitStore, paymentProofRateLimitStore) are NOT stable and do NOT
  // appear here. All other stable fields pass through unchanged.
  public type NewActor = {
    nftStore : Map.Map<Nat, Nft>;
    collectionStore : Map.Map<Nat, Collection>;
    userStore : Map.Map<Principal, NewUserProfile>;
    rateLimitStore : Map.Map<Principal, RateLimitEntry>;
    stripeConfigStore : NewStripeConfigStore;
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

  // [C1] Derive the new Stripe mode from the OLD secret key prefix. The old
  // secret key is NEVER carried forward — only its prefix is read to derive
  // the mode, then the secret itself is discarded. sk_test_* → "test",
  // sk_live_* → "live", anything else (including null) → null. This is a
  // best-effort derivation; admins must re-configure via setStripeConfiguration
  // after upgrade to set the correct mode + publishableKey.
  func deriveMode(oldSecret : ?Text) : ?Text {
    switch (oldSecret) {
      case (null) { null };
      case (?sk) {
        if (sk.startsWith(#text "sk_live_")) { ?"live" }
        else if (sk.startsWith(#text "sk_test_")) { ?"test" }
        else { null };
      };
    }
  };

  public func migration(old : OldActor) : NewActor {
    // [C1] Build the new StripeConfigStore from the old one:
    //   - mode          ← derived from old secretKey prefix (sk_test_/sk_live_)
    //   - publishableKey ← old publicKey (the publishable key is safe to keep)
    //   - secretKey     ← DISCARDED (never carried forward; secrets must not
    //                     persist across upgrades — the whole point of C1)
    let newStripeConfig : NewStripeConfigStore = {
      var mode = deriveMode(old.stripeConfigStore.secretKey);
      var publishableKey = old.stripeConfigStore.publicKey;
    };

    // [H5] Add emailVerified = false to every existing UserProfile. Deny-by-
    // default: no existing email is treated as verified after the migration.
    // The verifiedEmails stable Set remains the source of truth for actually-
    // verified emails and is NOT auto-populated here.
    let newUserStore = old.userStore.map<Principal, OldUserProfile, NewUserProfile>(
      func(p, oldProfile) {
        {
          principalId = oldProfile.principalId;
          creatorId = oldProfile.creatorId;
          oisyWalletAddress = oldProfile.oisyWalletAddress;
          email = oldProfile.email;
          emailVerified = false;
          emailAlerts = oldProfile.emailAlerts;
          subscriptionTier = oldProfile.subscriptionTier;
          creditsUsed = oldProfile.creditsUsed;
          creditsTotal = oldProfile.creditsTotal;
          creditsResetAt = oldProfile.creditsResetAt;
          activeSlots = oldProfile.activeSlots;
          maxSlots = oldProfile.maxSlots;
          createdAt = oldProfile.createdAt;
          stripeProductId = oldProfile.stripeProductId;
        }
      }
    );

    {
      nftStore = old.nftStore;
      collectionStore = old.collectionStore;
      userStore = newUserStore;
      rateLimitStore = old.rateLimitStore;
      stripeConfigStore = newStripeConfig;
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
    }
  };
}
