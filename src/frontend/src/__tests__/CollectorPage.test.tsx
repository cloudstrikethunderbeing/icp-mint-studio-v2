import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Mocks ───────────────────────────────────────────────────────────────────
// The CollectorPage (Library) depends on the auth context and a large set of
// react-query hooks. We mock both modules so the component's rendering states
// can be characterized in isolation from the real backend actor.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const queriesMock = vi.hoisted(() => ({
  useBackendHealth: vi.fn(),
  useMyActiveNfts: vi.fn(),
  useMyNfts: vi.fn(),
  useCollections: vi.fn(),
  useNftClaimCounts: vi.fn(),
  useDeleteNft: vi.fn(),
  useBurnNft: vi.fn(),
  useRemoveNftFromCollection: vi.fn(),
  useCreateCollection: vi.fn(),
  useAddNftToCollection: vi.fn(),
  useDeleteCollection: vi.fn(),
  useTotalNftCount: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
}));

// CollectorPage imports only TYPES from @/backend (Nft, CollectionWithCount,
// NftClaimCount) plus the string enums NftStatus/RewardTier/RewardType used to
// build fixture NFTs. The real @/backend module pulls in
// @caffeineai/object-storage (ExternalBlob) at runtime, which has no usable
// runtime entry in the test environment. Mocking the module keeps the type-only
// import from dragging in that dependency while preserving the enum values.
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

// CollectorPage renders <Link> from @tanstack/react-router, which requires a
// RouterProvider context. Mock Link to a plain anchor so the component can be
// rendered standalone.
vi.mock("@tanstack/react-router", () => ({
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

vi.mock("@/hooks/useQueries", () => ({
  useBackendHealth: queriesMock.useBackendHealth,
  useMyActiveNfts: queriesMock.useMyActiveNfts,
  useMyNfts: queriesMock.useMyNfts,
  useCollections: queriesMock.useCollections,
  useNftClaimCounts: queriesMock.useNftClaimCounts,
  useDeleteNft: queriesMock.useDeleteNft,
  useBurnNft: queriesMock.useBurnNft,
  useRemoveNftFromCollection: queriesMock.useRemoveNftFromCollection,
  useCreateCollection: queriesMock.useCreateCollection,
  useAddNftToCollection: queriesMock.useAddNftToCollection,
  useDeleteCollection: queriesMock.useDeleteCollection,
  useTotalNftCount: queriesMock.useTotalNftCount,
}));

import CollectorPage from "@/pages/CollectorPage";

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
  };
}

// CollectorPage now reads the page envelope's `total` through a direct
// useQuery (["collectorPageTotals", ...]), so it must be rendered inside a
// QueryClientProvider. A fresh client per render keeps tests isolated.
function renderCollectorPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CollectorPage />
    </QueryClientProvider>,
  );
}

function setAuthenticatedAuth() {
  authMock.useAuth.mockReturnValue({
    isAuthenticated: true,
    principal: "aaaaa-aa",
    authState: "ready",
    isAdmin: false,
    isAdminLoading: false,
    actor: {},
  });
}

function setDefaultQueries() {
  queriesMock.useBackendHealth.mockReturnValue({
    status: "ok",
    canisterId: "x",
  });
  queriesMock.useMyActiveNfts.mockReturnValue({ data: [], isLoading: false });
  queriesMock.useMyNfts.mockReturnValue({ data: [] });
  queriesMock.useCollections.mockReturnValue({ data: [], isLoading: false });
  queriesMock.useNftClaimCounts.mockReturnValue({ data: [] });
  queriesMock.useDeleteNft.mockReturnValue(mockMutation());
  queriesMock.useBurnNft.mockReturnValue(mockMutation());
  queriesMock.useRemoveNftFromCollection.mockReturnValue(mockMutation());
  queriesMock.useCreateCollection.mockReturnValue(mockMutation());
  queriesMock.useAddNftToCollection.mockReturnValue(mockMutation());
  queriesMock.useDeleteCollection.mockReturnValue(mockMutation());
  // Store-wide catalog count. Defaults to zero (a fresh store on draft resume),
  // which drives the "catalog is empty" state. Tests that exercise the
  // account-scoped empty state override this to a non-zero count.
  queriesMock.useTotalNftCount.mockReturnValue({ data: 0n, isLoading: false });
}

