import type { CollectionWithCount, Nft } from "@/backend";
import { NftDetailModal } from "@/components/NftDetailModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Flame,
  Folder,
  FolderOpen,
  Layers,
  Loader2,
  Minus,
  MoreVertical,
  PenTool,
  Plus,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import BrandedAuthGate from "../components/BrandedAuthGate";
import { usePermissions } from "../hooks/usePermissions";
import {
  useAddNftToCollection,
  useBurnNft,
  useCollections,
  useCreateCollection,
  useDeleteNft,
  useMyActiveNfts,
  useRemoveNftFromCollection,
} from "../hooks/useQueries";

type TabKey = "all" | "collections" | "claimed" | "created" | "recent";

interface NftCardProps {
  nft: Nft;
  index: number;
  onClick: () => void;
  onDelete?: (id: bigint) => void;
  onBurn?: (id: bigint) => Promise<void>;
  onRemoveFromCollection?: (nftId: bigint, collectionId: bigint) => void;
  onAddToCollection?: (nftId: bigint, collectionId: bigint) => Promise<void>;
  collections: CollectionWithCount[];
  callerPrincipal: string;
}

type CardConfirmState =
  | { kind: "none" }
  | { kind: "remove_collection" }
  | { kind: "delete" }
  | { kind: "burn"; nftId: bigint }
  | { kind: "add_to_collection"; nftId: bigint };

