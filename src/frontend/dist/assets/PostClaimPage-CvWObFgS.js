import { c as createLucideIcon, n as jsxRuntimeExports, r as reactExports, e as useNavigate, u as useParams, a2 as useNftDetailQuery, a3 as useMyReferralStatus, P as RewardType, a4 as ReferralBanner, o as Sparkles } from "./main-uWazffZ2.js";
import { N as NftDetailModal } from "./NftDetailModal-D5xr3IuH.js";
import { B as Button } from "./button-CB3kRgHi.js";
import { B as Badge } from "./badge-Cc0s_nFq.js";
import { C as Card, a as CardContent } from "./card-BQGFOPEv.js";
import { P as Primitive } from "./label-DtNxXhAf.js";
import { c as cn } from "./utils-CMIF0FGc.js";
import { C as CircleCheck } from "./circle-check-CFHntSQ7.js";
import { S as Share2 } from "./share-2-BH-Tw7HB.js";
import { W as Wallet } from "./wallet-2Bp4g2us.js";
import "./index-EIV1jZGS.js";
import "./input-Bqj3uixI.js";
import "./external-link-Eqzux0iR.js";
import "./trash-2-DN6tL3K9.js";
import "./index-C0-7GMiu.js";
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
      d: "M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z",
      key: "pff0z6"
    }
  ]
];
const Twitter = createLucideIcon("twitter", __iconNode);
const SHARE_BASE_URL = "https://icp-mint-studio-06n.caffeine.xyz";
const MENTION_HANDLE = "@JackBearSupply";
function buildIntentUrl(referralCode, text) {
  const shareUrl = `${SHARE_BASE_URL}/?ref=${encodeURIComponent(referralCode)}`;
  const params = new URLSearchParams({
    text,
    url: shareUrl
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}
function ShareOnXButton({
  referralCode,
  text,
  label = "Share on X",
  variant = "default",
  className
}) {
  const tweetText = text ?? `Just claimed an exclusive NFT on ICP Mint Studio ${MENTION_HANDLE} — use my referral link to get yours:`;
  const intentUrl = referralCode ? buildIntentUrl(referralCode, tweetText) : "";
  function handleClick() {
    if (!intentUrl) return;
    window.open(intentUrl, "_blank", "noopener,noreferrer");
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Button,
    {
      type: "button",
      variant,
      onClick: handleClick,
      disabled: !referralCode,
      className,
      "data-ocid": "referral.share_on_x_button",
      "aria-label": "Share your referral link on X",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Twitter, { className: "h-4 w-4" }),
        label
      ]
    }
  );
}
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
      if (raw) {
        sessionStorage.removeItem(`claim_success_${claimToken}`);
      }
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
  const { data: freshNftResult } = useNftDetailQuery(claimedNft == null ? void 0 : claimedNft.nftUniqueId);
  const { data: referralStatus } = useMyReferralStatus();
  const referralCode = (referralStatus == null ? void 0 : referralStatus.referralCode) ?? null;
  const minimalNft = reactExports.useMemo(() => {
    if (!claimedNft) return null;
    const fresh = freshNftResult ?? null;
    const build = fresh;
    return {
      id: (build == null ? void 0 : build.id) ?? BigInt(claimedNft.id ?? 0),
      title: (build == null ? void 0 : build.title) ?? claimedNft.title,
      edition: (build == null ? void 0 : build.edition) ?? claimedNft.edition,
      nftUniqueId: claimedNft.nftUniqueId,
      imageBlob: (build == null ? void 0 : build.imageBlob) ?? null,
      ownerId: (build == null ? void 0 : build.ownerId) ?? null,
      creatorId: (build == null ? void 0 : build.creatorId) ?? "",
      mintDate: (build == null ? void 0 : build.mintDate) ?? 0n,
      description: (build == null ? void 0 : build.description) ?? "",
      businessName: (build == null ? void 0 : build.businessName) ?? "",
      website: (build == null ? void 0 : build.website) ?? "",
      discountCode: (build == null ? void 0 : build.discountCode) ?? "",
      membershipId: (build == null ? void 0 : build.membershipId) ?? "",
      rewardTier: (build == null ? void 0 : build.rewardTier) ?? "none",
      status: (build == null ? void 0 : build.status) ?? "active",
      auditHistory: (build == null ? void 0 : build.auditHistory) ?? [],
      assetHash: (build == null ? void 0 : build.assetHash) ?? "",
      tags: (build == null ? void 0 : build.tags) ?? [],
      collectionId: (build == null ? void 0 : build.collectionId) ?? void 0,
      claimedAt: (build == null ? void 0 : build.claimedAt) ?? void 0,
      supplyLimit: (build == null ? void 0 : build.supplyLimit) ?? 1n,
      referralThreshold: (build == null ? void 0 : build.referralThreshold) ?? 0n,
      rewardType: (build == null ? void 0 : build.rewardType) ?? RewardType.none
    };
  }, [claimedNft, freshNftResult]);
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
        imageUrl,
        readOnly: true
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "min-h-[80vh] flex flex-col items-center justify-center px-4 py-10",
        "data-ocid": "post_claim.page",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-3 mb-6 text-center", children: [
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
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full max-w-xs mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ReferralBanner, {}) }),
          referralCode && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "w-full max-w-xs mb-6 rounded-xl border border-border bg-card p-4 space-y-3",
              "data-ocid": "post_claim.share_section",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { className: "w-4 h-4 text-primary" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-foreground text-sm", children: "Share your referral link" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground leading-relaxed", children: "Refer collectors to earn a bonus NFT. Your code never expires." })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ShareOnXButton,
                  {
                    referralCode,
                    label: "Share on X",
                    className: "w-full"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase tracking-wide text-muted-foreground/70 shrink-0", children: "Code" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "code",
                    {
                      className: "text-xs font-mono text-foreground truncate min-w-0",
                      "data-ocid": "post_claim.referral_code",
                      children: referralCode
                    }
                  )
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "flex flex-col gap-3 w-full max-w-xs mb-6",
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
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, { className: "max-w-xs w-full mb-6" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "w-full max-w-xs",
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
          )
        ]
      }
    )
  ] });
}
export {
  PostClaimPage as default
};
