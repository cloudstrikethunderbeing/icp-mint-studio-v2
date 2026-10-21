import type {
  AdminReassignResult,
  BatchAwardConfig,
  CollectionWithCount,
  HealthMetrics,
  MyReferralStatus,
  Nft,
  NftClaimBreakdownEntry,
  NftClaimCount,
  NftSummary,
  NftSummaryPage,
  Purchase,
  PurchaseQuote,
  ReferralHealthMetrics,
  RewardType,
  VerifyResult,
} from "@/backend";
import { createActor } from "@/backend";
import { resolveStorageWireBlob } from "@/backendSingleton";
import { validateCanisterId } from "@/config/canisters";
import { getBackendCanisterId, getEnv } from "@/config/env";
import { useAuth } from "@/contexts/AuthContext";
import { addNotification } from "@/hooks/useNotifications";
import type { PaymentProof } from "@/types";
import type { PriceUsd, TransferResult, UpdateMetadataRequest } from "@/types";
import { StorageClient } from "@caffeineai/object-storage";
import { HttpAgent } from "@icp-sdk/core/agent";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { devLog } from "../utils/devLog";
import { normalizeNFTResponse } from "../utils/nftNormalization";

// ── [PAGE-RETRY] Shared pagination + bounded-retry primitives ───────────────
// The listing endpoints now take (offset, limit) and return an NftSummaryPage
// ({ items, total, offset, limit }). These helpers keep every existing caller
// working: a legacy array / {ok} / {err} response is still normalized, and a
// page response is unwrapped to its items. Defaults are offset 0 and a
// sensible page size so no caller has to pass pagination to keep working.

export const DEFAULT_PAGE_OFFSET = 0n;
export const DEFAULT_PAGE_LIMIT = 100n;

