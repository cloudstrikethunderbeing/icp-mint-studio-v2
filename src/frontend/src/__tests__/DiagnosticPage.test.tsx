import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Cover: /health is admin-only and reduced to minimal point-form readouts ──
// The current request makes the /health page admin-only and strips it down to
// point-form readouts with a single Refresh action. This suite asserts the
// accepted behavior:
//   1. an admin sees the point-form readout rows and exactly one Refresh button;
//   2. a signed-in non-admin and an anonymous visitor see only the access
//      notice — never the readouts or the Refresh action;
//   3. the page carries no incident-report prose (no recovery walkthrough, no
//      status-definition explainers, no fix-verification narrative).
//
// The real DiagnosticPage is rendered; only the auth context and the two
// metric hooks are local typed mocks. The integrity/canister-id reads go
// through a real QueryClient against a typed local actor stub.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const queriesMock = vi.hoisted(() => ({
  useTotalNfts: vi.fn(),
  useStorageUsage: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
}));

vi.mock("@/hooks/useQueries", () => ({
  useTotalNfts: queriesMock.useTotalNfts,
  useStorageUsage: queriesMock.useStorageUsage,
}));

import DiagnosticPage from "@/pages/DiagnosticPage";

function setAuth(overrides: Record<string, unknown> = {}) {
  authMock.useAuth.mockReturnValue({
    isAuthenticated: true,
    principal: "aaaaa-aa",
    authState: "ready",
    isAdmin: false,
    isAdminLoading: false,
    actor: null,
    ...overrides,
  });
}

function setMetrics(overrides: Record<string, unknown> = {}) {
  queriesMock.useTotalNfts.mockReturnValue({
    data: 42n,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  });
  queriesMock.useStorageUsage.mockReturnValue({
    data: 2048n,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
}

// A typed local actor stub for the two direct useQuery reads on the page.
function makeActor() {
  return {
    getStableStateIntegrity: vi.fn(async () => ({
      collectionCount: 3n,
      nftCount: 42n,
      claimTokenCount: 7n,
      userCount: 5n,
    })),
    getCanisterIdSafe: vi.fn(async () => "backend-canister"),
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DiagnosticPage />
    </QueryClientProvider>,
  );
}

describe("DiagnosticPage (/health) admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    setMetrics();
  });

  it("renders the access notice and no readouts for a signed-in non-admin", () => {
    setAuth({ isAdmin: false, actor: makeActor() });
    renderPage();

    expect(
      document.querySelector('[data-ocid="diagnostic.admin_only_state"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="diagnostic.metrics_section"]'),
    ).toBeNull();
    expect(
      document.querySelector('[data-ocid="diagnostic.refresh_button"]'),
    ).toBeNull();
  });

  it("renders the access notice and no readouts for an anonymous visitor", () => {
    setAuth({ isAuthenticated: false, isAdmin: false, actor: null });
    renderPage();

    expect(
      document.querySelector('[data-ocid="diagnostic.admin_only_state"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="diagnostic.metrics_section"]'),
    ).toBeNull();
  });

  it("shows a loading state while admin status is still resolving", () => {
    setAuth({ isAdmin: false, isAdminLoading: true, actor: null });
    renderPage();

    expect(
      document.querySelector('[data-ocid="diagnostic.loading_state"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="diagnostic.admin_only_state"]'),
    ).toBeNull();
  });
});

describe("DiagnosticPage (/health) minimal readouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth({ isAdmin: true, actor: makeActor() });
    setMetrics();
  });

  it("renders point-form readout rows for an admin", async () => {
    renderPage();

    const section = await waitFor(() => {
      const el = document.querySelector(
        '[data-ocid="diagnostic.metrics_section"]',
      );
      if (!el) throw new Error("metrics section not rendered yet");
      return el;
    });
    expect(section).not.toBeNull();

    const rows = document.querySelectorAll(
      '[data-ocid="diagnostic.readout_row"]',
    );
    expect(rows.length).toBeGreaterThan(0);

    // The readouts are the live canister state, in point form.
    expect(screen.getByText("BACKEND CANISTER")).toBeInTheDocument();
    expect(screen.getByText("TOTAL NFTs IN CATALOG")).toBeInTheDocument();
    expect(screen.getByText("STORAGE USAGE")).toBeInTheDocument();
    expect(screen.getByText("CATALOG INTEGRITY")).toBeInTheDocument();
    expect(screen.getByText("backend-canister")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("exposes exactly one Refresh action", async () => {
    renderPage();

    await waitFor(() =>
      expect(
        document.querySelector('[data-ocid="diagnostic.metrics_section"]'),
      ).not.toBeNull(),
    );

    const refreshButtons = document.querySelectorAll(
      '[data-ocid="diagnostic.refresh_button"]',
    );
    expect(refreshButtons.length).toBe(1);
    expect(refreshButtons[0].textContent).toContain("Refresh");
  });

  it("refetches the readouts when Refresh is clicked", async () => {
    const user = userEvent.setup();
    const totalRefetch = vi.fn();
    const storageRefetch = vi.fn();
    queriesMock.useTotalNfts.mockReturnValue({
      data: 42n,
      isLoading: false,
      isError: false,
      refetch: totalRefetch,
    });
    queriesMock.useStorageUsage.mockReturnValue({
      data: 2048n,
      isLoading: false,
      isError: false,
      refetch: storageRefetch,
    });

    renderPage();

    const refresh = (await waitFor(() => {
      const el = document.querySelector(
        '[data-ocid="diagnostic.refresh_button"]',
      ) as HTMLButtonElement | null;
      if (!el) throw new Error("refresh button not rendered yet");
      return el;
    })) as HTMLButtonElement;

    await user.click(refresh);

    await waitFor(() => expect(totalRefetch).toHaveBeenCalled());
    expect(storageRefetch).toHaveBeenCalled();
  });

  it("carries no incident-report prose", async () => {
    renderPage();

    await waitFor(() =>
      expect(
        document.querySelector('[data-ocid="diagnostic.metrics_section"]'),
      ).not.toBeNull(),
    );

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/recovery/i);
    expect(text).not.toMatch(/incident/i);
    expect(text).not.toMatch(/walkthrough/i);
    expect(text).not.toMatch(/restore/i);
  });
});
