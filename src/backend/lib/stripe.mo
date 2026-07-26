import Text "mo:core/Text";

module {
  // [C1] On-chain Stripe config holds NO secret. The raw Stripe secret key
  // (sk_live_* / sk_test_*) is NEVER stored on-chain — not in this store, not
  // in any stable variable, not in any field. The canister does not make
  // direct Stripe API calls; it only stores config for the frontend to use via
  // an off-chain relay/KMS. The secret key lives OFF-CHAIN (in the relay/KMS)
  // and is referenced by an opaque handle that is also NOT stored here —
  // adding a handle later would still not persist the raw key.
  //
  // This store keeps only:
  //   - mode          : ?Text  — "test" or "live" (admin-set, admin-only read)
  //   - publishableKey: ?Text  — the Stripe publishable key (pk_live_* /
  //                              pk_test_*), which is SAFE to expose to the
  //                              frontend and to anonymous callers via
  //                              isStripeConfigured() (which returns only a
  //                              Bool, never the key itself).
  public type StripeConfigStore = {
    var mode : ?Text;
    var publishableKey : ?Text;
  };

  public func initConfigStore() : StripeConfigStore {
    { var mode = null; var publishableKey = null }
  };

  // [C1] setConfig persists ONLY mode + publishableKey. The raw secret key is
  // NOT accepted and NOT stored. Callers must never pass a secret key here;
  // the signature intentionally has no secretKey parameter.
  public func setConfig(store : StripeConfigStore, mode : Text, publishableKey : Text) : () {
    store.mode := ?mode;
    store.publishableKey := ?publishableKey;
  };

  // [C2] Internal getter — returns mode + publishableKey. This is intended
  // for ADMIN-ONLY consumption (getStripeStatus is admin-gated in the mixin).
  // Anonymous callers must NEVER reach this. The public anonymous-safe
  // surface is isConfigured() (returns Bool) and isStripeConfigured() in the
  // mixin (also returns Bool).
  public func getConfig(store : StripeConfigStore) : { mode : ?Text; publishableKey : ?Text } {
    { mode = store.mode; publishableKey = store.publishableKey }
  };

  // Anonymous-safe: returns only whether a publishableKey is set. Never
  // reveals the key, the mode, or any secret.
  public func isConfigured(store : StripeConfigStore) : Bool {
    store.publishableKey != null
  };

  // [C2] Admin-only status. Returns the configured mode ("test"/"live") and
  // whether a publishableKey is set. NEVER returns any secret (there is none
  // on-chain to return). The mixin gates this behind Auth.isAdmin.
  public func getStripeStatus(store : StripeConfigStore) : { configured : Bool; mode : Text } {
    switch (store.mode) {
      case (null) { { configured = false; mode = "unknown" } };
      case (?m) { { configured = store.publishableKey != null; mode = m } };
    }
  };
};
