import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Cover: the admin Studio grid is uncapped and paginates ───────────────────
// The current request changes the ADMIN Studio grid so it no longer expands
// without bound: it pages through every active NFT via the shared Studio
// pagination state, and the upload/mint slot appears on the first page only.
// This suite asserts the accepted behavior:
//   1. an admin with more than one page of NFTs sees the pagination controls
//      and a "Page 1 of N" status;
//   2. Next advances the window and requests the next (offset, limit);
//   3. the upload slot renders on the first page only;
//   4. a single-page admin feed shows no pagination controls.
//
// The real HomePage is rendered; only the auth context, the query hooks, the
// notification store, and the router are local typed mocks.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const queriesMock = vi.hoisted(() => ({
  useBackendHealth: vi.fn(),
  useSearchNfts: vi.fn(),
  useCreateSlot: vi.fn(),
  useGenerateClaimLink: vi.fn(),
  useAdminSetNftRewardType: vi.fn(),
  useAdminSetNftReferralThreshold: vi.fn(),
  useAdminSetNftPrice: vi.fn(),
  useNftDetailQuery: vi.fn(),
  useCollections: vi.fn(),
  useAddNftToCollection: vi.fn(),
  useRemoveNftFromCollection: vi.fn(),
  useUpdateMetadata: vi.fn(),
  useGetClaimStatus: vi.fn(),
  // Consumed by the PurchaseModal that NftDetailModal always renders.
  usePurchaseQuote: vi.fn(),
  useSubmitPurchase: vi.fn(),
  useVerifyPurchase: vi.fn(),
  usePaymentConfig: vi.fn(),
}));

const notificationsMock = vi.hoisted(() => ({
  addNotification: vi.fn(),
}));

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
}));

// HomePage imports only TYPES from @/backend plus the string enums. The real
// module pulls in @caffeineai/object-storage at runtime, which has no usable
// jsdom entry; mock the module and preserve the enum values.
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
  ExternalBlob: {
    fromBytes: (bytes: Uint8Array) => ({
      bytes,
      directURL: "blob:http://localhost/ephemeral-upload",
      withUploadProgress: () => ({
        bytes,
        directURL: "blob:http://localhost/ephemeral-upload",
      }),
    }),
  },
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    addNotification: notificationsMock.addNotification,
    markAllRead: vi.fn(),
    clearAll: vi.fn(),
  }),
}));

