import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Characterization: NFT image rendering in the Studio and Library grids ────
// The Studio (HomePage) and Library (CollectorPage) both render an NFT's image
// from `nft.imageBlob.getDirectURL()`. This suite protects the *rendering*
// contract for a feed record whose imageBlob resolves to a usable URL — the
// behavior that must keep working while the list-sourced image-resolution path
// is repaired. It deliberately does NOT assert the currently-broken behavior
// (a list-sourced record whose imageBlob has no usable direct URL), and it does
// not touch the Catalog Recovery surface that has been removed.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

// Hooks shared by both pages live in one object so the module mock has a single
// source of truth for them; page-specific hooks are grouped separately.
const sharedQueriesMock = vi.hoisted(() => ({
  useBackendHealth: vi.fn(),
  useMyActiveNfts: vi.fn(),
  useCollections: vi.fn(),
  useAddNftToCollection: vi.fn(),
  useRemoveNftFromCollection: vi.fn(),
}));

const homeQueriesMock = vi.hoisted(() => ({
  useSearchNfts: vi.fn(),
  useCreateSlot: vi.fn(),
  useGenerateClaimLink: vi.fn(),
  useAdminSetNftRewardType: vi.fn(),
  useAdminSetNftReferralThreshold: vi.fn(),
  useAdminSetNftPrice: vi.fn(),
  useNftDetailQuery: vi.fn(),
  useUpdateMetadata: vi.fn(),
  useGetClaimStatus: vi.fn(),
  // Consumed by the PurchaseModal that NftDetailModal always renders.
  usePurchaseQuote: vi.fn(),
  useSubmitPurchase: vi.fn(),
  useVerifyPurchase: vi.fn(),
  usePaymentConfig: vi.fn(),
}));

const collectorQueriesMock = vi.hoisted(() => ({
  useMyNfts: vi.fn(),
  useNftClaimCounts: vi.fn(),
  useDeleteNft: vi.fn(),
  useBurnNft: vi.fn(),
  useCreateCollection: vi.fn(),
  useDeleteCollection: vi.fn(),
  useTotalNftCount: vi.fn(),
}));

const notificationsMock = vi.hoisted(() => ({
  addNotification: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
}));

// Both pages import only TYPES from @/backend plus the string enums. The real
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
      withUploadProgress: () => ({ bytes }),
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

