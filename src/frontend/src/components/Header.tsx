import { useAuth } from "@/contexts/AuthContext";
import { devLog } from "@/utils/devLog";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Diamond,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { NotificationBell } from "./NotificationBell";

interface HeaderProps {
  /** When true, auth button and notification bell are hidden (claim shell). */
  hideNav?: boolean;
}

export function Header({ hideNav = false }: HeaderProps) {
  const { isAuthenticated, login, logout, isAdmin } = useAuth();
  devLog("[RENDER] Header render:", { isAuthenticated });
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const galleryActive = currentPath === "/";
  const howItWorksActive = currentPath.startsWith("/how-it-works");
  const healthActive = currentPath.startsWith("/health");

  const handleLogoClick = () => {
    navigate({ to: "/" });
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={handleLogoClick}
          className="font-semibold text-base text-foreground tracking-tight flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
          data-ocid="header.logo_link"
        >
          <Diamond className="text-[#D4AF37]" size={18} />
          <img
            src={
              resolvedTheme === "light"
                ? "/assets/logo-inverted.jpg"
                : "/assets/logo.jpg"
            }
            alt="ICP Mint Studio"
            className="h-7 w-auto rounded-sm"
            loading="eager"
          />
        </button>
        {!hideNav && (
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className={`flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium transition-colors ${
                galleryActive
                  ? "text-accent bg-accent/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              data-ocid="header.gallery_link"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Gallery</span>
            </Link>
            <Link
              to="/how-it-works"
              className={`flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium transition-colors ${
                howItWorksActive
                  ? "text-accent bg-accent/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              data-ocid="header.how_it_works_link"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">How It Works</span>
            </Link>
            {isAdmin && (
              <Link
                to="/health"
                className={`flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium transition-colors ${
                  healthActive
                    ? "text-accent bg-accent/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                data-ocid="header.health_link"
              >
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Health</span>
              </Link>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle dark/light mode"
              className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              data-ocid="header.theme_toggle"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="text-sm" />
              ) : (
                <Moon className="text-sm" />
              )}
            </button>
            {isAuthenticated && <NotificationBell />}
            {isAuthenticated && (
              <Link
                to="/disconnect"
                aria-label="Disconnect"
                className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                data-ocid="header.disconnect_link"
              >
                <LogOut className="w-4 h-4" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                devLog("[LOGIN] click handler entry:", {
                  isAuthenticated,
                  willCall: isAuthenticated ? "logout" : "login",
                });
                if (isAuthenticated) {
                  logout();
                } else {
                  login();
                }
              }}
              className="h-9 px-4 rounded-full text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
              data-ocid="header.auth_button"
            >
              {isAuthenticated ? "Disconnect" : "Connect"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
