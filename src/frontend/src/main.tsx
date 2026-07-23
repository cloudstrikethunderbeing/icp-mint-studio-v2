import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// [RECON] Reconciliation event name — dispatched by AuthContext when the
// wrapper's live post-login path fails (loginStatus === 'loginError' after a
// login attempt with no published identity). main.tsx listens for this event
// and bumps providerKey, which remounts <InternetIdentityProvider>. The
// remount re-runs the wrapper's mount effect, which rehydrates the persisted
// II delegation and publishes the identity (the proven recovery path).
export const RECONCILE_LOGIN_EVENT = "icp-mint:reconcile-login";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Number.POSITIVE_INFINITY,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

// TEMP LOG: verify which canister the frontend is wired to at boot
import { CANISTERS } from "@/config/canisters";
console.log("[MAIN] CANISTERS.backend:", CANISTERS.backend);
console.log("[MAIN] CANISTERS.frontend:", CANISTERS.frontend);

// [RECON] Root owns the providerKey state and the reconciliation event
// listener. AuthContext (which lives INSIDE <InternetIdentityProvider>) cannot
// pass props up to the provider, so it dispatches a CustomEvent on window
// instead. When the event fires, Root increments providerKey, forcing React to
// unmount and remount <InternetIdentityProvider>. The remount re-runs the
// wrapper's mount effect — the only mechanism that re-reads the persisted II
// delegation — which rehydrates and publishes the identity.
function Root() {
  const [providerKey, setProviderKey] = useState(0);

  useEffect(() => {
    const handler = () => {
      console.log(
        "[RECON] reconcile-login event received; bumping providerKey",
      );
      setProviderKey((k) => k + 1);
    };
    window.addEventListener(RECONCILE_LOGIN_EVENT, handler);
    return () => window.removeEventListener(RECONCILE_LOGIN_EVENT, handler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <InternetIdentityProvider key={providerKey} withAttributes={false}>
        <App />
      </InternetIdentityProvider>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
