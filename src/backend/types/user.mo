import Common "common";

module {
  public type UserProfile = {
    principalId : Principal;
    creatorId : Common.CreatorId;
    oisyWalletAddress : ?Text;
    email : ?Text;
    // [H5] Deny-by-default email verification. Emails set via setEmail /
    // sendVerificationEmail are stored with emailVerified = false. No flow may
    // treat an email as verified without a real challenge-response. The
    // verifiedEmails stable Set in main.mo is the source of truth for
    // actually-verified emails and is NOT auto-populated by setEmail.
    emailVerified : Bool;
    emailAlerts : [Common.AlertType];
    subscriptionTier : Common.SubscriptionTier;
    creditsUsed : Nat;
    creditsTotal : Nat;
    creditsResetAt : Common.Timestamp;
    activeSlots : Nat;
    maxSlots : Nat;
    createdAt : Common.Timestamp;
    stripeProductId : ?Text;
    // Referral-rewards fields (net-new). referralCode is the caller's own
    // shareable code (random + unguessable, NO EXPIRY). referralsCount is the
    // number of successful referrals attributed to this user. awardedTiers is
    // the stacking-ready list of threshold tiers (Nat) the user has already
    // been awarded a referralBonus NFT for — dedup by tier. All three are
    // initialized by the migration chain (20260726_050000.mo) for existing
    // profiles and by UserLib.createProfile for new profiles.
    referralCode : ?Text;
    referralsCount : Nat;
    awardedTiers : [Nat];
  };
}
