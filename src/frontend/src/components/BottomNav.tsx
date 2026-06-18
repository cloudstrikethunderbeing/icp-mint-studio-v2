import { Link, useRouterState } from "@tanstack/react-router";
import { Library, Settings, Shield, Sparkles, User } from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";

interface BottomNavProps {
  shell: "collector" | "studio" | "none";
}

export function BottomNav({ shell }: BottomNavProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { isAuthenticated } = usePermissions();

  if (shell === "none") return null;

  // Navigation is derived from a single authentication source.
  // Anonymous users see ONLY Verify. Authenticated users see all tabs.
  // No CSS hiding — tabs are either in the array or not rendered at all.
  const tabs = isAuthenticated
    ? [
        {
          to: "/collector",
          label: "Library",
          Icon: Library,
          ocid: "nav.collector.library",
        },
        { to: "/verify", label: "Verify", Icon: Shield, ocid: "nav.verify" },
        { to: "/profile", label: "Profile", Icon: User, ocid: "nav.profile" },
        {
          to: "/settings",
          label: "Settings",
          Icon: Settings,
          ocid: "nav.settings",
        },
        { to: "/", label: "Studio", Icon: Sparkles, ocid: "nav.studio" },
      ]
    : [{ to: "/verify", label: "Verify", Icon: Shield, ocid: "nav.verify" }];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-inset-bottom">
      <div className="flex items-stretch max-w-2xl mx-auto">
        {tabs.map((tab) => {
          const isActive =
            tab.to === "/collector"
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
