import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Queue "mo:core/Queue";
import Result "mo:core/Result";
import Random "mo:core/Random";
import Set "mo:core/Set";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Debug "mo:core/Debug";
import Auth "../lib/auth";
import NftLib "../lib/nft";
import UserLib "../lib/user";
import ReferralLib "../lib/referral-rewards";
import ClaimLib "../lib/claim-link";
import NftTypes "../types/nft";
import Types "../types/referral-rewards";
import Common "../types/common";
import ClaimTypes "../types/claim-link";

mixin (
  nftStore : NftLib.NftStore,
  userStore : UserLib.UserStore,
  referralCodeStore : ReferralLib.ReferralCodeStore,
  referrerCodeIndex : ReferralLib.ReferrerCodeIndex,
  eligiblePendingStore : ReferralLib.EligiblePendingStore,
  batchAwardThrottleStore : ReferralLib.BatchAwardThrottleStore,
  batchAwardConfig : { var value : Types.BatchAwardConfig },
  globalAuditLog : Queue.Queue<Common.AuditEntry>,
  selfCanisterId : { var value : Text },
  admins : { var value : [Principal] },
  // Claim-link stores required to reuse ClaimLib.claimNftInternal (the canonical
  // mint path) for the retroactive batch-award. The batch-award MUST NOT create
  // a parallel mint — it reuses the same validation flow (anonymous reject,
  // [H3] rate limit, token validation, supply cap, assertClaimable, atomic
  // useToken, [H2] counter-ordering, new NFT copy) by calling
  // ClaimLib.claimNftInternal with an internal token looked up from
  // nftToClaimToken.
  claimTokenStore : Map.Map<Text, ClaimTypes.ClaimToken>,
  claimersStore : Map.Map<Text, Set.Set<Principal>>,
  nftToClaimToken : Map.Map<Nat, Text>,
  nextNftId : { var value : Nat },
  // [H3] DEDICATED transient rate-limit store for claimNft, shared with the
  // claim-link mixin so the auto-award and batch-award reuse the SAME per-
  // principal 1-claim-per-60s limiter as the public claim (a referrer who
  // just claimed is rate-limited from receiving an auto-award within the same
  // 60s window — intentional; the next batch-award cycle retries). Same
  // dedicated store as in mixins/claim-link-api.mo — passed by reference from
  // main.mo so both mixins share one limiter.
  claimRateLimitStore : Map.Map<Principal, { var lastClaimSec : Int }>,
) {

  /// Public (authenticated): get or create the caller's own referral code.
  /// Codes are random + unguessable and NEVER expire (NO EXPIRY). Idempotent —
  /// returns the existing code if the caller already has one. Rejects
  /// anonymous callers. Also persists the new code onto the caller's
  /// UserProfile.referralCode so getMyReferralStatus can read it without
  /// scanning the referrerCodeIndex.
  public shared ({ caller }) func getOrCreateMyReferralCode() : async Result.Result<Text, Text> {
    // Reject anonymous callers — a referral code is tied to a real principal.
    if (caller.isAnonymous()) {
      return #err("Authentication required to generate a referral code");
    };
    // Await ICP raw randomness for an unguessable code. The lib function
    // getOrCreateReferralCode is pure aside from the two store writes; the
    // randomness is awaited here at the mixin layer.
    let randomBytes = await Random.blob();
    let now : Common.Timestamp = Int.abs(Time.now());
    let code = ReferralLib.getOrCreateReferralCode(
      referralCodeStore,
      referrerCodeIndex,
      caller,
      now,
      randomBytes,
    );
    // Persist the code onto the caller's UserProfile.referralCode so
    // getMyReferralStatus can read it directly from the profile (canonical
    // post-migration). Idempotent — if the profile already has this code,
    // this is a no-op write. If the caller has no profile yet, the code is
    // still stored in the codeStore + referrerCodeIndex and will be
    // backfilled onto the profile when it is created.
    switch (UserLib.getProfile(userStore, caller)) {
      case (null) {};
      case (?profile) {
        switch (profile.referralCode) {
          case (?existing) {
            if (existing != code) {
              UserLib.updateProfile(userStore, caller, { profile with referralCode = ?code });
            };
          };
          case (null) {
            UserLib.updateProfile(userStore, caller, { profile with referralCode = ?code });
          };
        };
      };
    };
    Debug.print("[REFERRAL] getOrCreateMyReferralCode: caller=" # caller.toText() # " code=" # code);
    #ok(code)
  };

  /// Public (authenticated): record a referral by presenting a referral code.
  /// Increments the referrer's referralsCount. If the new count crosses a
  /// referralBonus NFT's threshold and no active in-stock referralBonus NFT
  /// exists, enqueues the referrer as eligible-pending. Deactivation
  /// preserves pending eligibility. Rejects anonymous callers and self-
  /// referrals (a referrer cannot refer themselves). Returns the referrer's
  /// new count and whether they became newly eligible-pending.
  ///
  /// NOTE: This endpoint does NOT trigger the synchronous auto-award. The
  /// synchronous auto-award is triggered by the claimNft path (in
  /// claim-link-api.mo) when a claimant presents a referral code alongside
  /// their claim token — that is the canonical mint path reuse. This
  /// endpoint is the explicit "I was referred" path for claimants who are
  /// not claiming an NFT at the same time.
  public shared ({ caller }) func recordReferral(code : Text) : async Result.Result<Types.RecordReferralResult, Text> {
    // Reject anonymous callers.
    if (caller.isAnonymous()) {
      return #err("Authentication required to record a referral");
    };
    // Resolve the referrer from the code. Codes never expire (NO EXPIRY).
    switch (ReferralLib.resolveReferralCode(referralCodeStore, code)) {
      case (null) {
        // Unknown code — fail closed. Do NOT increment any count.
        return #err("Unknown referral code");
      };
      case (?mapping) {
        // Reject self-referrals — a referrer cannot refer themselves.
        if (Principal.equal(mapping.referrerPrincipal, caller)) {
          return #err("Cannot refer yourself");
        };
      };
    };
    let now : Common.Timestamp = Int.abs(Time.now());
    let result = ReferralLib.recordReferral(
      userStore,
      referralCodeStore,
      eligiblePendingStore,
      nftStore,
      code,
      now,
    );
    Debug.print("[REFERRAL] recordReferral: caller=" # caller.toText() # " code=" # code # " newCount=" # result.newReferralsCount.toText() # " newlyEligiblePending=" # debug_show(result.newlyEligiblePending));
    #ok(result)
  };

  /// Public (authenticated): get the caller's own referral status
  /// (referralCode, referralsCount, awardedTiers). Preserves [OQL-LOCKDOWN] —
  /// never exposes discountCode, membershipId, secretKey, or stripe mode.
  /// Returns null if the caller has no profile.
  public query ({ caller }) func getMyReferralStatus() : async ?Types.MyReferralStatus {
    ReferralLib.getMyReferralStatus(
      referralCodeStore,
      referrerCodeIndex,
      userStore,
      caller,
    )
  };

  /// Admin-only: run one retroactive batch-award cycle. Processes up to
  /// `batchSize` eligible-pending entries in earliest-eligible-first order,
  /// awarding each an in-stock referralBonus NFT by REUSING the existing
  /// claimNft validation path (not a parallel mint). Capped per cycle; if the
  /// cap is hit, the caller should schedule the next cycle after the
  /// configured delay. Rejects anonymous and non-admin callers (returns
  /// #err for non-admins, consistent with admin-gated metrics queries).
  ///
  /// The award reuses claimNftInternal (extracted in claim-link-api.mo) so
  /// the auto-award goes through the SAME validation path as a public claim:
  /// anonymous reject, [H3] rate limit, token validation, supply cap,
  /// assertClaimable, atomic useToken, [H2] counter-ordering, new NFT copy.
  /// On a successful award, the referrer's awardedTiers is appended (dedup by
  /// tier) and the eligible-pending entry is dequeued. On failure (e.g. sold
  /// out mid-cycle), the entry stays in the queue (deactivation preserves
  /// pending eligibility).
  public shared ({ caller }) func runBatchAwardCycle() : async Result.Result<Types.BatchAwardResult, Text> {
    // Admin-only guard. Non-admins get #err (consistent with admin-gated
    // metrics queries). Anonymous callers are not admins by definition.
    if (not Auth.isAdmin(caller, admins.value)) {
      return #err("Unauthorized: Admin only");
    };
    let nowSec : Int = Time.now() / 1_000_000_000;
    let config = batchAwardConfig.value;
    // Throttle accounting + cycle result from the lib. This counts how many
    // candidates COULD be awarded this cycle (without dequeueing).
    let cycleResult = ReferralLib.runBatchAwardCycle(
      eligiblePendingStore,
      nftStore,
      batchAwardThrottleStore,
      config,
      nowSec,
    );
    // Select the actual candidates (earliest-eligible-first) and award each
    // via claimNftInternal reuse. The lib's selectBatchAwardCandidates does
    // NOT dequeue — we dequeue here ONLY on a successful award.
    let candidates = ReferralLib.selectBatchAwardCandidates(
      eligiblePendingStore,
      nftStore,
      userStore,
      batchAwardThrottleStore,
      config,
      nowSec,
    );
    var awardedThisCycle = 0;
    for (candidate in candidates.vals()) {
      // Look up the existing claim token for the master NFT. The auto-award
      // reuses claimNftInternal (the canonical mint path) which expects a
      // token already in the claimTokenStore. The admin must have generated a
      // claim link for the referralBonus NFT (via generateClaimLink) so a
      // token exists. If no token exists, the auto-award cannot proceed via
      // the canonical path — skip and keep the entry (deactivation preserves
      // pending eligibility on failure).
      switch (nftToClaimToken.get(candidate.nftId)) {
        case (null) {
          Debug.print("[BATCH-AWARD] no claim token for master NFT " # candidate.nftId.toText() # " — skipping referrer " # candidate.referrer.toText() # " (admin must generate a claim link for the referralBonus NFT)");
        };
        case (?internalToken) {
          // Award via ClaimLib.claimNftInternal reuse. Pass null for ref — no
          // referral increment on auto-award (the referrer is being
          // awarded, not referring). ClaimLib.claimNftInternal enforces the
          // full validation path: anonymous reject (referrer is not anonymous
          // — they have a profile), [H3] rate limit, token validation,
          // supply cap, assertClaimable, atomic useToken, [H2] counter-
          // ordering, new NFT copy.
          switch (ClaimLib.claimNftInternal(
            candidate.referrer,
            internalToken,
            null,
            nftStore,
            claimTokenStore,
            claimersStore,
            globalAuditLog,
            nextNftId,
            selfCanisterId,
            claimRateLimitStore,
          )) {
            case (#err(msg)) {
              // Sold out mid-cycle, rate-limited, or token invalid — skip
              // and keep the entry (deactivation preserves pending
              // eligibility on failure). The next cycle will retry.
              Debug.print("[BATCH-AWARD] auto-award failed for referrer " # candidate.referrer.toText() # ": " # msg);
            };
            case (#ok(_)) {
              // Success — append the awarded tier (dedup by tier) and
              // dequeue the eligible-pending entry. Deactivation preserves
              // pending eligibility is N/A here — this is an actual award,
              // so dequeue is correct.
              ReferralLib.appendAwardedTier(userStore, candidate.referrer, candidate.tier);
              ReferralLib.dequeueEligiblePending(eligiblePendingStore, candidate.referrer);
              awardedThisCycle += 1;
              Debug.print("[BATCH-AWARD] auto-awarded referrer " # candidate.referrer.toText() # " tier " # candidate.tier.toText());
            };
          };
        };
      };
    };
    Debug.print("[BATCH-AWARD] runBatchAwardCycle: awardedThisCycle=" # awardedThisCycle.toText() # " remainingPending=" # eligiblePendingStore.size().toText());
    #ok({
      awardedThisCycle;
      remainingPending = eligiblePendingStore.size();
      hitCycleCap = cycleResult.hitCycleCap;
    })
  };

  /// Admin-only: get the referral/bonus Health metrics for the Health tab.
  /// Extends the existing getHealthMetrics / getNftClaimBreakdown admin-gated
  /// queries. `eligiblePendingQueueLengthPerTier` is indexed by threshold
  /// tier (stacking-ready). Preserves [OQL-LOCKDOWN] — never exposes
  /// discountCode, membershipId, secretKey, or stripe mode. Returns zeroed
  /// metrics for non-admin callers (consistent with getHealthMetrics).
  public query ({ caller }) func getReferralHealthMetrics() : async Types.ReferralHealthMetrics {
    // Non-admin callers get zeroed metrics (consistent with getHealthMetrics).
    if (not Auth.isAdmin(caller, admins.value)) {
      return {
        bonusNftsAutoAwarded = 0;
        remainingBonusSupply = 0;
        eligiblePendingCount = 0;
        eligiblePendingQueueLengthPerTier = [];
        totalReferralCodes = 0;
        totalReferralsCounted = 0;
      };
    };
    ReferralLib.getReferralHealthMetrics(
      nftStore,
      referralCodeStore,
      eligiblePendingStore,
      userStore,
    )
  };

  /// Admin-only: purge a specific eligible-pending entry (e.g. on admin
  /// review). Deactivation does NOT purge — only admin action or actual award
  /// removes an entry. Returns true if an entry was removed. Rejects non-admin
  /// callers (returns false).
  public shared ({ caller }) func adminPurgeEligiblePending(referrerPrincipal : Principal) : async Bool {
    if (not Auth.isAdmin(caller, admins.value)) {
      return false;
    };
    ReferralLib.adminPurgeEligiblePending(eligiblePendingStore, referrerPrincipal)
  };

  /// Admin-only: update the batch-award throttle config (batch size, delay,
  /// per-cycle cap). The default is DEFAULT_BATCH_AWARD_CONFIG; admins may
  /// tune it. Respects the draft-only constraint — gated by isLiveCanister()
  /// (no live canister writes). Returns the new config. Rejects non-admin
  /// callers (returns the default config unchanged).
  public shared ({ caller }) func adminUpdateBatchAwardConfig(config : Types.BatchAwardConfig) : async Types.BatchAwardConfig {
    if (not Auth.isAdmin(caller, admins.value)) {
      return batchAwardConfig.value;
    };
    // Draft-only constraint: reject on the live canister. The config is
    // admin-tunable on draft only.
    if (selfCanisterId.value == "kd6s6-ziaaa-aaaam-ajfwa-cai") {
      Debug.print("[BATCH-AWARD] adminUpdateBatchAwardConfig rejected on live canister");
      return batchAwardConfig.value;
    };
    let validated = ReferralLib.adminUpdateBatchAwardConfig(config);
    batchAwardConfig.value := validated;
    Debug.print("[BATCH-AWARD] config updated: batchSize=" # validated.batchSize.toText() # " delaySeconds=" # validated.delaySeconds.toText() # " cappedPerCycle=" # validated.cappedPerCycle.toText());
    validated
  };

  /// Admin-only: set the rewardType on an NFT (#none or #referralBonus).
  /// Respects the draft-only constraint — gated by isLiveCanister() (no live
  /// canister writes). Rejects non-admin callers (returns #err). Returns
  /// #err if the NFT does not exist.
  public shared ({ caller }) func adminSetNftRewardType(nftId : Nat, rewardType : Types.RewardType) : async Result.Result<(), Text> {
    if (not Auth.isAdmin(caller, admins.value)) {
      return #err("Unauthorized: Admin only");
    };
    // Draft-only constraint: reject on the live canister.
    if (selfCanisterId.value == "kd6s6-ziaaa-aaaam-ajfwa-cai") {
      return #err("Cannot modify NFT rewardType on the live canister (draft-only)");
    };
    let result = ReferralLib.adminSetNftRewardType(nftStore, nftId, rewardType);
    switch (result) {
      case (#ok(_)) {
        Debug.print("[REFERRAL] adminSetNftRewardType: nftId=" # nftId.toText() # " rewardType set");
      };
      case (#err(msg)) {
        Debug.print("[REFERRAL] adminSetNftRewardType FAILED: nftId=" # nftId.toText() # " msg=" # msg);
      };
    };
    result
  };

  /// Admin-only: set the referralThreshold on a referralBonus NFT. Only
  /// meaningful when the NFT's rewardType = #referralBonus. Respects the
  /// draft-only constraint — gated by isLiveCanister() (no live canister
  /// writes). Rejects non-admin callers (returns #err). Returns #err if the
  /// NFT does not exist or is not a referralBonus NFT.
  public shared ({ caller }) func adminSetNftReferralThreshold(nftId : Nat, threshold : Nat) : async Result.Result<(), Text> {
    if (not Auth.isAdmin(caller, admins.value)) {
      return #err("Unauthorized: Admin only");
    };
    // Draft-only constraint: reject on the live canister.
    if (selfCanisterId.value == "kd6s6-ziaaa-aaaam-ajfwa-cai") {
      return #err("Cannot modify NFT referralThreshold on the live canister (draft-only)");
    };
    let result = ReferralLib.adminSetNftReferralThreshold(nftStore, nftId, threshold);
    switch (result) {
      case (#ok(_)) {
        Debug.print("[REFERRAL] adminSetNftReferralThreshold: nftId=" # nftId.toText() # " threshold=" # threshold.toText());
      };
      case (#err(msg)) {
        Debug.print("[REFERRAL] adminSetNftReferralThreshold FAILED: nftId=" # nftId.toText() # " msg=" # msg);
      };
    };
    result
  };
}
