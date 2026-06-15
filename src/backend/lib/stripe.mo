import Text "mo:core/Text";

module {
  public type StripeConfigStore = {
    var secretKey : ?Text;
    var publicKey : ?Text;
  };

  public func initConfigStore() : StripeConfigStore {
    { var secretKey = null; var publicKey = null }
  };

  public func setConfig(store : StripeConfigStore, secretKey : Text, publicKey : Text) : () {
    store.secretKey := ?secretKey;
    store.publicKey := ?publicKey;
  };

  public func getConfig(store : StripeConfigStore) : { secretKey : ?Text; publicKey : ?Text } {
    { secretKey = store.secretKey; publicKey = store.publicKey }
  };

  public func isConfigured(store : StripeConfigStore) : Bool {
    store.secretKey != null
  };

  public func getStripeStatus(store : StripeConfigStore) : { configured : Bool; mode : Text } {
    switch (store.secretKey) {
      case (null) { { configured = false; mode = "unknown" } };
      case (?key) {
        let mode = if (key.startsWith(#text "sk_test_")) {
          "test"
        } else if (key.startsWith(#text "sk_live_")) {
          "live"
        } else {
          "unknown"
        };
        { configured = true; mode }
      };
    }
  };
};
