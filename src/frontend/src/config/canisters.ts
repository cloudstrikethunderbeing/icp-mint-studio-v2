// Canister ID holder.
// The backend canister ID is resolved at RUNTIME from /env.json (see env.ts).
// There is NO bake-time injection and NO draft fallback.
//
// CANISTERS is a mutable holder populated by initCanisters() after /env.json
// loads. It exists only for non-critical display/boot-logging. Code that
// creates an actor MUST use getBackendCanisterId() (async) — never read
// CANISTERS.backend synchronously for actor creation.

import { type RuntimeEnv, getBackendCanisterId, getEnv } from "./env";

export { getBackendCanisterId, type RuntimeEnv };

export const CANISTERS = {
  backend: "",
  frontend: "",
};

let initPromise: Promise<void> | null = null;

// Populates CANISTERS from /env.json. Safe to call multiple times — the
// underlying /env.json fetch is memoized in env.ts.
export function initCanisters(): Promise<void> {
  if (!initPromise) {
    initPromise = getEnv()
      .then((env) => {
        CANISTERS.backend = env.backend_canister_id;
        CANISTERS.frontend = env.frontend_canister_id ?? "";
      })
      .catch((e) => {
        // Re-throw so callers that await initCanisters() see the failure, but
        // do not cache a rejected promise for the holder — a later retry via
        // getBackendCanisterId() still works because env.ts caches its own
        // promise independently.
        initPromise = null;
        throw e;
      });
  }
  return initPromise;
}
