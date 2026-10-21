import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Characterization: NftDetailModal adjacent behavior ───────────────────────
// The current request intentionally changes the Unique ID row: it must render
// the `nftUniqueId` PROP as the primary source and must NOT blank to
// "NFT NOT FOUND" when verification metadata fails. That buggy behavior is
// deliberately NOT frozen here.
//
// This suite freezes the ADJACENT working behavior the fix must not disturb:
//   - the modal renders the NFT's title, Token ID, Edition and Minted rows;
//   - the delete confirmation flow calls onDelete with the NFT id and closes;
//   - the two-step burn flow requires typing BURN before it calls onBurn;
//   - readOnly (collector view) suppresses delete/burn/edit write actions;
//   - a verified unique ID still exposes the Copy Unique ID affordance.
//
// The modal's data hooks are mocked with typed local stubs; the real component
// is exercised.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const queriesMock = vi.hoisted(() => ({
  useNftDetailQuery: vi.fn(),
  useCollections: vi.fn(),
  useAddNftToCollection: vi.fn(),
  useRemoveNftFromCollection: vi.fn(),
  useUpdateMetadata: vi.fn(),
  useGetClaimStatus: vi.fn(),
  useGenerateClaimLink: vi.fn(),
  useAdminSetNftRewardType: vi.fn(),
  useAdminSetNftReferralThreshold: vi.fn(),
  useAdminSetNftPrice: vi.fn(),
  // Consumed by the PurchaseModal that NftDetailModal always renders.
  usePurchaseQuote: vi.fn(),
  useSubmitPurchase: vi.fn(),
  useVerifyPurchase: vi.fn(),
  usePaymentConfig: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
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
  useNftDetailQuery: queriesMock.useNftDetailQuery,
  useCollections: queriesMock.useCollections,
  useAddNftToCollection: queriesMock.useAddNftToCollection,
  useRemoveNftFromCollection: queriesMock.useRemoveNftFromCollection,
  useUpdateMetadata: queriesMock.useUpdateMetadata,
  useGetClaimStatus: queriesMock.useGetClaimStatus,
  useGenerateClaimLink: queriesMock.useGenerateClaimLink,
  useAdminSetNftRewardType: queriesMock.useAdminSetNftRewardType,
  useAdminSetNftReferralThreshold: queriesMock.useAdminSetNftReferralThreshold,
  useAdminSetNftPrice: queriesMock.useAdminSetNftPrice,
  usePurchaseQuote: queriesMock.usePurchaseQuote,
  useSubmitPurchase: queriesMock.useSubmitPurchase,
  useVerifyPurchase: queriesMock.useVerifyPurchase,
  usePaymentConfig: queriesMock.usePaymentConfig,
}));

import { NftDetailModal } from "@/components/NftDetailModal";

function makeNft(overrides: Partial<Nft> = {}): Nft {
  return {
    id: 42n,
    status: NftStatus.active,
    supplyLimit: 1n,
    title: "Modal Art",
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
    nftUniqueId: "canister:0:42",
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

function setDefaultQueries() {
  // Verification metadata resolves successfully with a unique ID.
  queriesMock.useNftDetailQuery.mockReturnValue({
    data: {
      nftUniqueId: "canister:0:42",
      creatorId: "creator-1",
      canisterId: "canister",
      owner: { toString: () => "aaaaa-aa" },
    },
    isLoading: false,
    isPending: false,
    isFetching: false,
    isError: false,
  });
  queriesMock.useCollections.mockReturnValue({ data: [], isLoading: false });
  queriesMock.useAddNftToCollection.mockReturnValue(mockMutation());
  queriesMock.useRemoveNftFromCollection.mockReturnValue(mockMutation());
  queriesMock.useUpdateMetadata.mockReturnValue(mockMutation());
  queriesMock.useGetClaimStatus.mockReturnValue({ data: null });
  queriesMock.useGenerateClaimLink.mockReturnValue(mockMutation());
  queriesMock.useAdminSetNftRewardType.mockReturnValue(mockMutation());
  queriesMock.useAdminSetNftReferralThreshold.mockReturnValue(mockMutation());
  queriesMock.useAdminSetNftPrice.mockReturnValue(mockMutation());
  // PurchaseModal hooks: the modal is rendered closed in these tests, so the
  // quote mutation is never invoked; the payment-config query stays disabled.
  queriesMock.usePurchaseQuote.mockReturnValue(mockMutation());
  queriesMock.useSubmitPurchase.mockReturnValue(mockMutation());
  queriesMock.useVerifyPurchase.mockReturnValue(mockMutation());
  queriesMock.usePaymentConfig.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  });
}

