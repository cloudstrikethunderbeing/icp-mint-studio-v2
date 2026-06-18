import { useCallback, useEffect, useState } from "react";

interface UsePWAUpdateReturn {
  isUpdateAvailable: boolean;
  applyUpdate: () => void;
}

export function usePWAUpdate(): UsePWAUpdateReturn {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );

  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    // Listen for controllerchange then reload
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
    if (!waitingWorker) {
      window.location.reload();
    }
  }, [waitingWorker]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // Check if there's already a waiting worker (e.g. on page refresh)
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setIsUpdateAvailable(true);
        }

        // Listen for new service workers entering the waiting state
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New content available
              setWaitingWorker(newWorker);
              setIsUpdateAvailable(true);
            }
          });
        });
      } catch (err) {
        // SW registration failed — not a blocking error
        console.warn("[PWA] Service worker registration failed:", err);
      }
    };

    registerSW();
  }, []);

  return { isUpdateAvailable, applyUpdate };
}
