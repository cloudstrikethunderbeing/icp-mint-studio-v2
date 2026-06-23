import Map "mo:core/Map";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Common "../types/common";
import Types "../types/payment-proof";
import List "mo:core/List";

module {
  public type PaymentProofStore = Map.Map<Text, Types.PaymentProof>;

  public func initStore() : PaymentProofStore {
    Map.empty<Text, Types.PaymentProof>()
  };

  public func createProof(
    store : PaymentProofStore,
    id : Text,
    caller : Principal,
    txHash : Text,
    tierRequested : Text,
    networkType : Text,
    timestamp : Int,
  ) : Types.PaymentProof {
    let proof : Types.PaymentProof = {
      id;
      principal = caller;
      txHash;
      tierRequested;
      networkType;
      status = #pending;
      submittedAt = timestamp;
      reviewedAt = null;
      reviewedBy = null;
      rejectionReason = null;
    };
    store.add(id, proof);
    proof
  };

  public func getProof(store : PaymentProofStore, id : Text) : ?Types.PaymentProof {
    store.get(id)
  };

  public func updateProofStatus(
    store : PaymentProofStore,
    id : Text,
    status : Types.PaymentProofStatus,
    reviewedAt : ?Int,
    reviewedBy : ?Principal,
    rejectionReason : ?Text,
  ) : ?Types.PaymentProof {
    switch (store.get(id)) {
      case (null) { null };
      case (?proof) {
        let updated = {
          proof with
          status;
          reviewedAt;
          reviewedBy;
          rejectionReason;
        };
        store.add(id, updated);
        ?updated
      };
    }
  };

  public func listAllProofs(store : PaymentProofStore) : [Types.PaymentProof] {
    let proofs = List.empty<Types.PaymentProof>();
    for ((_, proof) in store.entries()) {
      proofs.add(proof);
    };
    proofs.toArray()
  };

  public func listProofsByPrincipal(store : PaymentProofStore, principal : Principal) : [Types.PaymentProof] {
    let proofs = List.empty<Types.PaymentProof>();
    for ((_, proof) in store.entries()) {
      if (Principal.equal(proof.principal, principal)) {
        proofs.add(proof);
      };
    };
    proofs.toArray()
  };

  public func isValidStripeProductId(productId : Text) : Bool {
    switch (productId) {
      case ("prod_UgpwDUBgXdz0K5") true;
      case ("prod_UgpxVvHHogE6Qx") true;
      case ("prod_UgpyBkj4HK4A9V") true;
      case ("prod_Ugpy3x4LuFPxzf") true;
      case (_) false;
    }
  };

  public func isValidNetworkType(networkType : Text) : Bool {
    let lower = networkType.toLower();
    lower == "icp" or lower == "ckbtc"
  };
}
