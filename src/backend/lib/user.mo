import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Common "../types/common";
import Types "../types/user";
import NftLib "../lib/nft";
import Result "mo:core/Result";

module {
  public type UserStore = Map.Map<Principal, Types.UserProfile>;

  public func initUserStore() : UserStore {
    Map.empty<Principal, Types.UserProfile>()
  };

  public func getMaxSlotsForTier(tier : Common.SubscriptionTier) : Nat {
    switch (tier) {
      case (#free) { 1 };
      case (#creator) { 10 };
      case (#pro) { 100 };
      case (#org) { 500 };
      // Admin slot limits are bypassed via role check, not tier
    }
  };

  public func getTierFromStripeProduct(productId : Text) : { tier : Common.SubscriptionTier; maxSlots : Nat; maxNFTsPerSlot : Nat } {
    switch (productId) {
      case ("prod_UgpwDUBgXdz0K5") { { tier = #free; maxSlots = 1; maxNFTsPerSlot = 1 } };
      case ("prod_UgpxVvHHogE6Qx") { { tier = #creator; maxSlots = 3; maxNFTsPerSlot = 10 } };
      case ("prod_UgpyBkj4HK4A9V") { { tier = #pro; maxSlots = 5; maxNFTsPerSlot = 100 } };
      case ("prod_Ugpy3x4LuFPxzf") { { tier = #org; maxSlots = 8; maxNFTsPerSlot = 500 } };
      case (_) { { tier = #free; maxSlots = 1; maxNFTsPerSlot = 1 } };
    }
  };

  public func createProfile(store : UserStore, principalId : Principal, creatorId : Common.CreatorId, timestamp : Common.Timestamp) : Types.UserProfile {
    let profile : Types.UserProfile = {
      principalId;
      creatorId;
      oisyWalletAddress = null;
      email = null;
      emailAlerts = [];
      subscriptionTier = #free;
      role = #creator;
      creditsUsed = 0;
      creditsTotal = NftLib.getTierCredits(#free);
      creditsResetAt = timestamp;
      activeSlots = 0;
      maxSlots = getMaxSlotsForTier(#free);
      createdAt = timestamp;
      stripeProductId = null;
    };
    store.add(principalId, profile);
    profile
  };

  public func getProfile(store : UserStore, principalId : Principal) : ?Types.UserProfile {
    store.get(principalId)
  };

  public func updateProfile(store : UserStore, principalId : Principal, profile : Types.UserProfile) : () {
    store.add(principalId, profile);
  };

  public func setOisyWallet(store : UserStore, principalId : Principal, address : Text) : () {
    switch (store.get(principalId)) {
      case (null) {};
      case (?profile) {
        store.add(principalId, { profile with oisyWalletAddress = ?address });
      };
    }
  };

  public func setEmail(store : UserStore, principalId : Principal, email : Text) : () {
    switch (store.get(principalId)) {
      case (null) {};
      case (?profile) {
        store.add(principalId, { profile with email = ?email });
      };
    }
  };

  public func setEmailAlerts(store : UserStore, principalId : Principal, alerts : [Common.AlertType]) : () {
    switch (store.get(principalId)) {
      case (null) {};
      case (?profile) {
        store.add(principalId, { profile with emailAlerts = alerts });
      };
    }
  };

  public func setSubscriptionTier(store : UserStore, principalId : Principal, tier : Common.SubscriptionTier) : () {
    switch (store.get(principalId)) {
      case (null) {};
      case (?profile) {
        let newTotal = NftLib.getTierCredits(tier);
        let newMaxSlots = getMaxSlotsForTier(tier);
        store.add(principalId, { profile with subscriptionTier = tier; creditsTotal = newTotal; maxSlots = newMaxSlots });
      };
    }
  };

  public func consumeSlot(store : UserStore, principalId : Principal) : { #ok; #err : { #NoSlotsAvailable } } {
    switch (store.get(principalId)) {
      case (null) { #err(#NoSlotsAvailable) };
      case (?profile) {
        if (profile.activeSlots >= profile.maxSlots) {
          #err(#NoSlotsAvailable)
        } else {
          store.add(principalId, { profile with activeSlots = profile.activeSlots + 1 });
          #ok
        }
      };
    }
  };

  public func releaseSlot(store : UserStore, principalId : Principal) : () {
    switch (store.get(principalId)) {
      case (null) {};
      case (?profile) {
        if (profile.activeSlots > 0) {
          let newSlots = Nat.sub(profile.activeSlots, 1);
          store.add(principalId, { profile with activeSlots = newSlots });
        };
      };
    }
  };

  public func getSlotsStatus(store : UserStore, nftStore : NftLib.NftStore, principalId : Principal) : { used : Nat; total : Nat; remaining : Nat } {
    switch (store.get(principalId)) {
      case (null) { { used = 0; total = 0; remaining = 0 } };
      case (?profile) {
        let used = NftLib.countActiveNftsByOwner(nftStore, principalId);
        let remaining = if (profile.maxSlots > used) {
          Nat.sub(profile.maxSlots, used)
        } else {
          0
        };
        { used; total = profile.maxSlots; remaining }
      };
    }
  };

  public func consumeCredit(store : UserStore, principalId : Principal) : Bool {
    switch (store.get(principalId)) {
      case (null) { false };
      case (?profile) {
        if (profile.creditsUsed >= profile.creditsTotal) {
          false
        } else {
          store.add(principalId, { profile with creditsUsed = profile.creditsUsed + 1 });
          true
        }
      };
    }
  };

  public func refreshCredits(store : UserStore, principalId : Principal, timestamp : Common.Timestamp) : () {
    switch (store.get(principalId)) {
      case (null) {};
      case (?profile) {
        let newTotal = NftLib.getTierCredits(profile.subscriptionTier);
        store.add(principalId, {
          profile with
          creditsUsed = 0;
          creditsTotal = newTotal;
          creditsResetAt = timestamp;
        });
      };
    }
  };

  public func getCreditsRemaining(store : UserStore, principalId : Principal) : Nat {
    switch (store.get(principalId)) {
      case (null) { 0 };
      case (?profile) {
        if (profile.creditsUsed >= profile.creditsTotal) {
          0
        } else {
          Nat.sub(profile.creditsTotal, profile.creditsUsed)
        }
      };
    }
  };

  public func createSlot(store : UserStore, principalId : Principal, isAdmin : Bool) : Result.Result<Nat, Text> {
    switch (store.get(principalId)) {
      case (null) { #err("User not found") };
      case (?profile) {
        if (isAdmin or profile.role == #admin) {
          let newMaxSlots = profile.maxSlots + 1;
          store.add(principalId, { profile with maxSlots = newMaxSlots });
          #ok(newMaxSlots)
        } else {
          let tierInfo = getTierFromStripeProduct(
            switch (profile.stripeProductId) {
              case (?id) id;
              case (null) "prod_UgpwDUBgXdz0K5"
            }
          );
          if (profile.maxSlots >= tierInfo.maxSlots) {
            #err("Slot limit reached for your tier. Upgrade to create more slots.")
          } else {
            let newMaxSlots = profile.maxSlots + 1;
            store.add(principalId, { profile with maxSlots = newMaxSlots });
            #ok(newMaxSlots)
          }
        }
      };
    }
  };

  public func assignTierByProductId(store : UserStore, principalId : Principal, productId : Text) : Result.Result<(), Text> {
    switch (store.get(principalId)) {
      case (null) { #err("User not found") };
      case (?profile) {
        let tierInfo = getTierFromStripeProduct(productId);
        let updatedProfile = {
          profile with
          stripeProductId = ?productId;
          subscriptionTier = tierInfo.tier;
          maxSlots = tierInfo.maxSlots;
          creditsTotal = NftLib.getTierCredits(tierInfo.tier);
        };
        store.add(principalId, updatedProfile);
        #ok()
      };
    }
  };
}
