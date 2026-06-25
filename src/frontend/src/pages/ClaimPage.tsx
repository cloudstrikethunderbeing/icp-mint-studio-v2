import { ExternalBlob, createActor } from "@/backend";
import type { ClaimPreview } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CANISTERS } from "@/config/canisters";
import { useAuth } from "@/contexts/AuthContext";
import { addNotification } from "@/hooks/useNotifications";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Package,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

function ClaimSkeleton() {
  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm">
      <Skeleton className="w-full aspect-square rounded-2xl" />
      <div className="w-full space-y-2">
        <Skeleton className="h-6 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}

function UnavailableState() {
  const navigate = useNavigate();
  return (
    <div
      className="flex flex-col items-center gap-4 text-center max-w-xs"
      data-ocid="claim.error_state"
    >
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          NFT Not Available
        </h2>
        <p className="text-sm text-muted-foreground">
          This NFT is no longer available. The claim link may have already been
          used or is invalid.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => navigate({ to: "/" })}
        data-ocid="claim.back_home_button"
      >
        Back to Home
      </Button>
    </div>
  );
}

export default function ClaimPage() {
  const { claimToken } = useParams({ strict: false }) as {
    claimToken: string;
  };
  const { isAuthenticated, login, principal, actor, isFetching } = useAuth();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Anonymous actor for public preview — no auth required
  const anonymousActor = useMemo(() => {
    return createActor(
      CANISTERS.backend,
      async (file) => {
        const bytes = await file.getBytes();
        return bytes;
      },
      async (bytes) => {
        return ExternalBlob.fromBytes(bytes as Uint8Array<ArrayBuffer>);
      },
    );
  }, []);

  // Public preview — no auth required
  const {
    data: previewResult,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["claimPreview", claimToken],
    queryFn: async () => {
      return anonymousActor.getClaimPreview(claimToken);
    },
    enabled: !!claimToken,
    staleTime: 30_000,
    retry: 1,
  });

  const preview: ClaimPreview | null =
    previewResult?.__kind__ === "ok" ? previewResult.ok : null;
  const nft = preview?.nft ?? null;
  const supplyLimit = preview?.supplyLimit ?? 0n;
  const claimedCount = preview?.claimedCount ?? 0n;
  const remaining = supplyLimit - claimedCount;
  const isSoldOut = claimedCount >= supplyLimit;
  const isUnavailable =
    !isLoading && (isError || previewResult?.__kind__ === "err");

  async function handleClaim() {
    if (!actor || isFetching || !isAuthenticated) return;
    setIsClaiming(true);
    setClaimError(null);
    try {
      const result = await actor.claimNft(claimToken);
      if (result.__kind__ === "ok") {
        const nftUniqueId = result.ok.nftUniqueId;
        // Store minimal snapshot for navigation guard only
        sessionStorage.setItem(
          `claim_success_${claimToken}`,
          JSON.stringify({
            id: result.ok.id?.toString(),
            title: result.ok.title,
            edition: result.ok.edition,
            nftUniqueId,
            imageUrl: result.ok.imageBlob?.getDirectURL?.() ?? "",
          }),
        );
        // Force fresh metadata fetch before showing success page
        await queryClient.invalidateQueries({
          queryKey: ["nftDetail", nftUniqueId],
        });
        await queryClient.refetchQueries({
          queryKey: ["nftDetail", nftUniqueId],
          exact: true,
        });
        const claimedImageUrl =
          result.ok.imageBlob?.getDirectURL?.() ?? undefined;
        addNotification({
          type: "info",
          title: "NFT Claimed",
          message: `${result.ok.title} claimed successfully`,
          navigationTarget: "/",
          imageUrl: claimedImageUrl || undefined,
        });
        navigate({
          to: "/claim/$claimToken/success",
          params: { claimToken },
        });
      } else {
        const errMsg = result.err ?? "Unable to claim this NFT.";
        setClaimError(errMsg);
        addNotification({
          type: "critical",
          title: "Claim Failed",
          message: errMsg,
        });
      }
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setClaimError(errMsg);
      addNotification({
        type: "critical",
        title: "Claim Failed",
        message: errMsg,
      });
    } finally {
      setIsClaiming(false);
    }
  }

  const imageUrl = nft?.imageBlob.getDirectURL() ?? "";

  return (
    <div
      className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-10"
      data-ocid="claim.page"
    >
      {/* Brand mark */}
      <div className="flex items-center gap-2 mb-8 text-muted-foreground">
        <Sparkles className="w-4 h-4" />
        <span className="text-xs font-medium tracking-wide uppercase">
          ICP Mint Studio
        </span>
      </div>

      {isLoading ? (
        <ClaimSkeleton />
      ) : isUnavailable ? (
        <UnavailableState />
      ) : nft ? (
        <div
          className="flex flex-col items-center gap-6 w-full max-w-sm"
          data-ocid="claim.card"
        >
          {/* NFT image */}
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted shadow-lg">
            <img
              src={imageUrl}
              alt={nft.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
            {/* Verified badge */}
            <div className="absolute top-3 right-3">
              <Badge className="gap-1 bg-primary/90 text-primary-foreground text-[10px] px-2 py-0.5">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </Badge>
            </div>
          </div>

          {/* NFT metadata — no internal IDs exposed */}
          <div className="w-full text-center space-y-2">
            <h1 className="text-xl font-bold text-foreground">{nft.title}</h1>
            {nft.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {nft.description}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 pt-1">
              <Badge variant="secondary" className="text-xs">
                Edition {(claimedCount + 1n).toString()} of{" "}
                {supplyLimit.toString()}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                <Package className="w-3 h-3" />
                {remaining.toString()} of {supplyLimit.toString()} remaining
              </Badge>
            </div>
          </div>

          {/* Auth gate + claim action */}
          {!isAuthenticated ? (
            <div
              className="w-full space-y-3"
              data-ocid="claim.auth_gate_section"
            >
              <div className="flex items-center gap-2 justify-center text-muted-foreground text-xs">
                <Lock className="w-3.5 h-3.5" />
                <span>Connect your wallet to claim this NFT</span>
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={() => login()}
                data-ocid="claim.connect_wallet_button"
              >
                Connect Wallet to Claim
              </Button>
            </div>
          ) : (
            <div className="w-full space-y-3" data-ocid="claim.claim_section">
              <div className="flex items-center gap-2 justify-center text-muted-foreground text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span className="font-mono truncate max-w-[200px]">
                  {principal}
                </span>
              </div>

              {claimError && (
                <div
                  className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3"
                  data-ocid="claim.error_state"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{claimError}</span>
                </div>
              )}

              <Button
                type="button"
                className="w-full"
                onClick={handleClaim}
                disabled={isClaiming || !actor || isFetching || isSoldOut}
                data-ocid="claim.claim_button"
              >
                {isSoldOut ? (
                  <>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    This drop is sold out
                  </>
                ) : isClaiming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Claiming…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Claim NFT
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Trust note */}
          <p className="text-[10px] text-muted-foreground text-center">
            Ownership transfers atomically to your principal on claim.
            <br />
            This action cannot be undone.
          </p>
        </div>
      ) : null}
    </div>
  );
}
