import { useAuth } from "@/contexts/AuthContext";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Settings, Shield, User } from "lucide-react";

const PUBLIC_TABS = [
  { to: "/", label: "Home", Icon: Home, ocid: "nav.home" },
  {
    to: "/verify",
    label: "Verify",
    Icon: Shield,
    ocid: "nav.verify",
  },
];

const AUTH_TABS = [
  { to: "/", label: "Home", Icon: Home, ocid: "nav.home" },
  {
    to: "/verify",
    label: "Verify",
    Icon: Shield,
    ocid: "nav.verify",
  },
  {
    to: "/profile",
    label: "Profile",
    Icon: User,
    ocid: "nav.profile",
  },
  {
    to: "/settings",
    label: "Settings",
    Icon: Settings,
    ocid: "nav.settings",
  },
];

export function BottomNav() {
  const { isAuthenticated } = useAuth();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const tabs = isAuthenticated ? AUTH_TABS : PUBLIC_TABS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-inset-bottom">
      <div className="flex items-stretch max-w-2xl mx-auto">
        {tabs.map((tab) => {
          const isActive =
            tab.to === "/"
              ? currentPath === "/"
              : currentPath.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-1 min-h-[56px] transition-colors"
              data-ocid={tab.ocid}
            >
              <tab.Icon
                className={`text-lg transition-colors ${
                  isActive ? "text-[#D4AF37]" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? "text-[#D4AF37]" : "text-muted-foreground"
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
