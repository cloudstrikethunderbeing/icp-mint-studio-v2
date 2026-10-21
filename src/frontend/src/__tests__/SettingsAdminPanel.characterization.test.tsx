import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Characterization: Settings admin panel structure ─────────────────────────
// The current request adds an ADMIN-ONLY reassignment control to the app. The
// natural host is the Settings admin panel (settings.admin_panel), which already
// hosts the payment-config, claim-link, tier-assignment, Stripe and payment-queue
// cards. That new control is NOT frozen here.
//
// This suite freezes the ADJACENT working behavior the new control must not
// disturb:
//   - the admin tab switcher is rendered only for an admin;
//   - selecting the Admin tab renders the admin panel with its existing cards;
//   - a non-admin never sees the admin panel (the admin tab is absent and the
//     panel is replaced by the locked notice).
//
// The real SettingsPage is rendered; only the auth context, the query hooks, the
// notification sink, the canister config, and the two heavy child components
// (HealthTab, VersionIndicator) are local typed mocks.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const queriesMock = vi.hoisted(() => ({
  useActiveNfts: vi.fn(),
  // [ADMIN-REASSIGN] The accepted change added these two hooks to
  // @/hooks/useQueries and SettingsPage now calls them. This suite fully mocks
  // that module, so the mock must expose every export the component uses or the
  // render throws. The reassignment control itself is covered by
  // SettingsAdminReassign.cover.test.tsx; here they are inert stubs so the
  // adjacent admin-panel structure can still be characterized.
  useAdminReassignAllOwned: vi.fn(),
  useAdminReassignOwner: vi.fn(),
  useApprovePaymentProof: vi.fn(),
  useAvailableNfts: vi.fn(),
  useBackendBuildTimestamp: vi.fn(),
  useClaimedNfts: vi.fn(),
  useClearRateOverride: vi.fn(),
  useHealthMetrics: vi.fn(),
  useListPaymentProofs: vi.fn(),
  useMetricsCanisterId: vi.fn(),
  useMyPaymentProofs: vi.fn(),
  usePaymentConfig: vi.fn(),
  useRejectPaymentProof: vi.fn(),
  useSetPaymentAddress: vi.fn(),
  useSetRateOverride: vi.fn(),
  useSetUserStripeProductId: vi.fn(),
  useStorageUsage: vi.fn(),
  useSubmitPaymentProof: vi.fn(),
  useTotalClaims: vi.fn(),
  useTotalCollections: vi.fn(),
  useTotalCreators: vi.fn(),
  useTotalNfts: vi.fn(),
}));

const notificationsMock = vi.hoisted(() => ({
  addNotification: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
}));

vi.mock("@/hooks/useQueries", () => queriesMock);

vi.mock("@/hooks/useNotifications", () => ({
  addNotification: notificationsMock.addNotification,
}));

vi.mock("@/config/canisters", () => ({
  getBackendCanisterId: vi.fn(async () => "backend-canister"),
  CANISTERS: { frontend: "frontend-canister", backend: "backend-canister" },
  validateCanisterId: vi.fn(() => true),
}));

// The health tab and version indicator pull their own large hook sets; they are
// not the subject of this characterization, so render inert stand-ins.
vi.mock("@/components/HealthTab", () => ({
  default: () => <div data-ocid="health_tab.stub" />,
}));
vi.mock("@/components/VersionIndicator", () => ({
  VersionIndicator: () => <div data-ocid="version_indicator.stub" />,
}));
// InstallAppPrompt reads window.matchMedia, which jsdom does not implement; it
// is not the subject of this characterization, so render an inert stand-in.
vi.mock("@/components/InstallAppPrompt", () => ({
  default: () => <div data-ocid="install_app_prompt.stub" />,
}));

// SettingsPage imports only TYPES from @/backend plus the string enums. The real
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

import SettingsPage from "@/pages/SettingsPage";

function mockMutation() {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };
}

function setAuth(overrides: Record<string, unknown> = {}) {
  authMock.useAuth.mockReturnValue({
    isAuthenticated: true,
    actor: {
      isLiveCanister: vi.fn(async () => false),
      getCallerProfile: vi.fn(async () => ({ stripeProductId: "" })),
      getCanisterId: vi.fn(async () => "backend-canister"),
      getCollectionId: vi.fn(async () => null),
      getStripeStatus: vi.fn(async () => ({ configured: false, mode: "test" })),
    },
    principal: "aaaaa-aa",
    isAdmin: true,
    isAdminLoading: false,
    hasRealAdmin: true,
    hasRealAdminLoading: false,
    setupAdmin: vi.fn(async () => true),
    ...overrides,
  });
}