describe("CollectorPage (Library) rendering states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedAuth();
    setDefaultQueries();
  });

  it("renders a loading skeleton while the active NFT feed is loading (never a blank list)", () => {
    queriesMock.useMyActiveNfts.mockReturnValue({ data: [], isLoading: true });
    renderCollectorPage();
    // The header is present and the count badge is hidden while loading.
    expect(screen.getByText("My Library")).toBeInTheDocument();
    // Skeleton placeholders render instead of a blank list.
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
  });

  it("renders a short, plain empty state (not a blank list) when the account owns no NFTs", () => {
    // The signed-in principal owns no NFTs. The empty state is a short, plain
    // message with a clear next step — no diagnostic or explainer paragraphs.
    renderCollectorPage();
    expect(
      document.querySelector('[data-ocid="collector.account_empty_state"]'),
    ).not.toBeNull();
    expect(screen.getByText("No NFTs yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Mint one to get started, or claim one using a claim link.",
      ),
    ).toBeInTheDocument();
    // No diagnostic/explainer panels remain in the empty state.
    expect(
      document.querySelector(
        '[data-ocid="collector.catalog_intact_diag_panel"]',
      ),
    ).toBeNull();
    expect(
      document.querySelector('[data-ocid="collector.recycle_diag_panel"]'),
    ).toBeNull();
    expect(
      document.querySelector('[data-ocid="collector.catalog_empty_state"]'),
    ).toBeNull();
  });

  it("shows the same plain empty state regardless of the store-wide catalog count", () => {
    // The store-wide count no longer drives a distinct diagnostic state; the
    // account-scoped empty state is the single plain message.
    queriesMock.useTotalNftCount.mockReturnValue({
      data: 3n,
      isLoading: false,
    });
    renderCollectorPage();
    expect(
      document.querySelector('[data-ocid="collector.account_empty_state"]'),
    ).not.toBeNull();
    expect(screen.getByText("No NFTs yet")).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="collector.catalog_empty_state"]'),
    ).toBeNull();
  });

  it("renders NFT cards when the account owns NFTs", () => {
    const nft = makeNft({ title: "My First NFT" });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });
    queriesMock.useMyNfts.mockReturnValue({ data: [nft] });
    renderCollectorPage();
    expect(screen.getByText("My First NFT")).toBeInTheDocument();
    expect(screen.getByText("My Library")).toBeInTheDocument();
  });

  it("renders the library with an inline notice when the backend is unavailable", () => {
    // The library now renders with an INLINE notice instead of blocking the
    // whole surface: a degraded backend must not hide the user's own records.
    queriesMock.useBackendHealth.mockReturnValue({
      status: "unavailable",
      reason: "boom",
    });
    renderCollectorPage();
    expect(
      document.querySelector('[data-ocid="collector.backend_health_notice"]'),
    ).not.toBeNull();
    expect(screen.getByText("Backend unavailable")).toBeInTheDocument();
    // The library surface still renders.
    expect(screen.getByText("My Library")).toBeInTheDocument();
  });

  it("renders the library with an inline notice when the backend reports an empty catalog", () => {
    queriesMock.useBackendHealth.mockReturnValue({
      status: "empty",
      canisterId: "x",
    });
    renderCollectorPage();
    expect(
      document.querySelector('[data-ocid="collector.backend_health_notice"]'),
    ).not.toBeNull();
    expect(
      screen.getByText("Library temporarily unavailable"),
    ).toBeInTheDocument();
    // The library surface still renders rather than being blocked.
    expect(screen.getByText("My Library")).toBeInTheDocument();
  });
});
