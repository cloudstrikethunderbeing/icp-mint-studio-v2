import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Cover: NftDetailModal Unique ID resolution ───────────────────────────────
// Accepted behavior:
//   - the `nftUniqueId` PROP is the primary source and is rendered directly in
//     the Unique ID row;
//   - useNftDetailQuery is supplementary verification metadata only — its error
//     or empty result never blanks a non-empty displayed unique ID;
//   - 'Unavailable' appears ONLY when both the prop and the fetched record are
//     empty.
//
// The real component is exercised; its data hooks are typed local stubs.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const queriesMock = vi.hoisted(() => ({
  useNftDetailQuery: vi.fn(),
  useCollections: vi.fn(),
  useAddNftToCollection: vi.fn(),
  useRemoveNftFromCollection: vi.fn(),
  useUpdateMetadata: vi.fn(),
  useGetClaimStatus: vi.fn(),
  useGenerateClaimLink: vi.fn(),
  useAdminSetNftRewardType: vi.fn(),
  useAdminSetNftReferralThreshold: vi.fn(),
  useAdminSetNftPrice: vi.fn(),
  // Consumed by the PurchaseModal that NftDetailModal always renders.
  usePurchaseQuote: vi.fn(),
  useSubmitPurchase: vi.fn(),
  useVerifyPurchase: vi.fn(),
  usePaymentConfig: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
}));

vi.mock("@/backend", () => ({
  NftStatus: { deleted: "deleted", active: "active", burned: "burned" },
  RewardTier: {
    bronze: "bronze",
    gold: "gold",
    none: "none",
    platinum: "platinum",
    silver: "silver",
  },
  RewardType: { none: "none", referralBonus: "referralBonus" },
}));

vi.mock("@/hooks/useQueries", () => ({
  useNftDetailQuery: queriesMock.useNftDetailQuery,
  useCollections: queriesMock.useCollections,
  useAddNftToCollection: queriesMock.useAddNftToCollection,
  useRemoveNftFromCollection: queriesMock.useRemoveNftFromCollection,
  useUpdateMetadata: queriesMock.useUpdateMetadata,
  useGetClaimStatus: queriesMock.useGetClaimStatus,
  useGenerateClaimLink: queriesMock.useGenerateClaimLink,
  useAdminSetNftRewardType: queriesMock.useAdminSetNftRewardType,
  useAdminSetNftReferralThreshold: queriesMock.useAdminSetNftReferralThreshold,
  useAdminSetNftPrice: queriesMock.useAdminSetNftPrice,
  usePurchaseQuote: queriesMock.usePurchaseQuote,
  useSubmitPurchase: queriesMock.useSubmitPurchase,
  useVerifyPurchase: queriesMock.useVerifyPurchase,
  usePaymentConfig: queriesMock.usePaymentConfig,
}));

import { NftDetailModal } from "@/components/NftDetailModal";

function makeNft(overrides: Partial<Nft> = {}): Nft {
  return {
    id: 42n,
    status: NftStatus.active,
    supplyLimit: 1n,
    title: "Modal Art",
    imageBlob: { getDirectURL: () => "https://example.com/img.png" } as never,
    edition: "1/1",
    referralThreshold: 3n,
    ownerId: { toText: () => "aaaaa-aa" } as never,
    tags: [],
    creatorId: "creator-1",
    mintDate: 0n,
    description: "",
    auditHistory: [],
    rewardTier: RewardTier.none,
    rewardType: RewardType.none,
    assetHash: "0".repeat(64),
    nftUniqueId: "canister:0:42",
    ...overrides,
  };
}

function mockMutation() {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };
}

