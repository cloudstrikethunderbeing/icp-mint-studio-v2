import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import NftLib "../lib/nft";
import UserLib "../lib/user";
import ClaimLib "../lib/claim-link";
import Types "../types/metrics";
import NftTypes "../types/nft";
import PaymentProofLib "../lib/payment-proof";
import Queue "mo:core/Queue";
import Common "../types/common";

module {
  public func getTotalNfts(nftStore : NftLib.NftStore) : Nat {
    nftStore.size()
  };

  public func getActiveNfts(nftStore : NftLib.NftStore) : Nat {
    var count = 0;
    for ((_, nft) in nftStore.entries()) {
      if (nft.status != #burned and nft.claimedAt == null) {
        count += 1;
      };
    };
    count
  };

  public func getClaimedNfts(nftStore : NftLib.NftStore) : Nat {
    var count = 0;
    for ((_, nft) in nftStore.entries()) {
      if (nft.claimedAt != null) {
        count += 1;
      };
    };
    count
  };

  public func getAvailableNfts(nftStore : NftLib.NftStore) : Nat {
    var count = 0;
    for ((_, nft) in nftStore.entries()) {
      if (nft.status == #active and nft.claimedAt == null) {
        count += 1;
      };
    };
    count
  };

  public func getTotalCollections(collectionStore : NftLib.CollectionStore) : Nat {
    collectionStore.size()
  };

  public func getTotalCreators(nftStore : NftLib.NftStore) : Nat {
    let creators = Set.empty<Text>();
    for ((_, nft) in nftStore.entries()) {
      creators.add(nft.creatorId);
    };
    creators.size()
  };

  public func getTotalClaims(claimTokenStore : ClaimLib.ClaimTokenStore) : Nat {
    var count = 0;
    for ((_, token) in claimTokenStore.entries()) {
      count += token.claimedCount;
    };
    count
  };

  public func getStorageUsage(
    nftStore : NftLib.NftStore,
    collectionStore : NftLib.CollectionStore,
    userStore : UserLib.UserStore,
    rateLimitStore : Map.Map<Principal, { var count : Nat; var windowStart : Nat }>,
    claimTokenStore : ClaimLib.ClaimTokenStore,
    nftToClaimToken : ClaimLib.NftToClaimStore,
    creatorIndex : Map.Map<Text, List.List<Nat>>,
    paymentProofStore : PaymentProofLib.PaymentProofStore,
    globalAuditLog : Queue.Queue<Common.AuditEntry>,
  ) : Nat {
    nftStore.size()
    + collectionStore.size()
    + userStore.size()
    + rateLimitStore.size()
    + claimTokenStore.size()
    + nftToClaimToken.size()
    + creatorIndex.size()
    + paymentProofStore.size()
    + globalAuditLog.size()
  };

  public func getAllMetrics(
    nftStore : NftLib.NftStore,
    collectionStore : NftLib.CollectionStore,
    userStore : UserLib.UserStore,
    rateLimitStore : Map.Map<Principal, { var count : Nat; var windowStart : Nat }>,
    claimTokenStore : ClaimLib.ClaimTokenStore,
    nftToClaimToken : ClaimLib.NftToClaimStore,
    creatorIndex : Map.Map<Text, List.List<Nat>>,
    paymentProofStore : PaymentProofLib.PaymentProofStore,
    globalAuditLog : Queue.Queue<Common.AuditEntry>,
    selfCanisterId : { var value : Text },
    backendBuildTimestamp : Nat,
  ) : Types.HealthMetrics {
    {
      totalNfts = getTotalNfts(nftStore);
      activeNfts = getActiveNfts(nftStore);
      claimedNfts = getClaimedNfts(nftStore);
      availableNfts = getAvailableNfts(nftStore);
      totalCollections = getTotalCollections(collectionStore);
      totalCreators = getTotalCreators(nftStore);
      totalClaims = getTotalClaims(claimTokenStore);
      canisterId = selfCanisterId.value;
      backendBuildTimestamp = backendBuildTimestamp;
      storageUsage = getStorageUsage(
        nftStore, collectionStore, userStore, rateLimitStore,
        claimTokenStore, nftToClaimToken, creatorIndex,
        paymentProofStore, globalAuditLog,
      );
    }
  };
}
