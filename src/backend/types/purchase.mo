import Map "mo:core/Map";
import Common "common";

module {
  // Lifecycle of a per-NFT purchase. A buyer submits a transaction reference
  // after sending ICP to the admin payment address; the backend then verifies
  // the transfer against the ICP ledger canister and moves the record to
  // #confirmed (or #failed on a short/mismatched/timeout transfer).
  public type PurchaseStatus = {
    #pending;
    #confirmed;
    #failed;
  };

  // One purchase attempt for a specific listed NFT. Keyed in the purchase
  // store by a deterministic id derived from (nftId, buyer) so a buyer has at
  // most one live purchase record per NFT.
  public type Purchase = {
    id : Text;
    nftId : Nat;
    buyer : Principal;
    seller : Principal;
    // Whole-value USD price captured at submit time (the NFT's priceUsd).
    priceUsd : Nat;
    // ICP amount the buyer was quoted, in e8s (1 ICP = 100_000_000 e8s).
    expectedE8s : Nat;
    // ICP/USD rate used for the quote, scaled by RATE_SCALE (whole USD per
    // 1 ICP, e.g. 12_000_000_000 = 12.0 USD/ICP).
    rateUsed : Nat;
    // Transaction reference the buyer submitted (ledger block index as text,
    // or a tx hash). Matched against the ledger transfer on verification.
    txRef : Text;
    status : PurchaseStatus;
    submittedAt : Common.Timestamp;
    verifiedAt : ?Common.Timestamp;
    // Populated when status = #failed (short amount, no match, timeout).
    failureReason : ?Text;
  };

  // Quote returned to the buyer before they send ICP. Carries the USD price,
  // the admin payment address, the derived ICP amount (e8s), and the rate used
  // so the frontend can display exactly what to send.
  public type PurchaseQuote = {
    nftId : Nat;
    priceUsd : Nat;
    paymentAddress : Text;
    expectedE8s : Nat;
    rateUsed : Nat;
    // True when the rate came from the admin manual override rather than the
    // live rate source.
    rateIsOverride : Bool;
  };

  // Result of a verification attempt against the ICP ledger canister.
  public type VerifyOutcome = {
    #confirmed;
    #pending;
    #failed : Text;
  };

  // [REPLAY-GUARD] Consumed-ledger-block registry. Maps a ledger block index
  // (the buyer's txRef, parsed as a Nat) to the purchase id that consumed it.
  // A block index may be consumed by AT MOST ONE purchase: once present here,
  // any other purchase presenting the same block index is rejected BEFORE
  // settlement. This is the replay-protection store for ICP purchases.
  public type ConsumedBlockIndexStore = Map.Map<Nat, Text>;

  // [REPLAY-GUARD] Outcome of attempting to consume a ledger block index for a
  // purchase. `#consumed` means this purchase now owns the block index;
  // `#alreadyConsumed` means another purchase already used it (replay).
  public type ConsumeOutcome = {
    #consumed;
    #alreadyConsumed : Text;
  };
}
