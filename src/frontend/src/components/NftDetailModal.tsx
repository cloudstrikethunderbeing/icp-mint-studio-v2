import type { Nft, VerifyResult } from "@/backend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAddNftToCollection,
  useCollections,
  useGenerateClaimLink,
  useGetClaimStatus,
  useNftDetailQuery,
  useRemoveNftFromCollection,
  useUpdateMetadata,
} from "@/hooks/useQueries";
import type { RewardTier, UpdateMetadataRequest } from "@/types";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import "@/components/ui/select";
import "@/components/ui/textarea";

import { useAuth } from "@/contexts/AuthContext";
import {
  Check,
  Copy,
  ExternalLink,
  Flame,
  FolderOpen,
  Link,
  Loader2,
  Minus,
  Pencil,
  Trash2,
} from "lucide-react";

interface NftDetailModalProps {
  nft: Nft | null;
  open: boolean;
  onClose: () => void;
  onDelete: (id: bigint) => void;
  onBurn: (id: bigint) => Promise<void>;
  callerPrincipal: string;
  canisterId: string;
  nftUniqueId?: string;
  isDeleting?: boolean;
  isBurning?: boolean;
  /** When true, suppresses all write actions (collection assign, delete, burn, edit). Collector-only view. */
  readOnly?: boolean;
  /** Optional direct image URL string. Used as fallback when imageBlob is not available (e.g. claimed NFTs). */
  imageUrl?: string;
}

