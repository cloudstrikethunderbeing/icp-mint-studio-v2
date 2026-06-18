import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { AlertTriangle, Crown, Loader2 } from "lucide-react";
import { useState } from "react";

export function AdminBanner() {
  const { showAdminBanner, claimAdmin, dismissAdminBanner } = useAuth();
  const { isAdmin } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already admin or banner not shown — render nothing
  if (!showAdminBanner || isAdmin) return null;

  async function handleClaimAdmin() {
    setLoading(true);
    setError(null);
    try {
      await claimAdmin();
      // showAdminBanner becomes false automatically after claimAdmin succeeds
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to claim admin. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="w-full bg-primary/95 border-b border-accent/40 px-4 py-3"
      role="alert"
      aria-live="polite"
      data-ocid="admin_banner.panel"
    >
      <div className="max-w-lg mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Icon + Message */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span
            className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#D4AF37" }}
            aria-hidden="true"
          >
            <Crown className="text-primary w-4 h-4" />
          </span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-sm font-semibold text-primary-foreground leading-snug">
              You are the first user.
            </p>
            <p className="text-xs text-primary-foreground/80 leading-snug">
              Set yourself as admin to unlock full platform controls.
            </p>
            {error && (
              <p
                className="text-xs mt-1 font-medium"
                style={{ color: "#D4AF37" }}
                data-ocid="admin_banner.error_state"
              >
                <AlertTriangle className="w-3 h-3 mr-1 inline" />
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={handleClaimAdmin}
            className="text-primary font-semibold text-xs px-4 h-8 border-0 hover:opacity-90 transition-opacity"
            style={{ background: "#D4AF37", color: "hsl(var(--primary))" }}
            data-ocid="admin_banner.set_admin_button"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                Setting...
              </>
            ) : (
              <>
                <Crown className="w-3 h-3 mr-1.5" />
                Set as Admin
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={dismissAdminBanner}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 text-xs h-8 px-3"
            data-ocid="admin_banner.dismiss_button"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