// [PAGE-RETRY] Bounded retry schedule (ms) for the catalog count read. A
// transient stale-replica read must never blank the app on the first try.
const CATALOG_RETRY_DELAYS_MS = [0, 800, 2000] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// [PAGE-RETRY] Run `read` up to CATALOG_RETRY_DELAYS_MS.length times, waiting
// the scheduled delay before each attempt. `accept` short-circuits the loop as
// soon as a result is authoritative (e.g. a non-zero count). Returns the last
// observed value plus whether it was accepted, so the caller can decide
// whether a zero needs a second independent confirmation read.
async function readWithBoundedRetry<T>(
  read: () => Promise<T>,
  accept: (value: T) => boolean,
  marker: string,
): Promise<{ value: T; accepted: boolean; attempts: number }> {
  let last: T | undefined;
  let attempts = 0;
  for (const delay of CATALOG_RETRY_DELAYS_MS) {
    if (delay > 0) await sleep(delay);
    attempts += 1;
    try {
      const value = await read();
      last = value;
      if (accept(value)) {
        devLog(`${marker} accepted`, { attempts });
        return { value, accepted: true, attempts };
      }
    } catch (err) {
      devLog(`${marker} attempt failed`, {
        attempt: attempts,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  if (last === undefined) {
    throw new Error(`${marker} exhausted retries with no result`);
  }
  return { value: last, accepted: false, attempts };
}

// [PAGE-RETRY] The backend NftSummary projection is intentionally lightweight
// and (as generated) carries only id/status/title/thumbnail/collectionId/
// ownerId/creatorId/mintDate/nftUniqueId. Existing UI filters and badges also
// read `claimedAt` (CollectorPage Claimed tab + claimed badge, HomePage
// unclaimedNfts filter) and `edition` (CollectorPage edition badge). Those two
// fields are NOT part of the generated summary, so the summary projection alone
// cannot carry them. We therefore (a) preserve them when a summary happens to
// carry them (forward-compatible with a backend that later widens the
// projection) and (b) hydrate them from the full record via getNft in the
// listing hooks below. This keeps the summary path a pure projection while
// never silently hiding claimed NFTs.
type NftSummaryWithUiFields = NftSummary & {
  claimedAt?: bigint;
  edition?: string;
};

// [IMG-FIX] Normalize a listing response into a plain Nft[] regardless of
// whether the actor returned the new NftSummaryPage, a legacy Nft[] array, or
// an {ok}/{err} variant.
//
// The summary's `thumbnail` is the RAW assetHash (a bare 64-hex SHA-256
// digest), NOT a renderable URL. Mapping it into `imageBlob.directURL` made
// every grid card mount `<img src="<64hex>">`, which never loads and shows a
// broken image — the notification bell worked only because it stores a URL
// resolved at mint time. The summary therefore carries NO usable image: leave
// `imageBlob` empty so the card renders its "No image" placeholder until the
// listing hooks hydrate the real imageBlob from the full record (getNft),
// whose imageBlob is decoded by the actor's downloadFile callback through the
// single shared storage resolver. `assetHash` keeps the raw hash for identity.
function summaryToNft(summary: NftSummary): Nft {
  const withUi = summary as NftSummaryWithUiFields;
  const thumbnail = summary.thumbnail ?? "";
  // [IMG-FIX] Empty-URL ExternalBlob placeholder — never the raw hash.
  const imageBlob = {
    directURL: "",
    getDirectURL: () => "",
  } as unknown as Nft["imageBlob"];
  return {
    id: summary.id,
    status: summary.status,
    supplyLimit: 0n,
    title: summary.title,
    imageBlob,
    // Preserve the summary's edition when present; otherwise leave it empty
    // and let the listing hooks hydrate it from the full record.
    edition: withUi.edition ?? "",
    collectionId: summary.collectionId,
    referralThreshold: 0n,
    ownerId: summary.ownerId,
    tags: [],
    creatorId: summary.creatorId,
    mintDate: summary.mintDate,
    description: "",
    auditHistory: [],
    rewardTier: "none" as Nft["rewardTier"],
    rewardType: "none" as Nft["rewardType"],
    assetHash: thumbnail,
    nftUniqueId: summary.nftUniqueId,
    // Preserve claimedAt when the summary carries it; otherwise undefined and
    // hydrated by the listing hooks.
    claimedAt: withUi.claimedAt,
    // [PRICE] The summary projection carries the whole-value USD price, so the
    // price strip renders from the listing response without a full-record read.
    priceUsd: summary.priceUsd,
  };
}

// [IMG-FIX] Hydrate the fields the lightweight summary cannot carry
// (`imageBlob`, `claimedAt`, `edition`) from the full record via getNft. This
// is the frontend-side resolution of the summary projection gap: the backend
// summary is owned by another dispatch, so the listing hooks fill the gap here
// rather than changing the backend contract.
//
// `imageBlob` is the critical one: the summary's `thumbnail` is the raw
// assetHash, so the summary alone cannot produce a renderable image. The full
// record's imageBlob is decoded by the actor's downloadFile callback through
// the single shared storage resolver (resolveStorageWireBlob), so copying it
// here keeps exactly one image-resolution path (resolveNftImageUrl).
//
// Best-effort and bounded: a missing getNft or a failed read leaves the
// summary-derived Nft intact (empty imageBlob -> "No image" placeholder)
// instead of throwing and blanking the grid.
async function hydrateSummaryNfts(
  actor: { getNft?: (id: bigint) => Promise<Nft | null> },
  nfts: Nft[],
  // [PUBLIC-GALLERY] Optional override for the full-record reader. The public
  // gallery cannot use getNft (it traps for anonymous callers), so it passes
  // the anonymous-callable getNftPublic reader instead. Existing callers omit
  // this and keep using actor.getNft unchanged.
  readFullNft?: (id: bigint) => Promise<Nft | null>,
): Promise<Nft[]> {
  const getNft =
    readFullNft ??
    (typeof actor.getNft === "function" ? actor.getNft.bind(actor) : undefined);
  if (!getNft) return nfts;
  return Promise.all(
    nfts.map(async (nft) => {
      try {
        const full = await getNft(nft.id);
        if (!full) return nft;
        return {
          ...nft,
          // [IMG-FIX] Take the full record's resolved imageBlob. Fall back to
          // the summary's (empty) blob only when the full record has none.
          imageBlob: full.imageBlob ?? nft.imageBlob,
          claimedAt: full.claimedAt ?? nft.claimedAt,
          edition: full.edition || nft.edition,
          // [PRICE] Prefer the full record's price when present so a summary
          // that omitted it still renders the correct strip.
          priceUsd: full.priceUsd ?? nft.priceUsd,
        };
      } catch (err) {
        devLog("[IMG-FIX] summary hydration failed", {
          id: String(nft.id),
          error: err instanceof Error ? err.message : String(err),
        });
        return nft;
      }
    }),
  );
}

function isSummaryPage(value: unknown): value is NftSummaryPage {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    Array.isArray((value as { items?: unknown }).items)
  );
}

// [PAGE-RETRY] Accepts any listing response shape and returns Nft[]. A page
// response is unwrapped to its items; a legacy array / {ok} / {err} response
// falls through to normalizeNFTResponse so the pagination change cannot break
// an existing caller or a test that still stubs the old shape.
export function normalizeNftListingResponse(res: unknown): Nft[] {
  if (isSummaryPage(res)) {
    return res.items.map(summaryToNft);
  }
  return normalizeNFTResponse(
    res as Parameters<typeof normalizeNFTResponse>[0],
  );
}

// [PAGE-RETRY] Listing-response normalizer that also hydrates the fields the
// lightweight summary cannot carry. Legacy array / {ok} / {err} responses
// already carry full Nft records (claimedAt/edition included), so they are
// returned as-is with no extra reads. Only a genuine NftSummaryPage triggers
// the bounded getNft hydration, which keeps every existing caller and test
// stub working unchanged.
async function normalizeAndHydrateListingResponse(
  actor: { getNft?: (id: bigint) => Promise<Nft | null> },
  res: unknown,
): Promise<Nft[]> {
  const nfts = normalizeNftListingResponse(res);
  if (!isSummaryPage(res)) return nfts;
  return hydrateSummaryNfts(actor, nfts);
}

// ── Backend health / canister identity (rotation defense) ───────────────────
// The deploy-injected /env.json backend_canister_id is authoritative and
// correct for the CURRENT deployment (draft or live). This hook resolves it,
// trusts it as the expected canister, and (when an actor is available) confirms
// the actor is actually talking to that canister and detects an empty backend.
// The result drives a loud wrong-canister/backend-unavailable error and an
// empty-backend warning so the catalog can never silently disappear.

export type BackendHealthStatus =
  | { status: "checking" }
  | { status: "ok"; canisterId: string }
  | { status: "wrong-canister"; resolved: string; expected: string }
  | { status: "unavailable"; reason: string }
  | { status: "empty"; canisterId: string };

// [CATALOG-GUARD] localStorage key prefix for the persisted "catalog was known
// to exist" signal, scoped by resolved canister ID so a rotated backend starts
// with a clean slate and a genuinely new canister can still bootstrap.
const CATALOG_KNOWN_PREFIX = "catalog-known:";

function catalogKnownKey(canisterId: string): string {
  return `${CATALOG_KNOWN_PREFIX}${canisterId}`;
}

// Reads the persisted "catalog was known to exist" flag for a canister. Any
// storage failure (private mode, quota, disabled storage) degrades to false so
// the fresh-canister bootstrap path is never blocked by a storage error.
function readCatalogKnown(canisterId: string): boolean {
  try {
    return localStorage.getItem(catalogKnownKey(canisterId)) === "1";
  } catch {
    return false;
  }
}

// Persists the "catalog was known to exist" flag for a canister. Best-effort:
// a storage failure must never break health resolution.
function writeCatalogKnown(canisterId: string): void {
  try {
    localStorage.setItem(catalogKnownKey(canisterId), "1");
  } catch {
    // Storage unavailable — the in-session ref still covers this session.
  }
}

export function useBackendHealth(): BackendHealthStatus {
  const { actor } = useAuth();
  const [health, setHealth] = useState<BackendHealthStatus>({
    status: "checking",
  });
  // Records the first observed non-zero NFT count. Once a non-zero count has
  // been observed, the catalog is "known to exist" — a later drop to zero is a
  // data-loss anomaly that must block. On a fresh canister (never observed a
  // non-zero count) we do NOT block, so the admin can mint the first NFT.
  // The signal is ALSO persisted to localStorage keyed by canister ID so a
  // rotated/empty backend is flagged on a fresh page load, not only within the
  // same browser session.
  const knownToExistRef = useRef<bigint | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Resolve the deploy-injected canister ID. Works for ALL users
      //    (no actor needed) — this is the primary rotation defense. Throws
      //    loudly only when the ID is missing/empty (never a silent fallback).
      let resolved: string;
      try {
        resolved = await getBackendCanisterId();
      } catch (err) {
        if (cancelled) return;
        setHealth({
          status: "unavailable",
          reason: err instanceof Error ? err.message : String(err),
        });
        return;
      }
      const validation = validateCanisterId(resolved);
      if (validation.status !== "ok") {
        if (cancelled) return;
        setHealth(validation);
        return;
      }

      // 2. If an actor is available, confirm the actual canister the actor is
      //    talking to matches the deploy-injected expected canister, and detect
      //    an empty backend (defense-in-depth). We do NOT gate on
      //    isLiveCanister() — the draft deployment's canister is not "live" but
      //    must still render normally.
      if (actor) {
        try {
          const actual = await actor.getCanisterIdSafe();
          if (cancelled) return;
          if (actual !== resolved) {
            setHealth({
              status: "wrong-canister",
              resolved: actual,
              expected: resolved,
            });
            return;
          }
          // Detect an empty backend: the correct canister reporting zero
          // NFTs is a health anomaly worth surfacing so the empty catalog is
          // never silent. Use the public getTotalNftCount query (returns the
          // total NFT count) — NOT getNftClaimCounts, which only counts NFTs
          // with claim tokens and would falsely flag a backend with NFTs but
          // no claim tokens (e.g. free-tier mints) as empty.
          //
          // [PAGE-RETRY] A single 0 from one replica must never blank the app.
          // Read the count through a bounded retry (0/800/2000 ms); a non-zero
          // result on ANY attempt short-circuits to ok. Only a 0 that survives
          // the whole retry sequence is a candidate for 'empty', and even then
          // it must be confirmed by a second independent read
          // (getTotalNftCountCertified, the update-path variant) before we
          // block. The persisted 'catalog-known' flag is now a HINT that
          // decides whether a confirmed zero is an anomaly — it is no longer a
          // trigger on its own.
          const countRead = await readWithBoundedRetry(
            () => actor.getTotalNftCount(),
            (count) => count > 0n,
            "[CATALOG-RETRY]",
          );
          if (cancelled) return;
          if (countRead.accepted) {
            knownToExistRef.current = countRead.value;
            // [CATALOG-GUARD] Persist the "catalog was known to exist" signal
            // for this canister so a later empty report is flagged even on a
            // fresh page load (new browser session).
            writeCatalogKnown(actual);
            setHealth({ status: "ok", canisterId: actual });
            return;
          }
          // The retry sequence completed with 0 every time. Confirm with a
          // second independent read before treating 0 as authoritative. The
          // certified read is an update-path call, so it cannot be served by
          // the same stale replica that produced the zero.
          let confirmedZero = countRead.value === 0n;
          if (confirmedZero) {
            try {
              const certified = await actor.getTotalNftCountCertified();
              if (cancelled) return;
              confirmedZero = certified === 0n;
              if (!confirmedZero) {
                // The confirmation read saw NFTs — the zero was transient.
                knownToExistRef.current = certified;
                writeCatalogKnown(actual);
                setHealth({ status: "ok", canisterId: actual });
                return;
              }
            } catch (err) {
              // A failed confirmation read must not blank the app: treat the
              // zero as unconfirmed and allow the catalog to render.
              devLog("[CATALOG-RETRY] confirmation read failed", {
                error: err instanceof Error ? err.message : String(err),
              });
              confirmedZero = false;
            }
          }
          if (!confirmedZero) {
            // Zero was not confirmed by a second independent read — do not
            // blank the app.
            setHealth({ status: "ok", canisterId: actual });
            return;
          }
          // totalNftCount === 0n, confirmed by a second independent read.
          // [CATALOG-GUARD] The persisted flag is a HINT: it tells us whether
          // this canister previously held NFTs, so a confirmed zero is data
          // loss rather than a fresh store. A brand-new canister that has
          // never held NFTs has no hint and can still mint the first NFT.
          const knownInSession = knownToExistRef.current !== null;
          const knownPersisted = readCatalogKnown(actual);
          if (knownInSession || knownPersisted) {
            // A non-zero count was previously observed and has now dropped to
            // zero — data loss. Block the silent-empty-catalog state.
            devLog("[CATALOG-GUARD] empty catalog after known non-zero count", {
              canisterId: actual,
              knownInSession,
              knownPersisted,
            });
            setHealth({ status: "empty", canisterId: actual });
            return;
          }
          // Fresh canister — never observed a non-zero count. Allow bootstrap.
          setHealth({ status: "ok", canisterId: actual });
        } catch (err) {
          if (cancelled) return;
          // [PAGE-RETRY] The transient part of this probe — the catalog count
          // read — is already retried 3x (0/800/2000 ms) inside the try above,
          // so reaching this catch means the failure is not a single transient
          // replica blip. Report 'unavailable' with the reason rather than
          // blanking the app silently.
          setHealth({
            status: "unavailable",
            reason: err instanceof Error ? err.message : String(err),
          });
        }
        return;
      }

      // No actor (anonymous) — the ID validation is the primary defense.
      if (cancelled) return;
      setHealth({ status: "ok", canisterId: resolved });
    })();
    return () => {
      cancelled = true;
    };
  }, [actor]);

  return health;
}

