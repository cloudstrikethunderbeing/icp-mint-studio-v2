import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Cover: CollectorPage NftCard dissolve-out transition ─────────────────────
// Accepted behavior:
//   - confirming a delete starts a dissolve-out on the card (opacity/scale
//     transition, exposed as data-dissolving="delete") while the mutation is in
//     flight;
//   - confirming a burn starts the same transition (data-dissolving="burn");
//   - a FAILED delete/burn clears the dissolve state so the card is restored
//     (rollback), rather than staying invisible.
//
// The real CollectorPage / NftCard is exercised; the page's data hooks are
// typed local stubs. The delete/burn mutations are stubs whose promises the
// test controls, so the in-flight window is observable.

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

function card() {
  return document.querySelector(
    '[data-ocid="collector.nft.item.1"]',
  ) as HTMLElement;
}

describe("CollectorPage NftCard dissolve-out (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedAuth();
    setDefaultQueries();
  });

  it("dissolves the card out while a delete is in flight", async () => {
    const user = userEvent.setup();
    // A claimed NFT: current owner is NOT the mint creator, so delete is shown.
    const nft = makeNft({
      id: 21n,
      title: "Claimed Art",
      creatorId: "someone-else",
      ownerId: { toText: () => "aaaaa-aa" } as never,
    });
    // A delete that never settles keeps the card in the in-flight window.
    const deleteMutation = mockMutation();
    deleteMutation.mutate.mockImplementation(() => new Promise(() => {}));
    queriesMock.useDeleteNft.mockReturnValue(deleteMutation);
    queriesMock.useMyNfts.mockReturnValue({ data: [nft] });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    renderCollectorPage();
    expect(card()).not.toBeNull();
    expect(card().getAttribute("data-dissolving")).toBeNull();

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

    await waitFor(() =>
      expect(card().getAttribute("data-dissolving")).toBe("delete"),
    );
    // The dissolve-out is the fade + scale-down treatment.
    expect(card().className).toContain("opacity-0");
    expect(card().className).toContain("scale-95");
  });

  it("dissolves the card out while a burn is in flight", async () => {
    const user = userEvent.setup();
    // A self-minted NFT: caller is the creator, so burn is available.
    const nft = makeNft({
      id: 22n,
      title: "Minted Art",
      creatorId: "aaaaa-aa",
      ownerId: { toText: () => "aaaaa-aa" } as never,
    });
    const burnMutation = mockMutation();
    burnMutation.mutate.mockImplementation(() => new Promise(() => {}));
    queriesMock.useBurnNft.mockReturnValue(burnMutation);
    queriesMock.useMyNfts.mockReturnValue({ data: [nft] });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    renderCollectorPage();

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
    const input = document.querySelector(
      '[data-ocid="collector.nft.burn_input.1"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "BURN" } });
    await user.click(
      document.querySelector(
        '[data-ocid="collector.nft.burn_confirm_button.1"]',
      ) as HTMLButtonElement,
    );

    await waitFor(() =>
      expect(card().getAttribute("data-dissolving")).toBe("burn"),
    );
    expect(card().className).toContain("opacity-0");
    expect(card().className).toContain("scale-95");
  });

  it("restores the card when the burn fails (rollback clears the dissolve)", async () => {
    const user = userEvent.setup();
    const nft = makeNft({
      id: 23n,
      title: "Survivor Art",
      creatorId: "aaaaa-aa",
      ownerId: { toText: () => "aaaaa-aa" } as never,
    });
    const burnMutation = mockMutation();
    burnMutation.mutate.mockImplementation(() =>
      Promise.reject(new Error("backend rejected")),
    );
    queriesMock.useBurnNft.mockReturnValue(burnMutation);
    queriesMock.useMyNfts.mockReturnValue({ data: [nft] });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });

    renderCollectorPage();

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
    const input = document.querySelector(
      '[data-ocid="collector.nft.burn_input.1"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "BURN" } });
    await user.click(
      document.querySelector(
        '[data-ocid="collector.nft.burn_confirm_button.1"]',
      ) as HTMLButtonElement,
    );

    // The rejected mutation clears the dissolve state, so the card is visible
    // again rather than stuck faded out.
    await waitFor(() =>
      expect(card().getAttribute("data-dissolving")).toBeNull(),
    );
    expect(card().className).toContain("opacity-100");
    expect(screen.getByText("Survivor Art")).toBeInTheDocument();
  });
});
