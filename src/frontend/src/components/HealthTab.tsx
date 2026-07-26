import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useActiveNfts,
  useAvailableNfts,
  useBackendBuildTimestamp,
  useClaimedNfts,
  useHealthMetrics,
  useMetricsCanisterId,
  useNftClaimBreakdown,
  useStorageUsage,
  useTotalClaims,
  useTotalCollections,
  useTotalCreators,
  useTotalNfts,
} from "@/hooks/useQueries";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Box,
  Boxes,
  Building,
  CheckCircle2,
  Clock,
  Database,
  HardDrive,
  Layers,
  ListTree,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  accent?: boolean;
}

function MetricCard({ icon, label, value, subValue, accent }: MetricCardProps) {
  return (
    <div
      className={`bg-card border border-border rounded-xl p-4 flex flex-col gap-2 transition-smooth hover:border-primary/30 hover:shadow-subtle ${accent ? "ring-1 ring-primary/20" : ""}`}
      data-ocid="health.metric_card"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="mt-1">
        <p className="text-2xl font-bold text-foreground font-display">
          {value}
        </p>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
        )}
      </div>
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-16 mt-1" />
    </div>
  );
}

function formatNumber(n: bigint | number | undefined): string {
  if (n === undefined) return "—";
  const num = typeof n === "bigint" ? Number(n) : n;
  return num.toLocaleString();
}