export function NftDetailModal({
  nft,
  open,
  onClose,
  onDelete,
  onBurn,
  isDeleting,
  isBurning,
  callerPrincipal,
  canisterId: _canisterId,
  nftUniqueId: _nftUniqueId,
  readOnly = false,
  imageUrl: imageUrlProp,
}: NftDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBurnStep1, setShowBurnStep1] = useState(false);
  const [burnConfirmText, setBurnConfirmText] = useState("");
  // Top-level error state for graceful fallback on unexpected field-access throws
  const [renderError, setRenderError] = useState(false);

  // Metadata edit state
  const [showEdit, setShowEdit] = useState(false);
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editDiscountCode, setEditDiscountCode] = useState("");
  const [editMembershipId, setEditMembershipId] = useState("");
  const [editRewardTier, setEditRewardTier] = useState<RewardTier>("none");
  const [editTags, setEditTags] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const [verifyLinkCopied, setVerifyLinkCopied] = useState(false);

  // Claim link state (admin only)
  const { isAdmin } = useAuth();
  const canGenerateClaimLink = isAdmin;
  const [claimUrlCopied, setClaimUrlCopied] = useState(false);
  const [generatedClaimPath, setGeneratedClaimPath] = useState<string | null>(
    null,
  );

  // Collection assignment state
  const [selectedCollectionId, setSelectedCollectionId] =
    useState<string>("none");

  // Reset all modal-local state when the NFT changes (prevents stale state on second open)

  const nftId = nft?.id;
  // biome-ignore lint/correctness/useExhaustiveDependencies: we intentionally reset only when nft.id changes
  useEffect(() => {
    setGeneratedClaimPath(null);
    setClaimUrlCopied(false);
    setVerifyLinkCopied(false);
    setSelectedCollectionId("none");
    setCollectionActionError(null);
    setClaimLinkError(null);
    setShowDeleteConfirm(false);
    setShowBurnStep1(false);
    setBurnConfirmText("");
    setShowEdit(false);
    setEditError(null);
    setEditSuccess(false);
  }, [nftId]);
  const [collectionActionError, setCollectionActionError] = useState<
    string | null
  >(null);

  // Fetch canonical NFT record from backend using nft.nftUniqueId via useQuery
  const nftUniqueId = nft?.nftUniqueId;
  const {
    data: verifyResult,
    isLoading: verifyLoading,
    isError: verifyError,
    isPending: verifyPending,
    isFetching: verifyFetching,
  } = useNftDetailQuery(nftUniqueId);

  // NOTE: panel state reset is handled by the key prop on NftDetailModal in HomePage.tsx
  // which remounts the component when a different NFT is selected.

  const updateMetadata = useUpdateMetadata();
  const { data: collections } = useCollections();
  const addToCollection = useAddNftToCollection();
  const removeFromCollection = useRemoveNftFromCollection();
  const generateClaimLink = useGenerateClaimLink();
  const [claimLinkError, setClaimLinkError] = useState<string | null>(null);
  // Fetch existing claim status for this NFT (admin only, only when modal is open)
  const { data: claimStatusData, isLoading: claimStatusLoading } =
    useGetClaimStatus(
      !readOnly && nft ? nft.id : undefined,
      !readOnly && !!nft && !!nft.id,
    );

  const imgUrl = useMemo(() => {
    // Prefer direct imageUrl string prop (used for claimed NFTs where imageBlob is not available)
    if (imageUrlProp) return imageUrlProp;
    if (!nft?.imageBlob || typeof nft.imageBlob.getDirectURL !== "function")
      return "";
    try {
      return nft.imageBlob.getDirectURL();
    } catch {
      return "";
    }
  }, [imageUrlProp, nft?.imageBlob]);

  const mintDate = useMemo(() => {
    // Prefer fresh verifyResult data over stale nft prop
    const rawMint =
      (verifyResult as unknown as { mintDate?: bigint })?.mintDate ??
      nft?.mintDate;
    if (!rawMint || rawMint === 0n) return "Unknown (legacy record)";
    const ts = Number(rawMint);
    if (!Number.isFinite(ts) || ts <= 0) return "Unknown (legacy record)";
    try {
      return new Date(ts / 1_000_000).toLocaleString();
    } catch {
      return "Unknown (legacy record)";
    }
  }, [nft?.mintDate, verifyResult]);

  const claimedDate = useMemo(() => {
    // Prefer fresh verifyResult data over stale nft prop
    const raw =
      (verifyResult as unknown as { claimedAt?: [] | [bigint] | bigint | null })
        ?.claimedAt ??
      (nft as unknown as { claimedAt?: [] | [bigint] | bigint | null })
        ?.claimedAt;
    if (!raw) return null;
    // Handle Motoko optional array form: [] | [bigint]
    let val: bigint | null = null;
    if (Array.isArray(raw)) {
      val = raw.length > 0 ? (raw[0] as bigint) : null;
    } else if (typeof raw === "bigint") {
      val = raw;
    }
    if (!val || val === 0n) return null;
    const ts = Number(val);
    if (!Number.isFinite(ts) || ts <= 0) return null;
    try {
      return new Date(ts / 1_000_000).toLocaleString();
    } catch {
      return null;
    }
  }, [nft, verifyResult]);

  if (!nft) return null;

  if (renderError) {
    return (
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setRenderError(false);
            onClose();
          }
        }}
      >
        <DialogContent
          className="max-w-[min(24rem,95vw)] mx-auto rounded-2xl"
          data-ocid="nft_detail.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-display">
              Unable to load NFT
            </DialogTitle>
            <DialogDescription className="sr-only">
              Error loading NFT details.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Something went wrong loading this NFT. Please try again.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRenderError(false);
                onClose();
              }}
              data-ocid="nft_detail.close_button"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  let isOwner: boolean;
  try {
    isOwner = callerPrincipal === (nft.ownerId?.toString() ?? "");
  } catch {
    isOwner = false;
  }
  const currentCollection = collections?.find((c) => c.id === nft.collectionId);

  function canEditMetadata() {
    if (!nft) return false;
    const ownerId = nft.ownerId?.toString() ?? "";
    return callerPrincipal === ownerId;
  }

  function openEdit() {
    if (!nft) return;
    setEditBusinessName(nft.businessName ?? "");
    setEditWebsite(nft.website ?? "");
    setEditDiscountCode(nft.discountCode ?? "");
    setEditMembershipId(nft.membershipId ?? "");
    setEditRewardTier((nft.rewardTier as RewardTier) ?? "none");
    setEditTags((nft.tags ?? []).join(", "));
    setEditError(null);
    setEditSuccess(false);
    setShowEdit(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nft) return;
    setEditError(null);
    setEditSuccess(false);
    const updates: UpdateMetadataRequest = {
      businessName: editBusinessName || undefined,
      website: editWebsite || undefined,
      discountCode: editDiscountCode || undefined,
      membershipId: editMembershipId || undefined,
      rewardTier: editRewardTier === "none" ? undefined : editRewardTier,
      tags: editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    try {
      await updateMetadata.mutateAsync({ nftId: nft.id, updates });
      setEditSuccess(true);
      setTimeout(() => {
        setShowEdit(false);
        setEditSuccess(false);
      }, 1500);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Metadata update failed.",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="max-w-[min(24rem,95vw)] mx-auto rounded-2xl overflow-y-auto max-h-[90vh] overflow-x-hidden"
        data-ocid="nft_detail.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-display truncate pr-6">
            {nft.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            NFT details, metadata, and actions for {nft.title}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image */}
          <div className="aspect-square rounded-xl overflow-hidden bg-muted">
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={nft.title}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                No image
              </div>
            )}
          </div>

          {/* Metadata */}
          <dl className="space-y-2">
            {/* Unique ID — backend-provided only, never computed */}
            <MetaRow
              label="Unique ID"
              value={
                verifyLoading ||
                verifyPending ||
                verifyFetching ||
                !verifyResult
                  ? "Loading..."
                  : verifyError || !verifyResult?.nftUniqueId
                    ? "NFT NOT FOUND"
                    : verifyResult.nftUniqueId
              }
              mono
            />
            {verifyResult?.nftUniqueId && !verifyLoading && !verifyError && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(verifyResult.nftUniqueId);
                  setVerifyLinkCopied(true);
                  setTimeout(() => setVerifyLinkCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                data-ocid="nft_detail.copy_unique_id_button"
              >
                {verifyLinkCopied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy Unique ID
                  </>
                )}
              </button>
            )}
            <MetaRow
              label="Token ID"
              value={(() => {
                const raw = nft.id;
                if (raw === undefined || raw === null || raw === 0n)
                  return "Pending...";
                return raw.toString();
              })()}
            />
            <MetaRow
              label="Creator ID"
              value={
                (verifyResult as unknown as { creatorId?: string })
                  ?.creatorId ?? nft.creatorId
              }
              mono
            />
            {verifyResult?.canisterId && (
              <MetaRow
                label="Canister ID"
                value={verifyResult.canisterId}
                mono
              />
            )}
            {verifyResult?.owner && (
              <MetaRow
                label="Owner Principal"
                value={verifyResult.owner.toString()}
                mono
              />
            )}
            <MetaRow label="Edition" value={nft.edition} />
            <MetaRow
              label="Minted"
              value={
                mintDate === "Unknown (legacy record)"
                  ? "Minted: Unknown (legacy record)"
                  : mintDate
              }
            />
            {claimedDate && <MetaRow label="Claimed" value={claimedDate} />}
            {nft.description && (
              <MetaRow label="Description" value={nft.description} />
            )}
            {/* Collection Section */}
            {isOwner && !readOnly && (
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-primary" />
                  Collection
                </p>

                {currentCollection ? (
                  <div className="space-y-2">
                    <MetaRow label="Current" value={currentCollection.name} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                      disabled={removeFromCollection.isPending}
                      onClick={async () => {
                        setCollectionActionError(null);
                        try {
                          await removeFromCollection.mutateAsync({
                            nftId: nft.id,
                            collectionId: nft.collectionId!,
                          });
                          setTimeout(() => {
                            onClose();
                          }, 800);
                        } catch (err) {
                          setCollectionActionError(
                            err instanceof Error
                              ? err.message
                              : "Remove failed",
                          );
                        }
                      }}
                      data-ocid="nft_detail.remove_from_collection_button"
                    >
                      {removeFromCollection.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Remove from Collection
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={selectedCollectionId}
                      onChange={(e) => {
                        setSelectedCollectionId(e.target.value);
                        setCollectionActionError(null);
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                      data-ocid="nft_detail.collection_select"
                    >
                      <option value="none">Select a collection...</option>
                      {(collections ?? []).map((col) => (
                        <option
                          key={col.id.toString()}
                          value={col.id.toString()}
                        >
                          {col.name} ({col.nftCount.toString()} /{" "}
                          {col.maxSize.toString()})
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      disabled={
                        !selectedCollectionId ||
                        selectedCollectionId === "none" ||
                        addToCollection.isPending
                      }
                      onClick={async () => {
                        setCollectionActionError(null);
                        try {
                          await addToCollection.mutateAsync({
                            nftId: nft.id,
                            collectionId: BigInt(selectedCollectionId),
                          });
                          setSelectedCollectionId("none");
                          setTimeout(() => {
                            onClose();
                          }, 800);
                        } catch (err) {
                          setCollectionActionError(
                            err instanceof Error
                              ? err.message
                              : "Assign failed",
                          );
                        }
                      }}
                      data-ocid="nft_detail.assign_collection_button"
                    >
                      {addToCollection.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Assign to Collection
                    </Button>
                  </div>
                )}
                {collectionActionError && (
                  <p
                    className="text-xs text-destructive"
                    data-ocid="nft_detail.collection_error_state"
                  >
                    {collectionActionError}
                  </p>
                )}
              </div>
            )}
            {/* Read-only: show collection name label for collectors */}
            {readOnly && currentCollection && (
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-primary" />
                  Collection
                </p>
                <MetaRow label="Name" value={currentCollection.name} />
              </div>
            )}
            {nft.businessName && (
              <MetaRow label="Business Name" value={nft.businessName} />
            )}
            {nft.website && <MetaRow label="Website" value={nft.website} />}
            {nft.discountCode && (
              <MetaRow label="Discount Code" value={nft.discountCode} />
            )}
            {nft.membershipId && (
              <MetaRow
                label="Membership / Ticket ID"
                value={nft.membershipId}
              />
            )}
            {nft.rewardTier && nft.rewardTier !== "none" && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">Reward Tier</dt>
                <dd>
                  <span
                    className={`reward-tier-badge reward-tier-${nft.rewardTier}`}
                    data-ocid="nft_detail.reward_tier_badge"
                  >
                    {nft.rewardTier}
                  </span>
                </dd>
              </div>
            )}
            {nft.tags && nft.tags.length > 0 && (
              <MetaRow label="Tags" value={nft.tags.join(", ")} />
            )}
          </dl>

          {/* ── Claim Link Section — admin or paid tiers only ───────────── */}
          {!readOnly && canGenerateClaimLink && (
            <div
              className="rounded-xl border border-border bg-muted/30 p-3 space-y-2"
              data-ocid="nft_detail.claim_link_section"
            >
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-primary" />
                Claim Link
              </p>

              {/* Already claimed badge */}
              {claimStatusData?.claimed ? (
                <div className="space-y-1.5">
                  <div
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/15 border border-green-500/30 text-green-500 text-[11px] font-medium"
                    data-ocid="nft_detail.claim_already_claimed_badge"
                  >
                    <Check className="w-3 h-3" />
                    Already Claimed
                  </div>
                  {claimStatusData.claimedBy && (
                    <p className="text-[11px] text-muted-foreground font-mono break-all">
                      by {claimStatusData.claimedBy.toString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Status line */}
                  <p className="text-[11px] text-muted-foreground">
                    {claimStatusData?.token || generatedClaimPath
                      ? "Active — Not yet claimed"
                      : claimStatusLoading
                        ? "Checking claim status..."
                        : "No claim link generated"}
                  </p>

                  {/* Derive the resolved claim URL — prefer freshly generated path, fall back to existing token */}
                  <ClaimUrlDisplay
                    claimStatusData={claimStatusData}
                    generatedClaimPath={generatedClaimPath}
                    claimUrlCopied={claimUrlCopied}
                    setClaimUrlCopied={setClaimUrlCopied}
                  />

                  {/* Generate button — only shown when no token exists yet AND claim status has resolved AND user has permission */}
                  {!claimStatusLoading &&
                    !claimStatusData?.token &&
                    !generatedClaimPath &&
                    canGenerateClaimLink && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={generateClaimLink.isPending}
                        onClick={async () => {
                          setClaimLinkError(null);
                          try {
                            const path = await generateClaimLink.mutateAsync(
                              nft.id,
                            );
                            if (path && typeof path === "string") {
                              setGeneratedClaimPath(path);
                            }
                          } catch (err) {
                            // If the backend says a token already exists, just refresh status
                            // rather than showing a raw error — never propagate to error boundary
                            const msg = err instanceof Error ? err.message : "";
                            if (
                              msg.toLowerCase().includes("already") ||
                              msg.toLowerCase().includes("exists")
                            ) {
                              // Token already exists — status query will populate the URL
                              setClaimLinkError(null);
                            } else {
                              setClaimLinkError(
                                msg || "Failed to generate claim link.",
                              );
                            }
                          }
                        }}
                        data-ocid="nft_detail.generate_claim_link_button"
                      >
                        {generateClaimLink.isPending ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                            Generate Claim Link
                          </>
                        )}
                      </Button>
                    )}

                  {(claimLinkError || generateClaimLink.isError) && (
                    <p
                      className="text-[11px] text-destructive"
                      data-ocid="nft_detail.claim_link_error_state"
                    >
                      {claimLinkError ??
                        (generateClaimLink.error instanceof Error
                          ? generateClaimLink.error.message
                          : "Failed to generate claim link.")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Edit Metadata Button — hidden for read-only/collector view */}
          {!readOnly && canEditMetadata() && !showEdit && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={openEdit}
              data-ocid="nft_detail.edit_metadata_button"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Business Metadata
            </Button>
          )}

          {/* Edit Metadata Form */}
          {!readOnly && showEdit && (
            <form
              onSubmit={handleEditSubmit}
              className="space-y-3 border border-border rounded-xl p-3"
              data-ocid="nft_detail.edit_form"
            >
              <p className="text-xs font-semibold text-foreground">
                Edit Business Metadata
              </p>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Business Name
                </Label>
                <Input
                  value={editBusinessName}
                  onChange={(e) => setEditBusinessName(e.target.value)}
                  placeholder="Business name"
                  className="text-xs"
                  data-ocid="nft_detail.edit_business_name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Website</Label>
                <Input
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://..."
                  className="text-xs"
                  data-ocid="nft_detail.edit_website"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Discount Code
                </Label>
                <Input
                  value={editDiscountCode}
                  onChange={(e) => setEditDiscountCode(e.target.value)}
                  placeholder="e.g. SUMMER20"
                  className="text-xs"
                  data-ocid="nft_detail.edit_discount_code"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Membership / Ticket ID
                </Label>
                <Input
                  value={editMembershipId}
                  onChange={(e) => setEditMembershipId(e.target.value)}
                  placeholder="Membership ID"
                  className="text-xs"
                  data-ocid="nft_detail.edit_membership_id"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Reward Tier
                </Label>
                <select
                  value={editRewardTier}
                  onChange={(e) =>
                    setEditRewardTier(e.target.value as RewardTier)
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                  data-ocid="nft_detail.edit_reward_tier"
                >
                  <option value="none">None</option>
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Tags (comma-separated)
                </Label>
                <Input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                  className="text-xs"
                  data-ocid="nft_detail.edit_tags"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowEdit(false)}
                  data-ocid="nft_detail.edit_cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1"
                  disabled={updateMetadata.isPending}
                  data-ocid="nft_detail.edit_save_button"
                >
                  {updateMetadata.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
              {editError && (
                <p
                  className="text-xs text-destructive"
                  data-ocid="nft_detail.edit_error_state"
                >
                  {editError}
                </p>
              )}
              {editSuccess && (
                <p
                  className="text-xs text-green-600"
                  data-ocid="nft_detail.edit_success_state"
                >
                  Metadata updated successfully!
                </p>
              )}
            </form>
          )}

          {/* Delete Section — hidden for read-only/collector view */}
          {!readOnly && !showDeleteConfirm ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
              data-ocid="nft_detail.delete_button"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete NFT
            </Button>
          ) : (
            !readOnly && (
              <div
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2"
                aria-describedby="delete-confirm-description"
                data-ocid="nft_detail.confirm_delete"
              >
                <p
                  id="delete-confirm-description"
                  className="text-sm text-destructive font-medium"
                >
                  Delete this NFT? The record is retained in audit logs.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                    data-ocid="nft_detail.cancel_delete_button"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    disabled={isDeleting}
                    onClick={() => {
                      onDelete(nft.id);
                      setShowDeleteConfirm(false);
                      onClose();
                    }}
                    data-ocid="nft_detail.confirm_delete_button"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Delete"
                    )}
                  </Button>
                </div>
              </div>
            )
          )}

          {/* Burn Section — two-step confirmation; hidden for read-only/collector view */}
          {!readOnly && !showBurnStep1 && (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={() => setShowBurnStep1(true)}
              data-ocid="nft_detail.burn_button"
            >
              <Flame className="w-4 h-4 mr-2" />
              Burn NFT (Permanent)
            </Button>
          )}
          {!readOnly && showBurnStep1 && (
            <div
              className="rounded-xl border border-red-600/50 bg-red-50 dark:bg-red-950/40 p-4 space-y-3"
              aria-describedby="burn-confirm-description"
              data-ocid="nft_detail.confirm_burn"
            >
              <div className="flex items-start gap-2">
                <Flame className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                  <p className="text-sm text-red-600 font-bold leading-tight">
                    Permanent Destruction
                  </p>
                  <p
                    id="burn-confirm-description"
                    className="text-xs text-red-600/80"
                  >
                    This action is permanent and cannot be undone. The NFT will
                    be destroyed and can never be recovered or verified again.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="burn-confirm-input"
                  className="text-xs font-medium text-red-700 dark:text-red-400"
                >
                  Type{" "}
                  <span className="font-mono font-bold tracking-widest">
                    BURN
                  </span>{" "}
                  to confirm
                </Label>
                <Input
                  id="burn-confirm-input"
                  value={burnConfirmText}
                  onChange={(e) => setBurnConfirmText(e.target.value)}
                  placeholder="BURN"
                  className="text-sm font-mono border-red-300 focus-visible:ring-red-500 dark:border-red-800"
                  autoComplete="off"
                  spellCheck={false}
                  data-ocid="nft_detail.burn_confirm_input"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setShowBurnStep1(false);
                    setBurnConfirmText("");
                  }}
                  data-ocid="nft_detail.cancel_burn_button"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                  disabled={burnConfirmText !== "BURN" || isBurning}
                  onClick={async () => {
                    try {
                      await onBurn(nft.id);
                      onClose();
                    } catch {
                      /* error handled by caller */
                    } finally {
                      setShowBurnStep1(false);
                      setBurnConfirmText("");
                    }
                  }}
                  data-ocid="nft_detail.confirm_burn_button"
                >
                  {isBurning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Confirm Burn"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`text-foreground break-all min-w-0 ${
          mono ? "font-mono text-xs" : "text-sm"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function ClaimUrlDisplay({
  claimStatusData,
  generatedClaimPath,
  claimUrlCopied,
  setClaimUrlCopied,
}: {
  claimStatusData?: {
    token?: string;
    claimed?: boolean;
    claimedBy?: { toString(): string };
  } | null;
  generatedClaimPath: string | null;
  claimUrlCopied: boolean;
  setClaimUrlCopied: (v: boolean) => void;
}) {
  const existingToken =
    typeof claimStatusData?.token === "string" &&
    claimStatusData.token.length > 0
      ? claimStatusData.token
      : null;
  const resolvedUrl = useMemo(() => {
    if (generatedClaimPath) return window.location.origin + generatedClaimPath;
    if (existingToken)
      return `${window.location.origin}/claim/${existingToken}`;
    return null;
  }, [generatedClaimPath, existingToken]);

  if (!resolvedUrl) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5">
        <span className="flex-1 text-[11px] font-mono text-foreground break-all min-w-0">
          {resolvedUrl}
        </span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(resolvedUrl);
            setClaimUrlCopied(true);
            setTimeout(() => setClaimUrlCopied(false), 2000);
          }}
          className="shrink-0 p-1 rounded hover:bg-accent transition-colors"
          aria-label="Copy claim URL"
        >
          {claimUrlCopied ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      </div>
      {claimUrlCopied && <p className="text-[10px] text-green-500">Copied!</p>}
    </div>
  );
}
