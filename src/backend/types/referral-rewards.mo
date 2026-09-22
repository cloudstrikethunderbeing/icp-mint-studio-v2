import Common "common";
import Principal "mo:core/Principal";

module {
  /// Reward type for an NFT. `#none` is the default for all non-referral NFTs.
  /// `#referralBonus` marks an NFT as the bonus asset awarded when a referrer
  /// crosses the NFT's `referralThreshold`. Only meaningful together with the
  /// new `referralThreshold` field on Nft.
  public type RewardType = {
    #none;
    #referralBonus;
  };

  /// Default referral threshold placeholder (admin-tunable). Only meaningful
  /// when rewardType = #referralBonus. NO EXPIRY — referral codes never
  /// expire, so this type carries no expiry field by design.
  public let DEFAULT_REFERRAL_THRESHOLD : Nat = 3;

  /// Retroactive batch-award throttle config. Default batch size 25, default
  /// delay 1 second, capped per cycle. The dedicated transient store that
  /// holds the in-flight batch state follows the rate-limiting pattern (its
  /// own dedicated Map, not the shared rateLimitStore).
  public type BatchAwardConfig = {
    batchSize : Nat;
    delaySeconds : Nat;
    cappedPerCycle : Nat;
  };

  public let DEFAULT_BATCH_AWARD_CONFIG : BatchAwardConfig = {
    batchSize = 25;
    delaySeconds = 1;
    cappedPerCycle = 25;
  };

  /// Eligible-pending queue entry. Tracks a user who crossed a referral
  /// threshold but no active in-stock referralBonus NFT exists at the time.
  /// `thresholdTier` is the awardedTiers index the user became eligible for;
  /// `enqueuedAt` is the timestamp used for earliest-eligible-first ordering
  /// when limited-supply awards are processed. Deactivation preserves pending
  /// eligibility — removing a user from the queue is NOT done on
  /// deactivation; only on actual award or admin purge.
  public type EligiblePendingEntry = {
    referrerPrincipal : Principal;
    thresholdTier : Nat;
    enqueuedAt : Common.Timestamp;
  };

  /// Referral code mapping: referralCode (Text) -> referrerPrincipal.
  /// Codes are random + unguessable and NEVER expire (NO EXPIRY). The mapping
  /// is the canonical lookup from a shareable code to the referrer whose
  /// referralsCount it increments.
  public type ReferralCodeMapping = {
    code : Text;
    referrerPrincipal : Principal;
    createdAt : Common.Timestamp;
  };

  /// Admin Health metrics for the referral/bonus subsystem. Extends the
  /// existing MetricsLib Health tab data sources. All queries are admin-gated
  /// (consistent with getNftClaimBreakdown). `eligiblePendingQueueLengthPerTier`
  /// is indexed by threshold tier (Nat) — stacking-ready.
  public type ReferralHealthMetrics = {
    bonusNftsAutoAwarded : Nat;
    remainingBonusSupply : Nat;
    eligiblePendingCount : Nat;
    eligiblePendingQueueLengthPerTier : [Nat];
    totalReferralCodes : Nat;
    totalReferralsCounted : Nat;
  };

  /// Result of recording a referral (incrementing a referrer's count). Returns
  /// the referrer's new referralsCount and whether the referrer crossed a
  /// threshold that enqueues them as eligible-pending.
  public type RecordReferralResult = {
    referrerPrincipal : Principal;
    newReferralsCount : Nat;
    newlyEligiblePending : Bool;
    thresholdTier : ?Nat;
  };

  /// Result of a retroactive batch-award cycle. Returns how many awards were
  /// issued this cycle, how many remain pending, and whether the cycle cap was
  /// hit (caller should schedule the next cycle after the configured delay).
  public type BatchAwardResult = {
    awardedThisCycle : Nat;
    remainingPending : Nat;
    hitCycleCap : Bool;
  };

  /// Public (non-redacted) referral status for the authenticated caller.
  /// Preserves [OQL-LOCKDOWN]: never exposes discountCode, membershipId,
  /// secretKey, or stripe mode. Only the caller's own referralCode,
  /// referralsCount, and awardedTiers are surfaced.
  public type MyReferralStatus = {
    referralCode : ?Text;
    referralsCount : Nat;
    awardedTiers : [Nat];
  };
}