// HomePage and CollectorPage both consume @/hooks/useQueries. The mock returns
// whichever hook set the test under exercise configured; each test sets only
// the hooks its page reads.
vi.mock("@/hooks/useQueries", () => ({
  ...sharedQueriesMock,
  ...homeQueriesMock,
  ...collectorQueriesMock,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
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

import { NftDetailModal } from "@/components/NftDetailModal";
import CollectorPage from "@/pages/CollectorPage";
import HomePage from "@/pages/HomePage";

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

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

function setHomeDefaults() {
  sharedQueriesMock.useBackendHealth.mockReturnValue({
    status: "ok",
    canisterId: "x",
  });
  sharedQueriesMock.useMyActiveNfts.mockReturnValue({
    data: [],
    isLoading: false,
  });
  sharedQueriesMock.useCollections.mockReturnValue({
    data: [],
    isLoading: false,
  });
  sharedQueriesMock.useAddNftToCollection.mockReturnValue(mockMutation());
  sharedQueriesMock.useRemoveNftFromCollection.mockReturnValue(mockMutation());
  homeQueriesMock.useSearchNfts.mockReturnValue({ data: [], isLoading: false });
  homeQueriesMock.useCreateSlot.mockReturnValue(mockMutation());
  homeQueriesMock.useGenerateClaimLink.mockReturnValue(mockMutation());
  homeQueriesMock.useAdminSetNftRewardType.mockReturnValue(mockMutation());
  homeQueriesMock.useAdminSetNftReferralThreshold.mockReturnValue(
    mockMutation(),
  );
  homeQueriesMock.useAdminSetNftPrice.mockReturnValue(mockMutation());
  homeQueriesMock.useNftDetailQuery.mockReturnValue({
    data: null,
    isLoading: false,
    isPending: false,
    isFetching: false,
  });
  homeQueriesMock.useUpdateMetadata.mockReturnValue(mockMutation());
  homeQueriesMock.useGetClaimStatus.mockReturnValue({ data: null });
  // PurchaseModal hooks: the modal is rendered closed in these tests.
  homeQueriesMock.usePurchaseQuote.mockReturnValue(mockMutation());
  homeQueriesMock.useSubmitPurchase.mockReturnValue(mockMutation());
  homeQueriesMock.useVerifyPurchase.mockReturnValue(mockMutation());
  homeQueriesMock.usePaymentConfig.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  });
}

function setCollectorDefaults() {
  sharedQueriesMock.useBackendHealth.mockReturnValue({
    status: "ok",
    canisterId: "x",
  });
  sharedQueriesMock.useMyActiveNfts.mockReturnValue({
    data: [],
    isLoading: false,
  });
  sharedQueriesMock.useCollections.mockReturnValue({
    data: [],
    isLoading: false,
  });
  sharedQueriesMock.useAddNftToCollection.mockReturnValue(mockMutation());
  sharedQueriesMock.useRemoveNftFromCollection.mockReturnValue(mockMutation());
  collectorQueriesMock.useMyNfts.mockReturnValue({ data: [] });
  collectorQueriesMock.useNftClaimCounts.mockReturnValue({ data: [] });
  collectorQueriesMock.useDeleteNft.mockReturnValue(mockMutation());
  collectorQueriesMock.useBurnNft.mockReturnValue(mockMutation());
  collectorQueriesMock.useCreateCollection.mockReturnValue(mockMutation());
  collectorQueriesMock.useDeleteCollection.mockReturnValue(mockMutation());
  collectorQueriesMock.useTotalNftCount.mockReturnValue({
    data: 0n,
    isLoading: false,
  });
}

describe("Studio grid image rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    setHomeDefaults();
  });

  it("renders the minted NFT's image from its imageBlob direct URL", () => {
    const nft = makeNft({
      id: 3n,
      title: "Studio Art",
      imageBlob: {
        getDirectURL: () => "https://example.com/studio.png",
      } as never,
    });
    sharedQueriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    renderWithQueryClient(<HomePage />);

    const img = screen.getByAltText("Studio Art") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/studio.png");
    expect(
      document.querySelector('[data-ocid="home.nft_card.item.1"]'),
    ).not.toBeNull();
  });

  it("renders the same image for an admin as for a non-admin owner", () => {
    const nft = makeNft({
      id: 5n,
      title: "Shared Art",
      imageBlob: {
        getDirectURL: () => "https://example.com/shared.png",
      } as never,
    });
    sharedQueriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    setAuth({ isAdmin: false });
    const nonAdmin = renderWithQueryClient(<HomePage />);
    const nonAdminImg = screen.getByAltText("Shared Art") as HTMLImageElement;
    expect(nonAdminImg.src).toBe("https://example.com/shared.png");
    nonAdmin.unmount();

    setAuth({ isAdmin: true });
    renderWithQueryClient(<HomePage />);
    const adminImg = screen.getByAltText("Shared Art") as HTMLImageElement;
    expect(adminImg.src).toBe("https://example.com/shared.png");
  });

  it("renders the image from the synchronous directURL field of a list-sourced record", () => {
    // The bindgen decodes a list-sourced record's imageBlob into an ExternalBlob
    // whose resolved gateway URL lives on the synchronous `directURL` field.
    // getDirectURL() is async and would yield a Promise here, so the card must
    // read directURL directly. This is the regression the fix addresses.
    const nft = makeNft({
      id: 30n,
      title: "Direct URL Art",
      imageBlob: {
        directURL: "https://example.com/direct-field.png",
        getDirectURL: () => Promise.resolve("https://example.com/async.png"),
      } as never,
    });
    sharedQueriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    renderWithQueryClient(<HomePage />);

    const img = screen.getByAltText("Direct URL Art") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/direct-field.png");
    expect(screen.queryByText("No image")).toBeNull();
  });

  it("shows the no-image placeholder when the direct URL is empty", () => {
    const nft = makeNft({
      id: 6n,
      title: "Blank Art",
      imageBlob: { getDirectURL: () => "" } as never,
    });
    sharedQueriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    renderWithQueryClient(<HomePage />);

    // The card still renders, but an empty resolved URL renders the "No image"
    // placeholder immediately rather than mounting an <img src=""> that only
    // falls back after a load error.
    expect(
      document.querySelector('[data-ocid="home.nft_card.item.1"]'),
    ).not.toBeNull();
    expect(screen.queryByAltText("Blank Art")).toBeNull();
    expect(screen.getByText("No image")).toBeInTheDocument();
  });

  it("never renders a bare 64-hex asset hash as an image source", () => {
    // The backend's NftSummary carries `thumbnail = assetHash`, a bare 64-hex
    // digest. A card that rendered it directly would mount
    // <img src="<64hex>">, which never loads. The shared resolver must reject
    // it so the card shows "No image" instead.
    const bareHash = "a".repeat(64);
    const nft = makeNft({
      id: 7n,
      title: "Hash Art",
      imageBlob: { directURL: bareHash } as never,
    });
    sharedQueriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    renderWithQueryClient(<HomePage />);

    expect(
      document.querySelector('[data-ocid="home.nft_card.item.1"]'),
    ).not.toBeNull();
    expect(screen.queryByAltText("Hash Art")).toBeNull();
    expect(screen.getByText("No image")).toBeInTheDocument();
    // No <img> anywhere on the card points at the bare hash.
    const imgs = Array.from(document.querySelectorAll("img"));
    expect(imgs.some((img) => img.getAttribute("src") === bareHash)).toBe(
      false,
    );
  });
});