function renderModal(
  props: Partial<React.ComponentProps<typeof NftDetailModal>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onDelete = vi.fn();
  const onBurn = vi.fn(async () => {});
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <NftDetailModal
        nft={makeNft()}
        open
        onClose={onClose}
        onDelete={onDelete}
        onBurn={onBurn}
        callerPrincipal="aaaaa-aa"
        canisterId="canister"
        {...props}
      />
    </QueryClientProvider>,
  );
  return { ...utils, onDelete, onBurn, onClose };
}

describe("NftDetailModal adjacent behavior (Unique ID fix must not disturb)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.useAuth.mockReturnValue({ isAdmin: false });
    setDefaultQueries();
  });

  it("renders the NFT title and its Token ID / Edition / Minted rows", () => {
    renderModal();
    expect(screen.getByText("Modal Art")).toBeInTheDocument();
    expect(screen.getByText("Token ID")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Edition")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByText("Minted")).toBeInTheDocument();
  });

  it("shows the Copy Unique ID affordance when verification resolves a unique ID", () => {
    renderModal();
    expect(
      document.querySelector('[data-ocid="nft_detail.copy_unique_id_button"]'),
    ).not.toBeNull();
  });

  it("calls onDelete with the NFT id and closes when delete is confirmed", async () => {
    const user = userEvent.setup();
    const { onDelete, onClose } = renderModal();

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.delete_button"]',
      ) as HTMLButtonElement,
    );
    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.confirm_delete_button"]',
      ) as HTMLButtonElement,
    );

    expect(onDelete).toHaveBeenCalledWith(42n);
    expect(onClose).toHaveBeenCalled();
  });

  it("requires typing BURN before the burn confirmation calls onBurn", async () => {
    const user = userEvent.setup();
    const { onBurn } = renderModal();

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.burn_button"]',
      ) as HTMLButtonElement,
    );

    const confirm = document.querySelector(
      '[data-ocid="nft_detail.confirm_burn_button"]',
    ) as HTMLButtonElement;
    // Disabled until the exact confirmation text is entered.
    expect(confirm.disabled).toBe(true);

    const input = document.querySelector(
      '[data-ocid="nft_detail.burn_confirm_input"]',
    ) as HTMLInputElement;
    await user.type(input, "BURN");
    expect(confirm.disabled).toBe(false);

    await user.click(confirm);
    expect(onBurn).toHaveBeenCalledWith(42n);
  });

  it("suppresses delete, burn and edit actions in readOnly (collector) mode", () => {
    renderModal({ readOnly: true });
    expect(
      document.querySelector('[data-ocid="nft_detail.delete_button"]'),
    ).toBeNull();
    expect(
      document.querySelector('[data-ocid="nft_detail.burn_button"]'),
    ).toBeNull();
    expect(
      document.querySelector('[data-ocid="nft_detail.edit_metadata_button"]'),
    ).toBeNull();
  });

  it("renders the claim-link section only for an admin", () => {
    renderModal();
    expect(
      document.querySelector('[data-ocid="nft_detail.claim_link_section"]'),
    ).toBeNull();

    authMock.useAuth.mockReturnValue({ isAdmin: true });
    renderModal();
    expect(
      document.querySelector('[data-ocid="nft_detail.claim_link_section"]'),
    ).not.toBeNull();
  });
});
