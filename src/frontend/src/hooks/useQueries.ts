import type { HealthMetrics } from "@/backend";
import type { CollectionWithCount, Nft, VerifyResult } from "@/backend";
import { useAuth } from "@/contexts/AuthContext";
import { addNotification } from "@/hooks/useNotifications";
import type { PaymentProof } from "@/types";
import type { TransferResult, UpdateMetadataRequest } from "@/types";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeNFTResponse } from "../utils/nftNormalization";
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
  const { actor } = useAuth();
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
      addNotification({
        type: "info",
        title: "NFT Transferred",
        message: "Your NFT was transferred successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (_err: Error) => {
      addNotification({
        type: "critical",
        title: "Transfer Failed",
        message: "The transfer could not be completed.",
      });
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
  const { actor } = useAuth();
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
      addNotification({
        type: "info",
        title: "Payment proof submitted",
        message: "Awaiting admin review.",
      });
      queryClient.invalidateQueries({ queryKey: ["myPaymentProofs"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit payment proof");
    },
  });
}

export function useApprovePaymentProof() {
  const { actor } = useAuth();
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
      addNotification({
        type: "info",
        title: "Payment proof approved",
        message: "Tier assigned successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["paymentProofs"] });
      queryClient.invalidateQueries({ queryKey: ["myPaymentProofs"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to approve payment proof");
    },
  });
}

export function useRejectPaymentProof() {
  const { actor } = useAuth();
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
      addNotification({
        type: "warning",
        title: "Payment proof rejected",
        message: "Submission was rejected by admin.",
      });
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
  const { actor } = useAuth();
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
      addNotification({
        type: "info",
        title: "NFT Burned",
        message: "Your NFT has been permanently burned.",
      });
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (_err: Error) => {
      addNotification({
        type: "critical",
        title: "Burn Failed",
        message: "The NFT could not be burned.",
      });
    },
  });
}

export function useDeleteNft() {
  const { actor } = useAuth();
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
      addNotification({
        type: "info",
        title: "NFT Deleted",
        message: "Your NFT has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (_err: Error) => {
      addNotification({
        type: "critical",
        title: "Delete Failed",
        message: "The NFT could not be deleted.",
      });
    },
  });
}

export function useCreateCollection() {
  const { actor } = useAuth();
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
      addNotification({
        type: "info",
        title: "Collection Created",
        message: "Collection created successfully",
        navigationTarget: "/",
      });
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
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collectionId: bigint): Promise<void> => {
      if (!actor) throw new Error("Not authenticated");
      await actor.deleteCollectionAndUnassignNfts(collectionId);
    },
    onSuccess: async () => {
      toast.success("Collection deleted");
      addNotification({
        type: "warning",
        title: "Collection Deleted",
        message: "Collection deleted",
      });
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
    staleTime: 0,
    gcTime: 0,
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
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nftId: bigint): Promise<string> => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.generateClaimLink(nftId);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: (_data, nftId) => {
      addNotification({
        type: "info",
        title: "Claim Link Created",
        message: "Claim link generated successfully",
        navigationTarget: "/",
      });
      queryClient.invalidateQueries({
        queryKey: ["claimStatus", nftId.toString()],
      });
    },
    onError: (err: Error) => {
      addNotification({
        type: "critical",
        title: "Claim Link Failed",
        message: err.message,
      });
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
