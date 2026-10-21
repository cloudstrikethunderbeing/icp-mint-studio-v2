import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Common "../types/common";
import Types "../types/purchase";

module {
  // Purchase store keyed by the deterministic purchase id (nftId + buyer).
  public type PurchaseStore = Map.Map<Text, Types.Purchase>;

  // Admin-tunable payment configuration. `paymentAddress` is the principal
  // buyers send ICP to; `rateOverride` is an optional manual ICP/USD rate that
  // takes precedence over the live rate when set.
  public type PaymentConfig = {
    var paymentAddress : Text;
    var rateOverride : ?Nat;
  };

  // Fixed-point scale for the ICP/USD rate: whole USD per 1 ICP, scaled by
  // 1e8. A rate of 12.0 USD/ICP is stored as 1_200_000_000.
  public let RATE_SCALE : Nat = 100_000_000;

  // e8s per 1 ICP.
  public let E8S_PER_ICP : Nat = 100_000_000;

  // Fallback ICP/USD rate (scaled by RATE_SCALE) used when the live fetch
  // fails and no admin override is set. 5.0 USD/ICP — a conservative mid-range
  // value so the derived ICP amount never under-charges the buyer.
  public let FALLBACK_RATE : Nat = 500_000_000;

  // The mainnet ICP ledger canister. Verification queries this canister's
  // query_blocks method directly (no HTTP outcall needed).
  public let ICP_LEDGER_CANISTER_ID : Text = "ryjl3-tyaaa-aaaaa-aaaba-cai";

  // Standard ICP ledger transfer fee in e8s (0.0001 ICP).
  public let LEDGER_FEE_E8S : Nat = 10_000;

  // Number of most-recent ledger blocks scanned during verification. A buyer
  // submits right after sending, so a bounded recent window is the correct
  // bound — the canister never walks the whole ledger.
  public let VERIFY_SCAN_WINDOW : Nat64 = 1000;

  // ── ICP ledger interface (minimal subset needed for verification) ─────────
  // The ledger's query_blocks returns a contiguous range of blocks. Each block
  // carries a transaction whose `transfer` operation names the destination
  // account and amount. We match on the admin account identifier and amount.
  public type BlockIndex = Nat64;
  public type Tokens = { e8s : Nat64 };
  public type TimeStamp = { timestamp_nanos : Nat64 };
  public type AccountIdentifier = Blob;
  public type SubAccount = Blob;
  public type Memo = Nat64;

  // Ledger transfer variant (per the ICP ledger spec).
  public type Transfer = {
    #Mint : { to : AccountIdentifier; amount : Tokens };
    #Burn : { from : AccountIdentifier; amount : Tokens };
    #Send : { from : AccountIdentifier; to : AccountIdentifier; amount : Tokens };
  };

  public type Transaction = {
    transfer : Transfer;
    memo : Memo;
    created_at_time : TimeStamp;
  };

  public type Block = {
    parent_hash : ?Blob;
    transaction : Transaction;
    timestamp : TimeStamp;
  };

  public type GetBlocksArgs = { start : BlockIndex; length : Nat64 };

  public type QueryBlocksResponse = {
    chain_length : Nat64;
    certificate : ?Blob;
    blocks : [Block];
    first_block_index : BlockIndex;
    archived_blocks : [{
      start : BlockIndex;
      length : Nat64;
      callback : shared query GetBlocksArgs -> async QueryBlocksResponse;
    }];
  };

  public type Account = { owner : Principal; subaccount : ?SubAccount };

  public type Ledger = actor {
    account_identifier : shared query Account -> async AccountIdentifier;
    query_blocks : shared query GetBlocksArgs -> async QueryBlocksResponse;
  };

  public func initStore() : PurchaseStore {
    Map.empty()
  };

  // Deterministic purchase id for a (nftId, buyer) pair.
  public func purchaseId(nftId : Nat, buyer : Principal) : Text {
    nftId.toText() # ":" # buyer.toText()
  };

  // Converts a whole-value USD price to the ICP amount (in e8s) the buyer must
  // send, using `rate` (USD per ICP scaled by RATE_SCALE) and rounding UP so
  // the received amount covers the whole USD value plus transaction fees.
  //
  //   e8s = ceil(priceUsd * E8S_PER_ICP * RATE_SCALE / rate) + LEDGER_FEE_E8S
  //
  // The ledger fee is added so the amount that actually lands in the admin
  // account (sent amount minus the ledger fee) still covers the whole USD
  // value. A zero rate is guarded to the fallback so the division never traps.
  public func usdToE8s(priceUsd : Nat, rate : Nat) : Nat {
    let safeRate = if (rate == 0) { FALLBACK_RATE } else { rate };
    let numerator = priceUsd * E8S_PER_ICP * RATE_SCALE;
    // Ceiling division: (numerator + safeRate - 1) / safeRate.
    let base = (numerator + safeRate - 1) / safeRate;
    base + LEDGER_FEE_E8S
  };

  // Resolves the effective rate: the admin override when set, otherwise the
  // live rate supplied by the caller. Returns (rate, isOverride).
  public func effectiveRate(config : PaymentConfig, liveRate : Nat) : (Nat, Bool) {
    switch (config.rateOverride) {
      case (?r) { (r, true) };
      case (null) {
        if (liveRate == 0) { (FALLBACK_RATE, false) } else { (liveRate, false) }
      };
    }
  };

  // Records a pending purchase for a specific NFT. Validates the NFT is active
  // and listed with a price, and that the buyer is not the owner.
  public func submitPurchase(
    store : PurchaseStore,
    nftId : Nat,
    buyer : Principal,
    seller : Principal,
    priceUsd : Nat,
    expectedE8s : Nat,
    rateUsed : Nat,
    txRef : Text,
    timestamp : Common.Timestamp,
  ) : Types.Purchase {
    let id = purchaseId(nftId, buyer);
    let purchase : Types.Purchase = {
      id;
      nftId;
      buyer;
      seller;
      priceUsd;
      expectedE8s;
      rateUsed;
      txRef;
      status = #pending;
      submittedAt = timestamp;
      verifiedAt = null;
      failureReason = null;
    };
    store.add(id, purchase);
    purchase
  };

  public func getPurchase(store : PurchaseStore, id : Text) : ?Types.Purchase {
    store.get(id)
  };

  // Marks a purchase confirmed and stamps verifiedAt.
  public func markConfirmed(store : PurchaseStore, id : Text, timestamp : Common.Timestamp) : ?Types.Purchase {
    switch (store.get(id)) {
      case (null) { null };
      case (?p) {
        let updated = { p with status = #confirmed; verifiedAt = ?timestamp; failureReason = null };
        store.add(id, updated);
        ?updated
      };
    }
  };

  // Marks a purchase failed with a reason.
  public func markFailed(store : PurchaseStore, id : Text, reason : Text) : ?Types.Purchase {
    switch (store.get(id)) {
      case (null) { null };
      case (?p) {
        let updated = { p with status = #failed; failureReason = ?reason };
        store.add(id, updated);
        ?updated
      };
    }
  };

  // Lists purchases for a buyer, newest first.
  public func listByBuyer(store : PurchaseStore, buyer : Principal) : [Types.Purchase] {
    let results = List.empty<Types.Purchase>();
    for ((_, p) in store.entries()) {
      if (Principal.equal(p.buyer, buyer)) {
        results.add(p);
      };
    };
    let arr = results.toArray();
    arr.sort(func(a, b) = Nat.compare(b.submittedAt, a.submittedAt))
  };

  // Lists all purchases (admin view), newest first.
  public func listAll(store : PurchaseStore) : [Types.Purchase] {
    let results = List.empty<Types.Purchase>();
    for ((_, p) in store.entries()) {
      results.add(p);
    };
    let arr = results.toArray();
    arr.sort(func(a, b) = Nat.compare(b.submittedAt, a.submittedAt))
  };

  // ── Ledger verification ───────────────────────────────────────────────────

  // [REPLAY-GUARD] Parses a buyer-submitted transaction reference into a ledger
  // block index. Returns null when the reference is not a valid non-negative
  // integer (a tx hash, empty string, or malformed value) — such a reference
  // can never be matched against a block and must not be consumed.
  public func parseBlockIndex(txRef : Text) : ?Nat {
    Nat.fromText(txRef.trim(#text " \t\n\r"))
  };

  // [REPLAY-GUARD] Atomically consumes a ledger block index for a purchase.
  // Returns #consumed when this purchase now owns the block index (the store is
  // updated in the same synchronous step), or #alreadyConsumed(otherPurchaseId)
  // when a DIFFERENT purchase already consumed it. Re-consuming the SAME
  // purchase id is idempotent and returns #consumed. This is the replay
  // protection: a block index can settle at most one purchase.
  public func consumeBlockIndex(
    store : Types.ConsumedBlockIndexStore,
    blockIndex : Nat,
    purchaseId : Text,
  ) : Types.ConsumeOutcome {
    switch (store.get(blockIndex)) {
      case (null) {
        // First consumer of this block index — record ownership synchronously.
        store.add(blockIndex, purchaseId);
        #consumed;
      };
      case (?owner) {
        if (owner == purchaseId) {
          // Idempotent re-consume by the SAME purchase (e.g. a retried verify
          // after a transient failure). Not a replay.
          #consumed;
        } else {
          // A DIFFERENT purchase already settled with this block index.
          #alreadyConsumed(owner);
        };
      };
    };
  };

  // [REPLAY-GUARD] Releases a consumed block index so a purchase that failed
  // AFTER consuming (but before settlement) does not permanently burn the
  // buyer's block index. Only releases when the recorded owner is `purchaseId`.
  public func releaseBlockIndex(
    store : Types.ConsumedBlockIndexStore,
    blockIndex : Nat,
    purchaseId : Text,
  ) : () {
    switch (store.get(blockIndex)) {
      case (null) {};
      case (?owner) {
        if (owner == purchaseId) {
          store.remove(blockIndex);
        };
      };
    };
  };

  // [REPLAY-GUARD] True when the block index has already been consumed by any
  // purchase. Read-only; used to reject a replay before settlement.
  public func isBlockIndexConsumed(
    store : Types.ConsumedBlockIndexStore,
    blockIndex : Nat,
  ) : Bool {
    store.get(blockIndex) != null
  };

  func blobEqual(a : Blob, b : Blob) : Bool {
    if (a.size() != b.size()) { return false };
    var i = 0;
    let n = a.size();
    while (i < n) {
      if (a[i] != b[i]) { return false };
      i += 1;
    };
    true
  };

  // Scans the most recent ledger blocks for the SPECIFIC transfer the buyer
  // referenced. The buyer's `txRef` is the ledger block index of their
  // transfer, so a match requires ALL of:
  //   - the block's absolute index equals the submitted reference,
  //   - the transfer destination is `toAccount` (the admin account), and
  //   - the transferred amount is >= `minAmount`.
  // A txRef that is not a valid block index is treated as unverified (no
  // match) rather than confirming on amount alone — otherwise any unrelated
  // prior transfer to the admin account would confirm the purchase.
  //
  // The scan is bounded to VERIFY_SCAN_WINDOW blocks ending at the current
  // chain tip, so a canister call never walks the whole ledger. A buyer's
  // transfer is recent by construction (they submit right after sending), so a
  // bounded recent window is the correct bound. A reference outside the window
  // is not visible and therefore not confirmed.
  public func findMatchingTransfer(
    ledger : Ledger,
    toAccount : Blob,
    minAmount : Nat,
    txRef : Text,
  ) : async Bool {
    // The submitted reference must resolve to a ledger block index. Anything
    // else (a tx hash, an empty string, a non-numeric value) cannot be matched
    // against a block and is left unverified.
    let targetIndex = switch (Nat.fromText(txRef.trim(#text " \t\n\r"))) {
      case (?n) { n.toNat64() };
      case (null) { return false };
    };
    let tipResp = await ledger.query_blocks({ start = 0; length = 1 });
    let chainLength = tipResp.chain_length;
    if (chainLength == 0) {
      return false;
    };
    // Fetch the last VERIFY_SCAN_WINDOW blocks (or all of them when the chain
    // is shorter). start = max(0, chainLength - window).
    let window : Nat64 = if (VERIFY_SCAN_WINDOW > chainLength) { chainLength } else { VERIFY_SCAN_WINDOW };
    let start : Nat64 = chainLength - window;
    let resp = await ledger.query_blocks({ start; length = window });
    var found = false;
    var i : Nat64 = 0;
    for (block in resp.blocks.vals()) {
      // Absolute block index of this entry in the returned window.
      let blockIndex = resp.first_block_index + i;
      i += 1;
      if (blockIndex == targetIndex) {
        switch (block.transaction.transfer) {
          case (#Send(t)) {
            if (blobEqual(t.to, toAccount) and t.amount.e8s.toNat() >= minAmount) {
              found := true;
            };
          };
          case (_) {};
        };
      };
    };
    found
  };

  // Verifies a purchase against the ledger: derives the admin account id from
  // the configured payment address via the ledger's own account_identifier
  // method, scans a bounded recent window of ledger blocks for the SPECIFIC
  // transfer the buyer referenced (block index == txRef) to that account
  // covering the expected amount, and returns #confirmed when found, #pending
  // when not yet visible, or #failed when the payment address is
  // unconfigured/invalid or the submitted reference is not a valid block index.
  public func verifyAgainstLedger(
    ledger : Ledger,
    config : PaymentConfig,
    expectedE8s : Nat,
    txRef : Text,
  ) : async Types.VerifyOutcome {
    if (config.paymentAddress == "") {
      return #failed("Payment address is not configured");
    };
    let adminPrincipal = switch (Principal.fromText(config.paymentAddress)) {
      case (p) { p };
      case (_) { return #failed("Payment address is not a valid principal") };
    };
    // A reference that is not a ledger block index can never be matched, so
    // fail it explicitly instead of leaving the buyer polling forever.
    if (Nat.fromText(txRef.trim(#text " \t\n\r")) == null) {
      return #failed("Transaction reference must be a ledger block index");
    };
    let toAccount = await ledger.account_identifier({ owner = adminPrincipal; subaccount = null });
    let matched = await findMatchingTransfer(ledger, toAccount, expectedE8s, txRef);
    if (matched) { #confirmed } else { #pending }
  };
}
