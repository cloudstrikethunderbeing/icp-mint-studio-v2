import type { AlertType, Nft, UserProfile } from "@/backend";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import BrandedAuthGate from "../components/BrandedAuthGate";
import { useMyNfts } from "../hooks/useQueries";

function truncatePrincipal(pid: string) {
  if (pid.length <= 16) return pid;
  return `${pid.slice(0, 8)}...${pid.slice(-8)}`;
}

function RoleBadge() {
  const { isAdmin, isAdminLoading } = useAuth();

  if (isAdminLoading) {
    return (
      <div
        className="bg-card border border-border rounded-xl p-4 space-y-2"
        data-ocid="profile.role_badge_card"
      >
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  const badge = isAdmin
    ? {
        label: "Master Admin",
        className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      }
    : {
        label: "Creator",
        className: "bg-primary/15 text-primary border-primary/30",
      };

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 space-y-2"
      data-ocid="profile.role_badge_card"
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${badge.className}`}
          data-ocid="profile.role_badge"
        >
          {badge.label}
        </span>
      </div>
      {isAdmin && (
        <div className="space-y-0.5 pl-1">
          <p className="text-xs text-foreground">
            Effective permissions:{" "}
            <span className="font-medium">Administrator</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { isAuthenticated, principal, identity, actor } = useAuth();
  // Derive the full principal text directly from identity as the authoritative source
  const fullPrincipalText = identity
    ? identity.getPrincipal().toText()
    : principal;
  const qc = useQueryClient();

  // Fetch canister ID from backend — source of truth, never env var
  const canisterIdQuery = useQuery<string>({
    queryKey: ["canisterId"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return (
        actor as unknown as { getCanisterId(): Promise<string> }
      ).getCanisterId();
    },
    enabled: !!actor && isAuthenticated,
    staleTime: Number.POSITIVE_INFINITY,
  });

  // Fetch slot status (free tier = 1 active slot)
  const slotsQuery = useQuery<{
    used: bigint;
    total: bigint;
    remaining: bigint;
  }>({
    queryKey: ["slotsStatus"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return (
        actor as unknown as {
          getSlotsStatus(): Promise<{
            used: bigint;
            total: bigint;
            remaining: bigint;
          }>;
        }
      ).getSlotsStatus();
    },
    enabled: !!actor && isAuthenticated,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const profileQuery = useQuery<UserProfile>({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getCallerProfile();
    },
    enabled: !!actor && isAuthenticated,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const creditsQuery = useQuery<{
    total: bigint;
    used: bigint;
    remaining: bigint;
  }>({
    queryKey: ["creditsStatus"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getCreditsStatus();
    },
    enabled: !!actor && isAuthenticated,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: allNfts = [] } = useMyNfts();

  const profile = profileQuery.data;
  const credits = creditsQuery.data;

  const [oisyAddress, setOisyAddress] = useState("");
  const [email, setEmail] = useState("");
  const [principalCopied, setPrincipalCopied] = useState(false);
  const [canisterCopied, setCanisterCopied] = useState(false);
  const [_alerts, setAlerts] = useState<AlertType[]>([]);
  // Track whether the user's form has been initialised from the backend.
  // We ONLY sync once — on initial data arrival — to avoid overwriting
  // changes the user is actively making with background refetch results.
  const [profileInitialised, setProfileInitialised] = useState(false);

  // Sync backend data into local state ONCE on initial mount.
  // Subsequent background refetches must NOT overwrite user edits.
  useEffect(() => {
    if (profile && !profileInitialised) {
      setOisyAddress(profile.oisyWalletAddress ?? "");
      setEmail(profile.email ?? "");
      setAlerts(profile.emailAlerts ?? []);
      setProfileInitialised(true);
    }
  }, [profile, profileInitialised]);

  const _oisyMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      await actor.setOisyWalletAddress(oisyAddress);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["callerProfile"] });
    },
    onError: () => {
      // silently handled
    },
  });

  const _emailMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      await actor.setEmail(email);
      await actor.sendVerificationEmail(email);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["callerProfile"] });
    },
    onError: () => {
      // silently handled
    },
  });

  const _validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const _emailVerified = !!(profile?.email && profile.email.length > 0);

  if (!isAuthenticated) {
    return <BrandedAuthGate subtitle="Connect to view your profile." />;
  }

  const canisterIdDisplay = canisterIdQuery.isLoading
    ? null
    : canisterIdQuery.data && canisterIdQuery.data.trim().length > 0
      ? canisterIdQuery.data
      : "Unavailable";

  return (
    <div
      className="max-w-lg mx-auto px-4 py-6 space-y-6"
      data-ocid="profile.page"
    >
      <h1 className="text-2xl font-bold text-foreground">Profile</h1>

      {/* Role Badge */}
      <RoleBadge />

      {/* Identity Info */}
      <div
        className="bg-card border border-border rounded-xl p-4 space-y-3"
        data-ocid="profile.identity_card"
      >
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Canister ID
          </span>
          <span
            className="text-sm font-mono text-foreground break-all"
            data-ocid="profile.canister_id"
          >
            {canisterIdQuery.isLoading ? (
              <Skeleton className="h-5 w-3/4" />
            ) : (
              canisterIdDisplay
            )}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Creator ID
          </span>
          <span
            className="text-sm font-mono text-foreground"
            data-ocid="profile.creator_id"
          >
            {profileQuery.isLoading ? (
              <Skeleton className="h-5 w-1/2" />
            ) : (
              (profile?.creatorId ?? principal ?? "")
            )}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Principal ID
          </span>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-mono text-foreground break-all"
              data-ocid="profile.principal_id"
              title={fullPrincipalText ?? undefined}
            >
              {fullPrincipalText ? (
                truncatePrincipal(fullPrincipalText)
              ) : (
                <Skeleton className="h-5 w-1/2" />
              )}
            </span>
            <button
              type="button"
              onClick={() => {
                if (fullPrincipalText) {
                  navigator.clipboard.writeText(fullPrincipalText);
                  setPrincipalCopied(true);
                  setTimeout(() => setPrincipalCopied(false), 2000);
                }
              }}
              className="shrink-0 text-xs text-primary hover:underline flex items-center gap-1"
              data-ocid="profile.copy_principal_button"
            >
              {principalCopied ? (
                <>
                  <Check className="w-3 h-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Slot & Credits */}
      <div
        className="bg-card border border-border rounded-xl p-4 space-y-2"
        data-ocid="profile.credits_card"
      >
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          NFT Slots
        </span>
        {slotsQuery.isLoading || creditsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : slotsQuery.data ? (
          <p
            className="text-sm text-foreground"
            data-ocid="profile.slots_status"
          >
            {Number(slotsQuery.data.used)} of {Number(slotsQuery.data.total)}{" "}
            NFT slots used,{" "}
            <span className="font-semibold text-primary">
              {Number(slotsQuery.data.remaining)} remaining
            </span>
          </p>
        ) : credits ? (
          <p
            className="text-sm text-foreground"
            data-ocid="profile.credits_status"
          >
            {Number(credits.used)} of {Number(credits.total)} NFTs used,{" "}
            <span className="font-semibold">
              {Number(credits.remaining)} remaining
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
        <div className="flex flex-col gap-1 pt-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Total NFTs Minted (Lifetime)
          </span>
          <span
            className="text-sm text-foreground"
            data-ocid="profile.total_minted"
          >
            {allNfts.length}
          </span>
          <p className="text-xs text-muted-foreground">
            Includes all minted NFTs, including those that were burned or
            deleted.
          </p>
        </div>
      </div>

      {/* Wallet Import / Collection Discovery */}
      <div
        className="bg-card border border-border rounded-xl p-4 space-y-3"
        data-ocid="profile.wallet_import_card"
      >
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Wallet Import
        </h2>
        <p className="text-xs text-muted-foreground">
          Import this NFT collection into compatible ICP wallets using the
          Canister ID below.
        </p>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            NFT Canister ID
          </Label>
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono text-xs bg-muted/40 border border-border rounded-md px-3 py-2 text-foreground break-all">
              {canisterIdQuery.isLoading ? (
                <Skeleton className="h-4 w-3/4" />
              ) : (
                canisterIdDisplay
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (
                  canisterIdDisplay &&
                  canisterIdDisplay !== "Loading..." &&
                  canisterIdDisplay !== "Unavailable"
                ) {
                  navigator.clipboard.writeText(canisterIdDisplay);
                  setCanisterCopied(true);
                  setTimeout(() => setCanisterCopied(false), 2000);
                }
              }}
              className="shrink-0 text-xs text-primary hover:underline flex items-center gap-1"
              aria-label="Copy canister ID"
              data-ocid="profile.copy_canister_id_button"
            >
              {canisterCopied ? (
                <>
                  <Check className="w-3 h-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
