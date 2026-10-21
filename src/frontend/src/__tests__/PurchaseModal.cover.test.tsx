import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Nft, NftStatus, RewardTier, RewardType } from "@/backend";

// ── Cover: purchase modal three-state flow ───────────────────────────────────
// Accepted behavior:
//   - a buyer opening a listed NFT sees its USD price and the admin payment
//     address plus a BUY action (the BUY action itself is covered by the
//     NftDetailModal suite; here the modal's own form is exercised);
//   - submitting a transaction reference enters a focused processing state with
//     a spinner/pulse and the "Verifying transaction on-chain..." status;
//   - on success the window shows "Payment Verified & Purchase Complete!" with
//     a single View in Gallery / Close action;
//   - on failure/timeout/short amount the window shows a polite error state with
//     Try Again / Check Status.
//
// The real PurchaseModal is exercised; only the four purchase hooks are typed
// local stubs. The backend is mocked, so this suite cannot vouch for the real
// ledger verification — it asserts the UI contract only.

const queriesMock = vi.hoisted(() => ({
  usePaymentConfig: vi.fn(),
  usePurchaseQuote: vi.fn(),
  useSubmitPurchase: vi.fn(),
  useVerifyPurchase: vi.fn(),
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
  usePaymentConfig: queriesMock.usePaymentConfig,
  usePurchaseQuote: queriesMock.usePurchaseQuote,
  useSubmitPurchase: queriesMock.useSubmitPurchase,
  useVerifyPurchase: queriesMock.useVerifyPurchase,
}));

import { PurchaseModal } from "@/components/PurchaseModal";

function makeNft(overrides: Partial<Nft> = {}): Nft {
  return {
    id: 1n,
    status: NftStatus.active,
    supplyLimit: 1n,
    title: "Listed Art",
    imageBlob: { getDirectURL: () => "https://example.com/img.png" } as never,
    edition: "1/1",
    referralThreshold: 3n,
    ownerId: { toText: () => "owner-principal" } as never,
    tags: [],
    creatorId: "creator-1",
    mintDate: 0n,
    description: "",
    auditHistory: [],
    rewardTier: RewardTier.none,
    rewardType: RewardType.none,
    assetHash: "0".repeat(64),
    nftUniqueId: "canister:0:1",
    priceUsd: 250n,
    ...overrides,
  };
}

