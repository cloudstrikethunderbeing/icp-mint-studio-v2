// Runtime environment loader.
// The backend canister ID is resolved at RUNTIME by fetching /env.json,
// which the platform injects at deploy time. This is the SINGLE source of truth
// for the backend canister ID. There is NO bake-time fallback and NO draft
// fallback, and NO hardcoded live-canister pin.
//
// Rotation defense: the deploy-injected /env.json value is authoritative and
// correct for the CURRENT deployment (draft or live). We trust it as the
// expected canister. We throw loudly ONLY when the resolved ID is missing or
// empty (so we never silently fall back to a rotated/recycled canister). The
// actor-level check (getCanisterIdSafe() vs the deploy-injected ID) and the
// empty-backend health check (getTotalNftCount) live in useBackendHealth.

export interface RuntimeEnv {
  backend_canister_id: string;
  backend_host?: string;
  project_id?: string;
  ii_derivation_origin?: string;
  storage_gateway_url?: string;
  frontend_canister_id?: string;
}

let envPromise: Promise<RuntimeEnv> | null = null;

export async function loadEnv(): Promise<RuntimeEnv> {
  let res: Response;
  try {
    res = await fetch("/env.json", { cache: "no-store" });
  } catch (e) {
    throw new Error(
      `[env] Failed to fetch /env.json at runtime: ${e instanceof Error ? e.message : String(e)}. The backend canister ID cannot be resolved. Ensure /env.json is deployed alongside the SPA.`,
    );
  }
  if (!res.ok) {
    throw new Error(
      `[env] /env.json fetch returned HTTP ${res.status} ${res.statusText}. The backend canister ID cannot be resolved. Ensure /env.json is deployed alongside the SPA.`,
    );
  }
  let raw: unknown;
  try {
    raw = await res.json();
  } catch (e) {
    throw new Error(
      `[env] /env.json is not valid JSON: ${e instanceof Error ? e.message : String(e)}. The backend canister ID cannot be resolved.`,
    );
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error(
      "[env] /env.json root is not an object. The backend canister ID cannot be resolved.",
    );
  }
  const obj = raw as Record<string, unknown>;
  const backend_canister_id = obj.backend_canister_id;
  if (
    typeof backend_canister_id !== "string" ||
    backend_canister_id.trim() === ""
  ) {
    throw new Error(
      `[env] /env.json is missing or has an empty 'backend_canister_id' field. The backend canister ID cannot be resolved. Refusing to fall back to any baked or draft value.`,
    );
  }
  return {
    backend_canister_id,
    backend_host:
      typeof obj.backend_host === "string" ? obj.backend_host : undefined,
    project_id: typeof obj.project_id === "string" ? obj.project_id : undefined,
    ii_derivation_origin:
      typeof obj.ii_derivation_origin === "string"
        ? obj.ii_derivation_origin
        : undefined,
    storage_gateway_url:
      typeof obj.storage_gateway_url === "string"
        ? obj.storage_gateway_url
        : undefined,
    frontend_canister_id:
      typeof obj.frontend_canister_id === "string"
        ? obj.frontend_canister_id
        : undefined,
  };
}

// Memoized: the fetch happens once per page load. Concurrent callers share the
// in-flight promise so we never fetch /env.json more than once.
export function getEnv(): Promise<RuntimeEnv> {
  if (!envPromise) {
    envPromise = loadEnv();
  }
  return envPromise;
}

export async function getBackendCanisterId(): Promise<string> {
  const env = await getEnv();
  // The deploy-injected /env.json value is authoritative and correct for the
  // CURRENT deployment (draft or live). loadEnv() already throws loudly when
  // backend_canister_id is missing or empty, so we never silently fall back to
  // a rotated/recycled canister. We do NOT compare against a hardcoded live
  // canister here — that would break the draft deployment. The actor-level
  // mismatch check (getCanisterIdSafe vs this ID) happens in useBackendHealth.
  return env.backend_canister_id;
}
