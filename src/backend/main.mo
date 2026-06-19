import Map "mo:core/Map";
import _Set "mo:core/Set";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import _Common "types/common";
import NftTypes "types/nft";
import _UserTypes "types/user";
import NftLib "lib/nft";
import UserLib "lib/user";

import NftMixin "mixins/nft-api";
import UserMixin "mixins/user-api";

import Runtime "mo:core/Runtime";


import Principal "mo:core/Principal";
import StripeMixin "mixins/stripe-api";
import List "mo:core/List";
import Queue "mo:core/Queue";
import _PaymentProofTypes "types/payment-proof";
import PaymentProofLib "lib/payment-proof";
import PaymentProofMixin "mixins/payment-proof-api";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Result "mo:core/Result";
import _ClaimTypes "types/claim-link";
import ClaimLinkLib "lib/claim-link";
import ClaimLinkMixin "mixins/claim-link-api";
import CollectionMixin "mixins/collections-api";

actor Main {
  let accessControlState : AccessControl.AccessControlState;
  let nftStore : NftLib.NftStore;
  let collectionStore : NftLib.CollectionStore;
  let userStore : UserLib.UserStore;


  let nextNftId : { var value : Nat };
  let nextCollectionId : { var value : Nat };
  stable var adminPrincipal : ?Principal;
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
  let nftToClaimToken : ClaimLinkLib.NftToClaimStore;


  include ClaimLinkMixin(accessControlState, nftStore, claimTokenStore, nftToClaimToken, globalAuditLog, userStore);
  include MixinAuthorization(accessControlState, null);
  include MixinObjectStorage();

  include MixinViews();

  include NftMixin(accessControlState, nftStore, collectionStore, nextNftId, nextCollectionId, rateLimitStore, userStore, selfCanisterId, creatorIndex, claimTokenStore, nftToClaimToken, adminPrincipal);
  include UserMixin(accessControlState, userStore, nftStore, globalAuditLog, selfCanisterId, { var value = adminPrincipal });
  include PaymentProofMixin(accessControlState, paymentProofStore, userStore, globalAuditLog, adminPrincipal);
  include StripeMixin(accessControlState, stripeConfigStore, globalAuditLog);
  include CollectionMixin(accessControlState, collectionStore, nftStore);


  public query func getAdminPrincipal() : async ?Principal {
    adminPrincipal
  };

  public query ({ caller }) func isAdmin() : async Bool {
    switch (adminPrincipal) {
      case (?admin) { Principal.equal(admin, caller) };
      case (null) { false };
    }
  };

  public query ({ caller }) func debugAdminState() : async {
    caller : Text;
    accessControlIsAdmin : Bool;
    adminPrincipalValue : ?Text;
    adminPrincipalMatchesCaller : Bool;
  } {
    let acIsAdmin = AccessControl.isAdmin(accessControlState, caller);
    let adminPrincipalMatch = switch (adminPrincipal) {
      case (?admin) { Principal.equal(admin, caller) };
      case (null) { false };
    };
    {
      caller = caller.toText();
      accessControlIsAdmin = acIsAdmin;
      adminPrincipalValue = switch (adminPrincipal) {
        case (?p) ?p.toText();
        case (null) null;
      };
      adminPrincipalMatchesCaller = adminPrincipalMatch;
    }
  };

  public shared ({ caller }) func forceResyncAdmin() : async () {
    switch (adminPrincipal) {
      case (?p) {
        accessControlState.userRoles.add(p, #admin);
        accessControlState.adminAssigned := true;
      };
      case null {};
    };
  };

  public shared ({ caller }) func claimAdmin() : async Bool {
    switch (adminPrincipal) {
      case (?_) { false };
      case (null) {
        adminPrincipal := ?caller;
        // Sync admin into AccessControl state — make AccessControl canonical
        accessControlState.userRoles.add(caller, #admin);
        accessControlState.adminAssigned := true;
        // Update caller's profile to set role = #admin, keep tier = #free
        let profile = switch (UserLib.getProfile(userStore, caller)) {
          case (?p) { p };
          case (null) {
            let timestamp = Int.abs(Time.now());
            let creatorId = NftLib.generateCreatorId(caller);
            UserLib.createProfile(userStore, caller, creatorId, timestamp)
          };
        };
        let updated = { profile with role = #admin; updatedAt = Int.abs(Time.now()) };
        UserLib.updateProfile(userStore, caller, updated);
        true
      };
    }
  };

  public query func hasAdmin() : async Bool {
    switch (adminPrincipal) {
      case (?_) { true };
      case (null) { false };
    }
  };

  public query func getCanisterId() : async Text {
    Principal.fromActor(Main).toText()
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
    switch (adminPrincipal) {
      case (null) { return #err("Unauthorized: Admin only") };
      case (?admin) {
        if (not Principal.equal(caller, admin)) {
          return #err("Unauthorized: Admin only");
        };
      };
    };
    verifyNftByCreatorIdWithHistoryInternal(creatorId, Principal.fromActor(Main).toText())
  };

  // Collection NFT assignment endpoints are included via CollectionMixin

};
