import { type CollectionWithCount, type Nft, NftStatus } from "@/backend";
import { NftDetailModal } from "@/components/NftDetailModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { cn } from "@/lib/utils";
import { resolveNftImageUrl } from "@/utils/nftNormalization";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flame,
  Folder,
  FolderOpen,
  ImageOff,
  Layers,
  Loader2,
  Minus,
  MoreVertical,
  Plus,
  ServerCrash,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BrandedAuthGate from "../components/BrandedAuthGate";
import {
  useAddNftToCollection,
  useBackendHealth,
  useBurnNft,
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useDeleteNft,
  useMyActiveNfts,
  useMyNfts,
  useRemoveNftFromCollection,
} from "../hooks/useQueries";
import { devLog } from "../utils/devLog";

type TabKey = "all" | "collections" | "claimed" | "created" | "recent";

// [CANONICAL] Collapse a listing feed to one entry per canonical NFT identity.
//
// The Library derives ownership from the backend owner index, which can carry
// stale or repeated ids (e.g. a claim/purchase that rewrote the index without
// removing the previous entry). Without a client-side collapse the same NFT
// renders twice. Identity is the canonical `nftUniqueId` (format
// `canisterId:0:tokenId`); fall back to the numeric `id` only when a record has
// no unique id. When two records share an identity we keep the RICHER one so
// media, name/description, creator/collection, attributes and provenance are
// never lost to a thinner duplicate.
function nftCompleteness(nft: Nft): number {
  let score = 0;
  if (resolveNftImageUrl(nft.imageBlob)) score += 4;
  if (nft.claimedAt != null) score += 2;
  if (nft.edition) score += 1;
  if (nft.description) score += 1;
  if (nft.collectionId != null) score += 1;
  if (nft.priceUsd != null) score += 1;
  return score;
}

function dedupeNftsByCanonicalIdentity(nfts: Nft[]): Nft[] {
  const byIdentity = new Map<string, Nft>();
  for (const nft of nfts) {
    if (!nft) continue;
    const identity =
      nft.nftUniqueId && nft.nftUniqueId.trim() !== ""
        ? nft.nftUniqueId
        : `id:${String(nft.id)}`;
    const existing = byIdentity.get(identity);
    if (!existing || nftCompleteness(nft) > nftCompleteness(existing)) {
      byIdentity.set(identity, nft);
    }
  }
  return Array.from(byIdentity.values());
}

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
  // [IMG-RESOLVE] Read the resolved synchronous `directURL` field via the
  // shared helper — `getDirectURL()` is async and would yield a Promise here.
  const imageUrl = resolveNftImageUrl(nft.imageBlob);
  const [imgError, setImgError] = useState(false);
  const [confirm, setConfirm] = useState<CardConfirmState>({ kind: "none" });
  const [burnInput, setBurnInput] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] =
    useState<string>("none");
  const [collectionActionError, setCollectionActionError] = useState<
    string | null
  >(null);
  // [DISSOLVE] Dissolve-out transition state, mirroring Studio's
  // deletingTokenIds/burningTokenIds. The card fades/scales out while the
  // delete or burn mutation is in flight, then the optimistic cache removal
  // unmounts it — no manual refresh needed.
  const [dissolving, setDissolving] = useState<"delete" | "burn" | null>(null);

  // Determine ownership and action eligibility.
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
                  // [DISSOLVE] Start the dissolve-out before the mutation so
                  // the card animates out while the burn is in flight.
                  setDissolving("burn");
                  if (onBurn) {
                    onBurn(nft.id).catch(() => setDissolving(null));
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
                  // [DISSOLVE] Start the dissolve-out before the mutation so
                  // the card animates out while the delete is in flight.
                  setDissolving("delete");
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
      className={cn(
        "overflow-hidden group cursor-pointer hover:shadow-md transition-all duration-300 ease-out min-w-0 relative",
        // [DISSOLVE] Dissolve-out while deleting/burning: fade + scale down,
        // mirroring Studio's deletingTokenIds/burningTokenIds treatment.
        dissolving !== null
          ? "opacity-0 scale-95 pointer-events-none"
          : "opacity-100 scale-100",
      )}
      data-ocid={`collector.nft.item.${index + 1}`}
      data-dissolving={dissolving ?? undefined}
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

      {/* Quick-action overlay — always visible */}
      <div className="absolute top-1.5 left-1.5 z-10 flex gap-1 opacity-100 transition-opacity duration-200">
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
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={nft.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground text-xs">
            <ImageOff className="text-muted-foreground text-xl" />
            <span>No image</span>
          </div>
        )}
      </div>
      <div className="price-strip">
        <span className="price-strip-label">Price</span>
        <span
          className="price-strip-value"
          data-state={nft.priceUsd === undefined ? "unlisted" : "listed"}
          data-ocid={`collector.nft.price.${index + 1}`}
        >
          {nft.priceUsd !== undefined
            ? `$${nft.priceUsd.toString()}`
            : "Not for sale"}
        </span>
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

