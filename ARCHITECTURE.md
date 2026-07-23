# ICP Mint Studio v2 — System Architecture

> **READ THIS FILE AT THE START OF EVERY SESSION BEFORE MAKING ANY CHANGES.**
> This document is the single source of truth for the entire system.

## 1. PROJECT OVERVIEW

ICP Mint Studio v2 is a production-grade, mobile-first NFT minting, management, and verification platform on ICP.

Three shells:
- Studio (/): Minting, collection management, analytics, admin tools
- Collector (/collector): Read-only library for NFT holders
- Claim (/claim/:token): Shareable secure NFT claim links

Draft vs Live:
- Draft canister: dqlb2-nyaaa-aaaae-aamxa-cai (ephemeral)
- Live canister: kd6s6-ziaaa-aaaam-ajfwa-cai (permanent)
- Draft URL: https://pretty-amber-68k-draft.caffeine.xyz/
- Live URL: https://icp-mint-studio-n3x.caffeine.xyz/
- Draft calls draft, live calls live — never crossed

## 2. CANISTER STRUCTURE

- Frontend canister: cjsuq-3qaaa-aaaae-adina-cai (draft) / ke7uk-uqaaa-aaaam-ajfwq-cai (live)
- Backend draft: dqlb2-nyaaa-aaaae-aamxa-cai
- Backend live: kd6s6-ziaaa-aaaam-ajfwa-cai
- Canister IDs injected at build time via Vite plugin (vite.config.js)

### Canister ID resolution architecture (final state after v215)

- **Live builds:** vite.config.js uses hardcoded `LIVE_BACKEND_ID` / `LIVE_FRONTEND_ID` (kd6s6-ziaaa-aaaam-ajfwa-cai / ke7uk-uqaaa-aaaam-ajfwq-cai). The `live` block in canister-ids.json is NOT read for live builds. Hardcoded constants win unconditionally on live.
- **Draft builds:** vite.config.js reads `process.env.CANISTER_ID_BACKEND` / `process.env.CANISTER_ID_FRONTEND` first, falls back to the canister-ids.json `draft` block. No hardcoded draft IDs in business logic.
- **canister-ids.json draft entries are fallback-only, not source of truth.** They exist for local dev where no env var is set. If both env var and JSON value are empty/unset on a draft build, vite.config.js exits with code 1.
- **config/canisters.ts runtime fallback** is always `canisterIds.draft`. This is a latent risk if the env var is ever unset on live, but it is dead code today since vite always sets the env var at build time.
- env.json is dead code — never use it.

## 3. BACKEND FILE MAP

### main.mo
- Composition root. Includes all mixins. Owns the `adminPrincipals` stable var and the `setupAdmin()` / `seedAdminsIfLive()` / `isAdmin()` admin model.
- LIVE_ADMIN_1 / LIVE_ADMIN_2 constants (main.mo:81-82) hold the user's actual II identities (e4ok7-... and krtlu-...).
- `seedAdminsIfLive()` is called in `postupgrade()` (main.mo:140) with a defense-in-depth lockout guard (main.mo:149-152) that re-seeds if `adminPrincipals` is still empty on live after the call. No-op on draft.
- `setupAdmin()` is rate-limited (3 attempts/hour per principal) on a dedicated transient `setupAdminRateLimitStore`, separate from the shared `rateLimitStore`.
- `isAdmin()` is a pure linear membership check against `adminPrincipals`. No RBAC, no AccessControl mixin, no migration-based admin seeding.

### types/common.mo
- Shared types: UserId, Timestamp, SubscriptionTier, AuditEntry, Result, ApiError

### types/nft.mo
- Nft, Collection, NftId, NftStatus, VerifyResult

### types/user.mo
- UserProfile, UserRole, SlotStatus

### types/collections.mo
- CollectionId, RenameCollectionRequest, CollectionSummary

### types/claim-link.mo
- ClaimToken, ClaimStatus, ClaimLink

### types/payment-proof.mo
- PaymentProof, PaymentStatus

### lib/nft.mo
- Core NFT domain logic: CRUD, ownership, audit, validation, collection membership

### lib/user.mo
- User domain logic: tier, slot, credit management

### lib/claim-link.mo
- Claim token generation and validation

### lib/collections.mo
- Collection domain logic

### mixins/nft-api.mo
- NFT API: mint, delete, burn, transfer, update metadata, collection management
- Dual auto-registration guards (lines 97-104 and 152-158)
- Uses `isAdmin()` from main.mo for admin checks
- **Pre-existing bug:** `checkRateLimit` uses `elapsed > 60` comparing nanoseconds — that is 60 NANOSECONDS, not 60 seconds. The window resets on essentially every call. When sharing `rateLimitStore` across features, this bug lets any co-located limiter be reset by unrelated calls. Security-critical rate-limiters (e.g. `setupAdmin`) must have their own dedicated transient Map.