export function useHealthMetrics(isAdmin: boolean) {
  const { actor } = useAuth();

  return useQuery<HealthMetrics>({
    queryKey: ["healthMetrics"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getHealthMetrics();
    },
    enabled: !!actor && isAdmin,
    staleTime: 30_000,
  });
}

export function useTotalNfts(isAdmin: boolean) {
  const { actor } = useAuth();

  return useQuery<bigint>({
    queryKey: ["totalNfts"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getTotalNfts();
    },
    enabled: !!actor && isAdmin,
    staleTime: 30_000,
  });
}

export function useActiveNfts(isAdmin: boolean) {
  const { actor } = useAuth();

  return useQuery<bigint>({
    queryKey: ["activeNfts"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getActiveNfts();
    },
    enabled: !!actor && isAdmin,
    staleTime: 30_000,
  });
}

export function useClaimedNfts(isAdmin: boolean) {
  const { actor } = useAuth();

  return useQuery<bigint>({
    queryKey: ["claimedNfts"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getClaimedNfts();
    },
    enabled: !!actor && isAdmin,
    staleTime: 30_000,
  });
}

export function useAvailableNfts(isAdmin: boolean) {
  const { actor } = useAuth();

  return useQuery<bigint>({
    queryKey: ["availableNfts"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getAvailableNfts();
    },
    enabled: !!actor && isAdmin,
    staleTime: 30_000,
  });
}

export function useTotalCollections(isAdmin: boolean) {
  const { actor } = useAuth();

  return useQuery<bigint>({
    queryKey: ["totalCollections"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getTotalCollections();
    },
    enabled: !!actor && isAdmin,
    staleTime: 30_000,
  });
}

export function useTotalCreators(isAdmin: boolean) {
  const { actor } = useAuth();

  return useQuery<bigint>({
    queryKey: ["totalCreators"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getTotalCreators();
    },
    enabled: !!actor && isAdmin,
    staleTime: 30_000,
  });
}

export function useTotalClaims(isAdmin: boolean) {
  const { actor } = useAuth();

  return useQuery<bigint>({
    queryKey: ["totalClaims"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getTotalClaims();
    },
    enabled: !!actor && isAdmin,
    staleTime: 30_000,
  });
}

