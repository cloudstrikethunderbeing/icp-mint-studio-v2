import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Cover: App-level CanisterGuard error states ──────────────────────────────
// App.tsx wraps the whole router in CanisterGuard, which reads useBackendHealth
// and renders a loud, visible error instead of the app whenever the backend is
// wrong, unavailable, or unexpectedly empty. This is the global half of the
// "a canister mismatch or an unexpectedly empty catalog surfaces a clear error
// state instead of silently showing empty cards" requirement.
//
// The guard is not exported, so this suite renders the real App with its heavy
// seams mocked: the auth provider, the router, the layout/chrome, and the
// health hook. Only the guard's own branching is under test.

const healthMock = vi.hoisted(() => ({
  useBackendHealth: vi.fn(),
}));

vi.mock("@/hooks/useQueries", () => ({
  useBackendHealth: healthMock.useBackendHealth,
}));

// AuthProvider pulls in Internet Identity and the real actor; replace it with a
// passthrough so App can mount without a network or identity stack.
vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// RouterProvider would build the real route tree and lazy-load pages. Replace it
// with a marker so the guard's children are observable without a router.
vi.mock("@tanstack/react-router", () => {
  const rootRoute = { addChildren: () => ({}) };
  return {
    RouterProvider: () => <div data-ocid="router.provider" />,
    createRootRoute: () => rootRoute,
    createRoute: () => ({}),
    createRouter: () => ({}),
  };
});

vi.mock("@/components/Layout", () => ({
  Layout: () => <div data-ocid="layout" />,
}));

vi.mock("@/components/PWAUpdateBanner", () => ({
  PWAUpdateBanner: () => null,
}));

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("sonner", () => ({
  Toaster: () => null,
}));

import App from "@/App";

function setHealth(health: unknown) {
  healthMock.useBackendHealth.mockReturnValue(health);
}

describe("App CanisterGuard error states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it("renders the app when the backend is healthy", () => {
    setHealth({ status: "ok", canisterId: "backend-canister" });
    render(<App />);
    expect(
      document.querySelector('[data-ocid="router.provider"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="canister.empty_backend_state"]'),
    ).toBeNull();
  });

  it("shows a clear wrong-canister error instead of the app", () => {
    setHealth({
      status: "wrong-canister",
      resolved: "some-other-canister",
      expected: "backend-canister",
    });
    render(<App />);
    expect(
      document.querySelector('[data-ocid="canister.wrong_canister_state"]'),
    ).not.toBeNull();
    expect(screen.getByText("Backend connection error")).toBeInTheDocument();
    expect(document.querySelector('[data-ocid="router.provider"]')).toBeNull();
  });

  it("shows a clear unavailable error with the reason", () => {
    setHealth({ status: "unavailable", reason: "replica unreachable" });
    render(<App />);
    expect(
      document.querySelector('[data-ocid="canister.unavailable_state"]'),
    ).not.toBeNull();
    expect(screen.getByText("Backend unavailable")).toBeInTheDocument();
    expect(screen.getByText("replica unreachable")).toBeInTheDocument();
  });

  it("renders the inline empty-catalog banner ABOVE the routed content instead of replacing the page", () => {
    // The empty catalog is now a hint, not a hard stop: the routed content must
    // still render, with an inline warning banner above it. The banner keeps the
    // retry affordance.
    setHealth({ status: "empty", canisterId: "backend-canister" });
    render(<App />);
    expect(
      document.querySelector('[data-ocid="canister.empty_backend_state"]'),
    ).not.toBeNull();
    expect(
      screen.getByText(
        "The backend is reachable but reports no NFTs. The catalog may be temporarily unavailable.",
      ),
    ).toBeInTheDocument();
    // The routed content renders WITH the banner (not blocked).
    expect(
      document.querySelector('[data-ocid="router.provider"]'),
    ).not.toBeNull();
    // The Retry button is preserved in the empty-catalog state.
    expect(
      document.querySelector('[data-ocid="canister.retry_button"]'),
    ).not.toBeNull();
  });

  it("keeps the /health diagnostic route reachable in the empty state", () => {
    // The /health route exists specifically to investigate an empty catalog, so
    // the guard must not block it precisely when data loss is detected.
    window.history.replaceState({}, "", "/health");
    setHealth({ status: "empty", canisterId: "backend-canister" });
    render(<App />);
    expect(
      document.querySelector('[data-ocid="router.provider"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="canister.empty_backend_state"]'),
    ).toBeNull();
  });

  it("shows the checking state while health is unresolved", () => {
    setHealth({ status: "checking" });
    render(<App />);
    expect(
      document.querySelector('[data-ocid="canister.checking_state"]'),
    ).not.toBeNull();
    expect(document.querySelector('[data-ocid="router.provider"]')).toBeNull();
  });
});