function formatBytes(bytes: bigint | undefined): string {
  if (bytes === undefined) return "—";
  const b = Number(bytes);
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / k ** i).toFixed(2)} ${sizes[i]}`;
}

function formatTimestamp(ts: bigint | undefined): string {
  if (ts === undefined) return "—";
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleString();
}

type BreakdownSortKey = "claimedCount" | "supplyLimit" | "remaining";
type SortDirection = "asc" | "desc";

interface SortConfig {
  key: BreakdownSortKey;
  direction: SortDirection;
}

function BreakdownSkeleton() {
  return (
    <div className="space-y-2">
      {[
        "breakdown-skeleton-1",
        "breakdown-skeleton-2",
        "breakdown-skeleton-3",
        "breakdown-skeleton-4",
      ].map((id) => (
        <div
          key={id}
          className="flex items-center gap-3 bg-card border border-border rounded-lg p-3"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-12 ml-auto" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-2 w-24" />
        </div>
      ))}
    </div>
  );
}

function BreakdownRow({
  entry,
  index,
}: {
  entry: {
    nftId: bigint;
    title: string;
    claimedCount: bigint;
    supplyLimit: bigint;
  };
  index: number;
}) {
  const claimed = Number(entry.claimedCount);
  const supply = Number(entry.supplyLimit);
  const remaining = supply - claimed;
  const pct =
    supply > 0 ? Math.min(100, Math.round((claimed / supply) * 100)) : 0;

  return (
    <tr
      className="border-b border-border last:border-b-0 hover:bg-muted/40 transition-smooth"
      data-ocid={`health.breakdown.row.${index}`}
    >
      <td className="px-3 py-2.5 text-sm text-foreground font-medium min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{entry.title || "Untitled"}</span>
          <Badge
            variant="outline"
            className="text-[10px] shrink-0 font-mono"
            data-ocid={`health.breakdown.id_badge.${index}`}
          >
            #{entry.nftId.toString()}
          </Badge>
        </div>
      </td>
      <td
        className="px-3 py-2.5 text-sm text-foreground text-right tabular-nums"
        data-ocid={`health.breakdown.claimed.${index}`}
      >
        {formatNumber(entry.claimedCount)}
      </td>
      <td
        className="px-3 py-2.5 text-sm text-foreground text-right tabular-nums"
        data-ocid={`health.breakdown.supply.${index}`}
      >
        {formatNumber(entry.supplyLimit)}
      </td>
      <td
        className="px-3 py-2.5 text-sm text-foreground text-right tabular-nums"
        data-ocid={`health.breakdown.remaining.${index}`}
      >
        {formatNumber(BigInt(remaining))}
      </td>
      <td className="px-3 py-2.5 w-40">
        <div className="flex items-center gap-2">
          <div
            className="h-2 flex-1 rounded-full bg-muted overflow-hidden"
            data-ocid={`health.breakdown.progress.${index}`}
          >
            <div
              className="h-full bg-primary rounded-full transition-smooth"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
            {pct}%
          </span>
        </div>
      </td>
    </tr>
  );
}

function PerNftClaimBreakdown({
  breakdown,
}: {
  breakdown: ReturnType<typeof useNftClaimBreakdown>;
}) {
  const [sort, setSort] = useState<SortConfig>({
    key: "claimedCount",
    direction: "desc",
  });

  const sorted = useMemo(() => {
    const data = breakdown.data ?? [];
    const factor = sort.direction === "desc" ? -1 : 1;
    return [...data].sort((a, b) => {
      let av: number;
      let bv: number;
      if (sort.key === "remaining") {
        av = Number(a.supplyLimit) - Number(a.claimedCount);
        bv = Number(b.supplyLimit) - Number(b.claimedCount);
      } else {
        av = Number(a[sort.key]);
        bv = Number(b[sort.key]);
      }
      if (av < bv) return -1 * factor;
      if (av > bv) return 1 * factor;
      return 0;
    });
  }, [breakdown.data, sort]);

  function toggleSort(key: BreakdownSortKey) {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "desc" ? "asc" : "desc" };
      }
      return { key, direction: "desc" };
    });
  }

  function SortIcon({ column }: { column: BreakdownSortKey }) {
    if (sort.key !== column) {
      return <ArrowUpDown className="w-3 h-3 text-muted-foreground/60" />;
    }
    return sort.direction === "desc" ? (
      <ArrowDown className="w-3 h-3 text-primary" />
    ) : (
      <ArrowUp className="w-3 h-3 text-primary" />
    );
  }

  const headerCell = (
    key: BreakdownSortKey,
    label: string,
    align: "left" | "right",
  ) => (
    <th
      scope="col"
      className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-smooth ${
          align === "right" ? "ml-auto" : ""
        }`}
        data-ocid={`health.breakdown.sort.${key}`}
      >
        <span>{label}</span>
        <SortIcon column={key} />
      </button>
    </th>
  );

  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden"
      data-ocid="health.breakdown.section"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <ListTree className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Per-NFT Claim Breakdown
        </h3>
        <Badge
          variant="outline"
          className="text-[10px] ml-auto"
          data-ocid="health.breakdown.count_badge"
        >
          {formatNumber(BigInt(breakdown.data?.length ?? 0))} NFTs
        </Badge>
      </div>

      {breakdown.isLoading ? (
        <div className="p-4" data-ocid="health.breakdown.loading_state">
          <BreakdownSkeleton />
        </div>
      ) : !breakdown.data || breakdown.data.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-10 gap-2"
          data-ocid="health.breakdown.empty_state"
        >
          <Box className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">
            No NFTs with claim tokens yet
          </p>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Per-NFT claim counts will appear here once NFTs have claim tokens
            configured.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th
                  scope="col"
                  className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left"
                >
                  Title
                </th>
                {headerCell("claimedCount", "Claimed", "right")}
                {headerCell("supplyLimit", "Supply", "right")}
                {headerCell("remaining", "Remaining", "right")}
                <th
                  scope="col"
                  className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left"
                >
                  Progress
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry, i) => (
                <BreakdownRow
                  key={entry.nftId.toString()}
                  entry={entry}
                  index={i}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function HealthTab() {
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
  const breakdown = useNftClaimBreakdown(true);

  const isLoading =
    health.isLoading ||
    totalNfts.isLoading ||
    activeNfts.isLoading ||
    claimedNfts.isLoading ||
    availableNfts.isLoading ||
    totalCollections.isLoading ||
    totalCreators.isLoading ||
    totalClaims.isLoading ||
    canisterId.isLoading ||
    backendBuildTimestamp.isLoading ||
    storageUsage.isLoading;

  const isError =
    health.isError &&
    totalNfts.isError &&
    activeNfts.isError &&
    claimedNfts.isError &&
    availableNfts.isError &&
    totalCollections.isError &&
    totalCreators.isError &&
    totalClaims.isError &&
    canisterId.isError &&
    backendBuildTimestamp.isError &&
    storageUsage.isError;

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
    queryClient.invalidateQueries({ queryKey: ["nft-claim-breakdown"] });
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 gap-3"
        data-ocid="health.error_state"
      >
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-sm font-medium text-foreground">
          Failed to load health metrics
        </p>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          There was a problem fetching the latest metrics from the backend.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          data-ocid="health.retry_button"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const metrics = health.data;

  return (
    <div className="space-y-5" data-ocid="health.panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            System Health
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[10px] gap-1"
            data-ocid="health.status_badge"
          >
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Live
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleRefresh}
            disabled={isLoading}
            data-ocid="health.refresh_button"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricSkeleton key="skeleton-a" />
          <MetricSkeleton key="skeleton-b" />
          <MetricSkeleton key="skeleton-c" />
          <MetricSkeleton key="skeleton-d" />
          <MetricSkeleton key="skeleton-e" />
          <MetricSkeleton key="skeleton-f" />
          <MetricSkeleton key="skeleton-g" />
          <MetricSkeleton key="skeleton-h" />
          <MetricSkeleton key="skeleton-i" />
          <MetricSkeleton key="skeleton-j" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard
            icon={<Box className="w-4 h-4" />}
            label="Total NFTs"
            value={formatNumber(metrics?.totalNfts ?? totalNfts.data)}
            accent
          />
          <MetricCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Active NFTs"
            value={formatNumber(metrics?.activeNfts ?? activeNfts.data)}
          />
          <MetricCard
            icon={<Shield className="w-4 h-4" />}
            label="Claimed NFTs"
            value={formatNumber(metrics?.claimedNfts ?? claimedNfts.data)}
          />
          <MetricCard
            icon={<BarChart3 className="w-4 h-4" />}
            label="Available NFTs"
            value={formatNumber(metrics?.availableNfts ?? availableNfts.data)}
          />
          <MetricCard
            icon={<Layers className="w-4 h-4" />}
            label="Total Collections"
            value={formatNumber(
              metrics?.totalCollections ?? totalCollections.data,
            )}
          />
          <MetricCard
            icon={<Users className="w-4 h-4" />}
            label="Total Creators"
            value={formatNumber(metrics?.totalCreators ?? totalCreators.data)}
          />
          <MetricCard
            icon={<Boxes className="w-4 h-4" />}
            label="Total Claims"
            value={formatNumber(metrics?.totalClaims ?? totalClaims.data)}
          />
          <MetricCard
            icon={<Database className="w-4 h-4" />}
            label="Canister ID"
            value={metrics?.canisterId ?? canisterId.data ?? "—"}
            subValue="Backend canister identifier"
          />
          <MetricCard
            icon={<Clock className="w-4 h-4" />}
            label="Build Timestamp"
            value={formatTimestamp(
              metrics?.backendBuildTimestamp ?? backendBuildTimestamp.data,
            )}
            subValue="Last backend deployment"
          />
          <MetricCard
            icon={<HardDrive className="w-4 h-4" />}
            label="Storage Usage"
            value={formatBytes(metrics?.storageUsage ?? storageUsage.data)}
            subValue="Total canister storage"
          />
        </div>
      )}

      {/* Footer note */}
      <p className="text-[10px] text-muted-foreground text-center">
        Metrics are cached for 30 seconds. Click Refresh for the latest data.
      </p>

      {/* Per-NFT Claim Breakdown */}
      <PerNftClaimBreakdown breakdown={breakdown} />
    </div>
  );
}
