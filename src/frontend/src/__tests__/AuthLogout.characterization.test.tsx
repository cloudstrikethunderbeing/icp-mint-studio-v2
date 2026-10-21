import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Characterization: logout returns to the landing page at "/" ──────────────
// The current request unifies the shell and makes the public gallery a section
// of the landing page at "/". The accepted behavior "logout returns the user to
// the landing page at '/'" already works in AuthContext.logout() and must
// survive the unification. This suite freezes that navigation target (and the
// cache clear that makes the return clean) without asserting anything about the
// landing page's internal composition, which the request intentionally changes.
//
// AuthContext is exercised for real; its heavy seams (Internet Identity, the
// authenticated actor factory, the router, and the reconcile event constant)
// are typed local stubs.

const iiMock = vi.hoisted(() => ({
  useInternetIdentity: vi.fn(),
}));

const routerMock = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

const actorMock = vi.hoisted(() => ({
  createAuthenticatedActor: vi.fn(),
}));

vi.mock("@caffeineai/core-infrastructure", () => ({
  useInternetIdentity: iiMock.useInternetIdentity,
}));

vi.mock("@/backendSingleton", () => ({
  createAuthenticatedActor: actorMock.createAuthenticatedActor,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => routerMock.navigate,
}));

vi.mock("../main", () => ({
  RECONCILE_LOGIN_EVENT: "icp-mint:reconcile-login",
}));

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

function LogoutProbe() {
  const { logout } = useAuth();
  return (
    <button type="button" onClick={logout} data-ocid="probe.logout">
      Logout
    </button>
  );
}

function renderProbe() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const clearSpy = vi.spyOn(queryClient, "clear");
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LogoutProbe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { ...utils, clearSpy };
}

describe("AuthContext logout navigation (characterization)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    iiMock.useInternetIdentity.mockReturnValue({
      identity: null,
      isAuthenticated: false,
      login: vi.fn(),
      clear: vi.fn(),
      loginStatus: "idle",
      isLoginSuccess: false,
      isLoginError: false,
    });
  });

  it("navigates to / and clears the query cache on logout", async () => {
    const user = userEvent.setup();
    const { clearSpy } = renderProbe();
    await user.click(
      document.querySelector('[data-ocid="probe.logout"]') as HTMLButtonElement,
    );
    expect(routerMock.navigate).toHaveBeenCalledWith({ to: "/" });
    expect(clearSpy).toHaveBeenCalled();
  });

  it("clears persisted notification history on logout", async () => {
    const user = userEvent.setup();
    localStorage.setItem("icpms_notifications_aaaaa-aa", "[]");
    renderProbe();
    await user.click(
      document.querySelector('[data-ocid="probe.logout"]') as HTMLButtonElement,
    );
    expect(localStorage.getItem("icpms_notifications_aaaaa-aa")).toBeNull();
  });

  it("renders the probe without crashing while unauthenticated", () => {
    renderProbe();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });
});
