import { AdminBanner } from "@/components/AdminBanner";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { Outlet, useRouterState } from "@tanstack/react-router";

/** Derive which shell we're in from the current pathname. */
function useShell(): "claim" | "collector" | "studio" {
  const routerState = useRouterState();
  const path = routerState.location.pathname;
  if (path.startsWith("/claim")) return "claim";
  if (
    path === "/collector" ||
    path === "/wallet" ||
    path.startsWith("/profile") ||
    path.startsWith("/verify") ||
    path.startsWith("/settings")
  )
    return "collector";
  return "studio";
}

export function Layout() {
  const shell = useShell();

  if (shell === "claim") {
    // Claim shell: no nav, no admin banner, minimal chrome
    return (
      <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
        <Header hideNav />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  if (shell === "collector") {
    // Collector shell: hardcoded collector nav, no admin banner
    return (
      <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
        <Header />
        <main className="flex-1 pb-20 overflow-y-auto">
          <Outlet />
        </main>
        <BottomNav shell="collector" />
      </div>
    );
  }

  // Studio shell: existing full layout with admin banner
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />
      <AdminBanner />
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav shell="studio" />
    </div>
  );
}
