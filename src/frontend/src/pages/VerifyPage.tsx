import { NftStatus } from "@/backend";
import type { VerifyResult } from "@/backend";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useParams, useSearch } from "@tanstack/react-router";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Fingerprint,
  Hash,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

function RowWithCopy({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!value || value === "N/A" || value === "") return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-2">
        <span
          className={`text-foreground break-all ${mono ? "font-mono text-xs" : "text-sm"}`}
        >
          {value}
        </span>
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label={`Copy ${label}`}
            data-ocid="verify.copy_button"
          >
            {copied ? (
              <span className="inline-flex items-center gap-1 text-xs text-green-500">
                <Check className="w-3 h-3" /> Copied
              </span>
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        )}
      </dd>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`text-foreground break-all ${mono ? "font-mono text-xs" : "text-sm"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({ status }: { status: NftStatus }) {
  if (status === NftStatus.active) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-600 border border-green-500/20">
        Active
      </span>
    );
  }
  if (status === NftStatus.burned) {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-600 border border-orange-500/20">
        Burned
      </span>
    );
  }
  // deleted
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border">
      Deleted
    </span>
  );
}

function VerifyResultCard({ result }: { result: VerifyResult }) {
  const mintDate = new Date(
    Number(result.mintDate) / 1_000_000,
  ).toLocaleString();
  const explorerUrl = `https://dashboard.internetcomputer.org/canister/${result.canisterId}`;
  const ownerPrincipalText = result.owner ? result.owner.toString() : "";

  // Use backend-provided nftUniqueId directly. NEVER compute or reconstruct.
  const nftUniqueId =
    typeof result.nftUniqueId === "string" &&
    result.nftUniqueId.trim().length > 0
      ? result.nftUniqueId
      : "Invalid NFT Record";

  const nftReference = `${result.canisterId}:${result.tokenId.toString()}`;

  return (
    <Card className="rounded-2xl" data-ocid="verify.success_state">
      <CardContent className="pt-4 space-y-4">
        {/* Primary identifier */}
        <div className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 p-3 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#D4AF37]">
            NFT Unique ID
          </p>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[#D4AF37] break-all font-mono">
              {nftUniqueId}
            </span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(nftUniqueId)}
              className="text-[#D4AF37]/70 hover:text-[#D4AF37] transition-colors shrink-0"
              aria-label="Copy NFT Unique ID"
              data-ocid="verify.copy_nft_unique_id"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          NFT Verified
          {result.status && <StatusBadge status={result.status} />}
        </div>

        <dl className="space-y-2">
          <Row
            label="Token ID"
            value={(() => {
              if (
                result.tokenId === undefined ||
                result.tokenId === null ||
                result.tokenId === 0n
              )
                return "Pending...";
              return result.tokenId.toString();
            })()}
          />
          {ownerPrincipalText && (
            <RowWithCopy
              label="Owner Principal"
              value={ownerPrincipalText}
              mono
              copyable
            />
          )}
          <Row label="Creator ID (metadata only)" value={result.creatorId} />
          <Row label="Edition" value={result.edition} />
          <Row label="Network" value={result.network || "ICP"} />
          <Row label="Canister ID" value={result.canisterId} mono />
          <Row label="Mint Date" value={mintDate} />
          <Row label="Asset Hash" value={result.assetHash} mono />
          {result.collectionId !== undefined && (
            <Row label="Collection ID" value={result.collectionId.toString()} />
          )}
          {result.businessName && (
            <Row label="Business Name" value={result.businessName} />
          )}
          {result.website && <Row label="Website" value={result.website} />}
          {result.discountCode && (
            <Row label="Discount Code" value={result.discountCode} />
          )}
          {result.membershipId && (
            <Row label="Membership / Ticket ID" value={result.membershipId} />
          )}
        </dl>

        {/* Wallet View (ICP Native) */}
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Wallet View (ICP Native)
          </p>
          <p className="text-[10px] text-muted-foreground">
            ICP wallets only need Canister ID + Token ID
          </p>
          <RowWithCopy
            label="Canister ID"
            value={result.canisterId}
            mono
            copyable
          />
          <RowWithCopy
            label="Token ID"
            value={result.tokenId.toString()}
            mono
            copyable
          />
        </div>

        {/* Copy for Wallet Import */}
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Copy for Wallet Import
          </p>
          <RowWithCopy
            label="Collection Import String"
            value={result.canisterId}
            mono
            copyable
          />
          <RowWithCopy
            label="NFT Reference"
            value={nftReference}
            mono
            copyable
          />
        </div>

        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-primary hover:underline mt-2"
          data-ocid="verify.explorer_link"
        >
          <ExternalLink className="w-4 h-4" />
          View on ICP Explorer
        </a>
      </CardContent>
    </Card>
  );
}

