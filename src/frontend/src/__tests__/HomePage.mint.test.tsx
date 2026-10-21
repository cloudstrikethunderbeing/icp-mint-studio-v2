import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Mocks ───────────────────────────────────────────────────────────────────
// HomePage (the Studio mint page) depends on the auth context, a large set of
// react-query hooks, the notification store, and the router. We mock those
// seams so the mint journey can be characterized against a typed local actor
// mock rather than the real backend.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const queriesMock = vi.hoisted(() => ({
  useBackendHealth: vi.fn(),
  useMyActiveNfts: vi.fn(),
  useSearchNfts: vi.fn(),
  useCreateSlot: vi.fn(),
  useGenerateClaimLink: vi.fn(),
  useAdminSetNftRewardType: vi.fn(),
  useAdminSetNftReferralThreshold: vi.fn(),
  useAdminSetNftPrice: vi.fn(),
  // Consumed by the NftDetailModal rendered by HomePage.
  useNftDetailQuery: vi.fn(),
  useCollections: vi.fn(),
  useAddNftToCollection: vi.fn(),
  useRemoveNftFromCollection: vi.fn(),
  useUpdateMetadata: vi.fn(),
  useGetClaimStatus: vi.fn(),
  // Consumed by the PurchaseModal that NftDetailModal always renders.
  usePurchaseQuote: vi.fn(),
  useSubmitPurchase: vi.fn(),
  useVerifyPurchase: vi.fn(),
  usePaymentConfig: vi.fn(),
}));

const notificationsMock = vi.hoisted(() => ({
  addNotification: vi.fn(),
}));

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
}));

// HomePage imports only TYPES from @/backend plus the string enums
// NftStatus/RewardTier/RewardType. The real @/backend module pulls in
// @caffeineai/object-storage (ExternalBlob) at runtime, which has no usable
// runtime entry in the test environment. Mocking the module keeps the type-only
// import from dragging in that dependency while preserving the enum values.
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
  // HomePage builds the upload payload with ExternalBlob.fromBytes(...)
  // .withUploadProgress(...). The real class lives in @caffeineai/object-storage,
  // which has no usable runtime entry under jsdom; this inert stub preserves the
  // fluent shape the mint flow relies on. [IMG-FIX] The real library sets
  // `directURL` to a document-scoped blob: URL (URL.createObjectURL) that is
  // revoked on GC and invalid after reload, so the mint flow must NOT use it for
  // the notification image. The stub mirrors that semantics with a blob: URL to
  // prove the notification image comes from the getNft read-back instead.
  ExternalBlob: {
    fromBytes: (bytes: Uint8Array) => ({
      bytes,
      directURL: "blob:http://localhost/ephemeral-upload",
      withUploadProgress: () => ({
        bytes,
        directURL: "blob:http://localhost/ephemeral-upload",
      }),
    }),
  },
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    addNotification: notificationsMock.addNotification,
    markAllRead: vi.fn(),
    clearAll: vi.fn(),
  }),
}));