function setDefaultQueries() {
  queriesMock.useNftDetailQuery.mockReturnValue({
    data: null,
    isLoading: false,
    isPending: false,
    isFetching: false,
    isError: false,
  });
  queriesMock.useCollections.mockReturnValue({ data: [], isLoading: false });
  queriesMock.useAddNftToCollection.mockReturnValue(mockMutation());
  queriesMock.useRemoveNftFromCollection.mockReturnValue(mockMutation());
  queriesMock.useUpdateMetadata.mockReturnValue(mockMutation());
  queriesMock.useGetClaimStatus.mockReturnValue({ data: null });
  queriesMock.useGenerateClaimLink.mockReturnValue(mockMutation());
  queriesMock.useAdminSetNftRewardType.mockReturnValue(mockMutation());
  queriesMock.useAdminSetNftReferralThreshold.mockReturnValue(mockMutation());
  queriesMock.useAdminSetNftPrice.mockReturnValue(mockMutation());
  // PurchaseModal hooks: the modal is rendered closed in these tests.
  queriesMock.usePurchaseQuote.mockReturnValue(mockMutation());
  queriesMock.useSubmitPurchase.mockReturnValue(mockMutation());
  queriesMock.useVerifyPurchase.mockReturnValue(mockMutation());
  queriesMock.usePaymentConfig.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  });
}

function renderModal(
  props: Partial<React.ComponentProps<typeof NftDetailModal>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NftDetailModal
        nft={makeNft()}
        open
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onBurn={vi.fn(async () => {})}
        callerPrincipal="aaaaa-aa"
        canisterId="canister"
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe("NftDetailModal Unique ID resolution (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.useAuth.mockReturnValue({ isAdmin: false });
    setDefaultQueries();
  });

  it("renders the nftUniqueId PROP directly in the Unique ID row", () => {
    renderModal({ nftUniqueId: "canister:0:prop-id" });
    expect(screen.getByText("canister:0:prop-id")).toBeInTheDocument();
  });

  it("keeps the prop unique ID when verification metadata errors", () => {
    queriesMock.useNftDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isPending: false,
      isFetching: false,
      isError: true,
      error: new Error("verification unavailable"),
    });
    renderModal({ nftUniqueId: "canister:0:prop-id" });
    expect(screen.getByText("canister:0:prop-id")).toBeInTheDocument();
    expect(screen.queryByText("Unavailable")).toBeNull();
  });

  it("keeps the prop unique ID when verification metadata is empty", () => {
    queriesMock.useNftDetailQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isPending: false,
      isFetching: false,
      isError: false,
    });
    renderModal({ nftUniqueId: "canister:0:prop-id" });
    expect(screen.getByText("canister:0:prop-id")).toBeInTheDocument();
    expect(screen.queryByText("Unavailable")).toBeNull();
  });

  it("prefers the prop over a conflicting fetched record", () => {
    queriesMock.useNftDetailQuery.mockReturnValue({
      data: {
        nftUniqueId: "canister:0:fetched-id",
        creatorId: "creator-1",
        canisterId: "canister",
        owner: { toString: () => "aaaaa-aa" },
      },
      isLoading: false,
      isPending: false,
      isFetching: false,
      isError: false,
    });
    renderModal({ nftUniqueId: "canister:0:prop-id" });
    expect(screen.getByText("canister:0:prop-id")).toBeInTheDocument();
    expect(screen.queryByText("canister:0:fetched-id")).toBeNull();
  });

  it("falls back to the fetched record when the prop is absent", () => {
    queriesMock.useNftDetailQuery.mockReturnValue({
      data: {
        nftUniqueId: "canister:0:fetched-id",
        creatorId: "creator-1",
        canisterId: "canister",
        owner: { toString: () => "aaaaa-aa" },
      },
      isLoading: false,
      isPending: false,
      isFetching: false,
      isError: false,
    });
    renderModal({ nft: makeNft({ nftUniqueId: "" }) });
    expect(screen.getByText("canister:0:fetched-id")).toBeInTheDocument();
  });

  it("shows 'Unavailable' only when both the prop and the fetched record are empty", () => {
    renderModal({ nft: makeNft({ nftUniqueId: "" }) });
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("exposes the Copy Unique ID affordance for a prop-sourced id", () => {
    renderModal({ nftUniqueId: "canister:0:prop-id" });
    expect(
      document.querySelector('[data-ocid="nft_detail.copy_unique_id_button"]'),
    ).not.toBeNull();
  });
});