function setDefaultQueries() {
  queriesMock.useActiveNfts.mockReturnValue({ data: [], isLoading: false });
  queriesMock.useAdminReassignAllOwned.mockReturnValue(mockMutation());
  queriesMock.useAdminReassignOwner.mockReturnValue(mockMutation());
  queriesMock.useApprovePaymentProof.mockReturnValue(mockMutation());
  queriesMock.useAvailableNfts.mockReturnValue({ data: [], isLoading: false });
  queriesMock.useBackendBuildTimestamp.mockReturnValue({ data: 0n });
  queriesMock.useClaimedNfts.mockReturnValue({ data: [], isLoading: false });
  queriesMock.useClearRateOverride.mockReturnValue(mockMutation());
  queriesMock.useHealthMetrics.mockReturnValue({
    data: null,
    isLoading: false,
  });
  queriesMock.useListPaymentProofs.mockReturnValue({
    data: [],
    isLoading: false,
  });
  queriesMock.useMetricsCanisterId.mockReturnValue({
    data: "metrics-canister",
  });
  queriesMock.useMyPaymentProofs.mockReturnValue({
    data: [],
    isLoading: false,
  });
  queriesMock.usePaymentConfig.mockReturnValue({
    data: { paymentAddress: "aaaaa-aa" },
    isLoading: false,
    isError: false,
  });
  queriesMock.useRejectPaymentProof.mockReturnValue(mockMutation());
  queriesMock.useSetPaymentAddress.mockReturnValue(mockMutation());
  queriesMock.useSetRateOverride.mockReturnValue(mockMutation());
  queriesMock.useSetUserStripeProductId.mockReturnValue(mockMutation());
  queriesMock.useStorageUsage.mockReturnValue({ data: null, isLoading: false });
  queriesMock.useSubmitPaymentProof.mockReturnValue(mockMutation());
  queriesMock.useTotalClaims.mockReturnValue({ data: 0n });
  queriesMock.useTotalCollections.mockReturnValue({ data: 0n });
  queriesMock.useTotalCreators.mockReturnValue({ data: 0n });
  queriesMock.useTotalNfts.mockReturnValue({ data: 0n });
}

function renderSettings() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsPage />
    </QueryClientProvider>,
  );
}

describe("Settings admin panel structure (characterization)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth({ isAdmin: true });
    setDefaultQueries();
  });

  it("renders the admin tab switcher for an admin", async () => {
    renderSettings();
    expect(await screen.findByText("Settings")).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="settings.tab_switcher"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="settings.admin_tab"]'),
    ).not.toBeNull();
  });

  it("renders the admin panel with its existing cards when the Admin tab is selected", async () => {
    const user = userEvent.setup();
    renderSettings();

    const adminTab = (await waitFor(() => {
      const el = document.querySelector(
        '[data-ocid="settings.admin_tab"]',
      ) as HTMLButtonElement | null;
      if (!el) throw new Error("admin tab not rendered yet");
      return el;
    })) as HTMLButtonElement;
    await user.click(adminTab);

    await waitFor(() =>
      expect(
        document.querySelector('[data-ocid="settings.admin_panel"]'),
      ).not.toBeNull(),
    );
    // The existing admin cards the new reassignment control must not displace.
    expect(
      document.querySelector('[data-ocid="settings.payment_config_card"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="settings.claim_link_manager_card"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="settings.tier_assignment_card"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="settings.stripe_card"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="settings.payment_queue_card"]'),
    ).not.toBeNull();
  });

  it("hides the admin panel from a non-admin", async () => {
    setAuth({ isAdmin: false });
    renderSettings();

    expect(await screen.findByText("Settings")).toBeInTheDocument();
    // No admin tab switcher and no admin panel for a non-admin.
    expect(
      document.querySelector('[data-ocid="settings.tab_switcher"]'),
    ).toBeNull();
    expect(
      document.querySelector('[data-ocid="settings.admin_panel"]'),
    ).toBeNull();
  });
});
