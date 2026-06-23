import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Result "mo:core/Result";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import Types "../types/payment-proof";
import PaymentProofLib "../lib/payment-proof";
import UserLib "../lib/user";
import Queue "mo:core/Queue";
import NftLib "../lib/nft";

mixin (
  accessControlState : AccessControl.AccessControlState,
  paymentProofStore : PaymentProofLib.PaymentProofStore,
  userStore : UserLib.UserStore,
  globalAuditLog : Queue.Queue<Common.AuditEntry>,
  adminPrincipal : ?Principal,
) {
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
    if (not PaymentProofLib.isValidNetworkType(networkType)) {
      return #err("Invalid network type. Must be 'icp' or 'ckbtc'");
    };
    if (not PaymentProofLib.isValidStripeProductId(tierRequested)) {
      return #err("Invalid tier requested");
    };
    let timestamp = Time.now();
    let proofId = timestamp.toText() # "-" # caller.toText();
    let proof = PaymentProofLib.createProof(
      paymentProofStore,
      proofId,
      caller,
      trimmedTxHash,
      tierRequested,
      networkType,
      timestamp,
    );
    let auditEntry : Common.AuditEntry = {
      action = "PAYMENT_PROOF_SUBMITTED";
      caller;
      timestamp = Int.abs(timestamp);
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
    if (not AccessControl.isAdmin(accessControlState, caller)) {
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
    if (not AccessControl.isAdmin(accessControlState, caller)) {
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
    if (not AccessControl.isAdmin(accessControlState, caller)) {
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
