import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Cover: unified shell + landing-page gallery journey ──────────────────────
// Accepted behavior:
//   - every route renders inside ONE shell with the sticky Header (logo, nav
//     links, login/connect button, notification bell) and the BottomNav;
//   - the "/" landing page presents the public gallery as a section with hero
//     content above it;
//   - the mint Studio is reachable at "/studio" and from the landing page and
//     BottomNav;
//   - anonymous visitors can browse the gallery and open an NFT detail view;
//   - signed-in users see the full BottomNav tab set.
//
// The real Layout, Header, BottomNav and GalleryPage are exercised together.
// The router is a small harness that renders the route component matching
// window.location.pathname inside the real Layout; auth, the public-NFT data
// hook, the referral hook, and the heavy detail modal are typed local stubs.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const queriesMock = vi.hoisted(() => ({
  usePublicNfts: vi.fn(),
  useBackendHealth: vi.fn(),
}));

const referralMock = vi.hoisted(() => ({
  useReferralStatus: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/hooks/useQueries", () => ({
  usePublicNfts: queriesMock.usePublicNfts,
  useBackendHealth: queriesMock.useBackendHealth,
}));

vi.mock("@/hooks/useReferralStatus", () => ({
  useReferralStatus: referralMock.useReferralStatus,
}));

