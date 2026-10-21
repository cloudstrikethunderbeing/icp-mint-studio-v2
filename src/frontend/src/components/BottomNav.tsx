import { useAuth } from "@/contexts/AuthContext";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  HelpCircle,
  LayoutGrid,
  Library,
  Settings,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import { devLog } from "../utils/devLog";

interface BottomNavProps {
  /**
   * The unified shell renders the nav for "app". "none" renders nothing.
   * "collector"/"studio" are retained as accepted aliases for callers that
   * still pass the legacy shell names; they render the same unified nav.
   */
  shell: "app" | "collector" | "studio" | "none";
}

export function BottomNav({ shell }: BottomNavProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { isAuthenticated, isAdmin } = useAuth();
  devLog("[RENDER] BottomNav render:", { isAuthenticated, isAdmin });

  if (shell === "none") return null;

  // Navigation is derived from a single authentication source.
  // Anonymous visitors get the public tabs (Gallery, How It Works, Verify).
  // Authenticated users get the full dApp tab set. No CSS hiding — tabs are
  // either in the array or not rendered at all.
  const tabs = isAuthenticated
    ? [
        {
          to: "/collector",
          label: "Library",
          Icon: Library,
          ocid: "nav.collector.library",
        },
        { to: "/verify", label: "Verify", Icon: Shield, ocid: "nav.verify" },
        {
          to: "/how-it-works",
          label: "How It Works",
          Icon: HelpCircle,
          ocid: "nav.how_it_works",
        },
        { to: "/profile", label: "Profile", Icon: User, ocid: "nav.profile" },
        {
          to: "/settings",
          label: "Settings",
          Icon: Settings,
          ocid: "nav.settings",
        },
        { to: "/studio", label: "Studio", Icon: Sparkles, ocid: "nav.studio" },
      ]
    : [
        { to: "/", label: "Gallery", Icon: LayoutGrid, ocid: "nav.gallery" },
        {
          to: "/how-it-works",
          label: "How It Works",
          Icon: HelpCircle,
          ocid: "nav.how_it_works",
        },
        { to: "/verify", label: "Verify", Icon: Shield, ocid: "nav.verify" },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-inset-bottom">
      <div className="flex items-stretch max-w-2xl mx-auto">
        {tabs.map((tab) => {
          // Exact match for the landing route "/" (otherwise every path would
          // match); prefix match for the rest, with the Library tab pinned to
          // its exact route.
          const isActive =
            tab.to === "/"
              ? currentPath === "/"
              : tab.to === "/collector"
                ? currentPath === "/collector"
                : currentPath.startsWith(tab.to);

          return (
            <Link
              key={tab.label}
              to={tab.to}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-1 min-h-[56px] transition-colors"
              data-ocid={tab.ocid}
            >
              <tab.Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? "text-accent" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
