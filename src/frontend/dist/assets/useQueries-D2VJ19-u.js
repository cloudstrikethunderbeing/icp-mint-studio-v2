var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _client, _currentResult, _currentMutation, _mutateOptions, _MutationObserver_instances, updateResult_fn, notify_fn, _a;
import { o as Subscribable, s as shallowEqualObjects, p as hashKey, q as getDefaultState, t as notifyManager, d as useQueryClient, r as reactExports, v as noop, w as shouldThrowError, a as useAuth, k as ue, f as addNotification, P as Principal } from "./main-BjOk3k__.js";
import { u as useQuery } from "./useQuery-gZlIR-85.js";
var MutationObserver = (_a = class extends Subscribable {
  constructor(client, options) {
    super();
    __privateAdd(this, _MutationObserver_instances);
    __privateAdd(this, _client);
    __privateAdd(this, _currentResult);
    __privateAdd(this, _currentMutation);
    __privateAdd(this, _mutateOptions);
    __privateSet(this, _client, client);
    this.setOptions(options);
    this.bindMethods();
    __privateMethod(this, _MutationObserver_instances, updateResult_fn).call(this);
  }
  bindMethods() {
    this.mutate = this.mutate.bind(this);
    this.reset = this.reset.bind(this);
  }
  setOptions(options) {
    var _a2;
    const prevOptions = this.options;
    this.options = __privateGet(this, _client).defaultMutationOptions(options);
    if (!shallowEqualObjects(this.options, prevOptions)) {
      __privateGet(this, _client).getMutationCache().notify({
        type: "observerOptionsUpdated",
        mutation: __privateGet(this, _currentMutation),
        observer: this
      });
    }
    if ((prevOptions == null ? void 0 : prevOptions.mutationKey) && this.options.mutationKey && hashKey(prevOptions.mutationKey) !== hashKey(this.options.mutationKey)) {
      this.reset();
    } else if (((_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.state.status) === "pending") {
      __privateGet(this, _currentMutation).setOptions(this.options);
    }
  }
  onUnsubscribe() {
    var _a2;
    if (!this.hasListeners()) {
      (_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.removeObserver(this);
    }
  }
  onMutationUpdate(action) {
    __privateMethod(this, _MutationObserver_instances, updateResult_fn).call(this);
    __privateMethod(this, _MutationObserver_instances, notify_fn).call(this, action);
  }
  getCurrentResult() {
    return __privateGet(this, _currentResult);
  }
  reset() {
    var _a2;
    (_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.removeObserver(this);
    __privateSet(this, _currentMutation, void 0);
    __privateMethod(this, _MutationObserver_instances, updateResult_fn).call(this);
    __privateMethod(this, _MutationObserver_instances, notify_fn).call(this);
  }
  mutate(variables, options) {
    var _a2;
    __privateSet(this, _mutateOptions, options);
    (_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.removeObserver(this);
    __privateSet(this, _currentMutation, __privateGet(this, _client).getMutationCache().build(__privateGet(this, _client), this.options));
    __privateGet(this, _currentMutation).addObserver(this);
    return __privateGet(this, _currentMutation).execute(variables);
  }
}, _client = new WeakMap(), _currentResult = new WeakMap(), _currentMutation = new WeakMap(), _mutateOptions = new WeakMap(), _MutationObserver_instances = new WeakSet(), updateResult_fn = function() {
  var _a2;
  const state = ((_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.state) ?? getDefaultState();
  __privateSet(this, _currentResult, {
    ...state,
    isPending: state.status === "pending",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    isIdle: state.status === "idle",
    mutate: this.mutate,
    reset: this.reset
  });
}, notify_fn = function(action) {
  notifyManager.batch(() => {
    var _a2, _b, _c, _d, _e, _f, _g, _h;
    if (__privateGet(this, _mutateOptions) && this.hasListeners()) {
      const variables = __privateGet(this, _currentResult).variables;
      const onMutateResult = __privateGet(this, _currentResult).context;
      const context = {
        client: __privateGet(this, _client),
        meta: this.options.meta,
        mutationKey: this.options.mutationKey
      };
      if ((action == null ? void 0 : action.type) === "success") {
        try {
          (_b = (_a2 = __privateGet(this, _mutateOptions)).onSuccess) == null ? void 0 : _b.call(
            _a2,
            action.data,
            variables,
            onMutateResult,
            context
          );
        } catch (e) {
          void Promise.reject(e);
        }
        try {
          (_d = (_c = __privateGet(this, _mutateOptions)).onSettled) == null ? void 0 : _d.call(
            _c,
            action.data,
            null,
            variables,
            onMutateResult,
            context
          );
        } catch (e) {
          void Promise.reject(e);
        }
      } else if ((action == null ? void 0 : action.type) === "error") {
        try {
          (_f = (_e = __privateGet(this, _mutateOptions)).onError) == null ? void 0 : _f.call(
            _e,
            action.error,
            variables,
            onMutateResult,
            context
          );
        } catch (e) {
          void Promise.reject(e);
        }
        try {
          (_h = (_g = __privateGet(this, _mutateOptions)).onSettled) == null ? void 0 : _h.call(
            _g,
            void 0,
            action.error,
            variables,
            onMutateResult,
            context
          );
        } catch (e) {
          void Promise.reject(e);
        }
      }
    }
    this.listeners.forEach((listener) => {
      listener(__privateGet(this, _currentResult));
    });
  });
}, _a);
function useMutation(options, queryClient) {
  const client = useQueryClient();
  const [observer] = reactExports.useState(
    () => new MutationObserver(
      client,
      options
    )
  );
  reactExports.useEffect(() => {
    observer.setOptions(options);
  }, [observer, options]);
  const result = reactExports.useSyncExternalStore(
    reactExports.useCallback(
      (onStoreChange) => observer.subscribe(notifyManager.batchCalls(onStoreChange)),
      [observer]
    ),
    () => observer.getCurrentResult(),
    () => observer.getCurrentResult()
  );
  const mutate = reactExports.useCallback(
    (variables, mutateOptions) => {
      observer.mutate(variables, mutateOptions).catch(noop);
    },
    [observer]
  );
  if (result.error && shouldThrowError(observer.options.throwOnError, [result.error])) {
    throw result.error;
  }
  return { ...result, mutate, mutateAsync: result.mutate };
}
function normalizeNFTResponse(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === "object") {
    if ("__kind__" in res) {
      if (res.__kind__ === "ok") {
        const ok = res.ok;
        return Array.isArray(ok) ? ok : [];
      }
      if (res.__kind__ === "err") return [];
    }
  }
  return [];
}
function useHealthMetrics(isAdmin) {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["healthMetrics"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getHealthMetrics();
    },
    enabled: !!actor && isAdmin,
    staleTime: 3e4
  });
}
function useTotalNfts(isAdmin) {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["totalNfts"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getTotalNfts();
    },
    enabled: !!actor && isAdmin,
    staleTime: 3e4
  });
}
function useActiveNfts(isAdmin) {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["activeNfts"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getActiveNfts();
    },
    enabled: !!actor && isAdmin,
    staleTime: 3e4
  });
}
function useClaimedNfts(isAdmin) {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["claimedNfts"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getClaimedNfts();
    },
    enabled: !!actor && isAdmin,
    staleTime: 3e4
  });
}
function useAvailableNfts(isAdmin) {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["availableNfts"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getAvailableNfts();
    },
    enabled: !!actor && isAdmin,
    staleTime: 3e4
  });
}
function useTotalCollections(isAdmin) {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["totalCollections"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getTotalCollections();
    },
    enabled: !!actor && isAdmin,
    staleTime: 3e4
  });
}
function useTotalCreators(isAdmin) {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["totalCreators"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getTotalCreators();
    },
    enabled: !!actor && isAdmin,
    staleTime: 3e4
  });
}
function useTotalClaims(isAdmin) {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["totalClaims"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getTotalClaims();
    },
    enabled: !!actor && isAdmin,
    staleTime: 3e4
  });
}
function useMetricsCanisterId(isAdmin) {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["metricsCanisterId"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getMetricsCanisterId();
    },
    enabled: !!actor && isAdmin,
    staleTime: Number.POSITIVE_INFINITY
  });
}
function useBackendBuildTimestamp(isAdmin) {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["backendBuildTimestamp"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getBackendBuildTimestamp();
    },
    enabled: !!actor && isAdmin,
    staleTime: Number.POSITIVE_INFINITY
  });
}
function useStorageUsage(isAdmin) {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["storageUsage"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getStorageUsage();
    },
    enabled: !!actor && isAdmin,
    staleTime: 3e4
  });
}
function useUpdateMetadata() {
  const { actor } = useAuth();
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
  const { actor } = useAuth();
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
  const { actor } = useAuth();
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
  const { actor } = useAuth();
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
  const { actor } = useAuth();
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
  const { actor } = useAuth();
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
  const { actor } = useAuth();
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
function useCreateSlot() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.createSlot();
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to create slot");
      }
      return result.ok;
    },
    onSuccess: () => {
      ue.success("New slot created");
      queryClient.invalidateQueries({ queryKey: ["slotsStatus"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
    },
    onError: (err) => {
      ue.error(err.message || "Failed to create slot");
    }
  });
}
function useCollections() {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      if (!actor) throw new Error("Not authenticated");
      return actor.listMyCollections();
    },
    enabled: !!actor,
    staleTime: 3e4
  });
}
function useAddNftToCollection() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      nftId,
      collectionId
    }) => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.addNftToCollection(nftId, collectionId);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to add NFT to collection");
      }
    },
    onSuccess: async () => {
      ue.success("NFT added to collection");
      await queryClient.refetchQueries({ queryKey: ["nfts"], exact: true });
      await queryClient.refetchQueries({
        queryKey: ["collections"],
        exact: true
      });
    },
    onError: (err) => {
      ue.error(err.message || "Failed to add NFT to collection");
    }
  });
}
function useBurnNft() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
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
        message: "Your NFT has been permanently burned."
      });
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (_err) => {
      addNotification({
        type: "critical",
        title: "Burn Failed",
        message: "The NFT could not be burned."
      });
    }
  });
}
function useDeleteNft() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
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
        message: "Your NFT has been deleted."
      });
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (_err) => {
      addNotification({
        type: "critical",
        title: "Delete Failed",
        message: "The NFT could not be deleted."
      });
    }
  });
}
function useCreateCollection() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description
    }) => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.createCollection(name, description);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to create collection");
      }
      return result.ok;
    },
    onSuccess: () => {
      ue.success("Collection created");
      addNotification({
        type: "info",
        title: "Collection Created",
        message: "Collection created successfully",
        navigationTarget: "/"
      });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err) => {
      ue.error(err.message || "Failed to create collection");
    }
  });
}
function useRemoveNftFromCollection() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      nftId,
      collectionId
    }) => {
      if (!actor) throw new Error("Not authenticated");
      const result = await actor.removeNftFromCollection(nftId, collectionId);
      if (result.__kind__ === "err") {
        throw new Error(result.err || "Failed to remove NFT from collection");
      }
    },
    onSuccess: async () => {
      ue.success("NFT removed from collection");
      await queryClient.refetchQueries({ queryKey: ["nfts"], exact: true });
      await queryClient.refetchQueries({
        queryKey: ["collections"],
        exact: true
      });
    },
    onError: (err) => {
      ue.error(err.message || "Failed to remove NFT from collection");
    }
  });
}
function useDeleteCollection() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (collectionId) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.deleteCollectionAndUnassignNfts(collectionId);
    },
    onSuccess: async () => {
      ue.success("Collection deleted");
      addNotification({
        type: "warning",
        title: "Collection Deleted",
        message: "Collection deleted"
      });
      await queryClient.refetchQueries({
        queryKey: ["collections"],
        exact: true
      });
      await queryClient.refetchQueries({ queryKey: ["nfts"], exact: true });
    },
    onError: (err) => {
      ue.error(err.message || "Failed to delete collection");
    }
  });
}
function useMyActiveNfts(principal) {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["myActiveNfts", principal ?? "anonymous"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      const result = await actor.listMyActiveNfts();
      const normalized = normalizeNFTResponse(result);
      return normalized;
    },
    enabled: !!actor,
    staleTime: 0,
    gcTime: 0
  });
}
function useMyNfts() {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["myNfts"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      const result = await actor.listMyNfts();
      return normalizeNFTResponse(result);
    },
    enabled: !!actor,
    staleTime: 3e4
  });
}
function useSearchNfts(searchTerm, enabled) {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["searchNfts", searchTerm],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      const act = actor;
      if (!act.searchNfts) {
        throw new Error("searchNfts not available on backend");
      }
      const raw = await act.searchNfts(searchTerm);
      return normalizeNFTResponse(raw).filter((item) => item != null);
    },
    enabled: !!actor && enabled && searchTerm.trim().length > 0,
    staleTime: 1e4
  });
}
function useGenerateClaimLink() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nftId) => {
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
        navigationTarget: "/"
      });
      queryClient.invalidateQueries({
        queryKey: ["claimStatus", nftId.toString()]
      });
    },
    onError: (err) => {
      addNotification({
        type: "critical",
        title: "Claim Link Failed",
        message: err.message
      });
    }
  });
}
function useGetClaimStatus(nftId, enabled = true) {
  const { actor } = useAuth();
  return useQuery({
    queryKey: ["claimStatus", (nftId == null ? void 0 : nftId.toString()) ?? ""],
    queryFn: async () => {
      if (!actor || nftId === void 0) return null;
      const result = await actor.getClaimStatus(nftId);
      if (result.__kind__ === "err") return null;
      return result.ok;
    },
    enabled: !!actor && enabled && nftId !== void 0,
    staleTime: 3e4
  });
}
function useSetUserStripeProductId() {
  const { actor } = useAuth();
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
  useStorageUsage as A,
  useMyPaymentProofs as B,
  useListPaymentProofs as C,
  useSubmitPaymentProof as D,
  useApprovePaymentProof as E,
  useRejectPaymentProof as F,
  useSetUserStripeProductId as G,
  useCollections as a,
  useDeleteNft as b,
  useBurnNft as c,
  useRemoveNftFromCollection as d,
  useCreateCollection as e,
  useAddNftToCollection as f,
  useDeleteCollection as g,
  useCreateSlot as h,
  useSearchNfts as i,
  useGenerateClaimLink as j,
  useMutation as k,
  useNftDetailQuery as l,
  useUpdateMetadata as m,
  useGetClaimStatus as n,
  useMyNfts as o,
  useHealthMetrics as p,
  useTotalNfts as q,
  useActiveNfts as r,
  useClaimedNfts as s,
  useAvailableNfts as t,
  useMyActiveNfts as u,
  useTotalCollections as v,
  useTotalCreators as w,
  useTotalClaims as x,
  useMetricsCanisterId as y,
  useBackendBuildTimestamp as z
};
