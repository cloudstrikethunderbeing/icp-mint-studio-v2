import Common "common";

module {
  public type PaymentProofStatus = {
    #pending;
    #approved;
    #rejected;
  };

  public type PaymentProof = {
    id : Text;
    principal : Principal;
    txHash : Text;
    tierRequested : Text;
    networkType : Text;
    status : PaymentProofStatus;
    submittedAt : Int;
    reviewedAt : ?Int;
    reviewedBy : ?Principal;
    rejectionReason : ?Text;
  };
}
