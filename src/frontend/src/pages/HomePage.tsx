import { ExternalBlob } from "@/backend";
import { type CollectionWithCount, type Nft, RewardType } from "@/backend";
import { NftDetailModal } from "@/components/NftDetailModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import {
  useAdminSetNftReferralThreshold,
  useAdminSetNftRewardType,
  useBackendHealth,
  useCreateSlot,
  useGenerateClaimLink,
  useSearchNfts,
} from "@/hooks/useQueries";
import { devLog } from "@/utils/devLog";
import { fileWithVerifiedImageType } from "@/utils/imageMagic";
import { resolveNftImageUrl } from "@/utils/nftNormalization";
import { sanitizePng } from "@/utils/sanitizePng";

import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Hammer,
  ImageOff,
  Info,
  Loader2,
  Plus,
  Search,
  ServerCrash,
  Share2,
  ShieldAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import BrandedAuthGate from "../components/BrandedAuthGate";
import { useMyActiveNfts } from "../hooks/useQueries";

// [PAGE] Non-admin Studio grid page size. The grid renders this many NFT
// slots plus one upload slot on the first page (a 3x3 grid), and pages through
// the active feed via the paginated listing hook.
const STUDIO_PAGE_SIZE = 8;
const STUDIO_SLOT_COUNT = STUDIO_PAGE_SIZE + 1; // +1 upload slot on page 1

// [ADMIN-PAGE] Build the admin grid for one page of NFTs. The upload/mint slot
// is rendered only when `includeUpload` is true (the first page), so it is not
// repeated on later pages. The grid is no longer capped at 8 NFT slots: the
// page window is driven by the shared Studio pagination state, so the admin
// feed pages through every active NFT.
function buildAdminGrid(nfts: Nft[], includeUpload: boolean): GridSlot[] {
  if (!Array.isArray(nfts)) {
    return [];
  }
  const safeNfts = nfts.filter((item): item is Nft => item != null);
  const slots: GridSlot[] = [];
  let nftIdx = 0;
  const slotCount = safeNfts.length + (includeUpload ? 1 : 0);
  for (let i = 0; i < slotCount; i++) {
    if (includeUpload && i === 0) {
      slots.push({ kind: "upload" });
    } else if (nftIdx < safeNfts.length) {
      slots.push({ kind: "nft", nft: safeNfts[nftIdx++] });
    }
  }
  return slots;
}

async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

type GridSlot =
  | { kind: "nft"; nft: Nft }
  | { kind: "upload" }
  | { kind: "empty" };

type MintParams = {
  file: File;
  title: string;
  description: string;
  collectionId?: bigint;
  businessName?: string;
  website?: string;
  discountCode?: string;
  membershipId?: string;
  supplyLimit?: bigint;
  rewardType?: RewardType;
  referralThreshold?: bigint;
  priceUsd?: bigint;
};

// [PAGE] Build the non-admin grid for one page of NFTs. The slot count is
// derived from the page size instead of a hardcoded 9, so the grid grows with
// the pagination window. The upload slot sits at the center of the FIRST page
// only; later pages are pure NFT/empty slots so the mint affordance is not
// repeated on every page.
function buildGrid(
  nfts: Nft[],
  slotCount: number,
  includeUpload: boolean,
): GridSlot[] {
  // Defensive filter: skip any null/undefined items that slipped through
  const safeNfts = nfts.filter((item): item is Nft => item != null);
  const slots: GridSlot[] = [];
  let nftIdx = 0;
  const uploadIdx = includeUpload ? Math.floor(slotCount / 2) : -1;
  for (let i = 0; i < slotCount; i++) {
    if (i === uploadIdx) {
      slots.push({ kind: "upload" });
    } else if (nftIdx < safeNfts.length) {
      slots.push({ kind: "nft", nft: safeNfts[nftIdx++] });
    } else {
      slots.push({ kind: "empty" });
    }
  }
  return slots;
}

function EmptySlot({ idx }: { idx: number }) {
  return (
    <div
      className="aspect-square rounded-xl border-2 border-dashed border-border/40 bg-muted/20"
      data-ocid={`home.empty_slot.${idx}`}
    />
  );
}

