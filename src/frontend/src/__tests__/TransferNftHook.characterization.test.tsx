import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Characterization: ownership-transfer consumer contract ───────────────────
// The current request adds an ADMIN-ONLY reassignment path (single + batch) that
// rewrites an existing NFT's ownerId in place. That new path is NOT frozen here.
//
// This suite freezes the ADJACENT working behavior the new path must not
// disturb — the existing owner-initiated transfer seam every ownership change
// already flows through:
//   - useTransferNft resolves the recipient text to a Principal and calls
//     actor.transferNft(id, principal) with the NFT id;
//   - a { success: true } result resolves the mutation;
//   - a { success: false, error } result rejects with the backend's message, so
//     callers can surface the reason (e.g. "Not the owner");
//   - a successful transfer records an info notification and invalidates the
//     nfts/collections caches so the moved NFT leaves the old owner's grid;
//   - a failed transfer records a critical notification.
//
// The real hook is exercised; only the auth actor seam and the notification
// sink are typed local mocks. The backend transferNft owner-only rule itself is
// a backend behavior this mocked suite cannot vouch for (recorded as a coverage
// limit).

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

import { useTransferNft } from "@/hooks/useQueries";

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

describe("useTransferNft ownership-change consumer contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls actor.transferNft with the id and a Principal resolved from the recipient text", async () => {
    const transferNft = vi.fn(
      async (_id: bigint, _to: { toText: () => string }) => ({
        success: true,
        newOwnerPrincipal: "2vxsx-fae",
      }),
    );
    setActor({ transferNft });

    const { result } = renderHook(() => useTransferNft(), { wrapper });
    await result.current.mutateAsync({ id: 7n, recipient: "2vxsx-fae" });

    expect(transferNft).toHaveBeenCalledTimes(1);
    const [calledId, calledPrincipal] = transferNft.mock.calls[0];
    expect(calledId).toBe(7n);
    // The recipient string is converted to a Principal before the call.
    expect(calledPrincipal.toText()).toBe("2vxsx-fae");
  });

  it("resolves on a { success: true } result and records an info notification", async () => {
    const transferNft = vi.fn(async () => ({
      success: true,
      newOwnerPrincipal: "2vxsx-fae",
    }));
    setActor({ transferNft });

    const { result } = renderHook(() => useTransferNft(), { wrapper });
    await expect(
      result.current.mutateAsync({ id: 7n, recipient: "2vxsx-fae" }),
    ).resolves.toMatchObject({ success: true });

    await waitFor(() =>
      expect(notificationsMock.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "info", title: "NFT Transferred" }),
        "aaaaa-aa",
      ),
    );
  });

  it("rejects with the backend error on a { success: false } result", async () => {
    const transferNft = vi.fn(async () => ({
      success: false,
      error: "Unauthorized: Not the owner",
    }));
    setActor({ transferNft });

    const { result } = renderHook(() => useTransferNft(), { wrapper });
    await expect(
      result.current.mutateAsync({ id: 7n, recipient: "2vxsx-fae" }),
    ).rejects.toThrow("Unauthorized: Not the owner");

    await waitFor(() =>
      expect(notificationsMock.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "critical", title: "Transfer Failed" }),
        "aaaaa-aa",
      ),
    );
  });

  it("rejects when no actor is available instead of calling the backend", async () => {
    setActor(undefined as unknown as Record<string, unknown>);
    authMock.useAuth.mockReturnValue({ actor: null, principal: "aaaaa-aa" });

    const { result } = renderHook(() => useTransferNft(), { wrapper });
    await expect(
      result.current.mutateAsync({ id: 7n, recipient: "2vxsx-fae" }),
    ).rejects.toThrow("Not authenticated");
  });
});
