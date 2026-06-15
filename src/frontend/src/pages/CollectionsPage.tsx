import { createActor } from "@/backend";
import type { CollectionWithCount, Nft, SubscriptionTier } from "@/backend";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImageIcon, Layers, Lock, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TIER_META: Record<string, { label: string; cls: string }> = {
  free: { label: "Free", cls: "bg-muted text-muted-foreground" },
  creator: { label: "Creator", cls: "bg-primary/20 text-primary" },
  pro: { label: "Pro", cls: "bg-accent/20 text-accent-foreground" },
  org: { label: "Org", cls: "bg-secondary text-secondary-foreground" },
  admin: { label: "Admin", cls: "bg-destructive/20 text-destructive" },
};

function TierBadge({ tier }: { tier: SubscriptionTier }) {
  const m = TIER_META[tier] ?? {
    label: tier,
    cls: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

export default function CollectionsPage() {
  const { isAuthenticated, actor } = useAuth();
  const { actor: anonActor } = useActor(createActor);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [expandedId, setExpandedId] = useState<bigint | null>(null);

  const effectiveActor = actor ?? anonActor;

  const { data: collections, isLoading } = useQuery<CollectionWithCount[]>({
    queryKey: ["collections"],
    queryFn: async () => {
      if (!effectiveActor) return [];
      return effectiveActor.listMyCollections();
    },
    enabled: !!effectiveActor && isAuthenticated,
  });

  const { data: myNfts } = useQuery<Nft[]>({
    queryKey: ["myActiveNfts"],
    queryFn: async () => {
      if (!effectiveActor) return [];
      return effectiveActor.listMyActiveNfts();
    },
    enabled: !!effectiveActor && isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, desc }: { name: string; desc: string }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.createCollection(name, desc);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      toast.success("Collection created");
    },
    onError: () => toast.error("Failed to create collection"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.deleteCollection(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Collection deleted");
    },
    onError: () => toast.error("Failed to delete collection"),
  });

  if (!isAuthenticated) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4"
        data-ocid="collections.empty_state"
      >
        <Lock className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground text-center text-sm">
          Connect your Internet Identity to view your collections.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Collections</h1>
          <p className="text-xs text-muted-foreground">
            {collections
              ? `${collections.length} of 8 collections`
              : "Loading..."}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              disabled={!!(collections && collections.length >= 8)}
              data-ocid="collections.open_modal_button"
            >
              <Plus className="w-4 h-4 mr-1" /> Create
            </Button>
          </DialogTrigger>
          <DialogContent data-ocid="collections.dialog">
            <DialogHeader>
              <DialogTitle>New Collection</DialogTitle>
              <DialogDescription className="sr-only">
                Create a new collection to organise your NFTs.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="col-name">Name</Label>
                <Input
                  id="col-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Collection name"
                  data-ocid="collections.input"
                />
              </div>
              <div>
                <Label htmlFor="col-desc">Description</Label>
                <Textarea
                  id="col-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value.slice(0, 500))}
                  placeholder="Optional description"
                  rows={3}
                  maxLength={500}
                  data-ocid="collections.desc_input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setCreateOpen(false)}
                data-ocid="collections.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() =>
                  createMutation.mutate({ name: newName, desc: newDesc })
                }
                disabled={!newName.trim() || createMutation.isPending}
                data-ocid="collections.submit_button"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="space-y-3" data-ocid="collections.loading_state">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && (!collections || collections.length === 0) && (
        <div
          className="flex flex-col items-center justify-center py-16 gap-3"
          data-ocid="collections.empty_state"
        >
          <Layers className="w-8 h-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            No collections yet. Create your first one.
          </p>
        </div>
      )}

      {collections?.map((col, idx) => {
        const colNfts = (myNfts ?? []).filter(
          (n) => n.status === "active" && n.collectionId === col.id,
        );
        const isExpanded = expandedId === col.id;
        return (
          <Card
            key={col.id.toString()}
            className="rounded-2xl border border-border"
            data-ocid={`collections.item.${idx + 1}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-semibold truncate">
                      {col.name}
                    </CardTitle>
                    <TierBadge tier={col.tier} />
                  </div>
                  {col.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {col.description}
                    </p>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      data-ocid={`collections.delete_button.${idx + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Collection</AlertDialogTitle>
                      <AlertDialogDescription>
                        Delete <strong>{col.name}</strong>? This will remove the
                        collection and all nested NFTs permanently.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-ocid="collections.cancel_button">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(col.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-ocid="collections.confirm_button"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  <ImageIcon className="w-3 h-3 mr-1 inline" />
                  {col.nftCount.toString()} / {col.maxSize.toString()} NFTs
                </span>
                <button
                  type="button"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                  onClick={() => setExpandedId(isExpanded ? null : col.id)}
                  data-ocid={`collections.toggle.${idx + 1}`}
                >
                  {isExpanded ? "Hide NFTs" : "Show NFTs"}
                </button>
              </div>
              {isExpanded && (
                <div className="mt-3 space-y-2">
                  {colNfts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No active NFTs in this collection.
                    </p>
                  ) : (
                    colNfts.map((nft, ni) => (
                      <div
                        key={nft.id.toString()}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/40"
                        data-ocid={`collections.nft.${ni + 1}`}
                      >
                        <ImageIcon className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium truncate flex-1">
                          {nft.title}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {nft.edition}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
