import type { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Cover: admin ownership-reassignment consumer contract ────────────────────
// The accepted change adds an admin-only reassignment path:
//   - useAdminReassignOwner({ id, newOwner }) parses the target with
//     Principal.fromText and calls actor.adminReassignOwner(id, principal);
//   - useAdminReassignOwnerBatch({ ids, newOwner }) calls
//     actor.adminReassignOwnerBatch(ids, principal);
//   - useAdminReassignAllOwned({ newOwner }) pages the caller's own listMyNfts
//     to collect every owned id, then issues ONE adminReassignOwnerBatch call.
//
// The real hooks are exercised; only the auth actor seam and the notification
// sink are typed local mocks. The backend admin gate and the in-place
// ownerId-only rewrite are backend behaviors this mocked suite cannot vouch for
// (recorded as coverage limits).

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const notificationsMock = vi.hoisted(() => ({
  addNotification: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
}));

// The hook imports only TYPES from @/backend plus the string enums. The real
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

vi.mock("@/hooks/useNotifications", () => ({
  addNotification: notificationsMock.addNotification,
}));

import {
  useAdminReassignAllOwned,
  useAdminReassignOwner,
  useAdminReassignOwnerBatch,
} from "@/hooks/useQueries";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function setActor(actor: Record<string, unknown> | null) {
  authMock.useAuth.mockReturnValue({ actor, principal: "aaaaa-aa" });
}

// A structurally valid principal text the app's own Principal.fromText accepts.
const TARGET = "2vxsx-fae";

describe("admin reassignment hooks consumer contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useAdminReassignOwner parses the target and calls actor.adminReassignOwner(id, principal)", async () => {
    const adminReassignOwner = vi.fn(
      async (id: bigint, _newOwner: Principal) => ({
        id,
        ok: true,
      }),
    );
    setActor({ adminReassignOwner });

    const { result } = renderHook(() => useAdminReassignOwner(), { wrapper });
    await expect(
      result.current.mutateAsync({ id: 7n, newOwner: TARGET }),
    ).resolves.toMatchObject({ id: 7n, ok: true });

    expect(adminReassignOwner).toHaveBeenCalledTimes(1);
    const [calledId, calledPrincipal] = adminReassignOwner.mock.calls[0];
    expect(calledId).toBe(7n);
    // The target string is converted to a Principal before the call.
    expect(calledPrincipal.toText()).toBe(TARGET);
  });

  it("useAdminReassignOwnerBatch calls actor.adminReassignOwnerBatch(ids, principal) once", async () => {
    const adminReassignOwnerBatch = vi.fn(
      async (ids: bigint[], _newOwner: Principal) =>
        ids.map((id) => ({ id, ok: true })),
    );
    setActor({ adminReassignOwnerBatch });

    const { result } = renderHook(() => useAdminReassignOwnerBatch(), {
      wrapper,
    });
    const results = await result.current.mutateAsync({
      ids: [1n, 2n, 3n],
      newOwner: TARGET,
    });

    expect(results).toHaveLength(3);
    expect(adminReassignOwnerBatch).toHaveBeenCalledTimes(1);
    const [calledIds, calledPrincipal] = adminReassignOwnerBatch.mock.calls[0];
    expect(calledIds).toEqual([1n, 2n, 3n]);
    expect(calledPrincipal.toText()).toBe(TARGET);
  });

  it("useAdminReassignAllOwned pages listMyNfts then issues one batch call with every owned id", async () => {
    // The hook pages in blocks of 100 and stops once it has collected `total`
    // ids. A library larger than one page (total 101) forces a second read; the
    // hook must collect all 101 ids and make exactly one batch call.
    const firstPageIds = Array.from({ length: 100 }, (_, i) => ({
      id: BigInt(i + 1),
    }));
    const listMyNfts = vi.fn(async (offset: bigint) => {
      if (offset === 0n) {
        return { items: firstPageIds, total: 101n, offset: 0n, limit: 100n };
      }
      return { items: [{ id: 101n }], total: 101n, offset: 100n, limit: 100n };
    });
    const adminReassignOwnerBatch = vi.fn(
      async (ids: bigint[], _newOwner: Principal) =>
        ids.map((id) => ({ id, ok: true })),
    );
    setActor({ listMyNfts, adminReassignOwnerBatch });

    const { result } = renderHook(() => useAdminReassignAllOwned(), {
      wrapper,
    });
    const results = await result.current.mutateAsync({ newOwner: TARGET });

    expect(results).toHaveLength(101);
    expect(results[0]?.id).toBe(1n);
    expect(results[100]?.id).toBe(101n);
    expect(listMyNfts).toHaveBeenCalledTimes(2);
    expect(adminReassignOwnerBatch).toHaveBeenCalledTimes(1);
    expect(adminReassignOwnerBatch.mock.calls[0][0]).toHaveLength(101);
    expect(adminReassignOwnerBatch.mock.calls[0][1]?.toText()).toBe(TARGET);
  });

  it("useAdminReassignAllOwned makes no batch call when the caller owns nothing", async () => {
    const listMyNfts = vi.fn(async () => ({
      items: [],
      total: 0n,
      offset: 0n,
      limit: 100n,
    }));
    const adminReassignOwnerBatch = vi.fn(async () => []);
    setActor({ listMyNfts, adminReassignOwnerBatch });

    const { result } = renderHook(() => useAdminReassignAllOwned(), {
      wrapper,
    });
    await expect(
      result.current.mutateAsync({ newOwner: TARGET }),
    ).resolves.toEqual([]);
    expect(adminReassignOwnerBatch).not.toHaveBeenCalled();
  });

  it("rejects an invalid target principal before calling the backend", async () => {
    const adminReassignOwner = vi.fn(async () => ({ id: 1n, ok: true }));
    setActor({ adminReassignOwner });

    const { result } = renderHook(() => useAdminReassignOwner(), { wrapper });
    await expect(
      result.current.mutateAsync({ id: 1n, newOwner: "not-a-principal" }),
    ).rejects.toThrow();
    expect(adminReassignOwner).not.toHaveBeenCalled();
  });

  it("rejects when no actor is available instead of calling the backend", async () => {
    setActor(null);

    const { result } = renderHook(() => useAdminReassignOwner(), { wrapper });
    await expect(
      result.current.mutateAsync({ id: 1n, newOwner: TARGET }),
    ).rejects.toThrow("Not authenticated");
  });

  it("surfaces a per-id failure result from the batch call without throwing", async () => {
    const adminReassignOwnerBatch = vi.fn(async (ids: bigint[]) =>
      ids.map((id) =>
        id === 2n
          ? { id, ok: false, error: "NFT not found" }
          : { id, ok: true },
      ),
    );
    setActor({ adminReassignOwnerBatch });

    const { result } = renderHook(() => useAdminReassignOwnerBatch(), {
      wrapper,
    });
    const results = await result.current.mutateAsync({
      ids: [1n, 2n],
      newOwner: TARGET,
    });

    await waitFor(() => expect(results).toHaveLength(2));
    expect(results[0]).toMatchObject({ id: 1n, ok: true });
    expect(results[1]).toMatchObject({
      id: 2n,
      ok: false,
      error: "NFT not found",
    });
  });
});
