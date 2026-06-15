import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type Timestamp = bigint;
export type Result_2 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export interface AuditEntry {
    action: string;
    timestamp: Timestamp;
    details?: string;
    caller: Principal;
}
export type Result_5 = {
    __kind__: "ok";
    ok: bigint;
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
export interface VerifyResult {
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
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
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
    ownerId: Principal;
    name: string;
    createdAt: Timestamp;
    tier: SubscriptionTier;
    description: string;
    maxSize: bigint;
}
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
    admin = "admin",
    free = "free"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    approvePaymentProof(proofId: string): Promise<Result_3>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    burnNft(id: bigint): Promise<Result_2>;
    createCheckoutSession(_items: Array<{
        name: string;
        price: bigint;
    }>, _successUrl: string, _cancelUrl: string): Promise<string>;
    createCollection(name: string, description: string): Promise<Result_5>;
    deleteCollection(id: bigint): Promise<void>;
    deleteNft(id: bigint): Promise<Result_2>;
    getAdminPrincipal(): Promise<Principal | null>;
    getCallerProfile(): Promise<UserProfile>;
    getCallerUserRole(): Promise<UserRole>;
    getCanisterId(): Promise<string>;
    getCollection(id: bigint): Promise<Collection | null>;
    getCollectionId(): Promise<bigint | null>;
    getCreditsStatus(): Promise<{
        total: bigint;
        used: bigint;
        remaining: bigint;
    }>;
    getMyPaymentProofs(): Promise<Array<PaymentProof>>;
    getNft(id: bigint): Promise<Nft | null>;
    getSlotsStatus(): Promise<{
        total: bigint;
        used: bigint;
        remaining: bigint;
    }>;
    getStripeSessionStatus(_sessionId: string): Promise<{
        status: string;
    }>;
    getStripeStatus(): Promise<{
        mode: string;
        configured: boolean;
    }>;
    getTotalMinted(): Promise<bigint>;
    isAdmin(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    listMyActiveNfts(): Promise<Array<Nft>>;
    listMyCollections(): Promise<Array<CollectionWithCount>>;
    listMyNfts(): Promise<Array<Nft>>;
    listPaymentProofs(): Promise<Array<PaymentProof>>;
    mintNft(imageBlob: ExternalBlob, assetHash: string, title: string, description: string, edition: string, collectionId: bigint | null, businessName: string | null, website: string | null, discountCode: string | null, membershipId: string | null): Promise<Result_4>;
    rejectPaymentProof(proofId: string, reason: string): Promise<Result_3>;
    saveCallerProfile(profile: UserProfile): Promise<void>;
    sendVerificationEmail(email: string): Promise<void>;
    setEmail(email: string): Promise<void>;
    setEmailAlerts(alerts: Array<AlertType>): Promise<void>;
    setOisyWalletAddress(address: string): Promise<void>;
    setStripeConfiguration(secretKey: string, publicKey: string): Promise<void>;
    setUserStripeProductId(userPrincipal: Principal, productId: string): Promise<Result_2>;
    submitPaymentProof(txHash: string, tierRequested: string, networkType: string): Promise<Result_3>;
    transferNft(id: bigint, toPrincipal: Principal): Promise<TransferResult>;
    updateBusinessMetadata(id: bigint, updates: UpdateMetadataRequest): Promise<Result_2>;
    verifyNftByCreatorId(creatorId: string): Promise<Result_1>;
    verifyNftPublic(nftUniqueId: string): Promise<Result>;
}
