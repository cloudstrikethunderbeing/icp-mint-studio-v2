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

export interface UpdateMetadataRequest {
  businessName?: string;
  website?: string;
  discountCode?: string;
  membershipId?: string;
  rewardTier?: RewardTier;
  tags?: string[];
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
