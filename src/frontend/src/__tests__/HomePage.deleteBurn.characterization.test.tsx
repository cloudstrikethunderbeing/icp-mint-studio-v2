import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Characterization: HomePage delete/burn mutation wiring ───────────────────
// The current request intentionally changes HomePage's delete/burn mutations:
// they gain optimistic removal from ["myNfts"] and bounded delayed invalidate
// passes, and the card is expected to leave the grid immediately. That new
// removal behavior is NOT frozen here (the current code only updates the
// prefix key ["myActiveNfts"], which does not match the paginated query key).
//
// This suite freezes the ADJACENT working behavior the change must preserve:
//   - deleting an NFT calls actor.deleteNft with the NFT id;
//   - burning an NFT calls actor.burnNft with the NFT id;
//   - a failed delete keeps the card in the grid and records a critical
//     notification (no phantom removal).
//
// The REAL useMyActiveNfts hook is exercised (only the actor seam is a typed
// local mock) so the grid renders from the same query cache the mutation
// touches.

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
// real implementation so the mutation's cache update is exercised end-to-end.
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
    isError: false,
  });
  queriesMock.useCollections.mockReturnValue({ data: [], isLoading: false });
  queriesMock.useAddNftToCollection.mockReturnValue(mockMutation());
  queriesMock.useRemoveNftFromCollection.mockReturnValue(mockMutation());
  queriesMock.useUpdateMetadata.mockReturnValue(mockMutation());
  queriesMock.useGetClaimStatus.mockReturnValue({ data: null });
}

function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>,
  );
}

async function openCardAndDelete(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
) {
  await user.click(await screen.findByLabelText(`View NFT: ${title}`));
  await user.click(
    document.querySelector(
      '[data-ocid="nft_detail.delete_button"]',
    ) as HTMLButtonElement,
  );
  await user.click(
    document.querySelector(
      '[data-ocid="nft_detail.confirm_delete_button"]',
    ) as HTMLButtonElement,
  );
}

describe("HomePage delete/burn mutation wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultQueries();
  });

  it("calls actor.deleteNft with the NFT id when delete is confirmed", async () => {
    const user = userEvent.setup();
    const nft = makeNft({ id: 5n, title: "Doomed Art" });
    const listMyActiveNfts = vi.fn(async () => [nft]);
    const deleteNft = vi.fn(async () => ({ __kind__: "ok" as const }));
    authMock.useAuth.mockReturnValue({
      isAuthenticated: true,
      principal: "aaaaa-aa",
      authState: "ready",
      isAdmin: false,
      isAdminLoading: false,
      actor: { listMyActiveNfts, deleteNft },
    });

    renderHomePage();
    expect(await screen.findByAltText("Doomed Art")).toBeInTheDocument();

    await openCardAndDelete(user, "Doomed Art");

    await waitFor(() => expect(deleteNft).toHaveBeenCalledWith(5n));
    await waitFor(() =>
      expect(notificationsMock.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "info", title: "NFT Deleted" }),
      ),
    );
  });

  it("calls actor.burnNft with the NFT id when burn is confirmed", async () => {
    const user = userEvent.setup();
    const nft = makeNft({ id: 6n, title: "Burning Art" });
    const listMyActiveNfts = vi.fn(async () => [nft]);
    const burnNft = vi.fn(async () => ({ __kind__: "ok" as const }));
    authMock.useAuth.mockReturnValue({
      isAuthenticated: true,
      principal: "aaaaa-aa",
      authState: "ready",
      isAdmin: false,
      isAdminLoading: false,
      actor: { listMyActiveNfts, burnNft },
    });

    renderHomePage();
    expect(await screen.findByAltText("Burning Art")).toBeInTheDocument();

    await user.click(await screen.findByLabelText("View NFT: Burning Art"));
    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.burn_button"]',
      ) as HTMLButtonElement,
    );
    const input = document.querySelector(
      '[data-ocid="nft_detail.burn_confirm_input"]',
    ) as HTMLInputElement;
    await user.type(input, "BURN");
    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.confirm_burn_button"]',
      ) as HTMLButtonElement,
    );

    await waitFor(() => expect(burnNft).toHaveBeenCalledWith(6n));
    await waitFor(() =>
      expect(notificationsMock.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "warning", title: "NFT Burned" }),
      ),
    );
  });

  it("keeps the card and records a critical notification when delete fails", async () => {
    const user = userEvent.setup();
    const nft = makeNft({ id: 7n, title: "Survivor Art" });
    const listMyActiveNfts = vi.fn(async () => [nft]);
    const deleteNft = vi.fn(async () => {
      throw new Error("backend rejected");
    });
    authMock.useAuth.mockReturnValue({
      isAuthenticated: true,
      principal: "aaaaa-aa",
      authState: "ready",
      isAdmin: false,
      isAdminLoading: false,
      actor: { listMyActiveNfts, deleteNft },
    });

    renderHomePage();
    expect(await screen.findByAltText("Survivor Art")).toBeInTheDocument();

    await openCardAndDelete(user, "Survivor Art");

    await waitFor(() => expect(deleteNft).toHaveBeenCalledWith(7n));
    await waitFor(() =>
      expect(notificationsMock.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "critical", title: "Delete Failed" }),
      ),
    );
    // The failed delete must not remove the card.
    expect(screen.getByAltText("Survivor Art")).toBeInTheDocument();
  });
});
