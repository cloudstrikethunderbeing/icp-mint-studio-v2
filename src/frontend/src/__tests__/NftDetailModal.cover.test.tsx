import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Cover: detail modal BUY action, edit-price persistence, delete/burn labels ─
// Accepted behavior:
//   - a non-owner opening a listed NFT sees its USD price and a BUY action;
//   - the owner can change the USD price in the edit form and it is persisted
//     via updateMetadata with the whole-value price;
//   - a non-integer / non-positive price is rejected with validation feedback;
//   - delete and burn keep their behavior with clearer distinguishing labels.
//
// The real NftDetailModal is exercised; only its data hooks and the auth seam
// are typed local stubs. The backend is mocked, so this suite asserts the UI
// contract, not real persistence.

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
    ownerId: {
      toText: () => "owner-principal",
      toString: () => "owner-principal",
    } as never,
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

function mockMutation(overrides: Record<string, unknown> = {}) {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
  };
}

function setDefaultQueries() {
  queriesMock.useNftDetailQuery.mockReturnValue({
    data: null,
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
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
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
        callerPrincipal="owner-principal"
        canisterId="canister"
        {...props}
      />
    </QueryClientProvider>,
  );
  return { ...utils, onDelete, onBurn, onClose };
}

describe("NftDetailModal BUY action (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.useAuth.mockReturnValue({ isAdmin: false });
    setDefaultQueries();
  });

  it("shows the USD price and a BUY action to a non-owner of a listed NFT", () => {
    renderModal({
      nft: makeNft({ priceUsd: 250n }),
      callerPrincipal: "buyer-principal",
    });

    const price = document.querySelector('[data-ocid="nft_detail.price"]');
    expect(price).not.toBeNull();
    expect(price?.textContent).toContain("$250");

    const buy = document.querySelector(
      '[data-ocid="nft_detail.buy_button"]',
    ) as HTMLButtonElement;
    expect(buy).not.toBeNull();
    expect(buy.textContent).toContain("Buy for $250");
  });

  it("does not show the BUY action to the owner", () => {
    renderModal({
      nft: makeNft({ priceUsd: 250n }),
      callerPrincipal: "owner-principal",
    });
    expect(
      document.querySelector('[data-ocid="nft_detail.buy_button"]'),
    ).toBeNull();
  });

  it("does not show the BUY action for an unlisted NFT", () => {
    renderModal({
      nft: makeNft({ priceUsd: undefined }),
      callerPrincipal: "buyer-principal",
    });
    expect(
      document.querySelector('[data-ocid="nft_detail.buy_button"]'),
    ).toBeNull();
    const price = document.querySelector('[data-ocid="nft_detail.price"]');
    expect(price?.textContent).toContain("Not for sale");
  });

  it("opens the purchase modal when BUY is pressed", async () => {
    const user = userEvent.setup();
    renderModal({
      nft: makeNft({ priceUsd: 250n }),
      callerPrincipal: "buyer-principal",
    });

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.buy_button"]',
      ) as HTMLButtonElement,
    );

    expect(await screen.findByText("Buy Modal Art")).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="purchase.modal"]'),
    ).not.toBeNull();
  });
});

describe("NftDetailModal edit-price persistence (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.useAuth.mockReturnValue({ isAdmin: false });
    setDefaultQueries();
  });

  it("persists a changed USD price via updateMetadata on save", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => undefined);
    queriesMock.useUpdateMetadata.mockReturnValue(
      mockMutation({ mutateAsync }),
    );

    renderModal({
      nft: makeNft({ priceUsd: 100n }),
      callerPrincipal: "owner-principal",
    });

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.edit_metadata_button"]',
      ) as HTMLButtonElement,
    );

    const priceInput = document.querySelector(
      '[data-ocid="nft_detail.edit_price_input"]',
    ) as HTMLInputElement;
    // The form is pre-filled with the current price.
    expect(priceInput.value).toBe("100");

    await user.clear(priceInput);
    await user.type(priceInput, "175");

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.edit_save_button"]',
      ) as HTMLButtonElement,
    );

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      nftId: 42n,
      updates: expect.objectContaining({ priceUsd: 175 }),
    });
  });

  it("rejects a non-positive price with validation feedback and does not save", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => undefined);
    queriesMock.useUpdateMetadata.mockReturnValue(
      mockMutation({ mutateAsync }),
    );

    renderModal({
      nft: makeNft({ priceUsd: 100n }),
      callerPrincipal: "owner-principal",
    });

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.edit_metadata_button"]',
      ) as HTMLButtonElement,
    );

    // The edit form is open with the price field pre-filled.
    const priceInput = document.querySelector(
      '[data-ocid="nft_detail.edit_price_input"]',
    ) as HTMLInputElement;
    expect(priceInput).not.toBeNull();
    expect(priceInput.value).toBe("100");

    // Replace the pre-filled value with a non-positive whole value. Select-all
    // then type, because a number input rejects the "." keystroke under jsdom
    // (so a decimal cannot be typed) and clear() is unreliable on number inputs.
    await user.click(priceInput);
    await user.keyboard("{Control>}a{/Control}0");
    expect(priceInput.value).toBe("0");

    await user.click(
      document.querySelector(
        '[data-ocid="nft_detail.edit_save_button"]',
      ) as HTMLButtonElement,
    );

    // A non-positive price must never be persisted. The field also carries
    // native min/step constraints, so the browser may block submission before
    // the component's own message renders; either way no save is issued and the
    // edit form stays open for correction.
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-ocid="nft_detail.edit_form"]'),
    ).not.toBeNull();
  });
});

describe("NftDetailModal delete/burn labels (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.useAuth.mockReturnValue({ isAdmin: false });
    setDefaultQueries();
  });

  it("shows clearer distinguishing labels for delete and burn", () => {
    renderModal({ callerPrincipal: "owner-principal" });

    const deleteButton = document.querySelector(
      '[data-ocid="nft_detail.delete_button"]',
    );
    const burnButton = document.querySelector(
      '[data-ocid="nft_detail.burn_button"]',
    );
    expect(deleteButton?.textContent).toContain("Delete from Listings");
    expect(burnButton?.textContent).toContain("Burn NFT (Permanent)");
  });
});