export function useMetricsCanisterId(isAdmin: boolean) {
  const { actor } = useAuth();

  return useQuery<string>({
    queryKey: ["metricsCanisterId"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getMetricsCanisterId();
    },
    enabled: !!actor && isAdmin,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useBackendBuildTimestamp(isAdmin: boolean) {
  const { actor } = useAuth();

  return useQuery<bigint>({
    queryKey: ["backendBuildTimestamp"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getBackendBuildTimestamp();
    },
    enabled: !!actor && isAdmin,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useStorageUsage(isAdmin: boolean) {
  const { actor } = useAuth();

  return useQuery<bigint>({
    queryKey: ["storageUsage"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getStorageUsage();
    },
    enabled: !!actor && isAdmin,
    staleTime: 30_000,
  });
}

export function useTransferNft() {
  const { actor, principal } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      recipient,
    }: {
      id: bigint;
      recipient: string;
    }): Promise<TransferResult> => {
      if (!actor) throw new Error("Not authenticated");
      const toPrincipal = Principal.fromText(recipient);
      // Backend returns TransferResult shape: { success, error?, newOwnerPrincipal? }
      const result = (await actor.transferNft(
        id,
        toPrincipal,
      )) as unknown as TransferResult;
      if (!result.success) {
        throw new Error(result.error || "Transfer failed");
      }
      return result;
    },
    onSuccess: () => {
      addNotification(
        {
          type: "info",
          title: "NFT Transferred",
          message: "Your NFT was transferred successfully.",
        },
        principal,
      );
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (_err: Error) => {
      addNotification(
        {
          type: "critical",
          title: "Transfer Failed",
          message: "The transfer could not be completed.",
        },
        principal,
      );
    },
  });
}

export function useUpdateMetadata() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      nftId,
      updates,
    }: {
      nftId: bigint;
      updates: UpdateMetadataRequest;
    }): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      // Cast to the new backend method; fallback if not yet available
      const act = actor as unknown as {
        updateBusinessMetadata: (
          id: bigint,
          req: UpdateMetadataRequest,
        ) => Promise<unknown>;
      };
      if (!act.updateBusinessMetadata) {
        throw new Error("updateBusinessMetadata not available on backend");
      }
      const result = (await act.updateBusinessMetadata(nftId, updates)) as {
        __kind__: "ok" | "err";
        ok?: null;
        err?: string;
      };
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Metadata update failed");
      }
    },
    onSuccess: () => {
      toast.success("Metadata updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
      // [MINT-SYNC] useMyNfts' real key is ["myNfts"]; the old ["allMyNfts"]
      // key never matched and left the Library feed stale after an edit.
      queryClient.invalidateQueries({ queryKey: ["myNfts"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Metadata update failed");
    },
  });
}

export function useSubmitPaymentProof() {
  const { actor, principal } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      txHash,
      tierRequested,
      networkType,
    }: {
      txHash: string;
      tierRequested: string;
      networkType: string;
    }): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      const result = (await actor.submitPaymentProof(
        txHash,
        tierRequested,
        networkType,
      )) as {
        __kind__: "ok" | "err";
        ok?: string;
        err?: string;
      };
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to submit payment proof");
      }
    },
    onSuccess: () => {
      addNotification(
        {
          type: "info",
          title: "Payment proof submitted",
          message: "Awaiting admin review.",
        },
        principal,
      );
      queryClient.invalidateQueries({ queryKey: ["myPaymentProofs"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit payment proof");
    },
  });
}

export function useApprovePaymentProof() {
  const { actor, principal } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proofId: string): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      const result = (await actor.approvePaymentProof(proofId)) as {
        __kind__: "ok" | "err";
        ok?: string;
        err?: string;
      };
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to approve payment proof");
      }
    },
    onSuccess: () => {
      addNotification(
        {
          type: "info",
          title: "Payment proof approved",
          message: "Tier assigned successfully.",
        },
        principal,
      );
      queryClient.invalidateQueries({ queryKey: ["paymentProofs"] });
      queryClient.invalidateQueries({ queryKey: ["myPaymentProofs"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to approve payment proof");
    },
  });
}

export function useRejectPaymentProof() {
  const { actor, principal } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proofId,
      reason,
    }: {
      proofId: string;
      reason: string;
    }): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      const result = (await actor.rejectPaymentProof(proofId, reason)) as {
        __kind__: "ok" | "err";
        ok?: string;
        err?: string;
      };
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to reject payment proof");
      }
    },
    onSuccess: () => {
      addNotification(
        {
          type: "warning",
          title: "Payment proof rejected",
          message: "Submission was rejected by admin.",
        },
        principal,
      );
      queryClient.invalidateQueries({ queryKey: ["paymentProofs"] });
      queryClient.invalidateQueries({ queryKey: ["myPaymentProofs"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reject payment proof");
    },
  });
}

export function useListPaymentProofs(isAdmin: boolean) {
  const { actor } = useAuth();

  return useQuery<PaymentProof[]>({
    queryKey: ["paymentProofs"],
    queryFn: async () => {
      if (!actor) throw new Error("Not authenticated");
      return await actor.listPaymentProofs();
    },
    enabled: !!actor && isAdmin,
    staleTime: 30 * 1000,
  });
}

export function useMyPaymentProofs(principal: string | null) {
  const { actor } = useAuth();

  return useQuery<PaymentProof[]>({
    queryKey: ["myPaymentProofs", principal],
    queryFn: async () => {
      if (!actor) throw new Error("Not authenticated");
      return await actor.getMyPaymentProofs();
    },
    enabled: !!actor && !!principal,
    staleTime: 30 * 1000,
  });
}

export function useNftDetailQuery(nftUniqueId: string | undefined) {
  const { actor } = useAuth();

  return useQuery<VerifyResult | null>({
    queryKey: ["nftDetail", nftUniqueId],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      const result = await actor.verifyNftPublic(nftUniqueId!);
      if (result.__kind__ === "ok") return result.ok;
      return null;
    },
    enabled: !!nftUniqueId && !!actor,
    staleTime: 60_000,
  });
}

export function useVerifyNftPublic() {
  const { actor } = useAuth();

  return useMutation({
    mutationFn: async (nftUniqueId: string): Promise<VerifyResult | null> => {
      if (!actor) throw new Error("Actor unavailable");
      const result = await actor.verifyNftPublic(nftUniqueId);
      if (result.__kind__ === "ok") return result.ok;
      return null;
    },
  });
}

export function useVerifyNftByCreatorId() {
  const { actor } = useAuth();

  return useMutation({
    mutationFn: async (creatorId: string): Promise<VerifyResult[]> => {
      if (!actor) throw new Error("Actor unavailable");
      const result = await actor.verifyNftByCreatorId(creatorId);
      if (result.__kind__ === "ok") return result.ok;
      return [];
    },
  });
}

export function useCreateSlot() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<bigint> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.createSlot();
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to create slot");
      }
      return result.ok;
    },
    onSuccess: () => {
      toast.success("New slot created");
      queryClient.invalidateQueries({ queryKey: ["slotsStatus"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create slot");
    },
  });
}

export function useCollections() {
  const { actor } = useAuth();

  return useQuery<CollectionWithCount[]>({
    queryKey: ["collections"],
    queryFn: async () => {
      if (!actor) throw new Error("Not authenticated");
      return actor.listMyCollections();
    },
    enabled: !!actor,
    staleTime: 30_000,
  });
}

export function useAddNftToCollection() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      nftId,
      collectionId,
    }: {
      nftId: bigint;
      collectionId: bigint;
    }): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.addNftToCollection(nftId, collectionId);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to add NFT to collection");
      }
    },
    onSuccess: async () => {
      toast.success("NFT added to collection");
      await queryClient.refetchQueries({ queryKey: ["nfts"], exact: true });
      await queryClient.refetchQueries({
        queryKey: ["collections"],
        exact: true,
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add NFT to collection");
    },
  });
}

// ── [OPT-REMOVE] Optimistic delete/burn removal ─────────────────────────────
// Both delete and burn must remove the card from My Library and My Active NFTs
// immediately, without waiting for a refetch. The listing hooks cache Nft[]
// under ["myNfts", ...] and ["myActiveNfts", ...], but the raw actor page
// envelope ({items,total,offset,limit}) is also cached under the page-total
// keys. This helper removes the matching NFT id from every cached page of a
// key family, preserving the page shape and decrementing total, and returns a
// snapshot for rollback. It matches by item id and tolerates both the Nft[]
// shape and the raw NftSummaryPage shape.
type PageSnapshot = [readonly unknown[], unknown];

