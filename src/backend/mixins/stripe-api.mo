import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import AccessControl "mo:caffeineai-authorization/access-control";
import StripeLib "../lib/stripe";
import Common "../types/common";
import Queue "mo:core/Queue";

mixin (
  accessControlState : AccessControl.AccessControlState,
  stripeConfigStore : StripeLib.StripeConfigStore,
  globalAuditLog : Queue.Queue<Common.AuditEntry>,
) {
  public query func isStripeConfigured() : async Bool {
    StripeLib.isConfigured(stripeConfigStore);
  };

  public shared ({ caller }) func setStripeConfiguration(secretKey : Text, publicKey : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can configure Stripe");
    };
    StripeLib.setConfig(stripeConfigStore, secretKey, publicKey);
    let timestamp = Int.abs(Time.now());
    let entry : Common.AuditEntry = {
      action = "STRIPE_UPDATE";
      caller;
      timestamp;
      details = ?("Stripe configuration updated");
    };
    globalAuditLog.pushBack(entry);
    if (globalAuditLog.size() > 500) {
      ignore globalAuditLog.popFront();
    };
  };

  public shared ({ caller }) func createCheckoutSession(_items : [{ name : Text; price : Nat }], _successUrl : Text, _cancelUrl : Text) : async Text {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous caller");
    };
    Runtime.trap("Stripe checkout not available");
  };

  public func getStripeSessionStatus(_sessionId : Text) : async { status : Text } {
    Runtime.trap("Stripe status check not available");
  };

  public query func getStripeStatus() : async { configured : Bool; mode : Text } {
    StripeLib.getStripeStatus(stripeConfigStore);
  };
}
