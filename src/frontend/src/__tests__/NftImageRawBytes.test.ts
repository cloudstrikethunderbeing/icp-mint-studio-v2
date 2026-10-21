import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Cover: the raw-bytes branch of the shared NFT image resolution path ───────
// The accepted requirement is that every NFT image surface resolves through ONE
// shared resolution path, and that a successfully minted NFT's image is visible
// in the Studio grid, Library grid, detail modal, and mint notification.
//
// This backend stores RAW image bytes in Nft.imageBlob (Storage.ExternalBlob =
// Blob), so the generated from_candid_ExternalBlob decoder hands those bytes to
// the actor's downloadFile callback. The shared resolver
// `resolveStorageWireBlob` must recognize that the bytes are NOT an
// object-storage reference string and return `ExternalBlob.fromBytes(bytes)`,
// whose `directURL` is a live blob: URL — the value every card/modal/thumbnail
// renders.
//
// StorageWireResolution.test.ts protects the ADJACENT reference-string branch
// and the non-throwing fallback. This suite covers the NEW raw-bytes branch:
//   - raw image bytes resolve to a blob whose directURL is a non-empty URL;
//   - `resolveStorageWireUrl` surfaces that URL (not "");
//   - the bytes are passed through unchanged (no truncation/re-encoding);
//   - the branch never calls the storage client (raw bytes are not a hash);
//   - the branch never throws for arbitrary binary data.
//
// The `@/backend` mock mirrors the real @caffeineai/object-storage semantics:
// `fromBytes` sets `directURL` to a document-scoped blob: URL, and `fromURL`
// sets it to the given URL. That is the seam the production code relies on.

const storageMock = vi.hoisted(() => ({
  getDirectURL: vi.fn(
    async (hash: string) => `https://gateway.example/${hash}`,
  ),
}));

const externalBlobMock = vi.hoisted(() => ({
  fromBytes: vi.fn((bytes: Uint8Array) => ({
    bytes,
    directURL: "blob:http://localhost/raw-image",
  })),
  fromURL: vi.fn((url: string) => ({ directURL: url })),
}));

vi.mock("@caffeineai/object-storage", () => ({
  StorageClient: class {
    getDirectURL = storageMock.getDirectURL;
  },
}));

vi.mock("@/backend", () => ({
  createActor: vi.fn(),
  ExternalBlob: {
    fromBytes: externalBlobMock.fromBytes,
    fromURL: externalBlobMock.fromURL,
  },
}));

import {
  resolveStorageWireBlob,
  resolveStorageWireUrl,
} from "@/backendSingleton";

const CANISTER_ID = "backend-canister";
const ENV = {
  storage_gateway_url: "https://blob.caffeine.ai",
  project_id: "proj-1",
};

function makeStorageClient() {
  return { getDirectURL: storageMock.getDirectURL } as never;
}

// A minimal PNG signature — the exact bytes the backend stores for an uploaded
// image. It is deliberately NOT valid UTF-8 text that could look like a hash.
const RAW_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

describe("resolveStorageWireBlob raw-bytes branch (shared NFT image path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMock.getDirectURL.mockImplementation(
      async (hash: string) => `https://gateway.example/${hash}`,
    );
    externalBlobMock.fromBytes.mockImplementation((bytes: Uint8Array) => ({
      bytes,
      directURL: "blob:http://localhost/raw-image",
    }));
  });

  it("returns an ExternalBlob with a usable directURL for raw image bytes", async () => {
    const blob = await resolveStorageWireBlob(
      RAW_PNG_BYTES,
      makeStorageClient(),
      ENV,
      CANISTER_ID,
    );

    // The raw-bytes branch must produce a renderable blob, not an empty one.
    expect(externalBlobMock.fromBytes).toHaveBeenCalledTimes(1);
    expect((blob as { directURL?: string }).directURL).toBe(
      "blob:http://localhost/raw-image",
    );
    // Raw bytes are not a reference string, so the storage client is untouched.
    expect(storageMock.getDirectURL).not.toHaveBeenCalled();
    expect(externalBlobMock.fromURL).not.toHaveBeenCalled();
  });

  it("passes the raw bytes through unchanged", async () => {
    await resolveStorageWireBlob(
      RAW_PNG_BYTES,
      makeStorageClient(),
      ENV,
      CANISTER_ID,
    );

    const passed = externalBlobMock.fromBytes.mock.calls[0]?.[0] as Uint8Array;
    expect(Array.from(passed)).toEqual(Array.from(RAW_PNG_BYTES));
  });

  it("surfaces the raw-bytes directURL through resolveStorageWireUrl", async () => {
    // resolveStorageWireUrl delegates to the shared resolver; the raw-bytes
    // branch must yield a non-empty URL so a card renders the image rather than
    // its "No image" placeholder.
    const url = await resolveStorageWireUrl(
      RAW_PNG_BYTES,
      makeStorageClient(),
      ENV,
      CANISTER_ID,
    );

    expect(url).toBe("blob:http://localhost/raw-image");
    expect(url).not.toBe("");
  });

  it("does not throw for arbitrary binary data that is not a reference", async () => {
    // The callback runs inside the generated decoder for EVERY record in a list
    // response; a throw would reject the whole list decode and blank the grids.
    const arbitrary = new Uint8Array([0x00, 0xff, 0x10, 0x80, 0x7f, 0x01]);
    await expect(
      resolveStorageWireBlob(arbitrary, makeStorageClient(), ENV, CANISTER_ID),
    ).resolves.toBeDefined();
    expect(storageMock.getDirectURL).not.toHaveBeenCalled();
  });

  it("treats a 64-hex-looking byte string as a reference, not raw bytes", async () => {
    // Boundary: a bare 64-hex hash IS a reference and must take the reference
    // branch (storage client), while genuine image bytes take the raw branch.
    const hash = "d".repeat(64);
    const blob = await resolveStorageWireBlob(
      new TextEncoder().encode(hash),
      makeStorageClient(),
      ENV,
      CANISTER_ID,
    );

    expect(storageMock.getDirectURL).toHaveBeenCalledWith(`sha256:${hash}`);
    expect((blob as { directURL?: string }).directURL).toBe(
      `https://gateway.example/sha256:${hash}`,
    );
    expect(externalBlobMock.fromBytes).not.toHaveBeenCalled();
  });
});
