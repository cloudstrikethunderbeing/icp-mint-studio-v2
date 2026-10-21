import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Characterization: card info box + detail-modal open journey ──────────────
// The current request intentionally changes the card presentation:
//   - the image-face pills/badges are removed;
//   - a compact USD price info box is added BELOW each card image;
//   - the Nft record gains a whole-value USD price field;
//   - the mint dialog gains a price input;
//   - a purchase flow is added to the detail modal.
//
// None of that new behavior is frozen here. This suite freezes the ADJACENT
// working behavior those changes must not disturb:
//   - the Studio (HomePage) card is still clickable and opens the detail modal
//     showing the NFT's title and Token ID;
//   - the Library (CollectorPage) card is still clickable and opens the detail
//     modal showing the NFT's title and Token ID;
//   - the mint dialog still opens after a valid image file is selected, and its
//     submit action stays disabled until a title is entered (the existing
//     required-title gate must survive the added price field).
//
// The real pages/components are exercised; only the auth actor seam, the
// react-query hooks, the notification sink, and the router are typed local
// mocks.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const queriesMock = vi.hoisted(() => ({
  useBackendHealth: vi.fn(),
  useMyActiveNfts: vi.fn(),
  useMyNfts: vi.fn(),
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
  useNftClaimCounts: vi.fn(),
  useDeleteNft: vi.fn(),
  useBurnNft: vi.fn(),
  useCreateCollection: vi.fn(),
  useDeleteCollection: vi.fn(),
  useTotalNftCount: vi.fn(),
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
  useMyActiveNfts: queriesMock.useMyActiveNfts,
  useMyNfts: queriesMock.useMyNfts,
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
  useNftClaimCounts: queriesMock.useNftClaimCounts,
  useDeleteNft: queriesMock.useDeleteNft,
  useBurnNft: queriesMock.useBurnNft,
  useCreateCollection: queriesMock.useCreateCollection,
  useDeleteCollection: queriesMock.useDeleteCollection,
  useTotalNftCount: queriesMock.useTotalNftCount,
  usePurchaseQuote: queriesMock.usePurchaseQuote,
  useSubmitPurchase: queriesMock.useSubmitPurchase,
  useVerifyPurchase: queriesMock.useVerifyPurchase,
  usePaymentConfig: queriesMock.usePaymentConfig,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
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

vi.stubGlobal("crypto", {
  subtle: {
    digest: vi.fn(async () => new Uint8Array(32).buffer),
  },
});

import CollectorPage from "@/pages/CollectorPage";
import HomePage from "@/pages/HomePage";

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

function mockMutation() {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };
}

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function setAuth(overrides: Record<string, unknown> = {}) {
  authMock.useAuth.mockReturnValue({
    isAuthenticated: true,
    principal: "aaaaa-aa",
    authState: "ready",
    isAdmin: false,
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
  queriesMock.useMyActiveNfts.mockReturnValue({ data: [], isLoading: false });
  queriesMock.useMyNfts.mockReturnValue({ data: [] });
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
    isError: false,
  });
  queriesMock.useCollections.mockReturnValue({ data: [], isLoading: false });
  queriesMock.useAddNftToCollection.mockReturnValue(mockMutation());
  queriesMock.useRemoveNftFromCollection.mockReturnValue(mockMutation());
  queriesMock.useUpdateMetadata.mockReturnValue(mockMutation());
  queriesMock.useGetClaimStatus.mockReturnValue({ data: null });
  queriesMock.useNftClaimCounts.mockReturnValue({ data: [] });
  queriesMock.useDeleteNft.mockReturnValue(mockMutation());
  queriesMock.useBurnNft.mockReturnValue(mockMutation());
  queriesMock.useCreateCollection.mockReturnValue(mockMutation());
  queriesMock.useDeleteCollection.mockReturnValue(mockMutation());
  queriesMock.useTotalNftCount.mockReturnValue({ data: 0n, isLoading: false });
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

describe("Studio card opens the detail modal (price info box must not disturb)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    setDefaultQueries();
  });

  it("opens the detail modal with the NFT title and Token ID when the card is clicked", async () => {
    const user = userEvent.setup();
    const nft = makeNft({ id: 42n, title: "Studio Card Art" });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    renderWithQueryClient(<HomePage />);

    await user.click(await screen.findByLabelText("View NFT: Studio Card Art"));

    // The real detail modal renders the title and the Token ID row.
    expect(await screen.findByText("Token ID")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getAllByText("Studio Card Art").length).toBeGreaterThan(0);
  });
});

describe("Library card opens the detail modal (image-face pill removal must not disturb)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    setDefaultQueries();
  });

  it("opens the detail modal with the NFT title and Token ID when the card is clicked", async () => {
    const user = userEvent.setup();
    const nft = makeNft({
      id: 77n,
      title: "Library Card Art",
      nftUniqueId: "canister:0:77",
    });
    queriesMock.useMyNfts.mockReturnValue({ data: [nft] });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    renderWithQueryClient(<CollectorPage />);

    // The card body (not a quick-action button) opens the detail modal.
    await user.click(await screen.findByText("Library Card Art"));

    expect(await screen.findByText("Token ID")).toBeInTheDocument();
    expect(screen.getByText("77")).toBeInTheDocument();
  });
});

describe("Mint dialog required-title gate (added price field must not disturb)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    setDefaultQueries();
  });

  it("opens the mint dialog after a valid image is selected and keeps submit disabled until a title is entered", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<HomePage />);

    // A real PNG signature so fileWithVerifiedImageType accepts the upload.
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
    ]);
    const file = new File([pngBytes], "art.png", { type: "image/png" });
    const input = document.querySelector(
      '[data-ocid="home.file_input"]',
    ) as HTMLInputElement;
    await user.upload(input, file);

    // The dialog opens with the title field.
    const titleInput = await screen.findByLabelText(/Title/);
    const submit = document.querySelector(
      '[data-ocid="home.mint_submit_button"]',
    ) as HTMLButtonElement;

    // No title yet -> the existing required-title gate keeps submit disabled.
    expect(submit.disabled).toBe(true);

    await user.type(titleInput, "Priced Art");
    await waitFor(() => expect(submit.disabled).toBe(false));
  });
});
