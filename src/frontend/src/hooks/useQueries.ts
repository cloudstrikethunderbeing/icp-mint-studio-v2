import { type VerifyResult, createActor } from "@/backend";
import type { backendInterface } from "@/backend";
import { addNotification } from "@/hooks/useNotifications";
import type { PaymentProof } from "@/types";
import type { TransferResult, UpdateMetadataRequest } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useTransferNft() {
  const { actor } = useActor(createActor);
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
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["allMyNfts"] });
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
  const { actor } = useActor(createActor);
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
  const { actor } = useActor(createActor);
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
  const { actor } = useActor(createActor);
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
  const { actor } = useActor(createActor);
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
  const { actor } = useActor(createActor);

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
  const { actor } = useActor(createActor);

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
  const { actor } = useActor(createActor);

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
  const { actor } = useActor(createActor);

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
  const { actor } = useActor(createActor);

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
  const { actor } = useActor(createActor);

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
  const { actor } = useActor(createActor);

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

export function useSetUserStripeProductId() {
  const { actor } = useActor(createActor);
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
