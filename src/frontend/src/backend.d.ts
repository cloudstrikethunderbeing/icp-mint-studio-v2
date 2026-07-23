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
export type Timestamp = bigint;
export type Result_2 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export interface Result__1 {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export interface AuditEntry {
    action: string;
    timestamp: Timestamp;
    details?: string;
    caller: Principal;
}
export type Result_5 = {
    __kind__: "ok";
    ok: ClaimStatus;
} | {
    __kind__: "err";
    err: string;
};
export type Result_1 = {
    __kind__: "ok";
    ok: Array<VerifyResult>;
} | {
    __kind__: "err";
    err: string;
};
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
export type Result_4 = {
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
export interface Nft {
    id: bigint;
    status: NftStatus;
    supplyLimit: bigint;
    title: string;
    imageBlob: ExternalBlob;
    edition: string;
    collectionId?: bigint;
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
    assetHash: string;
    membershipId?: string;
    nftUniqueId: string;
}
export interface UpdateMetadataRequest {
    discountCode?: string;
    tags?: Array<string>;
    businessName?: string;
    website?: string;
    rewardTier?: RewardTier;
    membershipId?: string;
}
export interface TransferResult {
    newOwnerPrincipal?: string;
    error?: string;
    success: boolean;
}
export interface ClaimStatus {
    supplyLimit: bigint;
    token: string;
    claimed: boolean;
    claimedBy?: Principal;
    claimedCount: bigint;
}
export interface Cell {
    value: Value;
    name: string;
}
export type Result_7 = {
    __kind__: "ok";
    ok: bigint;
} | {
    __kind__: "err";
    err: string;
};
export interface RenameCollectionRequest {
    collectionId: CollectionId;
    newName: string;
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
export type CollectionId = bigint;
export interface ClaimPreview {
    nft: Nft;
    supplyLimit: bigint;
    claimedCount: bigint;
}
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
export type Result_6 = {
    __kind__: "ok";
    ok: ClaimPreview;
} | {
    __kind__: "err";
    err: string;
};
export interface CollectionSummary {
    id: CollectionId;
    ownerId: Principal;
    name: string;
    nftCount: bigint;
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
export interface ClaimToken {
    supplyLimit: bigint;
    token: string;
    usedAt?: bigint;
    usedBy?: Principal;
    createdAt: bigint;
    nftId: bigint;
    claimedCount: bigint;
}
export type CreatorId = string;
export type Result = {
    __kind__: "ok";
    ok: VerifyResult;
} | {
    __kind__: "err";
    err: string;
};
export type Result_3 = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
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
export type Result_8 = {
    __kind__: "ok";
    ok: Nft;
} | {
    __kind__: "err";
    err: string;
};
export interface UserProfile {
    creditsTotal: bigint;
    oisyWalletAddress?: string;
    emailAlerts: Array<AlertType>;
    maxSlots: bigint;
    createdAt: Timestamp;
    subscriptionTier: SubscriptionTier;
    creatorId: CreatorId;
    email?: string;
    stripeProductId?: string;
    activeSlots: bigint;
    creditsUsed: bigint;
    principalId: Principal;
    creditsResetAt: Timestamp;
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
export enum RewardTier {
    bronze = "bronze",
    gold = "gold",
    none = "none",
    platinum = "platinum",
    silver = "silver"
}
export enum SubscriptionTier {
    org = "org",
    pro = "pro",
    creator = "creator",
    free = "free"
}
export interface backendInterface {
    addAdmin(p: Principal): Promise<boolean>;
    addNftToCollection(nftId: bigint, collectionId: bigint): Promise<Result_2>;
    approvePaymentProof(proofId: string): Promise<Result_3>;
    burnNft(id: bigint): Promise<Result_2>;
    claimNft(token: string): Promise<Result_8>;
    createCheckoutSession(_items: Array<{
        name: string;
        price: bigint;
    }>, _successUrl: string, _cancelUrl: string): Promise<string>;
    createCollection(name: string, description: string): Promise<Result_7>;
    createSlot(): Promise<Result_7>;
    deleteCollection(id: bigint): Promise<void>;
    deleteCollectionAndUnassignNfts(collectionId: CollectionId): Promise<CollectionSummary>;
    deleteNft(id: bigint): Promise<Result_2>;
    execute(qJson: string): Promise<Result__1>;
    generateClaimLink(nftId: bigint): Promise<Result_3>;
    getActiveNfts(): Promise<bigint>;
    getAvailableNfts(): Promise<bigint>;
    getBackendBuildTimestamp(): Promise<bigint>;
    getCallerProfile(): Promise<UserProfile>;
    getCanisterId(): Promise<string>;
    getCanisterIdSafe(): Promise<string>;
    getClaimPreview(token: string): Promise<Result_6>;
    getClaimStatus(nftId: bigint): Promise<Result_5>;
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
    getNft(id: bigint): Promise<Nft | null>;
    getSlotsStatus(): Promise<{
        total: bigint;
        used: bigint;
        remaining: bigint;
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
    getTotalNfts(): Promise<bigint>;
    hasRealAdmin(): Promise<boolean>;
    isAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    listAdmins(): Promise<Array<Principal>>;
    listMyActiveNfts(): Promise<Array<Nft>>;
    listMyCollections(): Promise<Array<CollectionWithCount>>;
    listMyNfts(): Promise<Array<Nft>>;
    listPaymentProofs(): Promise<Array<PaymentProof>>;
    mintNft(imageBlob: ExternalBlob, assetHash: string, title: string, description: string, collectionId: bigint | null, businessName: string | null, website: string | null, discountCode: string | null, membershipId: string | null, supplyLimit: bigint): Promise<Result_4>;
    rejectPaymentProof(proofId: string, reason: string): Promise<Result_3>;
    removeAdmin(p: Principal): Promise<boolean>;
    removeNftFromCollection(nftId: bigint, collectionId: bigint): Promise<Result_2>;
    renameCollection(request: RenameCollectionRequest): Promise<CollectionSummary>;
    saveCallerProfile(profile: UserProfile): Promise<void>;
    schema(): Promise<string>;
    searchNfts(searchTerm: string): Promise<Array<Nft>>;
    sendVerificationEmail(email: string): Promise<void>;
    setEmail(email: string): Promise<void>;
    setEmailAlerts(alerts: Array<AlertType>): Promise<void>;
    setOisyWalletAddress(address: string): Promise<void>;
    setStripeConfiguration(secretKey: string, publicKey: string): Promise<void>;
    setUserStripeProductId(userPrincipal: Principal, productId: string): Promise<Result_2>;
    setupAdmin(): Promise<boolean>;
    submitPaymentProof(txHash: string, tierRequested: string, networkType: string): Promise<Result_3>;
    transferNft(id: bigint, toPrincipal: Principal): Promise<TransferResult>;
    updateBusinessMetadata(id: bigint, updates: UpdateMetadataRequest): Promise<Result_2>;
    verifyNftByCreatorId(creatorId: string): Promise<Result_1>;
    verifyNftByCreatorIdWithHistory(creatorId: string): Promise<Result_1>;
    verifyNftPublic(nftUniqueId: string): Promise<Result>;
}
