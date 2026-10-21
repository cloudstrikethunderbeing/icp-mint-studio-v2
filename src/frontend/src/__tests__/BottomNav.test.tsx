import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────
// BottomNav derives its tabs from the auth context and the current router path.
// We mock both so tab visibility by role can be characterized without a real
// router. The admin Catalog Recovery tab was removed, so this suite also
// asserts that no recovery surface is reachable from the navigation.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const routerMock = vi.hoisted(() => ({
  pathname: "/collector",
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
}));

vi.mock("@tanstack/react-router", () => ({
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

import { BottomNav } from "@/components/BottomNav";

function setAuth(overrides: Record<string, unknown> = {}) {
  authMock.useAuth.mockReturnValue({
    isAuthenticated: true,
    isAdmin: false,
    ...overrides,
  });
}

describe("BottomNav role visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMock.pathname = "/collector";
    setAuth();
  });

  it("shows the authenticated tabs for a signed-in user", () => {
    setAuth({ isAuthenticated: true, isAdmin: false });
    render(<BottomNav shell="collector" />);

    expect(
      document.querySelector('[data-ocid="nav.collector.library"]'),
    ).not.toBeNull();
    expect(document.querySelector('[data-ocid="nav.verify"]')).not.toBeNull();
    expect(document.querySelector('[data-ocid="nav.profile"]')).not.toBeNull();
    expect(document.querySelector('[data-ocid="nav.settings"]')).not.toBeNull();
    expect(document.querySelector('[data-ocid="nav.studio"]')).not.toBeNull();
  });

  it("shows only Verify and How It Works to an anonymous visitor", () => {
    setAuth({ isAuthenticated: false, isAdmin: false });
    render(<BottomNav shell="collector" />);

    expect(document.querySelector('[data-ocid="nav.verify"]')).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="nav.how_it_works"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="nav.collector.library"]'),
    ).toBeNull();
    expect(document.querySelector('[data-ocid="nav.profile"]')).toBeNull();
  });

  it("exposes no Catalog Recovery tab to an admin", () => {
    // The admin Catalog Recovery feature was removed. An admin must see the
    // same tab set as any authenticated user — no recovery tab, and no link
    // pointing at a recovery route.
    setAuth({ isAuthenticated: true, isAdmin: true });
    render(<BottomNav shell="collector" />);

    expect(
      document.querySelector('[data-ocid="nav.admin.catalog"]'),
    ).toBeNull();
    expect(
      document.querySelector('[data-ocid="nav.admin.recovery"]'),
    ).toBeNull();
    expect(document.querySelector('[data-ocid="nav.recovery"]')).toBeNull();
    expect(document.querySelector('a[href="/admin/catalog"]')).toBeNull();
    expect(document.body.textContent).not.toMatch(/recovery/i);
  });
});
