import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Characterization: listing-hook consumer contract ─────────────────────────
// The current request intentionally changes the LISTING ENDPOINTS: they gain
// offset/limit pagination parameters, and the frontend list hooks will be
// updated to pass them. This suite deliberately does NOT freeze the current
// no-argument call shape (that is the behavior being changed).
//
// It freezes the ADJACENT working behavior the pagination change must not
// disturb — the consumer contract every list surface depends on:
//   - useMyActiveNfts / useMyNfts still normalize the actor's response through
//     normalizeNFTResponse, so an {ok} variant unwraps to its array and an
//     {err} variant degrades to [] instead of throwing and blanking the grid;
//   - useSearchNfts still normalizes, drops null entries, and stays disabled
//     for a blank/whitespace term (no wasted backend call);
//   - useTotalNftCount still returns the actor's count — the confirmation read
//     the health fix will add is adjacent, and this hook must keep working.
//
// The real hooks are exercised; only the auth actor seam is mocked with typed
// local stubs.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
}));

// The hooks import only TYPES from @/backend plus the string enums. The real
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
}));

import {
  useMyActiveNfts,
  useMyNfts,
  useSearchNfts,
  useTotalNftCount,
} from "@/hooks/useQueries";

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

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("listing hooks normalize the actor response (pagination-adjacent contract)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useMyActiveNfts unwraps an {ok} variant to its array", async () => {
    const nft = makeNft({ id: 11n });
    const listMyActiveNfts = vi.fn(async () => ({ __kind__: "ok", ok: [nft] }));
    authMock.useAuth.mockReturnValue({ actor: { listMyActiveNfts } });

    const { result } = renderHook(() => useMyActiveNfts("alice"), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0]?.id).toBe(11n);
  });

  it("useMyActiveNfts degrades an {err} variant to [] instead of throwing", async () => {
    const listMyActiveNfts = vi.fn(async () => ({
      __kind__: "err",
      err: "boom",
    }));
    authMock.useAuth.mockReturnValue({ actor: { listMyActiveNfts } });

    const { result } = renderHook(() => useMyActiveNfts("alice"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it("useMyNfts unwraps an {ok} variant to its array", async () => {
    const nft = makeNft({ id: 12n });
    const listMyNfts = vi.fn(async () => ({ __kind__: "ok", ok: [nft] }));
    authMock.useAuth.mockReturnValue({ actor: { listMyNfts } });

    const { result } = renderHook(() => useMyNfts("alice"), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0]?.id).toBe(12n);
  });

  it("useMyNfts degrades an {err} variant to [] instead of throwing", async () => {
    const listMyNfts = vi.fn(async () => ({ __kind__: "err", err: "boom" }));
    authMock.useAuth.mockReturnValue({ actor: { listMyNfts } });

    const { result } = renderHook(() => useMyNfts("alice"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it("useSearchNfts normalizes and drops null entries", async () => {
    const nft = makeNft({ id: 13n });
    const searchNfts = vi.fn(async () => [nft, null, undefined]);
    authMock.useAuth.mockReturnValue({ actor: { searchNfts } });

    const { result } = renderHook(() => useSearchNfts("art", true), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0]?.id).toBe(13n);
  });

  it("useSearchNfts stays disabled for a blank/whitespace term", () => {
    const searchNfts = vi.fn(async () => []);
    authMock.useAuth.mockReturnValue({ actor: { searchNfts } });

    const blank = renderHook(() => useSearchNfts("   ", true), { wrapper });

    expect(blank.result.current.fetchStatus).toBe("idle");
    expect(searchNfts).not.toHaveBeenCalled();
  });

  it("useTotalNftCount returns the actor's count", async () => {
    const getTotalNftCount = vi.fn(async () => 42n);
    authMock.useAuth.mockReturnValue({ actor: { getTotalNftCount } });

    const { result } = renderHook(() => useTotalNftCount(), { wrapper });

    await waitFor(() => expect(result.current.data).toBe(42n));
    expect(getTotalNftCount).toHaveBeenCalledTimes(1);
  });
});
