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
  BarChart3,
  Box,
  Boxes,
  Building,
  CheckCircle2,
  Clock,
  Database,
  HardDrive,
  Layers,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";

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
    </div>
  );
}
