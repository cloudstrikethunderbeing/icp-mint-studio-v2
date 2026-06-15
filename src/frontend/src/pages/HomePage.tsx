import { ExternalBlob, createActor } from "@/backend";
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
import { useActor } from "@caffeineai/core-infrastructure";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Fingerprint,
  Hammer,
  ImageOff,
  Info,
  Loader2,
  Lock,
  Plus,
  QrCode,
  Share2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const MAX_NFTS = 8;
const UPLOAD_SLOT_IDX = 4; // center of 3x3 grid (0-indexed)

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
  edition: string;
  collectionId?: bigint;
  businessName?: string;
  website?: string;
  discountCode?: string;
  membershipId?: string;
};

function buildGrid(nfts: Nft[]): GridSlot[] {
  const slots: GridSlot[] = [];
  let nftIdx = 0;
  for (let i = 0; i < 9; i++) {
    if (i === UPLOAD_SLOT_IDX) {
      slots.push({ kind: "upload" });
    } else if (nftIdx < nfts.length) {
      slots.push({ kind: "nft", nft: nfts[nftIdx++] });
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
}: { nft: Nft; slotNumber: number; onSelect: (nft: Nft) => void }) {
  const [imgError, setImgError] = useState(false);
  const imgUrl = nft.imageBlob.getDirectURL();
  const handleClick = useCallback(() => onSelect(nft), [onSelect, nft]);
  return (
    <button
      type="button"
      className="aspect-square rounded-xl overflow-hidden bg-muted relative cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={handleClick}
      aria-label={`View NFT: ${nft.title}`}
      data-ocid={`home.nft_card.item.${slotNumber}`}
    >
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
  isAuthenticated,
  collections,
  onMint,
  isMinting,
  uploadProgress,
  mintError,
  setMintError,
  mintSuccessSignal,
  mintDialogOpen,
  setMintDialogOpen,
}: {
  isAuthenticated: boolean;
  collections: CollectionWithCount[];
  onMint: (params: MintParams) => void;
  isMinting: boolean;
  uploadProgress: number;
  mintError: string | null;
  setMintError: (err: string | null) => void;
  mintSuccessSignal: number;
  mintDialogOpen: boolean;
  setMintDialogOpen: (v: boolean) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [edition, setEdition] = useState("1/1");
  const [collectionId, setCollectionId] = useState<string>("");
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [membershipId, setMembershipId] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // isMintingLocal removed — use mintMutation.isPending as the single source of truth

  useEffect(() => {
    if (mintSuccessSignal > 0) {
      setMintDialogOpen(false);
      setFile(null);
      setPreview(null);
      setTitle("");
      setDescription("");
      setEdition("1/1");
      setCollectionId("");
      setBusinessName("");
      setWebsite("");
      setDiscountCode("");
      setMembershipId("");
      setShowAdvanced(false);
      setMintError(null);
    }
  }, [mintSuccessSignal, setMintError, setMintDialogOpen]);

  const handleFile = useCallback(
    (f: File) => {
      const validTypes = ["image/png", "image/jpeg", "image/webp"];
      if (!validTypes.includes(f.type)) {
        toast.error("Only PNG, JPG, and WEBP files are accepted.");
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error("File must be under 5MB.");
        return;
      }
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setMintDialogOpen(true);
    },
    [setMintDialogOpen],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleMint() {
    if (!file || !title.trim()) return;
    onMint({
      file,
      title,
      description,
      edition: edition || "1/1",
      collectionId: collectionId ? BigInt(collectionId) : undefined,
      businessName: businessName.trim() || undefined,
      website: website.trim() || undefined,
      discountCode: discountCode.trim() || undefined,
      membershipId: membershipId.trim() || undefined,
    });
  }

  function resetForm() {
    setMintDialogOpen(false);
    setFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
    setEdition("1/1");
    setCollectionId("");
    setBusinessName("");
    setWebsite("");
    setDiscountCode("");
    setMembershipId("");
    setShowAdvanced(false);
    // isMintingLocal removed — loading state comes from mintMutation.isPending
  }

  if (!isAuthenticated) {
    return (
      <div
        className="aspect-square rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-1.5 p-2"
        data-ocid="home.upload_card"
      >
        <Lock className="text-primary/60 text-lg" />
        <span className="text-xs text-muted-foreground text-center leading-tight">
          Connect to mint
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`aspect-square rounded-xl border-2 border-dashed transition-colors duration-200 flex flex-col items-center justify-center gap-1.5 p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          dragOver
            ? "border-primary bg-primary/10"
            : "border-primary/50 bg-primary/5 hover:border-primary hover:bg-primary/10"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        aria-label="Upload and mint NFT"
        data-ocid="home.upload_card"
      >
        {isMinting ? (
          <>
            <Loader2 className="animate-spin text-primary text-lg" />
            <span className="text-xs text-primary">{uploadProgress}%</span>
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
            setEdition("1/1");
            setCollectionId("");
            setBusinessName("");
            setWebsite("");
            setDiscountCode("");
            setMembershipId("");
            setShowAdvanced(false);
            setMintError(null);
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
              <Label htmlFor="mint-edition">Edition</Label>
              <Input
                id="mint-edition"
                value={edition}
                onChange={(e) => setEdition(e.target.value.slice(0, 20))}
                placeholder="1/1"
                maxLength={20}
                data-ocid="home.mint_edition_input"
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
                    <SelectItem value="">None</SelectItem>
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
              disabled={!title.trim() || isMinting}
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
  const { resolvedTheme } = useTheme();
  const { isAuthenticated, actor, principal, login } = useAuth();
  const queryClient = useQueryClient();
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

  const [mintOverlayDismissVisible, setMintOverlayDismissVisible] =
    useState(false);

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

  const { data: nfts = [], isLoading } = useQuery<Nft[]>({
    queryKey: ["myActiveNfts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listMyActiveNfts();
    },
    enabled: !!actor && isAuthenticated,
  });

  const { data: collections = [] } = useQuery<CollectionWithCount[]>({
    queryKey: ["collections"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listMyCollections();
    },
    enabled: !!actor && isAuthenticated && mintDialogOpen,
  });

  const { data: slotsStatus } = useQuery({
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
        params.edition.trim() || "1/1",
        params.collectionId ?? null,
        params.businessName ?? null,
        params.website ?? null,
        params.discountCode ?? null,
        params.membershipId ?? null,
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
      const tokenIdStr =
        tokenId !== undefined && tokenId !== 0n
          ? tokenId.toString()
          : undefined;
      const nftUniqueId = ok?.nftUniqueId;
      setMintTransition({
        stage: "success",
        message: tokenIdStr
          ? `Token ID: ${tokenIdStr} minted successfully!`
          : "NFT minted successfully!",
      });
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-medium">
            {tokenIdStr
              ? `Token ID: ${tokenIdStr} minted successfully!`
              : "NFT minted successfully!"}
          </span>
          {nftUniqueId && (
            <span className="text-xs text-muted-foreground">
              Unique ID: {nftUniqueId}
            </span>
          )}
          <img
            src="/assets/logo.jpg"
            alt="ICP Mint Studio"
            className="h-8 w-auto mt-1 rounded-sm self-start"
            loading="lazy"
          />
        </div>,
      );
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
      setTimeout(() => setMintTransition({ stage: "idle" }), 2500);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Mint failed");
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
    onMutate: () => {
      toast.loading("Deleting NFT...", { id: "delete-toast" });
    },
    onSuccess: () => {
      toast.success("NFT deleted", { id: "delete-toast" });
      setSelectedNft(null);
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      // delete does NOT free slots — do NOT invalidate slotsStatus
    },
    onError: (err: Error) => {
      toast.error(err.message || "Delete failed", { id: "delete-toast" });
    },
  });

  const burnMutation = useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.burnNft(id);
    },
    onMutate: () => {
      toast.loading("Burning NFT...", { id: "burn-toast" });
    },
    onSuccess: () => {
      toast.success("NFT burned permanently", { id: "burn-toast" });
      setSelectedNft(null);
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["slotsStatus"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Burn failed", { id: "burn-toast" });
    },
  });

  const gridSlots = useMemo(() => buildGrid(nfts.slice(0, MAX_NFTS)), [nfts]);

  return (
    <div className="flex flex-col gap-4 p-3 max-w-xl mx-auto w-full pb-24">
      {/* Hero — brand trust with logo */}
      <div className="flex flex-col items-center text-center gap-3 py-6">
        <img
          src={
            resolvedTheme === "light"
              ? "/assets/logo-inverted.jpg"
              : "/assets/logo.jpg"
          }
          alt="ICP Mint Studio"
          className="h-20 w-auto rounded-lg shadow-sm"
          loading="lazy"
        />
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Mint. Own. Verify.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            The easiest way to create and verify NFTs on the Internet Computer.
          </p>
        </div>
        {!isAuthenticated && (
          <Button
            type="button"
            onClick={() => login()}
            className="mt-2 rounded-full px-6"
            data-ocid="home.hero_connect_button"
          >
            <Fingerprint className="mr-2" />
            Start Minting
          </Button>
        )}
      </div>

      {/* Start Here — 1-2-3 action steps for authenticated users */}
      {isAuthenticated && (
        <div
          className="bg-card border border-border rounded-xl p-3 space-y-2"
          data-ocid="home.start_here_section"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Start Here
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                document
                  .querySelector('[data-ocid="home.upload_card"]')
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              className="flex flex-col items-center gap-1 rounded-lg bg-primary/5 border border-primary/10 p-2 hover:bg-primary/10 transition-colors"
              data-ocid="home.step_1_button"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                1
              </span>
              <span className="text-xs font-medium text-foreground text-center leading-tight">
                Mint NFT
              </span>
            </button>
            <a
              href="/verify"
              className="flex flex-col items-center gap-1 rounded-lg bg-primary/5 border border-primary/10 p-2 hover:bg-primary/10 transition-colors"
              data-ocid="home.step_2_link"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                2
              </span>
              <span className="text-xs font-medium text-foreground text-center leading-tight">
                Verify NFT
              </span>
            </a>
            <a
              href="/profile"
              className="flex flex-col items-center gap-1 rounded-lg bg-primary/5 border border-primary/10 p-2 hover:bg-primary/10 transition-colors"
              data-ocid="home.step_3_link"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                3
              </span>
              <span className="text-xs font-medium text-foreground text-center leading-tight">
                View Profile
              </span>
            </a>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <p className="text-xs text-muted-foreground -mt-2">
          NFTs are organized by Slots (Collections)
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2" data-ocid="home.loading_state">
          {Array.from({ length: 9 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2" data-ocid="home.grid">
          {gridSlots.map((slot, i) => {
            const nftSlotNumber = i < UPLOAD_SLOT_IDX ? i + 1 : i;
            if (slot.kind === "upload") {
              return (
                <UploadCard
                  key="upload"
                  isAuthenticated={isAuthenticated}
                  collections={collections}
                  onMint={(params) => mintMutation.mutate(params)}
                  isMinting={mintMutation.isPending}
                  uploadProgress={uploadProgress}
                  mintError={mintError}
                  setMintError={setMintError}
                  mintDialogOpen={mintDialogOpen}
                  setMintDialogOpen={setMintDialogOpen}
                  mintSuccessSignal={mintSuccessSignal}
                />
              );
            }
            if (slot.kind === "nft") {
              return (
                <NftGridCard
                  key={slot.nft.id.toString()}
                  nft={slot.nft}
                  slotNumber={nftSlotNumber}
                  onSelect={setSelectedNft}
                />
              );
            }
            // biome-ignore lint/suspicious/noArrayIndexKey: grid slots are positionally stable
            return <EmptySlot key={`grid-empty-${i}`} idx={i + 1} />;
          })}
        </div>
      )}

      {/* State mismatch warning: backend reports slots used but no NFTs visible */}
      {isAuthenticated &&
        !isLoading &&
        slotsStatus &&
        Number(slotsStatus.used) > 0 &&
        nfts.length === 0 && (
          <div
            className="rounded-lg border border-yellow-600 bg-yellow-900/20 p-3 flex items-start gap-2"
            data-ocid="home.state_mismatch_warning"
          >
            <AlertTriangle className="text-yellow-300 mt-0.5 text-sm" />
            <p className="text-xs text-yellow-300 leading-relaxed">
              State mismatch detected — backend slot state is inconsistent. No
              NFTs found. Please contact support if this persists.
            </p>
          </div>
        )}

      {!isAuthenticated && !isLoading && (
        <p
          className="text-center text-xs text-muted-foreground"
          data-ocid="home.auth_required"
        >
          <Info className="mr-1 inline" />
          Please connect your Internet Identity before uploading
        </p>
      )}

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