function NftCard({
  nft,
  index,
  onClick,
  onDelete,
  onBurn,
  onRemoveFromCollection,
  onAddToCollection,
  collections,
  callerPrincipal,
}: NftCardProps) {
  const imageUrl = nft.imageBlob?.getDirectURL() ?? "";
  const [confirm, setConfirm] = useState<CardConfirmState>({ kind: "none" });
  const [burnInput, setBurnInput] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] =
    useState<string>("none");
  const [collectionActionError, setCollectionActionError] = useState<
    string | null
  >(null);

  // Determine ownership and action eligibility
  const isMintOwner = callerPrincipal === nft.creatorId;
  const isCurrentOwner = callerPrincipal === nft.ownerId.toText();
  const hasCollection =
    nft.collectionId !== undefined && nft.collectionId !== null;

  // Stop propagation so card click doesn't fire when action buttons are clicked
  function stopAnd(fn: () => void) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      fn();
    };
  }

  // Inline confirmation panel rendered at bottom of card (outside the image area)
  function ConfirmPanel() {
    if (confirm.kind === "none") return null;

    const isRemove = confirm.kind === "remove_collection";
    const isBurn = confirm.kind === "burn";
    const isAddToCollection = confirm.kind === "add_to_collection";

    if (isAddToCollection) {
      return (
        <div
          className="absolute inset-0 z-20 flex flex-col justify-end rounded-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
          <div className="relative p-3 space-y-2 bg-card border-t border-border">
            <p className="text-[11px] font-medium text-foreground leading-tight">
              Select a collection to add this NFT to:
            </p>
            {collectionActionError && (
              <p className="text-[10px] text-destructive">
                {collectionActionError}
              </p>
            )}
            <select
              value={selectedCollectionId}
              onChange={(e) => {
                setSelectedCollectionId(e.target.value);
                setCollectionActionError(null);
              }}
              className="w-full h-8 text-xs rounded-md border border-border bg-background px-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <option value="none">-- Select Collection --</option>
              {collections.map((col) => (
                <option key={String(col.id)} value={String(col.id)}>
                  {col.name}
                </option>
              ))}
            </select>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirm({ kind: "none" });
                  setSelectedCollectionId("none");
                  setCollectionActionError(null);
                }}
                className="flex-1 py-1.5 text-[11px] font-medium rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
                data-ocid={`collector.nft.add_collection_cancel_button.${index + 1}`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedCollectionId === "none"}
                onClick={async (e) => {
                  e.stopPropagation();
                  const colId = selectedCollectionId;
                  if (colId === "none" || !onAddToCollection) return;
                  try {
                    await onAddToCollection(nft.id, BigInt(colId));
                    setConfirm({ kind: "none" });
                    setSelectedCollectionId("none");
                    setCollectionActionError(null);
                  } catch (err) {
                    setCollectionActionError(
                      err instanceof Error
                        ? err.message
                        : "Failed to add to collection",
                    );
                  }
                }}
                className="flex-1 py-1.5 text-[11px] font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-ocid={`collector.nft.add_collection_confirm_button.${index + 1}`}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (isBurn) {
      return (
        <div
          className="absolute inset-0 z-20 flex flex-col justify-end rounded-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
          <div className="relative p-3 space-y-2 bg-card border-t border-border">
            <p className="text-[11px] font-medium text-foreground leading-tight">
              Type <span className="font-bold text-destructive">BURN</span> to
              permanently destroy this NFT. This cannot be undone.
            </p>
            <Input
              value={burnInput}
              onChange={(e) => setBurnInput(e.target.value)}
              placeholder="Type BURN"
              className="h-7 text-xs"
              onClick={(e) => e.stopPropagation()}
              data-ocid={`collector.nft.burn_input.${index + 1}`}
            />
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirm({ kind: "none" });
                  setBurnInput("");
                }}
                className="flex-1 py-1.5 text-[11px] font-medium rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
                data-ocid={`collector.nft.burn_cancel_button.${index + 1}`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={burnInput !== "BURN"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onBurn) {
                    onBurn(nft.id);
                  }
                  setConfirm({ kind: "none" });
                  setBurnInput("");
                }}
                className="flex-1 py-1.5 text-[11px] font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-ocid={`collector.nft.burn_confirm_button.${index + 1}`}
              >
                Burn
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="absolute inset-0 z-20 flex flex-col justify-end rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {/* Semi-transparent backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
        <div className="relative p-3 space-y-2 bg-card border-t border-border">
          <p className="text-[11px] font-medium text-foreground leading-tight">
            {isRemove
              ? "Remove this NFT from the collection?"
              : "Remove this NFT from your library? This cannot be undone."}
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirm({ kind: "none" });
              }}
              className="flex-1 py-1.5 text-[11px] font-medium rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
              data-ocid={`collector.nft.cancel_button.${index + 1}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isRemove && onRemoveFromCollection) {
                  onRemoveFromCollection(nft.id, nft.collectionId!);
                } else if (!isRemove && onDelete) {
                  onDelete(nft.id);
                }
                setConfirm({ kind: "none" });
              }}
              className="flex-1 py-1.5 text-[11px] font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              data-ocid={
                isRemove
                  ? `collector.nft.confirm_remove_button.${index + 1}`
                  : `collector.nft.confirm_delete_button.${index + 1}`
              }
            >
              {isRemove ? "Remove" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card
      className="overflow-hidden group cursor-pointer hover:shadow-md transition-shadow duration-200 min-w-0 relative"
      data-ocid={`collector.nft.item.${index + 1}`}
      onClick={confirm.kind === "none" ? onClick : undefined}
    >
      <ConfirmPanel />
      {/* More actions dropdown — always visible on mobile, hover on desktop */}
      <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 sm:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-full bg-background/90 backdrop-blur-sm border border-border text-foreground hover:bg-muted transition-colors"
              data-ocid={`collector.nft.more_button.${index + 1}`}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              data-ocid={`collector.nft.dropdown.view.${index + 1}`}
            >
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setConfirm({ kind: "add_to_collection", nftId: nft.id });
              }}
              data-ocid={`collector.nft.dropdown.add_to_collection.${index + 1}`}
            >
              Add to Collection
            </DropdownMenuItem>
            {isMintOwner && onBurn && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirm({ kind: "burn", nftId: nft.id });
                }}
                className="text-destructive focus:text-destructive"
                data-ocid={`collector.nft.dropdown.burn.${index + 1}`}
              >
                <Flame className="w-3.5 h-3.5 mr-2" />
                Burn
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Quick-action overlay — appears on hover, always visible on mobile */}
      <div className="absolute top-1.5 left-1.5 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 sm:opacity-100">
        {/* Remove from collection — only if inside a collection */}
        {hasCollection && onRemoveFromCollection && (
          <button
            type="button"
            onClick={stopAnd(() => setConfirm({ kind: "remove_collection" }))}
            className="p-1 rounded-full bg-background/90 backdrop-blur-sm border border-border text-destructive hover:bg-destructive/10 transition-colors"
            title="Remove from collection"
            data-ocid={`collector.nft.remove_collection_button.${index + 1}`}
          >
            <Minus className="w-3 h-3" />
          </button>
        )}
        {/* Delete — only if NOT mint owner (claimed/collected NFTs) */}
        {!isMintOwner && isCurrentOwner && onDelete && (
          <button
            type="button"
            onClick={stopAnd(() => setConfirm({ kind: "delete" }))}
            className="p-1 rounded-full bg-background/90 backdrop-blur-sm border border-border text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete NFT"
            data-ocid={`collector.nft.delete_button.${index + 1}`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="aspect-square bg-muted relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={nft.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 text-[10px] font-mono"
        >
          {nft.edition}
        </Badge>
        {/* Claimed / Created icon badge */}
        <div className="absolute top-2 left-2">
          {nft.claimedAt !== undefined && nft.claimedAt !== null ? (
            <Badge
              className="text-[9px] gap-0.5 px-1.5 py-0.5 bg-blue-500/90 text-white"
              data-ocid={`collector.nft.claimed_badge.${index + 1}`}
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
              Claimed
            </Badge>
          ) : (
            <Badge
              className="text-[9px] gap-0.5 px-1.5 py-0.5 bg-green-500/90 text-white"
              data-ocid={`collector.nft.created_badge.${index + 1}`}
            >
              <PenTool className="w-2.5 h-2.5" />
              Created
            </Badge>
          )}
        </div>
        {/* Verified badge overlay */}
        <div className="absolute bottom-2 left-2">
          <Badge className="text-[9px] gap-0.5 px-1.5 py-0.5 bg-primary/90 text-primary-foreground">
            <ShieldCheck className="w-2.5 h-2.5" />
            Verified
          </Badge>
        </div>
      </div>
      <CardContent className="p-3 min-w-0">
        <p
          className="text-sm font-semibold truncate text-foreground"
          title={nft.title}
        >
          {nft.title}
        </p>
        <p
          className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate"
          title={nft.nftUniqueId}
        >
          {nft.nftUniqueId}
        </p>
      </CardContent>
    </Card>
  );
}

function CollectorSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

const ALL_TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "collections", label: "Collections" },
  { key: "claimed", label: "Claimed" },
  { key: "created", label: "Created" },
  { key: "recent", label: "Recent" },
];

const FREE_TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "claimed", label: "Claimed" },
  { key: "created", label: "Created" },
  { key: "recent", label: "Recent" },
];

export default function CollectorPage() {
  const { isAuthenticated, principal, authState } = useAuth();
  const canCreateCollections = authState === "ready";

  const TABS = authState === "ready" ? ALL_TABS : FREE_TABS;

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedNft, setSelectedNft] = useState<Nft | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    bigint | "claimed" | null
  >(null);

  const { data: nfts = [], isLoading: nftsLoading } = useMyActiveNfts();
  const { data: collections = [], isLoading: collectionsLoading } =
    useCollections();

  // Mutations for quick actions on NFT cards
  const deleteNft = useDeleteNft();
  const burnNft = useBurnNft();
  const removeFromCollection = useRemoveNftFromCollection();
  const createCollection = useCreateCollection();
  const addToCollection = useAddNftToCollection();

  const principalText = principal ?? "";

  const claimedNfts = useMemo(
    () => nfts.filter((nft) => nft.ownerId.toText() !== nft.creatorId),
    [nfts],
  );

  const collectionFilteredNfts = useMemo(() => {
    if (selectedCollectionId === null) return nfts;
    if (selectedCollectionId === "claimed") return claimedNfts;
    return nfts.filter(
      (nft) =>
        nft.collectionId !== undefined &&
        nft.collectionId !== null &&
        nft.collectionId === selectedCollectionId,
    );
  }, [selectedCollectionId, nfts, claimedNfts]);

  const filteredNfts = useMemo(() => {
    let base = collectionFilteredNfts;
    switch (activeTab) {
      case "all":
        break;
      case "claimed":
        base = base.filter((nft) => nft.ownerId.toText() !== nft.creatorId);
        break;
      case "created":
        base = base.filter((nft) => nft.creatorId === principalText);
        break;
      case "recent":
        base = [...base].sort(
          (a, b) => Number(b.mintDate) - Number(a.mintDate),
        );
        break;
      default:
        break;
    }
    return base;
  }, [activeTab, collectionFilteredNfts, principalText]);

  function openNftDetail(nft: Nft) {
    setSelectedNft(nft);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedNft(null);
  }

  const isLoading = nftsLoading;

  const tabCount = useMemo(() => {
    switch (activeTab) {
      case "all":
        return nfts.length;
      case "claimed":
        return claimedNfts.length;
      case "created":
        return nfts.filter((nft) => nft.creatorId === principalText).length;
      case "recent":
        return nfts.length;
      case "collections":
        return collections.length + 1; // +1 for virtual "Claimed" collection
      default:
        return 0;
    }
  }, [activeTab, nfts, collections, principalText, claimedNfts]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6" data-ocid="collector.page">
        <BrandedAuthGate subtitle="Sign in to view your NFT collection." />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6" data-ocid="collector.page">
      {/* Header */}
      <div
        className="flex items-center justify-between mb-4"
        data-ocid="collector.section"
      >
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">My Library</h1>
          {!isLoading && (
            <Badge
              variant="secondary"
              className="text-xs font-mono"
              data-ocid="collector.nft_count_badge"
            >
              {tabCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCreateCollections && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              data-ocid="collector.create_collection_button"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Create
            </Button>
          )}
          <Link to="/verify">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              data-ocid="collector.go_verify_button"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Verify
            </Button>
          </Link>
        </div>
      </div>

      {/* Collections inline section */}
      <div className="mb-4" data-ocid="collector.collections_section">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">Collections</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
          {/* All NFTs card */}
          <button
            type="button"
            onClick={() => setSelectedCollectionId(null)}
            className={`shrink-0 w-28 snap-start rounded-lg border overflow-hidden text-left transition-all duration-200 ${
              selectedCollectionId === null
                ? "border-primary ring-1 ring-primary"
                : "border-border hover:border-primary/50"
            }`}
            data-ocid="collector.collection.all_card"
          >
            <div className="aspect-square bg-muted relative overflow-hidden flex items-center justify-center">
              <Layers className="w-8 h-8 text-muted-foreground" />
              <Badge
                variant="secondary"
                className="absolute top-1.5 right-1.5 text-[9px] font-mono"
              >
                {nfts.length}
              </Badge>
            </div>
            <div className="p-2">
              <p className="text-xs font-semibold truncate text-foreground">
                All NFTs
              </p>
            </div>
          </button>

          {/* Claimed system card */}
          <button
            type="button"
            onClick={() => setSelectedCollectionId("claimed")}
            className={`shrink-0 w-28 snap-start rounded-lg border overflow-hidden text-left transition-all duration-200 ${
              selectedCollectionId === "claimed"
                ? "border-primary ring-1 ring-primary"
                : "border-border hover:border-primary/50"
            }`}
            data-ocid="collector.collection.claimed_card"
          >
            <div className="aspect-square bg-muted relative overflow-hidden flex items-center justify-center">
              <Wallet className="w-8 h-8 text-blue-500" />
              <Badge
                variant="secondary"
                className="absolute top-1.5 right-1.5 text-[9px] font-mono"
              >
                {claimedNfts.length}
              </Badge>
            </div>
            <div className="p-2">
              <p className="text-xs font-semibold truncate text-foreground">
                Claimed
              </p>
            </div>
          </button>

          {/* User collections */}
          {collections.map((collection, index) => (
            <button
              key={String(collection.id)}
              type="button"
              onClick={() => setSelectedCollectionId(collection.id)}
              className={`shrink-0 w-28 snap-start rounded-lg border overflow-hidden text-left transition-all duration-200 ${
                selectedCollectionId === collection.id
                  ? "border-primary ring-1 ring-primary"
                  : "border-border hover:border-primary/50"
              }`}
              data-ocid={`collector.collection.item.${index + 1}`}
            >
              <div className="aspect-square bg-muted relative overflow-hidden">
                {collection.previewImage ? (
                  <img
                    src={collection.previewImage}
                    alt={collection.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Folder className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <Badge
                  variant="secondary"
                  className="absolute top-1.5 right-1.5 text-[9px] font-mono"
                >
                  {String(collection.nftCount)}
                </Badge>
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold truncate text-foreground">
                  {collection.name}
                </p>
              </div>
            </button>
          ))}

          {collectionsLoading && (
            <div className="shrink-0 w-28 snap-start">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-3 w-3/4 mt-2" />
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 overflow-x-auto pb-3 mb-4 -mx-4 px-4 scrollbar-hide"
        data-ocid="collector.tab_bar"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
              setSelectedCollectionId(null);
            }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 ${
              activeTab === tab.key && selectedCollectionId === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            data-ocid={`collector.tab.${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <CollectorSkeleton />
      ) : filteredNfts.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center"
          data-ocid="collector.empty_state"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Wallet className="w-7 h-7 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              No NFTs yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Claim one using a claim link, or verify an existing NFT.
            </p>
          </div>
          <div className="flex flex-col gap-2 items-center">
            <Link to="/verify">
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-ocid="collector.empty_verify_button"
              >
                Verify an NFT
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div
            className="grid grid-cols-3 gap-3 sm:grid-cols-3"
            data-ocid="collector.nft.list"
          >
            {filteredNfts.map((nft, index) => (
              <NftCard
                key={nft.nftUniqueId}
                nft={nft}
                index={index}
                onClick={() => openNftDetail(nft)}
                onDelete={(id) => deleteNft.mutate(id)}
                onBurn={async (id) => burnNft.mutate(id)}
                onRemoveFromCollection={(nftId, collectionId) =>
                  removeFromCollection.mutate({ nftId, collectionId })
                }
                onAddToCollection={async (nftId, collectionId) =>
                  addToCollection.mutateAsync({ nftId, collectionId })
                }
                collections={collections}
                callerPrincipal={principalText}
              />
            ))}
          </div>
        </>
      )}

      {/* Create Collection Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-ocid="collector.create_collection_dialog">
          <DialogHeader>
            <DialogTitle>New Collection</DialogTitle>
            <DialogDescription className="sr-only">
              Create a new collection to organize your NFTs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="collection-name">Name</Label>
              <Input
                id="collection-name"
                placeholder="e.g. Rare Finds"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                data-ocid="collector.collection_name_input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection-description">Description</Label>
              <Input
                id="collection-description"
                placeholder="Optional description"
                value={collectionDescription}
                onChange={(e) => setCollectionDescription(e.target.value)}
                data-ocid="collector.collection_description_input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setCollectionName("");
                setCollectionDescription("");
              }}
              data-ocid="collector.create_collection_cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!collectionName.trim() || createCollection.isPending}
              onClick={() => {
                createCollection.mutate(
                  {
                    name: collectionName.trim(),
                    description: collectionDescription.trim(),
                  },
                  {
                    onSuccess: () => {
                      setCreateDialogOpen(false);
                      setCollectionName("");
                      setCollectionDescription("");
                    },
                  },
                );
              }}
              data-ocid="collector.create_collection_confirm_button"
            >
              {createCollection.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Read-only NFT Detail Modal */}
      {selectedNft && (
        <NftDetailModal
          key={selectedNft.nftUniqueId}
          nft={selectedNft}
          open={modalOpen}
          onClose={closeModal}
          onDelete={() => {}}
          onBurn={async () => {}}
          callerPrincipal={principal ?? ""}
          canisterId=""
          nftUniqueId={selectedNft.nftUniqueId}
          readOnly={false}
        />
      )}
    </div>
  );
}
