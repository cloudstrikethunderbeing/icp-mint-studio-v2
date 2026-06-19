import { u as useParams, a as useAuth, b as useNavigate, c as useQueryClient, r as reactExports, d as useQuery, j as jsxRuntimeExports, S as Sparkles, B as Button, L as LoaderCircle } from "./main-NqEFbe9E.js";
import { B as Badge } from "./badge-A9IkWYww.js";
import { S as Skeleton } from "./skeleton-D7SF3OWg.js";
import { S as ShieldCheck } from "./shield-check-Cmq__vzM.js";
import { L as Lock } from "./lock-CX1k1n-g.js";
import { C as CircleCheck } from "./circle-check-Dd7rUHV7.js";
import { C as CircleAlert } from "./circle-alert-L8_hEgMV.js";
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
  const { isAuthenticated, login, principal, actor, isFetching } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isClaiming, setIsClaiming] = reactExports.useState(false);
  const [claimError, setClaimError] = reactExports.useState(null);
  const {
    data: previewResult,
    isLoading,
    isError
  } = useQuery({
    queryKey: ["claimPreview", claimToken],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getClaimPreview(claimToken);
    },
    enabled: !!claimToken && !!actor && !isFetching,
    staleTime: 3e4,
    retry: 1
  });
  const nft = (previewResult == null ? void 0 : previewResult.__kind__) === "ok" ? previewResult.ok : null;
  const isUnavailable = !isLoading && (isError || (previewResult == null ? void 0 : previewResult.__kind__) === "err");
  async function handleClaim() {
    var _a, _b, _c;
    if (!actor || isFetching || !isAuthenticated) return;
    setIsClaiming(true);
    setClaimError(null);
    try {
      const result = await actor.claimNft(claimToken);
      if (result.__kind__ === "ok") {
        const nftUniqueId = result.ok.nftUniqueId;
        sessionStorage.setItem(
          `claim_success_${claimToken}`,
          JSON.stringify({
            id: (_a = result.ok.id) == null ? void 0 : _a.toString(),
            title: result.ok.title,
            edition: result.ok.edition,
            nftUniqueId,
            imageUrl: ((_c = (_b = result.ok.imageBlob) == null ? void 0 : _b.getDirectURL) == null ? void 0 : _c.call(_b)) ?? ""
          })
        );
        await queryClient.invalidateQueries({
          queryKey: ["nftDetail", nftUniqueId]
        });
        await queryClient.refetchQueries({
          queryKey: ["nftDetail", nftUniqueId],
          exact: true
        });
        navigate({
          to: "/claim/$claimToken/success",
          params: { claimToken }
        });
      } else {
        setClaimError(result.err ?? "Unable to claim this NFT.");
      }
    } catch {
      setClaimError("Something went wrong. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  }
  const imageUrl = (nft == null ? void 0 : nft.imageBlob.getDirectURL()) ?? "";
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
                    nft.edition
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "outline", className: "text-xs", children: [
                    "Owned by",
                    " ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono ml-1 truncate max-w-[80px]", children: nft.creatorId })
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
                        onClick: () => login(),
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
                    disabled: isClaiming || !actor || isFetching,
                    "data-ocid": "claim.claim_button",
                    children: isClaiming ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
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
