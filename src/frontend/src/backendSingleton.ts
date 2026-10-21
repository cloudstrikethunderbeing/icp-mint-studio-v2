import { ExternalBlob, createActor } from "@/backend";
import type { backendInterface } from "@/backend";
import { StorageClient } from "@caffeineai/object-storage";
import type { Identity } from "@icp-sdk/core/agent";
import { HttpAgent } from "@icp-sdk/core/agent";
import { getEnv } from "./config/env";

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

// Mirrors the platform's createActorWithConfig (see
// @caffeineai/core-infrastructure/dist/config.js).
//
// The backend stores RAW image bytes in Nft.imageBlob (Storage.ExternalBlob =
// Blob; the object-storage Motoko mixin has no upload/download functions), so
// downloadFile receives the original image bytes back. Reference strings
// (`!caf!sha256:<64hex>` or a bare 64-hex hash) are ALSO supported for
// compatibility with records written by an object-storage-backed deployment:
// those resolve to a STABLE gateway URL, which is what keeps list-sourced
// records renderable after React Query caches them (a `blob:` URL is revoked
// when its backing Blob is GC'd). Raw bytes are returned as an ExternalBlob
// whose directURL is a live blob: URL.
const MOTOKO_DEDUPLICATION_SENTINEL = "!caf!";
const DEFAULT_STORAGE_GATEWAY_URL = "https://blob.caffeine.ai";
const DEFAULT_BUCKET_NAME = "default-bucket";
const DEFAULT_PROJECT_ID = "0000000-0000-0000-0000-00000000000";
const SHA256_PREFIX = "sha256:";
const GATEWAY_VERSION = "v1";

// [IMG-RESOLVE] Normalize a stored object-storage reference into the
// `sha256:<64hex>` form that StorageClient.getDirectURL requires. The backend
// stores the wire value as `!caf!sha256:<64hex>` (see the object-storage
// mixin), but a record minted before this change — or any record whose stored
// reference lacks the `sha256:` prefix — would otherwise make getDirectURL
// throw, which rejects the whole list decode and blanks the catalog. Accepting
// both forms keeps every pre-existing NFT renderable.
function normalizeStorageHash(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withoutSentinel = trimmed.startsWith(MOTOKO_DEDUPLICATION_SENTINEL)
    ? trimmed.substring(MOTOKO_DEDUPLICATION_SENTINEL.length)
    : trimmed;
  if (withoutSentinel.startsWith(SHA256_PREFIX)) return withoutSentinel;
  // Bare 64-hex hash — add the prefix getDirectURL expects.
  if (/^[0-9a-f]{64}$/i.test(withoutSentinel)) {
    return SHA256_PREFIX + withoutSentinel;
  }
  return null;
}

// [IMG-RESOLVE] Build the stable gateway URL directly, mirroring
// StorageClient.getDirectURL. Used as a fail-safe when getDirectURL rejects so
// a single malformed reference can never reject the whole list decode.
function buildGatewayUrl(
  gatewayUrl: string,
  canisterId: string,
  projectId: string,
  hash: string,
): string {
  const base = gatewayUrl || DEFAULT_STORAGE_GATEWAY_URL;
  return `${base}/${GATEWAY_VERSION}/blob/?blob_hash=${encodeURIComponent(hash)}&owner_id=${encodeURIComponent(canisterId)}&project_id=${encodeURIComponent(projectId)}`;
}

// [IMG-WIRE] Shared, non-throwing decode of an object-storage wire value into
// a renderable ExternalBlob. This is the SINGLE normalization used by every
// actor's downloadFile callback (the authenticated actor below and the
// anonymous claim-preview actor), so no surface can drift onto a divergent
// resolution path.
//
// Two wire formats are handled:
//   1. A reference string (`!caf!sha256:<64hex>` or a bare 64-hex hash) —
//      resolved to a STABLE gateway URL via storageClient.getDirectURL, with a
//      constructed gateway URL as a fail-safe.
//   2. RAW image bytes — returned verbatim as ExternalBlob.fromBytes, whose
//      directURL is a live blob: URL. This is the primary path for this
//      backend, which stores raw bytes in Nft.imageBlob.
//
// MUST NOT throw: it runs inside the generated from_candid_ExternalBlob
// decoder for EVERY record in a list response, so a throw would reject the
// whole list decode and blank the grids. A record with no usable value still
// yields an empty-URL ExternalBlob so the card renders its "No image"
// placeholder instead of dropping the record.
export async function resolveStorageWireBlob(
  bytes: Uint8Array,
  storageClient: StorageClient,
  env: {
    storage_gateway_url?: string;
    project_id?: string;
  },
  canisterId: string,
): Promise<ExternalBlob> {
  const raw = new TextDecoder().decode(bytes);
  const hash = normalizeStorageHash(raw);
  if (!hash) {
    // Not a reference string — treat the bytes as RAW image data.
    console.log(
      `[IMG-WIRE] raw bytes branch: ${bytes.byteLength} bytes -> blob URL`,
    );
    // Copy into a fresh ArrayBuffer-backed view: ExternalBlob.fromBytes is
    // typed for Uint8Array<ArrayBuffer>, and the incoming bytes may be backed
    // by a SharedArrayBuffer.
    return ExternalBlob.fromBytes(Uint8Array.from(bytes));
  }
  let url = "";
  try {
    url = await storageClient.getDirectURL(hash);
  } catch (err) {
    console.warn(
      "[IMG-WIRE] getDirectURL failed, using direct gateway URL:",
      err,
    );
    url = buildGatewayUrl(
      env.storage_gateway_url || DEFAULT_STORAGE_GATEWAY_URL,
      canisterId,
      env.project_id || DEFAULT_PROJECT_ID,
      hash,
    );
  }
  console.log(
    `[IMG-WIRE] reference branch: hash=${hash.slice(0, 16)}… urlLength=${url.length}`,
  );
  return ExternalBlob.fromURL(url);
}

