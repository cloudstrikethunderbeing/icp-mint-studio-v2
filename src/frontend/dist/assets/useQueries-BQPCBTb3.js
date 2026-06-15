import { e as useActor, f as useQueryClient, P as Principal, p as addNotification, g as useQuery, h as createActor } from "./index-C9MKyHwp.js";
import { u as useMutation } from "./useMutation-TMkDmjUs.js";
import { u as ue } from "./index-Bz8oZrta.js";
function useUpdateMetadata() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      nftId,
      updates
    }) => {
      if (!actor) throw new Error("Not authenticated");
      const act = actor;
      if (!act.updateBusinessMetadata) {
        throw new Error("updateBusinessMetadata not available on backend");
      }
      const result = await act.updateBusinessMetadata(nftId, updates);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Metadata update failed");
      }
    },
    onSuccess: () => {
      ue.success("Metadata updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
      queryClient.invalidateQueries({ queryKey: ["allMyNfts"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err) => {
      ue.error(err.message || "Metadata update failed");
    }
  });
}
function useSubmitPaymentProof() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      txHash,
      tierRequested,
      networkType
    }) => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.submitPaymentProof(
        txHash,
        tierRequested,
        networkType
      );
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to submit payment proof");
      }
    },
    onSuccess: () => {
      addNotification({
        type: "info",
        title: "Payment proof submitted",
        message: "Awaiting admin review."
      });
      queryClient.invalidateQueries({ queryKey: ["myPaymentProofs"] });
    },
    onError: (err) => {
      ue.error(err.message || "Failed to submit payment proof");
    }
  });
}
function useApprovePaymentProof() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (proofId) => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.approvePaymentProof(proofId);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to approve payment proof");
      }
    },
    onSuccess: () => {
      addNotification({
        type: "info",
        title: "Payment proof approved",
        message: "Tier assigned successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["paymentProofs"] });
      queryClient.invalidateQueries({ queryKey: ["myPaymentProofs"] });
    },
    onError: (err) => {
      ue.error(err.message || "Failed to approve payment proof");
    }
  });
}
function useRejectPaymentProof() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      proofId,
      reason
    }) => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.rejectPaymentProof(proofId, reason);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to reject payment proof");
      }
    },
    onSuccess: () => {
      addNotification({
        type: "warning",
        title: "Payment proof rejected",
        message: "Submission was rejected by admin."
      });
      queryClient.invalidateQueries({ queryKey: ["paymentProofs"] });
      queryClient.invalidateQueries({ queryKey: ["myPaymentProofs"] });
    },
    onError: (err) => {
      ue.error(err.message || "Failed to reject payment proof");
    }
  });
}
function useListPaymentProofs(isAdmin) {
  const { actor } = useActor(createActor);
  return useQuery({
    queryKey: ["paymentProofs"],
    queryFn: async () => {
      if (!actor) throw new Error("Not authenticated");
      return await actor.listPaymentProofs();
    },
    enabled: !!actor && isAdmin,
    staleTime: 30 * 1e3
  });
}
function useMyPaymentProofs(principal) {
  const { actor } = useActor(createActor);
  return useQuery({
    queryKey: ["myPaymentProofs", principal],
    queryFn: async () => {
      if (!actor) throw new Error("Not authenticated");
      return await actor.getMyPaymentProofs();
    },
    enabled: !!actor && !!principal,
    staleTime: 30 * 1e3
  });
}
function useNftDetailQuery(nftUniqueId) {
  const { actor } = useActor(createActor);
  return useQuery({
    queryKey: ["nftDetail", nftUniqueId],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      const result = await actor.verifyNftPublic(nftUniqueId);
      if (result.__kind__ === "ok") return result.ok;
      return null;
    },
    enabled: !!nftUniqueId && !!actor,
    staleTime: 6e4
  });
}
function useSetUserStripeProductId() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userPrincipal,
      productId
    }) => {
      if (!actor) throw new Error("Not authenticated");
      const principal = Principal.fromText(userPrincipal);
      const act = actor;
      if (!act.setUserStripeProductId) {
        throw new Error("setUserStripeProductId not available on backend");
      }
      const result = await act.setUserStripeProductId(
        principal,
        productId
      );
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to set Stripe product ID");
      }
    },
    onSuccess: () => {
      ue.success("Stripe product ID updated!");
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err) => {
      ue.error(err.message || "Failed to set Stripe product ID");
    }
  });
}
export {
  useUpdateMetadata as a,
  useSetUserStripeProductId as b,
  useSubmitPaymentProof as c,
  useApprovePaymentProof as d,
  useRejectPaymentProof as e,
  useMyPaymentProofs as f,
  useListPaymentProofs as g,
  useNftDetailQuery as u
};
