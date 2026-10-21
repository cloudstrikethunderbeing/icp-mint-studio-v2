import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Cover: admin price set/update/clear + Library canonical dedup ────────────
// Accepted behavior this suite covers:
//   1. An admin can SET, UPDATE and CLEAR an NFT's whole-value USD price. A
//      cleared price (empty field) routes through the dedicated admin price
//      hook with `priceUsd: null` (unlist), NOT through the generic metadata
//      update (which treats null as "unchanged"). A non-empty price routes
//      through the same admin hook with the numeric value.
//   2. The Library collapses each ownership feed to one entry per canonical
//      `nftUniqueId`, so a duplicated/stale owner-index entry renders once.
//
// The real NftDetailModal and CollectorPage are exercised; only their data
// hooks and the auth seam are typed local stubs. The backend is mocked, so this
// suite asserts the UI contract, not real persistence or real settlement.

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
  usePurchaseQuote: vi.fn(),
  useSubmitPurchase: vi.fn(),
  useVerifyPurchase: vi.fn(),
  usePaymentConfig: vi.fn(),
  // CollectorPage (Library) hooks.
  useBackendHealth: vi.fn(),
  useMyActiveNfts: vi.fn(),
  useMyNfts: vi.fn(),
  useNftClaimCounts: vi.fn(),
  useDeleteNft: vi.fn(),
  useBurnNft: vi.fn(),
  useCreateCollection: vi.fn(),
  useDeleteCollection: vi.fn(),
  useTotalNftCount: vi.fn(),
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
  useBackendHealth: queriesMock.useBackendHealth,
  useMyActiveNfts: queriesMock.useMyActiveNfts,
  useMyNfts: queriesMock.useMyNfts,
  useNftClaimCounts: queriesMock.useNftClaimCounts,
  useDeleteNft: queriesMock.useDeleteNft,
  useBurnNft: queriesMock.useBurnNft,
  useCreateCollection: queriesMock.useCreateCollection,
  useDeleteCollection: queriesMock.useDeleteCollection,
  useTotalNftCount: queriesMock.useTotalNftCount,
}));

import { NftDetailModal } from "@/components/NftDetailModal";
import CollectorPage from "@/pages/CollectorPage";

function makeNft(overrides: Partial<Nft> = {}): Nft {
  return {
    id: 42n,
    status: NftStatus.active,
    supplyLimit: 1n,
    title: "Modal Art",
    imageBlob: { getDirectURL: () => "https://example.com/img.png" } as never,
    edition: "1/1",
    referralThreshold: 3n,
    ownerId: {
      toText: () => "owner-principal",
      toString: () => "owner-principal",
    } as never,
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
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onDelete = vi.fn();
  const onBurn = vi.fn(async () => {});
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <NftDetailModal
        nft={makeNft()}
        open
        onClose={onClose}
        onDelete={onDelete}
        onBurn={onBurn}
        callerPrincipal="owner-principal"
        canisterId="canister"
        {...props}
      />
    </QueryClientProvider>,
  );
  return { ...utils, onDelete, onBurn, onClose };
}

async function openEditForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    document.querySelector(
      '[data-ocid="nft_detail.edit_metadata_button"]',
    ) as HTMLButtonElement,
  );
}

