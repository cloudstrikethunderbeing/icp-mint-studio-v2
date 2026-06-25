module {
  public type HealthMetrics = {
    totalNfts : Nat;
    activeNfts : Nat;
    claimedNfts : Nat;
    availableNfts : Nat;
    totalCollections : Nat;
    totalCreators : Nat;
    totalClaims : Nat;
    canisterId : Text;
    backendBuildTimestamp : Nat;
    storageUsage : Nat;
  };
}
