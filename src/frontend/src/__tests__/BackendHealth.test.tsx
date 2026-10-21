import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Characterization: useBackendHealth preserved branches ────────────────────
// useBackendHealth is the rotation/empty-catalog guard that every NFT surface
// depends on. The current request intentionally changes ONE branch of it: the
// "empty" detection (today it only flags 'empty' after a non-zero count was
// observed in the same session; it will be strengthened so an unexpectedly
// empty catalog surfaces a clear error). This suite deliberately does NOT
// freeze that empty-detection policy.
//
// It freezes the ADJACENT working behavior that must survive the change:
//   - a canister mismatch (actor reports a different ID than /env.json) yields
//     'wrong-canister' with both IDs, never a silent empty catalog;
//   - a failure to resolve /env.json yields 'unavailable' with the reason;
//   - an empty/blank resolved ID yields 'unavailable' (never a silent ok);
//   - a reachable, matching backend with NFTs yields 'ok';
//   - an anonymous caller (no actor) trusts the validated /env.json ID and
//     yields 'ok' without calling the actor.
// The real hook is exercised; only its two seams (env resolution and the auth
// actor) are mocked with typed local stubs.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const canistersMock = vi.hoisted(() => ({
  getBackendCanisterId: vi.fn(),
  validateCanisterId: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
}));

// useQueries imports getBackendCanisterId from @/config/env and
// validateCanisterId from @/config/canisters. Mock BOTH modules so the hook's
// env seam is controllable without touching /env.json or the network. Mocking
// only @/config/canisters left getBackendCanisterId resolving to the real
// /env.json fetch, which fails in jsdom.
vi.mock("@/config/env", () => ({
  getBackendCanisterId: canistersMock.getBackendCanisterId,
}));

vi.mock("@/config/canisters", () => ({
  validateCanisterId: canistersMock.validateCanisterId,
}));

import { useBackendHealth } from "@/hooks/useQueries";

// A minimal typed actor stub exposing only the two methods useBackendHealth
// calls. The hook's actor is typed as backendInterface | null; the stub is
// cast at the seam so the test stays honest about which methods it exercises.
function makeActor(overrides: {
  getCanisterIdSafe?: () => Promise<string>;
  getTotalNftCount?: () => Promise<bigint>;
  getTotalNftCountCertified?: () => Promise<bigint>;
}) {
  return {
    getCanisterIdSafe:
      overrides.getCanisterIdSafe ?? (async () => "backend-canister"),
    getTotalNftCount: overrides.getTotalNftCount ?? (async () => 0n),
    // [PAGE-RETRY] The second independent confirmation read. Defaults to the
    // same zero as getTotalNftCount so a test that does not override it still
    // exercises the confirmation path.
    getTotalNftCountCertified:
      overrides.getTotalNftCountCertified ?? (async () => 0n),
  } as never;
}

function setActor(actor: unknown) {
  authMock.useAuth.mockReturnValue({ actor });
}

// The real validateCanisterId is a pure function; mirror its contract so the
// hook's own logic (not the mock) is what the assertions exercise.
function realValidate(resolved: string) {
  if (!resolved || resolved.trim() === "") {
    return {
      status: "unavailable" as const,
      reason: "The backend canister ID could not be resolved from /env.json.",
    };
  }
  return { status: "ok" as const, canisterId: resolved };
}

