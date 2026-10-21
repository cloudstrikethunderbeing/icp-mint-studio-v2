import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Characterization: the /health entry point is admin-only ──────────────────
// The current request makes the /health page admin-only. The Header already
// gates its Health link on `isAdmin`, and that adjacent working behavior must
// survive the page-level change: an admin sees the link, a non-admin and an
// anonymous visitor do not. This suite deliberately does NOT assert the
// DiagnosticPage's current prose or its (currently missing) route-level gate,
// which the request intentionally changes.

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

// next-themes and the notification bell are unrelated chrome; stub them so the
// Header's own link gating is what is under test.
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}));

vi.mock("@/components/NotificationBell", () => ({
  NotificationBell: () => null,
}));

import { Header } from "@/components/Header";

function setAuth(overrides: Record<string, unknown> = {}) {
  authMock.useAuth.mockReturnValue({
    isAuthenticated: true,
    isAdmin: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  });
}

describe("Header /health link visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMock.pathname = "/";
    setAuth();
  });

  it("shows the Health link to an admin", () => {
    setAuth({ isAuthenticated: true, isAdmin: true });
    render(<Header />);
    expect(
      document.querySelector('[data-ocid="header.health_link"]'),
    ).not.toBeNull();
  });

  it("hides the Health link from a signed-in non-admin", () => {
    setAuth({ isAuthenticated: true, isAdmin: false });
    render(<Header />);
    expect(
      document.querySelector('[data-ocid="header.health_link"]'),
    ).toBeNull();
  });

  it("hides the Health link from an anonymous visitor", () => {
    setAuth({ isAuthenticated: false, isAdmin: false });
    render(<Header />);
    expect(
      document.querySelector('[data-ocid="header.health_link"]'),
    ).toBeNull();
  });

  it("keeps the How It Works link visible to everyone", () => {
    setAuth({ isAuthenticated: false, isAdmin: false });
    render(<Header />);
    expect(
      document.querySelector('[data-ocid="header.how_it_works_link"]'),
    ).not.toBeNull();
    expect(screen.getByText("How It Works")).toBeInTheDocument();
  });
});
