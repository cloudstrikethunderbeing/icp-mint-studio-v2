import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
import type { ExternalBlob } from "@caffeineai/object-storage";
export type { ExternalBlob } from "@caffeineai/object-storage";
export interface AdminReassignResult {
    id: bigint;
    ok: boolean;
    error?: string;
}
export interface AuditEntry {
    action: string;
    timestamp: Timestamp;
    details?: string;
    caller: Principal;
}
export interface BatchAwardConfig {
    delaySeconds: bigint;
    cappedPerCycle: bigint;
    batchSize: bigint;
}
export interface BatchAwardResult {
    hitCycleCap: boolean;
    awardedThisCycle: bigint;
    remainingPending: bigint;
}
export interface Cell {
    value: Value;
    name: string;
}
export interface ClaimPreview {
    nft: Nft;
    supplyLimit: bigint;
    claimedCount: bigint;
}
export interface ClaimStatus {
    supplyLimit: bigint;
    token: string;
    claimed: boolean;
    claimedBy?: Principal;
    claimedCount: bigint;
}
export interface ClaimToken {
    supplyLimit: bigint;
    token: string;
    usedAt?: bigint;
    usedBy?: Principal;
    createdAt: bigint;
    nftId: bigint;
    claimedCount: bigint;
}
export interface Collection {
    id: bigint;
    previewImage?: string;
    nftIds: Array<bigint>;
    ownerId: Principal;
    name: string;
    createdAt: Timestamp;
    tier: SubscriptionTier;
    description: string;
    maxSize: bigint;
}
export type CollectionId = bigint;
export interface CollectionSummary {
    id: CollectionId;
    ownerId: Principal;
    name: string;
    nftCount: bigint;
}
export interface CollectionWithCount {
    id: bigint;
    previewImage?: string;
    nftIds: Array<bigint>;
    ownerId: Principal;
    name: string;
    createdAt: Timestamp;
    tier: SubscriptionTier;
    description: string;
    nftCount: bigint;
    maxSize: bigint;
}
export type CreatorId = string;
export interface EligiblePendingEntry {
    thresholdTier: bigint;
    referrerPrincipal: Principal;
    enqueuedAt: Timestamp;
}
export interface HealthMetrics {
    claimedNfts: bigint;
    storageUsage: bigint;
    totalCreators: bigint;
    totalNfts: bigint;
    totalCollections: bigint;
    availableNfts: bigint;
    backendBuildTimestamp: bigint;
    totalClaims: bigint;
    activeNfts: bigint;
    canisterId: string;
}
export interface HttpHeader {
    value: string;
    name: string;
}
export interface HttpRequestResult {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface MyReferralStatus {
    referralCode?: string;
    referralsCount: bigint;
    awardedTiers: Array<bigint>;
}
export interface Nft {
    id: bigint;
    status: NftStatus;
    supplyLimit: bigint;
    title: string;
    imageBlob: ExternalBlob;
    edition: string;
    collectionId?: bigint;
    referralThreshold: bigint;
    ownerId: Principal;
    discountCode?: string;
    tags: Array<string>;
    creatorId: CreatorId;
    businessName?: string;
    mintDate: Timestamp;
    description: string;
    website?: string;
    claimedAt?: bigint;
    auditHistory: Array<AuditEntry>;
    rewardTier: RewardTier;
    rewardType: RewardType;
    assetHash: string;
    membershipId?: string;
    nftUniqueId: string;
    priceUsd?: bigint;
}
export interface NftClaimBreakdownEntry {
    supplyLimit: bigint;
    title: string;
    nftId: bigint;
    claimedCount: bigint;
}
export interface NftClaimCount {
    supplyLimit: bigint;
    nftId: bigint;
    claimedCount: bigint;
}
export interface NftSummary {
    id: bigint;
    status: NftStatus;
    title: string;
    thumbnail: string;
    collectionId?: bigint;
    ownerId: Principal;
    creatorId: CreatorId;
    mintDate: Timestamp;
    nftUniqueId: string;
    priceUsd?: bigint;
}
export interface NftSummaryPage {
    total: bigint;
    offset: bigint;
    limit: bigint;
    items: Array<NftSummary>;
}
export interface PaymentProof {
    id: string;
    status: PaymentProofStatus;
    principal: Principal;
    rejectionReason?: string;
    submittedAt: bigint;
    reviewedAt?: bigint;
    reviewedBy?: Principal;
    txHash: string;
    tierRequested: string;
    networkType: string;
}
export interface Purchase {
    id: string;
    status: PurchaseStatus;
    txRef: string;
    failureReason?: string;
    submittedAt: Timestamp;
    seller: Principal;
    nftId: bigint;
    expectedE8s: bigint;
    buyer: Principal;
    priceUsd: bigint;
    verifiedAt?: Timestamp;
    rateUsed: bigint;
}
export interface PurchaseQuote {
    paymentAddress: string;
    rateIsOverride: boolean;
    nftId: bigint;
    expectedE8s: bigint;
    priceUsd: bigint;
    rateUsed: bigint;
}
export interface RecordReferralResult {
    newlyEligiblePending: boolean;
    thresholdTier?: bigint;
    referrerPrincipal: Principal;
    newReferralsCount: bigint;
}
export interface ReferralCodeMapping {
    code: string;
    createdAt: Timestamp;
    referrerPrincipal: Principal;
}
export interface ReferralHealthMetrics {
    totalReferralsCounted: bigint;
    totalReferralCodes: bigint;
    eligiblePendingQueueLengthPerTier: Array<bigint>;
    eligiblePendingCount: bigint;
    remainingBonusSupply: bigint;
    bonusNftsAutoAwarded: bigint;
}
export interface RenameCollectionRequest {
    collectionId: CollectionId;
    newName: string;
}
export type Result = {
    __kind__: "ok";
    ok: Purchase;
} | {
    __kind__: "err";
    err: string;
};
export type Result_1 = {
    __kind__: "ok";
    ok: VerifyResult;
} | {
    __kind__: "err";
    err: string;
};
export type Result_10 = {
    __kind__: "ok";
    ok: ClaimStatus;
} | {
    __kind__: "err";
    err: string;
};
export type Result_11 = {
    __kind__: "ok";
    ok: ClaimPreview;
} | {
    __kind__: "err";
    err: string;
};
export type Result_12 = {
    __kind__: "ok";
    ok: bigint;
} | {
    __kind__: "err";
    err: string;
};
export type Result_13 = {
    __kind__: "ok";
    ok: Nft;
} | {
    __kind__: "err";
    err: string;
};
export type Result_2 = {
    __kind__: "ok";
    ok: Array<VerifyResult>;
} | {
    __kind__: "err";
    err: string;
};
export type Result_3 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export type Result_4 = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export type Result_5 = {
    __kind__: "ok";
    ok: BatchAwardResult;
} | {
    __kind__: "err";
    err: string;
};
export type Result_6 = {
    __kind__: "ok";
    ok: RecordReferralResult;
} | {
    __kind__: "err";
    err: string;
};
export type Result_7 = {
    __kind__: "ok";
    ok: {
        id: bigint;
        tokenId: bigint;
        collectionId?: bigint;
        nftUniqueId: string;
    };
} | {
    __kind__: "err";
    err: {
        message: string;
    };
};
export type Result_8 = {
    __kind__: "ok";
    ok: PurchaseQuote;
} | {
    __kind__: "err";
    err: string;
};
export type Result_9 = {
    __kind__: "ok";
    ok: {
        paymentAddress: string;
        rateOverride?: bigint;
    };
} | {
    __kind__: "err";
    err: string;
};
export interface Result__1 {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Timestamp = bigint;
export interface TransferResult {
    newOwnerPrincipal?: string;
    error?: string;
    success: boolean;
}
export interface TransformationInput {
    context: Uint8Array;
    response: HttpRequestResult;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface UpdateMetadataRequest {
    discountCode?: string;
    tags?: Array<string>;
    businessName?: string;
    website?: string;
    rewardTier?: RewardTier;
    membershipId?: string;
    priceUsd?: bigint;
}
export interface UserProfile {
    creditsTotal: bigint;
    oisyWalletAddress?: string;
    emailAlerts: Array<AlertType>;
    referralCode?: string;
    emailVerified: boolean;
    maxSlots: bigint;
    createdAt: Timestamp;
    subscriptionTier: SubscriptionTier;
    creatorId: CreatorId;
    email?: string;
    stripeProductId?: string;
    activeSlots: bigint;
    referralsCount: bigint;
    creditsUsed: bigint;
    principalId: Principal;
    creditsResetAt: Timestamp;
    awardedTiers: Array<bigint>;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export interface VerifyResult {
    status: NftStatus;
    supplyLimit: bigint;
    tokenId: bigint;
    edition: string;
    collectionId?: bigint;
    owner: Principal;
    discountCode?: string;
    tags: Array<string>;
    creatorId: CreatorId;
    businessName?: string;
    network: string;
    mintDate: Timestamp;
    website?: string;
    rewardTier: RewardTier;
    assetHash: string;
    membershipId?: string;
    nftUniqueId: string;
    canisterId: string;
}
export enum AlertType {
    mint_confirmation = "mint_confirmation",
    draft_purge = "draft_purge",
    subscription_expiry = "subscription_expiry",
    transfer_window = "transfer_window"
}
export enum NftStatus {
    deleted = "deleted",
    active = "active",
    burned = "burned"
}
export enum PaymentProofStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum PurchaseStatus {
    pending = "pending",
    confirmed = "confirmed",
    failed = "failed"
}
export enum RewardTier {
    bronze = "bronze",
    gold = "gold",
    none = "none",
    platinum = "platinum",
    silver = "silver"
}
export enum RewardType {
    none = "none",
    referralBonus = "referralBonus"
}
export enum SubscriptionTier {
    org = "org",
    pro = "pro",
    creator = "creator",
    free = "free"
}
export interface backendInterface {
    addAdmin(p: Principal): Promise<boolean>;
    addNftToCollection(nftId: bigint, collectionId: bigint): Promise<Result_3>;
    /**
     * / Admin-only: purge a specific eligible-pending entry (e.g. on admin
     * / review). Deactivation does NOT purge — only admin action or actual award
     * / removes an entry. Returns true if an entry was removed. Rejects non-admin
     * / callers (returns false).
     */
    adminPurgeEligiblePending(referrerPrincipal: Principal): Promise<boolean>;
    adminReassignOwner(id: bigint, newOwner: Principal): Promise<AdminReassignResult>;
    adminReassignOwnerBatch(ids: Array<bigint>, newOwner: Principal): Promise<Array<AdminReassignResult>>;
    adminSetNftPrice(id: bigint, priceUsd: bigint | null): Promise<Result_13>;
    /**
     * / Admin-only: set the referralThreshold on a referralBonus NFT. Only
     * / meaningful when the NFT's rewardType = #referralBonus. Respects the
     * / draft-only constraint — gated by isLiveCanister() (no live canister
     * / writes). Rejects non-admin callers (returns #err). Returns #err if the
     * / NFT does not exist or is not a referralBonus NFT.
     */
    adminSetNftReferralThreshold(nftId: bigint, threshold: bigint): Promise<Result_3>;
    /**
     * / Admin-only: set the rewardType on an NFT (#none or #referralBonus).
     * / Respects the draft-only constraint — gated by isLiveCanister() (no live
     * / canister writes). Rejects non-admin callers (returns #err). Returns
     * / #err if the NFT does not exist.
     */
    adminSetNftRewardType(nftId: bigint, rewardType: RewardType): Promise<Result_3>;
    /**
     * / Admin-only: update the batch-award throttle config (batch size, delay,
     * / per-cycle cap). The default is DEFAULT_BATCH_AWARD_CONFIG; admins may
     * / tune it. Respects the draft-only constraint — gated by isLiveCanister()
     * / (no live canister writes). Returns the new config. Rejects non-admin
     * / callers (returns the default config unchanged).
     */
    adminUpdateBatchAwardConfig(config: BatchAwardConfig): Promise<BatchAwardConfig>;
    approvePaymentProof(proofId: string): Promise<Result_4>;
    burnNft(id: bigint): Promise<Result_3>;
    /**
     * / NON-PUBLIC internal claim path. Contains the canonical validation flow
     * / (anonymous reject, [H3] rate limit, token validation, supply cap,
     * / assertClaimable, atomic useToken, [H2] counter-ordering, new NFT copy).
     * / This is the SAME flow the public claimNft uses; it is now extracted as a
     * / PUBLIC function in lib/claim-link.mo (ClaimLib.claimNftInternal) so the
     * / referral auto-award and the retroactive batch-award can REUSE the
     * / canonical mint path instead of creating a parallel mint. This mixin
     * / delegates to ClaimLib.claimNftInternal with all the shared stores.
     * /
     * / `claimer` is the principal who will own the new NFT copy. For a public
     * / claim this is the caller; for an auto-award this is the referrer; for a
     * / batch-award this is the eligible-pending referrer. `ref` is the optional
     * / referral code presented by the claimant — it is ONLY acted on by the
     * / PUBLIC claimNft wrapper (which records the referral + triggers the
     * / auto-award AFTER this internal func returns #ok). When the auto-award or
     * / batch-award calls this internal func, it passes `null` for ref so no
     * / referral is recorded on an auto-award (the referrer is being awarded,
     * / not referring).
     * / Public: claim an NFT by presenting a valid token. Creates a NEW NFT copy
     * / from the master; master NFT is never modified. Accepts an optional
     * / referral code (`ref`) — if present and valid, the referrer's
     * / referralsCount is incremented after a successful claim, and if the
     * / referrer now meets/exceeds a threshold for an active in-stock
     * / referralBonus NFT (and is not already in awardedTiers for that tier),
     * / the referrer is auto-awarded via claimNftInternal(referrer, internalToken,
     * / null) — reusing the SAME validation path as this claim. If the bonus NFT
     * / is sold out at trigger time, the referrer is moved to eligible-pending
     * / (handled inside ReferralLib.recordReferral). Self-referrals (referrer ==
     * / claimer) are rejected. Unknown/invalid ref codes fail OPEN — the claim
     * / still succeeds; only the referral recording is skipped (a bad ref must
     * / never block a legitimate claim).
     */
    claimNft(token: string, ref: string | null): Promise<Result_13>;
    clearRateOverride(): Promise<Result_3>;
    createCheckoutSession(_items: Array<{
        name: string;
        price: bigint;
    }>, _successUrl: string, _cancelUrl: string): Promise<string>;
    createCollection(name: string, description: string): Promise<Result_12>;
    createSlot(): Promise<Result_12>;
    deleteCollection(id: bigint): Promise<void>;
    deleteCollectionAndUnassignNfts(collectionId: CollectionId): Promise<CollectionSummary>;
    deleteNft(id: bigint): Promise<Result_3>;
    execute(qJson: string): Promise<Result__1>;
    /**
     * / Admin-only: generate a shareable claim URL for a specific NFT.
     * / Returns the relative path "/claim/" # token.
     */
    generateClaimLink(nftId: bigint): Promise<Result_4>;
    getActiveNfts(): Promise<bigint>;
    /**
     * / Public query: returns the backend API documentation as Markdown.
     */
    getApiDoc(): Promise<string>;
    getAvailableNfts(): Promise<bigint>;
    getBackendBuildTimestamp(): Promise<bigint>;
    getCallerProfile(): Promise<UserProfile>;
    getCanisterId(): Promise<string>;
    getCanisterIdSafe(): Promise<string>;
    getCatalogIntegrity(): Promise<{
        myActiveNftCount: bigint;
        totalNftCount: bigint;
        myNftCount: bigint;
    }>;
    /**
     * / Public (unauthenticated): retrieve NFT metadata for the claim page preview.
     * / Does NOT modify state; returns error if token invalid or NFT not claimable.
     */
    getClaimPreview(token: string): Promise<Result_11>;
    /**
     * / Admin-only: return claim status for a given NFT.
     */
    getClaimStatus(nftId: bigint): Promise<Result_10>;
    getClaimedNfts(): Promise<bigint>;
    getCollection(id: bigint): Promise<Collection | null>;
    getCollectionIdByName(name: string): Promise<CollectionId | null>;
    getCreditsStatus(): Promise<{
        total: bigint;
        used: bigint;
        remaining: bigint;
    }>;
    getHealthMetrics(): Promise<HealthMetrics>;
    getMetricsCanisterId(): Promise<string>;
    getMyPaymentProofs(): Promise<Array<PaymentProof>>;
    /**
     * / Public (authenticated): get the caller's own referral status
     * / (referralCode, referralsCount, awardedTiers). Preserves [OQL-LOCKDOWN] —
     * / never exposes discountCode, membershipId, secretKey, or stripe mode.
     * / Returns null if the caller has no profile.
     */
    getMyReferralStatus(): Promise<MyReferralStatus | null>;
    getNft(id: bigint): Promise<Nft | null>;
    /**
     * / ADMIN-ONLY: per-NFT claim breakdown joined with the Nft store to include
     * / the title for the Health tab breakdown table. Returns an array of
     * / { nftId, title, claimedCount, supplyLimit } for every published NFT that
     * / has a ClaimToken. Exposes ONLY those four fields — no discountCode,
     * / membershipId, or other redacted fields. Rejects anonymous and non-admin
     * / callers (returns [] for non-admins, consistent with the other admin-only
     * / metrics queries in this mixin). Read-only; does not mutate any store.
     * / Existing getClaimStatus remains admin-only and unchanged.
     */
    getNftClaimBreakdown(): Promise<Array<NftClaimBreakdownEntry>>;
    /**
     * / PUBLIC (unauthenticated): per-NFT claim counts for every NFT that has a
     * / ClaimToken. Returns an array of { nftId, claimedCount, supplyLimit } —
     * / ONLY those three fields. No token string, usedBy, usedAt, or any Nft
     * / redacted field (discountCode, membershipId) is exposed. Read-only; does
     * / not mutate any store. This is the public surface for the Library card
     * / indicator. Sits alongside getClaimPreview in the public-no-auth query
     * / list. v251 security redactions preserved — only nftId/claimedCount/
     * / supplyLimit are surfaced.
     */
    getNftClaimCounts(): Promise<Array<NftClaimCount>>;
    getNftPublic(id: bigint): Promise<Nft | null>;
    /**
     * / Public (authenticated): get or create the caller's own referral code.
     * / Codes are random + unguessable and NEVER expire (NO EXPIRY). Idempotent —
     * / returns the existing code if the caller already has one. Rejects
     * / anonymous callers. Also persists the new code onto the caller's
     * / UserProfile.referralCode so getMyReferralStatus can read it without
     * / scanning the referrerCodeIndex.
     */
    getOrCreateMyReferralCode(): Promise<Result_4>;
    getPaymentConfig(): Promise<Result_9>;
    getPurchaseQuote(nftId: bigint): Promise<Result_8>;
    /**
     * / Admin-only: get the referral/bonus Health metrics for the Health tab.
     * / Extends the existing getHealthMetrics / getNftClaimBreakdown admin-gated
     * / queries. `eligiblePendingQueueLengthPerTier` is indexed by threshold
     * / tier (stacking-ready). Preserves [OQL-LOCKDOWN] — never exposes
     * / discountCode, membershipId, secretKey, or stripe mode. Returns zeroed
     * / metrics for non-admin callers (consistent with getHealthMetrics).
     */
    getReferralHealthMetrics(): Promise<ReferralHealthMetrics>;
    getSlotsStatus(): Promise<{
        total: bigint;
        used: bigint;
        remaining: bigint;
    }>;
    getStableStateIntegrity(): Promise<{
        collectionCount: bigint;
        nftCount: bigint;
        claimTokenCount: bigint;
        userCount: bigint;
    }>;
    getStorageUsage(): Promise<bigint>;
    getStripeSessionStatus(_sessionId: string): Promise<{
        status: string;
    }>;
    getStripeStatus(): Promise<{
        mode: string;
        configured: boolean;
    }>;
    getTotalClaims(): Promise<bigint>;
    getTotalCollections(): Promise<bigint>;
    getTotalCreators(): Promise<bigint>;
    getTotalMinted(): Promise<bigint>;
    getTotalNftCount(): Promise<bigint>;
    getTotalNftCountCertified(): Promise<bigint>;
    getTotalNfts(): Promise<bigint>;
    hasRealAdmin(): Promise<boolean>;
    isAdmin(): Promise<boolean>;
    isLiveCanister(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    listAdmins(): Promise<Array<Principal>>;
    listAllNfts(offset: bigint, limit: bigint): Promise<NftSummaryPage>;
    listMyActiveNfts(offset: bigint, limit: bigint): Promise<NftSummaryPage>;
    listMyCollections(): Promise<Array<CollectionWithCount>>;
    listMyNfts(offset: bigint, limit: bigint): Promise<NftSummaryPage>;
    listMyPurchases(): Promise<Array<Purchase>>;
    listPaymentProofs(): Promise<Array<PaymentProof>>;
    listPublicNfts(offset: bigint, limit: bigint): Promise<NftSummaryPage>;
    mintNft(imageBlob: ExternalBlob, assetHash: string, title: string, description: string, collectionId: bigint | null, businessName: string | null, website: string | null, discountCode: string | null, membershipId: string | null, supplyLimit: bigint, priceUsd: bigint | null): Promise<Result_7>;
    /**
     * / Public (authenticated): record a referral by presenting a referral code.
     * / Increments the referrer's referralsCount. If the new count crosses a
     * / referralBonus NFT's threshold and no active in-stock referralBonus NFT
     * / exists, enqueues the referrer as eligible-pending. Deactivation
     * / preserves pending eligibility. Rejects anonymous callers and self-
     * / referrals (a referrer cannot refer themselves). Returns the referrer's
     * / new count and whether they became newly eligible-pending.
     * /
     * / NOTE: This endpoint does NOT trigger the synchronous auto-award. The
     * / synchronous auto-award is triggered by the claimNft path (in
     * / claim-link-api.mo) when a claimant presents a referral code alongside
     * / their claim token — that is the canonical mint path reuse. This
     * / endpoint is the explicit "I was referred" path for claimants who are
     * / not claiming an NFT at the same time.
     */
    recordReferral(code: string): Promise<Result_6>;
    rejectPaymentProof(proofId: string, reason: string): Promise<Result_4>;
    removeAdmin(p: Principal): Promise<boolean>;
    removeNftFromCollection(nftId: bigint, collectionId: bigint): Promise<Result_3>;
    renameCollection(request: RenameCollectionRequest): Promise<CollectionSummary>;
    /**
     * / Admin-only: run one retroactive batch-award cycle. Processes up to
     * / `batchSize` eligible-pending entries in earliest-eligible-first order,
     * / awarding each an in-stock referralBonus NFT by REUSING the existing
     * / claimNft validation path (not a parallel mint). Capped per cycle; if the
     * / cap is hit, the caller should schedule the next cycle after the
     * / configured delay. Rejects anonymous and non-admin callers (returns
     * / #err for non-admins, consistent with admin-gated metrics queries).
     * /
     * / The award reuses claimNftInternal (extracted in claim-link-api.mo) so
     * / the auto-award goes through the SAME validation path as a public claim:
     * / anonymous reject, [H3] rate limit, token validation, supply cap,
     * / assertClaimable, atomic useToken, [H2] counter-ordering, new NFT copy.
     * / On a successful award, the referrer's awardedTiers is appended (dedup by
     * / tier) and the eligible-pending entry is dequeued. On failure (e.g. sold
     * / out mid-cycle), the entry stays in the queue (deactivation preserves
     * / pending eligibility).
     */
    runBatchAwardCycle(): Promise<Result_5>;
    saveCallerProfile(profile: UserProfile): Promise<void>;
    schema(): Promise<string>;
    searchNfts(searchTerm: string, offset: bigint, limit: bigint): Promise<NftSummaryPage>;
    sendVerificationEmail(email: string): Promise<void>;
    setEmail(email: string): Promise<void>;
    setEmailAlerts(alerts: Array<AlertType>): Promise<void>;
    setOisyWalletAddress(address: string): Promise<void>;
    setPaymentAddress(address: string): Promise<Result_3>;
    setRateOverride(rate: bigint): Promise<Result_3>;
    setStripeConfiguration(mode: string, publishableKey: string): Promise<void>;
    setUserStripeProductId(userPrincipal: Principal, productId: string): Promise<Result_3>;
    setupAdmin(): Promise<boolean>;
    submitPaymentProof(txHash: string, tierRequested: string, networkType: string): Promise<Result_4>;
    submitPurchase(nftId: bigint, txRef: string): Promise<Result>;
    transferNft(id: bigint, toPrincipal: Principal): Promise<TransferResult>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateBusinessMetadata(id: bigint, updates: UpdateMetadataRequest): Promise<Result_3>;
    verifyNftByCreatorId(creatorId: string): Promise<Result_2>;
    verifyNftByCreatorIdWithHistory(creatorId: string): Promise<Result_2>;
    verifyNftPublic(nftUniqueId: string): Promise<Result_1>;
    verifyPurchase(purchaseId: string): Promise<Result>;
}
