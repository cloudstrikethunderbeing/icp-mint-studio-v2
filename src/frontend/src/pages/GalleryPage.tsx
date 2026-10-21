import type { Nft } from "@/backend";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicNfts } from "@/hooks/useQueries";
import { resolveNftImageUrl } from "@/utils/nftNormalization";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Suspense, lazy, useState } from "react";
import { devLog } from "../utils/devLog";

// The detail modal is heavy (metadata editing, claim links, burn/delete
// dialogs) and pulls in the auth context. Lazy-load it so the public landing
// page stays light and anonymous visitors only download it when they open a
// card.
const NftDetailModal = lazy(() =>
  import("@/components/NftDetailModal").then((m) => ({
    default: m.NftDetailModal,
  })),
);

// [GALLERY] Public gallery page size — must match the hook default so the
// pagination window and the fetched page agree.
const GALLERY_PAGE_SIZE = 12n;

function GalleryCard({
  nft,
  index,
  onOpen,
}: {
  nft: Nft;
  index: number;
  onOpen: (nft: Nft) => void;
}) {
  const imageUrl = resolveNftImageUrl(nft.imageBlob);
  const [imgError, setImgError] = useState(false);
  const showImage = imageUrl !== "" && !imgError;

  return (
    <Card
      className="group overflow-hidden border-border bg-card shadow-sm transition-shadow hover:shadow-md"
      data-ocid={`gallery.item.${index + 1}`}
    >
      <button
        type="button"
        onClick={() => onOpen(nft)}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`View ${nft.title || "NFT"} details`}
        data-ocid={`gallery.open_button.${index + 1}`}
      >
        <div className="relative aspect-square bg-muted">
          {showImage ? (
            <img
              src={imageUrl}
              alt={nft.title || "NFT artwork"}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOff className="h-8 w-8" aria-hidden="true" />
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>
        <div className="price-strip">
          <span className="price-strip-label">Price</span>
          <span
            className="price-strip-value"
            data-state={nft.priceUsd === undefined ? "unlisted" : "listed"}
            data-ocid={`gallery.price.${index + 1}`}
          >
            {nft.priceUsd !== undefined
              ? `$${nft.priceUsd.toString()}`
              : "Not for sale"}
          </span>
        </div>
        <div className="p-3">
          <h3
            className="truncate font-display text-sm font-semibold text-foreground"
            title={nft.title}
          >
            {nft.title || "Untitled"}
          </h3>
        </div>
      </button>
    </Card>
  );
}

function GallerySkeleton() {
  const ids = Array.from(
    { length: Number(GALLERY_PAGE_SIZE) },
    (_, i) => `gallery-skeleton-${i}`,
  );
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {ids.map((id) => (
        <div key={id} className="space-y-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export default function GalleryPage() {
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedNft, setSelectedNft] = useState<Nft | null>(null);
  const offset = BigInt(pageIndex) * GALLERY_PAGE_SIZE;
  const { data, isLoading, isError, refetch } = usePublicNfts(
    offset,
    GALLERY_PAGE_SIZE,
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0n;
  const totalPages = Number(
    (total + GALLERY_PAGE_SIZE - 1n) / GALLERY_PAGE_SIZE,
  );
  const hasPrev = pageIndex > 0;
  const hasNext = offset + GALLERY_PAGE_SIZE < total;

  devLog("[GALLERY] render:", {
    pageIndex,
    itemCount: items.length,
    total: total.toString(),
  });

  return (
    <div className="w-full" data-ocid="gallery.page">
      {/* Hero / intro */}
      <section
        className="border-b border-border bg-card"
        data-ocid="landing.hero_section"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-5 px-4 py-12 sm:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            On-chain collectibles
          </span>
          <h1 className="max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            Mint, claim, and collect NFTs on the Internet Computer.
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Browse the public collection below, then open the Studio to mint
            your own.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/studio">
              <Button
                type="button"
                className="gap-2"
                data-ocid="landing.studio_cta_button"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Open Studio
              </Button>
            </Link>
            <Link to="/how-it-works">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                data-ocid="landing.how_it_works_button"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                How it works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery section */}
      <section
        className="mx-auto w-full max-w-5xl px-4 py-10"
        data-ocid="landing.gallery_section"
      >
        <header className="mb-6 flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-accent" aria-hidden="true" />
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Gallery
          </h2>
        </header>

        {isLoading ? (
          <div data-ocid="gallery.loading_state">
            <GallerySkeleton />
          </div>
        ) : isError ? (
          <div
            className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center"
            data-ocid="gallery.error_state"
          >
            <ImageOff
              className="h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              The gallery could not be loaded.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetch()}
              data-ocid="gallery.retry_button"
            >
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center"
            data-ocid="gallery.empty_state"
          >
            <ImageOff
              className="h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              No NFTs are available yet.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((nft, index) => (
                <GalleryCard
                  key={nft.id.toString()}
                  nft={nft}
                  index={index}
                  onOpen={setSelectedNft}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasPrev}
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  data-ocid="gallery.pagination_prev"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pageIndex + 1} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasNext}
                  onClick={() => setPageIndex((p) => p + 1)}
                  data-ocid="gallery.pagination_next"
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Read-only detail view for anonymous and signed-in visitors alike. */}
      {selectedNft && (
        <Suspense fallback={null}>
          <NftDetailModal
            key={selectedNft.nftUniqueId}
            nft={selectedNft}
            open={!!selectedNft}
            onClose={() => setSelectedNft(null)}
            onDelete={() => {}}
            onBurn={async () => {}}
            callerPrincipal=""
            canisterId=""
            nftUniqueId={selectedNft.nftUniqueId}
            readOnly
          />
        </Suspense>
      )}
    </div>
  );
}
