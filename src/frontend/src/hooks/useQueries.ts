import type { CollectionWithCount, Nft, VerifyResult } from "@/backend";
import { useAuth } from "@/contexts/AuthContext";
import { addNotification } from "@/hooks/useNotifications";
import type { PaymentProof } from "@/types";
import type { TransferResult, UpdateMetadataRequest } from "@/types";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeNFTResponse } from "../utils/nftNormalization";
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
      toast.success("NFT transferred successfully!");
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (err: Error) => {
      addNotification({
        type: "critical",
        title: "Transfer Failed",
        message: "The transfer could not be completed.",
      });
      toast.error(err.message || "Transfer failed");
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

export function useGetAdminPrincipal() {
  const { actor } = useAuth();

  return useQuery<string | null>({
    queryKey: ["adminPrincipal"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      const result = await actor.getAdminPrincipal();
      return result === null ? null : result.toString();
    },
    enabled: !!actor,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}

export function useIsAdmin() {
  const { actor } = useAuth();

  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.isAdmin();
    },
    enabled: !!actor,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
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
    onSuccess: () => {
      toast.success("NFT added to collection");
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
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
      toast.success("NFT burned successfully");
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (err: Error) => {
      addNotification({
        type: "critical",
        title: "Burn Failed",
        message: "The NFT could not be burned.",
      });
      toast.error(err.message || "Failed to burn NFT");
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
      toast.success("NFT deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (err: Error) => {
      addNotification({
        type: "critical",
        title: "Delete Failed",
        message: "The NFT could not be deleted.",
      });
      toast.error(err.message || "Failed to delete NFT");
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
    onSuccess: () => {
      toast.success("NFT removed from collection");
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to remove NFT from collection");
    },
  });
}

/** Module-level hydration flag — survives React re-renders and route changes.
 * Reset to false on logout (see AuthContext). */
let nftHydrated = false;

/** Call this on explicit logout to allow fresh hydration on next login. */
export function resetNftHydration() {
  nftHydrated = false;
}

export function useMyActiveNfts() {
  const { actor } = useAuth();

  return useQuery<Nft[]>({
    queryKey: ["myActiveNfts"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      const result = await actor.listMyActiveNfts();
      const normalized = normalizeNFTResponse(result);
      // Mark hydrated so subsequent renders skip re-fetch
      nftHydrated = true;
      return normalized;
    },
    enabled: !!actor,
    staleTime: nftHydrated ? Number.POSITIVE_INFINITY : 30_000,
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
      queryClient.invalidateQueries({
        queryKey: ["claimStatus", nftId.toString()],
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
