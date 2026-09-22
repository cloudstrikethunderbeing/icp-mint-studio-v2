import { useAuth } from "@/contexts/AuthContext";
import { addNotification } from "@/hooks/useNotifications";
import { useReferralStatus } from "@/hooks/useReferralStatus";
import { useNavigate } from "@tanstack/react-router";
import { Gift, Sparkles, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { devLog } from "../utils/devLog";

// ── ReferralBanner ───────────────────────────────────────────────────────────
// Surfaces the caller's referral status in the collector shell. Two distinct
// banner states (per AGENTS.md "distinct banner copy" preference):
//
// - "eligible-pending": the caller has referrals but no bonus NFT has been
//   auto-awarded yet. We must NOT tell the user to claim — nothing is
//   claimable. Copy explains a reward is on the way and will be claimable in
//   the Dashboard/Library once the batch-award cycle mints it.
// - "newly-awarded": a bonus NFT was auto-awarded and is waiting to be
//   claimed/viewed. Copy directs the user to claim it in the
//   Dashboard/Library.
//
// "none" renders nothing. The banner is dismissible for the session via the
// acknowledgeAwarded callback (which marks the current highest awarded tier
// as seen in sessionStorage). We also push a one-time notification into the
// existing NotificationBell/useNotifications store with a distinct type per
// state so the bell badge reflects the referral activity.

const NOTIFIED_TIER_KEY = "icpms_referral_notified_tier";
const NOTIFIED_PENDING_KEY = "icpms_referral_notified_pending";

export function ReferralBanner() {
  const { isAuthenticated } = useAuth();
  const {
    state,
    referralCode,
    referralsCount,
    awardedTiers,
    acknowledgeAwarded,
  } = useReferralStatus();
  const navigate = useNavigate();
  // Track whether we have already pushed a notification for the current
  // state, so the bell does not re-fire on every render. Refs persist across
  // renders without triggering re-renders.
  const notifiedTierRef = useRef<string | null>(null);
  const notifiedPendingRef = useRef(false);

  // [RENDER] ReferralBanner render instrumentation — greppable marker for
  // referral UI diagnostics. Mirrors the [RENDER] convention used elsewhere.
  devLog("[RENDER] ReferralBanner render:", {
    state,
    referralCode,
    referralsCount: referralsCount?.toString(),
    awardedTiers: awardedTiers?.map((t) => t.toString()),
    isAuthenticated,
  });

  // Push a distinct notification per state into the NotificationBell store.
  // The notification is fired once per state transition (per awarded tier for
  // newly-awarded, once per session for eligible-pending) so the bell badge
  // reflects referral activity without spamming.
  useEffect(() => {
    if (!isAuthenticated) return;

    if (state === "newly-awarded" && awardedTiers.length > 0) {
      const highest = awardedTiers.reduce((acc, t) => (t > acc ? t : acc), 0n);
      const tierKey = highest.toString();
      // Only fire once per newly-awarded tier.
      try {
        const already = sessionStorage.getItem(NOTIFIED_TIER_KEY);
        if (already !== tierKey) {
          sessionStorage.setItem(NOTIFIED_TIER_KEY, tierKey);
          notifiedTierRef.current = tierKey;
          addNotification(
            {
              type: "info",
              title: "Bonus NFT Awarded",
              message:
                "You have a bonus NFT waiting — claim it in your Dashboard/Library.",
              navigationTarget: "/collector",
            },
            null,
          );
        }
      } catch {
        // sessionStorage unavailable — non-fatal
      }
    } else if (state === "eligible-pending") {
      try {
        const already = sessionStorage.getItem(NOTIFIED_PENDING_KEY);
        if (!already) {
          sessionStorage.setItem(NOTIFIED_PENDING_KEY, "1");
          notifiedPendingRef.current = true;
          addNotification(
            {
              type: "warning",
              title: "Bonus NFT Pending",
              message:
                "You have a bonus NFT waiting — once a reward is available, you will be able to claim it in your Dashboard/Library.",
              navigationTarget: "/collector",
            },
            null,
          );
        }
      } catch {
        // sessionStorage unavailable — non-fatal
      }
    }
  }, [state, awardedTiers, isAuthenticated]);

  if (!isAuthenticated || state === "none") return null;

  const isPending = state === "eligible-pending";
  const isAwarded = state === "newly-awarded";

  // Distinct copy per state (per AGENTS.md preference). The eligible-pending
  // copy NEVER tells the user to claim — nothing is claimable yet. The
  // newly-awarded copy directs them to claim in the Dashboard/Library.
  const heading = isPending
    ? "Bonus NFT Pending"
    : isAwarded
      ? "Bonus NFT Awarded"
      : "";
  const body = isPending
    ? "You have a bonus NFT waiting — once a reward is available, you will be able to claim it in your Dashboard/Library."
    : isAwarded
      ? "You have a bonus NFT waiting — claim it in your Dashboard/Library."
      : "";

  // The CTA only appears for newly-awarded (something is actually claimable).
  // For eligible-pending there is no claimable item yet, so we render an
  // informational pill instead of a button — never direct the user to claim
  // when nothing is claimable.
  function handleClaim() {
    acknowledgeAwarded();
    navigate({ to: "/collector" });
  }

  function handleDismiss() {
    // Dismissing the banner acknowledges the current state so it collapses
    // for the session. For newly-awarded this marks the tier as seen; for
    // eligible-pending the underlying hook collapses once the user navigates
    // away and the sessionStorage flag is set.
    acknowledgeAwarded();
  }

  return (
    <output
      aria-live="polite"
      className={`mx-auto w-full max-w-2xl px-4 pt-3 ${
        isAwarded ? "animate-in fade-in slide-in-from-top-2" : ""
      }`}
      data-ocid="referral.banner"
    >
      <div
        className={`relative flex items-start gap-3 rounded-xl border p-3.5 shadow-sm ${
          isAwarded
            ? "border-primary/40 bg-primary/5"
            : "border-accent/40 bg-accent/5"
        }`}
        data-ocid={
          isAwarded
            ? "referral.newly_awarded_card"
            : "referral.eligible_pending_card"
        }
      >
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isAwarded
              ? "bg-primary/15 text-primary"
              : "bg-accent/15 text-accent-foreground"
          }`}
        >
          {isAwarded ? (
            <Gift className="h-5 w-5" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{heading}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {body}
          </p>

          {isAwarded && (
            <button
              type="button"
              onClick={handleClaim}
              className="mt-2 inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              data-ocid="referral.claim_button"
            >
              Go to Library
            </button>
          )}
          {isPending && (
            <span
              className="mt-2 inline-flex h-8 items-center rounded-md border border-accent/40 bg-accent/10 px-2.5 text-[11px] font-medium text-accent-foreground"
              data-ocid="referral.pending_pill"
            >
              Reward processing
            </span>
          )}
        </div>

        {/* Dismiss button — collapses the banner for the session. */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss referral banner"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-ocid="referral.dismiss_button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </output>
  );
}
