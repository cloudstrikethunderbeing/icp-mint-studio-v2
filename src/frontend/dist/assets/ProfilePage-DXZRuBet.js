import { c as createLucideIcon, d as useAuth, f as useQueryClient, g as useQuery, r as reactExports, z, j as jsxRuntimeExports, D as Diamond } from "./index-C9MKyHwp.js";
import { L as Label } from "./label-zgvlRdbO.js";
import { S as Skeleton } from "./skeleton-C6h9J8B3.js";
import { u as useMutation } from "./useMutation-TMkDmjUs.js";
import { C as Check, a as Copy } from "./copy-hToGQ4qr.js";
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
      d: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",
      key: "18etb6"
    }
  ],
  ["path", { d: "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4", key: "xoc0q4" }]
];
const Wallet = createLucideIcon("wallet", __iconNode);
function truncatePrincipal(pid) {
  if (pid.length <= 16) return pid;
  return `${pid.slice(0, 8)}...${pid.slice(-8)}`;
}
function ProfilePage() {
  const { isAuthenticated, principal, actor, identity } = useAuth();
  const fullPrincipalText = identity ? identity.getPrincipal().toText() : principal;
  const qc = useQueryClient();
  const canisterIdQuery = useQuery({
    queryKey: ["canisterId"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getCanisterId();
    },
    enabled: !!actor && isAuthenticated,
    staleTime: Number.POSITIVE_INFINITY
  });
  const slotsQuery = useQuery({
    queryKey: ["slotsStatus"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getSlotsStatus();
    },
    enabled: !!actor && isAuthenticated,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
  const profileQuery = useQuery({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getCallerProfile();
    },
    enabled: !!actor && isAuthenticated,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
  const creditsQuery = useQuery({
    queryKey: ["creditsStatus"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getCreditsStatus();
    },
    enabled: !!actor && isAuthenticated,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
  const allNftsQuery = useQuery({
    queryKey: ["allMyNfts"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.listMyNfts();
    },
    enabled: !!actor && isAuthenticated,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
  const profile = profileQuery.data;
  const credits = creditsQuery.data;
  const [oisyAddress, setOisyAddress] = reactExports.useState("");
  const [email, setEmail] = reactExports.useState("");
  const [principalCopied, setPrincipalCopied] = reactExports.useState(false);
  const [canisterCopied, setCanisterCopied] = reactExports.useState(false);
  const [_alerts, setAlerts] = reactExports.useState([]);
  const [profileInitialised, setProfileInitialised] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (profile && !profileInitialised) {
      setOisyAddress(profile.oisyWalletAddress ?? "");
      setEmail(profile.email ?? "");
      setAlerts(profile.emailAlerts ?? []);
      setProfileInitialised(true);
    }
  }, [profile, profileInitialised]);
  useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      await actor.setOisyWalletAddress(oisyAddress);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["callerProfile"] });
    },
    onError: (err) => {
      console.error("Oisy save failed:", err);
    }
  });
  useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      await actor.setEmail(email);
      await actor.sendVerificationEmail(email);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["callerProfile"] });
    },
    onError: (err) => {
      console.error("Email save failed:", err);
    }
  });
  !!((profile == null ? void 0 : profile.email) && profile.email.length > 0);
  const { resolvedTheme } = z();
  const logoSrc = resolvedTheme === "light" ? "/assets/logo-inverted.jpg" : "/assets/logo.jpg";
  if (!isAuthenticated) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4",
        "data-ocid": "profile.not_auth",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-3 mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "img",
              {
                src: logoSrc,
                alt: "ICP Mint Studio",
                className: "max-w-[280px] w-full mx-auto rounded-lg",
                "data-ocid": "profile.hero_logo"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Diamond, { className: "w-8 h-8 text-primary" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-foreground font-semibold text-lg text-center", children: "Please connect your Internet Identity to view your profile." })
        ]
      }
    );
  }
  const canisterIdDisplay = canisterIdQuery.isLoading ? null : canisterIdQuery.data && canisterIdQuery.data.trim().length > 0 ? canisterIdQuery.data : "Unavailable";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "max-w-lg mx-auto px-4 py-6 space-y-6",
      "data-ocid": "profile.page",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold text-foreground", children: "Profile" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "bg-card border border-border rounded-xl p-4 space-y-3",
            "data-ocid": "profile.identity_card",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground uppercase tracking-wide", children: "Canister ID" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "text-sm font-mono text-foreground break-all",
                    "data-ocid": "profile.canister_id",
                    children: canisterIdQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-5 w-3/4" }) : canisterIdDisplay
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground uppercase tracking-wide", children: "Creator ID" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "text-sm font-mono text-foreground",
                    "data-ocid": "profile.creator_id",
                    children: profileQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-5 w-1/2" }) : (profile == null ? void 0 : profile.creatorId) ?? "—"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground uppercase tracking-wide", children: "Principal ID" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: "text-sm font-mono text-foreground break-all",
                      "data-ocid": "profile.principal_id",
                      title: fullPrincipalText ?? void 0,
                      children: fullPrincipalText ? truncatePrincipal(fullPrincipalText) : /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-5 w-1/2" })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => {
                        if (fullPrincipalText) {
                          navigator.clipboard.writeText(fullPrincipalText);
                          setPrincipalCopied(true);
                          setTimeout(() => setPrincipalCopied(false), 2e3);
                        }
                      },
                      className: "shrink-0 text-xs text-primary hover:underline flex items-center gap-1",
                      "data-ocid": "profile.copy_principal_button",
                      children: principalCopied ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-3 h-3" }),
                        " Copied"
                      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-3 h-3" }),
                        " Copy"
                      ] })
                    }
                  )
                ] })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "bg-card border border-border rounded-xl p-4 space-y-2",
            "data-ocid": "profile.credits_card",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground uppercase tracking-wide", children: "NFT Slots" }),
              slotsQuery.isLoading || creditsQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-1/2" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-2/3" })
              ] }) : slotsQuery.data ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "p",
                {
                  className: "text-sm text-foreground",
                  "data-ocid": "profile.slots_status",
                  children: [
                    Number(slotsQuery.data.used),
                    " of ",
                    Number(slotsQuery.data.total),
                    " ",
                    "NFT slots used,",
                    " ",
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold text-primary", children: [
                      Number(slotsQuery.data.remaining),
                      " remaining"
                    ] })
                  ]
                }
              ) : credits ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "p",
                {
                  className: "text-sm text-foreground",
                  "data-ocid": "profile.credits_status",
                  children: [
                    Number(credits.used),
                    " of ",
                    Number(credits.total),
                    " NFTs used,",
                    " ",
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
                      Number(credits.remaining),
                      " remaining"
                    ] })
                  ]
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1 pt-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground uppercase tracking-wide", children: "Total NFTs Minted (Lifetime)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "text-sm text-foreground",
                    "data-ocid": "profile.total_minted",
                    children: allNftsQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-5 w-12" }) : allNftsQuery.data !== void 0 ? allNftsQuery.data.length : "—"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Includes all minted NFTs, including those that were burned or deleted." })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "bg-card border border-border rounded-xl p-4 space-y-3",
            "data-ocid": "profile.wallet_import_card",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-sm font-semibold text-foreground flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Wallet, { className: "w-4 h-4 text-primary" }),
                "Wallet Import"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Import this NFT collection into compatible ICP wallets using the Canister ID below." }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-muted-foreground", children: "NFT Canister ID" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 font-mono text-xs bg-muted/40 border border-border rounded-md px-3 py-2 text-foreground break-all", children: canisterIdQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-3/4" }) : canisterIdDisplay }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => {
                        if (canisterIdDisplay && canisterIdDisplay !== "Loading..." && canisterIdDisplay !== "Unavailable") {
                          navigator.clipboard.writeText(canisterIdDisplay);
                          setCanisterCopied(true);
                          setTimeout(() => setCanisterCopied(false), 2e3);
                        }
                      },
                      className: "shrink-0 text-xs text-primary hover:underline flex items-center gap-1",
                      "aria-label": "Copy canister ID",
                      "data-ocid": "profile.copy_canister_id_button",
                      children: canisterCopied ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-3 h-3" }),
                        " Copied"
                      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-3 h-3" }),
                        " Copy"
                      ] })
                    }
                  )
                ] })
              ] })
            ]
          }
        )
      ]
    }
  );
}
export {
  ProfilePage as default
};
