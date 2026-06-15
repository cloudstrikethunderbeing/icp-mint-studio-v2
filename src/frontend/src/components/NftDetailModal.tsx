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
import { useNftDetailQuery, useUpdateMetadata } from "@/hooks/useQueries";
import type { RewardTier, UpdateMetadataRequest } from "@/types";
import { useState } from "react";
import { toast } from "sonner";
import "@/components/ui/select";
import "@/components/ui/textarea";

import { Check, Copy, Flame, Loader2, Pencil, Trash2 } from "lucide-react";

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
}: NftDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBurnConfirm, setShowBurnConfirm] = useState(false);

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

  if (!nft) return null;

  const imgUrl = nft.imageBlob.getDirectURL();
  const mintDate = new Date(Number(nft.mintDate) / 1_000_000).toLocaleString();

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
          // transfer UI removed; no state to reset
          setShowDeleteConfirm(false);
          setShowBurnConfirm(false);
        }
      }}
    >
      <DialogContent
        className="max-w-sm mx-4 rounded-2xl overflow-y-auto max-h-[90vh]"
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
            <img
              src={imgUrl}
              alt={nft.title}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
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
            <MetaRow label="Creator ID" value={nft.creatorId} mono />
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
            <MetaRow label="Minted" value={mintDate} />
            {nft.description && (
              <MetaRow label="Description" value={nft.description} />
            )}
            {nft.collectionId !== undefined && (
              <MetaRow
                label="Collection ID"
                value={nft.collectionId.toString()}
              />
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

          {/* Edit Metadata Button */}
          {canEditMetadata() && !showEdit && (
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
          {showEdit && (
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

          {/* Delete Section */}
          {!showDeleteConfirm ? (
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
          )}

          {/* Burn Section */}
          {!showBurnConfirm ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={() => setShowBurnConfirm(true)}
              data-ocid="nft_detail.burn_button"
            >
              <Flame className="w-4 h-4 mr-2" />
              Burn NFT (Permanent)
            </Button>
          ) : (
            <div
              className="rounded-xl border border-red-600/50 bg-red-100 dark:bg-red-950/40 p-3 space-y-2"
              aria-describedby="burn-confirm-description"
              data-ocid="nft_detail.confirm_burn"
            >
              <p className="text-sm text-red-600 font-bold">
                Permanent Destruction
              </p>
              <p
                id="burn-confirm-description"
                className="text-sm text-red-600 font-medium"
              >
                This will permanently destroy the NFT. It cannot be recovered or
                verified again.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowBurnConfirm(false)}
                  data-ocid="nft_detail.cancel_burn_button"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={isBurning}
                  onClick={async () => {
                    try {
                      await onBurn(nft.id);
                    } catch {
                      /* error handled by caller */
                    } finally {
                      setShowBurnConfirm(false);
                    }
                  }}
                  data-ocid="nft_detail.confirm_burn_button"
                >
                  {isBurning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Burn"
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
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`text-foreground break-all ${
          mono ? "font-mono text-xs" : "text-sm"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
