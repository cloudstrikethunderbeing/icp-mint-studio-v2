import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Cover: one canonical purchase flow across public surfaces ────────────────
// Accepted behavior this suite covers:
//   1. The public gallery (the landing page at "/") opens the SAME canonical
//      purchase flow as the authenticated surfaces: a non-owner tapping BUY on
//      a listed NFT reaches the single PurchaseModal, which loads a quote and
//      submits a purchase. There is no separate public purchase path.
//   2. The client never supplies a price. submitPurchase is called with ONLY
//      { nftId, txRef }; the stored backend price is authoritative, so a
//      client-side price can never influence settlement.
//
// The real GalleryPage, NftDetailModal and PurchaseModal are exercised together;
// only their data hooks and the auth seam are typed local stubs. The backend is
// mocked, so this suite asserts the UI/consumer contract, not real settlement.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const queriesMock = vi.hoisted(() => ({
  usePublicNfts: vi.fn(),
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
  usePublicNfts: queriesMock.usePublicNfts,
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

vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => ({ location: { pathname: "/" } }),
  Link: ({
    to,
    children,
    ...props
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

import GalleryPage from "@/pages/GalleryPage";

function makeNft(overrides: Partial<Nft> = {}): Nft {
  return {
    id: 7n,
    status: NftStatus.active,
    supplyLimit: 1n,
    title: "Public Art",
    imageBlob: {
      directURL: "https://example.com/public.png",
    } as never,
    edition: "1/1",
    referralThreshold: 3n,
    ownerId: { toText: () => "seller-principal" } as never,
    tags: [],
    creatorId: "creator-1",
    mintDate: 0n,
    description: "",
    auditHistory: [],
    rewardTier: RewardTier.none,
    rewardType: RewardType.none,
    assetHash: "0".repeat(64),
    nftUniqueId: "canister:0:7",
    priceUsd: 250n,
    ...overrides,
  };
}

function mockMutation(overrides: Record<string, unknown> = {}) {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
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
  queriesMock.usePurchaseQuote.mockReturnValue(
    mockMutation({
      mutateAsync: vi.fn(async () => ({
        nftId: 7n,
        priceUsd: 250n,
        paymentAddress: "admin-payment-principal",
        expectedE8s: 5_000_010_000n,
        rateUsed: 500_000_000n,
        rateIsOverride: false,
      })),
    }),
  );
  queriesMock.useSubmitPurchase.mockReturnValue(mockMutation());
  queriesMock.useVerifyPurchase.mockReturnValue(mockMutation());
  queriesMock.usePaymentConfig.mockReturnValue({
    data: { paymentAddress: "admin-payment-principal" },
    isLoading: false,
    isError: false,
  });
}

function renderGallery() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <GalleryPage />
    </QueryClientProvider>,
  );
}

describe("Canonical purchase flow from the public gallery (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The public gallery is reachable without signing in; the auth seam is
    // anonymous and non-admin.
    authMock.useAuth.mockReturnValue({
      isAdmin: false,
      isAuthenticated: false,
    });
    setDefaultQueries();
    queriesMock.usePublicNfts.mockReturnValue({
      data: { items: [makeNft()], total: 1n },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("opens the canonical PurchaseModal from a public gallery BUY action", async () => {
    const user = userEvent.setup();
    renderGallery();

    // The public card is listed, so a non-owner sees the BUY action.
    const openButton = await screen.findByText("Public Art");
    expect(openButton).toBeInTheDocument();

    await user.click(
      document.querySelector(
        '[data-ocid="gallery.open_button.1"]',
      ) as HTMLButtonElement,
    );

    // The detail modal surfaces the BUY action for a non-owner of a listed NFT.
    const buy = await screen.findByRole("button", { name: /Buy for \$250/ });
    await user.click(buy);

    // The SAME canonical purchase modal opens and loads a quote.
    expect(await screen.findByText("Buy Public Art")).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="purchase.modal"]'),
    ).not.toBeNull();
    expect(
      await screen.findByText("admin-payment-principal"),
    ).toBeInTheDocument();
  });

  it("submits only the NFT id and transaction reference, never a client price", async () => {
    const user = userEvent.setup();
    const submitPurchase = vi.fn(
      async (_args: { nftId: bigint; txRef: string }) => ({
        id: "7:buyer",
        nftId: 7n,
        buyer: { toText: () => "buyer" } as never,
        seller: { toText: () => "seller-principal" } as never,
        priceUsd: 250n,
        expectedE8s: 5_000_010_000n,
        rateUsed: 500_000_000n,
        txRef: "42",
        status: "pending",
        submittedAt: 0n,
        verifiedAt: undefined,
        failureReason: undefined,
      }),
    );
    queriesMock.useSubmitPurchase.mockReturnValue(
      mockMutation({ mutateAsync: submitPurchase }),
    );

    renderGallery();

    await user.click(
      document.querySelector(
        '[data-ocid="gallery.open_button.1"]',
      ) as HTMLButtonElement,
    );
    await user.click(
      await screen.findByRole("button", { name: /Buy for \$250/ }),
    );

    const input = await screen.findByLabelText(/Transaction reference/);
    await user.type(input, "42");
    await user.click(
      document.querySelector(
        '[data-ocid="purchase.buy_button"]',
      ) as HTMLButtonElement,
    );

    await waitFor(() => expect(submitPurchase).toHaveBeenCalledTimes(1));
    // The stored backend price is authoritative: the client sends no price at
    // all, so a client-supplied price can never influence settlement.
    expect(submitPurchase).toHaveBeenCalledWith({ nftId: 7n, txRef: "42" });
    const payload = submitPurchase.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(payload).not.toHaveProperty("priceUsd");
    expect(payload).not.toHaveProperty("expectedE8s");
  });
});