function NftGridCard({
  nft,
  slotNumber,
  onSelect,
  isDeleting,
  isBurning,
  isNewlyMinted,
}: {
  nft: Nft;
  slotNumber: number;
  onSelect: (nft: Nft) => void;
  isDeleting?: boolean;
  isBurning?: boolean;
  isNewlyMinted?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  // [IMG-RESOLVE] Read the resolved synchronous `directURL` field via the
  // shared helper — `getDirectURL()` is async and would yield a Promise here.
  const imgUrl = resolveNftImageUrl(nft.imageBlob);
  const handleClick = useCallback(() => onSelect(nft), [onSelect, nft]);

  const deleting = isDeleting ?? false;
  const burning = isBurning ?? false;
  // [IMG-RESOLVE] Treat an empty resolved URL as a failed image so the card
  // renders its placeholder immediately instead of mounting an <img src="">
  // that only falls back after a load error.
  const showPlaceholder = imgError || imgUrl === "";

  return (
    <div
      className={`rounded-xl overflow-hidden bg-card border border-border group transition-all duration-300 ease-out ${
        deleting || burning
          ? "opacity-0 scale-95"
          : isNewlyMinted
            ? "animate-nft-enter"
            : ""
      } ${burning ? "ring-2 ring-red-500" : ""}`}
      data-ocid={`home.nft_card.item.${slotNumber}`}
    >
      <button
        type="button"
        className="relative block w-full aspect-square bg-muted cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={handleClick}
        aria-label={`View NFT: ${nft.title}`}
      >
        {burning && (
          <div className="absolute inset-0 bg-red-500/30 z-10 pointer-events-none transition-opacity duration-300" />
        )}
        {showPlaceholder ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted">
            <ImageOff className="text-muted-foreground text-xl" />
            <span className="text-xs text-muted-foreground">No image</span>
          </div>
        ) : (
          <img
            src={imgUrl}
            alt={nft.title}
            className="absolute inset-0 w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        )}
      </button>
      <div className="price-strip">
        <span className="price-strip-label">Price</span>
        <span
          className="price-strip-value"
          data-state={nft.priceUsd === undefined ? "unlisted" : "listed"}
          data-ocid={`home.nft_price.${slotNumber}`}
        >
          {nft.priceUsd !== undefined
            ? `$${nft.priceUsd.toString()}`
            : "Not for sale"}
        </span>
      </div>
    </div>
  );
}

function UploadCard({
  collections,
  onMint,
  isMinting,
  mintError,
  setMintError,
  mintSuccessSignal,
  mintDialogOpen,
  setMintDialogOpen,
  isAuthenticated,
  actor,
  isAdmin,
}: {
  collections: CollectionWithCount[];
  onMint: (params: MintParams) => void;
  isMinting: boolean;
  uploadProgress: number;
  mintError: string | null;
  setMintError: (err: string | null) => void;
  mintSuccessSignal: number;
  mintDialogOpen: boolean;
  setMintDialogOpen: (v: boolean) => void;
  isAuthenticated: boolean;
  actor: unknown;
  isAdmin?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // Ref holding the current blob: URL so we can revoke it before creating a
  // new one, on reset, on dialog close, and on unmount. This prevents the
  // preview image bytes from lingering in memory after the preview is closed
  // or replaced (H6 blob URL leak fix).
  const previewUrlRef = useRef<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [collectionId, setCollectionId] = useState<string>("");
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [membershipId, setMembershipId] = useState("");
  const [rewardType, setRewardType] = useState<RewardType>(RewardType.none);
  const [referralThreshold, setReferralThreshold] = useState<number>(3);
  const [priceUsd, setPriceUsd] = useState("");
  const [priceError, setPriceError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const tierMax = useMemo(() => {
    if (isAdmin) return 500;
    return 1;
  }, [isAdmin]);

  const [supplyLimit, setSupplyLimit] = useState<number>(tierMax);
  const [supplyLimitStr, setSupplyLimitStr] = useState<string>(
    tierMax.toString(),
  );

  useEffect(() => {
    if (mintDialogOpen) {
      setSupplyLimit(tierMax);
      setSupplyLimitStr(tierMax.toString());
    }
  }, [tierMax, mintDialogOpen]);
  // isMintingLocal removed — use mintMutation.isPending as the single source of truth

  // Revoke any outstanding blob: URL on unmount so preview image bytes are
  // released from memory when the UploadCard leaves the DOM (H6 fix).
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  // Helper: revoke the previous preview blob URL (if any) and clear the ref.
  // Called before creating a new URL, on reset, and on dialog close.
  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (mintSuccessSignal > 0) {
      setMintDialogOpen(false);
      setFile(null);
      setPreview(null);
      setTitle("");
      setDescription("");
      setCollectionId("");
      setBusinessName("");
      setWebsite("");
      setDiscountCode("");
      setMembershipId("");
      setRewardType(RewardType.none);
      setReferralThreshold(3);
      setPriceUsd("");
      setPriceError(null);
      setShowAdvanced(false);
      setMintError(null);
      setSupplyLimit(tierMax);
      setSupplyLimitStr(tierMax.toString());
    }
  }, [mintSuccessSignal, setMintError, setMintDialogOpen, tierMax]);

  const handleFile = useCallback(
    async (f: File) => {
      if (isMinting) return;
      if (f.size > 1887436) {
        toast.error(
          "Image is too large. Please use an image under 1.8MB. Try compressing at squoosh.app or tinypng.com before uploading.",
        );
        return;
      }
      // Re-derive the Content-Type from the file's magic bytes instead of
      // trusting the spoofable File.type. Rejects files whose magic bytes
      // do not match a supported image format (PNG/JPEG/WebP).
      const verified = await fileWithVerifiedImageType(f);
      if (!verified) {
        toast.error("Only PNG, JPG, and WEBP files are accepted.");
        return;
      }
      // Strip non-allowlisted PNG chunks BEFORE storing the file in state
      // and generating the preview. For PNGs this drops zTXt/tEXt/iTXt/
      // iCCP/sPLT/caBX and any unknown chunk so the backend validator
      // (src/backend/lib/nft.mo validatePngChunks) does not reject the
      // upload. For non-PNGs (JPEG/WebP) sanitizePng is a pass-through that
      // returns the file unchanged. The sanitized bytes are what get
      // stored in state, previewed, and ultimately sent to mintNft.
      const sanitized = await sanitizePng(verified);
      // Revoke any previous preview blob URL before creating a new one so
      // the previous image bytes are released from memory (H6 fix).
      revokePreviewUrl();
      setFile(sanitized);
      const url = URL.createObjectURL(sanitized);
      previewUrlRef.current = url;
      setPreview(url);
      setMintDialogOpen(true);
    },
    [setMintDialogOpen, isMinting, revokePreviewUrl],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDragOver(false);
    if (isMinting) return;
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isMinting) return;
    dragCounterRef.current += 1;
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDragOver(false);
    }
  }

  function handleMint() {
    if (!file || !title.trim()) return;
    if (!isAuthenticated || !actor) {
      toast.error("Connect your wallet to mint NFTs.");
      return;
    }
    // Whole-value USD price is required: a positive integer number of dollars.
    const priceValue = Number(priceUsd);
    if (
      priceUsd.trim() === "" ||
      !Number.isInteger(priceValue) ||
      priceValue <= 0
    ) {
      setPriceError("Enter a whole-dollar price greater than 0.");
      return;
    }
    setPriceError(null);
    onMint({
      file,
      title,
      description,
      collectionId: collectionId ? BigInt(collectionId) : undefined,
      businessName: businessName.trim() || undefined,
      website: website.trim() || undefined,
      discountCode: discountCode.trim() || undefined,
      membershipId: membershipId.trim() || undefined,
      supplyLimit: BigInt(supplyLimit),
      rewardType,
      referralThreshold:
        rewardType === "referralBonus" ? BigInt(referralThreshold) : undefined,
      priceUsd: BigInt(priceValue),
    });
  }

  function resetForm() {
    setMintDialogOpen(false);
    setFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
    setCollectionId("");
    setBusinessName("");
    setWebsite("");
    setDiscountCode("");
    setMembershipId("");
    setRewardType(RewardType.none);
    setReferralThreshold(3);
    setPriceUsd("");
    setPriceError(null);
    setShowAdvanced(false);
    // Revoke the preview blob URL so image bytes are released on reset.
    revokePreviewUrl();
    // isMintingLocal removed — loading state comes from mintMutation.isPending
  }

  return (
    <>
      <button
        type="button"
        className={`aspect-square rounded-xl border-2 border-dashed transition-colors duration-200 flex flex-col items-center justify-center gap-1.5 p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          isMinting
            ? "opacity-50 cursor-not-allowed border-muted bg-muted/20"
            : dragOver
              ? "border-primary bg-primary/10"
              : "border-primary/50 bg-primary/5 hover:border-primary hover:bg-primary/10"
        }`}
        onClick={() => !isMinting && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        aria-label="Upload and mint NFT"
        data-ocid="home.upload_card"
      >
        {isMinting ? (
          <>
            <Loader2 className="animate-spin text-muted-foreground text-lg" />
            <span className="text-xs text-muted-foreground">Minting...</span>
          </>
        ) : (
          <>
            <Plus className="text-primary text-lg" />
            <span className="text-xs text-primary font-medium text-center leading-tight">
              Drag &amp; Drop
              <br />
              to Mint
            </span>
          </>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
        data-ocid="home.file_input"
      />
      <Dialog
        open={mintDialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setMintDialogOpen(false);
            setFile(null);
            setPreview(null);
            setTitle("");
            setDescription("");
            setCollectionId("");
            setBusinessName("");
            setWebsite("");
            setDiscountCode("");
            setMembershipId("");
            setRewardType(RewardType.none);
            setReferralThreshold(3);
            setPriceUsd("");
            setPriceError(null);
            setShowAdvanced(false);
            setMintError(null);
            setSupplyLimit(tierMax);
            // Revoke the preview blob URL on dialog close so image bytes
            // are released from memory (H6 fix).
            revokePreviewUrl();
          }
        }}
      >
        <DialogContent
          className="max-w-sm mx-4 rounded-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="home.mint_dialog"
        >
          <DialogHeader>
            <DialogTitle>Mint New NFT</DialogTitle>
            <DialogDescription className="sr-only">
              Fill in the details below to mint your NFT on-chain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {preview && (
              <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div>
              <Label htmlFor="mint-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mint-title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                placeholder="NFT title"
                maxLength={100}
                data-ocid="home.mint_title_input"
              />
            </div>
            <div>
              <Label htmlFor="mint-desc">Description</Label>
              <Textarea
                id="mint-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                placeholder="Optional description"
                rows={2}
                maxLength={1000}
                data-ocid="home.mint_desc_input"
              />
            </div>
            <div>
              <Label htmlFor="mint-price">
                Price (USD) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mint-price"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={priceUsd}
                onChange={(e) => {
                  setPriceUsd(e.target.value);
                  setPriceError(null);
                }}
                placeholder="e.g. 250"
                data-ocid="home.mint_price_input"
              />
              {priceError ? (
                <p
                  className="text-xs text-destructive mt-1"
                  data-ocid="home.mint_price_error_state"
                >
                  {priceError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Whole dollars, no cents.
                </p>
              )}
            </div>
            {collections.length > 0 && (
              <div>
                <Label>Collection (optional)</Label>
                <Select value={collectionId} onValueChange={setCollectionId}>
                  <SelectTrigger data-ocid="home.mint_collection_select">
                    <SelectValue placeholder="Select collection" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {collections.map((c) => (
                      <SelectItem key={c.id.toString()} value={c.id.toString()}>
                        {c.name} ({c.nftCount.toString()}/{c.maxSize.toString()}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="mint-supply">Edition Size</Label>
              <Input
                id="mint-supply"
                type="number"
                min={1}
                max={tierMax}
                value={supplyLimitStr}
                onChange={(e) => {
                  const raw = e.target.value;
                  setSupplyLimitStr(raw);
                  const val = Number(raw);
                  if (!Number.isNaN(val) && raw !== "") {
                    setSupplyLimit(Math.max(1, Math.min(tierMax, val)));
                  }
                }}
                onBlur={() => {
                  const val = Number(supplyLimitStr);
                  if (Number.isNaN(val) || supplyLimitStr === "") {
                    setSupplyLimitStr(tierMax.toString());
                    setSupplyLimit(tierMax);
                  } else {
                    const clamped = Math.max(1, Math.min(tierMax, val));
                    setSupplyLimitStr(clamped.toString());
                    setSupplyLimit(clamped);
                  }
                }}
                data-ocid="home.mint_supply_input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isAdmin ? "Max 500 (admin)" : `Max ${tierMax} for your tier`}
              </p>
            </div>
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  data-ocid="home.mint_advanced_toggle"
                >
                  <ChevronDown
                    className={`transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
                  />
                  {showAdvanced
                    ? "Hide Advanced Metadata"
                    : "Advanced Metadata"}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div>
                  <Label htmlFor="mint-business">Business Name</Label>
                  <Input
                    id="mint-business"
                    value={businessName}
                    onChange={(e) =>
                      setBusinessName(e.target.value.slice(0, 100))
                    }
                    placeholder="Optional business name"
                    maxLength={100}
                    data-ocid="home.mint_business_input"
                  />
                </div>
                <div>
                  <Label htmlFor="mint-website">Website / URL</Label>
                  <Input
                    id="mint-website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value.slice(0, 500))}
                    placeholder="https://example.com"
                    maxLength={500}
                    data-ocid="home.mint_website_input"
                  />
                </div>
                <div>
                  <Label htmlFor="mint-discount">Discount Code</Label>
                  <Input
                    id="mint-discount"
                    value={discountCode}
                    onChange={(e) =>
                      setDiscountCode(e.target.value.slice(0, 50))
                    }
                    placeholder="Optional discount code"
                    maxLength={50}
                    data-ocid="home.mint_discount_input"
                  />
                </div>
                <div>
                  <Label htmlFor="mint-membership">
                    Membership / Receipt / Ticket ID
                  </Label>
                  <Input
                    id="mint-membership"
                    value={membershipId}
                    onChange={(e) =>
                      setMembershipId(e.target.value.slice(0, 100))
                    }
                    placeholder="Optional membership ID"
                    maxLength={100}
                    data-ocid="home.mint_membership_input"
                  />
                </div>
                <div>
                  <Label htmlFor="mint-reward-type">Reward Type</Label>
                  <Select
                    value={rewardType}
                    onValueChange={(v) => setRewardType(v as RewardType)}
                  >
                    <SelectTrigger data-ocid="home.mint_reward_type_select">
                      <SelectValue placeholder="Select reward type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="referralBonus">
                        Referral Bonus
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rewardType === "referralBonus"
                      ? "This NFT is auto-awarded to referrers who reach the threshold."
                      : "Standard NFT — no referral bonus behavior."}
                  </p>
                </div>
                {rewardType === "referralBonus" && (
                  <div>
                    <Label htmlFor="mint-referral-threshold">
                      Referral Threshold
                    </Label>
                    <Input
                      id="mint-referral-threshold"
                      type="number"
                      min={1}
                      max={1000}
                      value={referralThreshold.toString()}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const val = Number(raw);
                        if (
                          !Number.isNaN(val) &&
                          raw !== "" &&
                          val >= 1 &&
                          val <= 1000
                        ) {
                          setReferralThreshold(val);
                        }
                      }}
                      placeholder="3"
                      data-ocid="home.mint_referral_threshold_input"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Number of successful referrals required before this bonus
                      NFT is auto-awarded. Default: 3. Codes never expire.
                    </p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
            {mintError && (
              <div
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5"
                data-ocid="home.mint_error_state"
              >
                <p className="text-xs text-destructive font-medium">
                  {mintError}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={isMinting}
              data-ocid="home.mint_cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleMint}
              disabled={
                !title.trim() || isMinting || !isAuthenticated || !actor
              }
              data-ocid="home.mint_submit_button"
            >
              {isMinting ? (
                <>
                  <Loader2 className="animate-spin mr-2" />
                  Minting...
                </>
              ) : (
                <>
                  <Hammer className="mr-2" />
                  Mint
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function HomePage() {
  const _navigate = useNavigate();
  const {
    isAuthenticated,
    actor,
    principal,
    authState,
    isAdmin,
    isAdminLoading,
  } = useAuth();

  const queryClient = useQueryClient();
  const _createSlotMutation = useCreateSlot();
  const [mintDialogOpen, setMintDialogOpen] = useState(false);
  const [selectedNft, setSelectedNft] = useState<Nft | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintSuccessSignal, setMintSuccessSignal] = useState(0);
  const [mintTransition, setMintTransition] = useState<
    | { stage: "idle" }
    | { stage: "minting"; message: string }
    | { stage: "success"; message: string }
    | { stage: "error"; message: string }
  >({ stage: "idle" });
  const [mintedClaimUrl, setMintedClaimUrl] = useState<string | null>(null);
  // Refs to expose the most recent mint params (rewardType/referralThreshold)
  // to the mintMutation.onSuccess callback, which otherwise only receives the
  // backend result. Used to apply referral metadata to the freshly minted NFT.
  const lastMintRewardTypeRef = useRef<RewardType>(RewardType.none);
  const lastMintReferralThresholdRef = useRef<bigint>(3n);
  // [MINT-NOTIF] The mint result carries only ids, not the title, so capture
  // the submitted name in onMutate and read it back in onSuccess to name the
  // minted NFT in the notification.
  const lastMintTitleRef = useRef<string>("");
  // [IMG-FIX] Bounded post-mint refetch timers. The invalidated list queries can
  // refetch from a stale replica and still return the old list, so schedule a
  // couple of delayed passes to let the grids converge without a manual reload.
  const postMintRefetchTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // [IMG-FIX] Guard so the delayed refetch passes never fire after unmount.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      for (const t of postMintRefetchTimersRef.current) clearTimeout(t);
      postMintRefetchTimersRef.current = [];
    };
  }, []);
  // [DEL-SYNC]/[BURN-SYNC] Bounded delayed invalidate passes shared by the
  // delete and burn mutations, mirroring the mint flow's post-mint passes. A
  // single invalidate can refetch from a stale replica and still return the
  // removed card, so re-invalidate the same key set at ~1.5s and ~4s. Guarded
  // by isMountedRef so the timers never fire after unmount.
  const schedulePostMutationRefetch = useCallback(
    (label: string) => {
      const keys: string[][] = [
        ["myActiveNfts"],
        ["myNfts"],
        ["slotsStatus"],
        ["collections"],
        ["nftRegistry"],
      ];
      const schedule = (delayMs: number, pass: number) => {
        const timer = setTimeout(() => {
          if (!isMountedRef.current) return;
          console.log(
            `[${label.toUpperCase()}-SYNC] post-${label} refetch pass ${pass}`,
          );
          for (const key of keys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        }, delayMs);
        postMintRefetchTimersRef.current.push(timer);
      };
      schedule(1500, 1);
      schedule(4000, 2);
    },
    [queryClient],
  );

  devLog("[RENDER] HomePage render:", {
    authState,
    isAuthenticated,
    isAdmin,
    actor: !!actor,
  });

  // Backend health / canister identity guard (rotation defense). If the
  // backend is wrong, unavailable, or empty, surface a loud error instead of
  // silently rendering an empty catalog. Defense-in-depth on top of the
  // global CanisterGuard in App.tsx.
  const backendHealth = useBackendHealth();
  devLog("[CANISTER] HomePage backend health:", backendHealth);

  const [mintOverlayDismissVisible, setMintOverlayDismissVisible] =
    useState(false);

  // Animation state: track which cards are animating out / in
  const [deletingTokenIds, setDeletingTokenIds] = useState<Set<number>>(
    new Set(),
  );
  const [burningTokenIds, setBurningTokenIds] = useState<Set<number>>(
    new Set(),
  );
  const [newlyMintedTokenId, setNewlyMintedTokenId] = useState<number | null>(
    null,
  );
  const [slotFlash, setSlotFlash] = useState<"mint" | "burn" | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const isSearchActive = debouncedSearch.trim().length > 0;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (mintTransition.stage === "minting") {
      const t1 = setTimeout(() => setMintOverlayDismissVisible(true), 10000);
      const t2 = setTimeout(() => {
        setMintTransition({ stage: "idle" });
        setMintOverlayDismissVisible(false);
      }, 95000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    setMintOverlayDismissVisible(false);
  }, [mintTransition.stage]);

  // [PAGE] Paginated Studio feed. The listing hook takes (offset, limit) and
  // returns the page's Nft[]; the page envelope's total is read separately for
  // the pagination controls. Admin search stays a separate unpaginated feed.
  const [studioPageIndex, setStudioPageIndex] = useState(0);
  const studioOffset = BigInt(studioPageIndex * STUDIO_PAGE_SIZE);
  const studioLimit = BigInt(STUDIO_PAGE_SIZE);

  const { data: nfts = [], isLoading } = useMyActiveNfts(
    principal,
    studioOffset,
    studioLimit,
  );

  const { data: studioTotal } = useQuery<number>({
    queryKey: ["studioPageTotal", principal ?? "anonymous", studioPageIndex],
    queryFn: async () => {
      if (!actor) return 0;
      const page = await actor.listMyActiveNfts(studioOffset, studioLimit);
      return Number(page.total);
    },
    enabled: !!actor,
    staleTime: 30_000,
  });

  const { data: searchResults = [], isLoading: isSearchLoading } =
    useSearchNfts(debouncedSearch.trim(), isAdmin && isSearchActive);

  const { data: collections = [] } = useQuery<CollectionWithCount[]>({
    queryKey: ["collections"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.listMyCollections();
      return result;
    },
    enabled: !!actor && isAuthenticated && mintDialogOpen,
  });

  useQuery({
    queryKey: ["slotsStatus"],
    queryFn: async () => {
      if (!actor) return null;
      const act = actor as unknown as {
        getSlotsStatus?: () => Promise<{
          used: bigint;
          total: bigint;
          remaining: bigint;
        }>;
      };
      return act.getSlotsStatus ? act.getSlotsStatus() : null;
    },
    enabled: !!actor && isAuthenticated,
  });

  const { data: canisterId } = useQuery<string>({
    queryKey: ["canisterId"],
    queryFn: async () => {
      if (!actor) return "";
      return actor.getCanisterId();
    },
    enabled: !!actor && isAuthenticated,
  });

  const { addNotification } = useNotifications();
  const generateClaimLinkForAdmin = useGenerateClaimLink();
  // Post-mint referral metadata setters (admin only). mintNft does NOT accept
  // rewardType/referralThreshold params — these are applied to the freshly
  // minted NFT ID after a successful mint, mirroring the auto-claim-link
  // pattern below.
  const setNftRewardType = useAdminSetNftRewardType(isAdmin);
  const setNftReferralThreshold = useAdminSetNftReferralThreshold(isAdmin);

  const mintMutation = useMutation({
    mutationFn: async (params: MintParams) => {
      if (!actor) throw new Error("Not authenticated");
      const bytes = new Uint8Array(await params.file.arrayBuffer());
      const assetHash = await computeSha256(params.file);
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) =>
        setUploadProgress(pct),
      );
      // [IMG-FIX] Do NOT resolve the notification image from this locally
      // uploaded ExternalBlob. ExternalBlob.fromBytes sets directURL to a
      // document-scoped blob: URL (URL.createObjectURL) that is revoked on GC
      // and invalid after reload, and the notification imageUrl is persisted to
      // localStorage. The stable gateway URL is only available from the
      // post-mint getNft read-back (see onSuccess).
      const mintPromise = actor.mintNft(
        blob,
        assetHash,
        params.title.trim(),
        params.description.trim(),
        params.collectionId ?? null,
        params.businessName ?? null,
        params.website ?? null,
        params.discountCode ?? null,
        params.membershipId ?? null,
        params.supplyLimit ?? 1n,
        params.priceUsd ?? null,
      );
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Upload timed out. Please try a smaller file or check your connection.",
              ),
            ),
          90000,
        ),
      );
      const result = await Promise.race([mintPromise, timeout]);
      if (
        result &&
        typeof result === "object" &&
        "__kind__" in result &&
        (result as any).__kind__ === "err"
      ) {
        throw new Error(
          (result as any).err?.message || (result as any).err || "Mint failed",
        );
      }
      return result;
    },
    onMutate: (params) => {
      // Capture referral metadata so onSuccess can apply it to the new NFT ID.
      lastMintRewardTypeRef.current = params.rewardType ?? RewardType.none;
      lastMintReferralThresholdRef.current = params.referralThreshold ?? 3n;
      lastMintTitleRef.current = params.title.trim();
      setMintError(null);
      setMintTransition({
        stage: "minting",
        message: "Minting your NFT on-chain...",
      });
    },
    onSuccess: async (result) => {
      const ok = (
        result as
          | {
              ok?: {
                id: bigint;
                tokenId: bigint;
                nftUniqueId?: string;
                collectionId?: bigint;
              };
            }
          | undefined
      )?.ok;
      const tokenId = ok?.tokenId ?? ok?.id;
      const tokenIdNum =
        tokenId !== undefined && tokenId !== 0n ? Number(tokenId) : null;
      const tokenIdStr =
        tokenIdNum !== null ? tokenIdNum.toString() : undefined;
      const nftUniqueId = ok?.nftUniqueId;
      setMintTransition({
        stage: "success",
        message: tokenIdStr
          ? `Token ID: ${tokenIdStr} minted successfully!`
          : "NFT minted successfully!",
      });
      // [IMG-FIX] Resolve the notification image from the STABLE source: the
      // post-mint getNft read-back, whose imageBlob is decoded by the actor's
      // downloadFile callback into a renderable URL (a live blob: URL for the
      // backend's raw image bytes, or a durable gateway URL for a reference
      // string). The locally-uploaded ExternalBlob is deliberately NOT used —
      // its directURL is a document-scoped blob: URL that is revoked on GC and
      // invalid after reload, and the notification imageUrl is persisted to
      // localStorage. getNft is a QUERY call that can hit a stale replica
      // immediately after a mint, so retry a bounded number of times and use
      // the first non-empty resolved URL. If every attempt yields an empty URL,
      // record the notification WITHOUT an imageUrl so the bell falls back to
      // its type icon rather than storing a blob: URL. Guarded: a failed
      // read-back never throws and never blocks the mint flow.
      let mintedImageUrl: string | undefined;
      if (actor && ok?.id !== undefined) {
        const readBackDelaysMs = [0, 800, 2000];
        for (let attempt = 0; attempt < readBackDelaysMs.length; attempt++) {
          const delayMs = readBackDelaysMs[attempt];
          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
          try {
            const mintedNft = await actor.getNft(ok.id);
            const resolved = resolveNftImageUrl(mintedNft?.imageBlob).trim();
            console.log(
              `[IMG-FIX] getNft read-back attempt ${attempt + 1}/${readBackDelaysMs.length}:`,
              resolved === "" ? "(empty)" : resolved,
            );
            if (resolved !== "") {
              mintedImageUrl = resolved;
              break;
            }
          } catch (err) {
            console.log(
              `[IMG-FIX] getNft read-back attempt ${attempt + 1}/${readBackDelaysMs.length} failed:`,
              err,
            );
          }
        }
        console.log(
          "[IMG-FIX] notification image resolved:",
          mintedImageUrl ?? "(none)",
        );
      }
      // [MINT-NOTIF] Name the minted NFT in the notification. The mint result
      // carries only ids, so the title captured in onMutate is read back here.
      // Fall back to a generic label when the title is unavailable.
      const mintedTitle = lastMintTitleRef.current;
      addNotification({
        type: "info",
        title: mintedTitle ? `NFT Minted: ${mintedTitle}` : "NFT Minted",
        message: tokenIdStr
          ? `Token ID: ${tokenIdStr} created successfully${nftUniqueId ? ` (Unique ID: ${nftUniqueId})` : ""}`
          : "NFT created successfully",
        imageUrl: mintedImageUrl,
      });
      setUploadProgress(0);
      setMintError(null);
      setMintSuccessSignal((n) => n + 1);
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["slotsStatus"] });
      // [MINT-SYNC] The Library's "All" tab sources from useMyNfts, whose
      // query key is ["myNfts"] — NOT ["allMyNfts"]. Invalidating the stale
      // key left the Library feed unrefreshed after a mint, so the new NFT
      // only appeared after a manual reload. Invalidate the real key.
      queryClient.invalidateQueries({ queryKey: ["myNfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
      // [IMG-FIX] The invalidated list queries can refetch from a stale replica
      // and still return the old list, leaving the grids showing "No image"
      // until a manual reload. Schedule bounded delayed passes that invalidate
      // the SAME keys again so the grids converge on fresh data. Guarded so the
      // timers never fire after unmount.
      const postMintKeys: string[][] = [
        ["myActiveNfts"],
        ["myNfts"],
        ["slotsStatus"],
        ["collections"],
        ["nftRegistry"],
      ];
      const schedulePostMintRefetch = (delayMs: number, pass: number) => {
        const timer = setTimeout(() => {
          if (!isMountedRef.current) return;
          console.log(`[IMG-FIX] post-mint refetch pass ${pass}`);
          for (const key of postMintKeys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        }, delayMs);
        postMintRefetchTimersRef.current.push(timer);
      };
      schedulePostMintRefetch(1500, 1);
      schedulePostMintRefetch(4000, 2);
      // Trigger mint enter animation + slot flash
      if (tokenIdNum !== null) {
        setNewlyMintedTokenId(tokenIdNum);
        setSlotFlash("mint");
        setTimeout(() => setNewlyMintedTokenId(null), 1000);
        setTimeout(() => setSlotFlash(null), 600);
      }
      // Auto-generate claim link for admin or paid tiers after successful mint
      if (isAdmin && nftUniqueId && ok?.id !== undefined) {
        generateClaimLinkForAdmin
          .mutateAsync(ok.id)
          .then((url: string) => {
            setMintedClaimUrl(url);
          })
          .catch(() => {
            // Auto-dismiss only when no claim URL was captured
            setTimeout(() => setMintTransition({ stage: "idle" }), 2500);
          });
      } else {
        // No claim link for this tier — auto-dismiss after 2.5s
        setTimeout(() => setMintTransition({ stage: "idle" }), 2500);
      }
      // Post-mint referral metadata (admin only). mintNft does NOT accept
      // rewardType/referralThreshold params — apply them to the freshly minted
      // NFT ID after a successful mint. Guarded by isAdmin + a non-"none"
      // rewardType captured in onMutate. The threshold call only fires when
      // rewardType === "referralBonus".
      if (
        isAdmin &&
        ok?.id !== undefined &&
        lastMintRewardTypeRef.current !== "none"
      ) {
        const newNftId = ok.id;
        setNftRewardType.mutate({
          nftId: newNftId,
          rewardType: lastMintRewardTypeRef.current,
        });
        if (lastMintRewardTypeRef.current === "referralBonus") {
          setNftReferralThreshold.mutate({
            nftId: newNftId,
            threshold: lastMintReferralThresholdRef.current,
          });
        }
      }
    },
    onError: (err: Error) => {
      addNotification({
        type: "critical",
        title: "Mint Failed",
        message: err.message || "Mint failed. Please try again.",
      });
      setUploadProgress(0);
      setMintError(err.message || "Mint failed. Please try again.");
      setMintTransition({
        stage: "error",
        message: err.message || "Mint failed. Please try again.",
      });
      setTimeout(() => setMintTransition({ stage: "idle" }), 4000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.deleteNft(id);
    },
    onMutate: (id: bigint) => {
      const tokenIdNum = Number(id);
      setDeletingTokenIds((prev) => new Set(prev).add(tokenIdNum));
    },
    onSuccess: (_data, id: bigint) => {
      addNotification({
        type: "info",
        title: "NFT Deleted",
        message: "NFT has been deleted successfully.",
      });
      setSelectedNft(null);
      // Optimistically remove from cache to prevent flicker
      queryClient.setQueryData<Nft[]>(["myActiveNfts"], (old) => {
        if (!old) return old;
        return old.filter((nft) => nft.id !== id);
      });
      // delete does NOT free slots — do NOT invalidate slotsStatus
      // [DEL-SYNC] A single invalidate can refetch from a stale replica and
      // still return the deleted card. Schedule the same bounded delayed passes
      // used by mint so the Studio/Library grids converge without a reload.
      schedulePostMutationRefetch("delete");
      const tokenIdNum = Number(id);
      setTimeout(() => {
        setDeletingTokenIds((prev) => {
          const next = new Set(prev);
          next.delete(tokenIdNum);
          return next;
        });
      }, 300);
    },
    onError: (err: Error, id: bigint) => {
      addNotification({
        type: "critical",
        title: "Delete Failed",
        message: err.message || "Failed to delete NFT.",
      });
      const tokenIdNum = Number(id);
      setDeletingTokenIds((prev) => {
        const next = new Set(prev);
        next.delete(tokenIdNum);
        return next;
      });
    },
  });

  const burnMutation = useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.burnNft(id);
    },
    onMutate: (id: bigint) => {
      const tokenIdNum = Number(id);
      setBurningTokenIds((prev) => new Set(prev).add(tokenIdNum));
    },
    onSuccess: (_data, id: bigint) => {
      addNotification({
        type: "warning",
        title: "NFT Burned",
        message: "NFT has been permanently destroyed.",
      });
      setSelectedNft(null);
      // Optimistically remove from cache to prevent flicker
      queryClient.setQueryData<Nft[]>(["myActiveNfts"], (old) => {
        if (!old) return old;
        return old.filter((nft) => nft.id !== id);
      });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["slotsStatus"] });
      // [BURN-SYNC] Same bounded delayed passes as mint/delete so the grids
      // converge on fresh data after a burn without a manual reload.
      schedulePostMutationRefetch("burn");
      const tokenIdNum = Number(id);
      setSlotFlash("burn");
      setTimeout(() => {
        setBurningTokenIds((prev) => {
          const next = new Set(prev);
          next.delete(tokenIdNum);
          return next;
        });
      }, 300);
      setTimeout(() => setSlotFlash(null), 600);
    },
    onError: (err: Error, id: bigint) => {
      addNotification({
        type: "critical",
        title: "Burn Failed",
        message: err.message || "Failed to burn NFT.",
      });
      const tokenIdNum = Number(id);
      setBurningTokenIds((prev) => {
        const next = new Set(prev);
        next.delete(tokenIdNum);
        return next;
      });
    },
  });

  // HomePage is static — no conditional redirects based on role or auth state.
  // Shell routing is handled by explicit user navigation only.

  // searchResults is already Nft[] — returned directly from useSearchNfts queryFn
  const displayNfts = isAdmin && isSearchActive ? searchResults : nfts;
  const displayLoading =
    isAdmin && isSearchActive ? isSearchLoading : isLoading;

  const unclaimedNfts = useMemo(
    () => (displayNfts ?? []).filter((nft) => !nft.claimedAt),
    [displayNfts],
  );
  const stableNfts = useMemo(() => unclaimedNfts, [unclaimedNfts]);
  const gridSlots = useMemo(() => {
    if (isAdmin) {
      // [ADMIN-PAGE] Admin uses the same paginated active feed as the
      // non-admin grid; the upload slot is included on the first page only.
      return buildAdminGrid(stableNfts, studioPageIndex === 0);
    }
    // [PAGE] The upload slot is only on the first page; later pages render
    // pure NFT/empty slots. The page already contains at most STUDIO_PAGE_SIZE
    // NFTs, so no client-side slice is needed.
    return buildGrid(stableNfts, STUDIO_SLOT_COUNT, studioPageIndex === 0);
  }, [stableNfts, isAdmin, studioPageIndex]);

  // [PAGE] Pagination controls for the Studio grid. Admin search results are
  // unpaginated, so the controls are hidden while searching.
  const studioPageCount = Math.max(
    1,
    Math.ceil((studioTotal ?? 0) / STUDIO_PAGE_SIZE),
  );
  // [ADMIN-PAGE] Pagination is shown for both the admin and non-admin grids
  // when the active feed exceeds one page. Admin search results are
  // unpaginated, so the controls stay hidden while searching.
  const showStudioPagination = !isSearchActive && studioPageCount > 1;

  devLog("[ADMIN-PAGE] studio grid", {
    isAdmin,
    isSearchActive,
    studioPageIndex,
    studioPageCount,
    showStudioPagination,
    slotCount: gridSlots.length,
  });

  // [PAGE] Reset to the first page when the search filter toggles so the user
  // never lands on an out-of-range page.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset is keyed on the search identity only
  useEffect(() => {
    setStudioPageIndex(0);
  }, [isSearchActive]);

  // 3-tier auth gating for Mint UI

  if (authState === "loading") {
    return (
      <div className="flex flex-col gap-4 p-3 max-w-xl mx-auto w-full pb-24">
        <BrandedAuthGate subtitle="Mint, claim, and collect NFTs on the Internet Computer." />
        <div
          className="flex flex-col items-center justify-center py-20 gap-3"
          data-ocid="home.auth_loading_state"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Syncing wallet...</p>
        </div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <div className="flex flex-col gap-4 p-3 max-w-xl mx-auto w-full pb-24">
        <BrandedAuthGate subtitle="Mint, claim, and collect NFTs on the Internet Computer." />
        <div
          className="flex flex-col items-center justify-center py-20 gap-3"
          data-ocid="home.unauthenticated_state"
        >
          <Info className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Please connect your Internet Identity to mint NFTs.
          </p>
        </div>
      </div>
    );
  }

  // authState === "ready"

  // Full Mint UI — authState === "ready"
  return (
    <div className="flex flex-col gap-4 p-3 max-w-xl mx-auto w-full pb-24">
      {/* Hero branding — persistent on mint screen */}
      <BrandedAuthGate subtitle="Mint, claim, and collect NFTs on the Internet Computer." />

      {/* Start Here — 3-step quick guide */}
      <div
        className="bg-card border border-border rounded-xl p-3"
        data-ocid="home.start_here_section"
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Start Here
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-1 rounded-lg bg-primary/5 border border-primary/10 p-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              1
            </span>
            <span className="text-xs font-medium text-foreground text-center leading-tight">
              Mint NFT
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg bg-primary/5 border border-primary/10 p-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              2
            </span>
            <span className="text-xs font-medium text-foreground text-center leading-tight">
              Verify NFT
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg bg-primary/5 border border-primary/10 p-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              3
            </span>
            <span className="text-xs font-medium text-foreground text-center leading-tight">
              View Profile
            </span>
          </div>
        </div>
      </div>

      {isAuthenticated && (
        <div className="flex items-center justify-between -mt-2">
          <p
            className={`text-xs transition-colors duration-600 ${
              slotFlash === "mint"
                ? "text-green-400"
                : slotFlash === "burn"
                  ? "text-amber-400"
                  : "text-muted-foreground"
            }`}
          >
            {isAdmin
              ? "Admin Mode — Unlimited Slots"
              : "NFTs are organized by Slots (Collections)"}
          </p>
        </div>
      )}

      {/* Admin search bar */}
      {isAuthenticated && isAdmin && (
        <div className="relative" data-ocid="home.search_bar">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search NFTs by title, business, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9 rounded-lg"
            data-ocid="home.search_input"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
              data-ocid="home.search_clear_button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {isAdminLoading ? (
        <div
          className="flex flex-col items-center justify-center py-20 gap-3"
          data-ocid="home.admin_loading_state"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : displayLoading ? (
        <div
          className={`gap-2 ${isAdmin ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5" : "grid grid-cols-3"}`}
          data-ocid="home.loading_state"
        >
          {Array.from({ length: isAdmin ? 12 : 9 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : (
        <div
          className={`gap-2 ${isAdmin ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5" : "grid grid-cols-3"}`}
          data-ocid="home.grid"
        >
          {gridSlots.map((slot, i) => {
            // [PAGE] Slot numbering: admin keeps the raw index; the non-admin
            // grid numbers NFT slots 1..N, skipping the upload slot so the
            // visible numbering stays contiguous across pages.
            const nftSlotNumber = isAdmin ? i : i + 1;
            if (slot.kind === "upload") {
              return (
                <UploadCard
                  key="upload"
                  collections={collections}
                  onMint={(params) => mintMutation.mutate(params)}
                  isMinting={mintMutation.isPending}
                  uploadProgress={uploadProgress}
                  mintError={mintError}
                  setMintError={setMintError}
                  mintDialogOpen={mintDialogOpen}
                  setMintDialogOpen={setMintDialogOpen}
                  mintSuccessSignal={mintSuccessSignal}
                  isAuthenticated={isAuthenticated}
                  actor={actor}
                  isAdmin={isAdmin}
                />
              );
            }
            if (slot.kind === "nft") {
              const tokenIdNum = Number(slot.nft.id);
              return (
                <NftGridCard
                  key={slot.nft.id.toString()}
                  nft={slot.nft}
                  slotNumber={nftSlotNumber}
                  onSelect={setSelectedNft}
                  isDeleting={deletingTokenIds.has(tokenIdNum)}
                  isBurning={burningTokenIds.has(tokenIdNum)}
                  isNewlyMinted={newlyMintedTokenId === tokenIdNum}
                />
              );
            }
            // biome-ignore lint/suspicious/noArrayIndexKey: grid slots are positionally stable
            return <EmptySlot key={`grid-empty-${i}`} idx={i + 1} />;
          })}
        </div>
      )}

      {/* [PAGE] Studio grid pagination controls. Hidden for admin search
          results (unpaginated) and when there is only one page. */}
      {showStudioPagination && (
        <div
          className="flex items-center justify-between gap-2"
          data-ocid="home.pagination"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={studioPageIndex === 0}
            onClick={() => setStudioPageIndex((p) => Math.max(0, p - 1))}
            data-ocid="home.pagination_prev"
          >
            Prev
          </Button>
          <span
            className="text-xs text-muted-foreground"
            data-ocid="home.pagination_status"
          >
            Page {studioPageIndex + 1} of {studioPageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={studioPageIndex >= studioPageCount - 1}
            onClick={() =>
              setStudioPageIndex((p) => Math.min(studioPageCount - 1, p + 1))
            }
            data-ocid="home.pagination_next"
          >
            Next
          </Button>
        </div>
      )}

      {/* auth gating handled above; this block removed to prevent flash */}

      {/* Mint transition overlay */}
      {mintTransition.stage !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-xs w-full mx-4 shadow-lg text-center space-y-4">
            {mintTransition.stage === "minting" && (
              <>
                <div className="w-12 h-12 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <p className="text-sm font-medium text-foreground">
                  {mintTransition.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  Please wait while your NFT is being minted on-chain...
                </p>
                {mintOverlayDismissVisible && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                    onClick={() => {
                      setMintTransition({ stage: "idle" });
                      setMintOverlayDismissVisible(false);
                    }}
                  >
                    Taking too long? Dismiss
                  </button>
                )}
              </>
            )}
            {mintTransition.stage === "success" && (
              <>
                <div className="w-12 h-12 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="text-green-500 text-xl" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {mintTransition.message}
                </p>
                {mintedClaimUrl && (
                  <div className="mt-2 space-y-2 text-left">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Claim Link
                    </p>
                    <div className="flex items-center gap-1 bg-muted/60 rounded-lg px-2 py-1.5 min-w-0">
                      <span
                        className="text-xs text-foreground truncate flex-1 font-mono"
                        data-ocid="mint.claim_url"
                      >
                        {window.location.origin + mintedClaimUrl}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        data-ocid="mint.copy_claim_url_button"
                        onClick={() => {
                          navigator.clipboard
                            .writeText(window.location.origin + mintedClaimUrl)
                            .then(() => {
                              toast.success("Claim link copied!");
                            });
                        }}
                      >
                        <Copy className="mr-1 h-3 w-3" />
                        Copy
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="flex-1 text-xs"
                        data-ocid="mint.open_claim_page_button"
                        onClick={() =>
                          window.open(
                            window.location.origin + mintedClaimUrl,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        <Share2 className="mr-1 h-3 w-3" />
                        Open
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground"
                      data-ocid="mint.success_dismiss_button"
                      onClick={() => {
                        setMintTransition({ stage: "idle" });
                        setMintedClaimUrl(null);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                )}
                {!mintedClaimUrl && (
                  <p className="text-xs text-muted-foreground">Redirecting…</p>
                )}
              </>
            )}
            {mintTransition.stage === "error" && (
              <>
                <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="text-destructive text-xl" />
                </div>
                <p className="text-sm font-medium text-destructive">
                  {mintTransition.message}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMintTransition({ stage: "idle" })}
                >
                  Dismiss
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <NftDetailModal
        key={selectedNft?.id?.toString() ?? "none"}
        nft={selectedNft}
        open={!!selectedNft}
        onClose={() => setSelectedNft(null)}
        onDelete={(id) => deleteMutation.mutate(id)}
        onBurn={async (id) => {
          burnMutation.mutate(id);
        }}
        isDeleting={deleteMutation.isPending}
        isBurning={burnMutation.isPending}
        callerPrincipal={principal ?? ""}
        canisterId={canisterId ?? ""}
      />
    </div>
  );
}
