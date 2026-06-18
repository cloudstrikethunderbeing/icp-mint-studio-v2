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
      return ok || null;
    }
    if ((res as { __kind__: string }).__kind__ === "err") return null;
  }
  return res as Nft;
}
