import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────
// ClaimPage resolves an anonymous actor at runtime (createActor + the
// /env.json canister id) to fetch the public claim preview, then uses the
// authenticated actor from useAuth() to perform the claim. We mock those seams
// so the claim journey can be characterized against typed local actor mocks.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const envMock = vi.hoisted(() => ({
  getBackendCanisterId: vi.fn(async () => "backend-canister"),
  getEnv: vi.fn(async () => ({
    backend_canister_id: "backend-canister",
    backend_host: undefined,
    project_id: "proj-1",
    storage_gateway_url: "https://blob.caffeine.ai",
  })),
}));

const notificationsMock = vi.hoisted(() => ({
  addNotification: vi.fn(),
}));

const routerMock = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { claimToken: "tok-123" } as Record<string, string>,
  search: {} as Record<string, unknown>,
}));

const backendMock = vi.hoisted(() => ({
  createActor: vi.fn(),
}));

// [IMG-FIX] ClaimPage's anonymous actor now resolves stored image references
// through the shared storage-client path (resolveStorageWireUrl) instead of
// ExternalBlob.fromBytes. Mock the storage client so the decode path is
// exercised without the real @caffeineai/object-storage runtime.
const storageMock = vi.hoisted(() => ({
  getDirectURL: vi.fn(
    async (hash: string) => `https://gateway.example/${hash}`,
  ),
}));

vi.mock("@caffeineai/object-storage", () => ({
  StorageClient: class {
    getDirectURL = storageMock.getDirectURL;
  },
}));

vi.mock("@icp-sdk/core/agent", () => ({
  HttpAgent: class {},
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
}));

vi.mock("@/config/env", () => ({
  getBackendCanisterId: envMock.getBackendCanisterId,
  getEnv: envMock.getEnv,
}));

vi.mock("@/hooks/useNotifications", () => ({
  addNotification: notificationsMock.addNotification,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => routerMock.navigate,
  useParams: () => routerMock.params,
  useSearch: () => routerMock.search,
}));

// ClaimPage imports createActor + ExternalBlob from @/backend. The real module
// pulls in @caffeineai/object-storage at runtime, which has no usable jsdom
// entry; mock the module and expose only what ClaimPage consumes.
vi.mock("@/backend", () => ({
  createActor: backendMock.createActor,
  // Mirrors the real @caffeineai/object-storage semantics: fromBytes sets
  // directURL to a document-scoped blob: URL, fromURL sets it to the given URL.
  // The raw-bytes branch of the shared resolver relies on fromBytes producing a
  // renderable directURL, so the mock must not drop it.
  ExternalBlob: {
    fromBytes: (bytes: Uint8Array) => ({
      bytes,
      directURL: "blob:http://localhost/raw-image",
    }),
    fromURL: (url: string) => ({ directURL: url }),
  },
}));

import ClaimPage from "@/pages/ClaimPage";

function renderClaimPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ClaimPage />
    </QueryClientProvider>,
  );
}

function makePreview(overrides: Record<string, unknown> = {}) {
  return {
    __kind__: "ok" as const,
    ok: {
      nft: {
        id: 1n,
        status: "active",
        supplyLimit: 10n,
        title: "Genesis Drop",
        imageBlob: { getDirectURL: () => "https://example.com/art.png" },
        edition: "1/10",
        referralThreshold: 3n,
        ownerId: { toText: () => "aaaaa-aa" },
        tags: [],
        creatorId: "creator-1",
        mintDate: 0n,
        description: "A limited drop",
        auditHistory: [],
        rewardTier: "none",
        rewardType: "none",
        assetHash: "0".repeat(64),
        nftUniqueId: "canister:0:1",
        discountCode: "SECRET",
        membershipId: "MEMBERS-ONLY",
      },
      supplyLimit: 10n,
      claimedCount: 2n,
      ...overrides,
    },
  };
}

function setAuth(overrides: Record<string, unknown> = {}) {
  authMock.useAuth.mockReturnValue({
    isAuthenticated: true,
    principal: "aaaaa-aa",
    actor: {},
    isFetching: false,
    login: vi.fn(),
    ...overrides,
  });
}

