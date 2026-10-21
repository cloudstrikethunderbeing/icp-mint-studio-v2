import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Cover: mint success refreshes the Studio grid without a manual reload ─────
// The accepted requirement is that immediately after a successful mint the
// newly minted NFT (with its image) appears in the Studio grid, without a page
// reload. HomePage.mint.test.tsx mocks useMyActiveNfts with a STATIC feed, so it
// proves the notification image but cannot prove the grid converges.
//
// This suite exercises the REAL useMyActiveNfts hook (only the actor seam is a
// typed local mock) so the mint flow's invalidateQueries(["myActiveNfts"]) is
// what drives the grid to the freshly minted record. The actor's
// listMyActiveNfts returns the pre-mint list until mintNft resolves, then the
// minted record — mirroring a backend that has committed the mint.
//
// It deliberately does NOT assert the notification copy or the image-resolution
// helper internals, which are covered elsewhere.

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
  useNftDetailQuery: vi.fn(),
  useCollections: vi.fn(),
  useAddNftToCollection: vi.fn(),
  useRemoveNftFromCollection: vi.fn(),
  useUpdateMetadata: vi.fn(),
  useGetClaimStatus: vi.fn(),
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

// Mock every hook HomePage consumes EXCEPT useMyActiveNfts, which is left to the
// real implementation so the invalidation contract is exercised end-to-end.
vi.mock("@/hooks/useQueries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useQueries")>();
  return {
    ...actual,
    useBackendHealth: queriesMock.useBackendHealth,
    useSearchNfts: queriesMock.useSearchNfts,
    useCreateSlot: queriesMock.useCreateSlot,
    useGenerateClaimLink: queriesMock.useGenerateClaimLink,
    useAdminSetNftRewardType: queriesMock.useAdminSetNftRewardType,
    useAdminSetNftReferralThreshold:
      queriesMock.useAdminSetNftReferralThreshold,
    useNftDetailQuery: queriesMock.useNftDetailQuery,
    useCollections: queriesMock.useCollections,
    useAddNftToCollection: queriesMock.useAddNftToCollection,
    useRemoveNftFromCollection: queriesMock.useRemoveNftFromCollection,
    useUpdateMetadata: queriesMock.useUpdateMetadata,
    useGetClaimStatus: queriesMock.useGetClaimStatus,
  };
});

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

vi.stubGlobal("crypto", {
  subtle: {
    digest: vi.fn(async () => new Uint8Array(32).buffer),
  },
});

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

async function mintThroughDialog(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
) {
  const pngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
  ]);
  const file = new File([pngBytes], "art.png", { type: "image/png" });
  // The real useMyActiveNfts hook starts in a loading state, so the grid (and
  // its hidden file input) mounts only after the first feed read resolves.
  const input = (await waitFor(() => {
    const el = document.querySelector(
      '[data-ocid="home.file_input"]',
    ) as HTMLInputElement | null;
    if (!el) throw new Error("file input not mounted yet");
    return el;
  })) as HTMLInputElement;
  await user.upload(input, file);

  const titleInput = await screen.findByLabelText(/Title/);
  await user.type(titleInput, title);
  // Whole-value USD price is now required for a mint.
  await user.type(screen.getByLabelText(/Price \(USD\)/), "120");

  const submit = document.querySelector(
    '[data-ocid="home.mint_submit_button"]',
  ) as HTMLButtonElement;
  await waitFor(() => expect(submit.disabled).toBe(false));
  await user.click(submit);
}

describe("HomePage mint refreshes the Studio grid without a reload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultQueries();
  });

  it("shows the newly minted NFT's image in the grid after mint success", async () => {
    const user = userEvent.setup();
    const minted = makeNft({
      id: 7n,
      title: "Fresh Mint",
      nftUniqueId: "canister:0:7",
      imageBlob: {
        directURL: "https://example.com/fresh-mint.png",
      } as never,
    });
    // The feed is empty before the mint and contains the minted record after it,
    // mirroring a backend that has committed the mint by the time the invalidated
    // query refetches.
    let mintedCommitted = false;
    const listMyActiveNfts = vi.fn(async () =>
      mintedCommitted ? [minted] : [],
    );
    const mintNft = vi.fn(async () => {
      mintedCommitted = true;
      return {
        __kind__: "ok" as const,
        ok: {
          id: 7n,
          tokenId: 7n,
          nftUniqueId: "canister:0:7",
          collectionId: undefined,
        },
      };
    });
    const getNft = vi.fn(async () => minted);
    authMock.useAuth.mockReturnValue({
      isAuthenticated: true,
      principal: "aaaaa-aa",
      authState: "ready",
      isAdmin: false,
      isAdminLoading: false,
      actor: { mintNft, getNft, listMyActiveNfts },
    });

    renderHomePage();

    // Before the mint the grid has no card for the minted NFT.
    expect(screen.queryByAltText("Fresh Mint")).toBeNull();

    await mintThroughDialog(user, "Fresh Mint");

    await waitFor(() => expect(mintNft).toHaveBeenCalledTimes(1));

    // Without any manual reload, the invalidated active feed refetches and the
    // minted NFT's image renders in the Studio grid card.
    const img = (await screen.findByAltText("Fresh Mint")) as HTMLImageElement;
    expect(img.src).toBe("https://example.com/fresh-mint.png");
    expect(screen.queryByText("No image")).toBeNull();
    expect(
      document.querySelector('[data-ocid="home.nft_card.item.1"]'),
    ).not.toBeNull();
    // The refetch went through the real list hook, not a static mock.
    expect(listMyActiveNfts.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps the minted NFT's image visible after the feed is re-read (reload contract)", async () => {
    const user = userEvent.setup();
    const minted = makeNft({
      id: 8n,
      title: "Durable Mint",
      nftUniqueId: "canister:0:8",
      imageBlob: {
        directURL: "https://example.com/durable-mint.png",
      } as never,
    });
    let mintedCommitted = false;
    const listMyActiveNfts = vi.fn(async () =>
      mintedCommitted ? [minted] : [],
    );
    const mintNft = vi.fn(async () => {
      mintedCommitted = true;
      return {
        __kind__: "ok" as const,
        ok: {
          id: 8n,
          tokenId: 8n,
          nftUniqueId: "canister:0:8",
          collectionId: undefined,
        },
      };
    });
    const getNft = vi.fn(async () => minted);
    authMock.useAuth.mockReturnValue({
      isAuthenticated: true,
      principal: "aaaaa-aa",
      authState: "ready",
      isAdmin: false,
      isAdminLoading: false,
      actor: { mintNft, getNft, listMyActiveNfts },
    });

    const first = renderHomePage();
    await mintThroughDialog(user, "Durable Mint");
    await waitFor(() => expect(mintNft).toHaveBeenCalledTimes(1));
    await screen.findByAltText("Durable Mint");

    // Simulate a page reload: unmount and remount with a fresh query cache. The
    // feed is re-read from the actor and the minted NFT's stable gateway URL
    // (not an ephemeral blob: URL) must still render.
    first.unmount();
    renderHomePage();

    const img = (await screen.findByAltText(
      "Durable Mint",
    )) as HTMLImageElement;
    expect(img.src).toBe("https://example.com/durable-mint.png");
    expect(img.src).not.toContain("blob:");
  });
});