function CollapsibleNftCard({
  result,
  expanded,
  onToggle,
}: {
  result: VerifyResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const nftUniqueId =
    typeof result.nftUniqueId === "string" &&
    result.nftUniqueId.trim().length > 0
      ? result.nftUniqueId
      : "Invalid NFT Record";

  const isInactive =
    result.status === NftStatus.burned || result.status === NftStatus.deleted;

  return (
    <Card
      className={`rounded-xl overflow-hidden transition-opacity duration-200 ${
        isInactive ? "opacity-60" : ""
      }`}
      data-ocid="verify.creator_nft_card"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-3 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors"
        aria-expanded={expanded}
        data-ocid="verify.creator_nft_toggle"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {nftUniqueId}
            </span>
            <span className="text-xs text-muted-foreground">
              Token {result.tokenId.toString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {result.edition}
          </span>
          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600">
            Verified
          </span>
          {result.status && <StatusBadge status={result.status} />}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? "max-h-[9999px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <CardContent className="pt-2 pb-3 px-3">
          <VerifyResultCard result={result} />
        </CardContent>
      </div>
    </Card>
  );
}

function VerifyErrorState({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive"
      data-ocid="verify.error_state"
    >
      <AlertCircle className="w-4 h-4 mr-2 inline-block" />
      {message}
    </div>
  );
}

function NotFoundState() {
  return (
    <div
      className="rounded-xl bg-muted/40 border border-border p-6 text-center"
      data-ocid="verify.empty_state"
    >
      <XCircle className="w-8 h-8 text-muted-foreground mx-auto" />
      <p className="mt-2 text-sm font-medium text-foreground">NFT not found</p>
      <p className="text-xs text-muted-foreground mt-1">
        No NFT matches this ID on the specified canister.
      </p>
    </div>
  );
}

export default function VerifyPage() {
  const { actor } = useAuth();
  const { isAdmin } = usePermissions();

  // Read ?id=canisterId:0:tokenId from URL search params
  const search = useSearch({ strict: false }) as Record<string, string>;
  const urlNftUniqueId = search.id ?? "";

  // By Creator ID state
  const [creatorId, setCreatorId] = useState("");
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [creatorResult, setCreatorResult] = useState<
    VerifyResult[] | null | undefined
  >(undefined);
  const [creatorError, setCreatorError] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  // All History toggle — admin-only, session-only
  const [showAllHistory, setShowAllHistory] = useState(false);

  // By NFT Unique ID state
  const [nftUniqueIdInput, setNftUniqueIdInput] = useState(urlNftUniqueId);
  const [nftLoading, setNftLoading] = useState(false);
  const [nftResult, setNftResult] = useState<VerifyResult | null | undefined>(
    undefined,
  );
  const [nftError, setNftError] = useState<string | null>(null);

  // Auto-trigger verification when ?id= is present in URL
  useEffect(() => {
    if (!urlNftUniqueId || !actor) return;
    setNftLoading(true);
    setNftResult(undefined);
    setNftError(null);
    actor
      .verifyNftPublic(urlNftUniqueId)
      .then((res) => {
        if (res.__kind__ === "ok") {
          setNftResult(res.ok);
        } else {
          setNftResult(null);
        }
      })
      .catch(() =>
        setNftError(
          "Verification failed. Please check the NFT Unique ID and try again.",
        ),
      )
      .finally(() => setNftLoading(false));
  }, [urlNftUniqueId, actor]);

  async function handleVerifyByCreatorId(
    e: React.FormEvent,
    forceHistory?: boolean,
  ) {
    e.preventDefault();
    if (!actor) {
      setCreatorError("Please log in to verify by Creator ID.");
      return;
    }
    const trimmed = creatorId.trim();
    if (!trimmed) {
      setCreatorError("Please enter a Creator ID.");
      return;
    }
    setCreatorLoading(true);
    setCreatorResult(undefined);
    setCreatorError(null);
    setExpandedCardId(null);
    const useHistory =
      forceHistory !== undefined ? forceHistory : showAllHistory;
    try {
      const res = useHistory
        ? await actor.verifyNftByCreatorIdWithHistory(trimmed)
        : await actor.verifyNftByCreatorId(trimmed);
      if (res.__kind__ === "ok") {
        setCreatorResult(res.ok.length > 0 ? res.ok : null);
      } else {
        setCreatorResult(null);
      }
    } catch {
      setCreatorError(
        "Verification failed. Please check the Creator ID and try again.",
      );
    } finally {
      setCreatorLoading(false);
    }
  }

  async function handleVerifyByNftId(e: React.FormEvent) {
    e.preventDefault();
    if (!actor) {
      setNftError("Please log in to verify NFTs.");
      return;
    }
    const trimmed = nftUniqueIdInput.trim();
    if (!trimmed) {
      setNftError("Please enter an NFT Unique ID.");
      return;
    }
    setNftLoading(true);
    setNftResult(undefined);
    setNftError(null);
    try {
      const res = await actor.verifyNftPublic(trimmed);
      if (res.__kind__ === "ok") {
        setNftResult(res.ok);
      } else {
        setNftResult(null);
      }
    } catch {
      setNftError(
        "Verification failed. Please check the NFT Unique ID and try again.",
      );
    } finally {
      setNftLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Verify NFT</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Confirm authenticity of any minted NFT. Log in to verify.
        </p>
      </div>

      {/* 1-2-3 step intro */}
      <div
        className="bg-card border border-border rounded-xl p-3 space-y-2 mb-4"
        data-ocid="verify.steps_section"
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Verify NFT
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-1 rounded-lg bg-primary/5 border border-primary/10 p-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              1
            </span>
            <span className="text-xs font-medium text-foreground text-center leading-tight">
              Enter NFT Unique ID
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg bg-primary/5 border border-primary/10 p-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              2
            </span>
            <span className="text-xs font-medium text-foreground text-center leading-tight">
              Fetch On-Chain Record
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg bg-primary/5 border border-primary/10 p-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              3
            </span>
            <span className="text-xs font-medium text-foreground text-center leading-tight">
              View Ownership Proof
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="creator-id" data-ocid="verify.tabs">
        <TabsList className="w-full">
          <TabsTrigger
            value="creator-id"
            className="flex-1"
            data-ocid="verify.tab.creator_id"
          >
            <Fingerprint className="w-4 h-4 mr-1.5" />
            Creator ID
          </TabsTrigger>
          <TabsTrigger
            value="nft-id"
            className="flex-1"
            data-ocid="verify.tab.nft_id"
          >
            <Hash className="w-4 h-4 mr-1.5" />
            NFT ID
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Verify by Creator ID */}
        <TabsContent value="creator-id" className="space-y-4 mt-4">
          {/* All History toggle — admin only */}
          {isAdmin && (
            <div
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
              data-ocid="verify.all_history_toggle_row"
            >
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">
                  Show All History
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Include burned &amp; deleted NFTs
                </span>
              </div>
              <Switch
                checked={showAllHistory}
                onCheckedChange={(checked) => {
                  setShowAllHistory(checked);
                  // Re-fetch if a creatorId was already searched
                  if (creatorId.trim()) {
                    setCreatorLoading(true);
                    setCreatorResult(undefined);
                    setCreatorError(null);
                    setExpandedCardId(null);
                    if (!actor) {
                      setCreatorLoading(false);
                      return;
                    }
                    const trimmed = creatorId.trim();
                    (checked
                      ? actor.verifyNftByCreatorIdWithHistory(trimmed)
                      : actor.verifyNftByCreatorId(trimmed)
                    )
                      .then((res) => {
                        if (res.__kind__ === "ok") {
                          setCreatorResult(res.ok.length > 0 ? res.ok : null);
                        } else {
                          setCreatorResult(null);
                        }
                      })
                      .catch(() =>
                        setCreatorError(
                          "Verification failed. Please try again.",
                        ),
                      )
                      .finally(() => setCreatorLoading(false));
                  }
                }}
                id="all-history-toggle"
                aria-label="Show all NFT history including burned and deleted"
                data-ocid="verify.all_history_toggle"
              />
            </div>
          )}
          <form
            onSubmit={handleVerifyByCreatorId}
            className="space-y-3"
            data-ocid="verify.creator_form"
          >
            <div>
              <Label htmlFor="creator-id-input">Creator ID</Label>
              <Input
                id="creator-id-input"
                value={creatorId}
                onChange={(e) => setCreatorId(e.target.value)}
                placeholder="ICPMS-XXXXXX-XXXX"
                required
                data-ocid="verify.creator_id_input"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={creatorLoading || !creatorId.trim()}
              data-ocid="verify.creator_submit_button"
            >
              {creatorLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Verify by Creator ID
                </>
              )}
            </Button>
          </form>
          {creatorLoading && (
            <div className="space-y-2" data-ocid="verify.loading_state">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          {creatorError && <VerifyErrorState message={creatorError} />}
          {creatorResult === null && !creatorLoading && <NotFoundState />}
          {creatorResult && creatorResult.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {showAllHistory
                  ? `${creatorResult.length} NFT(s) total (including burned and deleted)`
                  : `${creatorResult.length} active NFT(s) found`}
              </p>
              {Array.from(
                new Map(
                  creatorResult.map((r) => [r.nftUniqueId ?? r.assetHash, r]),
                ).values(),
              ).map((r) => (
                <CollapsibleNftCard
                  key={r.nftUniqueId ?? r.assetHash}
                  result={r}
                  expanded={expandedCardId === (r.nftUniqueId ?? r.assetHash)}
                  onToggle={() =>
                    setExpandedCardId((prev) =>
                      prev === (r.nftUniqueId ?? r.assetHash)
                        ? null
                        : (r.nftUniqueId ?? r.assetHash),
                    )
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Verify by NFT Unique ID */}
        <TabsContent value="nft-id" className="space-y-4 mt-4">
          <form
            onSubmit={handleVerifyByNftId}
            className="space-y-3"
            data-ocid="verify.nft_form"
          >
            <div>
              <Label htmlFor="nft-id-input">NFT Unique ID</Label>
              <Input
                id="nft-id-input"
                value={nftUniqueIdInput}
                onChange={(e) => setNftUniqueIdInput(e.target.value)}
                placeholder="e.g. vqlph-wyaaa-aaaap-qqkda-cai:0:5"
                required
                data-ocid="verify.nft_id_input"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={nftLoading || !nftUniqueIdInput.trim()}
              data-ocid="verify.nft_submit_button"
            >
              {nftLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Verify by NFT Unique ID
                </>
              )}
            </Button>
          </form>
          {nftLoading && (
            <div className="space-y-2" data-ocid="verify.loading_state">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          {nftError && <VerifyErrorState message={nftError} />}
          {nftResult === null && !nftLoading && <NotFoundState />}
          {nftResult?.canisterId && nftResult.nftUniqueId && (
            <VerifyResultCard result={nftResult} />
          )}
          {nftResult && (!nftResult.canisterId || !nftResult.nftUniqueId) && (
            <NotFoundState />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
