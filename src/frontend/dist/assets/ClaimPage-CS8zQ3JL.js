import { c as createLucideIcon, u as useParams, a as useSearch, b as useAuth, d as devLog, e as useNavigate, f as useQueryClient, r as reactExports, g as getBackendCanisterId, h as getEnv, H as HttpAgent, i as devError, S as StorageClient, j as createActor, k as resolveStorageWireBlob, l as useQuery, m as resolveNftImageUrl, n as jsxRuntimeExports, o as Sparkles, L as LoaderCircle, p as addNotification } from "./main-uWazffZ2.js";
import { B as Badge } from "./badge-Cc0s_nFq.js";
import { B as Button } from "./button-CB3kRgHi.js";
import { S as Skeleton } from "./skeleton-BJ9UnkWP.js";
import { S as ShieldCheck } from "./shield-check-DYJDZXnZ.js";
import { L as Lock } from "./lock-BIcb0vUF.js";
import { C as CircleCheck } from "./circle-check-CFHntSQ7.js";
import { C as CircleAlert } from "./circle-alert-EL2iein3.js";
import "./index-C0-7GMiu.js";
import "./utils-CMIF0FGc.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  [
    "path",
    {
      d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",
      key: "1a0edw"
    }
  ],
  ["path", { d: "M12 22V12", key: "d0xqtd" }],
  ["polyline", { points: "3.29 7 12 12 20.71 7", key: "ousv84" }],
  ["path", { d: "m7.5 4.27 9 5.15", key: "1c824w" }]
];
const Package = createLucideIcon("package", __iconNode);
function ClaimSkeleton() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-5 w-full max-w-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "w-full aspect-square rounded-2xl" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-6 w-3/4 mx-auto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-full" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-5/6" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-11 w-full rounded-lg" })
  ] });
}
function UnavailableState() {
  const navigate = useNavigate();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "flex flex-col items-center gap-4 text-center max-w-xs",
      "data-ocid": "claim.error_state",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-8 h-8 text-destructive" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold text-foreground", children: "NFT Not Available" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "This NFT is no longer available. The claim link may have already been used or is invalid." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            variant: "outline",
            onClick: () => navigate({ to: "/" }),
            "data-ocid": "claim.back_home_button",
            children: "Back to Home"
          }
        )
      ]
    }
  );
}
function ClaimPage() {
  const { claimToken } = useParams({ strict: false });
  const search = useSearch({ strict: false });
  const refParam = typeof (search == null ? void 0 : search.ref) === "string" && search.ref.trim().length > 0 ? search.ref.trim() : null;
  const { isAuthenticated, login, principal, actor, isFetching } = useAuth();
  devLog("[RENDER] ClaimPage render:", {
    isAuthenticated,
    actor: !!actor,
    isFetching
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isClaiming, setIsClaiming] = reactExports.useState(false);
  const [claimError, setClaimError] = reactExports.useState(null);
  const [anonymousActor, setAnonymousActor] = reactExports.useState(null);
  reactExports.useEffect(() => {
    let cancelled = false;
    (async () => {
      var _a;
      try {
        const canisterId = await getBackendCanisterId();
        if (cancelled) return;
        const env = await getEnv();
        const agent = new HttpAgent({ host: env.backend_host || void 0 });
        if ((_a = env.backend_host) == null ? void 0 : _a.includes("localhost")) {
          await agent.fetchRootKey().catch((err) => {
            devError("[CLAIM] fetchRootKey failed:", err);
          });
        }
        const storageClient = new StorageClient(
          "default-bucket",
          env.storage_gateway_url || "https://blob.caffeine.ai",
          canisterId,
          env.project_id || "0000000-0000-0000-0000-00000000000",
          agent
        );
        const actor2 = createActor(
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
              canisterId
            );
          },
          { agent }
        );
        if (!cancelled) setAnonymousActor(actor2);
      } catch (err) {
        devError("[CLAIM] failed to resolve backend canister ID:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const {
    data: previewResult,
    isLoading,
    isError
  } = useQuery({
    queryKey: ["claimPreview", claimToken],
    queryFn: async () => {
      if (!anonymousActor) {
        throw new Error("Anonymous actor not yet resolved");
      }
      return anonymousActor.getClaimPreview(claimToken);
    },
    enabled: !!claimToken && !!anonymousActor,
    staleTime: 3e4,
    retry: 1
  });
  const preview = (previewResult == null ? void 0 : previewResult.__kind__) === "ok" ? previewResult.ok : null;
  const nft = (preview == null ? void 0 : preview.nft) ? {
    ...preview.nft
  } : null;
  const supplyLimit = (preview == null ? void 0 : preview.supplyLimit) ?? 0n;
  const claimedCount = (preview == null ? void 0 : preview.claimedCount) ?? 0n;
  const remaining = supplyLimit - claimedCount;
  const isSoldOut = claimedCount >= supplyLimit;
  const isUnavailable = !isLoading && (isError || (previewResult == null ? void 0 : previewResult.__kind__) === "err");
  async function handleClaim() {
    var _a;
    if (!actor || isFetching || !isAuthenticated) return;
    setIsClaiming(true);
    setClaimError(null);
    try {
      const result = await actor.claimNft(claimToken, refParam);
      if (result.__kind__ === "ok") {
        const nftUniqueId = result.ok.nftUniqueId;
        sessionStorage.setItem(
          `claim_success_${claimToken}`,
          JSON.stringify({
            id: (_a = result.ok.id) == null ? void 0 : _a.toString(),
            title: result.ok.title,
            edition: result.ok.edition,
            nftUniqueId,
            imageUrl: resolveNftImageUrl(result.ok.imageBlob)
          })
        );
        await queryClient.invalidateQueries({
          queryKey: ["nftDetail", nftUniqueId]
        });
        await queryClient.invalidateQueries({
          queryKey: ["myActiveNfts"]
        });
        await queryClient.invalidateQueries({
          queryKey: ["myNfts"]
        });
        await queryClient.refetchQueries({
          queryKey: ["nftDetail", nftUniqueId],
          exact: true
        });
        const claimedImageUrl = resolveNftImageUrl(result.ok.imageBlob) || void 0;
        addNotification(
          {
            type: "info",
            title: "NFT Claimed",
            message: `${result.ok.title} claimed successfully`,
            navigationTarget: "/",
            imageUrl: claimedImageUrl || void 0
          },
          principal
        );
        navigate({
          to: "/claim/$claimToken/success",
          params: { claimToken }
        });
      } else {
        const errMsg = result.err ?? "Unable to claim this NFT.";
        setClaimError(errMsg);
        addNotification(
          {
            type: "critical",
            title: "Claim Failed",
            message: errMsg
          },
          principal
        );
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setClaimError(errMsg);
      addNotification(
        {
          type: "critical",
          title: "Claim Failed",
          message: errMsg
        },
        principal
      );
    } finally {
      setIsClaiming(false);
    }
  }
  const imageUrl = resolveNftImageUrl(nft == null ? void 0 : nft.imageBlob);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "min-h-[80vh] flex flex-col items-center justify-center px-4 py-10",
      "data-ocid": "claim.page",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-8 text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "w-4 h-4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium tracking-wide uppercase", children: "ICP Mint Studio" })
        ] }),
        isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(ClaimSkeleton, {}) : isUnavailable ? /* @__PURE__ */ jsxRuntimeExports.jsx(UnavailableState, {}) : nft ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex flex-col items-center gap-6 w-full max-w-sm",
            "data-ocid": "claim.card",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full aspect-square rounded-2xl overflow-hidden bg-muted shadow-lg", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: imageUrl,
                    alt: nft.title,
                    className: "w-full h-full object-cover",
                    loading: "eager"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-3 right-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { className: "gap-1 bg-primary/90 text-primary-foreground text-[10px] px-2 py-0.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-3 h-3" }),
                  "Verified"
                ] }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full text-center space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-bold text-foreground", children: nft.title }),
                nft.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground leading-relaxed", children: nft.description }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-2 pt-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "secondary", className: "text-xs", children: [
                    "Edition ",
                    (claimedCount + 1n).toString(),
                    " of",
                    " ",
                    supplyLimit.toString()
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "outline", className: "text-xs gap-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { className: "w-3 h-3" }),
                    remaining.toString(),
                    " of ",
                    supplyLimit.toString(),
                    " remaining"
                  ] })
                ] })
              ] }),
              !isAuthenticated ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: "w-full space-y-3",
                  "data-ocid": "claim.auth_gate_section",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 justify-center text-muted-foreground text-xs", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-3.5 h-3.5" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Connect your wallet to claim this NFT" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button,
                      {
                        type: "button",
                        className: "w-full",
                        onClick: () => {
                          devLog();
                          login();
                        },
                        "data-ocid": "claim.connect_wallet_button",
                        children: "Connect Wallet to Claim"
                      }
                    )
                  ]
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full space-y-3", "data-ocid": "claim.claim_section", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 justify-center text-muted-foreground text-xs", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-3.5 h-3.5 text-primary" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono truncate max-w-[200px]", children: principal })
                ] }),
                claimError && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3",
                    "data-ocid": "claim.error_state",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-4 h-4 mt-0.5 shrink-0" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: claimError })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    type: "button",
                    className: "w-full",
                    onClick: handleClaim,
                    disabled: isClaiming || !actor || isFetching || isSoldOut,
                    "data-ocid": "claim.claim_button",
                    children: isSoldOut ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-4 h-4 mr-2" }),
                      "This drop is sold out"
                    ] }) : isClaiming ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 mr-2 animate-spin" }),
                      "Claiming…"
                    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "w-4 h-4 mr-2" }),
                      "Claim NFT"
                    ] })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-muted-foreground text-center", children: [
                "Ownership transfers atomically to your principal on claim.",
                /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
                "This action cannot be undone."
              ] })
            ]
          }
        ) : null
      ]
    }
  );
}
export {
  ClaimPage as default
};
