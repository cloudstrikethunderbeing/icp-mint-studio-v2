/// Behavioral API documentation for the ICP Mint Studio backend.
///
/// This mixin exposes exactly one method, `getApiDoc`, which returns a static
/// Markdown document describing the current public API. The document is
/// authored from the backend source and reads no runtime state, so the mixin
/// takes no parameters and declares no stable state.
mixin () {
  /// Public query: returns the backend API documentation as Markdown.
  public query func getApiDoc() : async Text {
    "# ICP Mint Studio — Backend API\n" #
    "\n" #
    "## Purpose\n" #
    "\n" #
    "The backend is a Motoko canister that stores and serves an NFT catalog for\n" #
    "ICP Mint Studio. It supports minting NFTs (with an uploaded image stored via\n" #
    "the object-storage component), listing and retrieving NFTs, claim links that\n" #
    "let recipients mint a copy of a master NFT, collections, user profiles,\n" #
    "subscription tiers, payment-proof review, referral rewards, and admin\n" #
    "metrics. All state is persisted with enhanced orthogonal persistence.\n" #
    "\n" #
    "## Authentication and authorization\n" #
    "\n" #
    "Callers are identified by their Internet Computer principal. The frontend\n" #
    "pins an Internet Identity derivation origin, published at\n" #
    "`/.well-known/ii-derivation-origin` when available. An agent already holding\n" #
    "the user's Internet Identity authorization derives the correct per-app\n" #
    "principal against that origin (for example\n" #
    "`icp identity link web <name> --app <host>`). Such a delegation acts with the\n" #
    "user's full authority in this app until it expires.\n" #
    "\n" #
    "There is no separate registration step for ordinary use: the first call that\n" #
    "needs a profile (for example `getCallerProfile` or `mintNft`) auto-creates\n" #
    "one for the caller. Admin access is separate and is claimed once via\n" #
    "`setupAdmin` on a draft canister; on the live canister admins are seeded by\n" #
    "the canister itself and `setupAdmin` always returns `false`.\n" #
    "\n" #
    "Authorization tiers used below:\n" #
    "\n" #
    "- **anonymous** — callable by any caller, including an anonymous principal.\n" #
    "- **signed-in** — requires a non-anonymous caller. Anonymous callers are\n" #
    "  rejected with a trap (`Unauthorized: Anonymous caller`) or an `#err`\n" #
    "  result, depending on the method.\n" #
    "- **owner** — requires the caller to own the referenced record.\n" #
    "- **admin** — requires the caller's principal to be in the admin list.\n" #
    "  Non-admin callers receive an `#err` result or a zeroed/empty value,\n" #
    "  depending on the method; some admin methods trap.\n" #
    "\n" #
    "## Identity and liveness\n" #
    "\n" #
    "- `getCanisterId()` / `getCanisterIdSafe()` (anonymous query) — both return\n" #
    "  the canister's own principal as text, resolved at runtime from\n" #
    "  `Principal.fromActor(Main)`, falling back to the persisted self id. The\n" #
    "  frontend compares this against the canister id it read from `/env.json`\n" #
    "  to detect a mismatch. The two methods are equivalent; do not rely on any\n" #
    "  difference between them.\n" #
    "- `isLiveCanister()` (anonymous query) — returns `true` when the canister's\n" #
    "  own runtime identity equals the known live canister id, `false` on draft.\n" #
    "  Use this to gate live-only UI.\n" #
    "\n" #
    "## Units and encodings\n" #
    "\n" #
    "- Timestamps are `Nat` nanoseconds since the Unix epoch (`Time.now()`\n" #
    "  absolute value), unless a field name says otherwise.\n" #
    "- `assetHash` is a lowercase 64-character hex SHA-256 of the image bytes.\n" #
    "- `nftUniqueId` is the text `\"<canisterId>:0:<tokenId>\"`.\n" #
    "- `imageBlob` is an object-storage `ExternalBlob`; the frontend resolves it\n" #
    "  to a URL through the object-storage client.\n" #
    "- Optional values are Candid `opt`; absent values are `null`.\n" #
    "- `Result.Result<Ok, Err>` is `#ok(Ok)` or `#err(Err)`.\n" #
    "\n" #
    "## NFT methods\n" #
    "\n" #
    "### `mintNft(imageBlob, assetHash, title, description, collectionId, businessName, website, discountCode, membershipId, supplyLimit, priceUsd)`\n" #
    "\n" #
    "Signed-in update. Mints a new NFT owned by the caller and returns\n" #
    "`#ok({ id; tokenId; nftUniqueId; collectionId })` or `#err({ message })`.\n" #
    "The caller's profile is auto-created if absent. Validation: `assetHash`\n" #
    "must be 64 hex chars and must match the SHA-256 of `imageBlob`; the image\n" #
    "must be non-empty, at most 10 MiB, and a structurally valid JPEG, PNG, or\n" #
    "WebP; `supplyLimit` must be between 1 and 500; `title` is required and\n" #
    "sanitized to 100 chars; `description` is sanitized to 1000 chars. If\n" #
    "`collectionId` is set, the caller must own that collection and it must not\n" #
    "be full. `priceUsd` is an optional whole-value USD price (positive integer\n" #
    "dollars, no cents); `null` mints the NFT unlisted. Non-admin callers are\n" #
    "rate-limited (5 mints/minute on the free tier, 20 on paid tiers) and capped\n" #
    "by their subscription tier's slot count; admins bypass the rate limit and\n" #
    "tier caps. The mint is atomic: on any post-persist failure the new record is\n" #
    "rolled back, so a returned `#ok` means the NFT is retrievable as active. A\n" #
    "claim token is auto-generated for admins and paid tiers.\n" #
    "\n" #
    "### `getNft(id)`\n" #
    "\n" #
    "Signed-in query. Returns `?Nft` for the given id, or `null` if absent.\n" #
    "Anonymous callers trap. For non-admin callers the sensitive `discountCode`\n" #
    "and `membershipId` fields are redacted; admins receive the full record.\n" #
    "\n" #
    "### `getNftPublic(id)`\n" #
    "\n" #
    "Anonymous query. Returns `?Nft` for the given id, or `null` if absent.\n" #
    "Unlike `getNft` this has no sign-in gate, so anonymous visitors can read a\n" #
    "single NFT — including its `imageBlob` — which is what the public gallery\n" #
    "uses to hydrate thumbnails. The same redaction applies: for non-admin\n" #
    "callers the sensitive `discountCode` and `membershipId` fields are stripped;\n" #
    "admins receive the full record. `getNft`'s authorization is unchanged.\n" #
    "\n" #
    "### `listMyNfts(offset, limit)`\n" #
    "\n" #
    "Signed-in query. Returns a page of the caller's listable NFTs as\n" #
    "`NftSummaryPage { items; total; offset; limit }`. `total` is the count of\n" #
    "all matching records before pagination; `items` is the window starting at\n" #
    "`offset`. Pass `limit = 0` to use the default page size (50). Anonymous\n" #
    "callers receive an empty page (`items = []`, `total = 0`). Ownership is\n" #
    "derived from the canonical NFT store (reconciled with the owner index), so\n" #
    "an owner's NFTs are always reflected exactly once, including after a reload\n" #
    "or re-authentication. Deleted and burned NFTs are excluded from every list\n" #
    "view; they remain retrievable by id through `getNft`/`getNftPublic`.\n" #
    "Summaries omit `discountCode`/`membershipId` and `imageBlob`; `thumbnail`\n" #
    "carries the `assetHash`; `priceUsd` carries the whole-value USD price or\n" #
    "`null`.\n" #
    "\n" #
    "### `listMyActiveNfts(offset, limit)`\n" #
    "\n" #
    "Signed-in query. Same pagination contract and `NftSummaryPage` return as\n" #
    "`listMyNfts`, but only the caller's NFTs that are `#active` and not yet\n" #
    "claimed — the same predicate the Library grid uses. Anonymous callers\n" #
    "receive an empty page.\n" #
    "\n" #
    "### `listAllNfts(offset, limit)`\n" #
    "\n" #
    "Admin query. Returns a page of every listable NFT in the catalog as\n" #
    "`NftSummaryPage { items; total; offset; limit }`; `limit = 0` uses the\n" #
    "default page size (50). Non-admin callers trap (`Unauthorized: Admin only`).\n" #
    "Deleted and burned NFTs are excluded. This is an admin diagnostic, not a\n" #
    "public catalog explorer.\n" #
    "\n" #
    "### `listPublicNfts(offset, limit)`\n" #
    "\n" #
    "Anonymous query. Returns a page of every `#active` NFT in the catalog as\n" #
    "`NftSummaryPage { items; total; offset; limit }`; `limit = 0` uses the\n" #
    "default page size (50). Unlike `listAllNfts` this has no admin gate and is\n" #
    "callable by anonymous visitors, so it is the public gallery listing. Only\n" #
    "NFTs whose status is `#active` are returned; deleted and burned NFTs are\n" #
    "excluded. Summaries omit `discountCode`/`membershipId` and `imageBlob`;\n" #
    "`thumbnail` carries the raw `assetHash` (a bare 64-hex SHA-256, not a\n" #
    "renderable URL), which the frontend resolves to a gateway URL.\n" #
    "\n" #
    "### `getTotalNftCount()`\n" #
    "\n" #
    "Anonymous query. Returns the total number of NFTs in the store. Exposes no\n" #
    "NFT details; used by the frontend health check to detect an empty backend.\n" #
    "\n" #
    "### `getTotalNftCountCertified()`\n" #
    "\n" #
    "Anonymous update. Same return value and semantics as `getTotalNftCount`,\n" #
    "but executes on the replicated state instead of a possibly stale replica.\n" #
    "Use it when a caller needs a fresh confirmation read (for example to\n" #
    "confirm a just-committed mint); use the query variant for ordinary reads.\n" #
    "\n" #
    "### `deleteNft(id)` / `burnNft(id)`\n" #
    "\n" #
    "Owner update. Soft-deletes or burns the caller's own NFT. Anonymous callers\n" #
    "and non-owners receive `#err`. Rate-limited. Delete removes the NFT from all\n" #
    "listings while keeping it retrievable by id; burn permanently destroys it.\n" #
    "Both also CLEAR the stored `priceUsd`, so a deleted or burned NFT is no\n" #
    "longer purchasable. Slot usage is derived from the active NFT count, so\n" #
    "neither call needs to adjust slots explicitly.\n" #
    "\n" #
    "### `transferNft(id, toPrincipal)`\n" #
    "\n" #
    "Owner update. Transfers an active NFT to another non-anonymous principal.\n" #
    "Rejects self-transfers, anonymous recipients, non-owners, and inactive\n" #
    "NFTs. Rate-limited. Returns `Common.TransferResult`.\n" #
    "\n" #
    "### `adminReassignOwner(id, newOwner)`\n" #
    "\n" #
    "Admin update. Rewrites ONLY the `ownerId` field on the existing NFT record,\n" #
    "in place, and keeps the owner index consistent so the NFT appears in the new\n" #
    "owner's `listMyNfts`/`listMyActiveNfts` and disappears from the old owner's.\n" #
    "Unlike `transferNft` it does not require the caller to be the current owner\n" #
    "and does not require the NFT to be active, so an admin can correct ownership\n" #
    "of any existing NFT (including deleted or burned ones). No metadata,\n" #
    "timestamps, `creatorId`, images, edition, claim data, status, or audit\n" #
    "history are touched. Non-admin callers receive `{ ok = false; error =\n" #
    "?\"Unauthorized: Admin only\" }` (no trap). Returns `AdminReassignResult {\n" #
    "id; ok; error }`; `ok = false` with `error = ?\"NFT not found\"` when the id\n" #
    "does not exist, and `error = ?\"Cannot reassign to anonymous principal\"` for\n" #
    "an anonymous `newOwner`.\n" #
    "\n" #
    "### `adminReassignOwnerBatch(ids, newOwner)`\n" #
    "\n" #
    "Admin update. Batch variant of `adminReassignOwner`: reassigns every id in\n" #
    "`ids` to `newOwner` in one call. Each id is processed independently and\n" #
    "reported in the returned `[AdminReassignResult]` in the same order as `ids`,\n" #
    "so a partial failure is visible per id rather than aborting the whole batch.\n" #
    "Same admin gate and same per-id semantics as `adminReassignOwner`.\n" #
    "\n" #
    "### `updateBusinessMetadata(id, updates)`\n" #
    "\n" #
    "Owner-or-admin update. Updates `businessName`, `website`, `discountCode`,\n" #
    "`membershipId`, `rewardTier`, `tags`, and `priceUsd` on an active NFT.\n" #
    "`priceUsd` is a whole-value USD price (positive integer dollars, no cents).\n" #
    "For an ADMIN, `priceUsd = null` CLEARS the listing (unlists the NFT while it\n" #
    "stays owned and active); for a non-admin owner, `null` leaves the current\n" #
    "price unchanged. The dedicated `adminSetNftPrice(id, ?Nat)` remains the\n" #
    "canonical set/update/clear path. Non-admins may only set `rewardTier` to\n" #
    "`#none`; tags are sanitized and capped at 20.\n" #
    "\n" #
    "### `searchNfts(searchTerm, offset, limit)`\n" #
    "\n" #
    "Admin query. Returns a page of NFTs matching the term as\n" #
    "`NftSummaryPage { items; total; offset; limit }`; `limit = 0` uses the\n" #
    "default page size (50). Non-admin callers trap.\n" #
    "\n" #
    "### `getStableStateIntegrity()` / `getCatalogIntegrity()`\n" #
    "\n" #
    "Diagnostics. `getStableStateIntegrity` is admin-only and reports store\n" #
    "sizes; `getCatalogIntegrity` is anonymous and reports total and\n" #
    "caller-scoped counts. Neither mutates state.\n" #
    "\n" #
    "## Claim flow\n" #
    "\n" #
    "### `generateClaimLink(nftId)`\n" #
    "\n" #
    "Admin or paid-tier update. Creates a reusable claim token for an active NFT\n" #
    "and returns `#ok(\"/claim/<token>\")`. Free-tier non-admins receive `#err`.\n" #
    "\n" #
    "### `getClaimPreview(token)`\n" #
    "\n" #
    "Anonymous query. Returns `#ok({ nft; supplyLimit; claimedCount })` for a\n" #
    "valid, not-fully-redeemed token, or `#err` if the token is invalid, fully\n" #
    "redeemed, or the NFT is not active. Read-only.\n" #
    "\n" #
    "### `claimNft(token, ref)`\n" #
    "\n" #
    "Signed-in update. Claims a copy of the master NFT for the caller and\n" #
    "returns `#ok(Nft)` or `#err`. The master NFT is never modified; a new copy\n" #
    "is created. Rate-limited to one claim per principal per 60 seconds. The\n" #
    "optional `ref` referral code is handled fail-open: an unknown or\n" #
    "self-referral code never blocks a successful claim, it only skips referral\n" #
    "recording. A successful claim with a valid `ref` increments the referrer's\n" #
    "count and may trigger a synchronous bonus award.\n" #
    "\n" #
    "### `getClaimStatus(nftId)` / `getNftClaimCounts()` / `getNftClaimBreakdown()`\n" #
    "\n" #
    "`getClaimStatus` and `getNftClaimBreakdown` are admin-only; `getNftClaimCounts`\n" #
    "is anonymous and returns `{ nftId; claimedCount; supplyLimit }` per published\n" #
    "NFT. None expose token strings or redacted fields.\n" #
    "\n" #
    "## Collections\n" #
    "\n" #
    "- `createCollection(name, description)` — signed-in update. Free tier\n" #
    "  receives `#err`; paid tiers are capped at 8 collections. Admins get an\n" #
    "  effectively unlimited collection. Returns `#ok(id)`.\n" #
    "- `listMyCollections()` — signed-in query. Returns the caller's collections\n" #
    "  with an `nftCount`.\n" #
    "- `getCollection(id)` — signed-in query. Returns `?Collection`.\n" #
    "- `deleteCollection(id)` — owner update. Traps for anonymous callers,\n" #
    "  missing collections, and non-owners.\n" #
    "- `addNftToCollection(nftId, collectionId)` /\n" #
    "  `removeNftFromCollection(nftId, collectionId)` — signed-in update.\n" #
    "- `getCollectionIdByName(name)` — signed-in query.\n" #
    "- `renameCollection(request)` / `deleteCollectionAndUnassignNfts(collectionId)`\n" #
    "  — signed-in update.\n" #
    "\n" #
    "## User profile and subscription\n" #
    "\n" #
    "- `getCallerProfile()` — signed-in update (auto-creates the profile).\n" #
    "- `saveCallerProfile(profile)` — signed-in update. `emailVerified` is\n" #
    "  locked to its existing value; a user cannot self-promote to verified.\n" #
    "- `setOisyWalletAddress(address)` — signed-in update. Requires 64 hex chars.\n" #
    "- `setEmail(email)` / `sendVerificationEmail(email)` — signed-in update.\n" #
    "- `setEmailAlerts(alerts)` — signed-in update.\n" #
    "- `getCreditsStatus()` / `getSlotsStatus()` / `getTotalMinted()` — signed-in\n" #
    "  queries; anonymous callers receive zeroed values.\n" #
    "- `createSlot()` — signed-in update.\n" #
    "- `setUserStripeProductId(userPrincipal, productId)` — admin update.\n" #
    "\n" #
    "## Payment proofs\n" #
    "\n" #
    "- `submitPaymentProof(txHash, tierRequested, networkType)` — signed-in\n" #
    "  update. `txHash` must be exactly 64 hex chars; `networkType` must be\n" #
    "  `icp` or `ckbtc`; `tierRequested` must be a known Stripe product id.\n" #
    "  Rate-limited to one submission per 60 seconds, and rejected while the\n" #
    "  caller already has a pending proof. Returns `#ok(proofId)`.\n" #
    "- `approvePaymentProof(proofId)` / `rejectPaymentProof(proofId, reason)` —\n" #
    "  admin update. Approving assigns the requested tier.\n" #
    "- `listPaymentProofs()` — admin query. `getMyPaymentProofs()` — signed-in\n" #
    "  query.\n" #
    "\n" #
    "## NFT purchases\n" #
    "\n" #
    "A buyer purchases one specific listed NFT by sending ICP to the admin\n" #
    "payment address and submitting the transaction reference. Verification is\n" #
    "automatic against the ICP ledger canister; no manual admin confirmation is\n" #
    "required.\n" #
    "\n" #
    "- `getPurchaseQuote(nftId)` — anonymous update. Returns\n" #
    "  `#ok(PurchaseQuote)` with `priceUsd`, `paymentAddress`, `expectedE8s`,\n" #
    "  `rateUsed`, and `rateIsOverride`, or `#err` when the NFT is missing, not\n" #
    "  active, or not listed. This is an update (not a query) because it resolves\n" #
    "  the live ICP/USD rate via an HTTP outcall. `expectedE8s` is the exact\n" #
    "  amount to send, in e8s (1 ICP = 100_000_000 e8s), rounded UP to cover the\n" #
    "  ledger fee.\n" #
    "- `submitPurchase(nftId, txRef)` — signed-in update. Records a pending\n" #
    "  purchase for the caller after they send ICP. `txRef` is the transaction\n" #
    "  reference (non-empty). Rejects anonymous callers, the NFT's own owner,\n" #
    "  inactive/unlisted NFTs, and an unconfigured payment address. Returns\n" #
    "  `#ok(Purchase)`.\n" #
    "- `verifyPurchase(purchaseId)` — signed-in update, buyer-only. Queries the\n" #
    "  ICP ledger canister (`ryjl3-tyaaa-aaaaa-aaaba-cai`) for a transfer to the\n" #
    "  admin account covering `expectedE8s` within a bounded recent window of\n" #
    "  blocks. On a match the purchase becomes `#confirmed`; when the transfer is\n" #
    "  not yet visible it stays `#pending` (poll again); an unconfigured/invalid\n" #
    "  payment address marks it `#failed`. Returns `#ok(Purchase)`.\n" #
    "- `listMyPurchases()` — signed-in query. Returns the caller's own purchases,\n" #
    "  newest first. Anonymous callers receive `[]`.\n" #
    "- `setPaymentAddress(address)` — admin update. Sets the principal buyers\n" #
    "  send ICP to; must be a valid principal.\n" #
    "- `setRateOverride(rate)` / `clearRateOverride()` — admin update. Sets or\n" #
    "  clears a manual ICP/USD rate (scaled by 100_000_000) that takes precedence\n" #
    "  over the live rate.\n" #
    "- `getPaymentConfig()` — admin query. Returns `{ paymentAddress;\n" #
    "  rateOverride }`.\n" #
    "\n" #
    "The effective rate is the admin override when set, otherwise the live\n" #
    "ICP/USD rate fetched from the IC dashboard API, otherwise a built-in\n" #
    "fallback. A confirmed purchase marks the NFT as sold; the NFT's status is\n" #
    "not changed by the purchase itself.\n" #
    "\n" #
    "## Referral rewards\n" #
    "\n" #
    "- `getOrCreateMyReferralCode()` — signed-in update. Returns the caller's\n" #
    "  unguessable, non-expiring code; idempotent.\n" #
    "- `recordReferral(code)` — signed-in update. Records a referral; rejects\n" #
    "  self-referrals and unknown codes.\n" #
    "- `getMyReferralStatus()` — signed-in query. Returns the caller's own\n" #
    "  referral code, count, and awarded tiers, or `null` if no profile.\n" #
    "- `runBatchAwardCycle()` — admin update. Awards eligible-pending referrers\n" #
    "  from in-stock bonus NFTs, reusing the canonical claim path.\n" #
    "- `getReferralHealthMetrics()` — admin query; non-admins receive zeroed\n" #
    "  metrics.\n" #
    "- `adminPurgeEligiblePending(referrerPrincipal)` — admin update.\n" #
    "- `adminUpdateBatchAwardConfig(config)` — admin update. Draft-only: on the\n" #
    "  live canister it returns the current config unchanged.\n" #
    "- `adminSetNftRewardType(nftId, rewardType)` /\n" #
    "  `adminSetNftReferralThreshold(nftId, threshold)` — admin update.\n" #
    "  Draft-only: on the live canister they return `#err`.\n" #
    "\n" #
    "## Admin methods\n" #
    "\n" #
    "- `isAdmin()` — signed-in query. Returns whether the caller is an admin.\n" #
    "- `hasRealAdmin()` — anonymous query. Returns whether a real (non-seeded)\n" #
    "  admin exists.\n" #
    "- `setupAdmin()` — signed-in update. One-shot first-caller-becomes-admin on\n" #
    "  draft; always `false` on live. Rate-limited to 3 attempts per principal\n" #
    "  per hour.\n" #
    "- `addAdmin(p)` / `removeAdmin(p)` — admin update. `removeAdmin` refuses to\n" #
    "  remove the last admin.\n" #
    "- `listAdmins()` — admin query; non-admins receive `[]`.\n" #
    "- `getTotalNfts()`, `getActiveNfts()`, `getClaimedNfts()`,\n" #
    "  `getAvailableNfts()`, `getTotalCollections()`, `getTotalCreators()`,\n" #
    "  `getTotalClaims()`, `getMetricsCanisterId()`,\n" #
    "  `getBackendBuildTimestamp()`, `getStorageUsage()`, `getHealthMetrics()` —\n" #
    "  admin queries; non-admins receive zeroed values.\n" #
    "- `isStripeConfigured()` — anonymous query. `setStripeConfiguration(mode,\n" #
    "  publishableKey)` — admin update; only `test` or `live` mode is accepted\n" #
    "  and no secret key is stored. `getStripeStatus()` — admin query.\n" #
    "- `createCheckoutSession(...)` / `getStripeSessionStatus(...)` — signed-in\n" #
    "  updates that currently trap (`Stripe checkout not available`).\n" #
    "\n" #
    "## Data querying (OQL)\n" #
    "\n" #
    "The canister exposes its persisted data through the Object Query Layer:\n" #
    "`schema()` returns the queryable entity/field schema and `execute(qJson)`\n" #
    "runs a JSON query against it. Both are query methods. Authorization is\n" #
    "per-entity. The following entities are controller-only (readable by the\n" #
    "platform Data Intelligence agent, not by end users): `nft`, `collection`,\n" #
    "`userProfile`, `paymentProof`, `claimToken`, `referralCode`,\n" #
    "`eligiblePending`, `purchase`, `auditLog`, `claimer`, `nftClaimToken`,\n" #
    "`referrerCodeIndex`, `creatorIndex`, `ownerIndex`, `collectionNftCount`,\n" #
    "and `verifiedEmail`. `myReferralStatus` is caller-scoped\n" #
    "(`controllerOrScoped` + `ownedBy(\"principalId\")`) so a signed-in caller\n" #
    "sees only their own row while the agent sees all. Sensitive fields\n" #
    "(`discountCode`, `membershipId`, the Stripe secret, and the Stripe mode)\n" #
    "are never projected into any entity. Transient rate-limit/throttle stores\n" #
    "and scalar config/counters are not entities because they hold no\n" #
    "queryable rows.\n" #
    "\n" #
    "## Lifecycle and polling\n" #
    "\n" #
    "Minting, claiming, and payment-proof submission are synchronous updates:\n" #
    "the returned `#ok`/`#err` is the final outcome, so no polling is required.\n" #
    "A purchase is the exception: `submitPurchase` records a pending purchase,\n" #
    "and the buyer polls `verifyPurchase` until it returns `#confirmed` (or\n" #
    "`#failed`). The only other asynchronous work is the referral batch-award,\n" #
    "which is driven by an admin calling `runBatchAwardCycle`; each call\n" #
    "processes a bounded number of eligible-pending entries and reports\n" #
    "`hitCycleCap`. Poll `getReferralHealthMetrics` between cycles to observe\n" #
    "progress.\n" #
    "\n" #
    "## Mutation retry safety\n" #
    "\n" #
    "Updates are not idempotent in general. Retrying `mintNft` creates another\n" #
    "NFT; retrying `claimNft` consumes another copy of the claim token (and is\n" #
    "rate-limited); retrying `submitPaymentProof` is rejected while a pending\n" #
    "proof exists. `getOrCreateMyReferralCode` is idempotent. `deleteNft`,\n" #
    "`burnNft`, and `transferNft` are safe to retry only in the sense that a\n" #
    "second call fails cleanly once the NFT is no longer active or owned.\n" #
    "`submitPurchase` is keyed by `(nftId, buyer)`, so re-submitting overwrites\n" #
    "the buyer's pending record for that NFT rather than creating a duplicate;\n" #
    "`verifyPurchase` is safe to poll repeatedly and returns the existing\n" #
    "confirmed purchase once confirmed.\n" #
    "\n" #
    "## Errors, traps, and gotchas\n" #
    "\n" #
    "- Methods that return `Result` report caller-fixable failures as `#err`.\n" #
    "  Methods that trap (for example `getNft` for anonymous callers,\n" #
    "  `deleteCollection` for non-owners, and most admin-only queries) surface\n" #
    "  as an opaque canister reject on the frontend.\n" #
    "- `getNft`, `listMyNfts`, and `listMyActiveNfts` redact `discountCode` and\n" #
    "  `membershipId` for non-admin callers; do not expect those fields to be\n" #
    "  populated for ordinary users.\n" #
    "- `mintNft` requires `assetHash` to match the image bytes exactly; a\n" #
    "  mismatch is rejected rather than silently corrected.\n" #
    "- The draft-only referral admin methods are gated on the canister's own\n" #
    "  runtime identity, so they behave correctly on both draft and live and\n" #
    "  never depend on a hardcoded canister id.\n" #
    "- `getCanisterIdSafe` and `getCanisterId` are intentionally identical and\n" #
    "  must not be changed to return different values.\n"
  };
}