describe("Library grid image rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    setCollectorDefaults();
  });

  it("renders the owned NFT's image from its imageBlob direct URL", () => {
    const nft = makeNft({
      id: 4n,
      title: "Library Art",
      imageBlob: {
        getDirectURL: () => "https://example.com/library.png",
      } as never,
    });
    sharedQueriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });
    collectorQueriesMock.useMyNfts.mockReturnValue({ data: [nft] });

    renderWithQueryClient(<CollectorPage />);

    const img = screen.getByAltText("Library Art") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/library.png");
    expect(
      document.querySelector('[data-ocid="collector.nft.item.1"]'),
    ).not.toBeNull();
  });

  it("renders the same image for an admin as for a non-admin owner", () => {
    const nft = makeNft({
      id: 8n,
      title: "Shared Library Art",
      imageBlob: {
        getDirectURL: () => "https://example.com/shared-library.png",
      } as never,
    });
    sharedQueriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });
    collectorQueriesMock.useMyNfts.mockReturnValue({ data: [nft] });

    setAuth({ isAdmin: false });
    const nonAdmin = renderWithQueryClient(<CollectorPage />);
    const nonAdminImg = screen.getByAltText(
      "Shared Library Art",
    ) as HTMLImageElement;
    expect(nonAdminImg.src).toBe("https://example.com/shared-library.png");
    nonAdmin.unmount();

    setAuth({ isAdmin: true });
    renderWithQueryClient(<CollectorPage />);
    const adminImg = screen.getByAltText(
      "Shared Library Art",
    ) as HTMLImageElement;
    expect(adminImg.src).toBe("https://example.com/shared-library.png");
  });

  it("renders the image from the synchronous directURL field of a list-sourced record", () => {
    // Mirrors the Studio grid: a Library record whose imageBlob carries the
    // resolved synchronous `directURL` (not an async getDirectURL Promise) must
    // render that image rather than falling back to "No image".
    const nft = makeNft({
      id: 31n,
      title: "Direct Library Art",
      imageBlob: {
        directURL: "https://example.com/direct-library.png",
        getDirectURL: () => Promise.resolve("https://example.com/async.png"),
      } as never,
    });
    sharedQueriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });
    collectorQueriesMock.useMyNfts.mockReturnValue({ data: [nft] });

    renderWithQueryClient(<CollectorPage />);

    const img = screen.getByAltText("Direct Library Art") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/direct-library.png");
    expect(screen.queryByText("No image")).toBeNull();
  });

  it("shows the no-image fallback when the direct URL is empty", () => {
    const nft = makeNft({
      id: 9n,
      title: "Blank Library Art",
      imageBlob: { getDirectURL: () => "" } as never,
    });
    sharedQueriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });
    collectorQueriesMock.useMyNfts.mockReturnValue({ data: [nft] });

    renderWithQueryClient(<CollectorPage />);

    expect(
      document.querySelector('[data-ocid="collector.nft.item.1"]'),
    ).not.toBeNull();
    expect(screen.queryByAltText("Blank Library Art")).toBeNull();
    expect(screen.getByText("No image")).toBeInTheDocument();
  });

  it("renders both minted and claimed owned NFTs in the default All tab", () => {
    // The Library's default 'All' tab sources from the full feed (useMyNfts),
    // which includes claimed NFTs (claimedAt != null) that the active feed
    // excludes. Both a self-minted NFT and a claimed NFT must render as cards
    // rather than falling through to an account-empty state.
    const minted = makeNft({
      id: 20n,
      title: "Minted Art",
      nftUniqueId: "canister:0:20",
    });
    const claimed = makeNft({
      id: 21n,
      title: "Claimed Art",
      claimedAt: 1n,
      nftUniqueId: "canister:0:21",
    });
    collectorQueriesMock.useMyNfts.mockReturnValue({
      data: [minted, claimed],
    });
    sharedQueriesMock.useMyActiveNfts.mockReturnValue({
      data: [minted],
      isLoading: false,
    });

    renderWithQueryClient(<CollectorPage />);

    expect(screen.getByText("Minted Art")).toBeInTheDocument();
    expect(screen.getByText("Claimed Art")).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="collector.account_empty_state"]'),
    ).toBeNull();
  });

  it("swaps to the no-image placeholder when the image fails to load", () => {
    // The Library card mirrors the Studio grid: a non-empty direct URL that
    // fails to load (revoked/expired gateway URL) must fall back to the
    // "No image" placeholder rather than leaving a broken image.
    const nft = makeNft({
      id: 12n,
      title: "Broken Library Art",
      imageBlob: {
        getDirectURL: () => "https://example.com/expired.png",
      } as never,
    });
    sharedQueriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });
    collectorQueriesMock.useMyNfts.mockReturnValue({ data: [nft] });

    renderWithQueryClient(<CollectorPage />);

    const img = screen.getByAltText("Broken Library Art") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/expired.png");

    // Simulate the browser failing to fetch the image.
    fireEvent.error(img);

    expect(screen.queryByAltText("Broken Library Art")).toBeNull();
    expect(screen.getByText("No image")).toBeInTheDocument();
  });
});