vi.mock("@/hooks/useQueries", () => ({
  useBackendHealth: queriesMock.useBackendHealth,
  useMyActiveNfts: queriesMock.useMyActiveNfts,
  useSearchNfts: queriesMock.useSearchNfts,
  useCreateSlot: queriesMock.useCreateSlot,
  useGenerateClaimLink: queriesMock.useGenerateClaimLink,
  useAdminSetNftRewardType: queriesMock.useAdminSetNftRewardType,
  useAdminSetNftReferralThreshold: queriesMock.useAdminSetNftReferralThreshold,
  useAdminSetNftPrice: queriesMock.useAdminSetNftPrice,
  useNftDetailQuery: queriesMock.useNftDetailQuery,
  useCollections: queriesMock.useCollections,
  useAddNftToCollection: queriesMock.useAddNftToCollection,
  useRemoveNftFromCollection: queriesMock.useRemoveNftFromCollection,
  useUpdateMetadata: queriesMock.useUpdateMetadata,
  useGetClaimStatus: queriesMock.useGetClaimStatus,
  usePurchaseQuote: queriesMock.usePurchaseQuote,
  useSubmitPurchase: queriesMock.useSubmitPurchase,
  useVerifyPurchase: queriesMock.useVerifyPurchase,
  usePaymentConfig: queriesMock.usePaymentConfig,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
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

// The mint flow computes a SHA-256 of the uploaded file via crypto.subtle.
// jsdom does not implement it, so provide a deterministic digest.
vi.stubGlobal("crypto", {
  subtle: {
    digest: vi.fn(async () => new Uint8Array(32).buffer),
  },
});

import HomePage from "@/pages/HomePage";

// HomePage calls useQueryClient/useQuery directly (collections, slots status,
// canister id), so it must render inside a QueryClientProvider. Retries are
// disabled so a rejected query surfaces immediately instead of after backoff.
function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>,
  );
}

function makeNft(overrides: Partial<Nft> = {}): Nft {
  return {
    id: 1n,
    status: NftStatus.active,
    supplyLimit: 1n,
    title: "Test NFT",
    imageBlob: { getDirectURL: () => "https://example.com/img.png" } as never,
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

function mockMutation() {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };
}

function setAuth(overrides: Record<string, unknown> = {}) {
  authMock.useAuth.mockReturnValue({
    isAuthenticated: true,
    principal: "aaaaa-aa",
    authState: "ready",
    isAdmin: false,
    isAdminLoading: false,
    actor: {},
    ...overrides,
  });
}

function setDefaultQueries() {
  queriesMock.useBackendHealth.mockReturnValue({
    status: "ok",
    canisterId: "x",
  });
  queriesMock.useMyActiveNfts.mockReturnValue({ data: [], isLoading: false });
  queriesMock.useSearchNfts.mockReturnValue({
    data: [],
    isLoading: false,
  });
  queriesMock.useCreateSlot.mockReturnValue(mockMutation());
  queriesMock.useGenerateClaimLink.mockReturnValue(mockMutation());
  queriesMock.useAdminSetNftRewardType.mockReturnValue(mockMutation());
  queriesMock.useAdminSetNftReferralThreshold.mockReturnValue(mockMutation());
  queriesMock.useAdminSetNftPrice.mockReturnValue(mockMutation());
  queriesMock.useNftDetailQuery.mockReturnValue({
    data: null,
    isLoading: false,
    isPending: false,
    isFetching: false,
  });
  queriesMock.useCollections.mockReturnValue({ data: [], isLoading: false });
  queriesMock.useAddNftToCollection.mockReturnValue(mockMutation());
  queriesMock.useRemoveNftFromCollection.mockReturnValue(mockMutation());
  queriesMock.useUpdateMetadata.mockReturnValue(mockMutation());
  queriesMock.useGetClaimStatus.mockReturnValue({ data: null });
  // PurchaseModal hooks: the modal is rendered closed in these tests.
  queriesMock.usePurchaseQuote.mockReturnValue(mockMutation());
  queriesMock.useSubmitPurchase.mockReturnValue(mockMutation());
  queriesMock.useVerifyPurchase.mockReturnValue(mockMutation());
  queriesMock.usePaymentConfig.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  });
}

