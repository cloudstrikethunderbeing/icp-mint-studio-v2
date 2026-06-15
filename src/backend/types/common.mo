import Debug "mo:core/Debug";
module {
  public type UserId = Principal;
  public type Timestamp = Nat;
  public type CreatorId = Text;

  public type SubscriptionTier = {
    #free;
    #creator;
    #pro;
    #org;
    #admin;
  };

  public type AlertType = {
    #mint_confirmation;
    #subscription_expiry;
    #draft_purge;
    #transfer_window;
  };

  public type RewardTier = {
    #none;
    #bronze;
    #silver;
    #gold;
    #platinum;
  };

  public type AuditEntry = {
    action : Text;
    caller : Principal;
    timestamp : Timestamp;
    details : ?Text;
  };

  public type TransferResult = {
    success : Bool;
    error : ?Text;
    newOwnerPrincipal : ?Text;
  };

  public type UpdateMetadataRequest = {
    businessName : ?Text;
    website : ?Text;
    discountCode : ?Text;
    membershipId : ?Text;
    rewardTier : ?RewardTier;
    tags : ?[Text];
  };
}
