import { useCallback, useState } from "react";

interface UsePWAUpdateReturn {
  isUpdateAvailable: boolean;
  applyUpdate: () => void;
}

/**
 * PWA update hook — intentionally a no-op.
 *
 * The previous service worker (`/sw.js`) was removed because its fetch
 * handler rejected fetch events with "Failed to convert value to Response",
 * serving stale cached bundles and forcing a manual page refresh after
 * login. This app does not need a service worker, so the SW was
 * unregistered and this hook now returns benign no-op state so that
 * `PWAUpdateBanner` and `App.tsx` continue to import cleanly.
 *
 * On mount we also attempt to unregister any lingering service worker
 * registered under the previous `/sw.js` scope so existing users are not
 * stuck with the broken cached bundle.
 */
export function usePWAUpdate(): UsePWAUpdateReturn {
  const [isUpdateAvailable] = useState(false);

  const applyUpdate = useCallback(() => {
    // No-op: no service worker is registered for this app.
  }, []);

  // Best-effort cleanup: unregister any previously-registered service
  // worker so users are not stuck with the broken cached bundle from the
  // prior `/sw.js` implementation. Failures are swallowed silently.
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {
            // Ignore unregister failures — not a blocking error.
          });
        }
      })
      .catch(() => {
        // Ignore getRegistrations failures.
      });
  }

  return { isUpdateAvailable, applyUpdate };
}
