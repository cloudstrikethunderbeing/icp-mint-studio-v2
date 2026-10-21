import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Cover: Settings admin ownership-reassignment control ─────────────────────
// The accepted change adds an admin-only control to the Settings admin panel:
//   - a single-NFT action that reassigns one id to a target principal;
//   - a batch action that reassigns every original NFT in one call;
//   - per-id success/failure reporting.
//
// The real SettingsPage is rendered. The reassignment hooks are local typed
// mocks so the journey can assert the exact arguments the control passes and
// drive the per-id result rendering; the auth context, the other query hooks,
// the notification sink, the canister config, and the two heavy child
// components are inert stand-ins. The backend admin gate and the in-place
// ownerId-only rewrite are backend behaviors this mocked suite cannot vouch for
// (recorded as coverage limits).

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const queriesMock = vi.hoisted(() => ({
  useActiveNfts: vi.fn(),
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

vi.mock("@/components/HealthTab", () => ({
  default: () => <div data-ocid="health_tab.stub" />,
}));
vi.mock("@/components/VersionIndicator", () => ({
  VersionIndicator: () => <div data-ocid="version_indicator.stub" />,
}));
vi.mock("@/components/InstallAppPrompt", () => ({
  default: () => <div data-ocid="install_app_prompt.stub" />,
}));

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

async function openAdminTab() {
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
      document.querySelector('[data-ocid="settings.reassign_owner_card"]'),
    ).not.toBeNull(),
  );
  return user;
}

describe("Settings admin ownership reassignment (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth({ isAdmin: true });
    setDefaultQueries();
  });

  it("shows the reassignment control with single and batch actions to an admin", async () => {
    await openAdminTab();
    expect(
      document.querySelector('[data-ocid="settings.reassign_target_input"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="settings.reassign_nft_id_input"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="settings.reassign_single_button"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="settings.reassign_batch_button"]'),
    ).not.toBeNull();
  });

  it("hides the reassignment control from a non-admin", async () => {
    setAuth({ isAdmin: false });
    renderSettings();
    expect(await screen.findByText("Settings")).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="settings.reassign_owner_card"]'),
    ).toBeNull();
  });

  it("single action calls the single-reassign mutation with the parsed id and target", async () => {
    const single = mockMutation();
    queriesMock.useAdminReassignOwner.mockReturnValue(single);
    const user = await openAdminTab();

    await user.type(
      document.querySelector(
        '[data-ocid="settings.reassign_target_input"]',
      ) as HTMLInputElement,
      "2vxsx-fae",
    );
    await user.type(
      document.querySelector(
        '[data-ocid="settings.reassign_nft_id_input"]',
      ) as HTMLInputElement,
      "7",
    );
    await user.click(
      document.querySelector(
        '[data-ocid="settings.reassign_single_button"]',
      ) as HTMLButtonElement,
    );

    expect(single.mutate).toHaveBeenCalledTimes(1);
    expect(single.mutate.mock.calls[0][0]).toEqual({
      id: 7n,
      newOwner: "2vxsx-fae",
    });
  });

  it("batch action calls the reassign-all mutation with the target", async () => {
    const batch = mockMutation();
    queriesMock.useAdminReassignAllOwned.mockReturnValue(batch);
    const user = await openAdminTab();

    await user.type(
      document.querySelector(
        '[data-ocid="settings.reassign_target_input"]',
      ) as HTMLInputElement,
      "2vxsx-fae",
    );
    await user.click(
      document.querySelector(
        '[data-ocid="settings.reassign_batch_button"]',
      ) as HTMLButtonElement,
    );

    expect(batch.mutate).toHaveBeenCalledTimes(1);
    expect(batch.mutate.mock.calls[0][0]).toEqual({ newOwner: "2vxsx-fae" });
  });

  it("renders per-id success and failure results after a batch reassignment", async () => {
    const batch = mockMutation();
    // The component passes an onSuccess callback to mutate; invoke it with a
    // mixed result set to drive the per-id rendering.
    batch.mutate.mockImplementation(
      (_vars: unknown, opts?: { onSuccess?: (r: unknown[]) => void }) => {
        opts?.onSuccess?.([
          { id: 1n, ok: true },
          { id: 2n, ok: false, error: "NFT not found" },
        ]);
      },
    );
    queriesMock.useAdminReassignAllOwned.mockReturnValue(batch);
    const user = await openAdminTab();

    await user.type(
      document.querySelector(
        '[data-ocid="settings.reassign_target_input"]',
      ) as HTMLInputElement,
      "2vxsx-fae",
    );
    await user.click(
      document.querySelector(
        '[data-ocid="settings.reassign_batch_button"]',
      ) as HTMLButtonElement,
    );

    await waitFor(() =>
      expect(
        document.querySelector('[data-ocid="settings.reassign_results_state"]'),
      ).not.toBeNull(),
    );
    expect(screen.getByText("1 of 2 reassigned")).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="settings.reassign_result_item.1"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="settings.reassign_result_item.2"]'),
    ).not.toBeNull();
    expect(screen.getByText("NFT not found")).toBeInTheDocument();
  });

  it("rejects a non-integer NFT id without calling the mutation", async () => {
    const single = mockMutation();
    queriesMock.useAdminReassignOwner.mockReturnValue(single);
    const user = await openAdminTab();

    await user.type(
      document.querySelector(
        '[data-ocid="settings.reassign_target_input"]',
      ) as HTMLInputElement,
      "2vxsx-fae",
    );
    // A negative id is not a valid whole NFT id.
    await user.type(
      document.querySelector(
        '[data-ocid="settings.reassign_nft_id_input"]',
      ) as HTMLInputElement,
      "-3",
    );
    await user.click(
      document.querySelector(
        '[data-ocid="settings.reassign_single_button"]',
      ) as HTMLButtonElement,
    );

    expect(single.mutate).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        document.querySelector('[data-ocid="settings.reassign_error_state"]'),
      ).not.toBeNull(),
    );
  });
});
