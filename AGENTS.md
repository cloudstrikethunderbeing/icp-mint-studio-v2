# Project Guidance

## User Preferences

- Draft only — never touch live canisters
- Existing features (minting, claiming, collections, library tabs, analytics) must stay intact
- Preserve existing [RENDER]/[AUTH]/[COMMIT]/[DOM]/[LOGIN]/[RECON] diagnostic markers
- Use distinct diagnostic marker prefixes for new instrumentation so logs are greppable
- Minimize explanatory text in the UI
- Health page is admin-only and minimal point-form
- The public gallery is a section of the landing page at '/', not a replacement for the dApp
- The entire dApp must stay unified: one shell with Header/menu and BottomNav on every route
- Whole-value USD price (no cents) on every NFT
- Single compact info box below each card image; no pills on the image face
- Verify ICP payments via ledger canister call against the admin wallet principal
- Live ICP/USD rate with rounding to cover fees, plus optional admin manual override
- Less UI is more
- Draft only, never touch live canisters.
- Preserve existing minting, claiming, collections, library tabs and analytics.
- Preserve existing [RENDER]/[AUTH]/[COMMIT]/[DOM]/[LOGIN]/[RECON] diagnostic markers and use distinct new prefixes.
- Whole-value USD price, no cents.

## Accepted Requirements

- Admins can set, update, and clear priceUsd so an NFT can be unlisted
- Free claim links with eligibility, duplicate prevention, canonical ownership, and metadata preserved
- ICP purchase hardening: ledger verification, replay protection via consumed-block-index guard, idempotent settlement re-checking ownerId==seller, no double sale, pending purchase recovery without duplicate payment, accurate states
- All public purchase entry points use one canonical purchase flow
- Canonical ownership and metadata preservation across claim, purchase, and transfer
- Library reflects canonical ownership with no duplicates
- Minimal UI reusing PurchaseModal and NftDetailModal, no new routes, no, no card options

## Verified Commands

- **typecheck**: `pnpm --dir src/frontend typecheck`
- **fix**: `pnpm --dir src/frontend fix`
- **build**: `pnpm --dir src/frontend build`

## Learnings

- BottomNav anonymous tabs are Gallery('/'), How It Works, Verify; authenticated tabs are Library(/collector), Verify, How It Works, Profile, Settings, Studio('/studio'). Active matching must be exact for '/' or every path matches.
- Header.handleLogoClick unconditionally navigates to '/' from any route; the old /collector special case was removed.
- GalleryPage is now the landing page at '/': hero/intro section with a Studio CTA plus the public gallery as a section below; it lazy-loads NftDetailModal so the public page does not statically import AuthContext.
- DisconnectPage is routed at /disconnect and linked from the authenticated Header menu (data-ocid=header.disconnect_link).
- CollectorPage's empty-state 'Mint an NFT' link targets '/studio' since '/' is the landing page.
- The local-deploy autonomous tester cannot reach the canister API from the browser boundary (certificate signature-verification error / canister_reject IC0536 on _initialize_access_control after sign-in), so authenticated runtime flows and the public gallery report inconclusive rather than exercising the app. This is an environment limitation, not an app defect.
- Local-replica certificate signature-verification failures are fixed by calling agent.fetchRootKey() when backend_host includes 'localhost', exactly as @caffeineai/core-infrastructure's createActorWithConfig does; production hosts must keep the built-in mainnet root key and skip the fetch. Every actor-creation path (authenticated, anonymous gallery, claim preview) needs this guard or that surface blanks with a certificate verification error.
- The public gallery hydrates thumbnails through the anonymous-callable getNftPublic(id) query; getNft traps for anonymous callers. The generated binding already unwraps the opt to Nft|null, so read the value directly and never re-unwrap with Array.isArray.
- React Query's useMutation returns a new object identity each render; destructure the stable mutateAsync and depend only on it in effects/callbacks, never on the whole mutation object. A quote effect that calls a shared-update mutation should also guard with a ref keyed on (open, nftId).
- getPurchaseQuote is a shared update (it resolves the live ICP/USD rate via HTTP outcall), so it must be called via useMutation, not useQuery.
- The backend updateBusinessMetadata treats priceUsd=null as 'unchanged', so the edit form can set/change a price but cannot clear it; the mint form passes priceUsd as the final bigint|null argument to mintNft.
- The PocketIC backend lane calls mintNft with the full argument list ending in the priceUsd opt, Candid-encoded as [250n] for ?250 and [] for null; a bare 250n or null fails at encode time.
- The public gallery keeps readOnly on NftDetailModal (UnifiedShell test asserts data-readonly='true'), so the buyer's BUY action is gated on !isOwner alone, not !readOnly; readOnly suppresses only owner edit/delete/burn.
- Deleted/burned NFTs are filtered out of every listing by the backend isListable predicate but remain retrievable via getNft(tokenId); the Library's Find-by-ID lookup opens the detail modal read-only with a status badge.
- The admin payment address is stored in the backend paymentConfig and is empty until an admin sets it via setPaymentAddress; the purchase modal shows 'Unavailable' until then. The admin payment-address/rate-override config UI lives on the Settings page.
- Admin ownership reassignment: adminReassignOwner(id, newOwner) and adminReassignOwnerBatch(ids, newOwner) are Auth.isAdmin-gated, rewrite only ownerId in place (no audit entry, no timestamp), and maintain ownerIndex via NftLib.moveOwnerIndex (a no-op when from == to). They return AdminReassignResult { id: bigint; ok: boolean; error?: string } (batch returns one entry per requested id, same order).
- The Settings admin panel hosts the reassignment control (single id + target principal, and a batch action that pages listMyNfts to collect ids then issues one adminReassignOwnerBatch call); it is gated on isAdmin and invalidates myActiveNfts/myNfts/nfts/collections/nftRegistry/publicNfts.
- OQL entities declared with OQL.Entity.manual(...) still require .sample(...); without it an empty collection yields an empty schema (fields: []).
- Nft.creatorId is a derived hex id (NftLib.generateCreatorId), NOT the caller principal, so any 'created by me' comparison must use the caller's profile creatorId from getCallerProfile().
- Owner-scoped listings must derive ownership from the canonical nftStore (ownerId) and use the ownerIndex only as a fast-path hint; dedup by canonical id.
- updateBusinessMetadata's priceUsd is tri-state: a value sets/updates, and null must CLEAR for an admin while remaining unchanged for a non-admin owner.
- deleteNft/burnNft must clear priceUsd alongside the status transition so a removed NFT leaves every listing.
- verifyPurchase consumes the ledger block index before settlement, rejects replays, and releases the block index on pending/failed/settlement failure; markNftSold re-checks ownerId == seller.
- The local-deploy tester cannot reach the live ICP/USD exchange-rate outcall, so the purchase quote (ICP amount and payment address) never renders locally; purchase and claim flows stay blocked in local testing.
- The PocketIC backend lane skips with no_backend_wasm in this sandbox, and the mainnet ICP ledger canister is not installed, so real settlement and the consumed-block-index replay guard cannot be exercised locally.