function removeNftFromCachedPages(
  queryClient: ReturnType<typeof useQueryClient>,
  keyPrefix: string,
  id: bigint,
): PageSnapshot[] {
  const snapshots: PageSnapshot[] = [];
  const entries = queryClient.getQueriesData({ queryKey: [keyPrefix] });
  for (const [key, data] of entries) {
    if (data === undefined) continue;
    snapshots.push([key, data]);
    if (Array.isArray(data)) {
      // Nft[] shape — filter out the matching id.
      queryClient.setQueryData(
        key,
        (data as Nft[]).filter((item) => item?.id !== id),
      );
    } else if (isSummaryPage(data)) {
      // Raw NftSummaryPage shape — preserve {items,total,offset,limit}.
      const page = data as NftSummaryPage;
      const items = page.items.filter((item) => item.id !== id);
      queryClient.setQueryData(key, {
        ...page,
        items,
        total: items.length < page.items.length ? page.total - 1n : page.total,
      });
    }
  }
  return snapshots;
}

function restoreSnapshots(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshots: PageSnapshot[],
): void {
  for (const [key, data] of snapshots) {
    queryClient.setQueryData(key, data);
  }
}

export function useBurnNft() {
  const { actor, principal } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.burnNft(id);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to burn NFT");
      }
    },
    onMutate: async (id: bigint) => {
      // [OPT-REMOVE] Cancel in-flight reads so a stale refetch cannot resurrect
      // the card, snapshot both key families, then remove the id optimistically.
      await queryClient.cancelQueries({ queryKey: ["myNfts"] });
      await queryClient.cancelQueries({ queryKey: ["myActiveNfts"] });
      const snapshots = [
        ...removeNftFromCachedPages(queryClient, "myNfts", id),
        ...removeNftFromCachedPages(queryClient, "myActiveNfts", id),
      ];
      return { snapshots };
    },
    onSuccess: () => {
      addNotification(
        {
          type: "info",
          title: "NFT Burned",
          message: "Your NFT has been permanently burned.",
        },
        principal,
      );
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["myNfts"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (_err: Error, _id: bigint, context) => {
      // [OPT-REMOVE] Roll back the optimistic removal so the card reappears.
      if (context?.snapshots) {
        restoreSnapshots(queryClient, context.snapshots);
      }
      addNotification(
        {
          type: "critical",
          title: "Burn Failed",
          message: "The NFT could not be burned.",
        },
        principal,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["myNfts"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
    },
  });
}

export function useDeleteNft() {
  const { actor, principal } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.deleteNft(id);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to delete NFT");
      }
    },
    onMutate: async (id: bigint) => {
      // [OPT-REMOVE] Cancel in-flight reads so a stale refetch cannot resurrect
      // the card, snapshot both key families, then remove the id optimistically.
      await queryClient.cancelQueries({ queryKey: ["myNfts"] });
      await queryClient.cancelQueries({ queryKey: ["myActiveNfts"] });
      const snapshots = [
        ...removeNftFromCachedPages(queryClient, "myNfts", id),
        ...removeNftFromCachedPages(queryClient, "myActiveNfts", id),
      ];
      return { snapshots };
    },
    onSuccess: () => {
      addNotification(
        {
          type: "info",
          title: "NFT Deleted",
          message: "Your NFT has been deleted.",
        },
        principal,
      );
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["myNfts"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (_err: Error, _id: bigint, context) => {
      // [OPT-REMOVE] Roll back the optimistic removal so the card reappears.
      if (context?.snapshots) {
        restoreSnapshots(queryClient, context.snapshots);
      }
      addNotification(
        {
          type: "critical",
          title: "Delete Failed",
          message: "The NFT could not be deleted.",
        },
        principal,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["myNfts"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
    },
  });
}

export function useCreateCollection() {
  const { actor, principal } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
    }: {
      name: string;
      description: string;
    }): Promise<bigint> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.createCollection(name, description);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to create collection");
      }
      return result.ok;
    },
    onSuccess: () => {
      toast.success("Collection created");
      addNotification(
        {
          type: "info",
          title: "Collection Created",
          message: "Collection created successfully",
          navigationTarget: "/",
        },
        principal,
      );
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create collection");
    },
  });
}

export function useRemoveNftFromCollection() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      nftId,
      collectionId,
    }: {
      nftId: bigint;
      collectionId: bigint;
    }): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.removeNftFromCollection(nftId, collectionId);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to remove NFT from collection");
      }
    },
    onSuccess: async () => {
      toast.success("NFT removed from collection");
      await queryClient.refetchQueries({ queryKey: ["nfts"], exact: true });
      await queryClient.refetchQueries({
        queryKey: ["collections"],
        exact: true,
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to remove NFT from collection");
    },
  });
}

export function useDeleteCollection() {
  const { actor, principal } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collectionId: bigint): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      await actor.deleteCollectionAndUnassignNfts(collectionId);
    },
    onSuccess: async () => {
      toast.success("Collection deleted");
      addNotification(
        {
          type: "warning",
          title: "Collection Deleted",
          message: "Collection deleted",
        },
        principal,
      );
      await queryClient.refetchQueries({
        queryKey: ["collections"],
        exact: true,
      });
      await queryClient.refetchQueries({ queryKey: ["nfts"], exact: true });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete collection");
    },
  });
}

// [PAGE-RETRY] Paginated owner-scoped active listing. The backend now takes
// (offset, limit) and returns an NftSummaryPage; the hook still returns Nft[]
// so every existing caller is unchanged. Pagination defaults keep the old
// no-argument call working.
export function useMyActiveNfts(
  principal: string | null,
  offset: bigint = DEFAULT_PAGE_OFFSET,
  limit: bigint = DEFAULT_PAGE_LIMIT,
) {
  const { actor } = useAuth();

  return useQuery<Nft[]>({
    queryKey: ["myActiveNfts", principal ?? "anonymous", offset, limit],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      const result = await actor.listMyActiveNfts(offset, limit);
      return normalizeAndHydrateListingResponse(actor, result);
    },
    enabled: !!actor,
    staleTime: 30_000,
  });
}

// [PAGE-RETRY] Paginated full owner-scoped listing. Same contract as
// useMyActiveNfts: (offset, limit) in, Nft[] out.
export function useMyNfts(
  principal?: string | null,
  offset: bigint = DEFAULT_PAGE_OFFSET,
  limit: bigint = DEFAULT_PAGE_LIMIT,
) {
  const { actor } = useAuth();

  return useQuery<Nft[]>({
    // [MINT-SYNC] Scope the cache key by principal so a user switch never
    // serves the previous account's feed, and so the mint flow's
    // invalidateQueries(["myNfts"]) refreshes the Library's "All" tab.
    queryKey: ["myNfts", principal ?? "anonymous", offset, limit],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      const result = await actor.listMyNfts(offset, limit);
      return normalizeAndHydrateListingResponse(actor, result);
    },
    enabled: !!actor,
    staleTime: 30_000,
  });
}

