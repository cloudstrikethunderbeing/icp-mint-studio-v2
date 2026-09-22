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
    render(<CollectorPage />);
    // The header is present and the count badge is hidden while loading.
    expect(screen.getByText("My Library")).toBeInTheDocument();
    // Skeleton placeholders render instead of a blank list.
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
  });

  it("renders the account-scoped empty state (not a blank list) when the store has NFTs but this account owns none", () => {
    // Store-wide catalog has NFTs (storeWideTotal > 0) but the signed-in
    // principal owns none — the catalog is intact, this account is empty.
    queriesMock.useTotalNftCount.mockReturnValue({
      data: 3n,
      isLoading: false,
    });
    render(<CollectorPage />);
    expect(
      document.querySelector('[data-ocid="collector.account_empty_state"]'),
    ).not.toBeNull();
    expect(screen.getByText("No NFTs for this account")).toBeInTheDocument();
    expect(
      screen.getByText(/claim one using a claim link/),
    ).toBeInTheDocument();
    // The intact-catalog diagnostic is visible, not a silent blank list.
    expect(
      document.querySelector(
        '[data-ocid="collector.catalog_intact_diag_panel"]',
      ),
    ).not.toBeNull();
  });

  it("renders the catalog-empty state (not a blank list) when the store-wide catalog has zero NFTs", () => {
    // Store-wide zero NFTs — e.g. a fresh store on draft resume. This is
    // expected platform behavior, surfaced explicitly rather than a blank list.
    queriesMock.useTotalNftCount.mockReturnValue({
      data: 0n,
      isLoading: false,
    });
    render(<CollectorPage />);
    expect(
      document.querySelector('[data-ocid="collector.catalog_empty_state"]'),
    ).not.toBeNull();
    expect(screen.getByText("The catalog is empty")).toBeInTheDocument();
    // The draft-resume diagnostic distinguishes expected recycle from a bug.
    expect(
      document.querySelector('[data-ocid="collector.recycle_diag_panel"]'),
    ).not.toBeNull();
  });

  it("renders NFT cards when the account owns NFTs", () => {
    const nft = makeNft({ title: "My First NFT" });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });
    queriesMock.useMyNfts.mockReturnValue({ data: [nft] });
    render(<CollectorPage />);
    expect(screen.getByText("My First NFT")).toBeInTheDocument();
    expect(screen.getByText("My Library")).toBeInTheDocument();
  });

  it("blocks the library behind the backend-health guard when the backend is unavailable", () => {
    queriesMock.useBackendHealth.mockReturnValue({
      status: "unavailable",
      reason: "boom",
    });
    render(<CollectorPage />);
    expect(screen.getByText("Backend unavailable")).toBeInTheDocument();
    expect(screen.queryByText("My Library")).not.toBeInTheDocument();
  });

  it("blocks the library behind the backend-health guard when the backend reports an empty catalog", () => {
    queriesMock.useBackendHealth.mockReturnValue({
      status: "empty",
      canisterId: "x",
    });
    render(<CollectorPage />);
    expect(
      screen.getByText("Library temporarily unavailable"),
    ).toBeInTheDocument();
    expect(screen.queryByText("My Library")).not.toBeInTheDocument();
  });
});
