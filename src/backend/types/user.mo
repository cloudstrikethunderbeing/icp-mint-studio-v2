import Common "common";

module {
  public type UserProfile = {
    principalId : Principal;
    creatorId : Common.CreatorId;
    oisyWalletAddress : ?Text;
    email : ?Text;
    emailAlerts : [Common.AlertType];
    subscriptionTier : Common.SubscriptionTier;
    creditsUsed : Nat;
    creditsTotal : Nat;
    creditsResetAt : Common.Timestamp;
    activeSlots : Nat;
    maxSlots : Nat;
    createdAt : Common.Timestamp;
    stripeProductId : ?Text;
    role : { #admin; #creator };
  };
}
