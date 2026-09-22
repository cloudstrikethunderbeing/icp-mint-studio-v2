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

// Structured result of validating a resolved canister ID. The deploy-injected
// /env.json value is authoritative and correct for the CURRENT deployment
// (draft or live), so a non-empty resolved ID is trusted as the expected
// canister. The wrong-canister detection (actor.getCanisterIdSafe() vs the
// deploy-injected ID) happens at the actor level in useBackendHealth.
export type CanisterValidation =
  | { status: "ok"; canisterId: string }
  | { status: "unavailable"; reason: string };

// Synchronous validation of a resolved canister ID. Returns a structured
// result so the UI can render a specific message without throwing. A non-empty
// resolved ID is trusted (it is the deploy-injected expected canister); only a
// missing/empty ID is flagged as unavailable.
export function validateCanisterId(resolved: string): CanisterValidation {
  if (!resolved || resolved.trim() === "") {
    return {
      status: "unavailable",
      reason: "The backend canister ID could not be resolved from /env.json.",
    };
  }
  return { status: "ok", canisterId: resolved };
}

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
