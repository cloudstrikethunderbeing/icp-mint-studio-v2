import type {
  BatchAwardConfig,
  CollectionWithCount,
  HealthMetrics,
  MyReferralStatus,
  Nft,
  NftClaimBreakdownEntry,
  NftClaimCount,
  ReferralHealthMetrics,
  RewardType,
  VerifyResult,
} from "@/backend";
import { getBackendCanisterId, validateCanisterId } from "@/config/canisters";
import { useAuth } from "@/contexts/AuthContext";
import { addNotification } from "@/hooks/useNotifications";
import type { PaymentProof } from "@/types";
import type { TransferResult, UpdateMetadataRequest } from "@/types";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { normalizeNFTResponse } from "../utils/nftNormalization";

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

export function useBackendHealth(): BackendHealthStatus {
  const { actor } = useAuth();
  const [health, setHealth] = useState<BackendHealthStatus>({
    status: "checking",
  });
  // Records the first observed non-zero NFT count. Once a non-zero count has
  // been observed, the catalog is "known to exist" — a later drop to zero is a
  // data-loss anomaly that must block. On a fresh canister (never observed a
  // non-zero count) we do NOT block, so the admin can mint the first NFT.
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
          // The empty check is scoped to "zero NFTs when NFTs are known to
          // exist". We only flag 'empty' (blocking) when a prior non-zero
          // count was observed and the count has since dropped to zero
          // (indicating data loss). On a fresh canister (never observed a
          // non-zero count) we do NOT block — the admin must be able to mint
          // the first NFT.
          const totalNftCount = await actor.getTotalNftCount();
          if (cancelled) return;
          if (totalNftCount > 0n) {
            knownToExistRef.current = totalNftCount;
            setHealth({ status: "ok", canisterId: actual });
            return;
          }
          // totalNftCount === 0n
          if (knownToExistRef.current !== null) {
            // A non-zero count was previously observed and has now dropped to
            // zero — data loss. Block the silent-empty-catalog state.
            setHealth({ status: "empty", canisterId: actual });
            return;
          }
          // Fresh canister — never observed a non-zero count. Allow bootstrap.
          setHealth({ status: "ok", canisterId: actual });
        } catch (err) {
          if (cancelled) return;
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
      queryClient.invalidateQueries({ queryKey: ["allMyNfts"] });
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
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (_err: Error) => {
      addNotification(
        {
          type: "critical",
          title: "Burn Failed",
          message: "The NFT could not be burned.",
        },
        principal,
      );
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
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (_err: Error) => {
      addNotification(
        {
          type: "critical",
          title: "Delete Failed",
          message: "The NFT could not be deleted.",
        },
        principal,
      );
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

export function useMyActiveNfts(principal: string | null) {
  const { actor } = useAuth();

  return useQuery<Nft[]>({
    queryKey: ["myActiveNfts", principal ?? "anonymous"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      const result = await actor.listMyActiveNfts();
      const normalized = normalizeNFTResponse(result);
      return normalized;
    },
    enabled: !!actor,
    staleTime: 30_000,
  });
}

export function useMyNfts() {
  const { actor } = useAuth();

  return useQuery<Nft[]>({
    queryKey: ["myNfts"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      const result = await actor.listMyNfts();
      return normalizeNFTResponse(result);
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
export function useTotalNftCount() {
  const { actor } = useAuth();

  return useQuery<bigint>({
    queryKey: ["totalNftCount"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getTotalNftCount();
    },
    enabled: !!actor,
    staleTime: 30_000,
  });
}

export function useSearchNfts(searchTerm: string, enabled: boolean) {
  const { actor } = useAuth();

  return useQuery<Nft[]>({
    queryKey: ["searchNfts", searchTerm],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      const act = actor as unknown as {
        searchNfts: (term: string) => Promise<Nft[]>;
      };
      if (!act.searchNfts) {
        throw new Error("searchNfts not available on backend");
      }
      const raw = await act.searchNfts(searchTerm);
      return normalizeNFTResponse(raw).filter((item) => item != null);
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

export function useNftClaimCounts() {
  const { actor } = useAuth();

  return useQuery<NftClaimCount[]>({
    queryKey: ["nft-claim-counts"],
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
