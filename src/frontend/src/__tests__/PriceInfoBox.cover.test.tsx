import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Cover: compact USD price info box below each card image ──────────────────
// Accepted behavior:
//   - every card (Studio, public gallery, collector library) shows a single
//     compact info box BELOW the image with the NFT's whole-value USD price;
//   - an unlisted NFT shows "Not for sale" in that box;
//   - no pills/badges render on the image face, so the artwork is unobstructed.
//
// The real pages are exercised; only the data hooks and the auth/router seams
// are typed local stubs. The backend is mocked, so this suite asserts the
// rendered card contract, not real catalog data.

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
  usePublicNfts: vi.fn(),
  usePurchaseQuote: vi.fn(),
  useSubmitPurchase: vi.fn(),
  useVerifyPurchase: vi.fn(),
  usePaymentConfig: vi.fn(),
}));

const notificationsMock = vi.hoisted(() => ({
  addNotification: vi.fn(),
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
  usePublicNfts: queriesMock.usePublicNfts,
  usePurchaseQuote: queriesMock.usePurchaseQuote,
  useSubmitPurchase: queriesMock.useSubmitPurchase,
  useVerifyPurchase: queriesMock.useVerifyPurchase,
  usePaymentConfig: queriesMock.usePaymentConfig,
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

vi.stubGlobal("crypto", {
  subtle: {
    digest: vi.fn(async () => new Uint8Array(32).buffer),
  },
});

import CollectorPage from "@/pages/CollectorPage";
import GalleryPage from "@/pages/GalleryPage";
import HomePage from "@/pages/HomePage";

function makeNft(overrides: Partial<Nft> = {}): Nft {
  return {
    id: 1n,
    status: NftStatus.active,
    supplyLimit: 1n,
    title: "Priced Art",
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
  queriesMock.usePublicNfts.mockReturnValue({
    data: { items: [], total: 0n },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  queriesMock.usePurchaseQuote.mockReturnValue(mockMutation());
  queriesMock.useSubmitPurchase.mockReturnValue(mockMutation());
  queriesMock.useVerifyPurchase.mockReturnValue(mockMutation());
  queriesMock.usePaymentConfig.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  });
}

// The price strip must be a sibling AFTER the image element, i.e. below it in
// document order, and the image face must not carry a price/status pill.
function expectPriceBelowImage(
  image: Element,
  priceEl: Element,
  expectedText: string,
) {
  expect(priceEl.textContent).toContain(expectedText);
  expect(
    image.compareDocumentPosition(priceEl) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
}

describe("Studio card price info box (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    setDefaultQueries();
  });

  it("shows the USD price in a box below the image and no pill on the image face", () => {
    const nft = makeNft({ id: 5n, title: "Studio Priced", priceUsd: 250n });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    renderWithQueryClient(<HomePage />);

    const price = document.querySelector('[data-ocid="home.nft_price.1"]');
    expect(price).not.toBeNull();
    const image = screen.getByAltText("Studio Priced");
    expectPriceBelowImage(image, price!, "$250");
    expect(price?.getAttribute("data-state")).toBe("listed");

    // The image face carries no price/status pill: the price text lives only in
    // the strip below the image, never inside the image button.
    const imageButton = image.closest("button");
    expect(imageButton).not.toBeNull();
    expect(imageButton?.textContent ?? "").not.toContain("$250");
    expect(imageButton?.textContent ?? "").not.toContain("Not for sale");
  });

  it("shows 'Not for sale' for an unlisted Studio NFT", () => {
    const nft = makeNft({ id: 6n, title: "Studio Unlisted" });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    renderWithQueryClient(<HomePage />);

    const price = document.querySelector('[data-ocid="home.nft_price.1"]');
    expect(price).not.toBeNull();
    expect(price?.textContent).toContain("Not for sale");
    expect(price?.getAttribute("data-state")).toBe("unlisted");
  });
});

describe("Public gallery card price info box (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultQueries();
  });

  it("shows the USD price in a box below the image and no pill on the image face", () => {
    const nft = makeNft({ id: 7n, title: "Gallery Priced", priceUsd: 99n });
    queriesMock.usePublicNfts.mockReturnValue({
      data: { items: [nft], total: 1n },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<GalleryPage />);

    const price = document.querySelector('[data-ocid="gallery.price.1"]');
    expect(price).not.toBeNull();
    const image = screen.getByAltText("Gallery Priced");
    expectPriceBelowImage(image, price!, "$99");
    expect(price?.getAttribute("data-state")).toBe("listed");

    // The image face is the aspect-square container; the price strip is a
    // sibling AFTER it, so the face itself carries no price text.
    const imageFace = image.parentElement;
    expect(imageFace).not.toBeNull();
    expect(imageFace?.textContent ?? "").not.toContain("$99");
  });

  it("shows 'Not for sale' for an unlisted gallery NFT", () => {
    const nft = makeNft({ id: 8n, title: "Gallery Unlisted" });
    queriesMock.usePublicNfts.mockReturnValue({
      data: { items: [nft], total: 1n },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<GalleryPage />);

    const price = document.querySelector('[data-ocid="gallery.price.1"]');
    expect(price).not.toBeNull();
    expect(price?.textContent).toContain("Not for sale");
    expect(price?.getAttribute("data-state")).toBe("unlisted");
  });
});

describe("Collector library card price info box (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    setDefaultQueries();
  });

  it("shows the USD price in a box below the image and no pill on the image face", () => {
    const nft = makeNft({ id: 9n, title: "Library Priced", priceUsd: 12n });
    queriesMock.useMyNfts.mockReturnValue({ data: [nft] });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    renderWithQueryClient(<CollectorPage />);

    const price = document.querySelector('[data-ocid="collector.nft.price.1"]');
    expect(price).not.toBeNull();
    const image = screen.getByAltText("Library Priced");
    expectPriceBelowImage(image, price!, "$12");
    expect(price?.getAttribute("data-state")).toBe("listed");

    // The image face itself must not carry the price text.
    const imageFace = image.parentElement;
    expect(imageFace).not.toBeNull();
    expect(imageFace?.textContent ?? "").not.toContain("$12");
  });

  it("shows 'Not for sale' for an unlisted library NFT", () => {
    const nft = makeNft({ id: 10n, title: "Library Unlisted" });
    queriesMock.useMyNfts.mockReturnValue({ data: [nft] });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    renderWithQueryClient(<CollectorPage />);

    const price = document.querySelector('[data-ocid="collector.nft.price.1"]');
    expect(price).not.toBeNull();
    expect(price?.textContent).toContain("Not for sale");
    expect(price?.getAttribute("data-state")).toBe("unlisted");
  });
});