// ── Store-wide catalog count (empty-state diagnostic) ───────────────────────
// Public query (no admin gate) that returns the store-wide total NFT count.
// This is the backend diagnostic that lets the Library distinguish "catalog is
// empty" (store-wide zero NFTs — e.g. a fresh store on draft resume) from "no
// NFTs for this account" (the store has NFTs but the signed-in principal owns
// none). Shares the 30-second cache window with the other metrics hooks.
//
// [PAGE-RETRY] The backend getTotalNftCount() signature is unchanged (no
// pagination args, returns a bigint), so the optional offset/limit parameters
// are accepted for call-site consistency with the paginated listing hooks but
// are not forwarded. They participate in the cache key so a caller that pages
// still gets a distinct entry.
export function useTotalNftCount(
  offset: bigint = DEFAULT_PAGE_OFFSET,
  limit: bigint = DEFAULT_PAGE_LIMIT,
) {
  const { actor } = useAuth();

  return useQuery<bigint>({
    queryKey: ["totalNftCount", offset, limit],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getTotalNftCount();
    },
    enabled: !!actor,
    staleTime: 30_000,
  });
}

export function useSearchNfts(
  searchTerm: string,
  enabled: boolean,
  offset: bigint = DEFAULT_PAGE_OFFSET,
  limit: bigint = DEFAULT_PAGE_LIMIT,
) {
  const { actor } = useAuth();

  return useQuery<Nft[]>({
    queryKey: ["searchNfts", searchTerm, offset, limit],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      const act = actor as unknown as {
        searchNfts: (
          term: string,
          offset: bigint,
          limit: bigint,
        ) => Promise<unknown>;
      };
      if (!act.searchNfts) {
        throw new Error("searchNfts not available on backend");
      }
      const raw = await act.searchNfts(searchTerm, offset, limit);
      const normalized = await normalizeAndHydrateListingResponse(actor, raw);
      return normalized.filter((item) => item != null);
    },
    enabled: !!actor && enabled && searchTerm.trim().length > 0,
    staleTime: 10_000,
  });
}

// ── Claim Link hooks ────────────────────────────────────────────────────────

export function useGenerateClaimLink() {
  const { actor, principal } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nftId: bigint): Promise<string> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.generateClaimLink(nftId);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: (_data, nftId) => {
      addNotification(
        {
          type: "info",
          title: "Claim Link Created",
          message: "Claim link generated successfully",
          navigationTarget: "/",
        },
        principal,
      );
      queryClient.invalidateQueries({
        queryKey: ["claimStatus", nftId.toString()],
      });
    },
    onError: (err: Error) => {
      addNotification(
        {
          type: "critical",
          title: "Claim Link Failed",
          message: err.message,
        },
        principal,
      );
    },
  });
}

export function useGetClaimStatus(nftId: bigint | undefined, enabled = true) {
  const { actor } = useAuth();

  return useQuery({
    queryKey: ["claimStatus", nftId?.toString() ?? ""],
    queryFn: async () => {
      if (!actor || nftId === undefined) return null;
      const result = await actor.getClaimStatus(nftId);
      // "no claim token" is a normal business state — return null instead of throwing
      if (result.__kind__ === "err") return null;
      return result.ok;
    },
    enabled: !!actor && enabled && nftId !== undefined,
    staleTime: 30_000,
  });
}

export function useSetUserStripeProductId() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userPrincipal,
      productId,
    }: {
      userPrincipal: string;
      productId: string;
    }): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      const principal = Principal.fromText(userPrincipal);
      // Cast to the new admin backend method
      const act = actor as unknown as {
        setUserStripeProductId: (
          pid: Principal,
          prodId: string,
        ) => Promise<unknown>;
      };
      if (!act.setUserStripeProductId) {
        throw new Error("setUserStripeProductId not available on backend");
      }
      const result = (await act.setUserStripeProductId(
        principal,
        productId,
      )) as {
        __kind__: "ok" | "err";
        ok?: null;
        err?: string;
      };
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to set Stripe product ID");
      }
    },
    onSuccess: () => {
      toast.success("Stripe product ID updated!");
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to set Stripe product ID");
    },
  });
}

// ── Claim-count hooks ───────────────────────────────────────────────────────
// Public claim counts feed the Library card indicator visible to all visitors.
// Admin breakdown feeds the Health tab per-NFT breakdown section.

// [PAGE-RETRY] The backend getNftClaimCounts() signature is unchanged (no
// pagination args, returns an array), so the optional offset/limit parameters
// are accepted for call-site consistency with the paginated listing hooks but
// are not forwarded. They participate in the cache key so a caller that pages
// still gets a distinct entry.
export function useNftClaimCounts(
  offset: bigint = DEFAULT_PAGE_OFFSET,
  limit: bigint = DEFAULT_PAGE_LIMIT,
) {
  const { actor } = useAuth();

  return useQuery<NftClaimCount[]>({
    queryKey: ["nft-claim-counts", offset, limit],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getNftClaimCounts();
    },
    // Public query — no admin gate. Library may be viewed without login,
    // in which case the anonymous actor still serves this public query.
    enabled: !!actor,
    staleTime: 30_000,
  });
}

export function useNftClaimBreakdown(isAdmin: boolean) {
  const { actor } = useAuth();

  return useQuery<NftClaimBreakdownEntry[]>({
    queryKey: ["nft-claim-breakdown"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getNftClaimBreakdown();
    },
    enabled: !!actor && isAdmin,
    staleTime: 30_000,
  });
}

// ── Referral hooks ───────────────────────────────────────────────────────────
// These wrap the new backend referral methods. The caller's referral status
// (useMyReferralStatus) drives the ReferralBanner; admin hooks drive the
// Health tab and Settings controls. All mutations invalidate the relevant
// query keys so the UI refreshes immediately.

export function useMyReferralStatus(enabled = true) {
  const { actor } = useAuth();

  return useQuery<MyReferralStatus | null>({
    queryKey: ["myReferralStatus"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getMyReferralStatus();
    },
    enabled: !!actor && enabled,
    staleTime: 30_000,
  });
}

export function useGetOrCreateReferralCode() {
  const { actor, principal } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<string> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.getOrCreateMyReferralCode();
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to create referral code");
      }
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myReferralStatus"] });
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
    },
    onError: (err: Error) => {
      addNotification(
        {
          type: "critical",
          title: "Referral Code Failed",
          message: err.message,
        },
        principal,
      );
    },
  });
}

export function useReferralHealthMetrics(isAdmin: boolean) {
  const { actor } = useAuth();

  return useQuery<ReferralHealthMetrics>({
    queryKey: ["referralHealthMetrics"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getReferralHealthMetrics();
    },
    enabled: !!actor && isAdmin,
    staleTime: 30_000,
  });
}

export function useRunBatchAwardCycle(_isAdmin: boolean) {
  const { actor, principal } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not authenticated");
      return await actor.runBatchAwardCycle();
    },
    onSuccess: (result) => {
      if (result.__kind__ === "ok") {
        const r = result.ok;
        toast.success(
          `Awarded ${r.awardedThisCycle.toString()} bonus NFT(s) this cycle.`,
        );
      } else {
        toast.error(result.err || "Batch award cycle failed");
      }
      queryClient.invalidateQueries({ queryKey: ["referralHealthMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["myReferralStatus"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["myNfts"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Batch award cycle failed");
      addNotification(
        {
          type: "critical",
          title: "Batch Award Failed",
          message: err.message,
        },
        principal,
      );
    },
  });
}

