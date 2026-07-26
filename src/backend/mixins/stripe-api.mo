import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Auth "../lib/auth";
import StripeLib "../lib/stripe";
import Common "../types/common";
import Queue "mo:core/Queue";
import Int "mo:core/Int";

mixin (
  stripeConfigStore : StripeLib.StripeConfigStore,
  globalAuditLog : Queue.Queue<Common.AuditEntry>,
  admins : { var value : [Principal] },
) {
  // [C2] Anonymous-safe: returns ONLY a boolean indicating whether a
  // publishableKey is set. Never reveals the mode (test/live), never reveals
  // any key, never reveals any secret. Safe for unauthenticated callers.
  public query func isStripeConfigured() : async Bool {
    StripeLib.isConfigured(stripeConfigStore);
  };

  // [C1] Admin-only. Persists ONLY mode + publishableKey. The raw Stripe
  // secret key is NOT accepted and NOT stored on-chain — see lib/stripe.mo.
  // The signature intentionally has no secretKey parameter.
  public shared ({ caller }) func setStripeConfiguration(mode : Text, publishableKey : Text) : async () {
    if (not Auth.isAdmin(caller, admins.value)) {
      Runtime.trap("Unauthorized: Only admins can configure Stripe");
    };
    // Validate mode is one of the allowed values; reject anything else
    // (deny-by-default).
    let sanitizedMode = if (mode == "test" or mode == "live") { mode } else {
      Runtime.trap("Invalid mode: must be 'test' or 'live'");
    };
    StripeLib.setConfig(stripeConfigStore, sanitizedMode, publishableKey);
    let timestamp = Int.abs(Time.now());
    let entry : Common.AuditEntry = {
      action = "STRIPE_UPDATE";
      caller;
      timestamp;
      details = ?("Stripe configuration updated (mode=" # sanitizedMode # ")");
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

  public shared ({ caller }) func getStripeSessionStatus(_sessionId : Text) : async { status : Text } {
    Runtime.trap("Stripe status check not available");
  };

  // [C2] Admin-ONLY. Returns the configured mode (test/live) and whether a
  // publishableKey is set. Anonymous callers must NEVER learn the mode — it
  // leaks whether the canister is in test or live mode, which is sensitive
  // business configuration. Gated behind Auth.isAdmin; non-admins trap.
  // Never returns any secret (there is none on-chain to return).
  public query ({ caller }) func getStripeStatus() : async { configured : Bool; mode : Text } {
    if (not Auth.isAdmin(caller, admins.value)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    StripeLib.getStripeStatus(stripeConfigStore);
  };
}