function makePurchase(overrides: Record<string, unknown> = {}) {
  return {
    id: "1:buyer",
    nftId: 1n,
    buyer: { toText: () => "buyer" } as never,
    seller: { toText: () => "owner-principal" } as never,
    priceUsd: 250n,
    expectedE8s: 5_000_010_000n,
    rateUsed: 500_000_000n,
    txRef: "42",
    status: "pending",
    submittedAt: 0n,
    verifiedAt: undefined,
    failureReason: undefined,
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

function renderModal(nft: Nft | null, open = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PurchaseModal nft={nft} open={open} onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

function setDefaultHooks() {
  queriesMock.usePaymentConfig.mockReturnValue({
    data: { paymentAddress: "admin-payment-principal" },
    isLoading: false,
    isError: false,
  });
  queriesMock.usePurchaseQuote.mockReturnValue(
    mockMutation({
      mutateAsync: vi.fn(async () => ({
        nftId: 1n,
        priceUsd: 250n,
        paymentAddress: "admin-payment-principal",
        expectedE8s: 5_000_010_000n,
        rateUsed: 500_000_000n,
        rateIsOverride: false,
      })),
    }),
  );
  queriesMock.useSubmitPurchase.mockReturnValue(mockMutation());
  queriesMock.useVerifyPurchase.mockReturnValue(mockMutation());
}

describe("PurchaseModal (cover)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultHooks();
  });

  it("shows the USD price and the admin payment address for a listed NFT", async () => {
    renderModal(makeNft());

    // The price strip renders the whole-value USD price.
    const price = document.querySelector('[data-ocid="purchase.price_value"]');
    expect(price).not.toBeNull();
    expect(price?.textContent).toContain("$250");

    // The admin payment address is shown once the quote resolves.
    expect(
      await screen.findByText("admin-payment-principal"),
    ).toBeInTheDocument();
    // The derived ICP amount is shown (5_000_010_000 e8s = 50.0001 ICP).
    expect(screen.getByText("50.0001 ICP")).toBeInTheDocument();
  });

  it("enters a focused processing state with the on-chain status after submit", async () => {
    const user = userEvent.setup();
    // submitPurchase resolves to a pending purchase, so the modal stays in the
    // processing state and the polling effect takes over.
    queriesMock.useSubmitPurchase.mockReturnValue(
      mockMutation({
        mutateAsync: vi.fn(async () => makePurchase({ status: "pending" })),
      }),
    );
    // verifyPurchase never resolves to confirmed/failed within this test; it
    // returns pending so the modal remains in processing.
    queriesMock.useVerifyPurchase.mockReturnValue(
      mockMutation({
        mutateAsync: vi.fn(async () => makePurchase({ status: "pending" })),
      }),
    );

    renderModal(makeNft());

    const input = await screen.findByLabelText(/Transaction reference/);
    await user.type(input, "42");
    await user.click(
      document.querySelector(
        '[data-ocid="purchase.buy_button"]',
      ) as HTMLButtonElement,
    );

    // The processing state renders with the spinner and the on-chain status.
    expect(
      await screen.findByText("Verifying transaction on-chain..."),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="purchase.processing_state"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="purchase.status_text"]'),
    ).not.toBeNull();
  });

  it("shows the success state with View in Gallery / Close on a confirmed purchase", async () => {
    const user = userEvent.setup();
    // submitPurchase resolves directly to confirmed, so the modal transitions
    // straight to success without polling.
    queriesMock.useSubmitPurchase.mockReturnValue(
      mockMutation({
        mutateAsync: vi.fn(async () => makePurchase({ status: "confirmed" })),
      }),
    );

    renderModal(makeNft());

    const input = await screen.findByLabelText(/Transaction reference/);
    await user.type(input, "42");
    await user.click(
      document.querySelector(
        '[data-ocid="purchase.buy_button"]',
      ) as HTMLButtonElement,
    );

    expect(
      await screen.findByText("Payment Verified & Purchase Complete!"),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="purchase.success_state"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="purchase.view_gallery_button"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="purchase.close_button"]'),
    ).not.toBeNull();
  });

  it("shows a polite error state with Try Again / Check Status on a failed purchase", async () => {
    const user = userEvent.setup();
    queriesMock.useSubmitPurchase.mockReturnValue(
      mockMutation({
        mutateAsync: vi.fn(async () =>
          makePurchase({
            status: "failed",
            failureReason: "The transferred amount was too low.",
          }),
        ),
      }),
    );

    renderModal(makeNft());

    const input = await screen.findByLabelText(/Transaction reference/);
    await user.type(input, "42");
    await user.click(
      document.querySelector(
        '[data-ocid="purchase.buy_button"]',
      ) as HTMLButtonElement,
    );

    expect(
      await screen.findByText("The transferred amount was too low."),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="purchase.error_state"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="purchase.try_again_button"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ocid="purchase.check_status_button"]'),
    ).not.toBeNull();
  });

  it("returns to the form when Try Again is pressed from the error state", async () => {
    const user = userEvent.setup();
    queriesMock.useSubmitPurchase.mockReturnValue(
      mockMutation({
        mutateAsync: vi.fn(async () =>
          makePurchase({
            status: "failed",
            failureReason: "The transferred amount was too low.",
          }),
        ),
      }),
    );

    renderModal(makeNft());

    const input = await screen.findByLabelText(/Transaction reference/);
    await user.type(input, "42");
    await user.click(
      document.querySelector(
        '[data-ocid="purchase.buy_button"]',
      ) as HTMLButtonElement,
    );

    await screen.findByText("The transferred amount was too low.");
    await user.click(
      document.querySelector(
        '[data-ocid="purchase.try_again_button"]',
      ) as HTMLButtonElement,
    );

    // Back on the form: the transaction reference input is present again.
    expect(
      await screen.findByLabelText(/Transaction reference/),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="purchase.error_state"]'),
    ).toBeNull();
  });

  it("surfaces a submit rejection as a polite error state", async () => {
    const user = userEvent.setup();
    queriesMock.useSubmitPurchase.mockReturnValue(
      mockMutation({
        mutateAsync: vi.fn(async () => {
          throw new Error("Payment address is not configured");
        }),
      }),
    );

    renderModal(makeNft());

    const input = await screen.findByLabelText(/Transaction reference/);
    await user.type(input, "42");
    await user.click(
      document.querySelector(
        '[data-ocid="purchase.buy_button"]',
      ) as HTMLButtonElement,
    );

    expect(
      await screen.findByText("Payment address is not configured"),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="purchase.error_state"]'),
    ).not.toBeNull();
  });

  it("shows the unlisted state and no BUY form for an NFT without a price", async () => {
    renderModal(makeNft({ priceUsd: undefined }));

    expect(
      await screen.findByText("This NFT is not currently for sale."),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="purchase.buy_button"]'),
    ).toBeNull();
  });

  it("does not render when there is no NFT", () => {
    renderModal(null);
    expect(document.querySelector('[data-ocid="purchase.modal"]')).toBeNull();
  });
});