export function useAdminSetNftRewardType(_isAdmin: boolean) {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      nftId,
      rewardType,
    }: {
      nftId: bigint;
      rewardType: RewardType;
    }): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.adminSetNftRewardType(nftId, rewardType);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to set NFT reward type");
      }
    },
    onSuccess: () => {
      toast.success("NFT reward type updated");
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["referralHealthMetrics"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to set NFT reward type");
    },
  });
}

export function useAdminSetNftReferralThreshold(_isAdmin: boolean) {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      nftId,
      threshold,
    }: {
      nftId: bigint;
      threshold: bigint;
    }): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.adminSetNftReferralThreshold(nftId, threshold);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to set NFT referral threshold");
      }
    },
    onSuccess: () => {
      toast.success("NFT referral threshold updated");
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["referralHealthMetrics"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to set NFT referral threshold");
    },
  });
}

// [ADMIN-PRICE] Admin-only set/update/clear of an NFT's whole-value USD price.
// This is the dedicated listing path: `adminSetNftPrice(id, priceUsd)` takes a
// nullable price where `null` clears the listing (unlists the NFT) and a
// positive whole-dollar value sets/updates it. It is the only way to CLEAR a
// price — updateBusinessMetadata treats priceUsd=null as "unchanged". The
// backend returns the updated Nft (Result_13), so the caller can render the new
// price without a refetch. The frontend accepts the normalized PriceUsd
// (number | null) and converts to the backend's bigint | null here, so UI code
// never juggles bigints. Invalidates the same listing families as the other
// admin NFT mutations so the price strip refreshes everywhere.
export function useAdminSetNftPrice() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      nftId,
      priceUsd,
    }: {
      nftId: bigint;
      priceUsd: PriceUsd;
    }): Promise<Nft> => {
      if (!actor) throw new Error("Not authenticated");
      const backendPrice =
        priceUsd === null || priceUsd === undefined
          ? null
          : BigInt(Math.trunc(priceUsd));
      const result = await actor.adminSetNftPrice(nftId, backendPrice);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to set NFT price");
      }
      return result.ok;
    },
    onSuccess: () => {
      toast.success("NFT price updated");
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["myNfts"] });
      queryClient.invalidateQueries({ queryKey: ["publicNfts"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to set NFT price");
    },
  });
}

export function useAdminUpdateBatchAwardConfig(_isAdmin: boolean) {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: BatchAwardConfig): Promise<BatchAwardConfig> => {
      if (!actor) throw new Error("Not authenticated");
      return await actor.adminUpdateBatchAwardConfig(config);
    },
    onSuccess: () => {
      toast.success("Batch award config updated");
      queryClient.invalidateQueries({ queryKey: ["referralHealthMetrics"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update batch award config");
    },
  });
}

export function useAdminPurgeEligiblePending(_isAdmin: boolean) {
  const { actor, principal } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (referrerPrincipal: string): Promise<boolean> => {
      if (!actor) throw new Error("Not authenticated");
      const pid = Principal.fromText(referrerPrincipal);
      return await actor.adminPurgeEligiblePending(pid);
    },
    onSuccess: (purged) => {
      if (purged) {
        toast.success("Eligible-pending entry purged");
      } else {
        toast.error("No eligible-pending entry found for that principal");
      }
      queryClient.invalidateQueries({ queryKey: ["referralHealthMetrics"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to purge eligible-pending entry");
      addNotification(
        {
          type: "critical",
          title: "Purge Failed",
          message: err.message,
        },
        principal,
      );
    },
  });
}

// ── Public gallery (anonymous) ──────────────────────────────────────────────
// The public gallery is reachable without signing in, so it cannot use the
// authenticated actor from useAuth(). It builds its own anonymous actor with
// the exact pattern ClaimPage uses: resolve the deploy-injected canister ID and
// env at runtime, build an HttpAgent + StorageClient, then createActor with a
// downloadFn that delegates to the single shared resolveStorageWireBlob
// resolver. This keeps one image-resolution path across every surface.
//
// [GALLERY] instrumentation prefix (distinct from the existing
// [IMG-RESOLVE]/[IMG-FIX]/[IMG-WIRE]/[RENDER]/[LOGIN] markers).
const GALLERY_PAGE_LIMIT = 12n;

export function usePublicNfts(
  offset: bigint = DEFAULT_PAGE_OFFSET,
  limit: bigint = GALLERY_PAGE_LIMIT,
) {
  const [anonymousActor, setAnonymousActor] = useState<ReturnType<
    typeof createActor
  > | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const canisterId = await getBackendCanisterId();
        if (cancelled) return;
        const env = await getEnv();
        const agent = new HttpAgent({ host: env.backend_host || undefined });
        // [GALLERY] Local replicas serve a self-signed root key, so the agent
        // must fetch it before it can verify query/update certificates. Without
        // this, every listPublicNfts/getNftPublic call rejects with a
        // certificate signature-verification error and the gallery falls into
        // its error state. Mirrors the platform's createActorWithConfig, which
        // only fetches the root key when the host is localhost — production
        // hosts keep the built-in mainnet root key.
        if (env.backend_host?.includes("localhost")) {
          await agent.fetchRootKey().catch((err) => {
            devLog("[GALLERY] fetchRootKey failed", {
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
        const storageClient = new StorageClient(
          "default-bucket",
          env.storage_gateway_url || "https://blob.caffeine.ai",
          canisterId,
          env.project_id || "0000000-0000-0000-0000-00000000000",
          agent,
        );
        const actor = createActor(
          canisterId,
          async (file) => {
            const bytes = await file.getBytes();
            return bytes;
          },
          async (bytes) => {
            return resolveStorageWireBlob(
              new Uint8Array(bytes),
              storageClient,
              env,
              canisterId,
            );
          },
          { agent },
        );
        if (!cancelled) setAnonymousActor(actor);
      } catch (err) {
        devLog("[GALLERY] failed to resolve anonymous actor", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return useQuery<{ items: Nft[]; total: bigint }>({
    queryKey: ["publicNfts", offset, limit],
    queryFn: async () => {
      if (!anonymousActor) throw new Error("Anonymous actor not yet resolved");
      const page = await anonymousActor.listPublicNfts(offset, limit);
      // [GALLERY] The summary's thumbnail is the raw assetHash, which
      // resolveNftImageUrl rejects. Hydrate each item's real imageBlob from the
      // full record so thumbnails render.
      //
      // [PUBLIC-GALLERY] The anonymous actor must NOT call getNft: the backend
      // traps for anonymous callers ("Unauthorized: Anonymous caller"), so every
      // hydration read rejected and every card fell back to "No image". The
      // backend now exposes the anonymous-callable getNftPublic(id) read path
      // (returns the full Nft record including imageBlob). The generated
      // bindings may not yet include it, so read it through a narrow typed
      // adapter and fall back to getNft only when it is genuinely absent.
      const publicReader = (
        anonymousActor as unknown as {
          getNftPublic?: (id: bigint) => Promise<Nft | null>;
        }
      ).getNftPublic;
      const readFullNft =
        typeof publicReader === "function"
          ? async (id: bigint): Promise<Nft | null> => {
              const res = await publicReader.call(anonymousActor, id);
              return res ?? null;
            }
          : undefined;
      const items = await hydrateSummaryNfts(
        anonymousActor,
        page.items.map(summaryToNft),
        readFullNft,
      );
      return { items, total: page.total };
    },
    enabled: !!anonymousActor,
    staleTime: 30_000,
  });
}

// ── Purchase flow ───────────────────────────────────────────────────────────
// A buyer opens a listed NFT, sees the USD price and the admin payment address,
// sends ICP from their own wallet, then submits the transaction reference. The
// quote resolves the live ICP/USD rate (with an optional admin override) and
// returns the exact e8s amount to send. getPurchaseQuote is a shared UPDATE on
// the backend (it resolves the live rate), so it is called through a mutation
// rather than a query.

export function usePurchaseQuote() {
  const { actor } = useAuth();

  return useMutation({
    mutationFn: async (nftId: bigint): Promise<PurchaseQuote> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.getPurchaseQuote(nftId);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to load purchase quote");
      }
      return result.ok;
    },
  });
}

export function useSubmitPurchase() {
  const { actor, principal } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      nftId,
      txRef,
    }: {
      nftId: bigint;
      txRef: string;
    }): Promise<Purchase> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.submitPurchase(nftId, txRef);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to submit purchase");
      }
      return result.ok;
    },
    onSuccess: () => {
      addNotification(
        {
          type: "info",
          title: "Purchase Submitted",
          message: "Your transaction is being verified on-chain.",
        },
        principal,
      );
      queryClient.invalidateQueries({ queryKey: ["myPurchases"] });
      queryClient.invalidateQueries({ queryKey: ["myNfts"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["publicNfts"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit purchase");
    },
  });
}

export function useVerifyPurchase() {
  const { actor, principal } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (purchaseId: string): Promise<Purchase> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.verifyPurchase(purchaseId);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to verify purchase");
      }
      return result.ok;
    },
    onSuccess: () => {
      addNotification(
        {
          type: "info",
          title: "Purchase Confirmed",
          message: "Payment verified and the NFT is now yours.",
        },
        principal,
      );
      queryClient.invalidateQueries({ queryKey: ["myPurchases"] });
      queryClient.invalidateQueries({ queryKey: ["myNfts"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["publicNfts"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to verify purchase");
    },
  });
}

export function useMyPurchases(enabled = true) {
  const { actor } = useAuth();

  return useQuery<Purchase[]>({
    queryKey: ["myPurchases"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.listMyPurchases();
    },
    enabled: !!actor && enabled,
    staleTime: 30_000,
  });
}

// ── Admin payment configuration ─────────────────────────────────────────────
// The admin sets the ICP payment address buyers send to, and may pin a manual
// ICP/USD rate override (in e8s per USD) instead of the live rate.

export function usePaymentConfig(enabled = true) {
  const { actor } = useAuth();

  return useQuery<{ paymentAddress: string; rateOverride?: bigint }>({
    queryKey: ["paymentConfig"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      const result = await actor.getPaymentConfig();
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to load payment config");
      }
      return result.ok;
    },
    enabled: !!actor && enabled,
    staleTime: 30_000,
  });
}

export function useSetPaymentAddress() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: string): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.setPaymentAddress(address);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to set payment address");
      }
    },
    onSuccess: () => {
      toast.success("Payment address saved");
      queryClient.invalidateQueries({ queryKey: ["paymentConfig"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to set payment address");
    },
  });
}

