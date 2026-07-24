import { ExternalBlob, createActor } from "@/backend";
import type { backendInterface } from "@/backend";
import type { Identity } from "@icp-sdk/core/agent";
import { getBackendCanisterId } from "./config/env";

/**
 * Pure actor factory — NO caching, NO singletons, NO anonymous fallbacks.
 * Creates a fresh actor every time, strictly bound to the provided identity.
 *
 * This is the ONLY actor creation path in the entire codebase.
 * All other actor creation paths must be removed or deprecated.
 *
 * The backend canister ID is resolved at RUNTIME from /env.json via
 * getBackendCanisterId(). There is NO bake-time fallback and NO draft
 * fallback — if /env.json is missing/malformed/empty, this throws loudly
 * and the caller's existing error-handling path takes over.
 */
export async function createAuthenticatedActor(
  identity: Identity,
): Promise<backendInterface> {
  // HARD GUARD 1: Identity must exist
  if (!identity) {
    throw new Error(
      "ICP AUTH ERROR: Missing identity — cannot create actor without authenticated identity",
    );
  }

  const principal = identity.getPrincipal();
  const principalText = principal.toText();

  // HARD GUARD 2: Principal must not be anonymous
  if (principal.isAnonymous() || principalText === "2vxsx-fae") {
    throw new Error(
      "ICP AUTH ERROR: Anonymous identity blocked — principal is 2vxsx-fae",
    );
  }

  // Resolve the backend canister ID at RUNTIME from /env.json. Throws
  // loudly if /env.json is missing/malformed/empty — NO fallback.
  const canisterId = await getBackendCanisterId();

  // TEMP LOG: actor creation lifecycle
  console.log("[BACKEND] creating actor for principal:", principalText);
  console.log("[BACKEND] target canisterId:", canisterId);

  // Create actor with identity-bound agent
  // This is the ONLY call to createActor in the entire app
  // Note: generated createActor signature is (canisterId, uploadFn, downloadFn, options)
  const actor = createActor(
    canisterId,
    async (file) => {
      const bytes = await file.getBytes();
      return bytes;
    },
    async (bytes) => {
      return ExternalBlob.fromBytes(bytes as Uint8Array<ArrayBuffer>);
    },
    {
      agentOptions: {
        identity,
      },
    },
  );

  console.log(
    "[BACKEND] actor created successfully for principal:",
    principalText,
  );
  return actor;
}
