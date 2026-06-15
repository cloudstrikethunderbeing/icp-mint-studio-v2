import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import { Diamond, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { NotificationBell } from "./NotificationBell";

export function Header() {
  const { isAuthenticated, login, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
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
        <div className="flex items-center gap-3">
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
          <button
            type="button"
            onClick={isAuthenticated ? logout : login}
            className="h-9 px-4 rounded-full text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
            data-ocid="header.auth_button"
          >
            {isAuthenticated ? "Disconnect" : "Connect"}
          </button>
        </div>
      </div>
    </header>
  );
}
