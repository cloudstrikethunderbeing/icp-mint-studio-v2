import { describe, expect, it } from "vitest";

import { resolveNftImageUrl } from "@/utils/nftNormalization";

// ── Cover: NFT image URL resolution ──────────────────────────────────────────
// The Library and Studio grids, the detail modal, and the mint/claim
// notifications all resolve an NFT's stored image through this shared helper.
// The generated bindgen decodes `imageBlob` into an ExternalBlob whose resolved
// gateway URL lives on the synchronous `directURL` field; `getDirectURL()` is
// declared async and returns a Promise, so calling it in render yields a truthy
// non-string that never renders. This suite pins the resolution contract:
//   - the synchronous `directURL` field wins when it is a non-empty string;
//   - a synchronous `getDirectURL()` string is used as a fallback;
//   - an async `getDirectURL()` (a Promise) is never treated as a URL;
//   - empty/whitespace/missing/malformed blobs resolve to "" so the caller
//     renders its "No image" placeholder rather than an <img src="">.

describe("resolveNftImageUrl", () => {
  it("returns the synchronous directURL field when present", () => {
    const blob = { directURL: "https://example.com/direct.png" };
    expect(resolveNftImageUrl(blob as never)).toBe(
      "https://example.com/direct.png",
    );
  });

  it("prefers directURL over a synchronous getDirectURL accessor", () => {
    const blob = {
      directURL: "https://example.com/direct.png",
      getDirectURL: () => "https://example.com/accessor.png",
    };
    expect(resolveNftImageUrl(blob as never)).toBe(
      "https://example.com/direct.png",
    );
  });

  it("falls back to a synchronous getDirectURL string when directURL is absent", () => {
    const blob = { getDirectURL: () => "https://example.com/accessor.png" };
    expect(resolveNftImageUrl(blob as never)).toBe(
      "https://example.com/accessor.png",
    );
  });

  it("never treats an async getDirectURL Promise as a URL", () => {
    // The real ExternalBlob.getDirectURL() is async. A Promise is truthy but is
    // not a valid src, so it must resolve to "" and let the card show its
    // placeholder instead of mounting a broken image.
    const blob = {
      getDirectURL: () => Promise.resolve("https://example.com/async.png"),
    };
    expect(resolveNftImageUrl(blob as never)).toBe("");
  });

  it("returns an empty string for a missing or null blob", () => {
    expect(resolveNftImageUrl(null)).toBe("");
    expect(resolveNftImageUrl(undefined)).toBe("");
  });

  it("returns an empty string for empty or whitespace-only URLs", () => {
    expect(resolveNftImageUrl({ directURL: "" } as never)).toBe("");
    expect(resolveNftImageUrl({ directURL: "   " } as never)).toBe("");
    expect(resolveNftImageUrl({ getDirectURL: () => "" } as never)).toBe("");
  });

  it("returns an empty string when the accessor throws", () => {
    const blob = {
      getDirectURL: () => {
        throw new Error("malformed blob");
      },
    };
    expect(resolveNftImageUrl(blob as never)).toBe("");
  });
});