export function useSetRateOverride() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rate: bigint): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.setRateOverride(rate);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to set rate override");
      }
    },
    onSuccess: () => {
      toast.success("Rate override saved");
      queryClient.invalidateQueries({ queryKey: ["paymentConfig"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to set rate override");
    },
  });
}

export function useClearRateOverride() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.clearRateOverride();
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to clear rate override");
      }
    },
    onSuccess: () => {
      toast.success("Rate override cleared");
      queryClient.invalidateQueries({ queryKey: ["paymentConfig"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to clear rate override");
    },
  });
}

// ── Admin ownership reassignment ────────────────────────────────────────────
// [ADMIN-REASSIGN] Admin-only ownership transfer of existing NFTs. The backend
// exposes adminReassignOwner(id, newOwner) -> AdminReassignResult and
// adminReassignOwnerBatch(ids, newOwner) -> AdminReassignResult[]. Each result
// carries { id, ok, error? } so the caller can report per-id success/failure.
// Both mutations invalidate the owner-scoped listing families so the NFTs
// appear in the new owner's Studio (myActiveNfts) and Library (myNfts) on the
// next read. The target principal is parsed with Principal.fromText so an
// invalid principal fails fast with a clear message instead of a backend trap.

export function useAdminReassignOwner() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      newOwner,
    }: {
      id: bigint;
      newOwner: string;
    }): Promise<AdminReassignResult> => {
      if (!actor) throw new Error("Not authenticated");
      const target = Principal.fromText(newOwner);
      return await actor.adminReassignOwner(id, target);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["myNfts"] });
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
      queryClient.invalidateQueries({ queryKey: ["publicNfts"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reassign NFT owner");
    },
  });
}

export function useAdminReassignOwnerBatch() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      newOwner,
    }: {
      ids: bigint[];
      newOwner: string;
    }): Promise<AdminReassignResult[]> => {
      if (!actor) throw new Error("Not authenticated");
      const target = Principal.fromText(newOwner);
      return await actor.adminReassignOwnerBatch(ids, target);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["myNfts"] });
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
      queryClient.invalidateQueries({ queryKey: ["publicNfts"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reassign NFT owners");
    },
  });
}

// [ADMIN-REASSIGN] Reassign every NFT the caller currently owns to a target
// principal in one backend call. The batch endpoint takes an explicit id list,
// so this hook first pages through the caller's own listings (listMyNfts) to
// collect every owned id, then issues a single adminReassignOwnerBatch call.
// Paging is bounded by the reported total so a large library is fully covered.
export function useAdminReassignAllOwned() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      newOwner,
    }: {
      newOwner: string;
    }): Promise<AdminReassignResult[]> => {
      if (!actor) throw new Error("Not authenticated");
      const target = Principal.fromText(newOwner);
      const pageSize = 100n;
      const ids: bigint[] = [];
      let offset = 0n;
      // Page until we have collected `total` ids (or a page comes back empty,
      // which guards against a total that overstates the available items).
      for (;;) {
        const page = await actor.listMyNfts(offset, pageSize);
        for (const item of page.items) ids.push(item.id);
        offset += pageSize;
        if (
          page.items.length === 0 ||
          BigInt(ids.length) >= page.total ||
          offset > page.total
        ) {
          break;
        }
      }
      if (ids.length === 0) return [];
      return await actor.adminReassignOwnerBatch(ids, target);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["myNfts"] });
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
      queryClient.invalidateQueries({ queryKey: ["publicNfts"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reassign NFT owners");
    },
  });
}
