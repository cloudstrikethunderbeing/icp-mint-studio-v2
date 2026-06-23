import { Layout } from "@/components/Layout";
import { PWAUpdateBanner } from "@/components/PWAUpdateBanner";
import { AuthProvider } from "@/contexts/AuthContext";
import DisconnectPage from "@/pages/DisconnectPage";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "next-themes";
import { Suspense, lazy } from "react";
import { Toaster } from "sonner";

const ClaimPage = lazy(() => import("@/pages/ClaimPage"));

const CollectorPage = lazy(() => import("@/pages/CollectorPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const PostClaimPage = lazy(() => import("@/pages/PostClaimPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const VerifyPage = lazy(() => import("@/pages/VerifyPage"));

const rootRoute = createRootRoute({ component: Layout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const collectorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/collector",
  component: CollectorPage,
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

  collectorRoute,
  verifyRoute,
  verifyByIdRoute,
  claimRoute,
  postClaimRoute,
  profileRoute,
  settingsRoute,
]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
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
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  );
}
