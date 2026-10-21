import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Cover: delete/burn optimistic removal + invalidation ─────────────────────
// Accepted behavior:
//   - deleting or burning removes the card from BOTH ['myNfts'] and
//     ['myActiveNfts'] caches immediately (optimistic removal);
//   - a failed mutation rolls the card back into both caches;
//   - useDeleteNft / useBurnNft invalidate ['myNfts'] in addition to the
//     existing keys.
//
// The real hooks are exercised; only the auth actor seam and the notification
// sink are typed local mocks.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
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
}));

vi.mock("@/hooks/useNotifications", () => ({
  addNotification: notificationsMock.addNotification,
}));

import { useBurnNft, useDeleteNft } from "@/hooks/useQueries";

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

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function setActor(actor: Record<string, unknown>) {
  authMock.useAuth.mockReturnValue({ actor, principal: "aaaaa-aa" });
}

describe("delete/burn optimistic removal (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useDeleteNft removes the id from both ['myNfts'] and ['myActiveNfts'] caches", async () => {
    const queryClient = makeClient();
    const doomed = makeNft({ id: 7n, title: "Doomed" });
    const keeper = makeNft({ id: 8n, title: "Keeper" });
    queryClient.setQueryData(
      ["myNfts", "aaaaa-aa", 0n, 100n],
      [doomed, keeper],
    );
    queryClient.setQueryData(
      ["myActiveNfts", "aaaaa-aa", 0n, 100n],
      [doomed, keeper],
    );

    const deleteNft = vi.fn(async () => ({ __kind__: "ok" as const }));
    setActor({ deleteNft });

    const { result } = renderHook(() => useDeleteNft(), {
      wrapper: wrapperFor(queryClient),
    });
    await result.current.mutateAsync(7n);

    const myNfts = queryClient.getQueryData<Nft[]>([
      "myNfts",
      "aaaaa-aa",
      0n,
      100n,
    ]);
    const myActive = queryClient.getQueryData<Nft[]>([
      "myActiveNfts",
      "aaaaa-aa",
      0n,
      100n,
    ]);
    expect(myNfts?.map((n) => n.id)).toEqual([8n]);
    expect(myActive?.map((n) => n.id)).toEqual([8n]);
  });

  it("useBurnNft removes the id from both caches", async () => {
    const queryClient = makeClient();
    const doomed = makeNft({ id: 9n, title: "Burning" });
    queryClient.setQueryData(["myNfts", "aaaaa-aa", 0n, 100n], [doomed]);
    queryClient.setQueryData(["myActiveNfts", "aaaaa-aa", 0n, 100n], [doomed]);

    const burnNft = vi.fn(async () => ({ __kind__: "ok" as const }));
    setActor({ burnNft });

    const { result } = renderHook(() => useBurnNft(), {
      wrapper: wrapperFor(queryClient),
    });
    await result.current.mutateAsync(9n);

    expect(
      queryClient.getQueryData<Nft[]>(["myNfts", "aaaaa-aa", 0n, 100n]),
    ).toEqual([]);
    expect(
      queryClient.getQueryData<Nft[]>(["myActiveNfts", "aaaaa-aa", 0n, 100n]),
    ).toEqual([]);
  });

  it("rolls the card back into both caches when delete fails", async () => {
    const queryClient = makeClient();
    const survivor = makeNft({ id: 7n, title: "Survivor" });
    queryClient.setQueryData(["myNfts", "aaaaa-aa", 0n, 100n], [survivor]);
    queryClient.setQueryData(
      ["myActiveNfts", "aaaaa-aa", 0n, 100n],
      [survivor],
    );

    const deleteNft = vi.fn(async () => {
      throw new Error("backend rejected");
    });
    setActor({ deleteNft });

    const { result } = renderHook(() => useDeleteNft(), {
      wrapper: wrapperFor(queryClient),
    });
    await expect(result.current.mutateAsync(7n)).rejects.toThrow(
      "backend rejected",
    );

    await waitFor(() => {
      expect(
        queryClient.getQueryData<Nft[]>(["myNfts", "aaaaa-aa", 0n, 100n]),
      ).toHaveLength(1);
      expect(
        queryClient.getQueryData<Nft[]>(["myActiveNfts", "aaaaa-aa", 0n, 100n]),
      ).toHaveLength(1);
    });
  });

  it("rolls the card back into both caches when burn fails", async () => {
    const queryClient = makeClient();
    const survivor = makeNft({ id: 9n, title: "Survivor" });
    queryClient.setQueryData(["myNfts", "aaaaa-aa", 0n, 100n], [survivor]);
    queryClient.setQueryData(
      ["myActiveNfts", "aaaaa-aa", 0n, 100n],
      [survivor],
    );

    const burnNft = vi.fn(async () => {
      throw new Error("already burned");
    });
    setActor({ burnNft });

    const { result } = renderHook(() => useBurnNft(), {
      wrapper: wrapperFor(queryClient),
    });
    await expect(result.current.mutateAsync(9n)).rejects.toThrow(
      "already burned",
    );

    await waitFor(() => {
      expect(
        queryClient.getQueryData<Nft[]>(["myNfts", "aaaaa-aa", 0n, 100n]),
      ).toHaveLength(1);
      expect(
        queryClient.getQueryData<Nft[]>(["myActiveNfts", "aaaaa-aa", 0n, 100n]),
      ).toHaveLength(1);
    });
  });

  it("useDeleteNft invalidates ['myNfts'] in addition to the existing keys", async () => {
    const queryClient = makeClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const deleteNft = vi.fn(async () => ({ __kind__: "ok" as const }));
    setActor({ deleteNft });

    const { result } = renderHook(() => useDeleteNft(), {
      wrapper: wrapperFor(queryClient),
    });
    await result.current.mutateAsync(7n);

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) =>
      JSON.stringify(call[0]?.queryKey),
    );
    expect(invalidatedKeys).toContain(JSON.stringify(["myNfts"]));
    expect(invalidatedKeys).toContain(JSON.stringify(["myActiveNfts"]));
  });

  it("useBurnNft invalidates ['myNfts'] in addition to the existing keys", async () => {
    const queryClient = makeClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const burnNft = vi.fn(async () => ({ __kind__: "ok" as const }));
    setActor({ burnNft });

    const { result } = renderHook(() => useBurnNft(), {
      wrapper: wrapperFor(queryClient),
    });
    await result.current.mutateAsync(9n);

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) =>
      JSON.stringify(call[0]?.queryKey),
    );
    expect(invalidatedKeys).toContain(JSON.stringify(["myNfts"]));
    expect(invalidatedKeys).toContain(JSON.stringify(["myActiveNfts"]));
  });
});
