import Debug "mo:core/Debug";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Queue "mo:core/Queue";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Nat8 "mo:core/Nat8";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import VarArray "mo:core/VarArray";
import Common "../types/common";
import NftTypes "../types/nft";
import Types "../types/referral-rewards";
import UserLib "../lib/user";

module {
  /// Referral code store: referralCode (Text) -> ReferralCodeMapping.
  /// Codes are random + unguessable and NEVER expire (NO EXPIRY).
  public type ReferralCodeStore = Map.Map<Text, Types.ReferralCodeMapping>;

  /// Reverse lookup: referrerPrincipal -> referralCode (Text). Lets a caller
  /// fetch their own code without scanning the whole code store.
  public type ReferrerCodeIndex = Map.Map<Principal, Text>;

  /// Eligible-pending queue: referrerPrincipal -> EligiblePendingEntry.
  /// One entry per referrer per threshold tier (dedup by (principal, tier)).
  /// `enqueuedAt` drives earliest-eligible-first ordering for limited-supply
  /// awards. Deactivation preserves pending eligibility — entries are NOT
  /// removed on deactivation, only on actual award or admin purge.
  public type EligiblePendingStore = Map.Map<Principal, Types.EligiblePendingEntry>;

  /// Dedicated transient store for the retroactive batch-award throttle,
  /// following the rate-limiting pattern (own dedicated Map, NOT the shared
  /// rateLimitStore — avoids the nanosecond-window bug). Holds the in-flight
  /// batch cursor and per-cycle awarded count. Transient (rebuilt empty on
  /// every restart) — throttle state is not durable, so no migration required.
  public type BatchAwardThrottleStore = Map.Map<Text, { var awardedThisCycle : Nat; var cycleStartedAtSec : Int }>;

  /// Initialize an empty referral code store.
  public func initReferralCodeStore() : ReferralCodeStore {
    Map.empty()
  };

  /// Initialize an empty referrer->code index.
  public func initReferrerCodeIndex() : ReferrerCodeIndex {
    Map.empty()
  };

  /// Initialize an empty eligible-pending store.
  public func initEligiblePendingStore() : EligiblePendingStore {
    Map.empty()
  };

  /// Initialize an empty batch-award throttle store.
  public func initBatchAwardThrottleStore() : BatchAwardThrottleStore {
    Map.empty()
  };

  /// Generate a 12-character hex referral code from a raw randomness blob.
  /// Pure (no state mutation) — the caller stores the mapping. Mirrors the
  /// ClaimLib.buildToken pattern but uses 6 bytes (12 hex chars) for a shorter,
  /// shareable code. NO EXPIRY — the code never expires.
  public func buildReferralCode(randomBytes : Blob) : Text {
    let hexChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
    var hex = "";
    var i = 0;
    let iter = randomBytes.vals();
    label buildLoop while (i < 6) {
      switch (iter.next()) {
        case (null) { break buildLoop };
        case (?byte) {
          let high = Nat8.toNat(byte / 16);
          let low = Nat8.toNat(byte % 16);
          hex := hex # hexChars[high] # hexChars[low];
          i += 1;
        };
      };
    };
    hex
  };

  /// Generate a random, unguessable referral code for a referrer. NO EXPIRY —
  /// the code never expires. Returns the new code and stores the mapping.
  /// If the referrer already has a code, returns the existing one (idempotent).
  /// The caller MUST supply a fresh randomness blob (awaited via Random.blob()
  /// at the mixin layer); this function is pure aside from the two store writes.
  public func getOrCreateReferralCode(
    codeStore : ReferralCodeStore,
    referrerIndex : ReferrerCodeIndex,
    referrerPrincipal : Principal,
    now : Common.Timestamp,
    randomBytes : Blob,
  ) : Text {
    // Idempotent: if the referrer already has a code, return it.
    switch (referrerIndex.get(referrerPrincipal)) {
      case (?existingCode) {
        // Defensive: confirm the code still exists in codeStore (it should,
        // since both are written together). If somehow missing, fall through
        // to generate a new one.
        switch (codeStore.get(existingCode)) {
          case (?_) { return existingCode };
          case (null) {};
        };
      };
      case (null) {};
    };
    // Generate a fresh unguessable code. Retry on the astronomically unlikely
    // collision with an existing code (defensive — 12 hex chars = 48 bits).
    var code = buildReferralCode(randomBytes);
    var attempts = 0;
    while (codeStore.get(code) != null and attempts < 8) {
      // Append a deterministic suffix derived from now + attempts to break the
      // collision without awaiting more randomness (this branch is effectively
      // unreachable in practice).
      code := buildReferralCode(randomBytes) # Nat8.fromIntWrap(attempts).toNat().toText();
      attempts += 1;
    };
    let mapping : Types.ReferralCodeMapping = {
      code;
      referrerPrincipal;
      createdAt = now;
    };
    codeStore.add(code, mapping);
    referrerIndex.add(referrerPrincipal, code);
    Debug.print("[REFERRAL] generated code for " # referrerPrincipal.toText());
    code
  };

  /// Look up the referrer for a given referral code. Returns null if the code
  /// is unknown. Codes never expire, so there is no expiry check.
  public func resolveReferralCode(
    codeStore : ReferralCodeStore,
    code : Text,
  ) : ?Types.ReferralCodeMapping {
    codeStore.get(code)
  };

  /// Find the first active in-stock referralBonus NFT whose threshold the
  /// referrer has crossed AND has NOT already been awarded for (not in
  /// awardedTiers). Returns the NFT id and its threshold tier (the awardedTiers
  /// index) if one exists, null otherwise. "In-stock" means the NFT is #active
  /// and (for claimable bonus NFTs) has remaining supply. Earliest-eligible-
  /// first is NOT applied here — this is the synchronous award path used when
  /// an in-stock bonus NFT exists at the moment the threshold is crossed.
  public func findInStockBonusNft(
    nftStore : Map.Map<Nat, NftTypes.Nft>,
    referralsCount : Nat,
    awardedTiers : [Nat],
  ) : ?{ nftId : Nat; thresholdTier : Nat } {
    var best : ?{ nftId : Nat; thresholdTier : Nat } = null;
    for ((id, nft) in nftStore.entries()) {
      if (nft.status == #active and nft.rewardType == #referralBonus) {
        // The referrer must have crossed this NFT's threshold.
        if (referralsCount >= nft.referralThreshold) {
          // The threshold tier is the referralThreshold value itself —
          // awardedTiers stores threshold values (stacking-ready), dedup by
          // the threshold value so a referrer cannot be awarded twice for the
          // same threshold.
          let tier = nft.referralThreshold;
          let alreadyAwarded = awardedTiers.find(func(t : Nat) : Bool { t == tier }) != null;
          if (not alreadyAwarded) {
            // Pick the lowest-threshold eligible in-stock bonus NFT (earliest
            // threshold crossed first).
            switch (best) {
              case (null) { best := ?{ nftId = id; thresholdTier = tier } };
              case (?b) {
                if (tier < b.thresholdTier) {
                  best := ?{ nftId = id; thresholdTier = tier };
                };
              };
            };
          };
        };
      };
    };
    best
  };

  /// Record a referral: increment the referrer's referralsCount on their
  /// UserProfile. If the new count crosses a referralBonus NFT's threshold
  /// AND no active in-stock referralBonus NFT exists, enqueue the referrer as
  /// eligible-pending (with thresholdTier and enqueuedAt for earliest-
  /// eligible-first ordering). Deactivation preserves pending eligibility —
  /// this function does NOT dequeue. Returns the new count and whether the
  /// referrer became newly eligible-pending this call.
  ///
  /// NOTE: This function does NOT perform the synchronous auto-award even when
  /// an in-stock bonus NFT exists — that decision and the claimNftInternal
  /// reuse live at the mixin layer (which has access to the claim stores). This
  /// lib function only (a) increments the count and (b) enqueues eligible-
  /// pending when no in-stock bonus NFT is available. The mixin reads the
  /// return value to decide whether to trigger the synchronous auto-award.
  public func recordReferral(
    userStore : UserLib.UserStore,
    codeStore : ReferralCodeStore,
    eligiblePendingStore : EligiblePendingStore,
    nftStore : Map.Map<Nat, NftTypes.Nft>,
    code : Text,
    now : Common.Timestamp,
  ) : Types.RecordReferralResult {
    // Resolve the referrer from the code. Codes never expire.
    let mapping = switch (codeStore.get(code)) {
      case (null) {
        // Unknown code — return a zero result with the caller's principal as a
        // sentinel. The mixin layer rejects unknown codes BEFORE calling this,
        // so this branch is defensive only.
        return {
          referrerPrincipal = Principal.fromText("aaaaa-aa");
          newReferralsCount = 0;
          newlyEligiblePending = false;
          thresholdTier = null;
        };
      };
      case (?m) { m };
    };
    let referrer = mapping.referrerPrincipal;
    // Increment the referrer's referralsCount on their UserProfile.
    let newCount = switch (userStore.get(referrer)) {
      case (null) { 0 };
      case (?profile) {
        let incremented = profile.referralsCount + 1;
        userStore.add(referrer, { profile with referralsCount = incremented });
        incremented
      };
    };
    // Check for an in-stock bonus NFT whose threshold was just crossed.
    let awardedTiers = switch (userStore.get(referrer)) {
      case (null) { [] };
      case (?p) { p.awardedTiers };
    };
    let inStock = findInStockBonusNft(nftStore, newCount, awardedTiers);
    switch (inStock) {
      case (?inStock) {
        // An in-stock bonus NFT exists — the mixin will trigger the
        // synchronous auto-award via claimNftInternal. Do NOT enqueue here.
        Debug.print("[REFERRAL] referrer " # referrer.toText() # " crossed threshold with in-stock bonus NFT — auto-award pending at mixin");
        {
          referrerPrincipal = referrer;
          newReferralsCount = newCount;
          newlyEligiblePending = false;
          thresholdTier = ?(inStock.thresholdTier);
        };
      };
      case (null) {
        // No in-stock bonus NFT. Check whether the referrer crossed ANY
        // referralBonus threshold that they have NOT already been awarded for
        // and are NOT already pending for. If so, enqueue as eligible-pending.
        // Deactivation preserves pending eligibility — we never dequeue here.
        let pendingTier = findCrossedThresholdWithoutStock(nftStore, newCount, awardedTiers);
        switch (pendingTier) {
          case (null) {
            {
              referrerPrincipal = referrer;
              newReferralsCount = newCount;
              newlyEligiblePending = false;
              thresholdTier = null;
            };
          };
          case (?tier) {
            // Enqueue (idempotent per (principal, tier) — if an entry already
            // exists for this referrer, overwrite it only if the new tier is
            // higher; otherwise keep the earliest enqueuedAt for earliest-
            // eligible-first ordering). Deactivation preserves pending
            // eligibility — we do NOT check profile active status here.
            let entry : Types.EligiblePendingEntry = {
              referrerPrincipal = referrer;
              thresholdTier = tier;
              enqueuedAt = now;
            };
            switch (eligiblePendingStore.get(referrer)) {
              case (?existing) {
                // Keep the earliest enqueuedAt for FIFO ordering; only update
                // the tier if the new tier is higher (a referrer who later
                // crosses a higher threshold moves up to that tier but keeps
                // their original queue position).
                let keepEarliest = if (existing.enqueuedAt < now) { existing.enqueuedAt } else { now };
                let newTier = if (tier > existing.thresholdTier) { tier } else { existing.thresholdTier };
                eligiblePendingStore.add(referrer, { entry with thresholdTier = newTier; enqueuedAt = keepEarliest });
              };
              case (null) {
                eligiblePendingStore.add(referrer, entry);
              };
            };
            Debug.print("[REFERRAL] referrer " # referrer.toText() # " enqueued as eligible-pending for tier " # tier.toText());
            {
              referrerPrincipal = referrer;
              newReferralsCount = newCount;
              newlyEligiblePending = true;
              thresholdTier = ?tier;
            };
          };
        };
      };
    };
  };

  /// Find the lowest referralBonus threshold the referrer has crossed but has
  /// NOT already been awarded for (not in awardedTiers), regardless of in-stock
  /// status. Used to enqueue eligible-pending when no in-stock bonus NFT
  /// exists. Returns null if no unawarded threshold has been crossed.
  func findCrossedThresholdWithoutStock(
    nftStore : Map.Map<Nat, NftTypes.Nft>,
    referralsCount : Nat,
    awardedTiers : [Nat],
  ) : ?Nat {
    var best : ?Nat = null;
    for ((_, nft) in nftStore.entries()) {
      if (nft.rewardType == #referralBonus and referralsCount >= nft.referralThreshold) {
        let tier = nft.referralThreshold;
        let alreadyAwarded = awardedTiers.find(func(t : Nat) : Bool { t == tier }) != null;
        if (not alreadyAwarded) {
          switch (best) {
            case (null) { best := ?tier };
            case (?b) { if (tier < b) { best := ?tier } };
          };
        };
      };
    };
    best
  };

  /// Run one retroactive batch-award cycle. Processes up to
  /// `config.batchSize` eligible-pending entries in earliest-eligible-first
  /// order, awarding each an in-stock referralBonus NFT by REUSING the
  /// existing claimNft validation path (not a parallel mint). Capped at
  /// `config.cappedPerCycle` per cycle; if the cap is hit, the caller should
  /// schedule the next cycle after `config.delaySeconds`. Deactivation
  /// preserves pending eligibility — skipped entries stay in the queue.
  ///
  /// This lib function performs ONLY throttle accounting and returns the cycle
  /// result. The actual candidate selection and award live in
  /// `selectBatchAwardCandidates` (called by the mixin) and the mixin's award
  /// loop (which reuses claimNftInternal). The mixin dequeues entries and
  /// appends awardedTiers ONLY on a successful award.
  public func runBatchAwardCycle(
    eligiblePendingStore : EligiblePendingStore,
    nftStore : Map.Map<Nat, NftTypes.Nft>,
    throttleStore : BatchAwardThrottleStore,
    config : Types.BatchAwardConfig,
    nowSec : Int,
  ) : Types.BatchAwardResult {
    // Throttle: enforce the per-cycle cap using the dedicated transient
    // throttle store (NOT the shared rateLimitStore — avoids the nanosecond-
    // window bug). The cycle key is a fixed sentinel; the cycle window is
    // reset when the elapsed time since cycleStartedAtSec exceeds
    // delaySeconds.
    let cycleKey = "batchAward";
    let cycleWindowSec : Int = config.delaySeconds;
    switch (throttleStore.get(cycleKey)) {
      case (null) {
        throttleStore.add(cycleKey, { var awardedThisCycle = 0; var cycleStartedAtSec = nowSec });
      };
      case (?entry) {
        let elapsed : Int = nowSec - entry.cycleStartedAtSec;
        if (elapsed >= cycleWindowSec) {
          // Reset the cycle window.
          entry.awardedThisCycle := 0;
          entry.cycleStartedAtSec := nowSec;
        };
      };
    };
    let throttleEntry = switch (throttleStore.get(cycleKey)) {
      case (null) { return { awardedThisCycle = 0; remainingPending = eligiblePendingStore.size(); hitCycleCap = false } };
      case (?e) { e };
    };
    // Count how many candidates COULD be awarded this cycle (without
    // dequeueing). The mixin performs the actual awards and dequeues on
    // success. This count is the throttle accounting.
    var candidateCount = 0;
    var hitCap = false;
    for ((referrer, entry) in eligiblePendingStore.entries()) {
      if (throttleEntry.awardedThisCycle >= config.cappedPerCycle) {
        hitCap := true;
        break;
      };
      if (candidateCount >= config.batchSize) {
        break;
      };
      // Check for an in-stock bonus NFT for this tier. We do NOT have the
      // referrer's awardedTiers here (no userStore in this signature), so we
      // rely on the eligible-pending entry's thresholdTier being unawarded
      // (the mixin enforces this when enqueueing and when awarding). The
      // mixin's award loop re-checks awardedTiers before awarding.
      switch (findInStockBonusNftForTier(nftStore, entry.thresholdTier, [])) {
        case (null) {
          // No in-stock bonus NFT for this tier — skip but keep the entry.
        };
        case (?_) {
          candidateCount += 1;
          throttleEntry.awardedThisCycle += 1;
        };
      };
    };
    Debug.print("[BATCH-AWARD] cycle: candidateCount=" # candidateCount.toText() # " remainingPending=" # eligiblePendingStore.size().toText() # " hitCap=" # debug_show(hitCap));
    {
      awardedThisCycle = candidateCount;
      remainingPending = eligiblePendingStore.size();
      hitCycleCap = hitCap;
    }
  };

  /// Select up to `config.batchSize` eligible-pending entries (in earliest-
  /// eligible-first order by enqueuedAt) that have an in-stock referralBonus
  /// NFT for their pending tier AND have NOT already been awarded for that
  /// tier. Returns the candidate list (referrer, nftId, tier, enqueuedAt) for
  /// the mixin to award via claimNftInternal. Does NOT dequeue — the mixin
  /// dequeues on successful award only (deactivation preserves pending
  /// eligibility on failure). Capped at `config.cappedPerCycle` per cycle via
  /// the throttle store.
  public func selectBatchAwardCandidates(
    eligiblePendingStore : EligiblePendingStore,
    nftStore : Map.Map<Nat, NftTypes.Nft>,
    userStore : UserLib.UserStore,
    throttleStore : BatchAwardThrottleStore,
    config : Types.BatchAwardConfig,
    nowSec : Int,
  ) : [{ referrer : Principal; nftId : Nat; tier : Nat; enqueuedAt : Common.Timestamp }] {
    // Throttle: enforce the per-cycle cap. Reset the window if elapsed >=
    // delaySeconds.
    let cycleKey = "batchAward";
    switch (throttleStore.get(cycleKey)) {
      case (null) {
        throttleStore.add(cycleKey, { var awardedThisCycle = 0; var cycleStartedAtSec = nowSec });
      };
      case (?entry) {
        let elapsed : Int = nowSec - entry.cycleStartedAtSec;
        if (elapsed >= config.delaySeconds) {
          entry.awardedThisCycle := 0;
          entry.cycleStartedAtSec := nowSec;
        };
      };
    };
    let throttleEntry = switch (throttleStore.get(cycleKey)) {
      case (null) { return [] };
      case (?e) { e };
    };
    // Collect candidates with their enqueuedAt for earliest-eligible-first
    // ordering. Deactivation preserves pending eligibility — we do NOT filter
    // by profile active status here; the mixin may skip a deactivated
    // referrer's award but the entry stays in the queue.
    let collected = List.empty<{ referrer : Principal; nftId : Nat; tier : Nat; enqueuedAt : Common.Timestamp }>();
    for ((referrer, entry) in eligiblePendingStore.entries()) {
      if (throttleEntry.awardedThisCycle >= config.cappedPerCycle) { break };
      if (collected.size() >= config.batchSize) { break };
      let awardedTiers = switch (userStore.get(referrer)) {
        case (null) { [] };
        case (?p) { p.awardedTiers };
      };
      switch (findInStockBonusNftForTier(nftStore, entry.thresholdTier, awardedTiers)) {
        case (null) {};
        case (?nftId) {
          collected.add({ referrer; nftId; tier = entry.thresholdTier; enqueuedAt = entry.enqueuedAt });
          throttleEntry.awardedThisCycle += 1;
        };
      };
    };
    // Sort by earliest-eligible-first (enqueuedAt ascending). Stable sort
    // preserves insertion order for ties. Timestamp = Nat, so use Nat.compare.
    let arr = collected.toArray();
    arr.sort(func(a, b) { Nat.compare(a.enqueuedAt, b.enqueuedAt) })
  };

  /// Helper: find an in-stock active referralBonus NFT for a specific threshold
  /// tier that the referrer has NOT already been awarded for.
  func findInStockBonusNftForTier(
    nftStore : Map.Map<Nat, NftTypes.Nft>,
    tier : Nat,
    awardedTiers : [Nat],
  ) : ?Nat {
    var found : ?Nat = null;
    for ((id, nft) in nftStore.entries()) {
      if (nft.status == #active and nft.rewardType == #referralBonus and nft.referralThreshold == tier) {
        let alreadyAwarded = awardedTiers.find(func(t : Nat) : Bool { t == tier }) != null;
        if (not alreadyAwarded) {
          found := ?id;
        };
      };
    };
    found
  };

  /// Compute the referral/bonus Health metrics for the admin Health tab.
  /// Extends MetricsLib. All fields are admin-gated at the mixin layer.
  /// `eligiblePendingQueueLengthPerTier` is indexed by threshold tier
  /// (stacking-ready). Preserves [OQL-LOCKDOWN] — never reads discountCode,
  /// membershipId, secretKey, or stripe mode.
  public func getReferralHealthMetrics(
    nftStore : Map.Map<Nat, NftTypes.Nft>,
    codeStore : ReferralCodeStore,
    eligiblePendingStore : EligiblePendingStore,
    userStore : UserLib.UserStore,
  ) : Types.ReferralHealthMetrics {
    // bonusNftsAutoAwarded: count NFTs whose rewardType = #referralBonus that
    // have been claimed (claimedAt != null). This is a proxy for auto-awarded
    // bonus NFTs (the canonical mint path sets claimedAt on award).
    var bonusAwarded = 0;
    var remainingBonusSupply = 0;
    // Track distinct threshold tiers for the per-tier queue length array.
    var maxTier = 0;
    for ((_, nft) in nftStore.entries()) {
      if (nft.rewardType == #referralBonus) {
        if (nft.referralThreshold > maxTier) { maxTier := nft.referralThreshold };
        switch (nft.claimedAt) {
          case (?_) { bonusAwarded += 1 };
          case (null) { remainingBonusSupply += 1 };
        };
      };
    };
    // eligiblePendingCount: total entries in the eligible-pending store.
    let eligiblePendingCount = eligiblePendingStore.size();
    // eligiblePendingQueueLengthPerTier: indexed by threshold tier. Size the
    // array to maxTier + 1 (stacking-ready); index 0 is unused (no tier 0).
    let tierCounts = Array.tabulate(maxTier + 1, func(_) = 0).toVarArray<Nat>();
    for ((_, entry) in eligiblePendingStore.entries()) {
      if (entry.thresholdTier <= maxTier) {
        tierCounts[entry.thresholdTier] += 1;
      };
    };
    // totalReferralCodes: number of codes in the code store.
    let totalReferralCodes = codeStore.size();
    // totalReferralsCounted: sum of referralsCount across all profiles.
    var totalReferralsCounted = 0;
    for ((_, profile) in userStore.entries()) {
      totalReferralsCounted += profile.referralsCount;
    };
    {
      bonusNftsAutoAwarded = bonusAwarded;
      remainingBonusSupply;
      eligiblePendingCount;
      eligiblePendingQueueLengthPerTier = tierCounts.toArray();
      totalReferralCodes;
      totalReferralsCounted;
    }
  };

  /// Get the authenticated caller's own referral status (referralCode,
  /// referralsCount, awardedTiers). Preserves [OQL-LOCKDOWN] — never exposes
  /// discountCode, membershipId, secretKey, or stripe mode. Returns null if
  /// the caller has no profile.
  public func getMyReferralStatus(
    codeStore : ReferralCodeStore,
    referrerIndex : ReferrerCodeIndex,
    userStore : UserLib.UserStore,
    caller : Principal,
  ) : ?Types.MyReferralStatus {
    ignore codeStore;
    switch (userStore.get(caller)) {
      case (null) { null };
      case (?profile) {
        // The caller's referralCode is stored on the profile (referralCode
        // field) AND in the referrerIndex. Prefer the profile field (canonical
        // post-migration); fall back to the index for any pre-migration
        // profile that has not yet been backfilled.
        let code = switch (profile.referralCode) {
          case (?c) { ?c };
          case (null) { referrerIndex.get(caller) };
        };
        ?{
          referralCode = code;
          referralsCount = profile.referralsCount;
          awardedTiers = profile.awardedTiers;
        }
      };
    }
  };

  /// Admin-only: purge a specific eligible-pending entry (e.g. on admin
  /// review). Deactivation does NOT purge — only admin action or actual award
  /// removes an entry. Returns true if an entry was removed.
  public func adminPurgeEligiblePending(
    eligiblePendingStore : EligiblePendingStore,
    referrerPrincipal : Principal,
  ) : Bool {
    switch (eligiblePendingStore.get(referrerPrincipal)) {
      case (null) { false };
      case (?_) {
        eligiblePendingStore.remove(referrerPrincipal);
        true
      };
    }
  };

  /// Admin-only: update the batch-award throttle config (batch size, delay,
  /// per-cycle cap). The default is DEFAULT_BATCH_AWARD_CONFIG; admins may
  /// tune it. Returns the new config. This is a pure validator — the actual
  /// config is stored as a stable field in main.mo and updated by the mixin.
  public func adminUpdateBatchAwardConfig(
    config : Types.BatchAwardConfig,
  ) : Types.BatchAwardConfig {
    // Validate: batch size, delay, and cap must all be > 0. Clamp to sensible
    // minimums; reject zero/negative by falling back to defaults for that
    // field. This keeps the admin endpoint forgiving while preventing a
    // misconfiguration that would stall the batch-award loop (e.g. batchSize=0).
    {
      batchSize = if (config.batchSize == 0) { Types.DEFAULT_BATCH_AWARD_CONFIG.batchSize } else { config.batchSize };
      delaySeconds = if (config.delaySeconds == 0) { Types.DEFAULT_BATCH_AWARD_CONFIG.delaySeconds } else { config.delaySeconds };
      cappedPerCycle = if (config.cappedPerCycle == 0) { Types.DEFAULT_BATCH_AWARD_CONFIG.cappedPerCycle } else { config.cappedPerCycle };
    }
  };

  /// Admin-only: set the referralThreshold on a referralBonus NFT. Only
  /// meaningful when the NFT's rewardType = #referralBonus. Respects the
  /// draft-only constraint — gated at the mixin layer by isLiveCanister()
  /// (no live canister writes).
  public func adminSetNftReferralThreshold(
    nftStore : Map.Map<Nat, NftTypes.Nft>,
    nftId : Nat,
    threshold : Nat,
  ) : Result.Result<(), Text> {
    switch (nftStore.get(nftId)) {
      case (null) { #err("NFT not found") };
      case (?nft) {
        if (nft.rewardType != #referralBonus) {
          return #err("NFT is not a referralBonus NFT — set rewardType to #referralBonus first");
        };
        if (threshold == 0) {
          return #err("referralThreshold must be greater than 0");
        };
        nftStore.add(nftId, { nft with referralThreshold = threshold });
        #ok(())
      };
    }
  };

  /// Admin-only: set the rewardType on an NFT (#none or #referralBonus).
  /// Respects the draft-only constraint — gated at the mixin layer by
  /// isLiveCanister() (no live canister writes).
  public func adminSetNftRewardType(
    nftStore : Map.Map<Nat, NftTypes.Nft>,
    nftId : Nat,
    rewardType : Types.RewardType,
  ) : Result.Result<(), Text> {
    switch (nftStore.get(nftId)) {
      case (null) { #err("NFT not found") };
      case (?nft) {
        nftStore.add(nftId, { nft with rewardType });
        #ok(())
      };
    }
  };

  /// Append a threshold tier to a referrer's awardedTiers (dedup by tier).
  /// Used by the mixin after a successful synchronous auto-award or batch-award
  /// to record that the referrer has been awarded for this tier. Idempotent —
  /// if the tier is already in awardedTiers, this is a no-op.
  public func appendAwardedTier(
    userStore : UserLib.UserStore,
    referrer : Principal,
    tier : Nat,
  ) : () {
    switch (userStore.get(referrer)) {
      case (null) {};
      case (?profile) {
        let already = profile.awardedTiers.find(func(t : Nat) : Bool { t == tier }) != null;
        if (not already) {
          userStore.add(referrer, { profile with awardedTiers = profile.awardedTiers.concat([tier]) });
        };
      };
    }
  };

  /// Dequeue (remove) an eligible-pending entry for a referrer. Called by the
  /// mixin after a successful synchronous auto-award or batch-award so the
  /// referrer is not awarded again for the same tier. Deactivation preserves
  /// pending eligibility — this is ONLY called on actual award, never on
  /// deactivation.
  public func dequeueEligiblePending(
    eligiblePendingStore : EligiblePendingStore,
    referrer : Principal,
  ) : () {
    eligiblePendingStore.remove(referrer);
  };
}