describe("useBackendHealth preserved branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canistersMock.validateCanisterId.mockImplementation(realValidate);
    canistersMock.getBackendCanisterId.mockResolvedValue("backend-canister");
    setActor(null);
  });

  it("reports wrong-canister (with both IDs) when the actor talks to a different canister", async () => {
    setActor(
      makeActor({
        getCanisterIdSafe: async () => "some-other-canister",
        getTotalNftCount: async () => 5n,
      }),
    );

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(() =>
      expect(result.current).toEqual({
        status: "wrong-canister",
        resolved: "some-other-canister",
        expected: "backend-canister",
      }),
    );
  });

  it("reports unavailable when /env.json cannot be resolved", async () => {
    canistersMock.getBackendCanisterId.mockRejectedValue(
      new Error("[env] /env.json fetch returned HTTP 404"),
    );

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(() =>
      expect(result.current).toEqual({
        status: "unavailable",
        reason: "[env] /env.json fetch returned HTTP 404",
      }),
    );
  });

  it("reports unavailable when the resolved canister ID is empty", async () => {
    canistersMock.getBackendCanisterId.mockResolvedValue("");

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(() => expect(result.current.status).toBe("unavailable"));
  });

  it("reports ok for a matching backend that has NFTs", async () => {
    setActor(
      makeActor({
        getCanisterIdSafe: async () => "backend-canister",
        getTotalNftCount: async () => 7n,
      }),
    );

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(() =>
      expect(result.current).toEqual({
        status: "ok",
        canisterId: "backend-canister",
      }),
    );
  });

  it("trusts the validated /env.json ID for an anonymous caller without calling the actor", async () => {
    const getCanisterIdSafe = vi.fn(async () => "backend-canister");
    setActor(null);

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(() =>
      expect(result.current).toEqual({
        status: "ok",
        canisterId: "backend-canister",
      }),
    );
    expect(getCanisterIdSafe).not.toHaveBeenCalled();
  });

  it("reports unavailable when the actor's health probe throws", async () => {
    setActor(
      makeActor({
        getCanisterIdSafe: async () => {
          throw new Error("replica unreachable");
        },
      }),
    );

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(() =>
      expect(result.current).toEqual({
        status: "unavailable",
        reason: "replica unreachable",
      }),
    );
  });
});

// ── Cover: strengthened empty-catalog detection ──────────────────────────────
// The accepted requirement is that an unexpectedly empty catalog (NFTs were
// previously present) surfaces a clear error instead of silent empty cards,
// while a genuinely fresh canister can still mint its first NFT. The new
// behavior persists the "catalog was known to exist" signal in localStorage
// keyed by canister ID, so the anomaly is caught on a fresh page load too.
//
// [PAGE-RETRY] The count read is now a bounded retry sequence (0/800/2000 ms)
// followed, for a zero, by a second independent confirmation read
// (getTotalNftCountCertified). A zero is only authoritative once BOTH the retry
// sequence and the confirmation read agree. The persisted flag is now a HINT
// that decides whether a confirmed zero is an anomaly — it is no longer a
// trigger on its own. The total retry delay is ~2.8s, so every waitFor below
// uses a timeout above that.
const RETRY_WAIT_MS = 6000;

