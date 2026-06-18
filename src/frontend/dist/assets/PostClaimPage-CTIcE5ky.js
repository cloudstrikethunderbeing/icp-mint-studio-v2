import { r as reactExports, j as jsxRuntimeExports, g as cn, b as useNavigate, u as useParams, E as ExternalBlob, S as Sparkles } from "./main-DYtxSk3m.js";
import { N as NftDetailModal } from "./NftDetailModal-0GnpvB7N.js";
import { B as Badge } from "./badge-MPBrSfN9.js";
import { C as Card, a as CardContent } from "./card-CFPt30Ot.js";
import { P as Primitive } from "./label-BClErHj4.js";
import { C as CircleCheck } from "./circle-check-BIfkbAZu.js";
import { W as Wallet } from "./wallet-B5Xvbipf.js";
import "./index-BWIET021.js";
import "./input-CSvdAEmI.js";
var NAME = "Separator";
var DEFAULT_ORIENTATION = "horizontal";
var ORIENTATIONS = ["horizontal", "vertical"];
var Separator$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { decorative, orientation: orientationProp = DEFAULT_ORIENTATION, ...domProps } = props;
  const orientation = isValidOrientation(orientationProp) ? orientationProp : DEFAULT_ORIENTATION;
  const ariaOrientation = orientation === "vertical" ? orientation : void 0;
  const semanticProps = decorative ? { role: "none" } : { "aria-orientation": ariaOrientation, role: "separator" };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Primitive.div,
    {
      "data-orientation": orientation,
      ...semanticProps,
      ...domProps,
      ref: forwardedRef
    }
  );
});
Separator$1.displayName = NAME;
function isValidOrientation(orientation) {
  return ORIENTATIONS.includes(orientation);
}
var Root = Separator$1;
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Root,
    {
      "data-slot": "separator",
      decorative,
      orientation,
      className: cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      ),
      ...props
    }
  );
}
function PostClaimPage() {
  var _a, _b;
  const navigate = useNavigate();
  const { claimToken } = useParams({ strict: false });
  const [modalOpen, setModalOpen] = reactExports.useState(false);
  const claimedNftSnapshot = reactExports.useMemo(() => {
    try {
      const raw = sessionStorage.getItem(`claim_success_${claimToken}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [claimToken]);
  const claimedNft = claimedNftSnapshot;
  reactExports.useEffect(() => {
    if (!claimedNft) {
      navigate({ to: "/collector" });
    }
  }, [claimedNft, navigate]);
  const minimalNft = reactExports.useMemo(() => {
    var _a2;
    if (!claimedNft) return null;
    const mockPrincipal = {
      toString: () => {
        var _a3;
        return ((_a3 = claimedNft.nftUniqueId) == null ? void 0 : _a3.split(":")[2]) ?? "";
      },
      toText: () => {
        var _a3;
        return ((_a3 = claimedNft.nftUniqueId) == null ? void 0 : _a3.split(":")[2]) ?? "";
      }
    };
    return {
      id: BigInt(claimedNft.id ?? 0),
      title: claimedNft.title,
      edition: claimedNft.edition,
      nftUniqueId: claimedNft.nftUniqueId,
      imageBlob: ExternalBlob.fromURL(
        claimedNft.imageUrl ?? ""
      ),
      ownerId: mockPrincipal,
      creatorId: ((_a2 = claimedNft.nftUniqueId) == null ? void 0 : _a2.split(":")[2]) ?? "",
      mintDate: 0n,
      description: "",
      businessName: "",
      website: "",
      discountCode: "",
      membershipId: "",
      rewardTier: "none",
      status: "active",
      auditHistory: [],
      assetHash: "",
      tags: [],
      collectionId: void 0
    };
  }, [claimedNft]);
  if (!claimedNft) return null;
  const imageUrl = claimedNft.imageUrl ?? "";
  function handleViewNft() {
    setModalOpen(true);
  }
  function handleGoToWallet() {
    navigate({ to: "/collector" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    minimalNft && /* @__PURE__ */ jsxRuntimeExports.jsx(
      NftDetailModal,
      {
        nft: minimalNft,
        open: modalOpen,
        onClose: () => setModalOpen(false),
        onDelete: () => {
        },
        onBurn: async () => {
        },
        callerPrincipal: ((_a = claimedNft.nftUniqueId) == null ? void 0 : _a.split(":")[2]) ?? "",
        canisterId: ((_b = claimedNft.nftUniqueId) == null ? void 0 : _b.split(":")[0]) ?? "",
        nftUniqueId: claimedNft.nftUniqueId,
        readOnly: true
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "min-h-[80vh] flex flex-col items-center justify-center px-4 py-10",
        "data-ocid": "post_claim.page",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-3 mb-8 text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-9 h-9 text-primary" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "h1",
                {
                  className: "text-2xl font-bold text-foreground",
                  "data-ocid": "post_claim.success_heading",
                  children: "NFT Claimed!"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "The NFT is now in your wallet." })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "w-full max-w-xs mb-8",
              "data-ocid": "post_claim.nft_preview_card",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "overflow-hidden", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "aspect-square bg-muted overflow-hidden", children: imageUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: imageUrl,
                    alt: claimedNft.title,
                    className: "w-full h-full object-cover",
                    loading: "eager"
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full h-full flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "w-10 h-10 text-muted-foreground" }) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-4 space-y-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold text-foreground truncate", children: claimedNft.title }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "secondary", className: "text-xs", children: [
                    "Edition ",
                    claimedNft.edition
                  ] }) })
                ] })
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, { className: "max-w-xs w-full mb-6" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "flex flex-col gap-3 w-full max-w-xs",
              "data-ocid": "post_claim.actions_section",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    className: "flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-accent transition-colors text-left cursor-pointer",
                    onClick: handleViewNft,
                    "data-ocid": "post_claim.view_nft_button",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "w-5 h-5 text-primary" }) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-foreground text-sm", children: "View NFT" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Open this NFT" })
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    className: "flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-accent transition-colors text-left cursor-pointer",
                    onClick: handleGoToWallet,
                    "data-ocid": "post_claim.go_to_wallet_button",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-lg bg-secondary/30 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Wallet, { className: "w-5 h-5 text-foreground" }) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-foreground text-sm", children: "My Library" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "View all NFTs" })
                      ] })
                    ]
                  }
                )
              ]
            }
          )
        ]
      }
    )
  ] });
}
export {
  PostClaimPage as default
};