### mixins/user-api.mo
- User API: profile, slots, credits, admin claim
- getCallerProfile auto-claims admin on first login when masterAdmin is null
- Auto-registration guard

### mixins/claim-link-api.mo
- Claim links, NFT claiming
- Uses `isAdmin()` (fixed v115)
- Strips collectionId on claim transfer (fixed v122)

### mixins/collections-api.mo
- Collection rename/delete with NFT unassignment

### mixins/payment-proof-api.mo
- Payment proof intake and admin verification

### mixins/stripe-api.mo
- Stripe webhook handling and tier assignment

### migrations/
- 11 migration files for schema evolution
- All critical state is stable
- Migration 20260722_000000.mo resets `adminPrincipals` to empty — this is why `seedAdminsIfLive()` must run in `postupgrade()` to re-seed LIVE_ADMIN PIDs after every upgrade.

## 4. FRONTEND FILE MAP

### main.tsx
- React entry point. No actor creation.
- Exports `RECONCILE_LOGIN_EVENT` constant and owns the `providerKey` state + window event listener that increments the key on the event, forcing `InternetIdentityProvider` to remount and rehydrate. This is the v220 login-refresh recovery mechanism (see Section 11).

### App.tsx
- Root router. No actor creation.

### contexts/AuthContext.tsx
- THE ONLY ACTOR CREATION SOURCE IN THE ENTIRE SYSTEM
- Manages identity, actor lifecycle, admin detection, profile hydration
- Rebuilds actor on every identity change. No caching.
- Dispatches `RECONCILE_LOGIN_EVENT` (imported from main.tsx) when `loginStatus` transitions to `loginError` after a real login attempt, guarded by a `loginAttemptedRef` to fire exactly once. This is the child-to-provider remount signal for the v220 login-refresh fix.

### backendSingleton.ts
- Pure actor factory. Only called from AuthContext.
- Throws on missing or anonymous identity. No caching.

### config/canisters.ts
- Canister ID resolution from import.meta.env
- Draft vs live builds. Runtime fallback is always `canisterIds.draft`.

### hooks/useQueries.ts
- React Query hooks for all backend operations
- Uses invalidateQueries (fire-and-forget)
- Use await refetchQueries for immediate UI updates

### hooks/usePermissions.ts
- Centralized capability model: isAdmin, isCreator, canMint, etc.

### pages/ClaimPage.tsx
- Public claim page. Stores minimal snapshot in sessionStorage.
- Invalidates/refetches before navigating to success.

### pages/PostClaimPage.tsx
- Post-claim success. Fetches fresh NFT data.
- Never uses stale snapshot as primary display.

### pages/CollectorPage.tsx
- Library with tabs: all, collections, claimed, created, recent.

### utils/nftNormalization.ts
- Normalizes backend NFT responses to consistent Nft[] shape.

## 5. ACTOR LIFECYCLE

Path: Internet Identity → useInternetIdentity() → AuthContext → createAuthenticatedActor() → backendSingleton.ts validates → HttpAgent(identity) → Actor.createActor() → React state in AuthContext → useAuth() hook → components

Rebuild triggers: login, logout, identity change, page reload

Rule: AuthContext ONLY. No exceptions.

## 6. ADMIN LIFECYCLE (final state after v222)

### Single source of truth
- The stable var `adminPrincipals` in main.mo is the single source of truth for admin membership.
- It is initialized with the two LIVE_ADMIN PIDs (`LIVE_ADMIN_1` = e4ok7-..., `LIVE_ADMIN_2` = krtlu-...) defined as constants at main.mo:81-82.
- `isAdmin()` is a pure linear membership check against `adminPrincipals`. No RBAC, no AccessControl mixin, no migration-based admin seeding, no `ensureMasterAdminSynced()`.

