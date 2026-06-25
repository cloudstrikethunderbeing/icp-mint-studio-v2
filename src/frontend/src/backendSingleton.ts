import { ExternalBlob, createActor } from "@/backend";
import type { backendInterface } from "@/backend";
import { CANISTERS } from "@/config/canisters";
import type { Identity } from "@icp-sdk/core/agent";

/**
 * Pure actor factory — NO caching, NO singletons, NO anonymous fallbacks.
 * Creates a fresh actor every time, strictly bound to the provided identity.
 *
 * This is the ONLY actor creation path in the entire codebase.
 * All other actor creation paths must be removed or deprecated.
 */
export function createAuthenticatedActor(identity: Identity): backendInterface {
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

  // TEMP LOG: actor creation lifecycle
  console.log("[BACKEND] creating actor for principal:", principalText);
  console.log("[BACKEND] target canisterId:", CANISTERS.backend);

  // Create actor with identity-bound agent
  // This is the ONLY call to createActor in the entire app
  // Note: generated createActor signature is (canisterId, uploadFn, downloadFn, options)
  const actor = createActor(
    CANISTERS.backend,
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
