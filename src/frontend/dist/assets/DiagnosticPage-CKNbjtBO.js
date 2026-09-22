import { c as createLucideIcon, b as useAuth, r as reactExports, m as useBackendHealth, n as useTotalNfts, o as useStorageUsage, j as useQuery, k as jsxRuntimeExports, L as LoaderCircle, R as RefreshCw, A as Activity, T as TriangleAlert, C as CircleX } from "./main-j-OIfsSZ.js";
import { L as Lock } from "./lock-BEydbYZQ.js";
import { S as ShieldCheck } from "./shield-check-BR4Aw-79.js";
import { C as CircleCheck } from "./circle-check-DJdfguhm.js";
import { D as Database } from "./database-CEiGGo8i.js";
import { H as HardDrive } from "./hard-drive-CIjujW0e.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  ["path", { d: "M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8", key: "18ogeb" }]
];
const Infinity = createLucideIcon("infinity", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["path", { d: "m3 17 2 2 4-4", key: "1jhpwq" }],
  ["path", { d: "m3 7 2 2 4-4", key: "1obspn" }],
  ["path", { d: "M13 6h8", key: "15sg57" }],
  ["path", { d: "M13 12h8", key: "h98zly" }],
  ["path", { d: "M13 18h8", key: "oe0vm4" }]
];
const ListChecks = createLucideIcon("list-checks", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M12 19h8", key: "baeox8" }],
  ["path", { d: "m4 17 6-6-6-6", key: "1yngyt" }]
];
const Terminal = createLucideIcon("terminal", __iconNode);
function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}
function formatCount(n) {
  return n.toLocaleString("en-US");
}
function DiagnosticPage() {
  const { actor } = useAuth();
  const [refreshing, setRefreshing] = reactExports.useState(false);
  const health = useBackendHealth();
  const totalNfts = useTotalNfts(true);
  const storageUsage = useStorageUsage(true);
  const integrity = useQuery({
    queryKey: ["stableStateIntegrity"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getStableStateIntegrity();
    },
    enabled: !!actor,
    staleTime: 3e4
  });
  const canisterId = useQuery({
    queryKey: ["diagnosticCanisterId"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getCanisterIdSafe();
    },
    enabled: !!actor,
    staleTime: Number.POSITIVE_INFINITY
  });
  const allNfts = useQuery({
    queryKey: ["diagnosticAllNfts"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.listAllNfts();
    },
    enabled: !!actor,
    staleTime: 3e4
  });
  const isLive = useQuery({
    queryKey: ["diagnosticIsLive"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.isLiveCanister();
    },
    enabled: !!actor,
    staleTime: Number.POSITIVE_INFINITY
  });
  const loading = health.status === "checking" || totalNfts.isLoading || storageUsage.isLoading || integrity.isLoading || canisterId.isLoading || allNfts.isLoading || isLive.isLoading;
  const nftCount = totalNfts.data ?? 0n;
  const hasNfts = nftCount > 0n;
  const status = hasNfts ? "healthy" : "warning";
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      totalNfts.refetch(),
      storageUsage.refetch(),
      integrity.refetch(),
      canisterId.refetch(),
      allNfts.refetch(),
      isLive.refetch()
    ]);
    setRefreshing(false);
  };
  const readouts = [
    {
      label: "TOTAL NFTs IN CATALOG",
      value: formatCount(nftCount),
      source: "live"
    },
    {
      label: "STORED DATA SIZE",
      value: formatBytes(storageUsage.data ?? 0n),
      source: "live"
    },
    {
      label: "CATALOG INTEGRITY",
      value: integrity.data ? `${formatCount(integrity.data.nftCount)} NFTs · ${formatCount(
        integrity.data.collectionCount
      )} collections` : "—",
      source: "live"
    },
    {
      label: "SNAPSHOT AVAILABILITY",
      value: "Requires CLI check",
      source: "codebase"
    },
    {
      label: "RECOVERABILITY STATUS",
      value: hasNfts ? "Catalog present" : "At risk — see report",
      source: "codebase"
    },
    {
      label: "BACKEND CANISTER",
      value: canisterId.data ? canisterId.data : "—",
      source: "live"
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto w-full max-w-3xl px-4 py-8 sm:px-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "mb-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground", children: "ICP Mint Studio" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-display text-3xl font-bold text-foreground", children: "NFT Catalog Health" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "span",
          {
            className: `status-pill ${status === "healthy" ? "status-pill-healthy" : "status-pill-warning"}`,
            "data-ocid": "diagnostic.status_pill",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: `status-dot ${status === "healthy" ? "status-dot-healthy" : "status-dot-warning"}`
                }
              ),
              status === "healthy" ? "All systems healthy" : "Catalog at risk"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground", children: "Read-only diagnostic of the NFT catalog. This view never modifies live canister data — it reports the current state so you can assess recoverability." })
    ] }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16",
        "data-ocid": "diagnostic.loading_state",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-7 w-7 animate-spin text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Reading catalog state..." })
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "section",
        {
          className: "mb-8",
          "aria-labelledby": "metrics-heading",
          "data-ocid": "diagnostic.metrics_section",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "h2",
                {
                  id: "metrics-heading",
                  className: "font-display text-lg font-semibold text-foreground",
                  children: "Catalog Metrics"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: handleRefresh,
                  disabled: refreshing,
                  className: "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60",
                  "data-ocid": "diagnostic.refresh_button",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      RefreshCw,
                      {
                        className: `h-4 w-4 ${refreshing ? "animate-spin" : ""}`
                      }
                    ),
                    "Refresh"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "diag-readout", children: readouts.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "diag-readout-row",
                "data-ocid": "diagnostic.readout_row",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "diag-readout-label", children: [
                    row.label,
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "span",
                      {
                        className: `ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${row.source === "live" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`,
                        title: row.source === "live" ? "Determined from the live canister read-only check" : "Determined from the codebase",
                        children: [
                          row.source === "live" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "h-3 w-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Terminal, { className: "h-3 w-3" }),
                          row.source
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "diag-readout-value", children: row.value })
                ]
              },
              row.label
            )) })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "section",
        {
          className: "mb-8",
          "aria-labelledby": "fix-heading",
          "data-ocid": "diagnostic.fix_verification_section",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "h2",
              {
                id: "fix-heading",
                className: "mb-3 font-display text-lg font-semibold text-foreground",
                children: "Fix Verification"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-card p-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Infinity, { className: "h-4 w-4 text-primary" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display text-sm font-semibold text-foreground", children: "Uncapped listing" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-xs leading-relaxed text-muted-foreground", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "rounded bg-muted px-1 py-0.5 font-mono text-xs", children: "listAllNfts()" }),
                  " ",
                  "returns every NFT with no hardcoded result cap."
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: `status-dot ${allNfts.data && allNfts.data.length === Number(nftCount) ? "status-dot-healthy" : "status-dot-warning"}`
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-sm text-foreground", children: allNfts.data ? `${formatCount(BigInt(allNfts.data.length))} of ${formatCount(
                    nftCount
                  )} NFTs returned` : "—" })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-card p-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ListChecks, { className: "h-4 w-4 text-primary" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display text-sm font-semibold text-foreground", children: "Additive mint guard" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs leading-relaxed text-muted-foreground", children: "The mint path is purely additive — it never clears or overwrites existing NFTs." }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "status-dot status-dot-healthy" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-sm text-foreground", children: "Guarded by guardMintAdditive" })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-card p-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "h-4 w-4 text-primary" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display text-sm font-semibold text-foreground", children: "Backend pinned to live ID" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-xs leading-relaxed text-muted-foreground", children: [
                  "The actor resolves to the pinned",
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "rounded bg-muted px-1 py-0.5 font-mono text-xs", children: "LIVE_CANISTER_ID" }),
                  "."
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: `status-dot ${isLive.data ? "status-dot-healthy" : "status-dot-error"}`
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-xs text-foreground", children: canisterId.data ? canisterId.data : "—" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: `ml-auto rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${isLive.data ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`,
                      children: isLive.data ? "live" : "not live"
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-card p-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-4 w-4 text-primary" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display text-sm font-semibold text-foreground", children: "Scales indefinitely" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-xs leading-relaxed text-muted-foreground", children: [
                  "No data-loss path exists at any catalog size — the catalog is a stable",
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "rounded bg-muted px-1 py-0.5 font-mono text-xs", children: "Map<Nat, Nft>" }),
                  " ",
                  "preserved by every migration."
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "status-dot status-dot-healthy" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-sm text-foreground", children: "No cap, no clear path" })
                ] })
              ] })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "section",
        {
          className: "mb-8",
          "aria-labelledby": "status-heading",
          "data-ocid": "diagnostic.status_section",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "h2",
              {
                id: "status-heading",
                className: "mb-3 font-display text-lg font-semibold text-foreground",
                children: "Status Definitions"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-success/30 bg-success/5 p-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "status-dot status-dot-healthy" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display text-sm font-semibold text-foreground", children: "Healthy" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs leading-relaxed text-muted-foreground", children: "NFTs are present in the catalog and the backend is reachable." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-warning/30 bg-warning/5 p-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "status-dot status-dot-warning" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display text-sm font-semibold text-foreground", children: "Warning" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs leading-relaxed text-muted-foreground", children: "The catalog reports zero NFTs — possible data loss that needs investigation." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-destructive/30 bg-destructive/5 p-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "status-dot status-dot-error" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display text-sm font-semibold text-foreground", children: "Error" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs leading-relaxed text-muted-foreground", children: "The backend is unreachable or resolved to the wrong canister." })
              ] })
            ] })
          ]
        }
      ),
      status === "warning" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "mb-8 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4",
          "data-ocid": "diagnostic.warning_banner",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mt-0.5 h-5 w-5 shrink-0 text-warning" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display text-sm font-semibold text-foreground", children: "Catalog appears empty" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm leading-relaxed text-muted-foreground", children: "The backend is reachable but reports zero NFTs in the catalog. This is the data-loss signal this diagnostic is designed to catch. Review the incident report below for the likely cause and recovery path." })
            ] })
          ]
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "mb-8 flex items-start gap-3 rounded-xl border border-success/40 bg-success/10 p-4",
          "data-ocid": "diagnostic.healthy_banner",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "mt-0.5 h-5 w-5 shrink-0 text-success" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display text-sm font-semibold text-foreground", children: "Catalog present and healthy" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-sm leading-relaxed text-muted-foreground", children: [
                formatCount(nftCount),
                " NFTs are stored in the catalog. No data-loss signal detected. The catalog is preserved in permanent canister storage and no app code clears it."
              ] })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "section",
        {
          className: "mb-8",
          "aria-labelledby": "incident-heading",
          "data-ocid": "diagnostic.incident_section",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "h2",
              {
                id: "incident-heading",
                className: "mb-3 font-display text-lg font-semibold text-foreground",
                children: "Incident Report"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-card p-5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-4 w-4 text-primary" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display text-sm font-semibold text-foreground", children: "Why the catalog is stored safely" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-sm leading-relaxed text-muted-foreground", children: [
                    "The NFT catalog lives in a stable",
                    " ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "rounded bg-muted px-1 py-0.5 font-mono text-xs", children: "Map<Nat, Nft>" }),
                    " ",
                    "in the canister's permanent storage. It is preserved by every migration, and the mint path is purely additive — it never clears or overwrites existing NFTs. No application code deletes the catalog."
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 flex items-start gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-4 w-4 text-warning" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display text-sm font-semibold text-foreground", children: "Most likely cause of disappearance" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm leading-relaxed text-muted-foreground", children: "If the catalog ever appears empty, the most likely cause is canister rotation or reinstall — the canister was replaced with a fresh instance that never received the stored data. This is an infrastructure event, not an app-code bug." })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 flex items-start gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "h-4 w-4 text-primary" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display text-sm font-semibold text-foreground", children: "Recovery path: canister snapshot restore" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-sm leading-relaxed text-muted-foreground", children: [
                    "If a canister snapshot exists on the live canister, the catalog can be recovered by restoring that snapshot. This requires operator access with the",
                    " ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "rounded bg-muted px-1 py-0.5 font-mono text-xs", children: "icp" }),
                    " ",
                    "CLI and cannot be performed from within this app."
                  ] })
                ] })
              ] })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "section",
        {
          "aria-labelledby": "next-heading",
          "data-ocid": "diagnostic.next_steps_section",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "h2",
              {
                id: "next-heading",
                className: "mb-3 font-display text-lg font-semibold text-foreground",
                children: "Next Steps"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-card p-5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "space-y-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary", children: "1" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-foreground", children: "Check live canister snapshots (operator CLI)" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-sm leading-relaxed text-muted-foreground", children: [
                      "Use the",
                      " ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "rounded bg-muted px-1 py-0.5 font-mono text-xs", children: "icp" }),
                      " ",
                      "CLI to list snapshots on the live canister. This check cannot be run from inside the app — it requires operator access."
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary", children: "2" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-foreground", children: "Restore from snapshot if one exists" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-sm leading-relaxed text-muted-foreground", children: "If a snapshot predating the disappearance exists, restore it to bring the full catalog back. This is an operator action you must authorize — the app never performs it." })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary", children: "3" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-foreground", children: "Re-mint if no snapshot exists" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-sm leading-relaxed text-muted-foreground", children: "If no usable snapshot is available, the catalog would need to be re-minted. The mint path is additive and safe, but this is a last resort after exhausting snapshot recovery." })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(HardDrive, { className: "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs leading-relaxed text-muted-foreground", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-foreground", children: "Honest limitation:" }),
                  " ",
                  "this diagnostic reports the catalog state it can read from the backend. It cannot list or restore canister snapshots — those actions require operator CLI access to the live canister and are intentionally not available in-app."
                ] })
              ] })
            ] })
          ]
        }
      )
    ] }),
    !loading && health.status === "unavailable" && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4",
        "data-ocid": "diagnostic.error_state",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "mt-0.5 h-5 w-5 shrink-0 text-destructive" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display text-sm font-semibold text-foreground", children: "Backend unavailable" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm leading-relaxed text-muted-foreground", children: health.reason })
          ] })
        ]
      }
    )
  ] });
}
export {
  DiagnosticPage as default
};
