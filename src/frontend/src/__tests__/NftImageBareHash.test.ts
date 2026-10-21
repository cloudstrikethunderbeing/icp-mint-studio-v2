import { describe, expect, it } from "vitest";

import {
  isRenderableImageUrl,
  resolveNftImageUrl,
} from "@/utils/nftNormalization";

// ── Cover: a bare 64-hex asset hash is never rendered as an image source ─────
// The backend's lightweight NftSummary carries `thumbnail = assetHash`, a bare
// 64-character SHA-256 hex digest. It is an asset HASH, not a URL. The shared
// resolver must reject it so every card falls back to its "No image"
// placeholder until the real imageBlob is hydrated from the full record. This
// suite pins that contract at the resolver boundary.

const BARE_HASH = "a".repeat(64);
const BARE_HASH_UPPER = "A".repeat(64);

describe("isRenderableImageUrl rejects bare asset hashes", () => {
  it("rejects a bare 64-hex digest", () => {
    expect(isRenderableImageUrl(BARE_HASH)).toBe(false);
    expect(isRenderableImageUrl(BARE_HASH_UPPER)).toBe(false);
  });

  it("rejects a bare 64-hex digest with surrounding whitespace", () => {
    expect(isRenderableImageUrl(`  ${BARE_HASH}  `)).toBe(false);
  });

  it("accepts real URL schemes", () => {
    expect(isRenderableImageUrl("https://example.com/a.png")).toBe(true);
    expect(isRenderableImageUrl("http://example.com/a.png")).toBe(true);
    expect(isRenderableImageUrl("blob:http://localhost/abc")).toBe(true);
    expect(isRenderableImageUrl("data:image/png;base64,AAAA")).toBe(true);
  });

  it("rejects empty and non-URL strings", () => {
    expect(isRenderableImageUrl("")).toBe(false);
    expect(isRenderableImageUrl("   ")).toBe(false);
    expect(isRenderableImageUrl("not-a-url")).toBe(false);
    // A 63- or 65-char hex string is not the bare-hash shape, but it is also
    // not a URL, so it is still rejected.
    expect(isRenderableImageUrl("a".repeat(63))).toBe(false);
    expect(isRenderableImageUrl("a".repeat(65))).toBe(false);
  });
});

describe("resolveNftImageUrl never returns a bare asset hash", () => {
  it("returns '' when directURL is a bare 64-hex digest", () => {
    expect(resolveNftImageUrl({ directURL: BARE_HASH } as never)).toBe("");
  });

  it("returns '' when the getDirectURL accessor yields a bare hash", () => {
    expect(resolveNftImageUrl({ getDirectURL: () => BARE_HASH } as never)).toBe(
      "",
    );
  });

  it("returns '' when a bare-hash directURL is present, even alongside an accessor", () => {
    // The resolver treats a present, non-empty directURL as authoritative: if
    // it is not renderable (a bare hash), it resolves to "" rather than
    // silently substituting the accessor. The card then shows "No image" until
    // the real imageBlob is hydrated from the full record.
    const blob = {
      directURL: BARE_HASH,
      getDirectURL: () => "https://example.com/real.png",
    };
    expect(resolveNftImageUrl(blob as never)).toBe("");
  });
});
