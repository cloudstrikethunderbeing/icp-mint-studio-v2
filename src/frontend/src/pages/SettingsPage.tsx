import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  useApprovePaymentProof,
  useListPaymentProofs,
  useMyPaymentProofs,
  useRejectPaymentProof,
  useSetUserStripeProductId,
  useSubmitPaymentProof,
} from "@/hooks/useQueries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Bitcoin,
  Building,
  Check,
  CheckCircle,
  Circle,
  ClipboardCheck,
  Copy,
  CreditCard,
  Crown,
  Eye,
  EyeOff,
  Fingerprint,
  HelpCircle,
  Layers,
  Loader2,
  Lock,
  PenTool,
  RefreshCw,
  Rocket,
  Send,
  Settings,
  Shield,
  Sprout,
  UserCheck,
  UserCog,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TIER_NAMES: Record<string, string> = {
  prod_UgpwDUBgXdz0K5: "Free",
  prod_UgpxVvHHogE6Qx: "Creator",
  prod_UgpyBkj4HK4A9V: "Pro",
  prod_Ugpy3x4LuFPxzf: "Org",
};

function getProofStatus(status: unknown): "pending" | "approved" | "rejected" {
  if (typeof status === "object" && status !== null) {
    if ("pending" in status) return "pending";
    if ("approved" in status) return "approved";
  }
  return "rejected";
}

function truncateText(text: string, start = 10, end = 5): string {
  if (text.length <= start + end + 3) return text;
  return `${text.slice(0, start)}...${text.slice(-end)}`;
}
import type { UserProfile } from "@/backend";
import type { PaymentProof } from "@/types";
function AdminPidDisplay({ pid }: { pid: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="flex items-center gap-2 mt-1"
      data-ocid="settings.admin_pid_display"
    >
      <span
        className="font-mono text-xs text-primary/80 break-all min-w-0"
        title={pid}
      >
        {pid}
      </span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(pid);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="shrink-0 text-xs text-primary hover:underline flex items-center gap-1"
        aria-label="Copy admin principal ID"
        data-ocid="settings.admin_pid_copy_button"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-[10px]" /> Copied
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 text-[10px]" /> Copy
          </>
        )}
      </button>
    </div>
  );
}

const TIERS = [
  {
    key: "free",
    label: "Free",
    slots: "1 slot (1/1 NFT)",
    price: "$0 / mo",
    icon: "fa-seedling",
  },
  {
    key: "creator",
    label: "Creator",
    slots: "3 slots, 10 NFTs each",
    price: "$9 / mo",
    icon: "fa-pen-nib",
  },
  {
    key: "pro",
    label: "Pro",
    slots: "5 slots, 100 NFTs each",
    price: "$29 / mo",
    icon: "fa-rocket",
  },
  {
    key: "org",
    label: "Org",
    slots: "8 slots, 500 NFTs each",
    price: "$99 / mo",
    icon: "fa-building",
  },
];

type StripeStatus = { configured: boolean; mode: string };

function StripeStatusBadge({
  stripeStatus,
}: { stripeStatus: StripeStatus | undefined | null }) {
  if (!stripeStatus) {
    return (
      <Badge
        variant="secondary"
        className="gap-1 text-[10px]"
        data-ocid="settings.stripe_unavailable_badge"
      >
        <HelpCircle className="w-4 h-4 text-[8px]" /> Status unavailable
      </Badge>
    );
  }
  if (stripeStatus.configured && stripeStatus.mode === "live")
    return (
      <Badge
        className="bg-green-500/20 text-green-400 border-green-500/30 gap-1 text-[10px]"
        data-ocid="settings.stripe_live_badge"
      >
        <Circle className="w-4 h-4 text-[8px]" /> Live
      </Badge>
    );
  if (stripeStatus.configured && stripeStatus.mode === "test")
    return (
      <Badge
        className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1 text-[10px]"
        data-ocid="settings.stripe_test_badge"
      >
        <Circle className="w-4 h-4 text-[8px]" /> Test
      </Badge>
    );
  return (
    <Badge
      variant="secondary"
      className="gap-1 text-[10px]"
      data-ocid="settings.stripe_disconnected_badge"
    >
      <XCircle className="w-4 h-4 text-[10px]" /> Not Connected
    </Badge>
  );
}

