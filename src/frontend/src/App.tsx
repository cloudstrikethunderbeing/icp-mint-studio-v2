import { Layout } from "@/components/Layout";
import { PWAUpdateBanner } from "@/components/PWAUpdateBanner";
import { AuthProvider } from "@/contexts/AuthContext";
import { type BackendHealthStatus, useBackendHealth } from "@/hooks/useQueries";
import DisconnectPage from "@/pages/DisconnectPage";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AlertTriangle, Loader2, ServerCrash, ShieldAlert } from "lucide-react";
import { ThemeProvider } from "next-themes";
import { type ReactNode, Suspense, lazy } from "react";
import { Toaster } from "sonner";
import { devLog } from "./utils/devLog";

const ClaimPage = lazy(() => import("@/pages/ClaimPage"));

const DiagnosticPage = lazy(() => import("@/pages/DiagnosticPage"));

const CollectorPage = lazy(() => import("@/pages/CollectorPage"));
const GalleryPage = lazy(() => import("@/pages/GalleryPage"));
const HowItWorksPage = lazy(() => import("@/pages/HowItWorksPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const PostClaimPage = lazy(() => import("@/pages/PostClaimPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const VerifyPage = lazy(() => import("@/pages/VerifyPage"));

const rootRoute = createRootRoute({ component: Layout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: GalleryPage,
});

const studioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/studio",
  component: HomePage,
});

const collectorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/collector",
  component: CollectorPage,
});
const howItWorksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/how-it-works",
  component: HowItWorksPage,
});
const verifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify",
  component: VerifyPage,
});
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const healthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/health",
  component: DiagnosticPage,
});

const disconnectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/disconnect",
  component: DisconnectPage,
});

const verifyByIdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify/$nftUniqueId",
  component: VerifyPage,
});

const claimRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/claim/$claimToken",
  component: ClaimPage,
});

const postClaimRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/claim/$claimToken/success",
  component: PostClaimPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  studioRoute,

  collectorRoute,
  howItWorksRoute,
  verifyRoute,
  verifyByIdRoute,
  claimRoute,
  postClaimRoute,
  profileRoute,
  settingsRoute,
  healthRoute,
  disconnectRoute,
]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ── Canister identity guard (rotation defense) ───────────────────────────────
// Wraps the router so the app NEVER renders against a wrong, missing, or empty
// backend canister. The backend canister ID is resolved at runtime from
// /env.json and validated against the pinned expected live canister. If the
// resolved canister is missing/empty/mismatched, or the live canister reports
// zero NFTs when NFTs are known to exist, we surface a loud, visible error
// instead of silently rendering an empty catalog.
function CanisterGuard({ children }: { children: ReactNode }) {
  const health = useBackendHealth();
  devLog("[CANISTER] backend health:", health);

  if (health.status === "checking") {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen gap-3 bg-background"
        data-ocid="canister.checking_state"
      >
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">
          Verifying backend connection...
        </p>
      </div>
    );
  }

  if (health.status === "wrong-canister") {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen gap-4 px-6 bg-background text-center"
        data-ocid="canister.wrong_canister_state"
      >
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          Backend connection error
        </h1>
        <p className="text-sm text-muted-foreground max-w-md">
          The backend resolved to a different canister than the one expected for
          this deployment. This usually means the backend was rotated or
          recycled. The catalog is intentionally not shown to avoid displaying
          an empty or incorrect collection.
        </p>
        <p className="text-xs font-mono text-muted-foreground break-all max-w-md">
          Resolved: {health.resolved} · Expected: {health.expected}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-ocid="canister.retry_button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (health.status === "unavailable") {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen gap-4 px-6 bg-background text-center"
        data-ocid="canister.unavailable_state"
      >
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ServerCrash className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          Backend unavailable
        </h1>
        <p className="text-sm text-muted-foreground max-w-md">
          The backend canister could not be reached or its identity could not be
          resolved. The catalog is intentionally not shown to avoid displaying
          an empty or incorrect collection.
        </p>
        <p className="text-xs font-mono text-muted-foreground break-all max-w-md">
          {health.reason}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-ocid="canister.retry_button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (health.status === "empty") {
    // The /health diagnostic route must remain reachable in the empty state:
    // it exists specifically to investigate an empty catalog, so it would be
    // self-defeating to block it precisely when data loss is detected. All
    // other routes stay guarded.
    if (window.location.pathname === "/health") {
      return <>{children}</>;
    }
    // The empty catalog is now a HINT, not a hard stop: render the routed
    // content and surface an inline amber notice above it instead of replacing
    // the whole page. This keeps every route usable while still flagging the
    // unexpected empty backend.
    devLog("[GUARD-EMPTY] inline banner rendered:", {
      path: window.location.pathname,
    });
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <output
          className="flex flex-wrap items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-700 dark:text-amber-400"
          data-ocid="canister.empty_backend_state"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm">
            The backend is reachable but reports no NFTs. The catalog may be
            temporarily unavailable.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-ocid="canister.retry_button"
          >
            Retry
          </button>
        </output>
        <div className="flex-1">{children}</div>
      </div>
    );
  }

  // health.status === "ok"
  return <>{children}</>;
}

export default function App() {
  devLog("[RENDER] App render:", {});
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Toaster />
      <AuthProvider>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-screen">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          }
        >
          <PWAUpdateBanner />
          <CanisterGuard>
            <RouterProvider router={router} />
          </CanisterGuard>
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  );
}
