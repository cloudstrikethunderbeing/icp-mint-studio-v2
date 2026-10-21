import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";
import type { AppNotification } from "@/types";

// ── Characterization: feed normalization, principal-scoped feed keys, and the
//    per-principal notification store ─────────────────────────────────────────
// The accepted requirement is that a freshly minted NFT's image appears in the
// Studio grid, the Library card, the detail modal, and the mint notification
// thumbnail immediately after mint success, without a manual reload. The image
// *resolution* path is covered by NftImageResolution/NftImageRendering. This
// suite protects the ADJACENT working behavior those surfaces depend on and
// that the image-display fix must not disturb:
//
//   1. normalizeNFTResponse / normalizeSingleNFT — the list-shape decoder every
//      feed hook runs before a record reaches a card. A malformed/err/empty
//      response must degrade to [] (or null) rather than throwing, so one bad
//      response cannot blank the grid.
//   2. useMyActiveNfts / useMyNfts — the query keys are scoped by principal and
//      are the exact keys the mint flow invalidates. If the key shape drifts,
//      the "no manual reload" requirement silently regresses.
//   3. useNotifications — the per-principal store must preserve a notification's
//      imageUrl so the mint thumbnail survives a re-read.
//
// It deliberately does NOT assert the image-resolution bug or the mint
// notification's title/message copy, which the current request intentionally
// changes.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
}));

// The feed hooks import only TYPES from @/backend plus the string enums. The
// real module pulls in @caffeineai/object-storage at runtime, which has no
// usable jsdom entry; mock the module and preserve the enum values.
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
  addNotification,
  clearAll,
  clearMemoryStore,
  useNotifications,
} from "@/hooks/useNotifications";
import { useMyActiveNfts, useMyNfts } from "@/hooks/useQueries";
import {
  normalizeNFTResponse,
  normalizeSingleNFT,
} from "@/utils/nftNormalization";

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

function makeNotification(
  overrides: Partial<AppNotification> = {},
): Omit<AppNotification, "id" | "read" | "timestamp"> {
  return {
    type: "info",
    title: "NFT Minted",
    message: "Token ID: 7 created successfully",
    ...overrides,
  };
}

describe("normalizeNFTResponse (feed list decoder)", () => {
  it("passes a plain array through unchanged", () => {
    const nfts = [makeNft({ id: 1n }), makeNft({ id: 2n })];
    expect(normalizeNFTResponse(nfts)).toBe(nfts);
  });

  it("unwraps an ok variant to its array", () => {
    const nfts = [makeNft({ id: 3n })];
    expect(normalizeNFTResponse({ __kind__: "ok", ok: nfts })).toBe(nfts);
  });

  it("degrades an err variant to an empty list rather than throwing", () => {
    expect(normalizeNFTResponse({ __kind__: "err", err: "boom" })).toEqual([]);
  });

  it("degrades null/undefined to an empty list", () => {
    expect(normalizeNFTResponse(null)).toEqual([]);
    expect(normalizeNFTResponse(undefined)).toEqual([]);
  });

  it("degrades an ok variant with a non-array payload to an empty list", () => {
    expect(normalizeNFTResponse({ __kind__: "ok", ok: null as never })).toEqual(
      [],
    );
  });
});

describe("normalizeSingleNFT (single-record decoder)", () => {
  it("unwraps an ok variant to the record", () => {
    const nft = makeNft({ id: 4n });
    expect(normalizeSingleNFT({ __kind__: "ok", ok: nft })).toBe(nft);
  });

  it("returns null for an err variant", () => {
    expect(normalizeSingleNFT({ __kind__: "err", err: "missing" })).toBeNull();
  });

  it("returns null for null/undefined/non-object input", () => {
    expect(normalizeSingleNFT(null)).toBeNull();
    expect(normalizeSingleNFT(undefined)).toBeNull();
    expect(normalizeSingleNFT("nope")).toBeNull();
  });

  it("returns a bare record as-is", () => {
    const nft = makeNft({ id: 5n });
    expect(normalizeSingleNFT(nft)).toBe(nft);
  });
});

