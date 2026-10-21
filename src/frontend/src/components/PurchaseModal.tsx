import type { Nft, Purchase, PurchaseQuote } from "@/backend";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  usePaymentConfig,
  usePurchaseQuote,
  useSubmitPurchase,
  useVerifyPurchase,
} from "@/hooks/useQueries";
import { formatPriceUsd, normalizePriceUsd } from "@/types";
import { Check, Copy, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { devLog } from "../utils/devLog";

// ── [PURCHASE] Purchase modal ───────────────────────────────────────────────
// A single modal instance is rendered by NftDetailModal and opened from its
// internal state when a non-owner taps BUY on a listed NFT. This is the one
// working purchase entry point; there is no separate root provider.

// [PURCHASE] Bounded verification polling. The backend verifies the ledger
// transfer on-chain; a fresh submission may need a few seconds before the
// transfer is queryable, so we poll a bounded number of times and then surface
// a polite "still checking" error state rather than spinning forever.
const VERIFY_POLL_INTERVAL_MS = 4000;
const VERIFY_MAX_ATTEMPTS = 8;

// [PURCHASE] Format an e8s amount (1 ICP = 100_000_000 e8s) as a compact ICP
// string with up to 8 decimals, trailing zeros trimmed.
function formatIcp(e8s: bigint): string {
  const negative = e8s < 0n;
  const abs = negative ? -e8s : e8s;
  const whole = abs / 100_000_000n;
  const frac = (abs % 100_000_000n)
    .toString()
    .padStart(8, "0")
    .replace(/0+$/, "");
  const value = frac.length > 0 ? `${whole}.${frac}` : whole.toString();
  return `${negative ? "-" : ""}${value} ICP`;
}

type Stage = "form" | "processing" | "success" | "error";

interface PurchaseModalProps {
  nft: Nft | null;
  open: boolean;
  onClose: () => void;
}

export function PurchaseModal({ nft, open, onClose }: PurchaseModalProps) {
  const nftId = nft?.id ?? null;
  const priceUsd = normalizePriceUsd(nft?.priceUsd);

  const [stage, setStage] = useState<Stage>("form");
  const [txRef, setTxRef] = useState("");
  const [addressCopied, setAddressCopied] = useState(false);
  const [amountCopied, setAmountCopied] = useState(false);
  const [statusLine, setStatusLine] = useState(
    "Verifying transaction on-chain...",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [quote, setQuote] = useState<PurchaseQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // [PURCHASE] React Query's useMutation returns a new result object on every
  // render, so the mutation object itself is NOT a stable dependency. Destructure
  // the stable `mutateAsync` (and the pending flag) and depend only on those in
  // effects/callbacks — otherwise the quote effect re-runs every render and each
  // resolved setQuote triggers another render, an unbounded loop that repeatedly
  // calls getPurchaseQuote (a shared update with a live-rate HTTP outcall).
  const { mutateAsync: loadQuoteAsync } = usePurchaseQuote();
  const paymentConfigQuery = usePaymentConfig(open);
  const { mutateAsync: submitPurchaseAsync, isPending: submitPending } =
    useSubmitPurchase();
  const { mutateAsync: verifyPurchaseAsync, isPending: verifyPending } =
    useVerifyPurchase();

  const paymentAddress =
    quote?.paymentAddress ?? paymentConfigQuery.data?.paymentAddress ?? "";
  const expectedE8s = quote?.expectedE8s ?? null;

  // Reset the flow whenever the modal opens for a different NFT.
  const resetKey = `${open ? "open" : "closed"}:${nftId?.toString() ?? ""}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the open/nft identity changes
  useEffect(() => {
    setStage("form");
    setTxRef("");
    setAddressCopied(false);
    setAmountCopied(false);
    setStatusLine("Verifying transaction on-chain...");
    setErrorMessage(null);
    setPurchase(null);
    setQuote(null);
    setQuoteError(null);
  }, [resetKey]);

  // [PURCHASE] Resolve the quote when the modal opens for a listed NFT.
  // getPurchaseQuote is a shared update (it resolves the live rate), so it is
  // invoked through the mutation rather than a cached query. `loadQuoteAsync` is
  // the stable mutateAsync, so this callback identity only changes when nftId
  // changes.
  const loadQuote = useCallback(async () => {
    if (nftId === null) return;
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const result = await loadQuoteAsync(nftId);
      setQuote(result);
    } catch (err) {
      setQuoteError(
        err instanceof Error
          ? err.message
          : "We could not load the current exchange rate.",
      );
    } finally {
      setQuoteLoading(false);
    }
  }, [nftId, loadQuoteAsync]);

  // [PURCHASE] Guard the quote load to run once per (open, nftId). Even with a
  // stable loadQuote, the effect must not re-fire on unrelated re-renders (e.g.
  // a resolved setQuote), so track the last key we loaded for.
  const quoteLoadedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open || nftId === null) {
      quoteLoadedKeyRef.current = null;
      return;
    }
    if (normalizePriceUsd(nft?.priceUsd) === null) return;
    const key = `${nftId.toString()}`;
    if (quoteLoadedKeyRef.current === key) return;
    quoteLoadedKeyRef.current = key;
    void loadQuote();
  }, [open, nftId, nft?.priceUsd, loadQuote]);

  // [PURCHASE] Poll verification while a purchase is pending. The status line
  // alternates naturally between the two on-chain phases so a longer check
  // reads as progress rather than a stall.
  const pollAttemptsRef = useRef(0);
  useEffect(() => {
    if (stage !== "processing" || !purchase) return;
    if (purchase.status !== "pending") return;

    let cancelled = false;
    pollAttemptsRef.current = 0;

    const tick = async () => {
      if (cancelled) return;
      pollAttemptsRef.current += 1;
      setStatusLine(
        pollAttemptsRef.current % 2 === 0
          ? "Confirming block transfer..."
          : "Verifying transaction on-chain...",
      );
      try {
        const updated = await verifyPurchaseAsync(purchase.id);
        if (cancelled) return;
        setPurchase(updated);
        if (updated.status === "confirmed") {
          setStage("success");
          return;
        }
        if (updated.status === "failed") {
          setErrorMessage(
            updated.failureReason ||
              "The payment could not be verified. Please check the transaction and try again.",
          );
          setStage("error");
          return;
        }
      } catch (err) {
        devLog("[PURCHASE] verify attempt failed", {
          attempt: pollAttemptsRef.current,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      if (cancelled) return;
      if (pollAttemptsRef.current >= VERIFY_MAX_ATTEMPTS) {
        setErrorMessage(
          "We could not confirm the transfer yet. It may still be processing — check the status again in a moment.",
        );
        setStage("error");
        return;
      }
      window.setTimeout(tick, VERIFY_POLL_INTERVAL_MS);
    };

    const timer = window.setTimeout(tick, VERIFY_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [stage, purchase, verifyPurchaseAsync]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (nftId === null) return;
      const trimmed = txRef.trim();
      if (!trimmed) return;
      setErrorMessage(null);
      setStage("processing");
      setStatusLine("Verifying transaction on-chain...");
      try {
        const created = await submitPurchaseAsync({
          nftId,
          txRef: trimmed,
        });
        setPurchase(created);
        if (created.status === "confirmed") {
          setStage("success");
        } else if (created.status === "failed") {
          setErrorMessage(
            created.failureReason ||
              "The payment could not be verified. Please check the transaction and try again.",
          );
          setStage("error");
        }
        // A pending purchase is picked up by the polling effect above.
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "We could not submit your purchase. Please try again.",
        );
        setStage("error");
      }
    },
    [nftId, txRef, submitPurchaseAsync],
  );

  const handleTryAgain = useCallback(() => {
    setErrorMessage(null);
    setStage("form");
  }, []);

  const handleCheckStatus = useCallback(async () => {
    if (!purchase) {
      setStage("form");
      return;
    }
    setErrorMessage(null);
    setStage("processing");
    setStatusLine("Verifying transaction on-chain...");
    try {
      const updated = await verifyPurchaseAsync(purchase.id);
      setPurchase(updated);
      if (updated.status === "confirmed") {
        setStage("success");
      } else if (updated.status === "failed") {
        setErrorMessage(
          updated.failureReason ||
            "The payment could not be verified. Please check the transaction and try again.",
        );
        setStage("error");
      } else {
        setErrorMessage(
          "The transfer is still processing. Please check again in a moment.",
        );
        setStage("error");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "We could not check the status. Please try again.",
      );
      setStage("error");
    }
  }, [purchase, verifyPurchaseAsync]);

  const copy = useCallback(
    async (value: string, setCopied: (v: boolean) => void) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard unavailable — the value stays selectable in the UI.
      }
    },
    [],
  );

  const title = useMemo(() => nft?.title || "NFT", [nft?.title]);

  if (!nft) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className="max-w-[min(26rem,95vw)] mx-auto rounded-2xl"
        data-ocid="purchase.modal"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-display truncate pr-6">
            {stage === "success" ? "Purchase complete" : `Buy ${title}`}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Complete your purchase of {title}.
          </DialogDescription>
        </DialogHeader>

        {stage === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Price strip — flat caption, no pill */}
            <div className="price-strip rounded-lg border border-border">
              <span className="price-strip-label">Price</span>
              <span
                className="price-strip-value"
                data-state={priceUsd === null ? "unlisted" : "listed"}
                data-ocid="purchase.price_value"
              >
                {formatPriceUsd(nft.priceUsd)}
              </span>
            </div>

            {priceUsd === null ? (
              <p
                className="text-sm text-muted-foreground"
                data-ocid="purchase.unlisted_state"
              >
                This NFT is not currently for sale.
              </p>
            ) : quoteLoading ? (
              <div
                className="flex items-center gap-2 text-sm text-muted-foreground"
                data-ocid="purchase.quote_loading_state"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading the current rate...
              </div>
            ) : quoteError ? (
              <div className="space-y-2" data-ocid="purchase.quote_error_state">
                <p className="text-sm text-destructive">
                  We could not load the current exchange rate.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadQuote()}
                  data-ocid="purchase.retry_quote_button"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Send ICP to
                  </Label>
                  <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5">
                    <span className="flex-1 text-[11px] font-mono text-foreground break-all min-w-0">
                      {paymentAddress || "Unavailable"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        void copy(paymentAddress, setAddressCopied)
                      }
                      disabled={!paymentAddress}
                      className="shrink-0 p-1 rounded hover:bg-accent transition-colors disabled:opacity-50"
                      aria-label="Copy payment address"
                      data-ocid="purchase.copy_address_button"
                    >
                      {addressCopied ? (
                        <Check className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Amount to send
                  </Label>
                  <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5">
                    <span className="flex-1 text-sm font-mono text-foreground break-all min-w-0">
                      {expectedE8s !== null ? formatIcp(expectedE8s) : "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        expectedE8s !== null &&
                        void copy(expectedE8s.toString(), setAmountCopied)
                      }
                      disabled={expectedE8s === null}
                      className="shrink-0 p-1 rounded hover:bg-accent transition-colors disabled:opacity-50"
                      aria-label="Copy ICP amount"
                      data-ocid="purchase.copy_amount_button"
                    >
                      {amountCopied ? (
                        <Check className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {quote?.rateIsOverride
                      ? "Converted at the admin-set rate."
                      : "Converted at the live rate, rounded to cover fees."}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="purchase-tx-ref"
                    className="text-xs text-muted-foreground"
                  >
                    Transaction reference
                  </Label>
                  <Input
                    id="purchase-tx-ref"
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                    placeholder="Paste your ICP transaction reference"
                    className="text-xs font-mono"
                    autoComplete="off"
                    spellCheck={false}
                    data-ocid="purchase.tx_ref_input"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Send the ICP first, then paste the transaction reference
                    here.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!txRef.trim() || submitPending}
                  data-ocid="purchase.buy_button"
                >
                  {submitPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Buy"
                  )}
                </Button>
              </>
            )}
          </form>
        )}

        {stage === "processing" && (
          <div
            className="flex flex-col items-center gap-4 py-6 text-center"
            data-ocid="purchase.processing_state"
          >
            <div className="purchase-spinner" aria-hidden="true" />
            <output
              className="purchase-status"
              data-ocid="purchase.status_text"
            >
              {statusLine}
            </output>
          </div>
        )}

        {stage === "success" && (
          <div
            className="flex flex-col items-center gap-4 py-6 text-center"
            data-ocid="purchase.success_state"
          >
            <span
              className="purchase-state-icon purchase-state-icon-success"
              aria-hidden="true"
            >
              <Check className="h-6 w-6" />
            </span>
            <p className="font-display text-base font-semibold text-foreground">
              Payment Verified &amp; Purchase Complete!
            </p>
            <Button
              type="button"
              className="w-full"
              onClick={onClose}
              data-ocid="purchase.view_gallery_button"
            >
              View in Gallery
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onClose}
              data-ocid="purchase.close_button"
            >
              Close
            </Button>
          </div>
        )}

        {stage === "error" && (
          <div
            className="flex flex-col items-center gap-4 py-6 text-center"
            data-ocid="purchase.error_state"
          >
            <span
              className="purchase-state-icon purchase-state-icon-error"
              aria-hidden="true"
            >
              <X className="h-6 w-6" />
            </span>
            <p className="text-sm text-muted-foreground">
              {errorMessage ??
                "Something went wrong verifying your payment. Please try again."}
            </p>
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleTryAgain}
                data-ocid="purchase.try_again_button"
              >
                Try Again
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => void handleCheckStatus()}
                disabled={verifyPending}
                data-ocid="purchase.check_status_button"
              >
                {verifyPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Check Status"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
