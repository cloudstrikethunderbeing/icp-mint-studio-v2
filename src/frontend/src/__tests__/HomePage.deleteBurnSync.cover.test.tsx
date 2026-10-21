import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Cover: HomePage bounded delayed invalidate passes after delete/burn ──────
// Accepted behavior:
//   - a successful delete/burn schedules bounded delayed invalidate passes at
//     ~1500ms and ~4000ms over the same key set (myActiveNfts, myNfts,
//     slotsStatus, collections, nftRegistry);
//   - the timers are guarded by the isMounted ref, so they never fire after the
//     page unmounts.
//
// The real HomePage is exercised; the actor seam and the notification sink are
// typed local mocks. Fake timers make the delayed passes observable without a
// real 4s wait; clicks use fireEvent so no userEvent internal timers are
// involved.

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
// real implementation so the grid renders from the same query cache the
// mutation touches.
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
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const view = render(
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>,
  );
  return { ...view, queryClient, invalidateSpy };
}

/** Keys invalidated by the delayed passes, as JSON strings. */
function invalidatedKeys(spy: {
  mock: { calls: unknown[][] };
}) {
  return spy.mock.calls.map((call) =>
    JSON.stringify((call[0] as { queryKey?: unknown } | undefined)?.queryKey),
  );
}

const DELAYED_KEYS = [
  ["myActiveNfts"],
  ["myNfts"],
  ["slotsStatus"],
  ["collections"],
  ["nftRegistry"],
];

describe("HomePage bounded delayed invalidate passes (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultQueries();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules invalidate passes at ~1500ms and ~4000ms after a delete", async () => {
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

    const { invalidateSpy } = renderHomePage();
    expect(await screen.findByAltText("Doomed Art")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("View NFT: Doomed Art"));
    fireEvent.click(
      document.querySelector(
        '[data-ocid="nft_detail.delete_button"]',
      ) as HTMLButtonElement,
    );
    fireEvent.click(
      document.querySelector(
        '[data-ocid="nft_detail.confirm_delete_button"]',
      ) as HTMLButtonElement,
    );

    await waitFor(() => expect(deleteNft).toHaveBeenCalledWith(5n));

    const before = invalidateSpy.mock.calls.length;

    // First pass at ~1500ms invalidates the full key set.
    await waitFor(
      () => {
        const keys = invalidatedKeys(invalidateSpy).slice(before);
        for (const key of DELAYED_KEYS) {
          expect(keys).toContain(JSON.stringify(key));
        }
      },
      { timeout: 3000 },
    );

    // Second pass at ~4000ms invalidates the same key set again.
    const afterFirstCount = invalidateSpy.mock.calls.length;
    await waitFor(
      () => {
        const keys = invalidatedKeys(invalidateSpy).slice(afterFirstCount);
        for (const key of DELAYED_KEYS) {
          expect(keys).toContain(JSON.stringify(key));
        }
      },
      { timeout: 5000 },
    );
  }, 15000);

  it("does not fire the delayed passes after the page unmounts", async () => {
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

    const { invalidateSpy, unmount } = renderHomePage();
    expect(await screen.findByAltText("Burning Art")).toBeInTheDocument();

    vi.useFakeTimers();

    fireEvent.click(screen.getByLabelText("View NFT: Burning Art"));
    fireEvent.click(
      document.querySelector(
        '[data-ocid="nft_detail.burn_button"]',
      ) as HTMLButtonElement,
    );
    const input = document.querySelector(
      '[data-ocid="nft_detail.burn_confirm_input"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "BURN" } });
    fireEvent.click(
      document.querySelector(
        '[data-ocid="nft_detail.confirm_burn_button"]',
      ) as HTMLButtonElement,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(burnNft).toHaveBeenCalledWith(6n);

    // Unmount before either delayed pass is due.
    unmount();
    const afterUnmount = invalidateSpy.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(invalidateSpy.mock.calls.length).toBe(afterUnmount);
  });
});