### On live
- `seedAdminsIfLive()` runs in `postupgrade()` (main.mo:140) to re-seed `adminPrincipals` after every upgrade. A defense-in-depth lockout guard (main.mo:149-152) re-seeds again if `adminPrincipals` is still empty on live after the call. This is required because migration 20260722_000000.mo resets `adminPrincipals` to empty — without the postupgrade call the live canister would have no admins until a manual claim.
- `setupAdmin()` refuses any caller when `adminPrincipals` is non-empty (live is already seeded). It is rate-limited to 3 attempts/hour per principal on a dedicated transient `setupAdminRateLimitStore`, separate from the shared `rateLimitStore` (because the NFT limiter's `elapsed > 60` nanoseconds bug would let an attacker reset the setupAdmin count by minting a single NFT if they shared the store).

### On draft
- `seedAdminsIfLive()` is a no-op on draft.
- `setupAdmin()` always allows the first caller to claim, because `effectivelyEmpty` is always true on draft (adminPrincipals is empty on a fresh draft canister). This lets the developer re-claim admin on each fresh draft canister without touching live.

### What was removed (v222)
- No `MASTER_ADMINS` constant with stale PIDs (4upfr-... / 62vwb-...). Replaced by `LIVE_ADMIN_1` / `LIVE_ADMIN_2` with the user's actual II identities.
- No AccessControl mixin, no `ensureMasterAdminSynced()`, no `AccessControl.isAdmin()`. Admin authority is `isAdmin()` against `adminPrincipals` only.
- No dynamic `claimAdmin()` claiming path that could let a second caller claim admin while one already exists (the historical phantom-admin bug).

## 7. USER REGISTRATION LIFECYCLE

- Auto-registered on first backend interaction
- mintNft and getCallerProfile both have auto-registration guards
- "User is not registered" trap must never fire
- Registration happens before any other checks

## 8. COLLECTION SYSTEM

- Collections created by admin/paid users
- NFTs assigned at mint time or after mint via modal
- Collection membership updated atomically with NFT record
- First NFT in collection is preview image

## 9. NFT METADATA STANDARD

Required fields: id, nftUniqueId (canisterId:0:tokenId), creatorId (ICPMS-XXXXXX-XXXX), title, description, imageUrl, ownerPrincipal, edition (1/100), mintDate, status, collectionId

After claim: claimedAt, claimToken, collectionId (always null)

## 10. CLAIM FLOW

1. Creator mints NFT
2. Creator generates claim link
3. Claimer visits /claim/:token
4. Fetches preview
5. Claims NFT
6. Backend transfers ownership + strips collectionId
7. Frontend stores snapshot
8. Invalidates/refetches
9. Navigates to success
10. PostClaimPage fetches fresh data
11. Renders modal

Critical: Never use sessionStorage snapshots as primary display. Always refetch fresh data.

## 11. KNOWN HISTORICAL BUGS

1. Splitting main.mo broke implicit execution order
2. claim-link-api.mo used adminPrincipal directly — dual authority leak (fixed v115)
3. Draft frontend calling live backend due to hardcoded canister IDs
4. env.json is dead code
5. Stale canister deployment — always confirm module hash
6. invalidateQueries is fire-and-forget — use await refetchQueries
7. Anonymous actor calls from multiple paths + cached singleton (fixed v112-v114)
8. canister-ids.json went stale on draft canister rotation since it was previously the sole source of truth for canister ID resolution — fixed: build-pipeline env vars now take precedence (see Section 2).
9. Phantom admin bug — main.mo passed adminPrincipal by value (disconnected copy) into UserMixin, allowing a second caller to claim admin while AccessControl already had one. Fixed: dynamic claiming removed, master admins hardcoded, synced idempotently. (Further refined in v222 — see bug 13.)
10. **Login-refresh defect (v220 fix):** The @caffeineai/core-infrastructure wrapper's `withAttributes={false}` login branch calls `await actor._initialize_access_control()` BEFORE the un-awaited `handleLoginSuccess(authClient)`. When the backend canister does not implement the IdentityAttributes mixin, `_initialize_access_control()` rejects, the `.catch()` fires `handleLoginError`, and `handleLoginSuccess` NEVER runs — so `setIdentity`/`setStatus('success')` never fire even though the II popup completed and the delegation was persisted. This is a deterministic defect, not a race. The wrapper exposes NO public refresh/reconciliation function. The proven recovery path is provider remount → mount effect re-runs → `existingClient.isAuthenticated()` true → `getIdentity()` → `setIdentity` → `setStatus('success')`. The v220 fix dispatches a `RECONCILE_LOGIN_EVENT` from AuthContext (inside the provider) when `loginStatus` transitions to `loginError` after a real login attempt (guarded by a `loginAttemptedRef` to fire exactly once), which increments a `providerKey` state in main.tsx (the provider's parent), forcing `InternetIdentityProvider` to remount and rehydrate. `RECONCILE_LOGIN_EVENT` is exported from main.tsx and imported by AuthContext — the only safe direction for child-to-provider remount signaling since AuthContext cannot pass props up to `InternetIdentityProvider`.
11. **Obsolete refresh hint (v221):** The "After connecting, refresh the page if your account doesn't update automatically." hint was removed from Header.tsx because the v220 fix resolved the login-refresh defect. The auth button is now the only pre-button element in the nav row.
12. **NFT rate-limiter nanosecond bug (pre-existing):** `mixins/nft-api.mo` `checkRateLimit` uses `elapsed > 60` comparing nanoseconds — that is 60 NANOSECONDS, not 60 seconds. The window resets on essentially every call. When sharing `rateLimitStore` across features, this bug lets any co-located limiter be reset by unrelated calls. Security-critical rate-limiters (e.g. `setupAdmin`) must have their own dedicated transient Map.
13. **Stale hardcoded admin PIDs (v222 fix #1):** `LIVE_ADMIN_1` / `LIVE_ADMIN_2` previously held stale PIDs (4upfr-... / 62vwb-...) that did not match the user's actual Internet Identity principals. Fixed in v222: replaced with the user's actual II identities (e4ok7-... and krtlu-...) at main.mo:81-82.
14. **Admin re-seeding gap after upgrade (v222 fix #2):** Migration 20260722_000000.mo resets `adminPrincipals` to empty, so without a re-seed the live canister would have no admins after an upgrade until a manual claim. Fixed in v222: `seedAdminsIfLive()` is now called inside `postupgrade()` (main.mo:140) with a defense-in-depth lockout guard (main.mo:149-152) that re-seeds if `adminPrincipals` is still empty on live after the call. No-op on draft.
15. **setupAdmin rate-limit store sharing (v222 fix #3):** `setupAdmin()` previously had no rate-limiting, and sharing the NFT limiter's `rateLimitStore` would have let an attacker reset the setupAdmin count by minting a single NFT (due to bug 12). Fixed in v222: `setupAdmin()` now has per-principal hourly rate-limiting (3 attempts/hour) on a dedicated transient `setupAdminRateLimitStore`, separate from the shared `rateLimitStore`.

## 12. DEPLOYMENT RULES

- All builds/deploys go to draft only
- Live deployment via "Go Live" button only
- Never deploy to live canister directly
- Always test on draft URL before going live
- Confirm which canister a transaction hits before debugging
- Draft canister ID may change — live never changes
- Draft canister IDs rotate on inactivity. At the start of every new draft session confirm current draft canister IDs with Caffeine and update canister-ids.json before building. Never assume draft IDs are stable between sessions.
- canister-ids.json must have current draft IDs under the draft key only. Never use an ic key for draft — vite.config.js only reads draft and live keys. If a third key appears, remove it and move values to draft.

## 13. SESSION RULES FOR CAFFEINE

- Read this file at start of every session
- Never hardcode canister IDs or principal IDs
- Admin principals are hardcoded as `LIVE_ADMIN_1` / `LIVE_ADMIN_2` (main.mo:81-82) — do not add, remove, or change these without an explicit architecture decision.
- Single actor creation path: AuthContext only
- Single admin authority: `isAdmin()` against `adminPrincipals` only — `setupAdmin()` is the only write path into admin membership state (plus `seedAdminsIfLive()` in postupgrade on live).
- Auto-register users silently
- Draft calls draft, live calls live
- Confirm deployment target before every deploy
- Confirm module hash changed after every deploy

## 14. KEY FILES REFERENCE

Frontend critical:
- AuthContext.tsx — single actor source, dispatches RECONCILE_LOGIN_EVENT
- backendSingleton.ts — pure actor factory
- canisters.ts — canister ID resolution
- useQueries.ts — all backend hooks
- usePermissions.ts — capability model
- nftNormalization.ts — response normalization
- main.tsx — exports RECONCILE_LOGIN_EVENT, owns providerKey remount state

Backend critical:
- main.mo — composition root, adminPrincipals + setupAdmin + seedAdminsIfLive + isAdmin
- mixins/nft-api.mo — mint, delete, burn, transfer (contains pre-existing rate-limit nanosecond bug)
- mixins/user-api.mo — profile, admin claim
- mixins/claim-link-api.mo — claiming
- lib/nft.mo — core domain logic
- lib/user.mo — user domain logic

## 15. PRE-DEPLOY VERIFICATION CHECKLIST

The 30-second check before any live deploy. Run all three before clicking "Go Live":

- **[MAIN]** `CANISTERS.backend` in the browser console matches the intended live backend (kd6s6-ziaaa-aaaam-ajfwa-cai). If it shows a draft ID, the build picked up the wrong canister — do not deploy.
- **[ADMIN]** `isAdmin()` returns `true` for your principal after login (no manual page refresh needed — the v220 login-refresh fix handles rehydration automatically). If it returns `false`, the live canister's `adminPrincipals` is empty (seedAdminsIfLive did not run or your PID is not in LIVE_ADMIN_1/LIVE_ADMIN_2) — do not deploy.
- **[UI]** The admin tab renders. If the admin tab does not appear despite `isAdmin()` returning `true`, the frontend capability model is stale — do not deploy.

---

Document version: v222
Last updated: 2026-07-23