describe("useBackendHealth empty-catalog detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    canistersMock.validateCanisterId.mockImplementation(realValidate);
    canistersMock.getBackendCanisterId.mockResolvedValue("backend-canister");
    setActor(null);
  });

  it("reports empty only after the retry sequence AND a confirming certified read both see zero", async () => {
    // Simulate a previous session that observed NFTs for this canister.
    localStorage.setItem("catalog-known:backend-canister", "1");
    const getTotalNftCount = vi.fn(async () => 0n);
    const getTotalNftCountCertified = vi.fn(async () => 0n);
    setActor(
      makeActor({
        getCanisterIdSafe: async () => "backend-canister",
        getTotalNftCount,
        getTotalNftCountCertified,
      }),
    );

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(
      () =>
        expect(result.current).toEqual({
          status: "empty",
          canisterId: "backend-canister",
        }),
      { timeout: RETRY_WAIT_MS },
    );
    // The zero was retried across the whole schedule before being confirmed.
    expect(getTotalNftCount.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(getTotalNftCountCertified).toHaveBeenCalledTimes(1);
  });

  it("does NOT blank the app on a single stale zero when the confirmation read sees NFTs", async () => {
    // The persisted flag is a hint, not a trigger: a transient zero from one
    // replica must resolve to ok once the independent certified read disagrees.
    localStorage.setItem("catalog-known:backend-canister", "1");
    setActor(
      makeActor({
        getCanisterIdSafe: async () => "backend-canister",
        getTotalNftCount: async () => 0n,
        getTotalNftCountCertified: async () => 4n,
      }),
    );

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(
      () =>
        expect(result.current).toEqual({
          status: "ok",
          canisterId: "backend-canister",
        }),
      { timeout: RETRY_WAIT_MS },
    );
  });

  it("resolves to ok when a stale zero is followed by a non-zero retry", async () => {
    // A single zero from one replica must not blank the app: the bounded retry
    // short-circuits to ok as soon as any attempt observes a non-zero count.
    localStorage.setItem("catalog-known:backend-canister", "1");
    let calls = 0;
    const getTotalNftCount = vi.fn(async () => {
      calls += 1;
      return calls === 1 ? 0n : 5n;
    });
    const getTotalNftCountCertified = vi.fn(async () => 5n);
    setActor(
      makeActor({
        getCanisterIdSafe: async () => "backend-canister",
        getTotalNftCount,
        getTotalNftCountCertified,
      }),
    );

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(
      () =>
        expect(result.current).toEqual({
          status: "ok",
          canisterId: "backend-canister",
        }),
      { timeout: RETRY_WAIT_MS },
    );
    // The non-zero retry short-circuits, so no confirmation read is needed.
    expect(getTotalNftCountCertified).not.toHaveBeenCalled();
  });

  it("does not blank the app when the confirmation read fails", async () => {
    // A failed confirmation read must leave the zero unconfirmed and allow the
    // catalog to render rather than blanking the app.
    localStorage.setItem("catalog-known:backend-canister", "1");
    setActor(
      makeActor({
        getCanisterIdSafe: async () => "backend-canister",
        getTotalNftCount: async () => 0n,
        getTotalNftCountCertified: async () => {
          throw new Error("certified read unavailable");
        },
      }),
    );

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(
      () =>
        expect(result.current).toEqual({
          status: "ok",
          canisterId: "backend-canister",
        }),
      { timeout: RETRY_WAIT_MS },
    );
  });

  it("allows bootstrap (ok) for a fresh canister with no persisted flag and zero NFTs", async () => {
    setActor(
      makeActor({
        getCanisterIdSafe: async () => "backend-canister",
        getTotalNftCount: async () => 0n,
        getTotalNftCountCertified: async () => 0n,
      }),
    );

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(
      () =>
        expect(result.current).toEqual({
          status: "ok",
          canisterId: "backend-canister",
        }),
      { timeout: RETRY_WAIT_MS },
    );
  });

  it("persists the known-catalog flag once a non-zero count is observed", async () => {
    setActor(
      makeActor({
        getCanisterIdSafe: async () => "backend-canister",
        getTotalNftCount: async () => 3n,
      }),
    );

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(localStorage.getItem("catalog-known:backend-canister")).toBe("1");
  });

  it("does not flag empty for a rotated canister that has a stale flag under a different ID", async () => {
    // A stale flag for the OLD canister must not block a genuinely new backend.
    localStorage.setItem("catalog-known:old-canister", "1");
    setActor(
      makeActor({
        getCanisterIdSafe: async () => "backend-canister",
        getTotalNftCount: async () => 0n,
        getTotalNftCountCertified: async () => 0n,
      }),
    );

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(
      () =>
        expect(result.current).toEqual({
          status: "ok",
          canisterId: "backend-canister",
        }),
      { timeout: RETRY_WAIT_MS },
    );
  });

  it("still reports wrong-canister before consulting the empty-catalog signal", async () => {
    localStorage.setItem("catalog-known:backend-canister", "1");
    setActor(
      makeActor({
        getCanisterIdSafe: async () => "some-other-canister",
        getTotalNftCount: async () => 0n,
      }),
    );

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(() =>
      expect(result.current).toEqual({
        status: "wrong-canister",
        resolved: "some-other-canister",
        expected: "backend-canister",
      }),
    );
  });
});
