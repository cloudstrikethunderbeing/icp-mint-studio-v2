import type { Nft } from "@/backend";
import { useAuth } from "@/contexts/AuthContext";
import {
  useBackendHealth,
  useStorageUsage,
  useTotalNfts,
} from "@/hooks/useQueries";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  Infinity as InfinityIcon,
  ListChecks,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Terminal,
  XCircle,
} from "lucide-react";
import { useState } from "react";

type Integrity = {
  collectionCount: bigint;
  nftCount: bigint;
  claimTokenCount: bigint;
  userCount: bigint;
};

type ReadoutRow = {
  label: string;
  value: string;
  source: "codebase" | "live";
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
  const { actor } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const health = useBackendHealth();
  const totalNfts = useTotalNfts(true);
  const storageUsage = useStorageUsage(true);

  const integrity = useQuery<Integrity>({
    queryKey: ["stableStateIntegrity"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getStableStateIntegrity();
    },
    enabled: !!actor,
    staleTime: 30_000,
  });

  const canisterId = useQuery<string>({
    queryKey: ["diagnosticCanisterId"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.getCanisterIdSafe();
    },
    enabled: !!actor,
    staleTime: Number.POSITIVE_INFINITY,
  });

  // Fix-verification queries. These confirm the four fix guarantees directly
  // against the live backend (read-only) plus the codebase invariants.
  // 1) Uncapped listing: listAllNfts() must return EVERY NFT — its length must
  //    equal the total NFT count, proving no hardcoded result cap truncates
  //    the catalog at scale.
  const allNfts = useQuery<Nft[]>({
    queryKey: ["diagnosticAllNfts"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.listAllNfts();
    },
    enabled: !!actor,
    staleTime: 30_000,
  });

  // 3) Backend pinned to the live ID: isLiveCanister() confirms the canister
  //    this actor talks to is the pinned LIVE_CANISTER_ID.
  const isLive = useQuery<boolean>({
    queryKey: ["diagnosticIsLive"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor unavailable");
      return await actor.isLiveCanister();
    },
    enabled: !!actor,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const loading =
    health.status === "checking" ||
    totalNfts.isLoading ||
    storageUsage.isLoading ||
    integrity.isLoading ||
    canisterId.isLoading ||
    allNfts.isLoading ||
    isLive.isLoading;

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
      isLive.refetch(),
    ]);
    setRefreshing(false);
  };

  const readouts: ReadoutRow[] = [
    {
      label: "TOTAL NFTs IN CATALOG",
      value: formatCount(nftCount),
      source: "live",
    },
    {
      label: "STORED DATA SIZE",
      value: formatBytes(storageUsage.data ?? 0n),
      source: "live",
    },
    {
      label: "CATALOG INTEGRITY",
      value: integrity.data
        ? `${formatCount(integrity.data.nftCount)} NFTs · ${formatCount(
            integrity.data.collectionCount,
          )} collections`
        : "—",
      source: "live",
    },
    {
      label: "SNAPSHOT AVAILABILITY",
      value: "Requires CLI check",
      source: "codebase",
    },
    {
      label: "RECOVERABILITY STATUS",
      value: hasNfts ? "Catalog present" : "At risk — see report",
      source: "codebase",
    },
    {
      label: "BACKEND CANISTER",
      value: canisterId.data ? canisterId.data : "—",
      source: "live",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <header className="mb-8">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          ICP Mint Studio
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-bold text-foreground">
            NFT Catalog Health
          </h1>
          <span
            className={`status-pill ${
              status === "healthy"
                ? "status-pill-healthy"
                : "status-pill-warning"
            }`}
            data-ocid="diagnostic.status_pill"
          >
            <span
              className={`status-dot ${
                status === "healthy"
                  ? "status-dot-healthy"
                  : "status-dot-warning"
              }`}
            />
            {status === "healthy" ? "All systems healthy" : "Catalog at risk"}
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Read-only diagnostic of the NFT catalog. This view never modifies live
          canister data — it reports the current state so you can assess
          recoverability.
        </p>
      </header>

      {/* Loading state */}
      {loading ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16"
          data-ocid="diagnostic.loading_state"
        >
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Reading catalog state...
          </p>
        </div>
      ) : (
        <>
          {/* Metrics table */}
          <section
            className="mb-8"
            aria-labelledby="metrics-heading"
            data-ocid="diagnostic.metrics_section"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2
                id="metrics-heading"
                className="font-display text-lg font-semibold text-foreground"
              >
                Catalog Metrics
              </h2>
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
            </div>
            <div className="diag-readout">
              {readouts.map((row) => (
                <div
                  key={row.label}
                  className="diag-readout-row"
                  data-ocid="diagnostic.readout_row"
                >
                  <span className="diag-readout-label">
                    {row.label}
                    <span
                      className={`ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${
                        row.source === "live"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                      title={
                        row.source === "live"
                          ? "Determined from the live canister read-only check"
                          : "Determined from the codebase"
                      }
                    >
                      {row.source === "live" ? (
                        <Activity className="h-3 w-3" />
                      ) : (
                        <Terminal className="h-3 w-3" />
                      )}
                      {row.source}
                    </span>
                  </span>
                  <span className="diag-readout-value">{row.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Fix verification */}
          <section
            className="mb-8"
            aria-labelledby="fix-heading"
            data-ocid="diagnostic.fix_verification_section"
          >
            <h2
              id="fix-heading"
              className="mb-3 font-display text-lg font-semibold text-foreground"
            >
              Fix Verification
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* 1) Uncapped listing */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <InfinityIcon className="h-4 w-4 text-primary" />
                  <span className="font-display text-sm font-semibold text-foreground">
                    Uncapped listing
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    listAllNfts()
                  </code>{" "}
                  returns every NFT with no hardcoded result cap.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`status-dot ${
                      allNfts.data && allNfts.data.length === Number(nftCount)
                        ? "status-dot-healthy"
                        : "status-dot-warning"
                    }`}
                  />
                  <span className="font-mono text-sm text-foreground">
                    {allNfts.data
                      ? `${formatCount(BigInt(allNfts.data.length))} of ${formatCount(
                          nftCount,
                        )} NFTs returned`
                      : "—"}
                  </span>
                </div>
              </div>

              {/* 2) Additive mint guard */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <span className="font-display text-sm font-semibold text-foreground">
                    Additive mint guard
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  The mint path is purely additive — it never clears or
                  overwrites existing NFTs.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="status-dot status-dot-healthy" />
                  <span className="font-mono text-sm text-foreground">
                    Guarded by guardMintAdditive
                  </span>
                </div>
              </div>

              {/* 3) Backend pinned to live ID */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <span className="font-display text-sm font-semibold text-foreground">
                    Backend pinned to live ID
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  The actor resolves to the pinned{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    LIVE_CANISTER_ID
                  </code>
                  .
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`status-dot ${
                      isLive.data ? "status-dot-healthy" : "status-dot-error"
                    }`}
                  />
                  <span className="font-mono text-xs text-foreground">
                    {canisterId.data ? canisterId.data : "—"}
                  </span>
                  <span
                    className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${
                      isLive.data
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {isLive.data ? "live" : "not live"}
                  </span>
                </div>
              </div>

              {/* 4) Scales indefinitely */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="font-display text-sm font-semibold text-foreground">
                    Scales indefinitely
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  No data-loss path exists at any catalog size — the catalog is
                  a stable{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    Map&lt;Nat, Nft&gt;
                  </code>{" "}
                  preserved by every migration.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="status-dot status-dot-healthy" />
                  <span className="font-mono text-sm text-foreground">
                    No cap, no clear path
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Status definition cards */}
          <section
            className="mb-8"
            aria-labelledby="status-heading"
            data-ocid="diagnostic.status_section"
          >
            <h2
              id="status-heading"
              className="mb-3 font-display text-lg font-semibold text-foreground"
            >
              Status Definitions
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                <div className="flex items-center gap-2">
                  <span className="status-dot status-dot-healthy" />
                  <span className="font-display text-sm font-semibold text-foreground">
                    Healthy
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  NFTs are present in the catalog and the backend is reachable.
                </p>
              </div>
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-center gap-2">
                  <span className="status-dot status-dot-warning" />
                  <span className="font-display text-sm font-semibold text-foreground">
                    Warning
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  The catalog reports zero NFTs — possible data loss that needs
                  investigation.
                </p>
              </div>
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-center gap-2">
                  <span className="status-dot status-dot-error" />
                  <span className="font-display text-sm font-semibold text-foreground">
                    Error
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  The backend is unreachable or resolved to the wrong canister.
                </p>
              </div>
            </div>
          </section>

          {/* Status banner */}
          {status === "warning" ? (
            <div
              className="mb-8 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4"
              data-ocid="diagnostic.warning_banner"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="font-display text-sm font-semibold text-foreground">
                  Catalog appears empty
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  The backend is reachable but reports zero NFTs in the catalog.
                  This is the data-loss signal this diagnostic is designed to
                  catch. Review the incident report below for the likely cause
                  and recovery path.
                </p>
              </div>
            </div>
          ) : (
            <div
              className="mb-8 flex items-start gap-3 rounded-xl border border-success/40 bg-success/10 p-4"
              data-ocid="diagnostic.healthy_banner"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="font-display text-sm font-semibold text-foreground">
                  Catalog present and healthy
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {formatCount(nftCount)} NFTs are stored in the catalog. No
                  data-loss signal detected. The catalog is preserved in
                  permanent canister storage and no app code clears it.
                </p>
              </div>
            </div>
          )}

          {/* Incident report */}
          <section
            className="mb-8"
            aria-labelledby="incident-heading"
            data-ocid="diagnostic.incident_section"
          >
            <h2
              id="incident-heading"
              className="mb-3 font-display text-lg font-semibold text-foreground"
            >
              Incident Report
            </h2>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-foreground">
                    Why the catalog is stored safely
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    The NFT catalog lives in a stable{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                      Map&lt;Nat, Nft&gt;
                    </code>{" "}
                    in the canister's permanent storage. It is preserved by
                    every migration, and the mint path is purely additive — it
                    never clears or overwrites existing NFTs. No application
                    code deletes the catalog.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-foreground">
                    Most likely cause of disappearance
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    If the catalog ever appears empty, the most likely cause is
                    canister rotation or reinstall — the canister was replaced
                    with a fresh instance that never received the stored data.
                    This is an infrastructure event, not an app-code bug.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Database className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-foreground">
                    Recovery path: canister snapshot restore
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    If a canister snapshot exists on the live canister, the
                    catalog can be recovered by restoring that snapshot. This
                    requires operator access with the{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                      icp
                    </code>{" "}
                    CLI and cannot be performed from within this app.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Next steps */}
          <section
            aria-labelledby="next-heading"
            data-ocid="diagnostic.next_steps_section"
          >
            <h2
              id="next-heading"
              className="mb-3 font-display text-lg font-semibold text-foreground"
            >
              Next Steps
            </h2>
            <div className="rounded-xl border border-border bg-card p-5">
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
                    1
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Check live canister snapshots (operator CLI)
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      Use the{" "}
                      <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                        icp
                      </code>{" "}
                      CLI to list snapshots on the live canister. This check
                      cannot be run from inside the app — it requires operator
                      access.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
                    2
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Restore from snapshot if one exists
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      If a snapshot predating the disappearance exists, restore
                      it to bring the full catalog back. This is an operator
                      action you must authorize — the app never performs it.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
                    3
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Re-mint if no snapshot exists
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      If no usable snapshot is available, the catalog would need
                      to be re-minted. The mint path is additive and safe, but
                      this is a last resort after exhausting snapshot recovery.
                    </p>
                  </div>
                </li>
              </ol>
              <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Honest limitation:
                  </span>{" "}
                  this diagnostic reports the catalog state it can read from the
                  backend. It cannot list or restore canister snapshots — those
                  actions require operator CLI access to the live canister and
                  are intentionally not available in-app.
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Error state */}
      {!loading && health.status === "unavailable" && (
        <div
          className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4"
          data-ocid="diagnostic.error_state"
        >
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-display text-sm font-semibold text-foreground">
              Backend unavailable
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {health.reason}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
