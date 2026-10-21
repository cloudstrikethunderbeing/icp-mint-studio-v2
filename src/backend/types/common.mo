module {
  public type UserId = Principal;
  public type Timestamp = Nat;
  public type CreatorId = Text;

  // Known LIVE backend canister id — the backend's own liveness marker. This is
  // NOT a wiring pin: the frontend never reads it for actor creation. It is
  // compared against the actor's OWN runtime identity (the selfCanisterId
  // stable value, which main.mo keeps in sync with
  // Principal.fromActor(Main).toText()) so draft-only guards are correct on
  // BOTH draft and live and can never pin a stale id.
  public let LIVE_CANISTER_ID : Text = "kd6s6-ziaaa-aaaam-ajfwa-cai";

  // [SCALE] Default page size for listing endpoints when the caller passes no
  // limit (limit == 0). Lives here as a module constant (NOT a top-level `let`
  // in a mixin, which would be implicitly stable state and trap at runtime).
  public let DEFAULT_PAGE_LIMIT : Nat = 50;

  public type SubscriptionTier = {
    #free;
    #creator;
    #pro;
    #org;
    // #admin removed — role is separate from tier
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
    // Whole-value USD price (positive integer dollars, no cents). null leaves
    // the current price unchanged; a value sets/updates the listing price.
    priceUsd : ?Nat;
  };
}
