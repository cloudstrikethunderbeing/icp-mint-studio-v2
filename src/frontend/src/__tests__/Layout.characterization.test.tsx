import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Characterization: Layout shell selection for existing routes ─────────────
// The current request unifies the dApp into ONE shell: every non-claim route
// renders the Header + BottomNav ("app" shell), including the landing page at
// "/". The claim flow keeps its minimal no-nav shell. This suite freezes that
// routing so a future shell branch cannot silently swallow /claim, /collector,
// /how-it-works, /verify, /profile, or /settings, and so the claim flow does
// not accidentally gain navigation chrome.

const routerMock = vi.hoisted(() => ({
  pathname: "/collector",
}));

vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => ({ location: { pathname: routerMock.pathname } }),
  Outlet: () => <div data-testid="outlet" />,
}));

// Child chrome is stubbed to expose the props Layout passes, so the shell
// decision is what is under test.
vi.mock("@/components/Header", () => ({
  Header: ({ hideNav }: { hideNav?: boolean }) => (
    <div data-testid="header" data-hide-nav={hideNav ? "true" : "false"} />
  ),
}));

vi.mock("@/components/BottomNav", () => ({
  BottomNav: ({ shell }: { shell: string }) => (
    <div data-testid="bottom-nav" data-shell={shell} />
  ),
}));

vi.mock("@/components/ReferralBanner", () => ({
  ReferralBanner: () => <div data-testid="referral-banner" />,
}));

import { Layout } from "@/components/Layout";

function renderAt(pathname: string) {
  routerMock.pathname = pathname;
  return render(<Layout />);
}

describe("Layout shell selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the minimal claim shell (no bottom nav) for /claim routes", () => {
    renderAt("/claim/abc123");
    expect(screen.getByTestId("header")).toHaveAttribute(
      "data-hide-nav",
      "true",
    );
    expect(screen.queryByTestId("bottom-nav")).toBeNull();
    expect(screen.queryByTestId("referral-banner")).toBeNull();
  });

  it.each([
    "/",
    "/studio",
    "/collector",
    "/how-it-works",
    "/verify",
    "/verify/canister:0:1",
    "/profile",
    "/settings",
    "/disconnect",
  ])("uses the unified app shell for %s", (pathname) => {
    renderAt(pathname);
    expect(screen.getByTestId("header")).toHaveAttribute(
      "data-hide-nav",
      "false",
    );
    expect(screen.getByTestId("bottom-nav")).toHaveAttribute(
      "data-shell",
      "app",
    );
    expect(screen.getByTestId("referral-banner")).toBeInTheDocument();
  });

  it("uses the unified app shell for an unrecognized path", () => {
    renderAt("/some-unknown-path");
    expect(screen.getByTestId("bottom-nav")).toHaveAttribute(
      "data-shell",
      "app",
    );
    expect(screen.getByTestId("referral-banner")).toBeInTheDocument();
  });
});
