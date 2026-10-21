import { b as useAuth, r as reactExports, q as useTotalNfts, s as useStorageUsage, l as useQuery, n as jsxRuntimeExports, L as LoaderCircle, d as devLog, t as ShieldAlert, R as RefreshCw, C as CircleX } from "./main-uWazffZ2.js";
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
  const { actor, isAdmin, isAdminLoading } = useAuth();
  const [refreshing, setRefreshing] = reactExports.useState(false);
  const totalNfts = useTotalNfts(isAdmin);
  const storageUsage = useStorageUsage(isAdmin);
  const integrity = useQuery({
    queryKey: ["stableStateIntegrity"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getStableStateIntegrity();
    },
    enabled: !!actor && isAdmin,
    staleTime: 3e4
  });
  const canisterId = useQuery({
    queryKey: ["diagnosticCanisterId"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getCanisterIdSafe();
    },
    enabled: !!actor && isAdmin,
    staleTime: Number.POSITIVE_INFINITY
  });
  const loading = isAdminLoading || totalNfts.isLoading || storageUsage.isLoading || integrity.isLoading || canisterId.isLoading;
  const handleRefresh = async () => {
    devLog();
    setRefreshing(true);
    await Promise.allSettled([
      totalNfts.refetch(),
      storageUsage.refetch(),
      integrity.refetch(),
      canisterId.refetch()
    ]);
    setRefreshing(false);
  };
  if (isAdminLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto w-full max-w-2xl px-4 py-8 sm:px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16",
        "data-ocid": "diagnostic.loading_state",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-7 w-7 animate-spin text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Checking access..." })
        ]
      }
    ) });
  }
  if (!isAdmin) {
    devLog();
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto w-full max-w-2xl px-4 py-8 sm:px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex items-start gap-3 rounded-xl border border-border bg-card p-4",
        "data-ocid": "diagnostic.admin_only_state",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display text-sm font-semibold text-foreground", children: "Admin only" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "This page is restricted to administrators." })
          ] })
        ]
      }
    ) });
  }
  const readouts = [
    {
      label: "BACKEND CANISTER",
      value: canisterId.data ? canisterId.data : "—"
    },
    {
      label: "TOTAL NFTs IN CATALOG",
      value: formatCount(totalNfts.data ?? 0n)
    },
    {
      label: "STORAGE USAGE",
      value: formatBytes(storageUsage.data ?? 0n)
    },
    {
      label: "CATALOG INTEGRITY",
      value: integrity.data ? `${formatCount(integrity.data.nftCount)} NFTs · ${formatCount(
        integrity.data.collectionCount
      )} collections` : "—"
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto w-full max-w-2xl px-4 py-8 sm:px-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "mb-6 flex flex-wrap items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-display text-2xl font-bold text-foreground", children: "Health" }),
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
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16",
        "data-ocid": "diagnostic.loading_state",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-7 w-7 animate-spin text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Reading live state..." })
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "diag-readout", "data-ocid": "diagnostic.metrics_section", children: readouts.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "diag-readout-row",
        "data-ocid": "diagnostic.readout_row",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "diag-readout-label", children: row.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "diag-readout-value", children: row.value })
        ]
      },
      row.label
    )) }),
    !loading && (totalNfts.isError || storageUsage.isError) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "mt-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4",
        "data-ocid": "diagnostic.error_state",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "mt-0.5 h-5 w-5 shrink-0 text-destructive" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Could not read the live canister state. Try Refresh." })
        ]
      }
    )
  ] });
}
export {
  DiagnosticPage as default
};
