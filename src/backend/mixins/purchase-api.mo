import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import List "mo:core/List";
import Map "mo:core/Map";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Auth "../lib/auth";
import Types "../types/purchase";
import PurchaseLib "../lib/purchase";
import NftLib "../lib/nft";

mixin (
  purchaseStore : PurchaseLib.PurchaseStore,
  paymentConfig : PurchaseLib.PaymentConfig,
  nftStore : NftLib.NftStore,
  admins : { var value : [Principal] },
  // [PURCHASE] Owner secondary index, so a confirmed sale can move the NFT id
  // from the seller's bucket to the buyer's bucket.
  ownerIndex : Map.Map<Principal, List.List<Nat>>,
  // [REPLAY-GUARD] Consumed-ledger-block registry. Maps a ledger block index to
  // the purchase id that consumed it, so each block index settles at most one
  // purchase. Stable; initialized empty by the migration chain.
  consumedBlockIndexStore : Types.ConsumedBlockIndexStore,
) {
  // [PURCHASE] Live ICP/USD rate source. The IC dashboard API returns the
  // current ICP/USD rate as JSON: {"icp_usd_rate":[[<ts>,"<rate>"]]}. The
  // response is a single scalar (59 bytes), so no server-side bound is needed
  // beyond the outcall's own byte ceiling. On any failure the caller falls
  // back to the admin override or PurchaseLib.FALLBACK_RATE.
  transient let RATE_URL : Text = "https://ic-api.internetcomputer.org/api/v3/icp-usd-rate";

  // Transform callback required by the IC for HTTP outcalls. Delegates to the
  // package's canonical transform (strips non-deterministic headers).
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input)
  };

  // Fetches the live ICP/USD rate and returns it scaled by RATE_SCALE. Returns
  // 0 on any failure so effectiveRate falls back to the override/default.
  func fetchLiveRate() : async Nat {
    try {
      let body = await OutCall.httpGetRequest(RATE_URL, [], transform);
      parseRate(body)
    } catch (_) {
      0
    }
  };

  // Parses {"icp_usd_rate":[[<ts>,"<rate>"]]} and returns the rate scaled by
  // RATE_SCALE. The rate is a decimal string (e.g. "3.27245083382242540000").
  // Returns 0 when the shape is not recognized so the caller falls back.
  func parseRate(body : Text) : Nat {
    // Split on the double-quote character; the quoted rate token is the one
    // that parses as a decimal number. The timestamp is unquoted, so it is
    // never a candidate.
    let tokens = body.split(#char '\"').toArray();
    var rate : Nat = 0;
    for (tok in tokens.vals()) {
      if (rate == 0 and tok.size() > 0 and tok.contains(#char '.')) {
        rate := decimalToScaled(tok);
      };
    };
    rate
  };

  // Converts a decimal string like "3.27245083382242540000" to a Nat scaled by
  // RATE_SCALE (1e8), truncating beyond 8 fractional digits. Returns 0 when
  // the string is not a valid non-negative decimal.
  func decimalToScaled(s : Text) : Nat {
    let dotParts = s.split(#char '.');
    let segs = dotParts.toArray();
    if (segs.size() == 0 or segs.size() > 2) { return 0 };
    let wholeText = segs[0];
    let fracText = if (segs.size() == 2) { segs[1] } else { "" };
    let whole = switch (Nat.fromText(wholeText)) {
      case (?n) { n };
      case (null) { return 0 };
    };
    // Pad/truncate the fractional part to exactly 8 digits.
    let fracChars = fracText.toIter().toArray();
    var frac : Nat = 0;
    var i = 0;
    while (i < 8) {
      let digit : Nat = if (i < fracChars.size()) {
        switch (Nat.fromText(fracChars[i].toText())) {
          case (?d) { d };
          case (null) { return 0 };
        }
      } else { 0 };
      frac := frac * 10 + digit;
      i += 1;
    };
    whole * PurchaseLib.RATE_SCALE + frac
  };

  // Resolves the effective rate for a quote: admin override wins, otherwise
  // the live rate, otherwise the fallback. Returns (rate, isOverride).
  func resolveRate() : async (Nat, Bool) {
    switch (paymentConfig.rateOverride) {
      case (?r) { (r, true) };
      case (null) {
        let live = await fetchLiveRate();
        PurchaseLib.effectiveRate(paymentConfig, live)
      };
    }
  };

  // Returns the USD price, admin payment address, derived ICP amount (e8s),
  // and the rate used for a specific listed NFT. This is an update call (not a
  // query) because it resolves the live ICP/USD rate via an HTTP outcall; the
  // returned amount is the exact amount the buyer must send.
  public shared func getPurchaseQuote(nftId : Nat) : async Result.Result<Types.PurchaseQuote, Text> {
    switch (NftLib.getNft(nftStore, nftId)) {
      case (null) { #err("NFT not found") };
      case (?nft) {
        if (nft.status != #active) {
          return #err("NFT is not available for purchase");
        };
        let priceUsd = switch (nft.priceUsd) {
          case (?p) { p };
          case (null) { return #err("NFT is not listed for sale") };
        };
        let (rate, isOverride) = await resolveRate();
        let expectedE8s = PurchaseLib.usdToE8s(priceUsd, rate);
        #ok({
          nftId;
          priceUsd;
          paymentAddress = paymentConfig.paymentAddress;
          expectedE8s;
          rateUsed = rate;
          rateIsOverride = isOverride;
        })
      };
    }
  };

  // Records a pending purchase for a specific NFT after the buyer submits the
  // transaction reference of their ICP transfer.
  public shared ({ caller }) func submitPurchase(nftId : Nat, txRef : Text) : async Result.Result<Types.Purchase, Text> {
    if (caller.isAnonymous()) {
      return #err("Must be authenticated to purchase");
    };
    let trimmedRef = txRef.trim(#text " \t\n\r");
    if (trimmedRef.size() == 0) {
      return #err("Transaction reference is required");
    };
    switch (NftLib.getNft(nftStore, nftId)) {
      case (null) { #err("NFT not found") };
      case (?nft) {
        if (nft.status != #active) {
          return #err("NFT is not available for purchase");
        };
        if (Principal.equal(nft.ownerId, caller)) {
          return #err("You already own this NFT");
        };
        let priceUsd = switch (nft.priceUsd) {
          case (?p) { p };
          case (null) { return #err("NFT is not listed for sale") };
        };
        if (paymentConfig.paymentAddress == "") {
          return #err("Payment address is not configured");
        };
        let (rate, _) = await resolveRate();
        let expectedE8s = PurchaseLib.usdToE8s(priceUsd, rate);
        let timestamp = Int.abs(Time.now());
        let purchase = PurchaseLib.submitPurchase(
          purchaseStore, nftId, caller, nft.ownerId, priceUsd, expectedE8s, rate, trimmedRef, timestamp,
        );
        #ok(purchase)
      };
    }
  };

  // Verifies a pending purchase against the ICP ledger canister: matches the
  // expected amount and transaction reference against the admin principal, and
  // marks the purchase confirmed on success.
  //
  // [REPLAY-GUARD] Contract for the develop pass:
  //   1. Parse the purchase's txRef into a ledger block index. A non-numeric
  //      reference fails the purchase (never consumes a block index).
  //   2. If the block index is already consumed by ANOTHER purchase, reject
  //      BEFORE settlement (replay) — do not settle, do not confirm.
  //   3. Verify against the ledger. Only on #confirmed, atomically consume the
  //      block index for THIS purchase id, then settle via markNftSold (which
  //      re-checks ownerId == seller at write time and refuses otherwise).
  //   4. Settlement is idempotent: an already-#confirmed purchase returns its
  //      record unchanged without re-consuming or re-settling.
  //   5. If settlement fails after consuming, release the block index so the
  //      buyer's payment is not permanently burned.
  public shared ({ caller }) func verifyPurchase(purchaseId : Text) : async Result.Result<Types.Purchase, Text> {
    if (caller.isAnonymous()) {
      return #err("Must be authenticated to verify a purchase");
    };
    let purchase = switch (PurchaseLib.getPurchase(purchaseStore, purchaseId)) {
      case (?p) { p };
      case (null) { return #err("Purchase not found") };
    };
    if (not Principal.equal(purchase.buyer, caller)) {
      return #err("Unauthorized: Not the buyer");
    };
    if (purchase.status == #confirmed) {
      return #ok(purchase);
    };
    // [REPLAY-GUARD] The buyer's txRef must resolve to a ledger block index.
    // A non-numeric reference can never be matched against a block, so fail it
    // explicitly and never consume anything.
    let blockIndex = switch (PurchaseLib.parseBlockIndex(purchase.txRef)) {
      case (?n) { n };
      case (null) {
        return switch (PurchaseLib.markFailed(purchaseStore, purchaseId, "Transaction reference must be a ledger block index")) {
          case (?p) { #ok(p) };
          case (null) { #err("Purchase not found") };
        };
      };
    };
    // [REPLAY-GUARD] Reject a block index already consumed by ANOTHER purchase
    // BEFORE any settlement. This is the replay protection: one ledger block
    // index settles at most one purchase.
    switch (PurchaseLib.consumeBlockIndex(consumedBlockIndexStore, blockIndex, purchaseId)) {
      case (#alreadyConsumed(otherId)) {
        return switch (PurchaseLib.markFailed(purchaseStore, purchaseId, "Transaction reference already used by purchase " # otherId)) {
          case (?p) { #ok(p) };
          case (null) { #err("Purchase not found") };
        };
      };
      case (#consumed) {};
    };
    let ledger : PurchaseLib.Ledger = actor (PurchaseLib.ICP_LEDGER_CANISTER_ID);
    let outcome = await PurchaseLib.verifyAgainstLedger(ledger, paymentConfig, purchase.expectedE8s, purchase.txRef);
    switch (outcome) {
      case (#confirmed) {
        let timestamp = Int.abs(Time.now());
        // [PURCHASE] Settle the sale: transfer ownership from the seller to the
        // buyer and clear the listing price so the NFT leaves every listing
        // surface. The owner index is moved in lockstep so owner-scoped
        // listings reflect the new owner immediately. This runs BEFORE
        // markConfirmed so a settlement failure leaves the purchase pending
        // (retryable) rather than confirmed-but-unsettled.
        switch (NftLib.markNftSold(nftStore, purchase.nftId, purchase.seller, purchase.buyer, timestamp)) {
          case (null) {
            // The NFT is missing or no longer owned by the recorded seller
            // (e.g. a concurrent transfer). Release the block index so the
            // buyer's payment is not permanently burned, then fail the
            // purchase with a clear reason instead of confirming an unsettled
            // sale.
            PurchaseLib.releaseBlockIndex(consumedBlockIndexStore, blockIndex, purchaseId);
            switch (PurchaseLib.markFailed(purchaseStore, purchaseId, "NFT is no longer available from the recorded seller")) {
              case (?p) { #ok(p) };
              case (null) { #err("Purchase not found") };
            }
          };
          case (?_) {
            NftLib.moveOwnerIndex(ownerIndex, purchase.seller, purchase.buyer, purchase.nftId);
            switch (PurchaseLib.markConfirmed(purchaseStore, purchaseId, timestamp)) {
              case (?p) { #ok(p) };
              case (null) { #err("Purchase not found") };
            }
          };
        }
      };
      case (#pending) {
        // Not yet visible in the scanned ledger window — release the block
        // index so a later retry can re-consume it, and leave the purchase
        // pending so the frontend can poll again.
        PurchaseLib.releaseBlockIndex(consumedBlockIndexStore, blockIndex, purchaseId);
        #ok(purchase)
      };
      case (#failed(reason)) {
        // Verification failed (unconfigured/invalid payment address). Release
        // the block index so a corrected retry is not blocked.
        PurchaseLib.releaseBlockIndex(consumedBlockIndexStore, blockIndex, purchaseId);
        switch (PurchaseLib.markFailed(purchaseStore, purchaseId, reason)) {
          case (?p) { #ok(p) };
          case (null) { #err("Purchase not found") };
        }
      };
    }
  };

  // Returns the caller's own purchases, newest first.
  public query ({ caller }) func listMyPurchases() : async [Types.Purchase] {
    if (caller.isAnonymous()) {
      return [];
    };
    PurchaseLib.listByBuyer(purchaseStore, caller)
  };

  // Admin-gated. Sets the admin payment address buyers send ICP to.
  public shared ({ caller }) func setPaymentAddress(address : Text) : async Result.Result<(), Text> {
    if (not Auth.isAdmin(caller, admins.value)) {
      return #err("Unauthorized: Admin only");
    };
    let trimmed = address.trim(#text " \t\n\r");
    if (trimmed.size() == 0) {
      return #err("Payment address is required");
    };
    try {
      ignore Principal.fromText(trimmed);
    } catch (_) {
      return #err("Payment address must be a valid principal");
    };
    paymentConfig.paymentAddress := trimmed;
    #ok()
  };

  // Admin-gated. Sets a manual ICP/USD rate override (scaled by RATE_SCALE)
  // that takes precedence over the live rate.
  public shared ({ caller }) func setRateOverride(rate : Nat) : async Result.Result<(), Text> {
    if (not Auth.isAdmin(caller, admins.value)) {
      return #err("Unauthorized: Admin only");
    };
    if (rate == 0) {
      return #err("Rate must be greater than zero");
    };
    paymentConfig.rateOverride := ?rate;
    #ok()
  };

  // Admin-gated. Clears the manual rate override so the live rate is used.
  public shared ({ caller }) func clearRateOverride() : async Result.Result<(), Text> {
    if (not Auth.isAdmin(caller, admins.value)) {
      return #err("Unauthorized: Admin only");
    };
    paymentConfig.rateOverride := null;
    #ok()
  };

  // Admin-gated. Returns the current payment configuration.
  public query ({ caller }) func getPaymentConfig() : async Result.Result<{ paymentAddress : Text; rateOverride : ?Nat }, Text> {
    if (not Auth.isAdmin(caller, admins.value)) {
      return #err("Unauthorized: Admin only");
    };
    #ok({ paymentAddress = paymentConfig.paymentAddress; rateOverride = paymentConfig.rateOverride })
  };
}
