import { useAuth } from "@/contexts/AuthContext";

export type EffectiveRole =
  | "admin"
  | "paidCreator"
  | "freeCreator"
  | "collector";

export interface Permissions {
  /** Resolved role — admin is NOT a tier, hard override first */
  effectiveRole: EffectiveRole;
  /** True when the user is authenticated (has a principal) */
  isAuthenticated: boolean;
  /** Can create and manage collection folders */
  canCreateCollections: boolean;
  /** Can mint new NFTs */
  canMint: boolean;
  /** Any NFT owner can burn their own NFT */
  canBurnOwnedNFT: boolean;
  /** Access to admin panel and admin-only views */
  canAccessAdmin: boolean;
  /** Can manage user accounts and tiers */
  canManageUsers: boolean;
  /** Can burn any NFT regardless of ownership */
  canBurnAnyNFT: boolean;
  /** True when this principal is the admin */
  isAdmin: boolean;
  /** True while the admin status query is in-flight */
  isAdminLoading: boolean;
}

/**
 * Central capability model for ICP Mint Studio.
 *
 * Priority order:
 *   1. isAdmin      → admin (hard override, never depend on backend tier)
 *   2. isPaidTier   → paidCreator
 *   3. isCollector  → collector
 *   4. otherwise    → freeCreator
 *
 * NEVER evaluate subscription tier before admin status.
 */
export function usePermissions(): Permissions {
  const { isAdmin, isAdminLoading, isPaidTier, isCollector, principal } =
    useAuth();

  // ── Effective role ────────────────────────────────────────────────────────
  // Admin is NOT a tier. Hard override first, never depend on backend tier.
  let effectiveRole: EffectiveRole;
  if (isAdmin) {
    effectiveRole = "admin";
  } else if (isPaidTier) {
    effectiveRole = "paidCreator";
  } else if (isCollector) {
    effectiveRole = "collector";
  } else {
    effectiveRole = "freeCreator";
  }

  // ── Capabilities ─────────────────────────────────────────────────────────
  const isAuthenticated = principal !== null;
  const canCreateCollections = isAdmin || isPaidTier;
  const canMint = isAdmin || isPaidTier;
  const canBurnOwnedNFT = true; // every owner may burn their own
  const canAccessAdmin = isAdmin;
  const canManageUsers = isAdmin;
  const canBurnAnyNFT = isAdmin;

  return {
    effectiveRole,
    isAuthenticated,
    canCreateCollections,
    canMint,
    canBurnOwnedNFT,
    canAccessAdmin,
    canManageUsers,
    canBurnAnyNFT,
    isAdmin,
    isAdminLoading,
  };
}

export default usePermissions;
