const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/NftDetailModal-D5xr3IuH.js","assets/main-uWazffZ2.js","assets/main-BxWkGiAi.css","assets/button-CB3kRgHi.js","assets/index-C0-7GMiu.js","assets/utils-CMIF0FGc.js","assets/index-EIV1jZGS.js","assets/input-Bqj3uixI.js","assets/label-DtNxXhAf.js","assets/wallet-2Bp4g2us.js","assets/external-link-Eqzux0iR.js","assets/trash-2-DN6tL3K9.js"])))=>i.map(i=>d[i]);
import { r as reactExports, J as usePublicNfts, d as devLog, n as jsxRuntimeExports, o as Sparkles, I as Link, K as LayoutGrid, m as resolveNftImageUrl, _ as __vitePreload } from "./main-uWazffZ2.js";
import { B as Button } from "./button-CB3kRgHi.js";
import { C as Card } from "./card-BQGFOPEv.js";
import { S as Skeleton } from "./skeleton-BJ9UnkWP.js";
import { S as ShieldCheck } from "./shield-check-DYJDZXnZ.js";
import { I as ImageOff } from "./image-off-Bd2NzVaS.js";
import { C as ChevronLeft, a as ChevronRight } from "./chevron-right-BZydCtDt.js";
import "./index-C0-7GMiu.js";
import "./utils-CMIF0FGc.js";
const NftDetailModal = reactExports.lazy(
  () => __vitePreload(() => import("./NftDetailModal-D5xr3IuH.js").then((n) => n.p), true ? __vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11]) : void 0).then((m) => ({
    default: m.NftDetailModal
  }))
);
const GALLERY_PAGE_SIZE = 12n;
function GalleryCard({
  nft,
  index,
  onOpen
}) {
  const imageUrl = resolveNftImageUrl(nft.imageBlob);
  const [imgError, setImgError] = reactExports.useState(false);
  const showImage = imageUrl !== "" && !imgError;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Card,
    {
      className: "group overflow-hidden border-border bg-card shadow-sm transition-shadow hover:shadow-md",
      "data-ocid": `gallery.item.${index + 1}`,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => onOpen(nft),
          className: "block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          "aria-label": `View ${nft.title || "NFT"} details`,
          "data-ocid": `gallery.open_button.${index + 1}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative aspect-square bg-muted", children: showImage ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "img",
              {
                src: imageUrl,
                alt: nft.title || "NFT artwork",
                className: "h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]",
                loading: "lazy",
                onError: () => setImgError(true)
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ImageOff, { className: "h-8 w-8", "aria-hidden": "true" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: "No image" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "price-strip", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "price-strip-label", children: "Price" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "price-strip-value",
                  "data-state": nft.priceUsd === void 0 ? "unlisted" : "listed",
                  "data-ocid": `gallery.price.${index + 1}`,
                  children: nft.priceUsd !== void 0 ? `$${nft.priceUsd.toString()}` : "Not for sale"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "h3",
              {
                className: "truncate font-display text-sm font-semibold text-foreground",
                title: nft.title,
                children: nft.title || "Untitled"
              }
            ) })
          ]
        }
      )
    }
  );
}
function GallerySkeleton() {
  const ids = Array.from(
    { length: Number(GALLERY_PAGE_SIZE) },
    (_, i) => `gallery-skeleton-${i}`
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4", children: ids.map((id) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "aspect-square w-full rounded-xl" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-3/4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3 w-1/3" })
  ] }, id)) });
}
function GalleryPage() {
  const [pageIndex, setPageIndex] = reactExports.useState(0);
  const [selectedNft, setSelectedNft] = reactExports.useState(null);
  const offset = BigInt(pageIndex) * GALLERY_PAGE_SIZE;
  const { data, isLoading, isError, refetch } = usePublicNfts(
    offset,
    GALLERY_PAGE_SIZE
  );
  const items = (data == null ? void 0 : data.items) ?? [];
  const total = (data == null ? void 0 : data.total) ?? 0n;
  const totalPages = Number(
    (total + GALLERY_PAGE_SIZE - 1n) / GALLERY_PAGE_SIZE
  );
  const hasPrev = pageIndex > 0;
  const hasNext = offset + GALLERY_PAGE_SIZE < total;
  devLog("[GALLERY] render:", {
    pageIndex,
    itemCount: items.length,
    total: total.toString()
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full", "data-ocid": "gallery.page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "section",
      {
        className: "border-b border-border bg-card",
        "data-ocid": "landing.hero_section",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto flex w-full max-w-5xl flex-col items-start gap-5 px-4 py-12 sm:py-16", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-3.5 w-3.5 text-accent", "aria-hidden": "true" }),
            "On-chain collectibles"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl", children: "Mint, claim, and collect NFTs on the Internet Computer." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-xl text-sm text-muted-foreground sm:text-base", children: "Browse the public collection below, then open the Studio to mint your own." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/studio", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                type: "button",
                className: "gap-2",
                "data-ocid": "landing.studio_cta_button",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4", "aria-hidden": "true" }),
                  "Open Studio"
                ]
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/how-it-works", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                type: "button",
                variant: "outline",
                className: "gap-2",
                "data-ocid": "landing.how_it_works_button",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-4 w-4", "aria-hidden": "true" }),
                  "How it works"
                ]
              }
            ) })
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        className: "mx-auto w-full max-w-5xl px-4 py-10",
        "data-ocid": "landing.gallery_section",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "mb-6 flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutGrid, { className: "h-5 w-5 text-accent", "aria-hidden": "true" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-display text-2xl font-bold tracking-tight text-foreground", children: "Gallery" })
          ] }),
          isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-ocid": "gallery.loading_state", children: /* @__PURE__ */ jsxRuntimeExports.jsx(GallerySkeleton, {}) }) : isError ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center",
              "data-ocid": "gallery.error_state",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ImageOff,
                  {
                    className: "h-8 w-8 text-muted-foreground",
                    "aria-hidden": "true"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "The gallery could not be loaded." }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    type: "button",
                    variant: "outline",
                    onClick: () => void refetch(),
                    "data-ocid": "gallery.retry_button",
                    children: "Retry"
                  }
                )
              ]
            }
          ) : items.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center",
              "data-ocid": "gallery.empty_state",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ImageOff,
                  {
                    className: "h-8 w-8 text-muted-foreground",
                    "aria-hidden": "true"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "No NFTs are available yet." })
              ]
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4", children: items.map((nft, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              GalleryCard,
              {
                nft,
                index,
                onOpen: setSelectedNft
              },
              nft.id.toString()
            )) }),
            totalPages > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 flex items-center justify-center gap-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  disabled: !hasPrev,
                  onClick: () => setPageIndex((p) => Math.max(0, p - 1)),
                  "data-ocid": "gallery.pagination_prev",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { className: "h-4 w-4", "aria-hidden": "true" }),
                    "Previous"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm text-muted-foreground", children: [
                "Page ",
                pageIndex + 1,
                " of ",
                totalPages
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  disabled: !hasNext,
                  onClick: () => setPageIndex((p) => p + 1),
                  "data-ocid": "gallery.pagination_next",
                  children: [
                    "Next",
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-4 w-4", "aria-hidden": "true" })
                  ]
                }
              )
            ] })
          ] })
        ]
      }
    ),
    selectedNft && /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: null, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      NftDetailModal,
      {
        nft: selectedNft,
        open: !!selectedNft,
        onClose: () => setSelectedNft(null),
        onDelete: () => {
        },
        onBurn: async () => {
        },
        callerPrincipal: "",
        canisterId: "",
        nftUniqueId: selectedNft.nftUniqueId,
        readOnly: true
      },
      selectedNft.nftUniqueId
    ) })
  ] });
}
export {
  GalleryPage as default
};
