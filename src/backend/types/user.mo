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
  };
}
