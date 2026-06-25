import Map "mo:core/Map";
import _Set "mo:core/Set";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import _Common "types/common";
import NftTypes "types/nft";
import _UserTypes "types/user";
import NftLib "lib/nft";
import UserLib "lib/user";

import NftMixin "mixins/nft-api";
import UserMixin "mixins/user-api";

import _Runtime "mo:core/Runtime";


import Principal "mo:core/Principal";
import StripeMixin "mixins/stripe-api";
import List "mo:core/List";
import Queue "mo:core/Queue";
import _PaymentProofTypes "types/payment-proof";
import PaymentProofLib "lib/payment-proof";
import PaymentProofMixin "mixins/payment-proof-api";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Result "mo:core/Result";
import _ClaimTypes "types/claim-link";
import ClaimLinkLib "lib/claim-link";
import ClaimLinkMixin "mixins/claim-link-api";
import CollectionMixin "mixins/collections-api";
import Array "mo:core/Array";
import MetricsMixin "mixins/metrics-api";
import _MetricsLib "lib/metrics";
import Time "mo:core/Time";
import Auth "lib/auth";

actor Main {
  let nftStore : NftLib.NftStore;
  let collectionStore : NftLib.CollectionStore;
  let userStore : UserLib.UserStore;


  let nextNftId : { var value : Nat };
  let nextCollectionId : { var value : Nat };
  let selfCanisterId : { var value : Text };
  let rateLimitStore : Map.Map<Principal, {var count : Nat; var windowStart : Nat}>;
  let stripeConfigStore : { var secretKey : ?Text; var publicKey : ?Text };
  let verifiedEmails : { verifiedEmails : _Set.Set<Text> };
  let lastMintTime : { var value : Int };
  let mintCount : { var value : Nat };
  let paymentProofStore : PaymentProofLib.PaymentProofStore;
  let globalAuditLog : Queue.Queue<_Common.AuditEntry>;
  let creatorIndex : Map.Map<Text, List.List<Nat>>;
  let claimTokenStore : ClaimLinkLib.ClaimTokenStore;
  let backendBuildTimestamp : { var value : Nat };
  let nftToClaimToken : ClaimLinkLib.NftToClaimStore;
  let adminPrincipals : [Principal];

  // selfCanisterId is initialized in postupgrade() for both fresh installs and upgrades
  // because Principal.fromActor is non-static and not allowed in the actor body with --enhanced-migration.

  system func postupgrade() {
    backendBuildTimestamp.value := Int.abs(Time.now());
    selfCanisterId.value := Principal.fromActor(Main).toText();
  };

  include ClaimLinkMixin(nftStore, claimTokenStore, nftToClaimToken, globalAuditLog, userStore, nextNftId, selfCanisterId, adminPrincipals);

  include MixinObjectStorage();

  include MixinViews();

  include NftMixin(nftStore, collectionStore, nextNftId, nextCollectionId, rateLimitStore, userStore, selfCanisterId, creatorIndex, claimTokenStore, nftToClaimToken, adminPrincipals);
  include UserMixin(userStore, nftStore, globalAuditLog, selfCanisterId, adminPrincipals);
  include PaymentProofMixin(paymentProofStore, userStore, globalAuditLog, adminPrincipals);
  include StripeMixin(stripeConfigStore, globalAuditLog, adminPrincipals);
  include CollectionMixin(collectionStore, nftStore);
  include MetricsMixin(nftStore, collectionStore, userStore, rateLimitStore, claimTokenStore, nftToClaimToken, creatorIndex, paymentProofStore, globalAuditLog, selfCanisterId, backendBuildTimestamp, adminPrincipals);


  public shared query ({ caller }) func isAdmin() : async Bool {
    Auth.isAdmin(caller, adminPrincipals)
  };

  public shared ({ caller }) func claimAdmin() : async Bool {
    // Admin is determined by hardcoded list only.
    // Dynamic claiming is disabled.
    false
  };

  public query func hasAdmin() : async Bool {
    adminPrincipals.size() > 0
  };

  public query func getCanisterId() : async Text {
    let canisterId = Principal.fromActor(Main).toText();
    if (canisterId == "") {
      selfCanisterId.value
    } else {
      canisterId
    }
  };

  public query func getCanisterIdSafe() : async Text {
    let canisterId = Principal.fromActor(Main).toText();
    if (canisterId == "") {
      selfCanisterId.value
    } else {
      canisterId
    }
  };

  // computeNftUniqueId is defined in the NftMixin

  // These public query wrappers resolve the real canisterId using
  // Principal.fromActor(Main) — available in actor scope but not in mixin files.
  // The mixin provides non-public internal helpers that accept canisterId as a param.

  public query func verifyNftPublic(nftUniqueId : Text) : async Result.Result<NftTypes.VerifyResult, Text> {
    verifyNftPublicInternal(nftUniqueId, Principal.fromActor(Main).toText())
  };

  public query func verifyNftByCreatorId(creatorId : Text) : async Result.Result<[NftTypes.VerifyResult], Text> {
    verifyNftByCreatorIdInternal(creatorId, Principal.fromActor(Main).toText())
  };

  public query ({ caller }) func verifyNftByCreatorIdWithHistory(creatorId : Text) : async Result.Result<[NftTypes.VerifyResult], Text> {
    if (not Auth.isAdmin(caller, adminPrincipals)) {
      return #err("Unauthorized: Admin only");
    };
    verifyNftByCreatorIdWithHistoryInternal(creatorId, Principal.fromActor(Main).toText())
  };

  // Collection NFT assignment endpoints are included via CollectionMixin

  public query ({ caller }) func debugAuth() : async Text {
    "caller=" # caller.toText()
    # " | adminCount=" # adminPrincipals.size().toText()
    # " | isAdmin=" # debug_show(Auth.isAdmin(caller, adminPrincipals))
  };

};