describe("ClaimPage claim journey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMock.params = { claimToken: "tok-123" };
    routerMock.search = {};
    setAuth();
    backendMock.createActor.mockReturnValue({
      getClaimPreview: vi.fn(async () => makePreview()),
    });
  });

  it("renders the public preview with title, edition, and remaining count", async () => {
    renderClaimPage();

    expect(await screen.findByText("Genesis Drop")).toBeInTheDocument();
    expect(screen.getByText("Edition 3 of 10")).toBeInTheDocument();
    expect(screen.getByText("8 of 10 remaining")).toBeInTheDocument();
    expect(document.querySelector('[data-ocid="claim.card"]')).not.toBeNull();
  });

  it("renders the preview image from the synchronous directURL field", async () => {
    // The claim surface must use the same unified resolver as every other NFT
    // surface. A preview record whose imageBlob carries the resolved
    // synchronous `directURL` (getDirectURL is async and would yield a Promise)
    // must render that image.
    backendMock.createActor.mockReturnValue({
      getClaimPreview: vi.fn(async () =>
        makePreview({
          nft: {
            ...makePreview().ok.nft,
            imageBlob: {
              directURL: "https://example.com/claim-direct.png",
              getDirectURL: () =>
                Promise.resolve("https://example.com/async.png"),
            },
          },
        }),
      ),
    });

    renderClaimPage();

    const img = (await screen.findByAltText(
      "Genesis Drop",
    )) as HTMLImageElement;
    expect(img.src).toBe("https://example.com/claim-direct.png");
  });

  it("resolves the anonymous actor's stored image reference through the shared storage path", async () => {
    // [IMG-FIX] The anonymous preview actor must decode the object-storage wire
    // value ('!caf!sha256:<hex>') and resolve a stable gateway URL via the
    // storage client — the SAME normalization the authenticated actor uses —
    // rather than returning an ephemeral blob: URL from ExternalBlob.fromBytes.
    renderClaimPage();

    await screen.findByText("Genesis Drop");

    // The downloadFile callback passed to createActor is the third argument.
    const downloadFile = backendMock.createActor.mock.calls[0]?.[2] as (
      bytes: Uint8Array,
    ) => Promise<{ directURL: string }>;
    expect(downloadFile).toBeTypeOf("function");

    const wire = new TextEncoder().encode(`!caf!sha256:${"a".repeat(64)}`);
    const blob = await downloadFile(wire);

    expect(storageMock.getDirectURL).toHaveBeenCalledWith(
      `sha256:${"a".repeat(64)}`,
    );
    expect(blob.directURL).toBe(
      `https://gateway.example/sha256:${"a".repeat(64)}`,
    );
  });

  it("resolves the anonymous actor's RAW image bytes through the shared path", async () => {
    // [IMG-WIRE] This backend stores RAW image bytes in Nft.imageBlob, so the
    // anonymous preview actor's downloadFile callback receives image bytes, not
    // a reference string. It must delegate to the shared resolver, which returns
    // ExternalBlob.fromBytes(bytes) with a live blob: URL — the same path the
    // authenticated actor uses. A regression here would blank the claim preview.
    renderClaimPage();

    await screen.findByText("Genesis Drop");

    const downloadFile = backendMock.createActor.mock.calls[0]?.[2] as (
      bytes: Uint8Array,
    ) => Promise<{ directURL: string }>;
    expect(downloadFile).toBeTypeOf("function");

    const rawPng = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const blob = await downloadFile(rawPng);

    // The raw-bytes branch must yield a renderable URL and must NOT consult the
    // storage client (raw bytes are not a hash).
    expect(blob.directURL).toBeTruthy();
    expect(blob.directURL).not.toBe("");
    expect(storageMock.getDirectURL).not.toHaveBeenCalled();
  });

  it("redacts sensitive discountCode and membershipId from the public preview", async () => {
    renderClaimPage();

    await screen.findByText("Genesis Drop");
    // The preview UI never renders these fields, and the page strips them
    // before rendering as defense-in-depth.
    expect(screen.queryByText("SECRET")).toBeNull();
    expect(screen.queryByText("MEMBERS-ONLY")).toBeNull();
  });

  it("shows the connect-wallet gate for an unauthenticated visitor", async () => {
    setAuth({ isAuthenticated: false, actor: null });
    renderClaimPage();

    await screen.findByText("Genesis Drop");
    expect(
      document.querySelector('[data-ocid="claim.connect_wallet_button"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="claim.claim_button"]'),
    ).toBeNull();
  });

  it("shows the unavailable state when the preview returns an error", async () => {
    backendMock.createActor.mockReturnValue({
      getClaimPreview: vi.fn(async () => ({
        __kind__: "err" as const,
        err: "Claim link expired",
      })),
    });
    renderClaimPage();

    expect(await screen.findByText("NFT Not Available")).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="claim.error_state"]'),
    ).not.toBeNull();
  });

  it("claims the NFT through the authenticated actor and records a success notification", async () => {
    const user = userEvent.setup();
    const claimNft = vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: {
        id: 1n,
        title: "Genesis Drop",
        edition: "3/10",
        nftUniqueId: "canister:0:1",
        imageBlob: { getDirectURL: () => "https://example.com/art.png" },
      },
    }));
    setAuth({ actor: { claimNft } });

    renderClaimPage();

    const claimButton = (await screen.findByText("Claim NFT")).closest(
      "button",
    ) as HTMLButtonElement;
    await waitFor(() => expect(claimButton.disabled).toBe(false));
    await user.click(claimButton);

    await waitFor(() => expect(claimNft).toHaveBeenCalledTimes(1));
    // Organic claim (no ?ref=) passes null as the referrer code.
    expect(claimNft).toHaveBeenCalledWith("tok-123", null);

    await waitFor(() =>
      expect(notificationsMock.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "info",
          title: "NFT Claimed",
          message: "Genesis Drop claimed successfully",
          imageUrl: "https://example.com/art.png",
        }),
        "aaaaa-aa",
      ),
    );

    await waitFor(() =>
      expect(routerMock.navigate).toHaveBeenCalledWith({
        to: "/claim/$claimToken/success",
        params: { claimToken: "tok-123" },
      }),
    );
  });

  it("passes the ?ref= referral code through to claimNft", async () => {
    const user = userEvent.setup();
    routerMock.search = { ref: "REF-42" };
    const claimNft = vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: {
        id: 1n,
        title: "Genesis Drop",
        edition: "3/10",
        nftUniqueId: "canister:0:1",
        imageBlob: { getDirectURL: () => "https://example.com/art.png" },
      },
    }));
    setAuth({ actor: { claimNft } });

    renderClaimPage();

    const claimButton = (await screen.findByText("Claim NFT")).closest(
      "button",
    ) as HTMLButtonElement;
    await waitFor(() => expect(claimButton.disabled).toBe(false));
    await user.click(claimButton);

    await waitFor(() =>
      expect(claimNft).toHaveBeenCalledWith("tok-123", "REF-42"),
    );
  });

  it("surfaces a claim failure as a critical notification and an inline error", async () => {
    const user = userEvent.setup();
    const claimNft = vi.fn(async () => ({
      __kind__: "err" as const,
      err: "This NFT has already been claimed",
    }));
    setAuth({ actor: { claimNft } });

    renderClaimPage();

    const claimButton = (await screen.findByText("Claim NFT")).closest(
      "button",
    ) as HTMLButtonElement;
    await waitFor(() => expect(claimButton.disabled).toBe(false));
    await user.click(claimButton);

    await waitFor(() =>
      expect(notificationsMock.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "critical",
          title: "Claim Failed",
          message: "This NFT has already been claimed",
        }),
        "aaaaa-aa",
      ),
    );
    expect(
      await screen.findByText("This NFT has already been claimed"),
    ).toBeInTheDocument();
  });
});
