import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Cover: gallery is the landing route at / ─────────────────────────────────
// Accepted behavior:
//   - the public gallery is the landing page at "/";
//   - the mint studio moved to "/studio" and is still reachable;
//   - the existing routes are preserved.
//
// App.tsx builds its route tree with @tanstack/react-router's createRoute and
// mounts it through RouterProvider. This suite replaces the router with a small
// harness that records each route's path + component and renders the component
// matching window.location.pathname, so the real App route table is what is
// under test. The pages are mocked with markers so the mapping is observable
// without pulling in their data stacks.

const healthMock = vi.hoisted(() => ({
  useBackendHealth: vi.fn(),
}));

vi.mock("@/hooks/useQueries", () => ({
  useBackendHealth: healthMock.useBackendHealth,
}));

vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

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

// Marker pages: each lazy import resolves to a distinct, observable element.
vi.mock("@/pages/GalleryPage", () => ({
  default: () => <div data-ocid="page.gallery" />,
}));
vi.mock("@/pages/HomePage", () => ({
  default: () => <div data-ocid="page.studio" />,
}));
vi.mock("@/pages/CollectorPage", () => ({
  default: () => <div data-ocid="page.collector" />,
}));
vi.mock("@/pages/ClaimPage", () => ({
  default: () => <div data-ocid="page.claim" />,
}));
vi.mock("@/pages/PostClaimPage", () => ({
  default: () => <div data-ocid="page.post_claim" />,
}));
vi.mock("@/pages/VerifyPage", () => ({
  default: () => <div data-ocid="page.verify" />,
}));
vi.mock("@/pages/ProfilePage", () => ({
  default: () => <div data-ocid="page.profile" />,
}));
vi.mock("@/pages/SettingsPage", () => ({
  default: () => <div data-ocid="page.settings" />,
}));
vi.mock("@/pages/HowItWorksPage", () => ({
  default: () => <div data-ocid="page.how_it_works" />,
}));
vi.mock("@/pages/DiagnosticPage", () => ({
  default: () => <div data-ocid="page.health" />,
}));
vi.mock("@/pages/DisconnectPage", () => ({
  default: () => <div data-ocid="page.disconnect" />,
}));

// A minimal router harness: createRoute records {path, component}; the root
// route's addChildren stores the tree; RouterProvider renders the component
// whose path matches window.location.pathname.
vi.mock("@tanstack/react-router", () => {
  const routes: { path: string; component: React.ComponentType }[] = [];
  const rootRoute = {
    addChildren: (children: unknown[]) => children,
  };
  return {
    createRootRoute: () => rootRoute,
    createRoute: (config: { path: string; component: React.ComponentType }) => {
      routes.push(config);
      return config;
    },
    createRouter: () => ({ routes }),
    RouterProvider: () => {
      const pathname = window.location.pathname;
      const match = routes.find((route) => route.path === pathname);
      if (!match) {
        return <div data-ocid="router.no_match" />;
      }
      const Component = match.component;
      return <Component />;
    },
  };
});

import App from "@/App";

describe("App gallery landing route (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    healthMock.useBackendHealth.mockReturnValue({
      status: "ok",
      canisterId: "backend-canister",
    });
  });

  it("renders the public gallery at /", async () => {
    window.history.replaceState({}, "", "/");
    render(<App />);
    // The page is lazy-loaded behind Suspense, so wait for it to resolve.
    await waitFor(() =>
      expect(
        document.querySelector('[data-ocid="page.gallery"]'),
      ).not.toBeNull(),
    );
    expect(document.querySelector('[data-ocid="page.studio"]')).toBeNull();
  });

  it("renders the mint studio at /studio", async () => {
    window.history.replaceState({}, "", "/studio");
    render(<App />);
    await waitFor(() =>
      expect(
        document.querySelector('[data-ocid="page.studio"]'),
      ).not.toBeNull(),
    );
    expect(document.querySelector('[data-ocid="page.gallery"]')).toBeNull();
  });

  it("preserves the collector library route at /collector", async () => {
    window.history.replaceState({}, "", "/collector");
    render(<App />);
    await waitFor(() =>
      expect(
        document.querySelector('[data-ocid="page.collector"]'),
      ).not.toBeNull(),
    );
  });
});
