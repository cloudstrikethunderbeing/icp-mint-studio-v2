import { ExternalBlob, type SubscriptionTier } from "@/backend";
import type { CollectionWithCount, Nft } from "@/backend";
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
import { usePermissions } from "@/hooks/usePermissions";
import {
  useCreateSlot,
  useGenerateClaimLink,
  useSearchNfts,
} from "@/hooks/useQueries";

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
  Share2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import BrandedAuthGate from "../components/BrandedAuthGate";
import { useMyActiveNfts } from "../hooks/useQueries";

const MAX_NFTS = 8;
const UPLOAD_SLOT_IDX = 4; // center of 3x3 grid (0-indexed)

function buildAdminGrid(nfts: Nft[]): GridSlot[] {
  if (!Array.isArray(nfts)) {
    console.error("INVALID NFT INPUT:", nfts);
    return [];
  }
  const safeNfts = nfts.filter((item): item is Nft => item != null);
  const slots: GridSlot[] = [];
  let nftIdx = 0;
  for (let i = 0; i < safeNfts.length + 1; i++) {
    if (i === 0) {
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
};

function buildGrid(nfts: Nft[]): GridSlot[] {
  // Defensive filter: skip any null/undefined items that slipped through
  const safeNfts = nfts.filter((item): item is Nft => item != null);
  const slots: GridSlot[] = [];
  let nftIdx = 0;
  for (let i = 0; i < 9; i++) {
    if (i === UPLOAD_SLOT_IDX) {
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
  const imgUrl = nft.imageBlob?.getDirectURL() ?? "";
  const handleClick = useCallback(() => onSelect(nft), [onSelect, nft]);

  const deleting = isDeleting ?? false;
  const burning = isBurning ?? false;

  return (
    <button
      type="button"
      className={`aspect-square rounded-xl overflow-hidden bg-muted relative cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 ease-out ${
        deleting || burning
          ? "opacity-0 scale-95"
          : isNewlyMinted
            ? "animate-nft-enter"
            : ""
      } ${burning ? "ring-2 ring-red-500" : ""}`}
      onClick={handleClick}
      aria-label={`View NFT: ${nft.title}`}
      data-ocid={`home.nft_card.item.${slotNumber}`}
    >
      {burning && (
        <div className="absolute inset-0 bg-red-500/30 z-10 pointer-events-none transition-opacity duration-300" />
      )}
      {imgError ? (
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
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <p className="text-xs font-medium text-white truncate">{nft.title}</p>
      </div>
    </button>
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
  profileReady,
  subscriptionTier,
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
  profileReady: boolean;
  subscriptionTier: SubscriptionTier | null;
  isAdmin?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [collectionId, setCollectionId] = useState<string>("");
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [membershipId, setMembershipId] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const tierMax = useMemo(() => {
    if (isAdmin) return 500;
    switch (subscriptionTier) {
      case "free":
        return 1;
      case "creator":
        return 10;
      case "pro":
        return 100;
      case "org":
        return 500;
      default:
        return 1;
    }
  }, [subscriptionTier, isAdmin]);

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
      setShowAdvanced(false);
      setMintError(null);
      setSupplyLimit(tierMax);
      setSupplyLimitStr(tierMax.toString());
    }
  }, [mintSuccessSignal, setMintError, setMintDialogOpen, tierMax]);

  const handleFile = useCallback(
    (f: File) => {
      if (isMinting) return;
      const validTypes = ["image/png", "image/jpeg", "image/webp"];
      if (!validTypes.includes(f.type)) {
        toast.error("Only PNG, JPG, and WEBP files are accepted.");
        return;
      }
      if (f.size > 1887436) {
        toast.error(
          "Image is too large. Please use an image under 1.8MB. Try compressing at squoosh.app or tinypng.com before uploading.",
        );
        return;
      }
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setMintDialogOpen(true);
    },
    [setMintDialogOpen, isMinting],
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
    if (!isAuthenticated || !actor || !profileReady) {
      toast.error("Connect your wallet to mint NFTs.");
      return;
    }
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
    setShowAdvanced(false);
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
            setShowAdvanced(false);
            setMintError(null);
            setSupplyLimit(tierMax);
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
                !title.trim() ||
                isMinting ||
                !isAuthenticated ||
                !actor ||
                !profileReady
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
    profileReady,
    creatorId,
    subscriptionTier,
  } = useAuth();
  const { isAdmin, isAdminLoading, canMint } = usePermissions();

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

  const { data: nfts = [], isLoading } = useMyActiveNfts();

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

  const mintMutation = useMutation({
    mutationFn: async (params: MintParams) => {
      if (!actor) throw new Error("Not authenticated");
      const bytes = new Uint8Array(await params.file.arrayBuffer());
      const assetHash = await computeSha256(params.file);
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) =>
        setUploadProgress(pct),
      );
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
    onMutate: () => {
      setMintError(null);
      setMintTransition({
        stage: "minting",
        message: "Minting your NFT on-chain...",
      });
    },
    onSuccess: (result) => {
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
      addNotification({
        type: "info",
        title: "NFT Minted",
        message: tokenIdStr
          ? `Token ID: ${tokenIdStr} created successfully${nftUniqueId ? ` (Unique ID: ${nftUniqueId})` : ""}`
          : "NFT created successfully",
      });
      setUploadProgress(0);
      setMintError(null);
      setMintSuccessSignal((n) => n + 1);
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["slotsStatus"] });
      queryClient.invalidateQueries({ queryKey: ["allMyNfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
      // Trigger mint enter animation + slot flash
      if (tokenIdNum !== null) {
        setNewlyMintedTokenId(tokenIdNum);
        setSlotFlash("mint");
        setTimeout(() => setNewlyMintedTokenId(null), 1000);
        setTimeout(() => setSlotFlash(null), 600);
      }
      // Auto-generate claim link for admin or paid tiers after successful mint
      if (canMint && nftUniqueId && ok?.id !== undefined) {
        generateClaimLinkForAdmin
          .mutateAsync(ok.id)
          .then((url: string) => {
            setMintedClaimUrl(url);
          })
          .catch((err: Error) => {
            console.warn(
              "[Admin] Auto-generate claim link failed (non-critical):",
              err,
            );
            // Auto-dismiss only when no claim URL was captured
            setTimeout(() => setMintTransition({ stage: "idle" }), 2500);
          });
      } else {
        // No claim link for this tier — auto-dismiss after 2.5s
        setTimeout(() => setMintTransition({ stage: "idle" }), 2500);
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
        type: "critical",
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

  const stableNfts = useMemo(() => displayNfts ?? [], [displayNfts]);
  const gridSlots = useMemo(() => {
    if (isAdmin) {
      return buildAdminGrid(stableNfts);
    }
    return buildGrid(stableNfts.slice(0, MAX_NFTS));
  }, [stableNfts, isAdmin]);

  // 3-tier auth gating for Mint UI
  const _effectiveCreatorId = creatorId ?? principal ?? "";

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
  if (!profileReady) {
    return (
      <div className="flex flex-col gap-4 p-3 max-w-xl mx-auto w-full pb-24">
        <BrandedAuthGate subtitle="Mint, claim, and collect NFTs on the Internet Computer." />
        <div
          className="flex flex-col items-center justify-center py-20 gap-3"
          data-ocid="home.profile_loading_state"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Creating profile...</p>
        </div>
      </div>
    );
  }

  // Full Mint UI — authState === "ready" && profileReady
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
            const nftSlotNumber = isAdmin ? i : i < UPLOAD_SLOT_IDX ? i + 1 : i;
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
                  profileReady={profileReady}
                  subscriptionTier={subscriptionTier}
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
                        {mintedClaimUrl}
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
                            .writeText(mintedClaimUrl)
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
                        onClick={() => window.open(mintedClaimUrl, "_blank")}
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