vi.mock("@/components/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

// The detail modal is heavy (metadata editing, claim links, burn dialogs). The
// journey under test is that opening a card surfaces a read-only detail view,
// so the modal is replaced by a marker that records the readOnly prop.
vi.mock("@/components/NftDetailModal", () => ({
  NftDetailModal: ({
    nft,
    readOnly,
  }: {
    nft: { title?: string } | null;
    readOnly?: boolean;
  }) => (
    <div
      data-testid="nft-detail-modal"
      data-readonly={readOnly ? "true" : "false"}
    >
      {nft?.title}
    </div>
  ),
}));

// Router harness: the real Layout is rendered directly by the test, and its
// Outlet renders the page component registered for window.location.pathname.
// This exercises the real Header + BottomNav shell around each route.
const routePages = vi.hoisted(() => ({
  map: {} as Record<string, React.ComponentType>,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useRouterState: () => ({
    location: { pathname: window.location.pathname },
  }),
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
  Outlet: () => {
    const Component = routePages.map[window.location.pathname];
    if (!Component) return <div data-ocid="router.no_match" />;
    return <Component />;
  },
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("sonner", () => ({
  Toaster: () => null,
}));

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";
import { Layout } from "@/components/Layout";
import GalleryPage from "@/pages/GalleryPage";

// Register the page component rendered by the mocked Outlet for each path.
// "/" uses the real GalleryPage (the landing page under test); the other
// routes use the marker pages mocked above.
routePages.map = {
  "/": GalleryPage,
  "/studio": () => <div data-ocid="page.studio" />,
  "/collector": () => <div data-ocid="page.collector" />,
  "/how-it-works": () => <div data-ocid="page.how_it_works" />,
  "/verify": () => <div data-ocid="page.verify" />,
  "/profile": () => <div data-ocid="page.profile" />,
  "/settings": () => <div data-ocid="page.settings" />,
  "/disconnect": () => <div data-ocid="page.disconnect" />,
};

function makeNft(overrides: Partial<Nft> = {}): Nft {
  return {
    id: 1n,
    status: NftStatus.active,
    supplyLimit: 1n,
    title: "Gallery Art",
    imageBlob: {
      directURL: "https://example.com/gallery.png",
    } as never,
    edition: "1/1",
    referralThreshold: 3n,
    ownerId: { toText: () => "aaaaa-aa" } as never,
    tags: [],
    creatorId: "creator-1",
    mintDate: 0n,
    description: "",
    auditHistory: [],
    rewardTier: RewardTier.none,
    rewardType: RewardType.none,
    assetHash: "0".repeat(64),
    nftUniqueId: "canister:0:1",
    ...overrides,
  };
}

function setAuth(overrides: Record<string, unknown> = {}) {
  authMock.useAuth.mockReturnValue({
    isAuthenticated: false,
    isAdmin: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  });
}

function renderAppAt(pathname: string) {
  window.history.replaceState({}, "", pathname);
  queriesMock.useBackendHealth.mockReturnValue({
    status: "ok",
    canisterId: "backend-canister",
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Layout />
    </QueryClientProvider>,
  );
}

describe("Unified shell across routes (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    queriesMock.usePublicNfts.mockReturnValue({
      data: { items: [makeNft()], total: 1n },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    referralMock.useReferralStatus.mockReturnValue({
      state: "none",
      referralCode: null,
      referralsCount: 0n,
      awardedTiers: [],
      acknowledgeAwarded: vi.fn(),
    });
  });

  it.each([
    ["/", "gallery.page"],
    ["/studio", "page.studio"],
    ["/collector", "page.collector"],
    ["/how-it-works", "page.how_it_works"],
    ["/verify", "page.verify"],
    ["/profile", "page.profile"],
    ["/settings", "page.settings"],
    ["/disconnect", "page.disconnect"],
  ])("renders Header and BottomNav on %s", async (pathname, ocid) => {
    renderAppAt(pathname);
    await waitFor(() =>
      expect(document.querySelector(`[data-ocid="${ocid}"]`)).not.toBeNull(),
    );
    // Sticky Header with logo + login/connect button.
    expect(
      document.querySelector('[data-ocid="header.logo_link"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="header.auth_button"]'),
    ).not.toBeNull();
    // BottomNav is present on every route.
    expect(document.querySelector("nav")).not.toBeNull();
  });

  it("shows the notification bell to a signed-in user on the landing page", async () => {
    setAuth({ isAuthenticated: true });
    renderAppAt("/");
    await waitFor(() =>
      expect(
        document.querySelector('[data-ocid="gallery.page"]'),
      ).not.toBeNull(),
    );
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
  });
});

describe("Landing page gallery journey (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    referralMock.useReferralStatus.mockReturnValue({
      state: "none",
      referralCode: null,
      referralsCount: 0n,
      awardedTiers: [],
      acknowledgeAwarded: vi.fn(),
    });
  });

  it("shows hero content and the gallery section listing NFTs", async () => {
    queriesMock.usePublicNfts.mockReturnValue({
      data: { items: [makeNft({ title: "Landing Art" })], total: 1n },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderAppAt("/");
    await waitFor(() =>
      expect(screen.getByText("Landing Art")).toBeInTheDocument(),
    );
    expect(
      document.querySelector('[data-ocid="landing.hero_section"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="landing.gallery_section"]'),
    ).not.toBeNull();
  });

  it("lets an anonymous visitor open an NFT detail view", async () => {
    const user = userEvent.setup();
    queriesMock.usePublicNfts.mockReturnValue({
      data: { items: [makeNft({ title: "Open Me" })], total: 1n },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderAppAt("/");
    await waitFor(() =>
      expect(screen.getByText("Open Me")).toBeInTheDocument(),
    );
    await user.click(
      document.querySelector(
        '[data-ocid="gallery.open_button.1"]',
      ) as HTMLButtonElement,
    );
    const modal = await screen.findByTestId("nft-detail-modal");
    expect(modal).toHaveAttribute("data-readonly", "true");
    expect(modal).toHaveTextContent("Open Me");
  });

  it("navigates to the Studio from the landing hero CTA", async () => {
    queriesMock.usePublicNfts.mockReturnValue({
      data: { items: [], total: 0n },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderAppAt("/");
    await waitFor(() =>
      expect(
        document.querySelector('[data-ocid="landing.studio_cta_button"]'),
      ).not.toBeNull(),
    );
    const cta = document.querySelector(
      '[data-ocid="landing.studio_cta_button"]',
    ) as HTMLAnchorElement;
    expect(cta.closest("a")?.getAttribute("href")).toBe("/studio");
  });
});

describe("Signed-in BottomNav tab set (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth({ isAuthenticated: true });
    queriesMock.usePublicNfts.mockReturnValue({
      data: { items: [], total: 0n },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    referralMock.useReferralStatus.mockReturnValue({
      state: "none",
      referralCode: null,
      referralsCount: 0n,
      awardedTiers: [],
      acknowledgeAwarded: vi.fn(),
    });
  });

  it("shows the full tab set including Studio on the landing page", async () => {
    renderAppAt("/");
    await waitFor(() =>
      expect(
        document.querySelector('[data-ocid="gallery.page"]'),
      ).not.toBeNull(),
    );
    for (const ocid of [
      "nav.collector.library",
      "nav.verify",
      "nav.how_it_works",
      "nav.profile",
      "nav.settings",
      "nav.studio",
    ]) {
      expect(document.querySelector(`[data-ocid="${ocid}"]`)).not.toBeNull();
    }
    const studio = document.querySelector(
      '[data-ocid="nav.studio"]',
    ) as HTMLAnchorElement;
    expect(studio.getAttribute("href")).toBe("/studio");
  });
});