export default function SettingsPage() {
  const { isAuthenticated, actor, login, isAdmin, principal } = useAuth();
  const queryClient = useQueryClient();

  // ── Stripe state ─────────────────────────────────────────────────────────
  const [secretKey, setSecretKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [showSk, setShowSk] = useState(false);
  const [showPk, setShowPk] = useState(false);
  const [stripeInlineSuccess, setStripeInlineSuccess] = useState("");
  const [stripeInlineError, setStripeInlineError] = useState("");
  // Track masked key prefixes to show after save (e.g. "sk_live_" so we show "sk_live_****")
  const [savedSkPrefix, setSavedSkPrefix] = useState("");
  const [savedPkPrefix, setSavedPkPrefix] = useState("");
  const [keysSubmitted, setKeysSubmitted] = useState(false);

  // ── Caller profile query (for live tier badge) ──────────────────────────
  const profileQuery = useQuery<UserProfile>({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getCallerProfile();
    },
    enabled: !!actor && isAuthenticated,
    staleTime: 30 * 1000,
  });

  const currentTierLabel =
    TIER_NAMES[profileQuery.data?.stripeProductId ?? ""] || "Free";

  // ── Stripe status query ───────────────────────────────────────────────────
  const stripeStatusQuery = useQuery<StripeStatus>({
    queryKey: ["stripeStatus"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return await actor.getStripeStatus();
    },
    enabled: !!actor && isAuthenticated && isAdmin,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // ── Stripe save mutation ──────────────────────────────────────────────────
  const stripeMutation = useMutation({
    mutationFn: async ({ sk, pk }: { sk: string; pk: string }) => {
      if (!actor) throw new Error("No actor — please reconnect.");
      await actor.setStripeConfiguration(sk, pk);
    },
    onSuccess: (_, { sk, pk }) => {
      // Derive masked prefixes before clearing inputs
      const skPrefix = sk.startsWith("sk_live_") ? "sk_live_" : "sk_test_";
      const pkPrefix = pk.startsWith("pk_live_") ? "pk_live_" : "pk_test_";
      setSavedSkPrefix(skPrefix);
      setSavedPkPrefix(pkPrefix);
      setSecretKey("");
      setPublicKey("");
      setKeysSubmitted(true);
      setStripeInlineSuccess("Stripe keys saved successfully.");
      setStripeInlineError("");
      queryClient.invalidateQueries({ queryKey: ["stripeStatus"] });
      stripeStatusQuery.refetch();
      toast.success("Stripe keys saved securely to the backend.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      setStripeInlineError(`Failed to save Stripe keys: ${msg}`);
      setStripeInlineSuccess("");
      toast.error(`Failed to save Stripe keys: ${msg}`);
    },
  });

  function handleStripeSave() {
    const sk = secretKey.trim();
    const pk = publicKey.trim();
    setStripeInlineError("");
    setStripeInlineSuccess("");
    if (!sk.startsWith("sk_test_") && !sk.startsWith("sk_live_")) {
      setStripeInlineError("Secret key must start with sk_test_ or sk_live_");
      return;
    }
    if (!pk.startsWith("pk_test_") && !pk.startsWith("pk_live_")) {
      setStripeInlineError("Public key must start with pk_test_ or pk_live_");
      return;
    }
    if (sk.startsWith("sk_live_") !== pk.startsWith("pk_live_")) {
      setStripeInlineError(
        "Secret and public keys must both be test or both be live",
      );
      return;
    }
    stripeMutation.mutate({ sk, pk });
  }

  // ── Admin PID state ───────────────────────────────────────────────────────
  const [adminPidInput, setAdminPidInput] = useState("");
  const [adminPidError, setAdminPidError] = useState("");

  // ── Collection Discovery state ────────────────────────────────────────────
  const [canisterIdCopied, setCanisterIdCopied] = useState(false);
  const [collectionIdCopied, setCollectionIdCopied] = useState(false);

  // ── Manual Tier Assignment state ────────────────────────────────────────
  const [tierUserPrincipal, setTierUserPrincipal] = useState("");
  const [tierProductId, setTierProductId] = useState("prod_UgpwDUBgXdz0K5");
  const [tierAssignError, setTierAssignError] = useState("");
  const [tierAssignSuccess, setTierAssignSuccess] = useState("");

  const setUserStripeProductId = useSetUserStripeProductId();

  // ── Payment Proof state ───────────────────────────────────────────────────
  const [proofTxHash, setProofTxHash] = useState("");
  const [proofNetwork, setProofNetwork] = useState("icp");
  const [proofTier, setProofTier] = useState("prod_UgpxVvHHogE6Qx");
  const [proofError, setProofError] = useState("");
  const [proofSuccess, setProofSuccess] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const submitPaymentProof = useSubmitPaymentProof();
  const approvePaymentProof = useApprovePaymentProof();
  const rejectPaymentProof = useRejectPaymentProof();
  const myProofsQuery = useMyPaymentProofs(principal);
  const listProofsQuery = useListPaymentProofs(isAdmin);

  // ── Admin query ───────────────────────────────────────────────────────────
  const adminPrincipalQuery = useQuery<string | null>({
    queryKey: ["adminPrincipal"],
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getAdminPrincipal();
      return result ? result.toString() : null;
    },
    enabled: !!actor && isAuthenticated,
    staleTime: Number.POSITIVE_INFINITY, // admin principal never changes
  });

  const adminConfigured =
    adminPrincipalQuery.data !== null && adminPrincipalQuery.data !== undefined;

  // ── Canister ID query ───────────────────────────────────────────────────
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

  const canisterIdDisplay = canisterIdQuery.isLoading
    ? "Loading..."
    : canisterIdQuery.data && canisterIdQuery.data.trim().length > 0
      ? canisterIdQuery.data
      : "Unavailable";

  // ── Collection ID query ─────────────────────────────────────────────────
  const collectionIdQuery = useQuery<string | null>({
    queryKey: ["collectionId"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      const result = (await (
        actor as unknown as { getCollectionId(): Promise<string | null> }
      ).getCollectionId()) as string | null;
      return result;
    },
    enabled: !!actor && isAuthenticated,
    staleTime: Number.POSITIVE_INFINITY,
  });

  // ── Set admin PID mutation ────────────────────────────────────────────────
  const setAdminMutation = useMutation({
    mutationFn: async (_pid: string) => {
      if (!actor) throw new Error("No actor");
      // setAdminPrincipal endpoint removed — admin is set at deploy time only
    },
    onSuccess: () => {
      toast.success(
        "Admin principal is set at deploy time and cannot be changed at runtime.",
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to set admin: ${msg}`);
    },
  });

  function handleSetAdmin() {
    const pid = adminPidInput.trim();
    if (!pid) {
      setAdminPidError("Principal ID is required.");
      return;
    }
    // Basic ICP principal format validation: groups of chars separated by hyphens
    // Full principals are 5 groups of 5 base32 chars; canister IDs can be shorter
    const principalPattern =
      /^[a-z0-9]{5}(-[a-z0-9]{5}){0,9}(-[a-z]{3})?$|^[a-z2-7]{5,}(-[a-z2-7]{5,})*(-cai)?$/;
    if (!principalPattern.test(pid)) {
      setAdminPidError(
        "Enter a valid ICP Principal ID (e.g. rdmx6-jaaaa-aaaah-qcaiq-cai).",
      );
      return;
    }
    setAdminPidError("");
    setAdminMutation.mutate(pid);
  }

  if (!isAuthenticated) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4"
        data-ocid="settings.not_auth"
      >
        <Settings className="w-16 h-16 text-muted-foreground" />
        <p className="text-foreground font-semibold text-lg text-center">
          Please connect your Internet Identity to access settings.
        </p>
        <Button onClick={login} data-ocid="settings.connect_button">
          Connect
        </Button>
      </div>
    );
  }

  const stripeStatusData = stripeStatusQuery.isError
    ? null
    : stripeStatusQuery.data;

  return (
    <div
      className="max-w-lg mx-auto px-4 py-6 space-y-5"
      data-ocid="settings.page"
    >
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {/* ── Live Tier Badge (top of page) ─────────────────────────────────── */}
      <div
        className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
        data-ocid="settings.tier_badge_card"
      >
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-primary text-sm" />
          <div>
            <p className="text-xs text-muted-foreground">Current Plan</p>
            <p className="text-sm font-semibold text-foreground">
              {currentTierLabel}
            </p>
          </div>
        </div>
        <Badge
          className="bg-primary/20 text-primary border-primary/30 text-[10px]"
          data-ocid="settings.tier_badge"
        >
          {currentTierLabel}
        </Badge>
      </div>

      {/* ── Admin Configuration Card ──────────────────────────────────────── */}
      <div
        className="bg-card border border-border rounded-xl p-4 space-y-3"
        data-ocid="settings.admin_card"
      >
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Admin Configuration
        </h2>
        {adminPrincipalQuery.isLoading ? (
          <p className="text-xs text-muted-foreground animate-pulse">
            Checking admin status...
          </p>
        ) : adminConfigured ? (
          <div
            className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2"
            data-ocid="settings.admin_configured"
          >
            <CheckCircle className="w-4 h-4 text-primary text-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary font-medium">
                Admin principal is configured and locked.
              </p>
              {isAdmin && adminPrincipalQuery.data && (
                <AdminPidDisplay pid={adminPrincipalQuery.data} />
              )}
            </div>
            {isAdmin && (
              <Badge className="ml-auto shrink-0 bg-primary/20 text-primary border-primary/30 text-[10px]">
                You are Admin
              </Badge>
            )}
          </div>
        ) : (
          <div className="space-y-3" data-ocid="settings.admin_unconfigured">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
              <p className="text-xs text-amber-400 font-medium">
                <AlertTriangle className="w-4 h-4 mr-1" />
                No admin set. Enter your Principal ID below to claim admin
                permanently. This can only be done once.
              </p>
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="admin-pid-input"
                className="text-xs text-muted-foreground"
              >
                Admin Principal ID
              </Label>
              <p className="text-xs text-muted-foreground/70">
                Paste your full ICP Principal ID (visible in your Profile page).
              </p>
              <Input
                id="admin-pid-input"
                value={adminPidInput}
                onChange={(e) => {
                  setAdminPidInput(e.target.value);
                  setAdminPidError("");
                }}
                placeholder="e.g. rdmx6-jaaaa-aaaah-qcaiq-cai"
                className="font-mono text-xs"
                autoComplete="off"
                data-ocid="settings.admin_pid_input"
              />
              {adminPidError && (
                <p
                  className="text-xs text-destructive"
                  data-ocid="settings.admin_pid_field_error"
                >
                  {adminPidError}
                </p>
              )}
            </div>
            <Button
              type="button"
              onClick={handleSetAdmin}
              disabled={setAdminMutation.isPending || !adminPidInput.trim()}
              size="sm"
              className="w-full"
              data-ocid="settings.admin_pid_save_button"
            >
              {setAdminMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Setting Admin...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Set Admin Principal
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ── Manual Tier Assignment (admin only) ───────────────────────────── */}
      {isAdmin && (
        <div
          className="bg-card border border-border rounded-xl p-4 space-y-4"
          data-ocid="settings.tier_assignment_card"
        >
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <UserCog className="w-4 h-4 text-primary" />
            Manual Tier Assignment
          </h2>
          <p className="text-xs text-muted-foreground">
            Assign a Stripe product tier to a user principal. This is the manual
            fallback until automated Stripe webhooks are enabled.
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                User Principal ID
              </Label>
              <Input
                value={tierUserPrincipal}
                onChange={(e) => {
                  setTierUserPrincipal(e.target.value);
                  setTierAssignError("");
                  setTierAssignSuccess("");
                }}
                placeholder="e.g. rdmx6-jaaaa-aaaah-qcaiq-cai"
                className="font-mono text-xs"
                autoComplete="off"
                data-ocid="settings.tier_user_principal_input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Stripe Product / Tier
              </Label>
              <select
                value={tierProductId}
                onChange={(e) => setTierProductId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                data-ocid="settings.tier_product_select"
              >
                <option value="prod_UgpwDUBgXdz0K5">
                  Free — 1 slot / 1 NFT
                </option>
                <option value="prod_UgpxVvHHogE6Qx">
                  Creator — 3 slots / 10 NFTs each
                </option>
                <option value="prod_UgpyBkj4HK4A9V">
                  Pro — 5 slots / 100 NFTs each
                </option>
                <option value="prod_Ugpy3x4LuFPxzf">
                  Org — 8 slots / 500 NFTs each
                </option>
              </select>
            </div>
            <Button
              type="button"
              onClick={() => {
                setTierAssignError("");
                setTierAssignSuccess("");
                if (!tierUserPrincipal.trim()) {
                  setTierAssignError("User Principal ID is required.");
                  return;
                }
                setUserStripeProductId.mutate(
                  {
                    userPrincipal: tierUserPrincipal.trim(),
                    productId: tierProductId,
                  },
                  {
                    onSuccess: () => {
                      setTierAssignSuccess("Tier assigned successfully.");
                      setTierUserPrincipal("");
                    },
                    onError: (err: Error) => {
                      setTierAssignError(
                        err.message || "Failed to assign tier.",
                      );
                    },
                  },
                );
              }}
              disabled={
                setUserStripeProductId.isPending || !tierUserPrincipal.trim()
              }
              size="sm"
              className="w-full"
              data-ocid="settings.tier_assign_button"
            >
              {setUserStripeProductId.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Assigning...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Assign Tier
                </>
              )}
            </Button>
            {tierAssignError && (
              <p
                className="text-xs text-destructive"
                data-ocid="settings.tier_assign_error_state"
              >
                {tierAssignError}
              </p>
            )}
            {tierAssignSuccess && (
              <p
                className="text-xs text-green-600"
                data-ocid="settings.tier_assign_success_state"
              >
                {tierAssignSuccess}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Stripe Configuration Card (admin only) ────────────────────────── */}
      {isAdmin && (
        <div
          className="bg-card border border-border rounded-xl p-4 space-y-4"
          data-ocid="settings.stripe_card"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Stripe Configuration
            </h2>
            {stripeStatusQuery.isLoading ? (
              <Badge variant="secondary" className="animate-pulse text-[10px]">
                <Loader2 className="w-4 h-4 animate-spin mr-1 text-[8px]" />{" "}
                Checking...
              </Badge>
            ) : (
              <StripeStatusBadge stripeStatus={stripeStatusData} />
            )}
          </div>

          {/* Inline success message */}
          {stripeInlineSuccess && (
            <div
              className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2"
              data-ocid="settings.stripe_success_state"
            >
              <CheckCircle className="w-4 h-4 text-green-400 text-sm flex-shrink-0" />
              <p className="text-xs text-green-400 font-medium">
                {stripeInlineSuccess}
              </p>
            </div>
          )}

          {/* Inline error message */}
          {stripeInlineError && (
            <div
              className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2"
              data-ocid="settings.stripe_error_state"
            >
              <AlertCircle className="w-4 h-4 text-destructive text-sm flex-shrink-0" />
              <p className="text-xs text-destructive font-medium">
                {stripeInlineError}
              </p>
            </div>
          )}

          {keysSubmitted ? (
            <div className="space-y-3" data-ocid="settings.stripe_keys_saved">
              <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
                <Lock className="w-4 h-4 text-green-400 text-sm flex-shrink-0" />
                <p className="text-xs text-green-400">
                  Keys are stored in the backend canister and never exposed.
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Secret Key
                </Label>
                <div className="font-mono text-xs bg-muted/40 border border-border rounded-md px-3 py-2 text-muted-foreground tracking-widest">
                  {savedSkPrefix ? `${savedSkPrefix}****` : "sk_****"}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Public Key
                </Label>
                <div className="font-mono text-xs bg-muted/40 border border-border rounded-md px-3 py-2 text-muted-foreground tracking-widest">
                  {savedPkPrefix ? `${savedPkPrefix}****` : "pk_****"}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setKeysSubmitted(false);
                  setStripeInlineSuccess("");
                  setStripeInlineError("");
                }}
                data-ocid="settings.stripe_update_button"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Update Keys
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Enter your Stripe keys once. They are stored in the backend
                canister and never exposed to the frontend again.
              </p>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleStripeSave();
                }}
              >
                <div className="space-y-1">
                  <Label
                    htmlFor="stripe-sk"
                    className="text-xs text-muted-foreground"
                  >
                    Secret Key
                    <span className="ml-1 text-muted-foreground/60">
                      (sk_test_... or sk_live_...)
                    </span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="stripe-sk"
                      type={showSk ? "text" : "password"}
                      value={secretKey}
                      onChange={(e) => {
                        setSecretKey(e.target.value);
                        setStripeInlineError("");
                      }}
                      placeholder="sk_test_... or sk_live_..."
                      className="font-mono text-xs pr-10"
                      autoComplete="off"
                      data-ocid="settings.stripe_sk_input"
                    />
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowSk((v) => !v)}
                      aria-label={
                        showSk ? "Hide secret key" : "Show secret key"
                      }
                      data-ocid="settings.stripe_sk_toggle"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="stripe-pk"
                    className="text-xs text-muted-foreground"
                  >
                    Public Key
                    <span className="ml-1 text-muted-foreground/60">
                      (pk_test_... or pk_live_...)
                    </span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="stripe-pk"
                      type={showPk ? "text" : "password"}
                      value={publicKey}
                      onChange={(e) => {
                        setPublicKey(e.target.value);
                        setStripeInlineError("");
                      }}
                      placeholder="pk_test_... or pk_live_..."
                      className="font-mono text-xs pr-10"
                      autoComplete="off"
                      data-ocid="settings.stripe_pk_input"
                    />
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPk((v) => !v)}
                      aria-label={
                        showPk ? "Hide public key" : "Show public key"
                      }
                      data-ocid="settings.stripe_pk_toggle"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={
                    stripeMutation.isPending ||
                    !secretKey.trim() ||
                    !publicKey.trim()
                  }
                  size="sm"
                  className="w-full"
                  data-ocid="settings.stripe_save_button"
                >
                  {stripeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Save Stripe Keys
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── NFT Collection Discovery Card ─────────────────────────────────── */}
      <div
        className="bg-card border border-border rounded-xl p-4 space-y-3"
        data-ocid="settings.discovery_card"
      >
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-primary" />
          NFT Collection Discovery
        </h2>
        <p className="text-xs text-muted-foreground">
          Use these identifiers to import or discover your NFT collection in
          compatible ICP wallets (OISY, Plug, Stoic, NFID Wallet, etc.). The
          Canister ID identifies where NFTs are stored. The Collection ID
          identifies the logical grouping inside the canister.
        </p>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              NFT Canister ID
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-xs bg-muted/40 border border-border rounded-md px-3 py-2 text-foreground break-all">
                {canisterIdDisplay}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (canisterIdQuery.data) {
                    navigator.clipboard.writeText(canisterIdQuery.data);
                    setCanisterIdCopied(true);
                    setTimeout(() => setCanisterIdCopied(false), 2000);
                  }
                }}
                className="shrink-0 text-xs text-primary hover:underline flex items-center gap-1"
                aria-label="Copy canister ID"
                data-ocid="settings.copy_canister_id_button"
              >
                {canisterIdCopied ? (
                  <>
                    <Check className="w-4 h-4 text-[10px]" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[10px]" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Collection ID
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-xs bg-muted/40 border border-border rounded-md px-3 py-2 text-foreground break-all">
                {collectionIdQuery.isLoading
                  ? "Loading..."
                  : (collectionIdQuery.data ?? "N/A")}
              </div>
              {collectionIdQuery.data && collectionIdQuery.data !== "N/A" && (
                <button
                  type="button"
                  onClick={() => {
                    const cid = collectionIdQuery.data ?? "";
                    if (cid) {
                      navigator.clipboard.writeText(cid);
                      setCollectionIdCopied(true);
                      setTimeout(() => setCollectionIdCopied(false), 2000);
                    }
                  }}
                  className="shrink-0 text-xs text-primary hover:underline flex items-center gap-1"
                  aria-label="Copy collection ID"
                  data-ocid="settings.copy_collection_id_button"
                >
                  {collectionIdCopied ? (
                    <>
                      <Check className="w-4 h-4 text-[10px]" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[10px]" /> Copy
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Subscription Tiers Card ───────────────────────────────────────── */}
      <div
        className="bg-card border border-border rounded-xl p-4 space-y-3"
        data-ocid="settings.tiers_card"
      >
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Subscription Tiers
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {TIERS.map((tier, i) => (
            <div
              key={tier.key}
              className="border border-border rounded-lg p-3 space-y-1 relative hover:border-primary/40 transition-colors duration-200"
              data-ocid={`settings.tier_card.${i + 1}`}
            >
              {tier.key === currentTierLabel.toLowerCase() && (
                <Badge
                  variant="secondary"
                  className="absolute top-2 right-2 text-[10px] px-1 py-0"
                >
                  Current
                </Badge>
              )}
              <div className="flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  {tier.label}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{tier.slots}</p>
              <p className="text-xs text-accent font-medium">{tier.price}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pay with ICP or ckBTC (authenticated users only) ───────────────── */}
      {isAuthenticated && (
        <div
          className="bg-card border border-border rounded-xl p-4 space-y-4"
          data-ocid="settings.payment_proof_card"
        >
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bitcoin className="w-4 h-4 text-primary" />
            Pay with ICP or ckBTC
          </h2>
          <p className="text-xs text-muted-foreground">
            Send ICP or ckBTC to the admin wallet, then submit your payment
            proof below. An admin will verify the transaction and assign your
            subscription tier.
          </p>

          {/* Submission history */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-foreground">
              Your Submissions
            </h3>
            {myProofsQuery.isLoading ? (
              <p className="text-xs text-muted-foreground animate-pulse">
                Loading...
              </p>
            ) : !myProofsQuery.data || myProofsQuery.data.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No payment proofs submitted yet.
              </p>
            ) : (
              <div className="space-y-2">
                {myProofsQuery.data
                  .slice(0, 5)
                  .map((proof: PaymentProof, idx: number) => {
                    const status = getProofStatus(proof.status);
                    const statusColors = {
                      pending:
                        "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                      approved:
                        "bg-green-500/20 text-green-400 border-green-500/30",
                      rejected: "bg-red-500/20 text-red-400 border-red-500/30",
                    };
                    return (
                      <div
                        key={proof.id ?? idx}
                        className="flex items-center justify-between rounded-lg bg-muted/40 border border-border px-3 py-2"
                        data-ocid={`settings.my_proof_item.${idx + 1}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-mono text-foreground truncate">
                            {truncateText(proof.txHash)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {TIER_NAMES[proof.tierRequested] ||
                              proof.tierRequested}{" "}
                            ·{" "}
                            {new Date(
                              Number(proof.submittedAt) / 1_000_000,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          className={`${statusColors[status]} text-[10px] shrink-0 ml-2`}
                        >
                          {status}
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Submit form */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-foreground">
              Submit New Proof
            </h3>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Principal</Label>
              <Input
                value={principal ?? ""}
                readOnly
                className="font-mono text-xs bg-muted/40"
                data-ocid="settings.proof_principal_input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Transaction Hash
              </Label>
              <Input
                value={proofTxHash}
                onChange={(e) => {
                  setProofTxHash(e.target.value);
                  setProofError("");
                }}
                placeholder="Enter transaction hash"
                className="font-mono text-xs"
                autoComplete="off"
                data-ocid="settings.proof_txhash_input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Network</Label>
              <select
                value={proofNetwork}
                onChange={(e) => setProofNetwork(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                data-ocid="settings.proof_network_select"
              >
                <option value="icp">ICP</option>
                <option value="ckbtc">ckBTC</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Tier Requested
              </Label>
              <select
                value={proofTier}
                onChange={(e) => setProofTier(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                data-ocid="settings.proof_tier_select"
              >
                <option value="prod_UgpxVvHHogE6Qx">
                  Creator — 3 slots / 10 NFTs each
                </option>
                <option value="prod_UgpyBkj4HK4A9V">
                  Pro — 5 slots / 100 NFTs each
                </option>
                <option value="prod_Ugpy3x4LuFPxzf">
                  Org — 8 slots / 500 NFTs each
                </option>
              </select>
            </div>
            <Button
              type="button"
              onClick={() => {
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
                    networkType: proofNetwork,
                  },
                  {
                    onSuccess: () => {
                      setProofSuccess(
                        "Payment proof submitted. Awaiting admin review.",
                      );
                      setProofTxHash("");
                      setProofNetwork("icp");
                      setProofTier("prod_UgpxVvHHogE6Qx");
                    },
                    onError: (err: Error) => {
                      setProofError(
                        err.message || "Failed to submit payment proof.",
                      );
                    },
                  },
                );
              }}
              disabled={submitPaymentProof.isPending || !proofTxHash.trim()}
              size="sm"
              className="w-full"
              data-ocid="settings.proof_submit_button"
            >
              {submitPaymentProof.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Proof
                </>
              )}
            </Button>
            {proofError && (
              <p
                className="text-xs text-destructive"
                data-ocid="settings.proof_error_state"
              >
                {proofError}
              </p>
            )}
            {proofSuccess && (
              <p
                className="text-xs text-green-600"
                data-ocid="settings.proof_success_state"
              >
                {proofSuccess}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Payment Verification Queue (admin only) ──────────────────────── */}
      {isAdmin && (
        <div
          className="bg-card border border-border rounded-xl p-4 space-y-4"
          data-ocid="settings.payment_queue_card"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" />
              Payment Verification Queue
            </h2>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
              Admin
            </Badge>
          </div>

          {listProofsQuery.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground text-sm" />
            </div>
          ) : !listProofsQuery.data || listProofsQuery.data.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No payment proofs to review.
            </p>
          ) : (
            <div className="space-y-3">
              {listProofsQuery.data.map((proof: PaymentProof, idx: number) => {
                const status = getProofStatus(proof.status);
                const statusColors = {
                  pending:
                    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                  approved:
                    "bg-green-500/20 text-green-400 border-green-500/30",
                  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
                };
                const isPending = status === "pending";
                return (
                  <div
                    key={proof.id ?? idx}
                    className="rounded-lg bg-muted/40 border border-border p-3 space-y-2"
                    data-ocid={`settings.queue_proof_item.${idx + 1}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="font-mono text-xs text-foreground truncate"
                          title={String(proof.principal)}
                        >
                          {truncateText(String(proof.principal))}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              String(proof.principal),
                            );
                            toast.success("Principal copied");
                          }}
                          className="shrink-0 text-[10px] text-primary hover:underline"
                          aria-label="Copy principal"
                          data-ocid={`settings.queue_copy_principal.${idx + 1}`}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <Badge
                        className={`${statusColors[status]} text-[10px] shrink-0 ml-2`}
                      >
                        {status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-xs text-muted-foreground truncate"
                        title={proof.txHash}
                      >
                        {truncateText(proof.txHash)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(proof.txHash);
                          toast.success("Transaction hash copied");
                        }}
                        className="shrink-0 text-[10px] text-primary hover:underline"
                        aria-label="Copy transaction hash"
                        data-ocid={`settings.queue_copy_txhash.${idx + 1}`}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {proof.networkType?.toUpperCase() || "ICP"}
                      </Badge>
                      <span>
                        {TIER_NAMES[proof.tierRequested] || proof.tierRequested}
                      </span>
                      <span>·</span>
                      <span>
                        {new Date(
                          Number(proof.submittedAt) / 1_000_000,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    {isPending && (
                      <div className="flex items-center gap-2 pt-1">
                        {rejectingId === proof.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Reason for rejection"
                              className="text-xs h-8"
                              autoComplete="off"
                              data-ocid={`settings.queue_reject_reason.${idx + 1}`}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-8 text-xs"
                              disabled={
                                rejectPaymentProof.isPending ||
                                !rejectReason.trim()
                              }
                              onClick={() => {
                                rejectPaymentProof.mutate(
                                  {
                                    proofId: proof.id,
                                    reason: rejectReason.trim(),
                                  },
                                  {
                                    onSuccess: () => {
                                      setRejectingId(null);
                                      setRejectReason("");
                                    },
                                  },
                                );
                              }}
                              data-ocid={`settings.queue_confirm_reject.${idx + 1}`}
                            >
                              {rejectPaymentProof.isPending ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                "Confirm Reject"
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => {
                                setRejectingId(null);
                                setRejectReason("");
                              }}
                              data-ocid={`settings.queue_cancel_reject.${idx + 1}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                              disabled={approvePaymentProof.isPending}
                              onClick={() => {
                                approvePaymentProof.mutate(proof.id);
                              }}
                              data-ocid={`settings.queue_approve_button.${idx + 1}`}
                            >
                              {approvePaymentProof.isPending ? (
                                <Loader2 className="animate-spin mr-1" />
                              ) : (
                                <Check className="mr-1" />
                              )}
                              Approve
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                              onClick={() => {
                                setRejectingId(proof.id);
                                setRejectReason("");
                              }}
                              data-ocid={`settings.queue_reject_button.${idx + 1}`}
                            >
                              <X className="mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
