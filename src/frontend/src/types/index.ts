import { PaymentProof } from "@/backend";
import type { Principal } from "@icp-sdk/core/principal";

export type NotificationType = "critical" | "warning" | "info";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  navigationTarget?: string;
  imageUrl?: string;
}

export type RewardTier = "none" | "bronze" | "silver" | "gold" | "platinum";

export interface TransferResult {
  success: boolean;
  error?: string;
  newOwnerPrincipal?: string;
}

// ── USD price (whole-value dollars) ─────────────────────────────────────────
// Every NFT carries an optional whole-value USD price. The backend stores it as
// a `bigint` (Motoko Nat) on Nft/NftSummary; the frontend presents it as a plain
// `number | null` so UI code never juggles bigints. `null`/`undefined` means the
// NFT is not listed for sale.
export type PriceUsd = number | null;

// Frontend view of an NFT with the price normalized to a whole-dollar number.
// The backend `Nft`/`NftSummary` re-exports keep their `priceUsd?: bigint`
// shape; these intersections are what UI components consume after normalization.
export type NftWithPrice = import("@/backend").Nft & { priceUsd?: PriceUsd };
export type NftSummaryWithPrice = import("@/backend").NftSummary & {
  priceUsd?: PriceUsd;
};

// Normalize a backend price (bigint | number | null | undefined) to a
// whole-value USD number, or null when the NFT is not listed. Non-finite and
// non-positive values are treated as unlisted so a malformed record can never
// render a bogus price.
export function normalizePriceUsd(
  value: bigint | number | null | undefined,
): PriceUsd {
  if (value === null || value === undefined) return null;
  const n = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

// Format a whole-value USD price for display, e.g. 25 -> "$25".
export function formatPriceUsd(
  value: bigint | number | null | undefined,
): string {
  const n = normalizePriceUsd(value);
  return n === null ? "Not for sale" : `$${n.toLocaleString("en-US")}`;
}

export interface UpdateMetadataRequest {
  businessName?: string;
  website?: string;
  discountCode?: string;
  membershipId?: string;
  rewardTier?: RewardTier;
  tags?: string[];
  // Whole-value USD price. `null` clears the listing; `undefined` leaves the
  // existing price unchanged.
  priceUsd?: PriceUsd;
}

// Re-export backend types for convenience
export type {
  Nft,
  NftStatus,
  Collection,
  CollectionWithCount,
  UserProfile,
  SubscriptionTier,
  AuditEntry,
  VerifyResult,
  PaymentProof,
  MyReferralStatus,
  ReferralHealthMetrics,
  BatchAwardConfig,
  RewardType,
} from "@/backend";

// ── Referral status ──────────────────────────────────────────────────────────
// Banner state derived from the caller's MyReferralStatus. The backend exposes
// referralsCount + awardedTiers; the frontend decides which banner copy to show
// based on whether a bonus NFT is claimable yet (eligible-pending) or has been
// auto-awarded and is waiting to be viewed (newly-awarded).
//
// - "none": caller has no referral activity worth surfacing.
// - "eligible-pending": referralsCount meets the threshold but no bonus NFT
//   has been auto-awarded yet. We must NOT tell the user to claim — nothing is
//   claimable. Copy explains a reward is on the way.
// - "newly-awarded": a bonus NFT was auto-awarded and is waiting to be
//   claimed/viewed in the Dashboard/Library. Copy directs the user to claim.
export type ReferralBannerState = "none" | "eligible-pending" | "newly-awarded";

// Tier display name mapping
export const TIER_PRODUCT_MAP: Record<string, string> = {
  prod_UgpwDUBgXdz0K5: "Free",
  prod_UgpxVvHHogE6Qx: "Creator",
  prod_UgpyBkj4HK4A9V: "Pro",
  prod_Ugpy3x4LuFPxzf: "Org",
};

export function getTierDisplayName(productId: string | undefined): string {
  if (!productId) return "Free";
  return TIER_PRODUCT_MAP[productId] || "Unknown";
}