describe("Library tabs and collections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    setCollectorDefaults();
  });

  it("offers the full tab set for an authenticated user", () => {
    renderWithQueryClient(<CollectorPage />);

    for (const key of ["all", "collections", "claimed", "created", "recent"]) {
      expect(
        document.querySelector(`[data-ocid="collector.tab.${key}"]`),
      ).not.toBeNull();
    }
  });

  it("switches to the Collections tab and lists collections", async () => {
    const user = userEvent.setup();
    sharedQueriesMock.useCollections.mockReturnValue({
      data: [
        {
          id: 1n,
          name: "Rare Finds",
          description: "",
          nftCount: 2n,
          maxSize: 10n,
          previewImage: undefined,
        },
      ],
      isLoading: false,
    });

    renderWithQueryClient(<CollectorPage />);

    const collectionsTab = document.querySelector(
      '[data-ocid="collector.tab.collections"]',
    ) as HTMLButtonElement;
    await user.click(collectionsTab);

    expect(
      document.querySelector('[data-ocid="collector.collections.list"]'),
    ).not.toBeNull();
    expect(screen.getByText("Rare Finds")).toBeInTheDocument();
  });

  it("shows the Claimed tab count from the full feed's claimed subset", () => {
    const claimed = makeNft({
      id: 10n,
      title: "Claimed Art",
      claimedAt: 1n,
      nftUniqueId: "canister:0:10",
    });
    const active = makeNft({
      id: 11n,
      title: "Active Art",
      nftUniqueId: "canister:0:11",
    });
    collectorQueriesMock.useMyNfts.mockReturnValue({
      data: [claimed, active],
    });
    sharedQueriesMock.useMyActiveNfts.mockReturnValue({
      data: [active],
      isLoading: false,
    });

    renderWithQueryClient(<CollectorPage />);

    const claimedTab = document.querySelector(
      '[data-ocid="collector.tab.claimed"]',
    ) as HTMLButtonElement;
    expect(claimedTab.textContent).toContain("(1)");
  });

  it("renders a collection's absolute preview image URL", async () => {
    // The Library's Collections tab renders each collection's previewImage.
    // An absolute https URL must render as-is. This is the behavior that must
    // survive the removal of the page-local resolveImageUrl helper; it does
    // NOT assert the helper's hash-to-blob.caffeine.ai rewriting, which the
    // current request intentionally changes.
    const user = userEvent.setup();
    sharedQueriesMock.useCollections.mockReturnValue({
      data: [
        {
          id: 2n,
          name: "Preview Collection",
          description: "",
          nftCount: 1n,
          maxSize: 10n,
          previewImage: "https://example.com/collection-cover.png",
        },
      ],
      isLoading: false,
    });

    renderWithQueryClient(<CollectorPage />);

    const collectionsTab = document.querySelector(
      '[data-ocid="collector.tab.collections"]',
    ) as HTMLButtonElement;
    await user.click(collectionsTab);

    const img = screen.getByAltText("Preview Collection") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/collection-cover.png");
  });

  it("exposes no Catalog Recovery control in the Library", () => {
    // The admin Catalog Recovery page/route/tab was removed. The Library must
    // not surface any recovery entry point.
    renderWithQueryClient(<CollectorPage />);

    expect(
      document.querySelector('[data-ocid="collector.recovery"]'),
    ).toBeNull();
    expect(document.querySelector('a[href="/admin/catalog"]')).toBeNull();
    expect(document.body.textContent).not.toMatch(/catalog recovery/i);
  });
});

