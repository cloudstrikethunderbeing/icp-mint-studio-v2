import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { ReferralBanner } from "@/components/ReferralBanner";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { devLog } from "../utils/devLog";

/**
 * Derive which shell we're in from the current pathname.
 *
 * The dApp is unified: every route renders inside ONE consistent shell with the
 * sticky Header (logo, nav links, login/connect, notification bell) and the
 * BottomNav. The only exception is the claim flow, which stays a minimal
 * token-entry surface with no navigation chrome.
 */
function useShell(): "claim" | "app" {
  const routerState = useRouterState();
  const path = routerState.location.pathname;
  if (path.startsWith("/claim")) return "claim";
  return "app";
}

export function Layout() {
  const shell = useShell();
  devLog("[RENDER] Layout render:", { shell });

  if (shell === "claim") {
    // Claim shell: no nav, no admin banner, minimal chrome.
    return (
      <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
        <Header hideNav />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  // Unified app shell: the same Header + BottomNav on every route, including
  // the landing page at "/". The ReferralBanner surfaces eligible-pending /
  // newly-awarded state and renders nothing when there is no referral activity.
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1 pb-20 overflow-y-auto">
        <ReferralBanner />
        <Outlet />
      </main>
      <BottomNav shell="app" />
    </div>
  );
}