describe("NftDetailModal admin price set/update/clear (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.useAuth.mockReturnValue({ isAdmin: true });
    setDefaultQueries();
  });

  it("sets a price through the dedicated admin price hook", async () => {
    const user = userEvent.setup();
    const updateMetadata = vi.fn(async () => undefined);
    const adminSetNftPrice = vi.fn(async () => makeNft({ priceUsd: 175n }));
    queriesMock.useUpdateMetadata.mockReturnValue(
      mockMutation({ mutateAsync: updateMetadata }),
    );
    queriesMock.useAdminSetNftPrice.mockReturnValue(
      mockMutation({ mutateAsync: adminSetNftPrice }),
    );

    renderModal({
      nft: makeNft({ priceUsd: undefined }),
      callerPrincipal: "owner-principal",
    });
    await openEditForm(user);

    const priceInput = document.querySelector(
      '[data-ocid="nft_detail.edit_price_input"]',
    ) as HTMLInputElement;
    await user.type(priceInput, "175");

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.edit_save_button"]',
      ) as HTMLButtonElement,
    );

    await waitFor(() => expect(adminSetNftPrice).toHaveBeenCalledTimes(1));
    expect(adminSetNftPrice).toHaveBeenCalledWith({
      nftId: 42n,
      priceUsd: 175,
    });
    // The generic metadata update must NOT carry the price for an admin.
    expect(updateMetadata).toHaveBeenCalledWith({
      nftId: 42n,
      updates: expect.objectContaining({ priceUsd: undefined }),
    });
  });

  it("updates an existing price through the dedicated admin price hook", async () => {
    const user = userEvent.setup();
    const adminSetNftPrice = vi.fn(async () => makeNft({ priceUsd: 300n }));
    queriesMock.useAdminSetNftPrice.mockReturnValue(
      mockMutation({ mutateAsync: adminSetNftPrice }),
    );

    renderModal({
      nft: makeNft({ priceUsd: 100n }),
      callerPrincipal: "owner-principal",
    });
    await openEditForm(user);

    const priceInput = document.querySelector(
      '[data-ocid="nft_detail.edit_price_input"]',
    ) as HTMLInputElement;
    expect(priceInput.value).toBe("100");
    await user.clear(priceInput);
    await user.type(priceInput, "300");

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.edit_save_button"]',
      ) as HTMLButtonElement,
    );

    await waitFor(() => expect(adminSetNftPrice).toHaveBeenCalledTimes(1));
    expect(adminSetNftPrice).toHaveBeenCalledWith({
      nftId: 42n,
      priceUsd: 300,
    });
  });

  it("clears a price (empty field) by sending null to the admin price hook", async () => {
    const user = userEvent.setup();
    const adminSetNftPrice = vi.fn(async () =>
      makeNft({ priceUsd: undefined }),
    );
    queriesMock.useAdminSetNftPrice.mockReturnValue(
      mockMutation({ mutateAsync: adminSetNftPrice }),
    );

    renderModal({
      nft: makeNft({ priceUsd: 100n }),
      callerPrincipal: "owner-principal",
    });
    await openEditForm(user);

    const priceInput = document.querySelector(
      '[data-ocid="nft_detail.edit_price_input"]',
    ) as HTMLInputElement;
    await user.clear(priceInput);
    expect(priceInput.value).toBe("");

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.edit_save_button"]',
      ) as HTMLButtonElement,
    );

    // Empty price for an admin means CLEAR (null), never "unchanged".
    await waitFor(() => expect(adminSetNftPrice).toHaveBeenCalledTimes(1));
    expect(adminSetNftPrice).toHaveBeenCalledWith({
      nftId: 42n,
      priceUsd: null,
    });
  });

  it("does not route a non-admin owner's empty price to the admin hook", async () => {
    const user = userEvent.setup();
    authMock.useAuth.mockReturnValue({ isAdmin: false });
    const adminSetNftPrice = vi.fn(async () => makeNft());
    const updateMetadata = vi.fn(async () => undefined);
    queriesMock.useAdminSetNftPrice.mockReturnValue(
      mockMutation({ mutateAsync: adminSetNftPrice }),
    );
    queriesMock.useUpdateMetadata.mockReturnValue(
      mockMutation({ mutateAsync: updateMetadata }),
    );

    renderModal({
      nft: makeNft({ priceUsd: 100n }),
      callerPrincipal: "owner-principal",
    });
    await openEditForm(user);

    const priceInput = document.querySelector(
      '[data-ocid="nft_detail.edit_price_input"]',
    ) as HTMLInputElement;
    await user.clear(priceInput);

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.edit_save_button"]',
      ) as HTMLButtonElement,
    );

    await waitFor(() => expect(updateMetadata).toHaveBeenCalledTimes(1));
    // A non-admin never reaches the admin-only price hook.
    expect(adminSetNftPrice).not.toHaveBeenCalled();
  });
});

