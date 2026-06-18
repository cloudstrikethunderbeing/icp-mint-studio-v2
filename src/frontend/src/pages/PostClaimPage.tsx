import {
  type AuditEntry,
  ExternalBlob,
  type Nft,
  type NftStatus,
  type RewardTier,
} from "@/backend";
import { NftDetailModal } from "@/components/NftDetailModal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Principal } from "@icp-sdk/core/principal";
import { useNavigate, useParams } from "@tanstack/react-router";
import { CheckCircle2, Sparkles, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function PostClaimPage() {
  const navigate = useNavigate();
  const { claimToken } = useParams({ strict: false }) as {
    claimToken: string;
  };

  const [modalOpen, setModalOpen] = useState(false);

  // Read claimed NFT snapshot from sessionStorage (written by ClaimPage on success)
  const claimedNftSnapshot = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(`claim_success_${claimToken}`);
      if (!raw) return null;
      return JSON.parse(raw) as {
        id: string;
        title: string;
        edition: string;
        nftUniqueId: string;
        imageUrl: string;
      };
    } catch {
      return null;
    }
  }, [claimToken]);

  const claimedNft = claimedNftSnapshot;

  // Guard: if no snapshot present (direct URL access), redirect to /collector
  useEffect(() => {
    if (!claimedNft) {
      navigate({ to: "/collector" });
    }
  }, [claimedNft, navigate]);

  // Build a minimal Nft object from the snapshot so NftDetailModal can render
  const minimalNft = useMemo(() => {
    if (!claimedNft) return null;
    const mockPrincipal = {
      toString: () => claimedNft.nftUniqueId?.split(":")[2] ?? "",
      toText: () => claimedNft.nftUniqueId?.split(":")[2] ?? "",
    };
    return {
      id: BigInt(claimedNft.id ?? 0),
      title: claimedNft.title,
      edition: claimedNft.edition,
      nftUniqueId: claimedNft.nftUniqueId,
      imageBlob: ExternalBlob.fromURL(
        claimedNft.imageUrl ?? "",
      ) as ExternalBlob,
      ownerId: mockPrincipal as unknown as Principal,
      creatorId: claimedNft.nftUniqueId?.split(":")[2] ?? "",
      mintDate: 0n,
      description: "",
      businessName: "",
      website: "",
      discountCode: "",
      membershipId: "",
      rewardTier: "none" as RewardTier,
      status: "active" as NftStatus,
      auditHistory: [] as AuditEntry[],
      assetHash: "",
      tags: [],
      collectionId: undefined,
    } as unknown as Nft;
  }, [claimedNft]);

  if (!claimedNft) return null;

  const imageUrl = claimedNft.imageUrl ?? "";

  function handleViewNft() {
    setModalOpen(true);
  }

  function handleGoToWallet() {
    navigate({ to: "/collector" });
  }

  return (
    <>
      {minimalNft && (
        <NftDetailModal
          nft={minimalNft}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onDelete={() => {}}
          onBurn={async () => {}}
          callerPrincipal={claimedNft.nftUniqueId?.split(":")[2] ?? ""}
          canisterId={claimedNft.nftUniqueId?.split(":")[0] ?? ""}
          nftUniqueId={claimedNft.nftUniqueId}
          readOnly={true}
        />
      )}
      <div
        className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-10"
        data-ocid="post_claim.page"
      >
        {/* Success header */}
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-primary" />
          </div>
          <div className="space-y-1">
            <h1
              className="text-2xl font-bold text-foreground"
              data-ocid="post_claim.success_heading"
            >
              NFT Claimed!
            </h1>
            <p className="text-sm text-muted-foreground">
              The NFT is now in your wallet.
            </p>
          </div>
        </div>

        {/* NFT preview card */}
        <div
          className="w-full max-w-xs mb-8"
          data-ocid="post_claim.nft_preview_card"
        >
          <Card className="overflow-hidden">
            <div className="aspect-square bg-muted overflow-hidden">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={claimedNft.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <CardContent className="p-4 space-y-2">
              <h2 className="font-semibold text-foreground truncate">
                {claimedNft.title}
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Edition {claimedNft.edition}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="max-w-xs w-full mb-6" />

        {/* Action cards */}
        <div
          className="flex flex-col gap-3 w-full max-w-xs"
          data-ocid="post_claim.actions_section"
        >
          {/* View My NFT */}
          <button
            type="button"
            className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-accent transition-colors text-left cursor-pointer"
            onClick={handleViewNft}
            data-ocid="post_claim.view_nft_button"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm">View NFT</p>
              <p className="text-xs text-muted-foreground">Open this NFT</p>
            </div>
          </button>

          {/* Go to Wallet */}
          <button
            type="button"
            className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-accent transition-colors text-left cursor-pointer"
            onClick={handleGoToWallet}
            data-ocid="post_claim.go_to_wallet_button"
          >
            <div className="w-10 h-10 rounded-lg bg-secondary/30 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm">
                My Library
              </p>
              <p className="text-xs text-muted-foreground">View all NFTs</p>
            </div>
          </button>

          {/* Unlock Creator Studio removed — per spec, only available in Settings/Profile */}
        </div>
      </div>
    </>
  );
}
