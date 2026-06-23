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
- Draft canister: rqo43-haaaa-aaaai-q3zia-cai (ephemeral)
- Live canister: ksicd-uqaaa-aaaak-qy63a-cai (permanent)
- Draft URL: https://pretty-amber-68k-draft.caffeine.xyz/
- Live URL: https://icp-mint-studio-n3x.caffeine.xyz/
- Draft calls draft, live calls live — never crossed

## 2. CANISTER STRUCTURE

- Frontend canister: nzbzg-eiaaa-aaaai-q34ua-cai (draft) / k3lj7-cyaaa-aaaak-qy62q-cai (live)
- Backend draft: rqo43-haaaa-aaaai-q3zia-cai
- Backend live: ksicd-uqaaa-aaaak-qy63a-cai
- Canister IDs injected at build time via Vite plugin reading canister-ids.json
- Canister ID resolution precedence: build-pipeline env vars (CANISTER_ID_BACKEND / CANISTER_ID_FRONTEND) take precedence at build time; canister-ids.json is a fallback only (local dev / pipeline gaps), not the source of truth
- env.json is dead code — never use it

## 3. BACKEND FILE MAP

### main.mo
- Composition root. Includes all mixins. Manages adminPrincipal and AccessControl state sync.

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
- Uses AccessControl.isAdmin()

### mixins/user-api.mo
- User API: profile, slots, credits, admin claim
- getCallerProfile auto-claims admin on first login when masterAdmin is null
- Auto-registration guard

### mixins/claim-link-api.mo
- Claim links, NFT claiming
- Uses AccessControl.isAdmin() (fixed v115)
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

## 4. FRONTEND FILE MAP

### main.tsx
- React entry point. No actor creation.

### App.tsx
- Root router. No actor creation.

### contexts/AuthContext.tsx
- THE ONLY ACTOR CREATION SOURCE IN THE ENTIRE SYSTEM
- Manages identity, actor lifecycle, admin detection, profile hydration
- Rebuilds actor on every identity change. No caching.

### backendSingleton.ts
- Pure actor factory. Only called from AuthContext.
- Throws on missing or anonymous identity. No caching.

### config/canisters.ts
- Canister ID resolution from import.meta.env
- Draft vs live builds

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

## 6. ADMIN LIFECYCLE

- Master admins are hardcoded as MASTER_ADMINS in main.mo
- Principal IDs: 62vwb-gcj3s-... (live) and 4upfr-qatay-... (draft)
- Admin status is synced into AccessControl on every
  getCallerProfile() call via ensureMasterAdminSynced()
- No dynamic claiming — claimAdmin() is disabled
- AccessControl.isAdmin() is single source of truth for all
  runtime permission checks
- Master admin: unlimited minting, unlimited slots, full
  collection management, admin tab in Settings

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
9. Phantom admin bug — main.mo passed adminPrincipal by value
   (disconnected copy) into UserMixin, allowing a second caller to claim
   admin while AccessControl already had one. Fixed: dynamic claiming
   removed, master admins hardcoded in MASTER_ADMINS constant, synced
   idempotently on every getCallerProfile() call.

## 12. DEPLOYMENT RULES

- All builds/deploys go to draft only
- Live deployment via "Go Live" button only
- Never deploy to live canister directly
- Always test on draft URL before going live
- Confirm which canister a transaction hits before debugging
- Draft canister ID may change — live never changes
- Draft canister IDs rotate on inactivity. At the start of every new draft session confirm current draft canister IDs with Caffeine and update canister-ids.json before building. Never assume draft IDs are stable between sessions.

## 13. SESSION RULES FOR CAFFEINE

- Read this file at start of every session
- Never hardcode canister IDs or principal IDs
- Master admin principals are hardcoded in MASTER_ADMINS
  (main.mo) — do not add, remove, or change these without an
  explicit architecture decision.
- Single actor creation path: AuthContext only
- Single admin authority: AccessControl.isAdmin() only —
  ensureMasterAdminSynced() is the only write path into admin
  role state.
- Auto-register users silently
- Draft calls draft, live calls live
- Confirm deployment target before every deploy
- Confirm module hash changed after every deploy

## 14. KEY FILES REFERENCE

Frontend critical:
- AuthContext.tsx — single actor source
- backendSingleton.ts — pure actor factory
- canisters.ts — canister ID resolution
- useQueries.ts — all backend hooks
- usePermissions.ts — capability model
- nftNormalization.ts — response normalization

Backend critical:
- main.mo — composition root
- mixins/nft-api.mo — mint, delete, burn, transfer
- mixins/user-api.mo — profile, admin claim
- mixins/claim-link-api.mo — claiming
- lib/nft.mo — core domain logic
- lib/user.mo — user domain logic

---

Document version: v125
Last updated: 2026-06-23