// [IMG-WIRE] Backwards-compatible string resolver. Delegates to the shared
// resolveStorageWireBlob so both actors keep a single resolution path. Returns
// "" when the value is unusable (e.g. empty bytes) so callers can render their
// "No image" placeholder.
export async function resolveStorageWireUrl(
  bytes: Uint8Array,
  storageClient: StorageClient,
  env: {
    storage_gateway_url?: string;
    project_id?: string;
  },
  canisterId: string,
): Promise<string> {
  const blob = await resolveStorageWireBlob(
    bytes,
    storageClient,
    env,
    canisterId,
  );
  const direct = (blob as { directURL?: unknown }).directURL;
  return typeof direct === "string" ? direct : "";
}

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
  // loudly if /env.json is missing/malformed/empty — NO fallback. The
  // deploy-injected value is authoritative for the current deployment.
  const env = await getEnv();
  const canisterId = env.backend_canister_id;

  // TEMP LOG: actor creation lifecycle
  console.log("[BACKEND] creating actor for principal:", principalText);
  console.log("[BACKEND] target canisterId:", canisterId);

  // Build the agent once so the same identity-bound agent is shared by the
  // actor and the storage client (mirrors createActorWithConfig). An empty
  // backend_host must be normalized to undefined: HttpAgent's determineHost
  // treats "" as a configured host and `new URL("")` throws, whereas
  // undefined falls back to the boundary-node host.
  const agent = new HttpAgent({
    identity,
    host: env.backend_host || undefined,
  });

  // Local replicas serve a self-signed root key, so the agent must fetch it
  // before it can verify query/update certificates. Without this, every actor
  // call rejects with a certificate signature-verification error and the app
  // surfaces "Backend unavailable". Mirrors the platform's
  // createActorWithConfig, which only fetches the root key when the host is
  // localhost — production hosts keep the built-in mainnet root key.
  if (env.backend_host?.includes("localhost")) {
    await agent.fetchRootKey().catch((err) => {
      console.warn(
        "[BACKEND] Unable to fetch root key. Check that the local replica is running",
      );
      console.error(err);
    });
  }

  // Storage client resolves stable gateway URLs for stored blobs. The
  // gateway URL / project id come from the deploy-injected /env.json, with
  // the same defaults the platform uses when they are absent.
  const storageClient = new StorageClient(
    DEFAULT_BUCKET_NAME,
    env.storage_gateway_url || DEFAULT_STORAGE_GATEWAY_URL,
    canisterId,
    env.project_id || DEFAULT_PROJECT_ID,
    agent,
  );

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
      // The backend stores RAW image bytes in Nft.imageBlob; reference strings
      // (`!caf!sha256:<64hex>`) are also supported for compatibility. Delegate
      // to the shared non-throwing resolver so this path and the anonymous
      // claim actor cannot drift apart.
      //
      // [IMG-WIRE] This callback MUST NOT throw. It runs inside the generated
      // from_candid_ExternalBlob decoder for EVERY record in a list response,
      // so a single unresolvable value would reject the whole list decode and
      // blank the Studio/Library grids. A record with no usable value still
      // yields an empty-URL ExternalBlob so the card renders its "No image"
      // placeholder instead of dropping the record.
      return resolveStorageWireBlob(
        new Uint8Array(bytes),
        storageClient,
        env,
        canisterId,
      );
    },
    {
      agent,
    },
  );

  console.log(
    "[BACKEND] actor created successfully for principal:",
    principalText,
  );
  return actor;
}
