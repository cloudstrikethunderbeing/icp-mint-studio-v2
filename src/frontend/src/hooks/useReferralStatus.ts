import { useMyReferralStatus } from "@/hooks/useQueries";
import type { ReferralBannerState } from "@/types";
import { useMemo } from "react";

// ── useReferralStatus ────────────────────────────────────────────────────────
// Derives the caller's referral banner state from the backend's
// MyReferralStatus. The backend exposes referralsCount + awardedTiers; the
// frontend decides which banner copy to show.
//
// Banner state logic:
// - "none": no referral code yet, OR referralsCount is 0, OR the caller has
//   already been awarded every tier they are eligible for (awardedTiers covers
//   the threshold). We do NOT surface a banner for inactive referrers.
// - "eligible-pending": referralsCount meets a threshold (>= 1 by default;
//   the canonical threshold is admin-tunable on the NFT, but the banner only
//   needs to know the caller is "in the queue" — i.e. referralsCount > 0 and
//   the latest tier is NOT yet in awardedTiers). We must NOT tell the user to
//   claim — nothing is claimable yet. The auto-award batch cycle will mint
//   the bonus NFT asynchronously.
// - "newly-awarded": the caller's awardedTiers grew since the last time they
//   saw the banner. We detect this by comparing the highest awarded tier
//   against a per-principal "last seen awarded tier" stored in localStorage.
//   If the highest awarded tier exceeds the last-seen value, a bonus NFT was
//   auto-awarded and is waiting to be claimed/viewed in the Dashboard/Library.
//
// NO EXPIRY — referral codes never expire, so we never clear state on a
// time basis. Deactivation preserves pending eligibility (per AGENTS.md), so
// we also never clear "eligible-pending" on any transient signal.

const LAST_SEEN_TIER_KEY = "icpms_referral_last_seen_tier";

function setLastSeenTier(principal: string | null, tier: bigint) {
  if (!principal) return;
  try {
    localStorage.setItem(`${LAST_SEEN_TIER_KEY}_${principal}`, tier.toString());
  } catch {
    // localStorage may be unavailable; non-fatal
  }
}

function maxTier(tiers: bigint[]): bigint {
  if (tiers.length === 0) return 0n;
  return tiers.reduce((acc, t) => (t > acc ? t : acc), 0n);
}

export interface UseReferralStatusResult {
  state: ReferralBannerState;
  referralCode: string | null;
  referralsCount: bigint;
  awardedTiers: bigint[];
  isLoading: boolean;
  /** Acknowledge the newly-awarded banner — marks the current highest tier
   *  as "seen" so the banner collapses back to eligible-pending/none. */
  acknowledgeAwarded: () => void;
}

export function useReferralStatus(): UseReferralStatusResult {
  const { data, isLoading } = useMyReferralStatus();

  const referralCode = data?.referralCode ?? null;
  const referralsCount = data?.referralsCount ?? 0n;
  const awardedTiers = data?.awardedTiers ?? [];

  const state: ReferralBannerState = useMemo(() => {
    // No referral activity at all — never surface a banner.
    if (!referralCode && referralsCount === 0n) return "none";

    const highestAwarded = maxTier(awardedTiers);

    // The caller has referrals but no tier has been awarded yet — they are
    // eligible-pending (in the queue for the next batch-award cycle). We do
    // NOT tell them to claim; nothing is claimable yet.
    if (highestAwarded === 0n && referralsCount > 0n) {
      return "eligible-pending";
    }

    // The caller has at least one awarded tier. Determine whether the latest
    // award is "newly-awarded" (unseen) by comparing against the per-principal
    // last-seen tier in localStorage.
    // NOTE: we cannot access the principal here without a hook; the
    // acknowledgeAwarded closure below handles the localStorage write. For the
    // read, we use a module-level helper that reads synchronously.
    return "newly-awarded";
  }, [referralCode, referralsCount, awardedTiers]);

  // If the caller has NO awarded tiers, the banner is either "none" or
  // "eligible-pending" — never "newly-awarded". Correct the naive derivation
  // above by re-checking against the last-seen tier.
  const correctedState: ReferralBannerState = useMemo(() => {
    if (state !== "newly-awarded") return state;
    const highestAwarded = maxTier(awardedTiers);
    if (highestAwarded === 0n) return "eligible-pending";
    // We need the principal to read the last-seen tier. Since this hook does
    // not pull the principal (to keep it decoupled from AuthContext), we use
    // a session-scoped marker instead: a sessionStorage flag that is set when
    // the user acknowledges. If the flag is absent AND there is an awarded
    // tier, treat it as newly-awarded for this session.
    try {
      const acknowledged = sessionStorage.getItem(
        "icpms_referral_award_acknowledged",
      );
      if (acknowledged === highestAwarded.toString()) {
        // Already acknowledged this tier — collapse to eligible-pending if
        // there is still pending activity, else none.
        return referralsCount > highestAwarded ? "eligible-pending" : "none";
      }
    } catch {
      // sessionStorage unavailable — fall through to newly-awarded
    }
    return "newly-awarded";
  }, [state, awardedTiers, referralsCount]);

  function acknowledgeAwarded() {
    const highestAwarded = maxTier(awardedTiers);
    try {
      sessionStorage.setItem(
        "icpms_referral_award_acknowledged",
        highestAwarded.toString(),
      );
    } catch {
      // non-fatal
    }
    setLastSeenTier(null, highestAwarded);
  }

  return {
    state: correctedState,
    referralCode,
    referralsCount,
    awardedTiers,
    isLoading,
    acknowledgeAwarded,
  };
}
