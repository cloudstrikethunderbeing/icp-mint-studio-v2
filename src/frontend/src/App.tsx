import { Layout } from "@/components/Layout";
import { AuthProvider } from "@/contexts/AuthContext";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "next-themes";
import { Suspense, lazy } from "react";

const CollectionsPage = lazy(() => import("@/pages/CollectionsPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const VerifyPage = lazy(() => import("@/pages/VerifyPage"));

const rootRoute = createRootRoute({ component: Layout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});
const collectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/collections",
  component: CollectionsPage,
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  collectionsRoute,
  verifyRoute,
  verifyByIdRoute,
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
      <AuthProvider>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-screen">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          }
        >
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  );
}