vi.mock("@/hooks/useQueries", () => ({
  useBackendHealth: queriesMock.useBackendHealth,
  useMyActiveNfts: vi.fn(),
  useSearchNfts: queriesMock.useSearchNfts,
  useCreateSlot: queriesMock.useCreateSlot,
  useGenerateClaimLink: queriesMock.useGenerateClaimLink,
  useAdminSetNftRewardType: queriesMock.useAdminSetNftRewardType,
  useAdminSetNftReferralThreshold: queriesMock.useAdminSetNftReferralThreshold,
  useAdminSetNftPrice: queriesMock.useAdminSetNftPrice,
  useNftDetailQuery: queriesMock.useNftDetailQuery,
  useCollections: queriesMock.useCollections,
  useAddNftToCollection: queriesMock.useAddNftToCollection,
  useRemoveNftFromCollection: queriesMock.useRemoveNftFromCollection,
  useUpdateMetadata: queriesMock.useUpdateMetadata,
  useGetClaimStatus: queriesMock.useGetClaimStatus,
  usePurchaseQuote: queriesMock.usePurchaseQuote,
  useSubmitPurchase: queriesMock.useSubmitPurchase,
  useVerifyPurchase: queriesMock.useVerifyPurchase,
  usePaymentConfig: queriesMock.usePaymentConfig,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
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

import { useMyActiveNfts } from "@/hooks/useQueries";
import HomePage from "@/pages/HomePage";

const useMyActiveNftsMock = vi.mocked(useMyActiveNfts);

function makeNft(overrides: Partial<Nft> = {}): Nft {
  return {
    id: 1n,
    status: NftStatus.active,
    supplyLimit: 1n,
    title: "Test NFT",
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
    nftUniqueId: "canister:0:1",
    ...overrides,
  };
}

function makeNfts(count: number, startId = 1): Nft[] {
  return Array.from({ length: count }, (_, i) =>
    makeNft({
      id: BigInt(startId + i),
      title: `NFT ${startId + i}`,
      nftUniqueId: `canister:0:${startId + i}`,
    }),
  );
}

function mockActiveNftsResult(data: Nft[]) {
  return { data, isLoading: false } as unknown as ReturnType<
    typeof useMyActiveNfts
  >;
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

function setAuth(overrides: Record<string, unknown> = {}) {
  authMock.useAuth.mockReturnValue({
    isAuthenticated: true,
    principal: "aaaaa-aa",
    authState: "ready",
    isAdmin: true,
    isAdminLoading: false,
    actor: {},
    ...overrides,
  });
}

function setDefaultQueries() {
  queriesMock.useBackendHealth.mockReturnValue({
    status: "ok",
    canisterId: "x",
  });
  queriesMock.useSearchNfts.mockReturnValue({ data: [], isLoading: false });
  queriesMock.useCreateSlot.mockReturnValue(mockMutation());
  queriesMock.useGenerateClaimLink.mockReturnValue(mockMutation());
  queriesMock.useAdminSetNftRewardType.mockReturnValue(mockMutation());
  queriesMock.useAdminSetNftReferralThreshold.mockReturnValue(mockMutation());
  queriesMock.useAdminSetNftPrice.mockReturnValue(mockMutation());
  queriesMock.useNftDetailQuery.mockReturnValue({
    data: null,
    isLoading: false,
    isPending: false,
    isFetching: false,
  });
  queriesMock.useCollections.mockReturnValue({ data: [], isLoading: false });
  queriesMock.useAddNftToCollection.mockReturnValue(mockMutation());
  queriesMock.useRemoveNftFromCollection.mockReturnValue(mockMutation());
  queriesMock.useUpdateMetadata.mockReturnValue(mockMutation());
  queriesMock.useGetClaimStatus.mockReturnValue({ data: null });
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

function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>,
  );
}

// A typed local actor stub. The Studio grid reads the page envelope's `total`
// through a direct useQuery that calls actor.listMyActiveNfts(offset, limit),
// so the stub returns a page envelope whose items are the requested window.
function makeActor(total: number, allNfts: Nft[]) {
  return {
    listMyActiveNfts: vi.fn(async (offset: bigint, limit: bigint) => {
      const start = Number(offset);
      const end = start + Number(limit);
      return {
        items: allNfts.slice(start, end),
        total: BigInt(total),
        offset,
        limit,
      };
    }),
    getCanisterId: vi.fn(async () => "backend-canister"),
  };
}

describe("Studio grid pagination (admin)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth({ isAdmin: true });
    setDefaultQueries();
  });

  it("shows pagination controls and the page count for more than one page", async () => {
    const all = makeNfts(20);
    const actor = makeActor(20, all);
    setAuth({ isAdmin: true, actor });
    useMyActiveNftsMock.mockReturnValue(mockActiveNftsResult(all.slice(0, 8)));

    renderHomePage();

    const pagination = await waitFor(() => {
      const el = document.querySelector('[data-ocid="home.pagination"]');
      if (!el) throw new Error("pagination not rendered yet");
      return el;
    });
    expect(pagination).not.toBeNull();
    // 20 NFTs / 8 per page => 3 pages.
    expect(
      document.querySelector('[data-ocid="home.pagination_status"]')
        ?.textContent,
    ).toContain("Page 1 of 3");
    expect(
      (
        document.querySelector(
          '[data-ocid="home.pagination_prev"]',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("advances to the next page and requests the next (offset, limit) window", async () => {
    const user = userEvent.setup();
    const all = makeNfts(20);
    const actor = makeActor(20, all);
    setAuth({ isAdmin: true, actor });
    useMyActiveNftsMock.mockReturnValue(mockActiveNftsResult(all.slice(0, 8)));

    renderHomePage();

    const next = (await waitFor(() => {
      const el = document.querySelector(
        '[data-ocid="home.pagination_next"]',
      ) as HTMLButtonElement | null;
      if (!el) throw new Error("next button not rendered yet");
      return el;
    })) as HTMLButtonElement;

    await user.click(next);

    await waitFor(() =>
      expect(
        document.querySelector('[data-ocid="home.pagination_status"]')
          ?.textContent,
      ).toContain("Page 2 of 3"),
    );
    // The second page requests offset 8 with the page size of 8.
    expect(actor.listMyActiveNfts).toHaveBeenCalledWith(8n, 8n);
  });

  it("renders the upload slot on the first page only", async () => {
    const user = userEvent.setup();
    const all = makeNfts(20);
    const actor = makeActor(20, all);
    setAuth({ isAdmin: true, actor });
    useMyActiveNftsMock.mockReturnValue(mockActiveNftsResult(all.slice(0, 8)));

    renderHomePage();

    expect(
      await screen.findByLabelText("Upload and mint NFT"),
    ).toBeInTheDocument();

    const next = (await waitFor(() => {
      const el = document.querySelector(
        '[data-ocid="home.pagination_next"]',
      ) as HTMLButtonElement | null;
      if (!el) throw new Error("next button not rendered yet");
      return el;
    })) as HTMLButtonElement;
    await user.click(next);

    await waitFor(() =>
      expect(
        document.querySelector('[data-ocid="home.pagination_status"]')
          ?.textContent,
      ).toContain("Page 2 of 3"),
    );
    // The mint affordance is not repeated on later pages.
    expect(screen.queryByLabelText("Upload and mint NFT")).toBeNull();
  });

  it("renders more than 8 NFT cards on the first page", async () => {
    // The admin grid is no longer capped at 8 slots: the first page renders
    // the full page window (8 NFTs) plus the upload slot.
    const all = makeNfts(20);
    const actor = makeActor(20, all);
    setAuth({ isAdmin: true, actor });
    useMyActiveNftsMock.mockReturnValue(mockActiveNftsResult(all.slice(0, 8)));

    renderHomePage();

    expect(await screen.findByAltText("NFT 1")).toBeInTheDocument();
    expect(screen.getByAltText("NFT 8")).toBeInTheDocument();
    expect(
      document.querySelectorAll('[data-ocid^="home.nft_card.item."]').length,
    ).toBe(8);
    expect(
      document.querySelector('[data-ocid="home.upload_card"]'),
    ).not.toBeNull();
  });

  it("hides pagination controls when the admin feed fits on a single page", async () => {
    const all = makeNfts(5);
    const actor = makeActor(5, all);
    setAuth({ isAdmin: true, actor });
    useMyActiveNftsMock.mockReturnValue(mockActiveNftsResult(all));

    renderHomePage();

    expect(await screen.findByAltText("NFT 1")).toBeInTheDocument();
    expect(document.querySelector('[data-ocid="home.pagination"]')).toBeNull();
  });
});
