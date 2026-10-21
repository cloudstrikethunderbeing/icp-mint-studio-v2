import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Characterization: the shared object-storage wire resolver ────────────────
// The accepted requirement is that every NFT image surface (Studio grid,
// Library grid, detail modal, mint notification thumbnail) resolves through ONE
// shared resolution path. That path is `resolveStorageWireUrl` in
// backendSingleton.ts: it decodes the stored object-storage wire value, strips
// the `!caf!` sentinel, ensures the `sha256:` prefix, and asks the storage
// client for a stable gateway URL — falling back to a constructed gateway URL
// when the client rejects.
//
// This suite protects the ADJACENT working behavior the image-display fix must
// not disturb:
//   - a `!caf!sha256:<64hex>` reference resolves to the storage client's URL;
//   - a bare 64-hex hash is normalized to `sha256:<hex>` before resolution;
//   - a storage-client rejection falls back to a constructed gateway URL
//     instead of throwing (a throw rejects the whole list decode and blanks
//     every grid);
//   - an unusable reference resolves to "" so the caller renders its "No image"
//     placeholder rather than a broken box.
//
// It deliberately does NOT assert the behavior the current request intentionally
// changes: the downloadFile callback's handling of RAW image bytes. The fix
// makes that callback accept both raw bytes (ExternalBlob.fromBytes) and
// reference strings (ExternalBlob.fromURL); freezing today's empty-URL result
// for raw bytes would pin the bug.

const storageMock = vi.hoisted(() => ({
  getDirectURL: vi.fn(
    async (hash: string) => `https://gateway.example/${hash}`,
  ),
}));

vi.mock("@caffeineai/object-storage", () => ({
  StorageClient: class {
    getDirectURL = storageMock.getDirectURL;
  },
}));

// backendSingleton imports ExternalBlob/createActor from @/backend, whose real
// module pulls in @caffeineai/object-storage at runtime. Mock it so the module
// loads under jsdom; only resolveStorageWireUrl is exercised here.
vi.mock("@/backend", () => ({
  createActor: vi.fn(),
  ExternalBlob: {
    fromBytes: (bytes: Uint8Array) => ({ bytes }),
    fromURL: (url: string) => ({ directURL: url }),
  },
}));

import { resolveStorageWireUrl } from "@/backendSingleton";

const CANISTER_ID = "backend-canister";
const ENV = {
  storage_gateway_url: "https://blob.caffeine.ai",
  project_id: "proj-1",
};

function wire(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function makeStorageClient() {
  return { getDirectURL: storageMock.getDirectURL } as never;
}

describe("resolveStorageWireUrl (shared NFT image resolution path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMock.getDirectURL.mockImplementation(
      async (hash: string) => `https://gateway.example/${hash}`,
    );
  });

  it("resolves a '!caf!sha256:<hex>' reference through the storage client", async () => {
    const hash = "a".repeat(64);
    const url = await resolveStorageWireUrl(
      wire(`!caf!sha256:${hash}`),
      makeStorageClient(),
      ENV,
      CANISTER_ID,
    );

    expect(storageMock.getDirectURL).toHaveBeenCalledWith(`sha256:${hash}`);
    expect(url).toBe(`https://gateway.example/sha256:${hash}`);
  });

  it("normalizes a bare 64-hex hash to the 'sha256:' form the client expects", async () => {
    const hash = "b".repeat(64);
    const url = await resolveStorageWireUrl(
      wire(hash),
      makeStorageClient(),
      ENV,
      CANISTER_ID,
    );

    expect(storageMock.getDirectURL).toHaveBeenCalledWith(`sha256:${hash}`);
    expect(url).toBe(`https://gateway.example/sha256:${hash}`);
  });

  it("falls back to a constructed gateway URL when the storage client rejects", async () => {
    // A single malformed reference must never reject the whole list decode.
    storageMock.getDirectURL.mockRejectedValueOnce(new Error("bad hash"));
    const hash = "c".repeat(64);

    const url = await resolveStorageWireUrl(
      wire(`!caf!sha256:${hash}`),
      makeStorageClient(),
      ENV,
      CANISTER_ID,
    );

    expect(url).toContain("https://blob.caffeine.ai/v1/blob/");
    expect(url).toContain(`blob_hash=${encodeURIComponent(`sha256:${hash}`)}`);
    expect(url).toContain(`owner_id=${CANISTER_ID}`);
    expect(url).toContain("project_id=proj-1");
  });

  it("returns an empty string for an unusable reference instead of throwing", async () => {
    const url = await resolveStorageWireUrl(
      wire("not-a-hash"),
      makeStorageClient(),
      ENV,
      CANISTER_ID,
    );

    expect(url).toBe("");
    expect(storageMock.getDirectURL).not.toHaveBeenCalled();
  });

  it("returns an empty string for empty bytes instead of throwing", async () => {
    const url = await resolveStorageWireUrl(
      new Uint8Array(),
      makeStorageClient(),
      ENV,
      CANISTER_ID,
    );

    expect(url).toBe("");
  });
});
