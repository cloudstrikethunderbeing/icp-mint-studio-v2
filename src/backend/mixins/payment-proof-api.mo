import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Result "mo:core/Result";
import Map "mo:core/Map";
import Auth "../lib/auth";
import Common "../types/common";
import Types "../types/payment-proof";
import PaymentProofLib "../lib/payment-proof";
import UserLib "../lib/user";
import Queue "mo:core/Queue";
import NftLib "../lib/nft";
import Int "mo:core/Int";

mixin (
  paymentProofStore : PaymentProofLib.PaymentProofStore,
  userStore : UserLib.UserStore,
  globalAuditLog : Queue.Queue<Common.AuditEntry>,
  admins : { var value : [Principal] },
  // [H4] DEDICATED transient rate-limit store for submitPaymentProof, SEPARATE
  // from the shared rateLimitStore. The NFT mint rate-limiter shares
  // rateLimitStore and resets windowStart/count on every mint; if
  // submitPaymentProof used the same store, an attacker minting a single NFT
  // between proof submissions would reset the window and bypass the
  // 1-submission-per-60s limit. Transient (rebuilt empty on every restart) —
  // rate-limit state is not durable and does not need to survive upgrades, so
  // no migration is required and the actor's stable state shape is unchanged.
  paymentProofRateLimitStore : Map.Map<Principal, { var lastSubmitSec : Int }>,
) {
  // [H4] Validate txHash format: must be a hex string of exactly 64 chars
  // (ICP/ckBTC transaction hashes are 64 hex characters). Rejects anything
  // else — deny-by-default. Returns true iff the string matches
  // /^[a-fA-F0-9]{64}$/.
  func isValidTxHash(hash : Text) : Bool {
    if (hash.size() != 64) { return false };
    for (c in hash.toIter()) {
      let valid = switch (c) {
        case ('0') true; case ('1') true; case ('2') true; case ('3') true;
        case ('4') true; case ('5') true; case ('6') true; case ('7') true;
        case ('8') true; case ('9') true;
        case ('a') true; case ('b') true; case ('c') true;
        case ('d') true; case ('e') true; case ('f') true;
        case ('A') true; case ('B') true; case ('C') true;
        case ('D') true; case ('E') true; case ('F') true;
        case (_) false;
      };
      if (not valid) { return false };
    };
    true
  };

  public shared ({ caller }) func submitPaymentProof(
    txHash : Text,
    tierRequested : Text,
    networkType : Text,
  ) : async Result.Result<Text, Text> {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: Anonymous caller");
    };
    let trimmedTxHash = txHash.trim(#text " \t\n\r");
    if (trimmedTxHash.size() == 0) {
      return #err("Transaction hash is required");
    };
    // [H4] Strict txHash format validation: exactly 64 hex chars.
    if (not isValidTxHash(trimmedTxHash)) {
      return #err("Invalid transaction hash: must be exactly 64 hexadecimal characters");
    };
    if (not PaymentProofLib.isValidNetworkType(networkType)) {
      return #err("Invalid network type. Must be 'icp' or 'ckbtc'");
    };
    if (not PaymentProofLib.isValidStripeProductId(tierRequested)) {
      return #err("Invalid tier requested");
    };
    // [H4] Per-principal rate limit: 1 submission per 60 SECONDS per principal.
    // Uses the DEDICATED paymentProofRateLimitStore (NOT the shared
    // rateLimitStore) so the NFT mint limiter's window resets cannot
    // interfere. Compares elapsed in SECONDS (Time.now() / 1_000_000_000),
    // NOT nanoseconds.
    let nowNs : Int = Time.now();
    let nowSec : Int = nowNs / 1_000_000_000;
    let submitWindowSec : Int = 60;
    switch (paymentProofRateLimitStore.get(caller)) {
      case (null) {
        let entry = { var lastSubmitSec = nowSec };
        paymentProofRateLimitStore.add(caller, entry);
      };
      case (?entry) {
        let elapsed : Int = nowSec - entry.lastSubmitSec;
        if (elapsed < submitWindowSec) {
          return #err("Rate limit exceeded: please wait at least 60 seconds between payment proof submissions");
        };
        entry.lastSubmitSec := nowSec;
        paymentProofRateLimitStore.add(caller, entry);
      };
    };
    // [H4] Cap paymentProofStore growth: reject if the caller already has a
    // pending (unreviewed) proof. This prevents a single principal from
    // flooding the review queue with duplicate pending submissions. Deny-by-
    // default — the caller must wait for an admin to approve/reject the
    // existing pending proof before submitting a new one.
    let existingProofs = PaymentProofLib.listProofsByPrincipal(paymentProofStore, caller);
    var hasPending = false;
    for (p in existingProofs.vals()) {
      if (p.status == #pending) { hasPending := true };
    };
    if (hasPending) {
      return #err("You already have a pending payment proof. Wait for it to be reviewed before submitting another.");
    };
    let proofId = nowNs.toText() # "-" # caller.toText();
    let proof = PaymentProofLib.createProof(
      paymentProofStore,
      proofId,
      caller,
      trimmedTxHash,
      tierRequested,
      networkType,
      nowNs,
    );
    let auditEntry : Common.AuditEntry = {
      action = "PAYMENT_PROOF_SUBMITTED";
      caller;
      timestamp = Int.abs(nowNs);
      details = ?("Proof " # proofId # " submitted for tier " # tierRequested);
    };
    globalAuditLog.pushBack(auditEntry);
    if (globalAuditLog.size() > 500) {
      ignore globalAuditLog.popFront();
    };
    #ok(proofId)
  };

  public shared ({ caller }) func approvePaymentProof(
    proofId : Text,
  ) : async Result.Result<Text, Text> {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: Anonymous caller");
    };
    if (not Auth.isAdmin(caller, admins.value)) {
      return #err("Unauthorized: Admin only");
    };
    switch (PaymentProofLib.getProof(paymentProofStore, proofId)) {
      case (null) { return #err("Payment proof not found") };
      case (?proof) {
        if (proof.status != #pending) {
          return #err("Proof has already been processed");
        };
        switch (UserLib.assignTierByProductId(userStore, proof.principal, proof.tierRequested)) {
          case (#err(msg)) { return #err(msg) };
          case (#ok()) {};
        };
        let now = Time.now();
        ignore PaymentProofLib.updateProofStatus(
          paymentProofStore,
          proofId,
          #approved,
          ?now,
          ?caller,
          null,
        );
        let auditEntry : Common.AuditEntry = {
          action = "PAYMENT_PROOF_APPROVED";
          caller;
          timestamp = Int.abs(now);
          details = ?("Proof " # proofId # " approved for tier " # proof.tierRequested);
        };
        globalAuditLog.pushBack(auditEntry);
        if (globalAuditLog.size() > 500) {
          ignore globalAuditLog.popFront();
        };
        #ok("Payment proof approved and tier assigned")
      };
    }
  };

  public shared ({ caller }) func rejectPaymentProof(
    proofId : Text,
    reason : Text,
  ) : async Result.Result<Text, Text> {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: Anonymous caller");
    };
    if (not Auth.isAdmin(caller, admins.value)) {
      return #err("Unauthorized: Admin only");
    };
    switch (PaymentProofLib.getProof(paymentProofStore, proofId)) {
      case (null) { return #err("Payment proof not found") };
      case (?proof) {
        if (proof.status != #pending) {
          return #err("Proof has already been processed");
        };
        let now = Time.now();
        ignore PaymentProofLib.updateProofStatus(
          paymentProofStore,
          proofId,
          #rejected,
          ?now,
          ?caller,
          ?reason,
        );
        let auditEntry : Common.AuditEntry = {
          action = "PAYMENT_PROOF_REJECTED";
          caller;
          timestamp = Int.abs(now);
          details = ?("Proof " # proofId # " rejected: " # reason);
        };
        globalAuditLog.pushBack(auditEntry);
        if (globalAuditLog.size() > 500) {
          ignore globalAuditLog.popFront();
        };
        #ok("Payment proof rejected")
      };
    }
  };

  public query ({ caller }) func listPaymentProofs() : async [Types.PaymentProof] {
    if (caller.isAnonymous()) {
      return [];
    };
    if (not Auth.isAdmin(caller, admins.value)) {
      return [];
    };
    PaymentProofLib.listAllProofs(paymentProofStore)
  };

  public query ({ caller }) func getMyPaymentProofs() : async [Types.PaymentProof] {
    if (caller.isAnonymous()) {
      return [];
    };
    PaymentProofLib.listProofsByPrincipal(paymentProofStore, caller)
  };
}
