import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Cover: public gallery page ───────────────────────────────────────────────
// Accepted behavior:
//   - the gallery lists active NFTs with thumbnails;
//   - it paginates through the active catalog;
//   - it renders loading / empty / error states.
//
// The real GalleryPage is exercised; only the usePublicNfts data hook is a
// typed local stub. The page is reachable without signing in, so no auth
// context is required.

const queriesMock = vi.hoisted(() => ({
  usePublicNfts: vi.fn(),
}));

vi.mock("@/backend", () => ({
  NftStatus: { deleted: "deleted", active: "active", burned: "burned" },
  RewardTier: {
    bronze: "bronze",
    gold: "gold",
    none: "none",
    platinum: "platinum",
    silver: "silver",
  },
  RewardType: { none: "none", referralBonus: "referralBonus" },
}));

vi.mock("@/hooks/useQueries", () => ({
  usePublicNfts: queriesMock.usePublicNfts,
}));

// The landing page now renders inside the unified shell and uses router Links
// for its hero CTAs. The gallery's own behavior is what is under test, so the
// router is a typed local stub that renders Links as plain anchors.
vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => ({ location: { pathname: "/" } }),
  Link: ({
    to,
    children,
    ...props
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

import GalleryPage from "@/pages/GalleryPage";

function makeNft(overrides: Partial<Nft> = {}): Nft {
  return {
    id: 1n,
    status: NftStatus.active,
    supplyLimit: 1n,
    title: "Gallery Art",
    imageBlob: {
      directURL: "https://example.com/gallery.png",
    } as never,
    edition: "1/1",
    referralThreshold: 3n,
    ownerId: { toText: () => "aaaaa-aa" } as never,
    tags: [],
    creatorId: "creator-1",
    mintDate: 0n,
    description: "",
    auditHistory: [],
    rewardTier: RewardTier.none,
    rewardType: RewardType.none,
    assetHash: "0".repeat(64),
    nftUniqueId: "canister:0:1",
    ...overrides,
  };
}

function renderGallery() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <GalleryPage />
    </QueryClientProvider>,
  );
}

describe("GalleryPage public gallery (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders hero content above the public gallery section", () => {
    queriesMock.usePublicNfts.mockReturnValue({
      data: { items: [makeNft()], total: 1n },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderGallery();
    // Hero/intro content is present...
    expect(
      document.querySelector('[data-ocid="landing.hero_section"]'),
    ).not.toBeNull();
    expect(
      screen.getByText(
        "Mint, claim, and collect NFTs on the Internet Computer.",
      ),
    ).toBeInTheDocument();
    // ...and the gallery is a section of the same page, below the hero.
    const hero = document.querySelector('[data-ocid="landing.hero_section"]');
    const gallery = document.querySelector(
      '[data-ocid="landing.gallery_section"]',
    );
    expect(gallery).not.toBeNull();
    expect(
      hero!.compareDocumentPosition(gallery!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("links the hero CTA to the mint studio at /studio", () => {
    queriesMock.usePublicNfts.mockReturnValue({
      data: { items: [], total: 0n },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderGallery();
    const cta = document.querySelector(
      '[data-ocid="landing.studio_cta_button"]',
    ) as HTMLAnchorElement;
    expect(cta).not.toBeNull();
    expect(cta.closest("a")?.getAttribute("href")).toBe("/studio");
  });

  it("renders active NFTs with their thumbnails", () => {
    queriesMock.usePublicNfts.mockReturnValue({
      data: { items: [makeNft({ id: 1n, title: "First Art" })], total: 1n },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderGallery();
    expect(screen.getByText("First Art")).toBeInTheDocument();
    const img = screen.getByAltText("First Art") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/gallery.png");
  });

  it("renders the empty state when there are no active NFTs", () => {
    queriesMock.usePublicNfts.mockReturnValue({
      data: { items: [], total: 0n },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderGallery();
    expect(
      document.querySelector('[data-ocid="gallery.empty_state"]'),
    ).not.toBeNull();
    expect(screen.getByText("No NFTs are available yet.")).toBeInTheDocument();
  });

  it("renders the error state with a retry that refetches", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    queriesMock.usePublicNfts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });
    renderGallery();
    expect(
      document.querySelector('[data-ocid="gallery.error_state"]'),
    ).not.toBeNull();
    await user.click(
      document.querySelector(
        '[data-ocid="gallery.retry_button"]',
      ) as HTMLButtonElement,
    );
    expect(refetch).toHaveBeenCalled();
  });

  it("paginates: Next advances the offset and Previous returns to page 1", async () => {
    const user = userEvent.setup();
    // 13 items at 12 per page => 2 pages.
    queriesMock.usePublicNfts.mockImplementation(
      (offset: bigint, limit: bigint) => ({
        data: {
          items: [makeNft({ id: offset + 1n, title: `Page ${offset}` })],
          total: 13n,
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        _offset: offset,
        _limit: limit,
      }),
    );
    renderGallery();

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(queriesMock.usePublicNfts).toHaveBeenCalledWith(0n, 12n);

    await user.click(
      document.querySelector(
        '[data-ocid="gallery.pagination_next"]',
      ) as HTMLButtonElement,
    );
    expect(queriesMock.usePublicNfts).toHaveBeenCalledWith(12n, 12n);

    await user.click(
      document.querySelector(
        '[data-ocid="gallery.pagination_prev"]',
      ) as HTMLButtonElement,
    );
    expect(queriesMock.usePublicNfts).toHaveBeenCalledWith(0n, 12n);
  });

  it("hides pagination controls when everything fits on one page", () => {
    queriesMock.usePublicNfts.mockReturnValue({
      data: { items: [makeNft()], total: 1n },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderGallery();
    expect(
      document.querySelector('[data-ocid="gallery.pagination_next"]'),
    ).toBeNull();
  });
});
