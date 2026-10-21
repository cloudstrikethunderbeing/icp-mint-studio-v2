import { useAuth } from "@/contexts/AuthContext";
import { useStorageUsage, useTotalNfts } from "@/hooks/useQueries";
import { devLog } from "@/utils/devLog";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { useState } from "react";

// [HEALTH-MIN] Minimal admin-only health readout. This page reports ONLY the
// current live canister's state in point form. It intentionally carries no
// incident-report prose, no recovery walkthrough, no status-definition
// explainers, and no fix-verification narrative cards. Stale all-time totals
// from a previous canister are never presented as recoverable catalog data.

type Integrity = {
  collectionCount: bigint;
  nftCount: bigint;
  claimTokenCount: bigint;
  userCount: bigint;
};

function formatBytes(bytes: bigint): string {
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

function formatCount(n: bigint): string {
  return n.toLocaleString("en-US");
}

export default function DiagnosticPage() {
  const { actor, isAdmin, isAdminLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const totalNfts = useTotalNfts(isAdmin);
  const storageUsage = useStorageUsage(isAdmin);

  const integrity = useQuery<Integrity>({
    queryKey: ["stableStateIntegrity"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getStableStateIntegrity();
    },
    enabled: !!actor && isAdmin,
    staleTime: 30_000,
  });

  const canisterId = useQuery<string>({
    queryKey: ["diagnosticCanisterId"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getCanisterIdSafe();
    },
    enabled: !!actor && isAdmin,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const loading =
    isAdminLoading ||
    totalNfts.isLoading ||
    storageUsage.isLoading ||
    integrity.isLoading ||
    canisterId.isLoading;

  const handleRefresh = async () => {
    devLog("[HEALTH-MIN] refresh requested");
    setRefreshing(true);
    await Promise.allSettled([
      totalNfts.refetch(),
      storageUsage.refetch(),
      integrity.refetch(),
      canisterId.refetch(),
    ]);
    setRefreshing(false);
  };

  // Admin-only gate. A non-admin or anonymous visitor never sees the
  // diagnostic content — only a minimal access notice.
  if (isAdminLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16"
          data-ocid="diagnostic.loading_state"
        >
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    devLog("[HEALTH-MIN] non-admin access blocked");
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <div
          className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
          data-ocid="diagnostic.admin_only_state"
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-display text-sm font-semibold text-foreground">
              Admin only
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              This page is restricted to administrators.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const readouts: { label: string; value: string }[] = [
    {
      label: "BACKEND CANISTER",
      value: canisterId.data ? canisterId.data : "—",
    },
    {
      label: "TOTAL NFTs IN CATALOG",
      value: formatCount(totalNfts.data ?? 0n),
    },
    {
      label: "STORAGE USAGE",
      value: formatBytes(storageUsage.data ?? 0n),
    },
    {
      label: "CATALOG INTEGRITY",
      value: integrity.data
        ? `${formatCount(integrity.data.nftCount)} NFTs · ${formatCount(
            integrity.data.collectionCount,
          )} collections`
        : "—",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Health
        </h1>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          data-ocid="diagnostic.refresh_button"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </header>

      {loading ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16"
          data-ocid="diagnostic.loading_state"
        >
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Reading live state...</p>
        </div>
      ) : (
        <div className="diag-readout" data-ocid="diagnostic.metrics_section">
          {readouts.map((row) => (
            <div
              key={row.label}
              className="diag-readout-row"
              data-ocid="diagnostic.readout_row"
            >
              <span className="diag-readout-label">{row.label}</span>
              <span className="diag-readout-value">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {!loading && (totalNfts.isError || storageUsage.isError) && (
        <div
          className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4"
          data-ocid="diagnostic.error_state"
        >
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Could not read the live canister state. Try Refresh.
          </p>
        </div>
      )}
    </div>
  );
}
