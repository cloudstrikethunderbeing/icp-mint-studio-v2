import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Cover: Gallery link + unified app shell ──────────────────────────────────
// Accepted behavior:
//   - a Gallery link is available in the header;
//   - the landing page at "/" renders inside the SAME unified shell as every
//     other dApp route: Header (with login/connect) + BottomNav + referral
//     banner. The old gallery-only shell with no nav is intentionally gone.
//
// The real Header and Layout are exercised; child chrome and the router are
// typed local stubs so the shell decision and the link are what is under test.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const routerMock = vi.hoisted(() => ({
  pathname: "/",
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
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
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}));

vi.mock("@/components/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock("@/components/BottomNav", () => ({
  BottomNav: ({ shell }: { shell: string }) => (
    <div data-testid="bottom-nav" data-shell={shell} />
  ),
}));

vi.mock("@/components/ReferralBanner", () => ({
  ReferralBanner: () => <div data-testid="referral-banner" />,
}));

import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";

function setAuth(overrides: Record<string, unknown> = {}) {
  authMock.useAuth.mockReturnValue({
    isAuthenticated: false,
    isAdmin: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  });
}

describe("Header Gallery link (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMock.pathname = "/";
    setAuth();
  });

  it("shows a Gallery link pointing at / for an anonymous visitor", () => {
    render(<Header />);
    const link = document.querySelector(
      '[data-ocid="header.gallery_link"]',
    ) as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute("href")).toBe("/");
  });

  it("shows the Gallery link to a signed-in user too", () => {
    setAuth({ isAuthenticated: true, isAdmin: false });
    render(<Header />);
    expect(
      document.querySelector('[data-ocid="header.gallery_link"]'),
    ).not.toBeNull();
  });
});

describe("Layout unified app shell (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
  });

  it("renders the unified shell at / with Header, BottomNav and referral banner", () => {
    routerMock.pathname = "/";
    render(<Layout />);
    // The real Header renders with its login/connect button available.
    expect(
      document.querySelector('[data-ocid="header.auth_button"]'),
    ).not.toBeNull();
    // The unified shell renders the BottomNav and referral banner on the
    // landing page too.
    expect(screen.getByTestId("bottom-nav")).toHaveAttribute(
      "data-shell",
      "app",
    );
    expect(screen.getByTestId("referral-banner")).toBeInTheDocument();
    // The routed gallery content renders.
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("renders the same unified shell for /collector", () => {
    routerMock.pathname = "/collector";
    render(<Layout />);
    expect(
      document.querySelector('[data-ocid="header.auth_button"]'),
    ).not.toBeNull();
    expect(screen.getByTestId("bottom-nav")).toHaveAttribute(
      "data-shell",
      "app",
    );
    expect(screen.getByTestId("referral-banner")).toBeInTheDocument();
  });
});
