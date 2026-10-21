import type { Nft } from "../backend";

export type RawNFTResponse =
  | Nft[]
  | { __kind__: "ok"; ok: Nft[] }
  | { __kind__: "err"; err: string }
  | null
  | undefined;

export function normalizeNFTResponse(res: RawNFTResponse): Nft[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === "object") {
    if ("__kind__" in res) {
      if (res.__kind__ === "ok") {
        const ok = (res as { __kind__: "ok"; ok: Nft[] }).ok;
        return Array.isArray(ok) ? ok : [];
      }
      if (res.__kind__ === "err") return [];
    }
  }
  return [];
}

export function normalizeSingleNFT(res: unknown): Nft | null {
  if (!res || typeof res !== "object") return null;
  if ("__kind__" in res) {
    if ((res as { __kind__: string }).__kind__ === "ok") {
      const ok = (res as { __kind__: "ok"; ok: Nft }).ok;
      return ok ?? null;
    }
    if ((res as { __kind__: string }).__kind__ === "err") return null;
  }
  return res as Nft;
}

// [IMG-RESOLVE] A bare 64-hex SHA-256 digest is an asset HASH, not a URL. The
// backend's lightweight NftSummary carries `thumbnail = assetHash`, so a card
// that renders the summary value directly would mount `<img src="<64hex>">`,
// which never loads and shows a broken image. Reject it here so the card falls
// back to its "No image" placeholder until the real imageBlob is hydrated from
// the full record (getNft) through the shared storage resolver.
const BARE_SHA256_HEX = /^[0-9a-f]{64}$/i;

// [IMG-RESOLVE] Resolve an NFT's stored image reference to a renderable URL.
//
// The generated bindgen decodes each record's `imageBlob` through the actor's
// `downloadFile` callback, which returns an `ExternalBlob` whose `directURL`
// field holds the resolved gateway URL. `ExternalBlob.getDirectURL()` is
// declared `async` in @caffeineai/object-storage (it returns a Promise), so
// calling it synchronously in render yields a Promise object — truthy, never a
// valid `src`, and it makes every card fall back to "No image". Read the
// resolved `directURL` field directly instead, and only fall back to the
// (synchronous) accessor when it is a plain string.
export function resolveNftImageUrl(
  imageBlob: Nft["imageBlob"] | null | undefined,
): string {
  if (!imageBlob) return "";
  const direct = (imageBlob as { directURL?: unknown }).directURL;
  if (typeof direct === "string" && direct.trim() !== "") {
    return isRenderableImageUrl(direct) ? direct : "";
  }
  try {
    const viaAccessor = (
      imageBlob as { getDirectURL?: () => unknown }
    ).getDirectURL?.();
    if (typeof viaAccessor === "string" && viaAccessor.trim() !== "") {
      return isRenderableImageUrl(viaAccessor) ? viaAccessor : "";
    }
  } catch {
    // Malformed blob — fall through to the empty placeholder.
  }
  return "";
}

// [IMG-RESOLVE] True only for a value that can actually be used as an <img>
// src: a data/blob/http(s) URL. A bare 64-hex asset hash (the NftSummary
// `thumbnail` value) is explicitly rejected so it is never rendered as an src.
export function isRenderableImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return false;
  if (BARE_SHA256_HEX.test(trimmed)) return false;
  return /^(https?:|blob:|data:)/i.test(trimmed);
}