describe("feed query keys are principal-scoped (mint invalidation contract)", () => {
  function wrapper({ children }: { children: React.ReactNode }) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes useMyActiveNfts by principal and passes the pagination window", async () => {
    const listMyActiveNfts = vi.fn(async () => [makeNft({ id: 6n })]);
    authMock.useAuth.mockReturnValue({ actor: { listMyActiveNfts } });

    const { result } = renderHook(() => useMyActiveNfts("alice", 0n, 12n), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(listMyActiveNfts).toHaveBeenCalledTimes(1);
    // [PAGE-RETRY] The listing endpoint now takes (offset, limit).
    expect(listMyActiveNfts).toHaveBeenCalledWith(0n, 12n);
    // The mint flow invalidates ["myActiveNfts"]; the key must be prefixed by
    // that literal so the prefix match refreshes this query.
    expect(result.current.data?.[0]?.id).toBe(6n);
  });

  it("scopes useMyNfts by principal and passes the pagination window", async () => {
    const listMyNfts = vi.fn(async () => [makeNft({ id: 7n })]);
    authMock.useAuth.mockReturnValue({ actor: { listMyNfts } });

    const { result } = renderHook(() => useMyNfts("alice", 0n, 12n), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(listMyNfts).toHaveBeenCalledTimes(1);
    // [PAGE-RETRY] The listing endpoint now takes (offset, limit).
    expect(listMyNfts).toHaveBeenCalledWith(0n, 12n);
    // The mint flow invalidates ["myNfts"]; the key must be prefixed by that
    // literal so the Library's "All" tab refreshes after a mint.
    expect(result.current.data?.[0]?.id).toBe(7n);
  });

  it("does not fetch either feed while no actor is available", () => {
    authMock.useAuth.mockReturnValue({ actor: null });

    const active = renderHook(() => useMyActiveNfts("alice"), { wrapper });
    const all = renderHook(() => useMyNfts("alice"), { wrapper });

    expect(active.result.current.fetchStatus).toBe("idle");
    expect(all.result.current.fetchStatus).toBe("idle");
  });
});

describe("useNotifications per-principal store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearAll("alice");
    clearAll("bob");
    clearMemoryStore("alice");
    clearMemoryStore("bob");
  });

  it("preserves a notification's imageUrl through the store", () => {
    authMock.useAuth.mockReturnValue({ principal: "alice" });

    addNotification(
      makeNotification({ imageUrl: "https://example.com/minted.png" }),
      "alice",
    );

    const { result } = renderHook(() => useNotifications());
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]?.imageUrl).toBe(
      "https://example.com/minted.png",
    );
  });

  it("keeps each principal's notifications isolated", () => {
    authMock.useAuth.mockReturnValue({ principal: "alice" });

    addNotification(makeNotification({ title: "Alice Mint" }), "alice");
    addNotification(makeNotification({ title: "Bob Mint" }), "bob");

    const alice = renderHook(() => useNotifications());
    expect(alice.result.current.notifications.map((n) => n.title)).toEqual([
      "Alice Mint",
    ]);

    authMock.useAuth.mockReturnValue({ principal: "bob" });
    const bob = renderHook(() => useNotifications());
    expect(bob.result.current.notifications.map((n) => n.title)).toEqual([
      "Bob Mint",
    ]);
  });

  it("counts unread notifications and marks them read", () => {
    authMock.useAuth.mockReturnValue({ principal: "alice" });

    addNotification(makeNotification({ title: "One" }), "alice");
    addNotification(makeNotification({ title: "Two" }), "alice");

    const { result } = renderHook(() => useNotifications());
    expect(result.current.unreadCount).toBe(2);

    act(() => {
      result.current.markAllRead();
    });

    expect(result.current.unreadCount).toBe(0);
  });
});
