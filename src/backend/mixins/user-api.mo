import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Text "mo:core/Text";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import Types "../types/user";
import UserLib "../lib/user";
import NftLib "../lib/nft";
import Iter "mo:core/Iter";
import Result "mo:core/Result";
import Debug "mo:core/Debug";
import Queue "mo:core/Queue";

mixin (
  accessControlState : AccessControl.AccessControlState,
  userStore : UserLib.UserStore,
  nftStore : NftLib.NftStore,
  globalAuditLog : Queue.Queue<Common.AuditEntry>,
  selfCanisterId : { var value : Text },
) {
  public query ({ caller }) func getCallerProfile() : async Types.UserProfile {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous caller");
    };
    switch (UserLib.getProfile(userStore, caller)) {
      case (?profile) { profile };
      case (null) {
        let timestamp = Int.abs(Time.now());
        let creatorId = NftLib.generateCreatorId(caller);
        UserLib.createProfile(userStore, caller, creatorId, timestamp);
      };
    };
  };

  public shared ({ caller }) func saveCallerProfile(profile : Types.UserProfile) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous caller");
    };
    if (not Principal.equal(profile.principalId, caller)) {
      Runtime.trap("Unauthorized: Cannot save profile for another user");
    };
    switch (UserLib.getProfile(userStore, caller)) {
      case (null) {
        Runtime.trap("Profile not found");
      };
      case (?existing) {
        let lockedProfile = {
          existing with
          oisyWalletAddress = profile.oisyWalletAddress;
          email = profile.email;
          emailAlerts = profile.emailAlerts;
        };
        UserLib.updateProfile(userStore, caller, lockedProfile);
      };
    };
  };

  public shared ({ caller }) func setOisyWalletAddress(address : Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous caller");
    };
    let trimmed = address.trim(#text " \t\n\r");
    let withoutPrefix = if (trimmed.startsWith(#text "0x") or trimmed.startsWith(#text "0X")) {
      trimmed.replace(#text "0x", "")
    } else {
      trimmed
    };
    let finalAddress = if (withoutPrefix.startsWith(#text "0X")) {
      withoutPrefix.replace(#text "0X", "")
    } else {
      withoutPrefix
    };
    if (finalAddress.size() != 64) {
      Runtime.trap("Invalid Oisy wallet address: must be 64 hex characters");
    };
    let chars = finalAddress.toIter().toArray();
    var i = 0;
    while (i < 64) {
      let valid = switch (Text.fromChar(chars[i])) {
        case ("0") true; case ("1") true; case ("2") true; case ("3") true;
        case ("4") true; case ("5") true; case ("6") true; case ("7") true;
        case ("8") true; case ("9") true; case ("a") true; case ("b") true;
        case ("c") true; case ("d") true; case ("e") true; case ("f") true;
        case ("A") true; case ("B") true; case ("C") true; case ("D") true;
        case ("E") true; case ("F") true;
        case (_) false;
      };
      if (not valid) {
        Runtime.trap("Invalid Oisy wallet address: must be hex characters only");
      };
      i += 1;
    };
    UserLib.setOisyWallet(userStore, caller, finalAddress);
  };

  public shared ({ caller }) func setEmail(email : Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous caller");
    };
    if (not isValidEmail(email)) {
      Runtime.trap("Invalid email format");
    };
    UserLib.setEmail(userStore, caller, email);
  };

  public shared ({ caller }) func setEmailAlerts(alerts : [Common.AlertType]) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous caller");
    };
    UserLib.setEmailAlerts(userStore, caller, alerts);
  };

  public query ({ caller }) func getCreditsStatus() : async { used : Nat; total : Nat; remaining : Nat } {
    if (caller.isAnonymous()) {
      return { used = 0; total = 0; remaining = 0 };
    };
    switch (UserLib.getProfile(userStore, caller)) {
      case (null) {
        { used = 0; total = 0; remaining = 0 };
      };
      case (?profile) {
        let remaining = if (profile.creditsUsed >= profile.creditsTotal) {
          0
        } else {
          Nat.sub(profile.creditsTotal, profile.creditsUsed)
        };
        { used = profile.creditsUsed; total = profile.creditsTotal; remaining };
      };
    };
  };

  public query ({ caller }) func getSlotsStatus() : async { used : Nat; total : Nat; remaining : Nat } {
    if (caller.isAnonymous()) {
      return { used = 0; total = 0; remaining = 0 };
    };
    UserLib.getSlotsStatus(userStore, nftStore, caller);
  };

  public query ({ caller }) func getTotalMinted() : async Nat {
    if (caller.isAnonymous()) {
      return 0;
    };
    // Total = all NFTs ever minted by this user (active + deleted + burned)
    NftLib.listNftsByOwner(nftStore, caller, selfCanisterId.value).size()
  };

  public shared ({ caller }) func setUserStripeProductId(userPrincipal : Principal, productId : Text) : async Result.Result<(), Text> {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: Anonymous caller");
    };
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    let valid = switch (productId) {
      case ("prod_UgpwDUBgXdz0K5") true;
      case ("prod_UgpxVvHHogE6Qx") true;
      case ("prod_UgpyBkj4HK4A9V") true;
      case ("prod_Ugpy3x4LuFPxzf") true;
      case (_) false;
    };
    if (not valid) {
      return #err("Invalid Stripe product ID");
    };
    switch (UserLib.assignTierByProductId(userStore, userPrincipal, productId)) {
      case (#err(msg)) { return #err(msg) };
      case (#ok()) {
        let timestamp = Int.abs(Time.now());
        let entry : Common.AuditEntry = {
          action = "STRIPE_PRODUCT_SET";
          caller;
          timestamp;
          details = ?("Set product " # productId # " for user " # userPrincipal.toText());
        };
        globalAuditLog.pushBack(entry);
        if (globalAuditLog.size() > 500) {
          ignore globalAuditLog.popFront();
        };
        #ok()
      };
    };
  };

  public shared ({ caller }) func sendVerificationEmail(email : Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous caller");
    };
    if (not isValidEmail(email)) {
      Runtime.trap("Invalid email format");
    };
    // Email verification disabled — email stored without verification
    UserLib.setEmail(userStore, caller, email);
  };

  public shared ({ caller }) func createSlot() : async Result.Result<Nat, Text> {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: Anonymous caller");
    };
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    UserLib.createSlot(userStore, caller, isAdmin)
  };

  func isValidEmail(email : Text) : Bool {
    let trimmed = email.trim(#text " \t\n\r");
    if (trimmed.size() == 0) {
      return false;
    };
    let hasAt = trimmed.contains(#char '@');
    let hasDot = trimmed.contains(#char '.');
    if (not hasAt or not hasDot) { return false };
    let chars = trimmed.toIter().toArray();
    let size = chars.size();
    if (size < 5) { return false };
    var atPos = 0;
    var dotPos = 0;
    var i = 0;
    while (i < size) {
      if (chars[i] == '@') { atPos := i };
      if (chars[i] == '.') { dotPos := i };
      i += 1;
    };
    atPos > 0 and dotPos > atPos + 1 and dotPos < Nat.sub(size, 1);
  };
}
