import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Characterization: CollectorPage NftCard delete/burn wiring ───────────────
// The current request intentionally adds a dissolve-out transition to the
// CollectorPage NftCard while deleting/burning. That animation is NOT frozen
// here.
//
// This suite freezes the ADJACENT working behavior the change must preserve:
//   - the card renders the NFT title and unique ID;
//   - the delete confirmation flow calls the delete mutation with the NFT id;
//   - the burn flow requires typing BURN before it calls the burn mutation;
//   - the delete quick-action is shown only to the current owner who is NOT the
//     mint creator (claimed/collected NFTs), and burn only to the mint creator.
//
// The page's data hooks are mocked with typed local stubs; the real NftCard is
// exercised.

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
  queriesMock.useTotalNftCount.mockReturnValue({ data: 0n, isLoading: false });
}

describe("CollectorPage NftCard delete/burn wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedAuth();
    setDefaultQueries();
  });

  it("renders the card title and unique ID", () => {
    const nft = makeNft({ title: "Library Art", nftUniqueId: "canister:0:99" });
    queriesMock.useMyNfts.mockReturnValue({ data: [nft] });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });
    renderCollectorPage();
    expect(screen.getByText("Library Art")).toBeInTheDocument();
    expect(screen.getByText("canister:0:99")).toBeInTheDocument();
  });

  it("calls the delete mutation with the NFT id when delete is confirmed", async () => {
    const user = userEvent.setup();
    // A claimed NFT: current owner is NOT the mint creator, so the delete
    // quick-action is available.
    const nft = makeNft({
      id: 21n,
      title: "Claimed Art",
      creatorId: "someone-else",
      ownerId: { toText: () => "aaaaa-aa" } as never,
    });
    const deleteMutation = mockMutation();
    queriesMock.useDeleteNft.mockReturnValue(deleteMutation);
    queriesMock.useMyNfts.mockReturnValue({ data: [nft] });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    renderCollectorPage();

    await user.click(
      document.querySelector(
        '[data-ocid="collector.nft.delete_button.1"]',
      ) as HTMLButtonElement,
    );
    await user.click(
      document.querySelector(
        '[data-ocid="collector.nft.confirm_delete_button.1"]',
      ) as HTMLButtonElement,
    );

    expect(deleteMutation.mutate).toHaveBeenCalledWith(21n);
  });

  it("requires typing BURN before the burn flow calls the burn mutation", async () => {
    const user = userEvent.setup();
    // A self-minted NFT: caller is the creator, so the burn action is available.
    const nft = makeNft({
      id: 22n,
      title: "Minted Art",
      creatorId: "aaaaa-aa",
      ownerId: { toText: () => "aaaaa-aa" } as never,
    });
    const burnMutation = mockMutation();
    queriesMock.useBurnNft.mockReturnValue(burnMutation);
    queriesMock.useMyNfts.mockReturnValue({ data: [nft] });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    renderCollectorPage();

    // Open the card's more-actions menu and choose Burn.
    await user.click(
      document.querySelector(
        '[data-ocid="collector.nft.more_button.1"]',
      ) as HTMLButtonElement,
    );
    await user.click(
      document.querySelector(
        '[data-ocid="collector.nft.dropdown.burn.1"]',
      ) as HTMLElement,
    );

    const burnConfirm = () =>
      document.querySelector(
        '[data-ocid="collector.nft.burn_confirm_button.1"]',
      ) as HTMLButtonElement;
    expect(burnConfirm().disabled).toBe(true);

    const input = document.querySelector(
      '[data-ocid="collector.nft.burn_input.1"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "BURN" } });
    expect(burnConfirm().disabled).toBe(false);

    await user.click(burnConfirm());
    expect(burnMutation.mutate).toHaveBeenCalledWith(22n);
  });

  it("hides the delete quick-action from the mint creator", () => {
    const nft = makeNft({
      id: 23n,
      title: "Own Mint",
      creatorId: "aaaaa-aa",
      ownerId: { toText: () => "aaaaa-aa" } as never,
    });
    queriesMock.useMyNfts.mockReturnValue({ data: [nft] });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });
    renderCollectorPage();
    expect(
      document.querySelector('[data-ocid="collector.nft.delete_button.1"]'),
    ).toBeNull();
  });
});
