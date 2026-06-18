import { usePWAUpdate } from "@/hooks/usePWAUpdate";
import { RefreshCw, X } from "lucide-react";
import { useState } from "react";

export function PWAUpdateBanner() {
  const { isUpdateAvailable, applyUpdate } = usePWAUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (!isUpdateAvailable || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      data-ocid="pwa_update.banner"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-2.5 bg-primary text-primary-foreground shadow-lg"
    >
      <div className="flex items-center gap-2 min-w-0">
        <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium truncate">
          A new version of ICP Mint Studio is available
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          data-ocid="pwa_update.update_button"
          onClick={applyUpdate}
          className="text-xs font-semibold underline underline-offset-2 hover:no-underline transition-all"
        >
          Update Now
        </button>
        <button
          type="button"
          data-ocid="pwa_update.dismiss_button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss update notification"
          className="rounded-full p-0.5 hover:bg-primary-foreground/20 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
