import { c as createLucideIcon, d as useQueryClient, j as jsxRuntimeExports, l as RefreshCw, m as Shield, C as CANISTERS, r as reactExports, a as useAuth, L as LoaderCircle, f as addNotification, X, n as CircleX } from "./main-BjOk3k__.js";
import { B as Badge } from "./badge-CmK_8d4Z.js";
import { B as Button } from "./button-B4CQ5ZgR.js";
import { S as Skeleton } from "./skeleton-B7T9qvbA.js";
import { p as useHealthMetrics, q as useTotalNfts, r as useActiveNfts, s as useClaimedNfts, t as useAvailableNfts, v as useTotalCollections, w as useTotalCreators, x as useTotalClaims, y as useMetricsCanisterId, z as useBackendBuildTimestamp, A as useStorageUsage, B as useMyPaymentProofs, C as useListPaymentProofs, D as useSubmitPaymentProof, E as useApprovePaymentProof, F as useRejectPaymentProof, G as useSetUserStripeProductId, k as useMutation } from "./useQueries-D2VJ19-u.js";
import { C as CircleAlert } from "./circle-alert-CIUuhC0e.js";
import { C as CircleCheck } from "./circle-check-dmuaA4k7.js";
import { L as Layers } from "./layers-BLPd79kR.js";
import { I as Input } from "./input-CDG-f14k.js";
import { C as Check, a as Copy, L as Label } from "./label-GF7z_Qlm.js";
import { u as useQuery } from "./useQuery-gZlIR-85.js";
import { B as BrandedAuthGate } from "./BrandedAuthGate-BTaRqNF3.js";
import { F as Fingerprint } from "./fingerprint-ChbQUGkn.js";
import { L as Lock } from "./lock-CIeggVkd.js";
import "./utils-CBQGxPqG.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$m = [
  [
    "path",
    {
      d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
      key: "169zse"
    }
  ]
];
const Activity = createLucideIcon("activity", __iconNode$m);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$l = [
  [
    "path",
    {
      d: "M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727",
      key: "yr8idg"
    }
  ]
];
const Bitcoin = createLucideIcon("bitcoin", __iconNode$l);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$k = [
  [
    "path",
    {
      d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",
      key: "hh9hay"
    }
  ],
  ["path", { d: "m3.3 7 8.7 5 8.7-5", key: "g66t2b" }],
  ["path", { d: "M12 22V12", key: "d0xqtd" }]
];
const Box = createLucideIcon("box", __iconNode$k);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$j = [
  [
    "path",
    {
      d: "M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",
      key: "lc1i9w"
    }
  ],
  ["path", { d: "m7 16.5-4.74-2.85", key: "1o9zyk" }],
  ["path", { d: "m7 16.5 5-3", key: "va8pkn" }],
  ["path", { d: "M7 16.5v5.17", key: "jnp8gn" }],
  [
    "path",
    {
      d: "M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",
      key: "8zsnat"
    }
  ],
  ["path", { d: "m17 16.5-5-3", key: "8arw3v" }],
  ["path", { d: "m17 16.5 4.74-2.85", key: "8rfmw" }],
  ["path", { d: "M17 16.5v5.17", key: "k6z78m" }],
  [
    "path",
    {
      d: "M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",
      key: "1xygjf"
    }
  ],
  ["path", { d: "M12 8 7.26 5.15", key: "1vbdud" }],
  ["path", { d: "m12 8 4.74-2.85", key: "3rx089" }],
  ["path", { d: "M12 13.5V8", key: "1io7kd" }]
];
const Boxes = createLucideIcon("boxes", __iconNode$j);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$i = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16", key: "c24i48" }],
  ["path", { d: "M18 17V9", key: "2bz60n" }],
  ["path", { d: "M13 17V5", key: "1frdt8" }],
  ["path", { d: "M8 17v-3", key: "17ska0" }]
];
const ChartColumn = createLucideIcon("chart-column", __iconNode$i);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$h = [
  ["path", { d: "M21.801 10A10 10 0 1 1 17 3.335", key: "yps3ct" }],
  ["path", { d: "m9 11 3 3L22 4", key: "1pflzl" }]
];
const CircleCheckBig = createLucideIcon("circle-check-big", __iconNode$h);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$g = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
];
const CircleHelp = createLucideIcon("circle-help", __iconNode$g);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$f = [["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }]];
const Circle = createLucideIcon("circle", __iconNode$f);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$e = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1", key: "tgr4d6" }],
  [
    "path",
    {
      d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
      key: "116196"
    }
  ],
  ["path", { d: "m9 14 2 2 4-4", key: "df797q" }]
];
const ClipboardCheck = createLucideIcon("clipboard-check", __iconNode$e);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$d = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
];
const Clock = createLucideIcon("clock", __iconNode$d);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$c = [
  ["rect", { width: "20", height: "14", x: "2", y: "5", rx: "2", key: "ynyp8z" }],
  ["line", { x1: "2", x2: "22", y1: "10", y2: "10", key: "1b3vmo" }]
];
const CreditCard = createLucideIcon("credit-card", __iconNode$c);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$b = [
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
  ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5", key: "1wlel7" }],
  ["path", { d: "M3 12A9 3 0 0 0 21 12", key: "mv7ke4" }]
];
const Database = createLucideIcon("database", __iconNode$b);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$a = [
  ["path", { d: "M12 15V3", key: "m9g1x1" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["path", { d: "m7 10 5 5 5-5", key: "brsn70" }]
];
const Download = createLucideIcon("download", __iconNode$a);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$9 = [
  [
    "path",
    {
      d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      key: "1nclc0"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
const Eye = createLucideIcon("eye", __iconNode$9);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$8 = [
  ["line", { x1: "22", x2: "2", y1: "12", y2: "12", key: "1y58io" }],
  [
    "path",
    {
      d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
      key: "oot6mr"
    }
  ],
  ["line", { x1: "6", x2: "6.01", y1: "16", y2: "16", key: "sgf278" }],
  ["line", { x1: "10", x2: "10.01", y1: "16", y2: "16", key: "1l4acy" }]
];
const HardDrive = createLucideIcon("hard-drive", __iconNode$8);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$7 = [
  ["path", { d: "M9 17H7A5 5 0 0 1 7 7h2", key: "8i5ue5" }],
  ["path", { d: "M15 7h2a5 5 0 1 1 0 10h-2", key: "1b9ql8" }],
  ["line", { x1: "8", x2: "16", y1: "12", y2: "12", key: "1jonct" }]
];
const Link2 = createLucideIcon("link-2", __iconNode$7);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$6 = [
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2", key: "48i651" }],
  ["line", { x1: "8", x2: "16", y1: "21", y2: "21", key: "1svkeh" }],
  ["line", { x1: "12", x2: "12", y1: "17", y2: "21", key: "vw1qmm" }]
];
const Monitor = createLucideIcon("monitor", __iconNode$6);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$5 = [
  [
    "path",
    {
      d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
      key: "1ffxy3"
    }
  ],
  ["path", { d: "m21.854 2.147-10.94 10.939", key: "12cjpa" }]
];
const Send = createLucideIcon("send", __iconNode$5);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$4 = [
  ["rect", { width: "14", height: "20", x: "5", y: "2", rx: "2", ry: "2", key: "1yt0o3" }],
  ["path", { d: "M12 18h.01", key: "mhygvu" }]
];
const Smartphone = createLucideIcon("smartphone", __iconNode$4);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$3 = [
  ["path", { d: "M7 20h10", key: "e6iznv" }],
  ["path", { d: "M10 20c5.5-2.5.8-6.4 3-10", key: "161w41" }],
  [
    "path",
    {
      d: "M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z",
      key: "9gtqwd"
    }
  ],
  [
    "path",
    {
      d: "M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z",
      key: "bkxnd2"
    }
  ]
];
const Sprout = createLucideIcon("sprout", __iconNode$3);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  ["rect", { width: "16", height: "20", x: "4", y: "2", rx: "2", ry: "2", key: "76otgf" }],
  ["line", { x1: "12", x2: "12.01", y1: "18", y2: "18", key: "1dp563" }]
];
const Tablet = createLucideIcon("tablet", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["path", { d: "M10 15H6a4 4 0 0 0-4 4v2", key: "1nfge6" }],
  ["path", { d: "m14.305 16.53.923-.382", key: "1itpsq" }],
  ["path", { d: "m15.228 13.852-.923-.383", key: "eplpkm" }],
  ["path", { d: "m16.852 12.228-.383-.923", key: "13v3q0" }],
  ["path", { d: "m16.852 17.772-.383.924", key: "1i8mnm" }],
  ["path", { d: "m19.148 12.228.383-.923", key: "1q8j1v" }],
  ["path", { d: "m19.53 18.696-.382-.924", key: "vk1qj3" }],
  ["path", { d: "m20.772 13.852.924-.383", key: "n880s0" }],
  ["path", { d: "m20.772 16.148.924.383", key: "1g6xey" }],
  ["circle", { cx: "18", cy: "15", r: "3", key: "gjjjvw" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
];
const UserCog = createLucideIcon("user-cog", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
];
const Users = createLucideIcon("users", __iconNode);
function MetricCard({ icon, label, value, subValue, accent }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `bg-card border border-border rounded-xl p-4 flex flex-col gap-2 transition-smooth hover:border-primary/30 hover:shadow-subtle ${accent ? "ring-1 ring-primary/20" : ""}`,
      "data-ocid": "health.metric_card",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary", children: icon }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium uppercase tracking-wider", children: label })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-bold text-foreground font-display", children: value }),
          subValue && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-0.5", children: subValue })
        ] })
      ]
    }
  );
}
function MetricSkeleton() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-xl p-4 flex flex-col gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "w-8 h-8 rounded-lg" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3 w-20" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-8 w-16 mt-1" })
  ] });
}
function formatNumber(n) {
  if (n === void 0) return "—";
  const num = typeof n === "bigint" ? Number(n) : n;
  return num.toLocaleString();
}
function formatBytes(bytes) {
  if (bytes === void 0) return "—";
  const b = Number(bytes);
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / k ** i).toFixed(2)} ${sizes[i]}`;
}
function formatTimestamp(ts) {
  if (ts === void 0) return "—";
  const ms = Number(ts) / 1e6;
  return new Date(ms).toLocaleString();
}
function HealthTab() {
  const queryClient = useQueryClient();
  const health = useHealthMetrics(true);
  const totalNfts = useTotalNfts(true);
  const activeNfts = useActiveNfts(true);
  const claimedNfts = useClaimedNfts(true);
  const availableNfts = useAvailableNfts(true);
  const totalCollections = useTotalCollections(true);
  const totalCreators = useTotalCreators(true);
  const totalClaims = useTotalClaims(true);
  const canisterId = useMetricsCanisterId(true);
  const backendBuildTimestamp = useBackendBuildTimestamp(true);
  const storageUsage = useStorageUsage(true);
  const isLoading = health.isLoading || totalNfts.isLoading || activeNfts.isLoading || claimedNfts.isLoading || availableNfts.isLoading || totalCollections.isLoading || totalCreators.isLoading || totalClaims.isLoading || canisterId.isLoading || backendBuildTimestamp.isLoading || storageUsage.isLoading;
  const isError = health.isError && totalNfts.isError && activeNfts.isError && claimedNfts.isError && availableNfts.isError && totalCollections.isError && totalCreators.isError && totalClaims.isError && canisterId.isError && backendBuildTimestamp.isError && storageUsage.isError;
  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["healthMetrics"] });
    queryClient.invalidateQueries({ queryKey: ["totalNfts"] });
    queryClient.invalidateQueries({ queryKey: ["activeNfts"] });
    queryClient.invalidateQueries({ queryKey: ["claimedNfts"] });
    queryClient.invalidateQueries({ queryKey: ["availableNfts"] });
    queryClient.invalidateQueries({ queryKey: ["totalCollections"] });
    queryClient.invalidateQueries({ queryKey: ["totalCreators"] });
    queryClient.invalidateQueries({ queryKey: ["totalClaims"] });
    queryClient.invalidateQueries({ queryKey: ["metricsCanisterId"] });
    queryClient.invalidateQueries({ queryKey: ["backendBuildTimestamp"] });
    queryClient.invalidateQueries({ queryKey: ["storageUsage"] });
  }
  if (isError) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center justify-center py-12 gap-3",
        "data-ocid": "health.error_state",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-12 h-12 text-destructive" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground", children: "Failed to load health metrics" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground text-center max-w-xs", children: "There was a problem fetching the latest metrics from the backend." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              type: "button",
              variant: "outline",
              size: "sm",
              onClick: handleRefresh,
              "data-ocid": "health.retry_button",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 mr-2" }),
                " Retry"
              ]
            }
          )
        ]
      }
    );
  }
  const metrics = health.data;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", "data-ocid": "health.panel", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-4 h-4 text-primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold text-foreground", children: "System Health" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Badge,
          {
            variant: "outline",
            className: "text-[10px] gap-1",
            "data-ocid": "health.status_badge",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-3 h-3 text-green-500" }),
              "Live"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            type: "button",
            variant: "outline",
            size: "sm",
            className: "h-8 text-xs",
            onClick: handleRefresh,
            disabled: isLoading,
            "data-ocid": "health.refresh_button",
            children: [
              isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 animate-spin mr-1" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 mr-1" }),
              "Refresh"
            ]
          }
        )
      ] })
    ] }),
    isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(MetricSkeleton, {}, "skeleton-a"),
      /* @__PURE__ */ jsxRuntimeExports.jsx(MetricSkeleton, {}, "skeleton-b"),
      /* @__PURE__ */ jsxRuntimeExports.jsx(MetricSkeleton, {}, "skeleton-c"),
      /* @__PURE__ */ jsxRuntimeExports.jsx(MetricSkeleton, {}, "skeleton-d"),
      /* @__PURE__ */ jsxRuntimeExports.jsx(MetricSkeleton, {}, "skeleton-e"),
      /* @__PURE__ */ jsxRuntimeExports.jsx(MetricSkeleton, {}, "skeleton-f"),
      /* @__PURE__ */ jsxRuntimeExports.jsx(MetricSkeleton, {}, "skeleton-g"),
      /* @__PURE__ */ jsxRuntimeExports.jsx(MetricSkeleton, {}, "skeleton-h"),
      /* @__PURE__ */ jsxRuntimeExports.jsx(MetricSkeleton, {}, "skeleton-i"),
      /* @__PURE__ */ jsxRuntimeExports.jsx(MetricSkeleton, {}, "skeleton-j")
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MetricCard,
        {
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { className: "w-4 h-4" }),
          label: "Total NFTs",
          value: formatNumber((metrics == null ? void 0 : metrics.totalNfts) ?? totalNfts.data),
          accent: true
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MetricCard,
        {
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-4 h-4" }),
          label: "Active NFTs",
          value: formatNumber((metrics == null ? void 0 : metrics.activeNfts) ?? activeNfts.data)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MetricCard,
        {
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "w-4 h-4" }),
          label: "Claimed NFTs",
          value: formatNumber((metrics == null ? void 0 : metrics.claimedNfts) ?? claimedNfts.data)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MetricCard,
        {
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { className: "w-4 h-4" }),
          label: "Available NFTs",
          value: formatNumber((metrics == null ? void 0 : metrics.availableNfts) ?? availableNfts.data)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MetricCard,
        {
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "w-4 h-4" }),
          label: "Total Collections",
          value: formatNumber(
            (metrics == null ? void 0 : metrics.totalCollections) ?? totalCollections.data
          )
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MetricCard,
        {
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "w-4 h-4" }),
          label: "Total Creators",
          value: formatNumber((metrics == null ? void 0 : metrics.totalCreators) ?? totalCreators.data)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MetricCard,
        {
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Boxes, { className: "w-4 h-4" }),
          label: "Total Claims",
          value: formatNumber((metrics == null ? void 0 : metrics.totalClaims) ?? totalClaims.data)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MetricCard,
        {
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "w-4 h-4" }),
          label: "Canister ID",
          value: (metrics == null ? void 0 : metrics.canisterId) ?? canisterId.data ?? "—",
          subValue: "Backend canister identifier"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MetricCard,
        {
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-4 h-4" }),
          label: "Build Timestamp",
          value: formatTimestamp(
            (metrics == null ? void 0 : metrics.backendBuildTimestamp) ?? backendBuildTimestamp.data
          ),
          subValue: "Last backend deployment"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MetricCard,
        {
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(HardDrive, { className: "w-4 h-4" }),
          label: "Storage Usage",
          value: formatBytes((metrics == null ? void 0 : metrics.storageUsage) ?? storageUsage.data),
          subValue: "Total canister storage"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground text-center", children: "Metrics are cached for 30 seconds. Click Refresh for the latest data." })
  ] });
}
function VersionIndicator() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 p-4 bg-muted/30 rounded-lg text-xs text-muted-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold mb-2", children: "Deployment Info" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      "Frontend: ",
      CANISTERS.frontend
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      "Backend: ",
      CANISTERS.backend
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      "Build: ",
      (/* @__PURE__ */ new Date()).toISOString()
    ] })
  ] });
}
function detectPlatform() {
  var _a;
  const ua = navigator.userAgent;
  const platform = ((_a = navigator.platform) == null ? void 0 : _a.toLowerCase()) ?? "";
  if (/iphone|ipad|ipod/i.test(ua) && !window.MSStream) {
    return "ios";
  }
  if (/android/i.test(ua)) return "android";
  if (/win32|win64|windows/i.test(platform) || /windows/i.test(ua))
    return "windows";
  if (/macintosh|mac os x/i.test(ua) || /macintel/i.test(platform))
    return "macos";
  return "other";
}
function InstallAppPrompt() {
  const [installState, setInstallState] = reactExports.useState(null);
  const deferredPromptRef = reactExports.useRef(
    null
  );
  const platform = detectPlatform();
  reactExports.useEffect(() => {
    const isInStandaloneMode = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    if (isInStandaloneMode) return;
    if (platform === "ios") {
      setInstallState({ kind: "ios" });
      return;
    }
    if (platform === "android") {
      setInstallState({ kind: "android" });
    } else if (platform === "windows" || platform === "macos") {
      setInstallState({ kind: "desktop" });
    } else {
      setInstallState({ kind: "other" });
    }
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      deferredPromptRef.current = e;
      setInstallState({
        kind: "prompt",
        prompt: () => {
          var _a;
          return (_a = deferredPromptRef.current) == null ? void 0 : _a.prompt();
        }
      });
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => setInstallState(null));
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, [platform]);
  if (!installState) return null;
  const platformLabel = platform === "ios" ? "iOS" : platform === "android" ? "Android" : platform === "windows" ? "Windows" : platform === "macos" ? "macOS" : "Your Device";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "bg-card border border-border rounded-xl p-4 space-y-3",
      "data-ocid": "install_app.card",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-sm font-semibold text-foreground flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-4 h-4 text-primary" }),
          "Install ICP Mint Studio"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
          "Add ICP Mint Studio to your home screen for a faster, app-like experience on ",
          platformLabel,
          "."
        ] }),
        installState.kind === "ios" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-muted/40 border border-border px-3 py-2.5 space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-foreground font-medium", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Smartphone, { className: "w-3.5 h-3.5 text-primary" }),
            "iOS / Safari"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "text-xs text-muted-foreground space-y-1 list-decimal list-inside", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              "Tap the",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono bg-muted px-1 rounded text-[10px]", children: "Share" }),
              " ",
              "button in Safari"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              "Scroll down and tap",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground font-medium", children: "Add to Home Screen" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              "Tap ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground font-medium", children: "Add" }),
              " to confirm"
            ] })
          ] })
        ] }),
        installState.kind === "android" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-muted/40 border border-border px-3 py-2.5 space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-foreground font-medium", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Smartphone, { className: "w-3.5 h-3.5 text-primary" }),
            "Android / Chrome"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "text-xs text-muted-foreground space-y-1 list-decimal list-inside", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              "Open the Chrome menu",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono bg-muted px-1 rounded text-[10px]", children: "⋮" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              "Tap",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground font-medium", children: "Add to Home Screen" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              "Tap ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground font-medium", children: "Add" }),
              " to confirm"
            ] })
          ] })
        ] }),
        installState.kind === "desktop" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-muted/40 border border-border px-3 py-2.5 space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-foreground font-medium", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Monitor, { className: "w-3.5 h-3.5 text-primary" }),
            platform === "windows" ? "Windows / Edge or Chrome" : "macOS / Chrome or Edge"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "text-xs text-muted-foreground space-y-1 list-decimal list-inside", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              "Look for the",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono bg-muted px-1 rounded text-[10px]", children: "⊕" }),
              " ",
              "install icon in the address bar"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              "Or open the menu",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono bg-muted px-1 rounded text-[10px]", children: "⋮" }),
              " ",
              "→",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground font-medium", children: "Install ICP Mint Studio" })
            ] })
          ] })
        ] }),
        installState.kind === "prompt" && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            type: "button",
            size: "sm",
            className: "w-full",
            onClick: () => {
              installState.prompt();
              setInstallState(null);
            },
            "data-ocid": "install_app.button",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-4 h-4 mr-2" }),
              "Install App"
            ]
          }
        ),
        installState.kind === "other" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-muted/40 border border-border px-3 py-2.5 space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-foreground font-medium", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tablet, { className: "w-3.5 h-3.5 text-primary" }),
            "PWA Install"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Open this app in Chrome or Edge, then use the browser menu to install it to your home screen." })
        ] })
      ]
    }
  );
}
const TIER_NAMES = {
  prod_UgpwDUBgXdz0K5: "Free",
  prod_UgpxVvHHogE6Qx: "Creator",
  prod_UgpyBkj4HK4A9V: "Pro",
  prod_Ugpy3x4LuFPxzf: "Org"
};
function getProofStatus(status) {
  if (typeof status === "object" && status !== null) {
    if ("pending" in status) return "pending";
    if ("approved" in status) return "approved";
  }
  return "rejected";
}
function truncateText(text, start = 10, end = 5) {
  if (text.length <= start + end + 3) return text;
  return `${text.slice(0, start)}...${text.slice(-end)}`;
}
const TIERS = [
  {
    key: "free",
    label: "Free",
    slots: "1 slot (1/1 NFT)",
    price: "$0 / mo",
    icon: "fa-seedling"
  },
  {
    key: "creator",
    label: "Creator",
    slots: "3 slots, 10 NFTs each",
    price: "$9 / mo",
    icon: "fa-pen-nib"
  },
  {
    key: "pro",
    label: "Pro",
    slots: "5 slots, 100 NFTs each",
    price: "$29 / mo",
    icon: "fa-rocket"
  },
  {
    key: "org",
    label: "Org",
    slots: "8 slots, 500 NFTs each",
    price: "$99 / mo",
    icon: "fa-building"
  }
];
function StripeStatusBadge({
  stripeStatus
}) {
  if (!stripeStatus) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Badge,
      {
        variant: "secondary",
        className: "gap-1 text-[10px]",
        "data-ocid": "settings.stripe_unavailable_badge",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleHelp, { className: "w-4 h-4 text-[8px]" }),
          " Status unavailable"
        ]
      }
    );
  }
  if (stripeStatus.configured && stripeStatus.mode === "live")
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Badge,
      {
        className: "bg-green-500/20 text-green-400 border-green-500/30 gap-1 text-[10px]",
        "data-ocid": "settings.stripe_live_badge",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Circle, { className: "w-4 h-4 text-[8px]" }),
          " Live"
        ]
      }
    );
  if (stripeStatus.configured && stripeStatus.mode === "test")
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Badge,
      {
        className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1 text-[10px]",
        "data-ocid": "settings.stripe_test_badge",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Circle, { className: "w-4 h-4 text-[8px]" }),
          " Test"
        ]
      }
    );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Badge,
    {
      variant: "secondary",
      className: "gap-1 text-[10px]",
      "data-ocid": "settings.stripe_disconnected_badge",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "w-4 h-4 text-[10px]" }),
        " Not Connected"
      ]
    }
  );
}
function CopyBtn({ value, ocid }) {
  const [copied, setCopied] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      onClick: () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2e3);
      },
      className: "ml-1 p-1 rounded hover:bg-accent",
      title: "Copy",
      "data-ocid": ocid,
      children: copied ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-3 h-3 text-green-500" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-3 h-3" })
    }
  );
}
function SettingsPage() {
  var _a, _b, _c;
  const [activeTab, setActiveTab] = reactExports.useState(
    "general"
  );
  const [principalCopied, setPrincipalCopied] = reactExports.useState(false);
  const { isAuthenticated, actor, principal, isAdmin, isAdminLoading } = useAuth();
  const queryClient = useQueryClient();
  reactExports.useEffect(() => {
    if (!isAdmin && (activeTab === "admin" || activeTab === "health"))
      setActiveTab("general");
  }, [isAdmin, activeTab]);
  const [secretKey, setSecretKey] = reactExports.useState("");
  const [publicKey, setPublicKey] = reactExports.useState("");
  const [showSk, setShowSk] = reactExports.useState(false);
  const [showPk, setShowPk] = reactExports.useState(false);
  const [stripeInlineSuccess, setStripeInlineSuccess] = reactExports.useState("");
  const [stripeInlineError, setStripeInlineError] = reactExports.useState("");
  const [savedSkPrefix, setSavedSkPrefix] = reactExports.useState("");
  const [savedPkPrefix, setSavedPkPrefix] = reactExports.useState("");
  const [keysSubmitted, setKeysSubmitted] = reactExports.useState(false);
  const [canisterIdCopied, setCanisterIdCopied] = reactExports.useState(false);
  const [collectionIdCopied, setCollectionIdCopied] = reactExports.useState(false);
  const [proofTxHash, setProofTxHash] = reactExports.useState("");
  const [proofError, setProofError] = reactExports.useState("");
  const [proofSuccess, setProofSuccess] = reactExports.useState("");
  const [proofNetwork, setProofNetwork] = reactExports.useState("icp");
  const [proofTier, setProofTier] = reactExports.useState("prod_UgpxVvHHogE6Qx");
  const [tierUserPrincipal, setTierUserPrincipal] = reactExports.useState("");
  const [tierProductId, setTierProductId] = reactExports.useState("prod_UgpwDUBgXdz0K5");
  const [tierAssignError, setTierAssignError] = reactExports.useState("");
  const [tierAssignSuccess, setTierAssignSuccess] = reactExports.useState("");
  const [rejectingId, setRejectingId] = reactExports.useState(null);
  const [rejectReason, setRejectReason] = reactExports.useState("");
  const profileQuery = useQuery({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getCallerProfile();
    },
    enabled: !!actor && isAuthenticated,
    staleTime: 30 * 1e3
  });
  const roleDisplay = isAdmin ? "Master Admin" : "Creator";
  const subscriptionDisplay = TIER_NAMES[((_a = profileQuery.data) == null ? void 0 : _a.stripeProductId) ?? ""] || "Free";
  const canisterIdQuery = useQuery({
    queryKey: ["canisterId"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getCanisterId();
    },
    enabled: !!actor && isAuthenticated,
    staleTime: Number.POSITIVE_INFINITY
  });
  const FALLBACK_CANISTER_ID = "4j4fw-fyaaa-aaaah-argua-cai";
  const canisterIdDisplay = (() => {
    var _a2, _b2;
    if (canisterIdQuery.isLoading) return "Loading...";
    const actorId = (_a2 = canisterIdQuery.data) == null ? void 0 : _a2.trim();
    if (actorId && actorId.length > 0) return actorId;
    const envId = (_b2 = CANISTERS.backend) == null ? void 0 : _b2.trim();
    if (envId && envId.length > 0) return envId;
    return FALLBACK_CANISTER_ID;
  })();
  const effectiveCanisterId = ((_b = canisterIdQuery.data) == null ? void 0 : _b.trim()) || ((_c = CANISTERS.backend) == null ? void 0 : _c.trim()) || FALLBACK_CANISTER_ID;
  const collectionIdQuery = useQuery({
    queryKey: ["collectionId"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      const result = await actor.getCollectionId();
      return result;
    },
    enabled: !!actor && isAuthenticated,
    staleTime: Number.POSITIVE_INFINITY
  });
  const myProofsQuery = useMyPaymentProofs(principal);
  const listProofsQuery = useListPaymentProofs(isAdmin);
  const submitPaymentProof = useSubmitPaymentProof();
  const approvePaymentProof = useApprovePaymentProof();
  const rejectPaymentProof = useRejectPaymentProof();
  const setUserStripeProductId = useSetUserStripeProductId();
  const stripeStatusQuery = useQuery({
    queryKey: ["stripeStatus"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getStripeStatus();
    },
    enabled: !!actor && isAuthenticated,
    staleTime: 30 * 1e3
  });
  const stripeMutation = useMutation({
    mutationFn: async ({
      secretKey: secretKey2,
      publicKey: publicKey2
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.setStripeConfiguration(secretKey2, publicKey2);
    },
    onSuccess: () => {
      setStripeInlineSuccess("Stripe keys saved successfully.");
      setStripeInlineError("");
      setKeysSubmitted(true);
      const skPrefix = secretKey.slice(0, secretKey.lastIndexOf("_") + 1);
      const pkPrefix = publicKey.slice(0, publicKey.lastIndexOf("_") + 1);
      setSavedSkPrefix(skPrefix);
      setSavedPkPrefix(pkPrefix);
      setSecretKey("");
      setPublicKey("");
      queryClient.invalidateQueries({ queryKey: ["stripeStatus"] });
    },
    onError: (err) => {
      setStripeInlineError(err.message || "Failed to save Stripe keys.");
      setStripeInlineSuccess("");
    }
  });
  const handleStripeSave = () => {
    setStripeInlineSuccess("");
    setStripeInlineError("");
    if (!secretKey.trim() || !publicKey.trim()) {
      setStripeInlineError("Both Secret Key and Public Key are required.");
      return;
    }
    stripeMutation.mutate({
      secretKey: secretKey.trim(),
      publicKey: publicKey.trim()
    });
  };
  if (!isAuthenticated) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(BrandedAuthGate, { subtitle: "Connect to access settings." });
  }
  const stripeStatusData = stripeStatusQuery.isError ? null : stripeStatusQuery.data;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "max-w-lg mx-auto px-4 py-6 space-y-5",
      "data-ocid": "settings.page",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold text-foreground", children: "Settings" }),
        isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", "data-ocid": "settings.tab_switcher", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setActiveTab("general"),
              className: `flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === "general" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`,
              "data-ocid": "settings.general_tab",
              children: "General"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setActiveTab("admin"),
              className: `flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === "admin" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`,
              "data-ocid": "settings.admin_tab",
              children: "Admin"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setActiveTab("health"),
              className: `flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === "health" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`,
              "data-ocid": "settings.health_tab",
              children: "Health"
            }
          )
        ] }),
        !isAdmin || activeTab === "general" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", "data-ocid": "settings.general_panel", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "bg-card border border-border rounded-xl p-4 flex items-center justify-between",
              "data-ocid": "settings.tier_badge_card",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "w-4 h-4 text-primary" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Current Plan" }),
                    isAdminLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-muted-foreground animate-pulse", children: "Loading..." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-semibold", children: isAdmin ? "Master Admin" : roleDisplay }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: isAdmin ? "Admin" : subscriptionDisplay })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Badge,
                  {
                    className: `text-[10px] ${isAdmin ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-primary/20 text-primary border-primary/30"}`,
                    "data-ocid": "settings.tier_badge",
                    children: isAdmin ? "Master Admin" : subscriptionDisplay
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "bg-card border border-border rounded-xl p-4 space-y-3",
              "data-ocid": "settings.principal_card",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-sm font-semibold text-foreground flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Fingerprint, { className: "w-4 h-4 text-primary" }),
                  "Login Principal ID"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Your unique Internet Identity principal. Used for ownership verification and wallet imports." }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 font-mono text-xs bg-muted/40 border border-border rounded-md px-3 py-2 text-foreground break-all", children: principal ?? "Not connected" }),
                  principal && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => {
                        navigator.clipboard.writeText(principal);
                        setPrincipalCopied(true);
                        setTimeout(() => setPrincipalCopied(false), 2e3);
                      },
                      className: "shrink-0 text-xs text-primary hover:underline flex items-center gap-1",
                      "aria-label": "Copy principal ID",
                      "data-ocid": "settings.copy_principal_button",
                      children: principalCopied ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-4 h-4 text-green-500" }),
                        " ",
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-green-500", children: "Copied" })
                      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-4 h-4 text-[10px]" }),
                        " Copy"
                      ] })
                    }
                  )
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "bg-card border border-border rounded-xl p-4 space-y-3",
              "data-ocid": "settings.discovery_card",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-sm font-semibold text-foreground flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Fingerprint, { className: "w-4 h-4 text-primary" }),
                  "NFT Collection Discovery"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Use these identifiers to import or discover your NFT collection in compatible ICP wallets (OISY, Plug, Stoic, NFID Wallet, etc.). The Canister ID identifies where NFTs are stored. The Collection ID identifies the logical grouping inside the canister." }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-muted-foreground", children: "NFT Canister ID" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 font-mono text-xs bg-muted/40 border border-border rounded-md px-3 py-2 text-foreground break-all", children: canisterIdDisplay }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            {
                              navigator.clipboard.writeText(effectiveCanisterId);
                              setCanisterIdCopied(true);
                              setTimeout(() => setCanisterIdCopied(false), 2e3);
                            }
                          },
                          className: "shrink-0 text-xs text-primary hover:underline flex items-center gap-1",
                          "aria-label": "Copy canister ID",
                          "data-ocid": "settings.copy_canister_id_button",
                          children: canisterIdCopied ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-4 h-4 text-[10px]" }),
                            " Copied"
                          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-4 h-4 text-[10px]" }),
                            " Copy"
                          ] })
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-muted-foreground", children: "Collection ID" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 font-mono text-xs bg-muted/40 border border-border rounded-md px-3 py-2 text-foreground break-all", children: collectionIdQuery.isLoading ? "Loading..." : collectionIdQuery.data ?? "N/A" }),
                      collectionIdQuery.data && collectionIdQuery.data !== "N/A" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            const cid = collectionIdQuery.data ?? "";
                            if (cid) {
                              navigator.clipboard.writeText(cid);
                              setCollectionIdCopied(true);
                              setTimeout(
                                () => setCollectionIdCopied(false),
                                2e3
                              );
                            }
                          },
                          className: "shrink-0 text-xs text-primary hover:underline flex items-center gap-1",
                          "aria-label": "Copy collection ID",
                          "data-ocid": "settings.copy_collection_id_button",
                          children: collectionIdCopied ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-4 h-4 text-[10px]" }),
                            " Copied"
                          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-4 h-4 text-[10px]" }),
                            " Copy"
                          ] })
                        }
                      )
                    ] })
                  ] })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "bg-card border border-border rounded-xl p-4 space-y-3",
              "data-ocid": "settings.tiers_card",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-sm font-semibold text-foreground flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "w-4 h-4 text-primary" }),
                  "Subscription Tiers"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-3", children: TIERS.map((tier, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "border border-border rounded-lg p-3 space-y-1 relative hover:border-primary/40 transition-colors duration-200",
                    "data-ocid": `settings.tier_card.${i + 1}`,
                    children: [
                      tier.key === subscriptionDisplay.toLowerCase() && /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Badge,
                        {
                          variant: "secondary",
                          className: "absolute top-2 right-2 text-[10px] px-1 py-0",
                          children: "Current"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Sprout, { className: "w-4 h-4 text-primary" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-foreground", children: tier.label })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: tier.slots }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-accent font-medium", children: tier.price })
                    ]
                  },
                  tier.key
                )) })
              ]
            }
          ),
          isAuthenticated && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "bg-card border border-border rounded-xl p-4 space-y-4",
              "data-ocid": "settings.payment_proof_card",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-sm font-semibold text-foreground flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Bitcoin, { className: "w-4 h-4 text-primary" }),
                  "Pay with ICP or ckBTC"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Send ICP or ckBTC to the admin wallet, then submit your payment proof below. An admin will verify the transaction and assign your subscription tier." }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-medium text-foreground", children: "Your Submissions" }),
                  myProofsQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground animate-pulse", children: "Loading..." }) : !myProofsQuery.data || myProofsQuery.data.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "No payment proofs submitted yet." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: myProofsQuery.data.slice(0, 5).map((proof, idx) => {
                    const status = getProofStatus(proof.status);
                    const statusColors = {
                      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                      approved: "bg-green-500/20 text-green-400 border-green-500/30",
                      rejected: "bg-red-500/20 text-red-400 border-red-500/30"
                    };
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        className: "flex items-center justify-between rounded-lg bg-muted/40 border border-border px-3 py-2",
                        "data-ocid": `settings.my_proof_item.${idx + 1}`,
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-mono text-foreground truncate", children: truncateText(proof.txHash) }),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-muted-foreground", children: [
                              TIER_NAMES[proof.tierRequested] || proof.tierRequested,
                              " ",
                              "·",
                              " ",
                              new Date(
                                Number(proof.submittedAt) / 1e6
                              ).toLocaleDateString()
                            ] })
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            Badge,
                            {
                              className: `${statusColors[status]} text-[10px] shrink-0 ml-2`,
                              children: status
                            }
                          )
                        ]
                      },
                      proof.id ?? idx
                    );
                  }) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-medium text-foreground", children: "Submit New Proof" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-muted-foreground", children: "Principal" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Input,
                      {
                        value: principal ?? "",
                        readOnly: true,
                        className: "font-mono text-xs bg-muted/40",
                        "data-ocid": "settings.proof_principal_input"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-muted-foreground", children: "Transaction Hash" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Input,
                      {
                        value: proofTxHash,
                        onChange: (e) => {
                          setProofTxHash(e.target.value);
                          setProofError("");
                        },
                        placeholder: "Enter transaction hash",
                        className: "font-mono text-xs",
                        autoComplete: "off",
                        "data-ocid": "settings.proof_txhash_input"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-muted-foreground", children: "Network" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "select",
                      {
                        value: proofNetwork,
                        onChange: (e) => setProofNetwork(e.target.value),
                        className: "w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground",
                        "data-ocid": "settings.proof_network_select",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "icp", children: "ICP" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "ckbtc", children: "ckBTC" })
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-muted-foreground", children: "Tier Requested" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "select",
                      {
                        value: proofTier,
                        onChange: (e) => setProofTier(e.target.value),
                        className: "w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground",
                        "data-ocid": "settings.proof_tier_select",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "prod_UgpxVvHHogE6Qx", children: "Creator — 3 slots / 10 NFTs each" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "prod_UgpyBkj4HK4A9V", children: "Pro — 5 slots / 100 NFTs each" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "prod_Ugpy3x4LuFPxzf", children: "Org — 8 slots / 500 NFTs each" })
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      type: "button",
                      onClick: () => {
                        setProofError("");
                        setProofSuccess("");
                        if (!proofTxHash.trim()) {
                          setProofError("Transaction hash is required.");
                          return;
                        }
                        submitPaymentProof.mutate(
                          {
                            txHash: proofTxHash.trim(),
                            tierRequested: proofTier,
                            networkType: proofNetwork
                          },
                          {
                            onSuccess: () => {
                              setProofSuccess(
                                "Payment proof submitted. Awaiting admin review."
                              );
                              setProofTxHash("");
                              setProofNetwork("icp");
                              setProofTier("prod_UgpxVvHHogE6Qx");
                            },
                            onError: (err) => {
                              setProofError(
                                err.message || "Failed to submit payment proof."
                              );
                            }
                          }
                        );
                      },
                      disabled: submitPaymentProof.isPending || !proofTxHash.trim(),
                      size: "sm",
                      className: "w-full",
                      "data-ocid": "settings.proof_submit_button",
                      children: submitPaymentProof.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 animate-spin mr-2" }),
                        "Submitting..."
                      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "w-4 h-4 mr-2" }),
                        "Submit Proof"
                      ] })
                    }
                  ),
                  proofError && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "p",
                    {
                      className: "text-xs text-destructive",
                      "data-ocid": "settings.proof_error_state",
                      children: proofError
                    }
                  ),
                  proofSuccess && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "p",
                    {
                      className: "text-xs text-green-600",
                      "data-ocid": "settings.proof_success_state",
                      children: proofSuccess
                    }
                  )
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(InstallAppPrompt, {})
        ] }) : isAdmin && activeTab === "admin" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", "data-ocid": "settings.admin_panel", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "bg-card border border-border rounded-xl p-4 space-y-3",
              "data-ocid": "settings.claim_link_manager_card",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-sm font-semibold text-foreground flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { className: "w-4 h-4 text-primary" }),
                  "Claim Link Manager"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Generate shareable claim links from individual NFT cards." }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-muted/40 border border-border px-3 py-2.5 flex items-start gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { className: "w-3.5 h-3.5 text-primary mt-0.5 shrink-0" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
                    "To generate a claim link, open any NFT from the main view and use the",
                    " ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground font-medium", children: "Claim Link" }),
                    " ",
                    "section."
                  ] })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "bg-card border border-border rounded-xl p-4 space-y-4",
              "data-ocid": "settings.tier_assignment_card",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-sm font-semibold text-foreground flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(UserCog, { className: "w-4 h-4 text-primary" }),
                  "Manual Tier Assignment"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Assign a Stripe product tier to a user principal. This is the manual fallback until automated Stripe webhooks are enabled." }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-muted-foreground", children: "User Principal ID" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Input,
                      {
                        value: tierUserPrincipal,
                        onChange: (e) => {
                          setTierUserPrincipal(e.target.value);
                          setTierAssignError("");
                          setTierAssignSuccess("");
                        },
                        placeholder: "e.g. rdmx6-jaaaa-aaaah-qcaiq-cai",
                        className: "font-mono text-xs",
                        autoComplete: "off",
                        "data-ocid": "settings.tier_user_principal_input"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-muted-foreground", children: "Stripe Product / Tier" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "select",
                      {
                        value: tierProductId,
                        onChange: (e) => setTierProductId(e.target.value),
                        className: "w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground",
                        "data-ocid": "settings.tier_product_select",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "prod_UgpwDUBgXdz0K5", children: "Free — 1 slot / 1 NFT" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "prod_UgpxVvHHogE6Qx", children: "Creator — 3 slots / 10 NFTs each" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "prod_UgpyBkj4HK4A9V", children: "Pro — 5 slots / 100 NFTs each" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "prod_Ugpy3x4LuFPxzf", children: "Org — 8 slots / 500 NFTs each" })
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      type: "button",
                      onClick: () => {
                        setTierAssignError("");
                        setTierAssignSuccess("");
                        if (!tierUserPrincipal.trim()) {
                          setTierAssignError("User Principal ID is required.");
                          return;
                        }
                        const tierName = TIER_NAMES[tierProductId] || tierProductId;
                        setUserStripeProductId.mutate(
                          {
                            userPrincipal: tierUserPrincipal.trim(),
                            productId: tierProductId
                          },
                          {
                            onSuccess: () => {
                              setTierAssignSuccess("Tier assigned successfully.");
                              setTierUserPrincipal("");
                              addNotification({
                                type: "info",
                                title: "Plan Upgraded",
                                message: `Upgraded to ${tierName}`,
                                navigationTarget: "/settings"
                              });
                            },
                            onError: (err) => {
                              setTierAssignError(
                                err.message || "Failed to assign tier."
                              );
                            }
                          }
                        );
                      },
                      disabled: setUserStripeProductId.isPending || !tierUserPrincipal.trim(),
                      size: "sm",
                      className: "w-full",
                      "data-ocid": "settings.tier_assign_button",
                      children: setUserStripeProductId.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 animate-spin mr-2" }),
                        "Assigning..."
                      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-4 h-4 mr-2" }),
                        "Assign Tier"
                      ] })
                    }
                  ),
                  tierAssignError && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "p",
                    {
                      className: "text-xs text-destructive",
                      "data-ocid": "settings.tier_assign_error_state",
                      children: tierAssignError
                    }
                  ),
                  tierAssignSuccess && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "p",
                    {
                      className: "text-xs text-green-600",
                      "data-ocid": "settings.tier_assign_success_state",
                      children: tierAssignSuccess
                    }
                  )
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "bg-card border border-border rounded-xl p-4 space-y-4",
              "data-ocid": "settings.stripe_card",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-sm font-semibold text-foreground flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(CreditCard, { className: "w-4 h-4 text-primary" }),
                    "Stripe Configuration"
                  ] }),
                  stripeStatusQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Badge,
                    {
                      variant: "secondary",
                      className: "animate-pulse text-[10px]",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 animate-spin mr-1 text-[8px]" }),
                        " ",
                        "Checking..."
                      ]
                    }
                  ) : /* @__PURE__ */ jsxRuntimeExports.jsx(StripeStatusBadge, { stripeStatus: stripeStatusData })
                ] }),
                stripeInlineSuccess && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2",
                    "data-ocid": "settings.stripe_success_state",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "w-4 h-4 text-green-400 text-sm flex-shrink-0" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-green-400 font-medium", children: stripeInlineSuccess })
                    ]
                  }
                ),
                stripeInlineError && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2",
                    "data-ocid": "settings.stripe_error_state",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-4 h-4 text-destructive text-sm flex-shrink-0" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-destructive font-medium", children: stripeInlineError })
                    ]
                  }
                ),
                keysSubmitted ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", "data-ocid": "settings.stripe_keys_saved", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-4 h-4 text-green-400 text-sm flex-shrink-0" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-green-400", children: "Keys are stored in the backend canister and never exposed." })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-muted-foreground", children: "Secret Key" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-xs bg-muted/40 border border-border rounded-md px-3 py-2 text-muted-foreground tracking-widest", children: savedSkPrefix ? `${savedSkPrefix}****` : "sk_****" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-muted-foreground", children: "Public Key" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-xs bg-muted/40 border border-border rounded-md px-3 py-2 text-muted-foreground tracking-widest", children: savedPkPrefix ? `${savedPkPrefix}****` : "pk_****" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      type: "button",
                      variant: "outline",
                      size: "sm",
                      className: "w-full text-xs",
                      onClick: () => {
                        setKeysSubmitted(false);
                        setStripeInlineSuccess("");
                        setStripeInlineError("");
                      },
                      "data-ocid": "settings.stripe_update_button",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 mr-2" }),
                        " Update Keys"
                      ]
                    }
                  )
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Enter your Stripe keys once. They are stored in the backend canister and never exposed to the frontend again." }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "form",
                    {
                      className: "space-y-3",
                      onSubmit: (e) => {
                        e.preventDefault();
                        handleStripeSave();
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(
                            Label,
                            {
                              htmlFor: "stripe-sk",
                              className: "text-xs text-muted-foreground",
                              children: [
                                "Secret Key",
                                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 text-muted-foreground/60", children: "(sk_test_... or sk_live_...)" })
                              ]
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Input,
                              {
                                id: "stripe-sk",
                                type: showSk ? "text" : "password",
                                value: secretKey,
                                onChange: (e) => {
                                  setSecretKey(e.target.value);
                                  setStripeInlineError("");
                                },
                                placeholder: "sk_test_... or sk_live_...",
                                className: "font-mono text-xs pr-10",
                                autoComplete: "off",
                                "data-ocid": "settings.stripe_sk_input"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "button",
                              {
                                type: "button",
                                className: "absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
                                onClick: () => setShowSk((v) => !v),
                                "aria-label": showSk ? "Hide secret key" : "Show secret key",
                                "data-ocid": "settings.stripe_sk_toggle",
                                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-4 h-4" })
                              }
                            )
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(
                            Label,
                            {
                              htmlFor: "stripe-pk",
                              className: "text-xs text-muted-foreground",
                              children: [
                                "Public Key",
                                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 text-muted-foreground/60", children: "(pk_test_... or pk_live_...)" })
                              ]
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Input,
                              {
                                id: "stripe-pk",
                                type: showPk ? "text" : "password",
                                value: publicKey,
                                onChange: (e) => {
                                  setPublicKey(e.target.value);
                                  setStripeInlineError("");
                                },
                                placeholder: "pk_test_... or pk_live_...",
                                className: "font-mono text-xs pr-10",
                                autoComplete: "off",
                                "data-ocid": "settings.stripe_pk_input"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "button",
                              {
                                type: "button",
                                className: "absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
                                onClick: () => setShowPk((v) => !v),
                                "aria-label": showPk ? "Hide public key" : "Show public key",
                                "data-ocid": "settings.stripe_pk_toggle",
                                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-4 h-4" })
                              }
                            )
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Button,
                          {
                            type: "submit",
                            disabled: stripeMutation.isPending || !secretKey.trim() || !publicKey.trim(),
                            size: "sm",
                            className: "w-full",
                            "data-ocid": "settings.stripe_save_button",
                            children: stripeMutation.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 animate-spin mr-2" }),
                              "Saving..."
                            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-4 h-4 mr-2" }),
                              "Save Stripe Keys"
                            ] })
                          }
                        )
                      ]
                    }
                  )
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "bg-card border border-border rounded-xl p-4 space-y-4",
              "data-ocid": "settings.payment_queue_card",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-sm font-semibold text-foreground flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardCheck, { className: "w-4 h-4 text-primary" }),
                    "Payment Verification Queue"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: "bg-primary/20 text-primary border-primary/30 text-[10px]", children: "Admin" })
                ] }),
                listProofsQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 animate-spin text-muted-foreground text-sm" }) }) : !listProofsQuery.data || listProofsQuery.data.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground text-center py-4", children: "No payment proofs to review." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: listProofsQuery.data.map(
                  (proof, idx) => {
                    var _a2;
                    const status = getProofStatus(proof.status);
                    const statusColors = {
                      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                      approved: "bg-green-500/20 text-green-400 border-green-500/30",
                      rejected: "bg-red-500/20 text-red-400 border-red-500/30"
                    };
                    const isPending = status === "pending";
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        className: "rounded-lg bg-muted/40 border border-border p-3 space-y-2",
                        "data-ocid": `settings.queue_proof_item.${idx + 1}`,
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0 flex-1", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "span",
                                {
                                  className: "font-mono text-xs text-foreground truncate",
                                  title: String(proof.principal),
                                  children: truncateText(String(proof.principal))
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                CopyBtn,
                                {
                                  value: String(proof.principal),
                                  ocid: `settings.queue_copy_principal.${idx + 1}`
                                }
                              )
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Badge,
                              {
                                className: `${statusColors[status]} text-[10px] shrink-0 ml-2`,
                                children: status
                              }
                            )
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "span",
                              {
                                className: "font-mono text-xs text-muted-foreground truncate",
                                title: proof.txHash,
                                children: truncateText(proof.txHash)
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              CopyBtn,
                              {
                                value: proof.txHash,
                                ocid: `settings.queue_copy_txhash.${idx + 1}`
                              }
                            )
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-[10px] text-muted-foreground", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-[10px]", children: ((_a2 = proof.networkType) == null ? void 0 : _a2.toUpperCase()) || "ICP" }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: TIER_NAMES[proof.tierRequested] || proof.tierRequested }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "·" }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: new Date(
                              Number(proof.submittedAt) / 1e6
                            ).toLocaleDateString() })
                          ] }),
                          isPending && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 pt-1", children: rejectingId === proof.id ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex items-center gap-2", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Input,
                              {
                                value: rejectReason,
                                onChange: (e) => setRejectReason(e.target.value),
                                placeholder: "Reason for rejection",
                                className: "text-xs h-8",
                                autoComplete: "off",
                                "data-ocid": `settings.queue_reject_reason.${idx + 1}`
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Button,
                              {
                                type: "button",
                                size: "sm",
                                variant: "destructive",
                                className: "h-8 text-xs",
                                disabled: rejectPaymentProof.isPending || !rejectReason.trim(),
                                onClick: () => {
                                  rejectPaymentProof.mutate(
                                    {
                                      proofId: proof.id,
                                      reason: rejectReason.trim()
                                    },
                                    {
                                      onSuccess: () => {
                                        setRejectingId(null);
                                        setRejectReason("");
                                      }
                                    }
                                  );
                                },
                                "data-ocid": `settings.queue_confirm_reject.${idx + 1}`,
                                children: rejectPaymentProof.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "animate-spin" }) : "Confirm Reject"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Button,
                              {
                                type: "button",
                                size: "sm",
                                variant: "outline",
                                className: "h-8 text-xs",
                                onClick: () => {
                                  setRejectingId(null);
                                  setRejectReason("");
                                },
                                "data-ocid": `settings.queue_cancel_reject.${idx + 1}`,
                                children: "Cancel"
                              }
                            )
                          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(
                              Button,
                              {
                                type: "button",
                                size: "sm",
                                className: "h-8 text-xs bg-green-600 hover:bg-green-700 text-white",
                                disabled: approvePaymentProof.isPending,
                                onClick: () => {
                                  approvePaymentProof.mutate(proof.id);
                                },
                                "data-ocid": `settings.queue_approve_button.${idx + 1}`,
                                children: [
                                  approvePaymentProof.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "animate-spin mr-1" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mr-1" }),
                                  "Approve"
                                ]
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(
                              Button,
                              {
                                type: "button",
                                size: "sm",
                                variant: "outline",
                                className: "h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10",
                                onClick: () => {
                                  setRejectingId(proof.id);
                                  setRejectReason("");
                                },
                                "data-ocid": `settings.queue_reject_button.${idx + 1}`,
                                children: [
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "mr-1" }),
                                  "Reject"
                                ]
                              }
                            )
                          ] }) })
                        ]
                      },
                      proof.id ?? idx
                    );
                  }
                ) })
              ]
            }
          )
        ] }) : isAdmin && activeTab === "health" ? /* @__PURE__ */ jsxRuntimeExports.jsx(HealthTab, {}) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex flex-col items-center justify-center py-12 gap-3",
            "data-ocid": "settings.admin_locked",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-12 h-12 text-muted-foreground" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground", children: "Admin access required" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground text-center max-w-xs", children: "You do not have permission to view admin settings." })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(VersionIndicator, {})
      ]
    }
  );
}
export {
  SettingsPage as default
};
