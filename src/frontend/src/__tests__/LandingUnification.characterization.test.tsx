import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Characterization: unified-shell adjacent behavior ────────────────────────
// The current request intentionally changes the landing page: the public
// gallery becomes a SECTION of the landing page at "/", the whole dApp moves to
// one consistent shell (Header nav + BottomNav + auth chrome on every route),
// and the orphaned DisconnectPage is wired into the route tree.
//
// This suite deliberately does NOT assert the current gallery-only shell at "/"
// or the current standalone GalleryPage route — those are the behaviors being
// changed. It freezes the ADJACENT working behavior the unification must not
// disturb:
//   - the Header logo navigates to "/" from ANY route (the old "/collector"
//     special case was intentionally removed by this request);
//   - the Header auth button calls login() when anonymous and logout() when
//     authenticated;
//   - every existing route still resolves to its page component, including the
//     newly wired DisconnectPage.
//
// The real Header is exercised with typed local stubs for the router, auth, and
// unrelated chrome. The route table is exercised through the real App with the
// router replaced by a harness that records each createRoute path + component.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const routerMock = vi.hoisted(() => ({
  pathname: "/",
  navigate: vi.fn(),
}));

const healthMock = vi.hoisted(() => ({
  useBackendHealth: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// One combined router mock: it serves the real Header (useNavigate /
// useRouterState / Link) AND the App route-table harness (createRoute /
// createRouter / RouterProvider). A second vi.mock for the same module would
// replace this one wholesale, so both concerns live here.
vi.mock("@tanstack/react-router", () => {
  const routes: { path: string; component: React.ComponentType }[] = [];
  const rootRoute = { addChildren: (children: unknown[]) => children };

  // Match an exact path or a parameterized route ("/claim/$claimToken").
  function matches(routePath: string, pathname: string): boolean {
    const routeParts = routePath.split("/");
    const pathParts = pathname.split("/");
    if (routeParts.length !== pathParts.length) return false;
    return routeParts.every(
      (part, i) => part.startsWith("$") || part === pathParts[i],
    );
  }

  return {
    useNavigate: () => routerMock.navigate,
    useRouterState: () => ({ location: { pathname: routerMock.pathname } }),
    Outlet: () => <div data-testid="outlet" />,
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
    createRootRoute: () => rootRoute,
    createRoute: (config: { path: string; component: React.ComponentType }) => {
      routes.push(config);
      return config;
    },
    createRouter: () => ({ routes }),
    RouterProvider: () => {
      const pathname = window.location.pathname;
      const match = routes.find((route) => matches(route.path, pathname));
      if (!match) {
        return <div data-ocid="router.no_match" />;
      }
      const Component = match.component;
      return <Component />;
    },
  };
});

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock("@/hooks/useQueries", () => ({
  useBackendHealth: healthMock.useBackendHealth,
}));

vi.mock("@/components/Layout", () => ({
  Layout: () => <div data-ocid="layout" />,
}));

vi.mock("@/components/PWAUpdateBanner", () => ({
  PWAUpdateBanner: () => null,
}));

vi.mock("sonner", () => ({
  Toaster: () => null,
}));

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

import App from "@/App";
import { Header } from "@/components/Header";

function setAuth(overrides: Record<string, unknown> = {}) {
  authMock.useAuth.mockReturnValue({
    isAuthenticated: false,
    isAdmin: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  });
}

describe("Header logo navigation (characterization)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMock.pathname = "/";
    setAuth();
  });

  it("navigates to / when the logo is clicked from a non-collector route", async () => {
    const user = userEvent.setup();
    routerMock.pathname = "/studio";
    render(<Header />);
    await user.click(
      document.querySelector(
        '[data-ocid="header.logo_link"]',
      ) as HTMLButtonElement,
    );
    expect(routerMock.navigate).toHaveBeenCalledWith({ to: "/" });
  });

  it("navigates to / when the logo is clicked from /collector too", async () => {
    const user = userEvent.setup();
    routerMock.pathname = "/collector";
    render(<Header />);
    await user.click(
      document.querySelector(
        '[data-ocid="header.logo_link"]',
      ) as HTMLButtonElement,
    );
    expect(routerMock.navigate).toHaveBeenCalledWith({ to: "/" });
  });
});

describe("Header auth button wiring (characterization)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMock.pathname = "/";
  });

  it("shows Connect and calls login() for an anonymous visitor", async () => {
    const user = userEvent.setup();
    const login = vi.fn();
    setAuth({ isAuthenticated: false, login });
    render(<Header />);
    const button = document.querySelector(
      '[data-ocid="header.auth_button"]',
    ) as HTMLButtonElement;
    expect(button.textContent).toBe("Connect");
    await user.click(button);
    expect(login).toHaveBeenCalledTimes(1);
  });

  it("shows Disconnect and calls logout() for a signed-in user", async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    setAuth({ isAuthenticated: true, logout });
    render(<Header />);
    const button = document.querySelector(
      '[data-ocid="header.auth_button"]',
    ) as HTMLButtonElement;
    expect(button.textContent).toBe("Disconnect");
    await user.click(button);
    expect(logout).toHaveBeenCalledTimes(1);
  });
});

describe("App route table preservation (characterization)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    healthMock.useBackendHealth.mockReturnValue({
      status: "ok",
      canisterId: "backend-canister",
    });
  });

  it.each([
    ["/studio", "page.studio"],
    ["/collector", "page.collector"],
    ["/how-it-works", "page.how_it_works"],
    ["/verify", "page.verify"],
    ["/profile", "page.profile"],
    ["/settings", "page.settings"],
    ["/health", "page.health"],
    ["/disconnect", "page.disconnect"],
  ])("still resolves %s to its page", async (pathname, ocid) => {
    window.history.replaceState({}, "", pathname);
    render(<App />);
    await waitFor(() =>
      expect(document.querySelector(`[data-ocid="${ocid}"]`)).not.toBeNull(),
    );
  });

  it("still resolves the parameterized claim route", async () => {
    window.history.replaceState({}, "", "/claim/tok-123");
    render(<App />);
    await waitFor(() =>
      expect(document.querySelector('[data-ocid="page.claim"]')).not.toBeNull(),
    );
  });

  it("still resolves the post-claim success route", async () => {
    window.history.replaceState({}, "", "/claim/tok-123/success");
    render(<App />);
    await waitFor(() =>
      expect(
        document.querySelector('[data-ocid="page.post_claim"]'),
      ).not.toBeNull(),
    );
  });

  it("still resolves the verify-by-id route", async () => {
    window.history.replaceState({}, "", "/verify/canister:0:1");
    render(<App />);
    await waitFor(() =>
      expect(
        document.querySelector('[data-ocid="page.verify"]'),
      ).not.toBeNull(),
    );
  });
});