export default function CollectorPage() {
  const { isAuthenticated, principal, authState, actor } = useAuth();
  devLog("[RENDER] CollectorPage render:", {
    isAuthenticated,
    authState,
    principal,
  });

  // Backend health / canister identity guard (rotation defense). If the
  // backend is wrong, unavailable, or empty, surface a loud error instead of
  // silently rendering an empty catalog. Defense-in-depth on top of the
  // global CanisterGuard in App.tsx.
  const backendHealth = useBackendHealth();
  devLog("[CANISTER] CollectorPage backend health:", backendHealth);

  const canCreateCollections = authState === "ready";

  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const [selectedNft, setSelectedNft] = useState<Nft | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    bigint | "claimed" | null
  >(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteCollection, setPendingDeleteCollection] =
    useState<CollectionWithCount | null>(null);

  // [FIND-ID] Direct detail lookup for NFTs that no list surface shows
  // (deleted/burned records are filtered out of every listing but remain
  // retrievable by id). Owners paste an NFT Unique ID to open its status view.
  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // [PAGE] Paginated listing. The backend listing endpoints now take
  // (offset, limit) and return an NftSummaryPage { items, total, offset, limit }
  // with a lightweight summary projection (id, title, thumbnail, status). The
  // shared listing hooks accept the pagination window and map each summary into
  // an Nft (thumbnail -> imageBlob.directURL) so every existing card feature
  // keeps working through the single resolveNftImageUrl path.
  const PAGE_SIZE = 12;
  const [pageIndex, setPageIndex] = useState(0);
  const offset = BigInt(pageIndex * PAGE_SIZE);
  const pageLimit = BigInt(PAGE_SIZE);

  const { data: activeNftsRaw = [], isLoading: nftsLoading } = useMyActiveNfts(
    principal,
    offset,
    pageLimit,
  );
  // Full feed (listMyNfts) includes claimed NFTs (claimedAt != null) that the
  // active feed (listMyActiveNfts) excludes on the backend. The 'All' tab
  // sources from this full feed so it shows every NFT the user owns (minted +
  // claimed). The 'Created' and 'Recent' tabs stay on the active feed because
  // claimed NFTs were not user-created and Recent reflects self-minting.
  const { data: allMyNftsRaw = [] } = useMyNfts(principal, offset, pageLimit);
  // [CANONICAL] Collapse each feed to one entry per canonical identity so a
  // claimed or purchased NFT appears exactly once even when the backend owner
  // index carries a stale or repeated id. Every tab, count, filter and the
  // detail modal read from these deduped sources.
  const nfts = useMemo(
    () => dedupeNftsByCanonicalIdentity(activeNftsRaw),
    [activeNftsRaw],
  );
  // 'All' tab source: the full feed (useMyNfts) so it shows every owned NFT
  // (minted + claimed). Kept as a named memo so the 'All' tab, its count, and
  // its collection-filtered variants all read from the same full-feed source.
  const allTabNfts = useMemo(
    () => dedupeNftsByCanonicalIdentity(allMyNftsRaw),
    [allMyNftsRaw],
  );

  // [PAGE] Page totals for the pagination controls. The listing hooks return
  // only the page's items, so read the page envelope's `total` directly from
  // the actor for the active tab's feed. Keyed by the same window so it stays
  // in lockstep with the hooks above.
  const { data: pageTotals } = useQuery<{
    activeTotal: number;
    allTotal: number;
  }>({
    queryKey: ["collectorPageTotals", principal ?? "anonymous", pageIndex],
    queryFn: async () => {
      if (!actor) return { activeTotal: 0, allTotal: 0 };
      const [activePage, allPage] = await Promise.all([
        actor.listMyActiveNfts(offset, pageLimit),
        actor.listMyNfts(offset, pageLimit),
      ]);
      return {
        activeTotal: Number(activePage.total),
        allTotal: Number(allPage.total),
      };
    },
    enabled: !!actor,
    staleTime: 30_000,
  });
  const { data: collections = [], isLoading: collectionsLoading } =
    useCollections();

  // [CREATOR-ID] The caller's canonical creator id. `Nft.creatorId` is a
  // derived hex id (NOT the principal), so the "Created" tab must compare
  // against this value. Without it the Created tab always reported 0 even when
  // the caller had minted NFTs.
  const { data: callerCreatorId = "" } = useQuery<string>({
    queryKey: ["callerCreatorId", principal ?? "anonymous"],
    queryFn: async () => {
      if (!actor) return "";
      const profile = await actor.getCallerProfile();
      return profile.creatorId ?? "";
    },
    enabled: !!actor && isAuthenticated,
    staleTime: 60_000,
  });

  // Mutations for quick actions on NFT cards
  const deleteNft = useDeleteNft();
  const burnNft = useBurnNft();
  const removeFromCollection = useRemoveNftFromCollection();
  const createCollection = useCreateCollection();
  const addToCollection = useAddNftToCollection();
  const deleteCollection = useDeleteCollection();

  const principalText = principal ?? "";

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

  const TABS = authState === "ready" ? ALL_TABS : FREE_TABS;

  // Claimed = NFTs actually claimed via a claim link, signalled by a non-null
  // claimedAt bigint. Sourced from useMyNfts (listMyNfts) — the same full feed
  // that powers the 'All' tab — and filtered to claimedAt != null. The 'All'
  // tab shows the unfiltered full feed; this tab shows its claimed subset.
  const claimedNfts = useMemo(
    () => allTabNfts.filter((nft) => nft.claimedAt != null),
    [allTabNfts],
  );

  function getTabCount(key: TabKey): number {
    switch (key) {
      case "all":
        return allTabNfts.length;
      case "collections":
        return collections.length;
      case "claimed":
        return claimedNfts.length;
      case "created":
        return nfts.filter((nft) => nft.creatorId === callerCreatorId).length;
      case "recent":
        return nfts.length;
      default:
        return 0;
    }
  }

  const filteredNfts = useMemo(() => {
    switch (activeTab) {
      case "all":
        // 'All' tab sources from the full feed (useMyNfts) so it shows every
        // owned NFT (minted + claimed) across all collection-filter states.
        if (selectedCollectionId === null) return allTabNfts;
        if (selectedCollectionId === "claimed") return claimedNfts;
        return allTabNfts.filter(
          (nft) =>
            nft.collectionId !== undefined &&
            nft.collectionId !== null &&
            nft.collectionId === selectedCollectionId,
        );
      case "claimed":
        // Claimed tab renders NFTs actually claimed via a claim link
        // (claimedAt != null), sourced from the full feed (useMyNfts).
        // When a collection filter is active, filter claimedNfts by that
        // collection; otherwise use the unfiltered claimed slice.
        if (selectedCollectionId === null) return claimedNfts;
        if (selectedCollectionId === "claimed") return claimedNfts;
        return claimedNfts.filter(
          (nft) =>
            nft.collectionId !== undefined &&
            nft.collectionId !== null &&
            nft.collectionId === selectedCollectionId,
        );
      case "created":
        // 'Created' stays on the ACTIVE feed (useMyActiveNfts). Claimed NFTs
        // were not created by the user, so they must not appear here.
        return nfts.filter((nft) => nft.creatorId === callerCreatorId);
      case "recent":
        // 'Recent' stays on the ACTIVE feed (useMyActiveNfts), sorted by
        // mintDate desc. Recent reflects self-minting activity, not claims.
        return [...nfts].sort(
          (a, b) => Number(b.mintDate) - Number(a.mintDate),
        );
      default:
        return nfts;
    }
  }, [
    activeTab,
    allTabNfts,
    claimedNfts,
    nfts,
    selectedCollectionId,
    callerCreatorId,
  ]);

  // [PAGE] Server-side total for the active tab's feed. 'all'/'claimed' read
  // the full feed (listMyNfts); 'created'/'recent' read the active feed.
  const pageTotal = useMemo(() => {
    if (!pageTotals) return 0;
    return activeTab === "all" || activeTab === "claimed"
      ? pageTotals.allTotal
      : pageTotals.activeTotal;
  }, [activeTab, pageTotals]);

  const pageCount = Math.max(1, Math.ceil(pageTotal / PAGE_SIZE));
  const canPrevPage = pageIndex > 0;
  const canNextPage = pageIndex + 1 < pageCount;

  // [PAGE] Reset to the first page whenever the tab or collection filter
  // changes so the user never lands on an out-of-range page.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset is keyed on the filter identity only
  useEffect(() => {
    setPageIndex(0);
  }, [activeTab, selectedCollectionId]);

  function openNftDetail(nft: Nft) {
    setSelectedNft(nft);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedNft(null);
  }

  // [FIND-ID] Resolve an NFT by its Unique ID (format canisterId:0:tokenId) and
  // open the detail modal. getNft returns deleted/burned records by id, so this
  // is the one entry point that can surface their status.
  async function handleFindById(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = lookupId.trim();
    if (!trimmed) return;
    setLookupError(null);
    const tokenIdText = trimmed.split(":").pop() ?? "";
    let tokenId: bigint;
    try {
      tokenId = BigInt(tokenIdText);
    } catch {
      setLookupError("Enter a valid NFT Unique ID.");
      return;
    }
    if (!actor) {
      setLookupError("Sign in to look up an NFT.");
      return;
    }
    setLookupLoading(true);
    try {
      const found = await actor.getNft(tokenId);
      if (!found) {
        setLookupError("No NFT found for that ID.");
        return;
      }
      setLookupId("");
      openNftDetail(found);
    } catch {
      setLookupError("Lookup failed. Check the ID and try again.");
    } finally {
      setLookupLoading(false);
    }
  }

  const isLoading = nftsLoading;

  const tabCount = useMemo(() => {
    switch (activeTab) {
      case "all":
        return allTabNfts.length;
      case "claimed":
        return claimedNfts.length;
      case "created":
        return nfts.filter((nft) => nft.creatorId === callerCreatorId).length;
      case "recent":
        return nfts.length;
      case "collections":
        return collections.length + 1; // +1 for virtual "Claimed" collection
      default:
        return 0;
    }
  }, [activeTab, nfts, collections, callerCreatorId, claimedNfts, allTabNfts]);

  // Backend health / canister identity guard (rotation defense). The library
  // now renders with an INLINE notice instead of blocking the whole surface:
  // a degraded backend must not hide the user's own records. The notice is
  // non-blocking and keeps the retry affordance. Placed AFTER all hooks to
  // satisfy the Rules of Hooks (no conditional hook calls).
  const healthNotice = useMemo(() => {
    switch (backendHealth.status) {
      case "checking":
        return {
          tone: "info" as const,
          icon: <Loader2 className="w-4 h-4 animate-spin text-primary" />,
          title: "Verifying backend connection…",
          detail: "The library will refresh once the backend responds.",
        };
      case "wrong-canister":
        return {
          tone: "error" as const,
          icon: <ShieldAlert className="w-4 h-4 text-destructive" />,
          title: "Backend connection error",
          detail:
            "This app resolved to a different backend canister. Records shown may be incomplete.",
        };
      case "unavailable":
        return {
          tone: "error" as const,
          icon: <ServerCrash className="w-4 h-4 text-destructive" />,
          title: "Backend unavailable",
          detail:
            "The backend could not be reached. Records shown may be incomplete.",
        };
      case "empty":
        return {
          tone: "warning" as const,
          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
          title: "Library temporarily unavailable",
          detail:
            "The backend reports no NFTs, which is unexpected. Please try again shortly.",
        };
      default:
        return null;
    }
  }, [backendHealth.status]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6" data-ocid="collector.page">
        <BrandedAuthGate subtitle="Sign in to view your NFT collection." />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6" data-ocid="collector.page">
      {/* Inline backend-health notice — non-blocking. The library always
          renders; a degraded backend only adds this banner. */}
      {healthNotice && (
        <div
          className={cn(
            "flex items-start gap-2.5 mb-4 px-3 py-2.5 rounded-lg border text-sm",
            healthNotice.tone === "error"
              ? "bg-destructive/5 border-destructive/30"
              : healthNotice.tone === "warning"
                ? "bg-amber-500/5 border-amber-500/30"
                : "bg-muted/40 border-border",
          )}
          data-ocid="collector.backend_health_notice"
        >
          <span className="mt-0.5 shrink-0">{healthNotice.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{healthNotice.title}</p>
            <p className="text-xs text-muted-foreground">
              {healthNotice.detail}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="shrink-0 text-xs font-medium text-primary hover:underline"
            data-ocid="collector.backend_retry_button"
          >
            Retry
          </button>
        </div>
      )}

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

      {/* Stats line */}
      <div
        className="flex items-center gap-3 mb-3 text-xs text-muted-foreground"
        data-ocid="collector.stats_line"
      >
        <span>
          {allTabNfts.length} NFT{allTabNfts.length !== 1 ? "s" : ""}
        </span>
        <span>·</span>
        <span>
          {collections.length} Collection{collections.length !== 1 ? "s" : ""}
        </span>
        <span>·</span>
        <span>{claimedNfts.length} Claimed</span>
      </div>

      {/* [FIND-ID] Direct detail lookup — surfaces deleted/burned records that
          no listing shows. Kept to one compact row. */}
      <form
        onSubmit={handleFindById}
        className="flex items-center gap-2 mb-4"
        data-ocid="collector.find_by_id_form"
      >
        <Input
          value={lookupId}
          onChange={(e) => {
            setLookupId(e.target.value);
            setLookupError(null);
          }}
          placeholder="Find by NFT Unique ID"
          className="h-8 text-xs font-mono"
          autoComplete="off"
          spellCheck={false}
          aria-label="NFT Unique ID"
          data-ocid="collector.find_by_id_input"
        />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 text-xs"
          disabled={!lookupId.trim() || lookupLoading}
          data-ocid="collector.find_by_id_button"
        >
          {lookupLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            "Open"
          )}
        </Button>
      </form>
      {lookupError && (
        <p
          className="text-xs text-destructive -mt-3 mb-3"
          data-ocid="collector.find_by_id_error_state"
        >
          {lookupError}
        </p>
      )}

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
                : selectedCollectionId !== null && tab.key === "all"
                  ? "bg-muted text-muted-foreground hover:bg-muted/80"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            data-ocid={`collector.tab.${tab.key}`}
          >
            {tab.label} ({getTabCount(tab.key)})
          </button>
        ))}
      </div>

      {/* Viewing indicator */}
      {selectedCollectionId !== null && (
        <div
          className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-sm"
          data-ocid="collector.viewing_indicator"
        >
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-foreground font-medium">
            Viewing {filteredNfts.length} NFT
            {filteredNfts.length !== 1 ? "s" : ""}
            {selectedCollectionId !== "claimed" &&
            collections.find((c) => c.id === selectedCollectionId)?.name
              ? ` in "${collections.find((c) => c.id === selectedCollectionId)?.name}"`
              : selectedCollectionId === "claimed"
                ? " from Claimed"
                : ""}
          </span>
          <button
            type="button"
            onClick={() => setSelectedCollectionId(null)}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
            data-ocid="collector.clear_collection_filter_button"
          >
            Show all
          </button>
        </div>
      )}

      {/* Content */}
      {activeTab === "collections" ? (
        <div className="space-y-3" data-ocid="collector.collections.list">
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
              Create Collection
            </Button>
          )}
          {collectionsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Folder className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No collections yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {collections.map((collection) => {
                const _hasNfts = Number(collection.nftCount) > 0;
                // [IMG-RESOLVE] Collection previews are stored as plain URL
                // strings (not ExternalBlobs), so pass an absolute https:// URL
                // through unchanged and render the placeholder otherwise. The
                // old local helper hardcoded a blob.caffeine.ai fallback that
                // bypassed the shared storage-backed resolution path.
                const previewUrl =
                  collection.previewImage &&
                  /^https?:\/\//i.test(collection.previewImage)
                    ? collection.previewImage
                    : "";
                return (
                  <div
                    key={String(collection.id)}
                    // biome-ignore lint/a11y/useSemanticElements: intentional div-with-role-button to avoid nested buttons
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "group relative rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 text-left w-full",
                      selectedCollectionId === collection.id
                        ? "border-primary ring-2 ring-primary/30 bg-primary/5 shadow-md"
                        : "border-border bg-card hover:shadow-md hover:border-primary/40",
                    )}
                    onClick={() => setSelectedCollectionId(collection.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedCollectionId(collection.id);
                      }
                    }}
                    data-ocid={`collector.collection.item.${Number(collection.id)}`}
                  >
                    {/* Selected indicator */}
                    {selectedCollectionId === collection.id && (
                      <div className="absolute top-2 left-2 z-10">
                        <Badge className="text-[10px] gap-0.5 px-1.5 py-0.5 bg-primary text-primary-foreground">
                          <Layers className="w-2.5 h-2.5" />
                          Viewing
                        </Badge>
                      </div>
                    )}
                    {/* Cover image or placeholder */}
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={collection.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                          <FolderOpen className="w-8 h-8" />
                          <span className="text-xs">No preview</span>
                        </div>
                      )}
                      {/* NFT count badge */}
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono"
                        >
                          {collection.nftCount.toString()} NFT
                          {Number(collection.nftCount) !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </div>
                    {/* Card body */}
                    <div className="p-3">
                      <p
                        className="text-sm font-semibold truncate text-foreground"
                        title={collection.name}
                      >
                        {collection.name}
                      </p>
                    </div>
                    {/* Delete button */}
                    <button
                      type="button"
                      title="Delete collection"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDeleteCollection(collection);
                        setDeleteConfirmOpen(true);
                      }}
                      className="absolute bottom-3 right-3 p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                      data-ocid={`collector.collection.delete_button.${Number(collection.id)}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : isLoading ? (
        <CollectorSkeleton />
      ) : filteredNfts.length === 0 ? (
        // ── Empty library ────────────────────────────────────────────────
        // A short, plain message with a clear next step. No diagnostic or
        // explainer paragraphs.
        <div
          className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center"
          data-ocid="collector.account_empty_state"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Wallet className="w-7 h-7 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              No NFTs yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Mint one to get started, or claim one using a claim link.
            </p>
          </div>
          <div className="flex flex-col gap-2 items-center">
            <Link to="/studio">
              <Button
                type="button"
                size="sm"
                data-ocid="collector.account_empty_mint_button"
              >
                Mint an NFT
              </Button>
            </Link>
            <Link to="/verify">
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-ocid="collector.account_empty_verify_button"
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
          {/* [PAGE] Server-side pagination controls. Only rendered when the
              active feed spans more than one page. */}
          {pageCount > 1 && (
            <div
              className="flex items-center justify-center gap-3 mt-4"
              data-ocid="collector.pagination"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                disabled={!canPrevPage}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                data-ocid="collector.pagination_prev"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </Button>
              <span
                className="text-xs text-muted-foreground font-mono"
                data-ocid="collector.pagination_status"
              >
                Page {pageIndex + 1} of {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                disabled={!canNextPage}
                onClick={() =>
                  setPageIndex((p) => Math.min(pageCount - 1, p + 1))
                }
                data-ocid="collector.pagination_next"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
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

      {/* Delete Collection Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent data-ocid="collector.delete_collection_dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteCollection &&
              Number(pendingDeleteCollection.nftCount) > 0
                ? `This collection has ${pendingDeleteCollection.nftCount.toString()} NFT${Number(pendingDeleteCollection.nftCount) !== 1 ? "s" : ""}. Deleting it will remove all NFTs from this collection. Are you sure?`
                : "Are you sure you want to delete this collection?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingDeleteCollection(null);
                setDeleteConfirmOpen(false);
              }}
              data-ocid="collector.delete_collection_cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteCollection) {
                  deleteCollection.mutate(pendingDeleteCollection.id);
                }
                setPendingDeleteCollection(null);
                setDeleteConfirmOpen(false);
              }}
              data-ocid="collector.delete_collection_confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          readOnly={selectedNft.status !== NftStatus.active}
        />
      )}
    </div>
  );
}
