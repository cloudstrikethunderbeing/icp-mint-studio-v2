import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Characterization: price editing + canonical ownership (adjacent behavior) ─
// The current request intentionally changes three things:
//   1. the admin edit form will be able to CLEAR an NFT's price (today an empty
//      price field means "unchanged");
//   2. purchase settlement will reject a ledger block index already used by
//      another purchase;
//   3. settlement will refuse to complete when the NFT owner no longer equals
//      the seller.
//
// This suite deliberately does NOT freeze the "empty price = unchanged" behavior
// (that is the behavior being changed). It freezes the ADJACENT working behavior
// the change must not disturb:
//   - the edit form still pre-fills the current price and persists a CHANGED
//     whole-value price plus the other metadata fields through updateMetadata;
//   - a non-positive price is still rejected with validation feedback and no
//     write is issued;
//   - the BUY action is still gated on non-owner + a defined price, and an
//     unlisted NFT still shows "Not for sale" with no BUY action;
//   - the Library still renders each owned NFT (minted and claimed) exactly once
//     with its title and details intact.
//
// The real components are exercised; only their data hooks and the auth seam are
// typed local stubs. The backend is mocked, so this suite asserts the UI
// contract, not real persistence or real settlement.

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

describe("NftDetailModal price editing (characterization)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.useAuth.mockReturnValue({ isAdmin: false });
    setDefaultQueries();
  });

  it("pre-fills the edit form with the current whole-value price", async () => {
    const user = userEvent.setup();
    renderModal({
      nft: makeNft({ priceUsd: 100n }),
      callerPrincipal: "owner-principal",
    });

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.edit_metadata_button"]',
      ) as HTMLButtonElement,
    );

    const priceInput = document.querySelector(
      '[data-ocid="nft_detail.edit_price_input"]',
    ) as HTMLInputElement;
    expect(priceInput).not.toBeNull();
    expect(priceInput.value).toBe("100");
  });

  it("persists a changed price together with the other metadata fields", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => undefined);
    queriesMock.useUpdateMetadata.mockReturnValue(
      mockMutation({ mutateAsync }),
    );

    renderModal({
      nft: makeNft({ priceUsd: 100n }),
      callerPrincipal: "owner-principal",
    });

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.edit_metadata_button"]',
      ) as HTMLButtonElement,
    );

    const priceInput = document.querySelector(
      '[data-ocid="nft_detail.edit_price_input"]',
    ) as HTMLInputElement;
    await user.clear(priceInput);
    await user.type(priceInput, "175");

    const businessName = document.querySelector(
      '[data-ocid="nft_detail.edit_business_name"]',
    ) as HTMLInputElement;
    await user.type(businessName, "Acme Co");

    const tags = document.querySelector(
      '[data-ocid="nft_detail.edit_tags"]',
    ) as HTMLInputElement;
    await user.type(tags, "art, limited");

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.edit_save_button"]',
      ) as HTMLButtonElement,
    );

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      nftId: 42n,
      updates: expect.objectContaining({
        priceUsd: 175,
        businessName: "Acme Co",
        tags: ["art", "limited"],
      }),
    });
  });

  it("rejects a non-positive price with validation feedback and issues no write", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => undefined);
    queriesMock.useUpdateMetadata.mockReturnValue(
      mockMutation({ mutateAsync }),
    );

    renderModal({
      nft: makeNft({ priceUsd: 100n }),
      callerPrincipal: "owner-principal",
    });

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.edit_metadata_button"]',
      ) as HTMLButtonElement,
    );

    const priceInput = document.querySelector(
      '[data-ocid="nft_detail.edit_price_input"]',
    ) as HTMLInputElement;
    await user.click(priceInput);
    await user.keyboard("{Control>}a{/Control}0");
    expect(priceInput.value).toBe("0");

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.edit_save_button"]',
      ) as HTMLButtonElement,
    );

    // A non-positive price must never be persisted and the form stays open.
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-ocid="nft_detail.edit_form"]'),
    ).not.toBeNull();
  });
});

describe("NftDetailModal BUY gating (characterization)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.useAuth.mockReturnValue({ isAdmin: false });
    setDefaultQueries();
  });

  it("shows the BUY action to a non-owner of a listed NFT", () => {
    renderModal({
      nft: makeNft({ priceUsd: 250n }),
      callerPrincipal: "buyer-principal",
    });
    const buy = document.querySelector(
      '[data-ocid="nft_detail.buy_button"]',
    ) as HTMLButtonElement;
    expect(buy).not.toBeNull();
    expect(buy.textContent).toContain("Buy for $250");
  });

  it("hides the BUY action from the owner", () => {
    renderModal({
      nft: makeNft({ priceUsd: 250n }),
      callerPrincipal: "owner-principal",
    });
    expect(
      document.querySelector('[data-ocid="nft_detail.buy_button"]'),
    ).toBeNull();
  });

  it("shows 'Not for sale' and no BUY action for an unlisted NFT", () => {
    renderModal({
      nft: makeNft({ priceUsd: undefined }),
      callerPrincipal: "buyer-principal",
    });
    const price = document.querySelector('[data-ocid="nft_detail.price"]');
    expect(price?.textContent).toContain("Not for sale");
    expect(
      document.querySelector('[data-ocid="nft_detail.buy_button"]'),
    ).toBeNull();
  });
});

// ── Library canonical ownership (characterization) ───────────────────────────
// The Library derives ownership from the full feed (useMyNfts) for the 'All'
// tab and the active feed (useMyActiveNfts) for 'Created'/'Recent'. A claimed
// NFT (claimedAt != null) and a minted NFT must each render exactly once with
// their details intact. This is the adjacent behavior the ownership work must
// not disturb.

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

describe("Library canonical ownership (characterization)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCollectorDefaults();
  });

  it("renders a minted and a claimed NFT each exactly once with details intact", () => {
    const minted = makeNft({
      id: 1n,
      title: "Minted Art",
      creatorId: "aaaaa-aa",
      nftUniqueId: "canister:0:1",
    });
    const claimed = makeNft({
      id: 2n,
      title: "Claimed Art",
      creatorId: "creator-2",
      nftUniqueId: "canister:0:2",
      claimedAt: 1_700_000_000n,
    });
    // The full feed carries both; the active feed carries only the minted one.
    queriesMock.useMyNfts.mockReturnValue({ data: [minted, claimed] });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [minted],
      isLoading: false,
    });

    renderCollectorPage();

    // Each title appears exactly once — no duplicate entries.
    expect(screen.getAllByText("Minted Art")).toHaveLength(1);
    expect(screen.getAllByText("Claimed Art")).toHaveLength(1);
    // Details are intact on the cards: each card carries its own unique ID.
    expect(screen.getByText("canister:0:1")).toBeInTheDocument();
    expect(screen.getByText("canister:0:2")).toBeInTheDocument();
  });

  it("shows the plain empty state when the account owns no NFTs", () => {
    renderCollectorPage();
    expect(
      document.querySelector('[data-ocid="collector.account_empty_state"]'),
    ).not.toBeNull();
    expect(screen.getByText("No NFTs yet")).toBeInTheDocument();
  });
});