describe("HomePage (Studio) mint journey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    setDefaultQueries();
  });

  it("renders the mint grid with the upload card for an authenticated user", () => {
    renderHomePage();
    expect(
      document.querySelector('[data-ocid="home.upload_card"]'),
    ).not.toBeNull();
    expect(document.querySelector('[data-ocid="home.grid"]')).not.toBeNull();
  });

  it("renders the admin search bar only for admins", () => {
    renderHomePage();
    expect(document.querySelector('[data-ocid="home.search_bar"]')).toBeNull();

    setAuth({ isAdmin: true });
    renderHomePage();
    expect(
      document.querySelector('[data-ocid="home.search_bar"]'),
    ).not.toBeNull();
  });

  it("shows the unauthenticated gate when authState is unauthenticated", () => {
    setAuth({ isAuthenticated: false, authState: "unauthenticated" });
    renderHomePage();
    expect(
      document.querySelector('[data-ocid="home.unauthenticated_state"]'),
    ).not.toBeNull();
    expect(document.querySelector('[data-ocid="home.upload_card"]')).toBeNull();
  });

  it("renders minted NFTs from the active feed in the grid", () => {
    const nft = makeNft({ title: "My Minted NFT" });
    queriesMock.useMyActiveNfts.mockReturnValue({
      data: [nft],
      isLoading: false,
    });
    renderHomePage();
    expect(screen.getByAltText("My Minted NFT")).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="home.nft_card.item.1"]'),
    ).not.toBeNull();
  });

  it("mints an NFT through the actor and records a success notification", async () => {
    const user = userEvent.setup();
    const mintNft = vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: {
        id: 7n,
        tokenId: 7n,
        nftUniqueId: "canister:0:7",
        collectionId: undefined,
      },
    }));
    // [IMG-FIX] The notification image must come from the STABLE getNft
    // read-back (a durable gateway URL), never from the locally-uploaded blob
    // whose directURL is an ephemeral blob: URL.
    const getNft = vi.fn(async () =>
      makeNft({
        id: 7n,
        title: "Genesis Drop",
        imageBlob: {
          getDirectURL: () => "https://example.com/minted.png",
        } as never,
      }),
    );
    setAuth({ actor: { mintNft, getNft } });

    renderHomePage();

    // Open the mint dialog by selecting a valid PNG file through the hidden
    // file input. The file's magic bytes must be a real PNG signature so
    // fileWithVerifiedImageType accepts it.
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
    ]);
    const file = new File([pngBytes], "art.png", { type: "image/png" });
    const input = document.querySelector(
      '[data-ocid="home.file_input"]',
    ) as HTMLInputElement;
    await user.upload(input, file);

    // The mint dialog opens with the title field.
    const titleInput = await screen.findByLabelText(/Title/);
    await user.type(titleInput, "Genesis Drop");
    // Whole-value USD price is now required for a mint.
    await user.type(screen.getByLabelText(/Price \(USD\)/), "250");

    const submit = document.querySelector(
      '[data-ocid="home.mint_submit_button"]',
    ) as HTMLButtonElement;
    await waitFor(() => expect(submit.disabled).toBe(false));
    await user.click(submit);

    await waitFor(() => expect(mintNft).toHaveBeenCalledTimes(1));
    // The actor is called with the sanitized title, the default supply, and the
    // whole-value USD price entered in the mint form.
    expect(mintNft).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      "Genesis Drop",
      "",
      null,
      null,
      null,
      null,
      null,
      1n,
      250n,
    );

    // A success notification is recorded for the minted token, including the
    // minted NFT's image resolved from the getNft read-back (the stable gateway
    // URL) and the minted NFT's name in the title.
    await waitFor(() =>
      expect(notificationsMock.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "info",
          title: "NFT Minted: Genesis Drop",
          message: expect.stringContaining("Token ID: 7"),
          imageUrl: "https://example.com/minted.png",
        }),
      ),
    );
    // The stable read-back is the authoritative image source; the ephemeral
    // blob: URL from the local upload must never reach the notification.
    expect(getNft).toHaveBeenCalledWith(7n);
    const mintCall = notificationsMock.addNotification.mock.calls.find(
      ([n]) => (n as { title?: string }).title === "NFT Minted: Genesis Drop",
    );
    expect((mintCall?.[0] as { imageUrl?: string }).imageUrl).not.toContain(
      "blob:",
    );
  });

  it("retries the getNft read-back when the first attempt returns null", async () => {
    const user = userEvent.setup();
    const mintNft = vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: {
        id: 8n,
        tokenId: 8n,
        nftUniqueId: "canister:0:8",
        collectionId: undefined,
      },
    }));
    // The first read-back hits a stale replica and returns null; the retry
    // returns the minted record with a stable gateway URL.
    const getNft = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        makeNft({
          id: 8n,
          title: "Retry Art",
          imageBlob: {
            getDirectURL: () => "https://example.com/readback.png",
          } as never,
        }),
      );
    setAuth({ actor: { mintNft, getNft } });

    renderHomePage();

    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
    ]);
    const file = new File([pngBytes], "art.png", { type: "image/png" });
    const input = document.querySelector(
      '[data-ocid="home.file_input"]',
    ) as HTMLInputElement;
    await user.upload(input, file);

    const titleInput = await screen.findByLabelText(/Title/);
    await user.type(titleInput, "Retry Art");
    await user.type(screen.getByLabelText(/Price \(USD\)/), "100");

    const submit = document.querySelector(
      '[data-ocid="home.mint_submit_button"]',
    ) as HTMLButtonElement;
    await waitFor(() => expect(submit.disabled).toBe(false));
    await user.click(submit);

    await waitFor(
      () =>
        expect(notificationsMock.addNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "info",
            title: "NFT Minted: Retry Art",
            imageUrl: "https://example.com/readback.png",
          }),
        ),
      { timeout: 5000 },
    );
    // The bounded retry consulted the read-back more than once.
    expect(getNft.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(getNft).toHaveBeenCalledWith(8n);
  });

  it("still records the mint notification when the minted NFT has no image", async () => {
    const user = userEvent.setup();
    const mintNft = vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: {
        id: 9n,
        tokenId: 9n,
        nftUniqueId: "canister:0:9",
        collectionId: undefined,
      },
    }));
    // getNft resolves to a record whose imageBlob has no usable direct URL.
    const getNft = vi.fn(async () =>
      makeNft({
        id: 9n,
        title: "No Image",
        imageBlob: { getDirectURL: () => "" } as never,
      }),
    );
    setAuth({ actor: { mintNft, getNft } });

    renderHomePage();

    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
    ]);
    const file = new File([pngBytes], "art.png", { type: "image/png" });
    const input = document.querySelector(
      '[data-ocid="home.file_input"]',
    ) as HTMLInputElement;
    await user.upload(input, file);

    const titleInput = await screen.findByLabelText(/Title/);
    await user.type(titleInput, "Blank Art");
    await user.type(screen.getByLabelText(/Price \(USD\)/), "75");

    const submit = document.querySelector(
      '[data-ocid="home.mint_submit_button"]',
    ) as HTMLButtonElement;
    await waitFor(() => expect(submit.disabled).toBe(false));
    await user.click(submit);

    await waitFor(
      () =>
        expect(notificationsMock.addNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "info",
            title: "NFT Minted: Blank Art",
            message: expect.stringContaining("Token ID: 9"),
          }),
        ),
      { timeout: 5000 },
    );
    // The notification is recorded without a usable image URL rather than
    // being lost. Every read-back attempt resolves to "".
    const mintCall = notificationsMock.addNotification.mock.calls.find(
      ([n]) => (n as { title?: string }).title === "NFT Minted: Blank Art",
    );
    expect(mintCall).toBeDefined();
    expect((mintCall?.[0] as { imageUrl?: string }).imageUrl).toBeFalsy();
  });

  it("still records the mint notification when reading the minted NFT back fails", async () => {
    const user = userEvent.setup();
    const mintNft = vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: {
        id: 11n,
        tokenId: 11n,
        nftUniqueId: "canister:0:11",
        collectionId: undefined,
      },
    }));
    const getNft = vi.fn(async () => {
      throw new Error("backend unavailable");
    });
    setAuth({ actor: { mintNft, getNft } });

    renderHomePage();

    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
    ]);
    const file = new File([pngBytes], "art.png", { type: "image/png" });
    const input = document.querySelector(
      '[data-ocid="home.file_input"]',
    ) as HTMLInputElement;
    await user.upload(input, file);

    const titleInput = await screen.findByLabelText(/Title/);
    await user.type(titleInput, "Resilient Art");
    await user.type(screen.getByLabelText(/Price \(USD\)/), "50");

    const submit = document.querySelector(
      '[data-ocid="home.mint_submit_button"]',
    ) as HTMLButtonElement;
    await waitFor(() => expect(submit.disabled).toBe(false));
    await user.click(submit);

    // A failed image read-back must never block the mint success notification.
    await waitFor(
      () =>
        expect(notificationsMock.addNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "info",
            title: "NFT Minted: Resilient Art",
            message: expect.stringContaining("Token ID: 11"),
          }),
        ),
      { timeout: 5000 },
    );
  });

  it("surfaces a mint failure as a critical notification and an inline error", async () => {
    const user = userEvent.setup();
    const mintNft = vi.fn(async () => ({
      __kind__: "err" as const,
      err: { message: "Supply limit exceeds tier maximum" },
    }));
    setAuth({ actor: { mintNft } });

    renderHomePage();

    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
    ]);
    const file = new File([pngBytes], "art.png", { type: "image/png" });
    const input = document.querySelector(
      '[data-ocid="home.file_input"]',
    ) as HTMLInputElement;
    await user.upload(input, file);

    const titleInput = await screen.findByLabelText(/Title/);
    await user.type(titleInput, "Too Big");
    await user.type(screen.getByLabelText(/Price \(USD\)/), "10");

    const submit = document.querySelector(
      '[data-ocid="home.mint_submit_button"]',
    ) as HTMLButtonElement;
    await waitFor(() => expect(submit.disabled).toBe(false));
    await user.click(submit);

    await waitFor(() =>
      expect(notificationsMock.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "critical",
          title: "Mint Failed",
          message: "Supply limit exceeds tier maximum",
        }),
      ),
    );
    // The message is surfaced both inline in the dialog and in the toast, so
    // assert on the set rather than a single node.
    const inlineErrors = await screen.findAllByText(
      "Supply limit exceeds tier maximum",
    );
    expect(inlineErrors.length).toBeGreaterThan(0);
  });

  it("runs an admin search and renders matching NFTs across statuses", async () => {
    const user = userEvent.setup();
    setAuth({ isAdmin: true });
    const active = makeNft({ id: 1n, title: "Active Alpha" });
    const burned = makeNft({
      id: 2n,
      title: "Burned Beta",
      status: NftStatus.burned,
    });
    queriesMock.useSearchNfts.mockReturnValue({
      data: [active, burned],
      isLoading: false,
    });

    renderHomePage();

    const input = document.querySelector(
      '[data-ocid="home.search_input"]',
    ) as HTMLInputElement;
    await user.type(input, "Alpha");

    // The search hook is called with the debounced term and the admin-enabled
    // flag only after the 300ms debounce elapses.
    await waitFor(
      () =>
        expect(queriesMock.useSearchNfts).toHaveBeenCalledWith("Alpha", true),
      { timeout: 2000 },
    );

    // Results replace the default grid, including non-active statuses.
    expect(await screen.findByAltText("Active Alpha")).toBeInTheDocument();
    expect(screen.getByAltText("Burned Beta")).toBeInTheDocument();
  });

  it("does not run a search for a non-admin even when the term is typed", async () => {
    setAuth({ isAdmin: false });
    renderHomePage();

    // Non-admins never see the search bar, so there is no input to type into.
    expect(
      document.querySelector('[data-ocid="home.search_input"]'),
    ).toBeNull();
    // The hook is still called on render with the disabled flag.
    expect(queriesMock.useSearchNfts).toHaveBeenCalledWith("", false);
  });
});