describe("Detail modal image rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    setHomeDefaults();
  });

  function renderModal(nft: Nft, imageUrl?: string) {
    return renderWithQueryClient(
      <NftDetailModal
        nft={nft}
        open
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onBurn={vi.fn(async () => {})}
        callerPrincipal="aaaaa-aa"
        canisterId="backend-canister"
        imageUrl={imageUrl}
      />,
    );
  }

  it("renders the image from the synchronous directURL field of a list-sourced record", () => {
    // The detail modal is the third surface that must use the unified resolver.
    // A list-sourced record carries the resolved gateway URL on the synchronous
    // `directURL` field; getDirectURL() is async and would yield a Promise that
    // React cannot render. The modal must show the directURL image.
    const nft = makeNft({
      id: 40n,
      title: "Modal Direct Art",
      imageBlob: {
        directURL: "https://example.com/modal-direct.png",
        getDirectURL: () => Promise.resolve("https://example.com/async.png"),
      } as never,
    });

    renderModal(nft);

    const img = screen.getByAltText("Modal Direct Art") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/modal-direct.png");
    expect(screen.queryByText("No image")).toBeNull();
  });

  it("prefers the direct imageUrl prop for a claimed NFT without an imageBlob", () => {
    // Claimed NFTs may arrive with only a direct imageUrl string and no
    // imageBlob; the modal must render that URL rather than "No image".
    const nft = makeNft({
      id: 41n,
      title: "Claimed Modal Art",
      imageBlob: undefined as never,
    });

    renderModal(nft, "https://example.com/claimed-modal.png");

    const img = screen.getByAltText("Claimed Modal Art") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/claimed-modal.png");
  });

  it("shows the no-image fallback when neither source resolves", () => {
    const nft = makeNft({
      id: 42n,
      title: "Empty Modal Art",
      imageBlob: { getDirectURL: () => "" } as never,
    });

    renderModal(nft);

    expect(screen.queryByAltText("Empty Modal Art")).toBeNull();
    expect(screen.getByText("No image")).toBeInTheDocument();
  });
});
