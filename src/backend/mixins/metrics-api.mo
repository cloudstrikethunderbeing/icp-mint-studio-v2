import Auth "../lib/auth";
import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Int "mo:core/Int";
import NftLib "../lib/nft";
import UserLib "../lib/user";
import ClaimLib "../lib/claim-link";
import ClaimTypes "../types/claim-link";
import MetricsLib "../lib/metrics";
import Types "../types/metrics";
import PaymentProofLib "../lib/payment-proof";
import Common "../types/common";
import Queue "mo:core/Queue";

mixin (
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
  backendBuildTimestamp : { var value : Nat },
  admins : { var value : [Principal] },
) {

  public query ({ caller }) func getTotalNfts() : async Nat {
    if (not Auth.isAdmin(caller, admins.value)) {
      return 0;
    };
    MetricsLib.getTotalNfts(nftStore)
  };

  public query ({ caller }) func getActiveNfts() : async Nat {
    if (not Auth.isAdmin(caller, admins.value)) {
      return 0;
    };
    MetricsLib.getActiveNfts(nftStore)
  };

  public query ({ caller }) func getClaimedNfts() : async Nat {
    if (not Auth.isAdmin(caller, admins.value)) {
      return 0;
    };
    MetricsLib.getClaimedNfts(nftStore)
  };

  public query ({ caller }) func getAvailableNfts() : async Nat {
    if (not Auth.isAdmin(caller, admins.value)) {
      return 0;
    };
    MetricsLib.getAvailableNfts(nftStore)
  };

  public query ({ caller }) func getTotalCollections() : async Nat {
    if (not Auth.isAdmin(caller, admins.value)) {
      return 0;
    };
    MetricsLib.getTotalCollections(collectionStore)
  };

  public query ({ caller }) func getTotalCreators() : async Nat {
    if (not Auth.isAdmin(caller, admins.value)) {
      return 0;
    };
    MetricsLib.getTotalCreators(nftStore)
  };

  public query ({ caller }) func getTotalClaims() : async Nat {
    if (not Auth.isAdmin(caller, admins.value)) {
      return 0;
    };
    MetricsLib.getTotalClaims(claimTokenStore)
  };

  public query ({ caller }) func getMetricsCanisterId() : async Text {
    if (not Auth.isAdmin(caller, admins.value)) {
      return "";
    };
    selfCanisterId.value
  };

  public query ({ caller }) func getBackendBuildTimestamp() : async Nat {
    if (not Auth.isAdmin(caller, admins.value)) {
      return 0;
    };
    backendBuildTimestamp.value
  };

  public query ({ caller }) func getStorageUsage() : async Nat {
    if (not Auth.isAdmin(caller, admins.value)) {
      return 0;
    };
    MetricsLib.getStorageUsage(
      nftStore, collectionStore, userStore, rateLimitStore,
      claimTokenStore, nftToClaimToken, creatorIndex,
      paymentProofStore, globalAuditLog,
    )
  };

  public query ({ caller }) func getHealthMetrics() : async Types.HealthMetrics {
    if (not Auth.isAdmin(caller, admins.value)) {
      return {
        totalNfts = 0;
        activeNfts = 0;
        claimedNfts = 0;
        availableNfts = 0;
        totalCollections = 0;
        totalCreators = 0;
        totalClaims = 0;
        canisterId = "";
        backendBuildTimestamp = 0;
        storageUsage = 0;
      };
    };
    MetricsLib.getAllMetrics(
      nftStore, collectionStore, userStore, rateLimitStore,
      claimTokenStore, nftToClaimToken, creatorIndex,
      paymentProofStore, globalAuditLog,
      selfCanisterId, backendBuildTimestamp.value,
    )
  };

  /// ADMIN-ONLY: per-NFT claim breakdown joined with the Nft store to include
  /// the title for the Health tab breakdown table. Returns an array of
  /// { nftId, title, claimedCount, supplyLimit } for every published NFT that
  /// has a ClaimToken. Exposes ONLY those four fields — no discountCode,
  /// membershipId, or other redacted fields. Rejects anonymous and non-admin
  /// callers (returns [] for non-admins, consistent with the other admin-only
  /// metrics queries in this mixin). Read-only; does not mutate any store.
  /// Existing getClaimStatus remains admin-only and unchanged.
  public query ({ caller }) func getNftClaimBreakdown() : async [ClaimTypes.NftClaimBreakdownEntry] {
    if (not Auth.isAdmin(caller, admins.value)) {
      return [];
    };
    ClaimLib.getNftClaimBreakdown(nftStore, claimTokenStore)
  };
}
