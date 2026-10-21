import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Characterization: delete/burn mutation consumer contract ─────────────────
// The current request intentionally changes these hooks: they gain optimistic
// cache removal and an additional ["myNfts"] invalidation. That new behavior is
// NOT frozen here.
//
// This suite freezes the ADJACENT working contract every caller depends on:
//   - useDeleteNft calls actor.deleteNft(id) and resolves on an {ok} result;
//   - useBurnNft calls actor.burnNft(id) and resolves on an {ok} result;
//   - an {err} result rejects the mutation (so callers can roll back / notify);
//   - a successful delete/burn records an info/warning notification;
//   - a failed delete/burn records a critical notification.
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

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function setActor(actor: Record<string, unknown>) {
  authMock.useAuth.mockReturnValue({ actor, principal: "aaaaa-aa" });
}

describe("delete/burn mutation consumer contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useDeleteNft calls actor.deleteNft and resolves on an {ok} result", async () => {
    const deleteNft = vi.fn(async () => ({ __kind__: "ok" as const }));
    setActor({ deleteNft });

    const { result } = renderHook(() => useDeleteNft(), { wrapper });
    await result.current.mutateAsync(7n);

    expect(deleteNft).toHaveBeenCalledWith(7n);
    await waitFor(() =>
      expect(notificationsMock.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "info", title: "NFT Deleted" }),
        "aaaaa-aa",
      ),
    );
  });

  it("useDeleteNft rejects on an {err} result and records a critical notification", async () => {
    const deleteNft = vi.fn(async () => ({
      __kind__: "err" as const,
      err: "not owner",
    }));
    setActor({ deleteNft });

    const { result } = renderHook(() => useDeleteNft(), { wrapper });
    await expect(result.current.mutateAsync(7n)).rejects.toThrow("not owner");

    await waitFor(() =>
      expect(notificationsMock.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "critical", title: "Delete Failed" }),
        "aaaaa-aa",
      ),
    );
  });

  it("useBurnNft calls actor.burnNft and resolves on an {ok} result", async () => {
    const burnNft = vi.fn(async () => ({ __kind__: "ok" as const }));
    setActor({ burnNft });

    const { result } = renderHook(() => useBurnNft(), { wrapper });
    await result.current.mutateAsync(9n);

    expect(burnNft).toHaveBeenCalledWith(9n);
    await waitFor(() =>
      expect(notificationsMock.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "info", title: "NFT Burned" }),
        "aaaaa-aa",
      ),
    );
  });

  it("useBurnNft rejects on an {err} result and records a critical notification", async () => {
    const burnNft = vi.fn(async () => ({
      __kind__: "err" as const,
      err: "already burned",
    }));
    setActor({ burnNft });

    const { result } = renderHook(() => useBurnNft(), { wrapper });
    await expect(result.current.mutateAsync(9n)).rejects.toThrow(
      "already burned",
    );

    await waitFor(() =>
      expect(notificationsMock.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "critical", title: "Burn Failed" }),
        "aaaaa-aa",
      ),
    );
  });
});