// ── Library canonical dedup (cover) ──────────────────────────────────────────
// The Library collapses each ownership feed to one entry per canonical
// `nftUniqueId`. A stale/repeated owner-index entry (same identity, thinner
// record) must not render a second card, and the richer record must win so
// media/name/description/provenance survive.

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

function setCollectorDefaults() {
  authMock.useAuth.mockReturnValue({
    isAuthenticated: true,
    principal: "aaaaa-aa",
    authState: "ready",
    isAdmin: false,
    isAdminLoading: false,
    actor: {},
  });
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
  queriesMock.useTotalNftCount.mockReturnValue({ data: 0n, isLoading: false });
}

describe("Library canonical dedup (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCollectorDefaults();
  });

  it("collapses a duplicated canonical identity to a single card", () => {
    // Two records share the canonical identity `canister:0:7`; the second is
    // the richer one (has a description). Only one card may render, and it must
    // be the richer record.
    const thin = makeNft({
      id: 7n,
      title: "Dup Art",
      nftUniqueId: "canister:0:7",
      description: "",
    });
    const rich = makeNft({
      id: 7n,
      title: "Dup Art",
      nftUniqueId: "canister:0:7",
      description: "the richer record",
    });
    queriesMock.useMyNfts.mockReturnValue({ data: [thin, rich] });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [thin, rich],
      isLoading: false,
    });

    renderCollectorPage();

    expect(screen.getAllByText("Dup Art")).toHaveLength(1);
    expect(screen.getAllByText("canister:0:7")).toHaveLength(1);
  });

  it("keeps distinct canonical identities as separate cards", () => {
    const first = makeNft({
      id: 1n,
      title: "First Art",
      nftUniqueId: "canister:0:1",
    });
    const second = makeNft({
      id: 2n,
      title: "Second Art",
      nftUniqueId: "canister:0:2",
    });
    queriesMock.useMyNfts.mockReturnValue({ data: [first, second] });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [first, second],
      isLoading: false,
    });

    renderCollectorPage();

    expect(screen.getAllByText("First Art")).toHaveLength(1);
    expect(screen.getAllByText("Second Art")).toHaveLength(1);
    expect(screen.getByText("canister:0:1")).toBeInTheDocument();
    expect(screen.getByText("canister:0:2")).toBeInTheDocument();
  });

  it("Created tab compares against the caller's canonical creator id", async () => {
    // [CREATOR-ID] `Nft.creatorId` is a derived hex id, NOT the principal. The
    // Created tab must compare against the caller's canonical creator id from
    // getCallerProfile(), so a freshly minted NFT appears there even though its
    // creatorId differs from the principal text.
    const user = userEvent.setup();
    authMock.useAuth.mockReturnValue({
      isAuthenticated: true,
      principal: "aaaaa-aa",
      authState: "ready",
      isAdmin: false,
      isAdminLoading: false,
      actor: {
        getCallerProfile: vi.fn(async () => ({
          creatorId: "canonical-creator",
        })),
        listMyActiveNfts: vi.fn(async () => ({
          items: [],
          total: 0n,
          offset: 0n,
          limit: 12n,
        })),
        listMyNfts: vi.fn(async () => ({
          items: [],
          total: 0n,
          offset: 0n,
          limit: 12n,
        })),
      },
    });
    const mine = makeNft({
      id: 1n,
      title: "My Mint",
      creatorId: "canonical-creator",
      nftUniqueId: "canister:0:1",
    });
    const other = makeNft({
      id: 2n,
      title: "Someone Else",
      creatorId: "other-creator",
      nftUniqueId: "canister:0:2",
    });
    queriesMock.useMyNfts.mockReturnValue({ data: [mine, other] });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [mine, other],
      isLoading: false,
    });

    renderCollectorPage();

    await user.click(
      document.querySelector(
        '[data-ocid="collector.tab.created"]',
      ) as HTMLButtonElement,
    );

    // Only the caller's own mint appears under Created.
    await waitFor(() =>
      expect(screen.getByText("My Mint")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Someone Else")).toBeNull();
  });
});
