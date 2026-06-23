import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Storage "mo:caffeineai-object-storage/Storage";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import Types "../types/nft";
import NftLib "../lib/nft";
import UserLib "../lib/user";
import Result "mo:core/Result";
import Random "mo:core/Random";
import ClaimLib "../lib/claim-link";
import Debug "mo:core/Debug";

mixin (
  accessControlState : AccessControl.AccessControlState,
  nftStore : NftLib.NftStore,
  collectionStore : NftLib.CollectionStore,
  nextNftId : { var value : Nat },
  nextCollectionId : { var value : Nat },
  rateLimitStore : Map.Map<Principal, { var count : Nat; var windowStart : Nat }>,
  userStore : UserLib.UserStore,
  selfCanisterId : { var value : Text },
  creatorIndex : Map.Map<Text, List.List<Nat>>,
  claimTokenStore : ClaimLib.ClaimTokenStore,
  nftToClaimToken : ClaimLib.NftToClaimStore,
  adminPrincipal : ?Principal,
) {
  func computeNftUniqueId(canisterId : Text, _collectionId : ?Nat, tokenId : Nat) : Text {
    if (canisterId == "") {
      return "";
    };
    canisterId # ":0:" # tokenId.toText()
  };

  func checkRateLimit(caller : Principal) : Result.Result<(), Text> {
    let now = Int.abs(Time.now());
    let maxRequests = switch (UserLib.getProfile(userStore, caller)) {
      case (?profile) {
        let productId = switch (profile.stripeProductId) {
          case (?id) id;
          case (null) "prod_UgpwDUBgXdz0K5"
        };
        let tierInfo = UserLib.getTierFromStripeProduct(productId);
        switch (tierInfo.tier) {
          case (#free) { 5 };
          case (_) { 20 };
        }
      };
      case (null) { 5 };
    };
    switch (rateLimitStore.get(caller)) {
      case (null) {
        let entry = { var count = 1; var windowStart = now };
        rateLimitStore.add(caller, entry);
      };
      case (?entry) {
        let elapsed = if (entry.windowStart >= now) { 0 } else { Nat.sub(now, entry.windowStart) };
        if (elapsed > 60) {
          entry.count := 1;
          entry.windowStart := now;
          rateLimitStore.add(caller, entry);
        } else {
          if (entry.count >= maxRequests) {
            return #err("Rate limit exceeded: please wait a minute before retrying");
          };
          entry.count += 1;
          rateLimitStore.add(caller, entry);
        };
      };
    };
    #ok()
  };

  public shared ({ caller }) func mintNft(
    imageBlob : Storage.ExternalBlob,
    assetHash : Text,
    title : Text,
    description : Text,
    collectionId : ?Nat,
    businessName : ?Text,
    website : ?Text,
    discountCode : ?Text,
    membershipId : ?Text,
    supplyLimit : Nat,
  ) : async Result.Result<{ id : Nat; tokenId : Nat; nftUniqueId : Text; collectionId : ?Nat }, { message : Text }> {
    if (caller.isAnonymous()) {
      return #err({ message = "Must be authenticated to mint" });
    };
    // EARLY AUTO-REGISTRATION: ensure user exists before any operation
    // This prevents any "User is not registered" traps from downstream code
    let _earlyProfile = switch (UserLib.getProfile(userStore, caller)) {
      case (?p) { p };
      case (null) {
        let creatorId = NftLib.generateCreatorId(caller);
        let timestamp = Int.abs(Time.now());
        UserLib.createProfile(userStore, caller, creatorId, timestamp)
      };
    };

    // Admin bypass: skip rate limit entirely
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      switch (checkRateLimit(caller)) {
        case (#err(msg)) { return #err({ message = msg }) };
        case (#ok) {};
      };
    };

    if (not NftLib.validateAssetHash(assetHash)) {
      return #err({ message = "Invalid asset hash: must be 64 hex characters" });
    };

    let sanitizedTitle = NftLib.sanitizeText(title, 100);
    if (sanitizedTitle.size() == 0) {
      return #err({ message = "Title is required" });
    };

    let sanitizedDesc = NftLib.sanitizeText(description, 1000);
    // Description is optional — allow empty string

    // businessName, website, discountCode, membershipId are optional — no validation required
    // They are passed through as-is (null or value) without validation errors

    let edition = switch (collectionId) {
      case (?cid) {
        switch (collectionStore.get(cid)) {
          case (null) {
            return #err({ message = "Collection not found" });
          };
          case (?col) {
            if (not Principal.equal(col.ownerId, caller)) {
              return #err({ message = "Unauthorized: Not the collection owner" });
            };
            let nftCount = NftLib.countNftsInCollection(nftStore, cid);
            if (nftCount >= col.maxSize) {
              return #err({ message = "Collection is full" });
            };
            if (nftCount >= 99) {
              return #err({ message = "Collection edition limit reached (max 99)" });
            };
            (nftCount + 1).toText() # "/99"
          };
        };
      };
      case (null) { "1/1" }
    };

    let timestamp = Int.abs(Time.now());
    let profile = switch (UserLib.getProfile(userStore, caller)) {
      case (?p) { p };
      case (null) {
        let creatorId = NftLib.generateCreatorId(caller);
        UserLib.createProfile(userStore, caller, creatorId, timestamp);
      };
    };

    let productId = switch (profile.stripeProductId) {
      case (?id) id;
      case (null) "prod_UgpwDUBgXdz0K5"
    };
    let tierInfo = UserLib.getTierFromStripeProduct(productId);
    let tier = tierInfo.tier;

    // Admin bypass: skip all tier-based mint restrictions
    Debug.print("MINT_GATE_CHECK");
    Debug.print(debug_show(caller));
    Debug.print(debug_show(AccessControl.isAdmin(accessControlState, caller)));
    Debug.print(debug_show(adminPrincipal));
    // Admin bypass: skip all tier-based mint restrictions
    if (AccessControl.isAdmin(accessControlState, caller)) {
      let id = if (nextNftId.value == 0) { nextNftId.value := 1; 1 } else { nextNftId.value };
      nextNftId.value := id + 1;
      let creatorId = profile.creatorId;

      let nft = NftLib.createNft(
        nftStore, id, caller, creatorId, imageBlob, assetHash,
        sanitizedTitle, description, edition, timestamp,
        collectionId, businessName, website, discountCode, membershipId, selfCanisterId.value,
        supplyLimit
      );

      let entry : Common.AuditEntry = {
        action = "MINT";
        caller;
        timestamp;
        details = ?("Admin minted NFT " # id.toText() # " by " # creatorId);
      };
      let nftWithAudit = NftLib.addAuditEntry(nft, entry);
      nftStore.add(id, nftWithAudit);

      let cid = selfCanisterId.value;
      let nftUniqueId = computeNftUniqueId(cid, collectionId, id);
      switch (creatorIndex.get(creatorId)) {
        case (null) {
          let tokenList = List.empty<Nat>();
          tokenList.add(id);
          creatorIndex.add(creatorId, tokenList);
        };
        case (?tokenList) {
          tokenList.add(id);
          creatorIndex.add(creatorId, tokenList);
        };
      };
      // Auto-generate claim link for admin and paid tiers
      let randomBytes = await Random.blob();
      let token = ClaimLib.buildToken(randomBytes);
      let now = Time.now();
      ClaimLib.storeToken(claimTokenStore, nftToClaimToken, id, token, now, supplyLimit, 0);
      return #ok({ id; tokenId = id; nftUniqueId; collectionId });
    };

    // Validate supplyLimit against caller's subscription tier
    let maxSupply = switch (tier) {
      case (#free) { 1 };
      case (#creator) { 10 };
      case (#pro) { 100 };
      case (#org) { 500 };
    };
    if (supplyLimit > maxSupply) {
      return #err({ message = "Supply limit exceeds tier maximum" });
    };

    let maxSize = tierInfo.maxSlots * tierInfo.maxNFTsPerSlot;
    let activeCount = NftLib.countActiveNftsByOwner(nftStore, caller);
    if (activeCount >= maxSize) {
      return #err({ message = "Slot limit reached. Burn an existing NFT to free a slot." });
    };

    let id = if (nextNftId.value == 0) { nextNftId.value := 1; 1 } else { nextNftId.value };
    nextNftId.value := id + 1;
    let creatorId = profile.creatorId;

    // ATOMIC MINT: create and persist NFT first, then consume slot/credit
    // If anything after store.add fails, catch and rollback
    let nft = NftLib.createNft(
      nftStore, id, caller, creatorId, imageBlob, assetHash,
      sanitizedTitle, description, edition, timestamp,
      collectionId, businessName, website, discountCode, membershipId, selfCanisterId.value,
      supplyLimit
    );

    try {
      // ONLY consume credit AFTER NFT is persisted (slots are derived from active NFT count)
      switch (tier) {
        case (#free) {
          // Free tier: slot usage is derived from active NFT count, no explicit consumption needed
        };
        case (_) {
          if (not UserLib.consumeCredit(userStore, caller)) {
            // Rollback: remove the NFT we just created
            ignore NftLib.softDeleteNft(nftStore, id, caller, timestamp);
            return #err({ message = "No credits remaining: upgrade your subscription" });
          };
        };
      };

      // Audit log: store the updated NFT with audit entry
      let entry : Common.AuditEntry = {
        action = "MINT";
        caller;
        timestamp;
        details = ?("Minted NFT " # id.toText() # " by " # creatorId);
      };
      let nftWithAudit = NftLib.addAuditEntry(nft, entry);
      nftStore.add(id, nftWithAudit);

      let cid = selfCanisterId.value;
      let nftUniqueId = computeNftUniqueId(cid, collectionId, id);
      // Update creatorId secondary index
      switch (creatorIndex.get(creatorId)) {
        case (null) {
          let tokenList = List.empty<Nat>();
          tokenList.add(id);
          creatorIndex.add(creatorId, tokenList);
        };
        case (?tokenList) {
          tokenList.add(id);
          creatorIndex.add(creatorId, tokenList);
        };
      };
      // Auto-generate claim link for paid tiers (admin already handled above)
      if (tier != #free) {
        let randomBytes = await Random.blob();
        let token = ClaimLib.buildToken(randomBytes);
        let now = Time.now();
        ClaimLib.storeToken(claimTokenStore, nftToClaimToken, id, token, now, supplyLimit, 0);
      };
      #ok({ id; tokenId = id; nftUniqueId; collectionId })
    } catch (e) {
      // Rollback on any unexpected failure
      ignore NftLib.softDeleteNft(nftStore, id, caller, timestamp);
      #err({ message = "Mint failed: " # e.message() })
    }
  };

  public shared ({ caller }) func deleteNft(id : Nat) : async Result.Result<(), Text> {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: Anonymous caller");
    };
    switch (checkRateLimit(caller)) {
      case (#err(msg)) { return #err(msg) };
      case (#ok) {};
    };
    switch (NftLib.getNft(nftStore, id)) {
      case (null) {
        return #err("NFT not found");
      };
      case (?nft) {
        if (not Principal.equal(nft.ownerId, caller)) {
          return #err("Unauthorized: Not the owner");
        };
        let timestamp = Int.abs(Time.now());
        let _ = NftLib.softDeleteNft(nftStore, id, caller, timestamp);
        // deleteNft must NOT modify slot counts — pure removal only
        #ok()
      };
    };
  };

  public shared ({ caller }) func burnNft(id : Nat) : async Result.Result<(), Text> {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: Anonymous caller");
    };
    switch (checkRateLimit(caller)) {
      case (#err(msg)) { return #err(msg) };
      case (#ok) {};
    };
    switch (NftLib.getNft(nftStore, id)) {
      case (null) {
        return #err("NFT not found");
      };
      case (?nft) {
        if (not Principal.equal(nft.ownerId, caller)) {
          return #err("Unauthorized: Not the owner");
        };
        let timestamp = Int.abs(Time.now());
        let _ = NftLib.burnNft(nftStore, id, caller, timestamp);
        // Slot usage is derived from active NFT count — no explicit release needed
        #ok()
      };
    };
  };

  public query ({ caller }) func getNft(id : Nat) : async ?Types.Nft {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous caller");
    };
    NftLib.getNft(nftStore, id)
  };

  public query ({ caller }) func listMyNfts() : async [Types.Nft] {
    if (caller.isAnonymous()) {
      return [];
    };
    NftLib.listNftsByOwner(nftStore, caller, selfCanisterId.value)
  };

  public query ({ caller }) func listMyActiveNfts() : async [Types.Nft] {
    if (caller.isAnonymous()) {
      return [];
    };
    NftLib.listActiveNftsByOwner(nftStore, caller, selfCanisterId.value)
  };

  func verifyNftPublicInternal(nftUniqueId : Text, realCid : Text) : Result.Result<Types.VerifyResult, Text> {
    // Parse tokenId from nftUniqueId format: canisterId:0:tokenId
    let parts = nftUniqueId.split(#char ':');
    let partList = List.empty<Text>();
    for (p in parts) { partList.add(p) };
    // Expect at least 3 parts: canisterId, slotId (0), tokenId
    if (partList.size() < 3) {
      return #err("NFT_NOT_FOUND_OR_INCOMPLETE");
    };
    let tokenIdText = switch (partList.get(partList.size() - 1 : Nat)) {
      case (?t) t;
      case (null) { return #err("NFT_NOT_FOUND_OR_INCOMPLETE") };
    };
    let tokenId = switch (Nat.fromText(tokenIdText)) {
      case (?n) n;
      case (null) { return #err("NFT_NOT_FOUND_OR_INCOMPLETE") };
    };
    switch (NftLib.getNft(nftStore, tokenId)) {
      case (null) { #err("NFT_NOT_FOUND_OR_INCOMPLETE") };
      case (?nft) {
        if (nft.status != #active) {
          #err("NFT_NOT_FOUND_OR_INCOMPLETE")
        } else {
          switch (NftLib.verifyNft(nftStore, tokenId, realCid)) {
            case (null) { #err("NFT_NOT_FOUND_OR_INCOMPLETE") };
            case (?result) { #ok(result) };
          }
        }
      };
    }
  };

  // Legacy endpoints removed — use verifyNftPublic and verifyNftByCreatorId

  func verifyNftByCreatorIdInternal(creatorId : Text, realCid : Text) : Result.Result<[Types.VerifyResult], Text> {
    switch (creatorIndex.get(creatorId)) {
      case (null) {
        #err("NFT_NOT_FOUND_OR_INCOMPLETE")
      };
      case (?tokenList) {
        let results = List.empty<Types.VerifyResult>();
        for (tokenId in tokenList.toArray().vals()) {
          switch (NftLib.getNft(nftStore, tokenId)) {
            case (null) {};
            case (?nft) {
              if (nft.status == #active) {
                switch (NftLib.verifyNft(nftStore, tokenId, realCid)) {
                  case (null) {};
                  case (?result) {
                    if (result.canisterId != "" and result.nftUniqueId != "") {
                      results.add(result);
                    };
                  };
                };
              };
            };
          };
        };
        if (results.size() == 0) {
          #err("NFT_NOT_FOUND_OR_INCOMPLETE")
        } else {
          #ok(results.toArray())
        }
      };
    }
  };

  func verifyNftByCreatorIdWithHistoryInternal(creatorId : Text, realCid : Text) : Result.Result<[Types.VerifyResult], Text> {
    switch (creatorIndex.get(creatorId)) {
      case (null) {
        #err("NFT_NOT_FOUND_OR_INCOMPLETE")
      };
      case (?tokenList) {
        let results = List.empty<Types.VerifyResult>();
        for (tokenId in tokenList.toArray().vals()) {
          switch (NftLib.verifyNft(nftStore, tokenId, realCid)) {
            case (null) {};
            case (?result) {
              if (result.canisterId != "" and result.nftUniqueId != "") {
                results.add(result);
              };
            };
          };
        };
        if (results.size() == 0) {
          #err("NFT_NOT_FOUND_OR_INCOMPLETE")
        } else {
          #ok(results.toArray())
        }
      };
    }
  };

  public shared ({ caller }) func createCollection(name : Text, description : Text) : async Result.Result<Nat, Text> {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: Anonymous caller");
    };
    switch (checkRateLimit(caller)) {
      case (#err(msg)) { return #err(msg) };
      case (#ok) {};
    };

    let sanitizedName = NftLib.sanitizeText(name, 100);
    let sanitizedDesc = NftLib.sanitizeText(description, 1000);
    if (sanitizedName.size() == 0) {
      return #err("Name is required");
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    if (isAdmin) {
      let id = nextCollectionId.value;
      nextCollectionId.value += 1;
      let timestamp = Int.abs(Time.now());
      let collection : Types.Collection = {
        id;
        ownerId = caller;
        name = sanitizedName;
        description = sanitizedDesc;
        tier = #org;
        maxSize = 999999;
        createdAt = timestamp;
        previewImage = null;
        nftIds = [];
      };
      collectionStore.add(id, collection);
      return #ok(id);
    };

    let tier = switch (UserLib.getProfile(userStore, caller)) {
      case (?profile) { profile.subscriptionTier };
      case (null) { #free };
    };
    if (tier == #free) {
      return #err("Collection creation requires a paid subscription");
    };

    let collectionCount = NftLib.countCollectionsByOwner(collectionStore, caller);
    if (collectionCount >= 8) {
      return #err("Max 8 collections per user");
    };
    let maxSize = NftLib.getTierMaxSize(tier);

    let id = nextCollectionId.value;
    nextCollectionId.value += 1;
    let timestamp = Int.abs(Time.now());
    let collection : Types.Collection = {
      id;
      ownerId = caller;
      name = sanitizedName;
      description = sanitizedDesc;
      tier;
      maxSize;
      createdAt = timestamp;
      previewImage = null;
      nftIds = [];
    };
    collectionStore.add(id, collection);
    #ok(id)
  };

  public shared ({ caller }) func deleteCollection(id : Nat) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous caller");
    };
    switch (collectionStore.get(id)) {
      case (null) {
        Runtime.trap("Collection not found");
      };
      case (?col) {
        if (not Principal.equal(col.ownerId, caller)) {
          Runtime.trap("Unauthorized: Not the owner");
        };
        collectionStore.remove(id);
      };
    };
  };

  public type CollectionWithCount = {
    id : Nat;
    ownerId : Principal;
    name : Text;
    description : Text;
    tier : Common.SubscriptionTier;
    maxSize : Nat;
    createdAt : Common.Timestamp;
    nftCount : Nat;
    previewImage : ?Text;
    nftIds : [Nat];
  };

  public query ({ caller }) func listMyCollections() : async [CollectionWithCount] {
    if (caller.isAnonymous()) {
      return [];
    };
    let results = List.empty<CollectionWithCount>();
    for ((_, col) in collectionStore.entries()) {
      if (Principal.equal(col.ownerId, caller)) {
        let nftCount = NftLib.countNftsInCollection(nftStore, col.id);
        results.add({
          id = col.id;
          ownerId = col.ownerId;
          name = col.name;
          description = col.description;
          tier = col.tier;
          maxSize = col.maxSize;
          createdAt = col.createdAt;
          nftCount;
          previewImage = col.previewImage;
          nftIds = col.nftIds;
        });
      };
    };
    results.toArray()
  };

  public query ({ caller }) func getCollection(id : Nat) : async ?Types.Collection {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous caller");
    };
    collectionStore.get(id)
  };

  public shared ({ caller }) func transferNft(id : Nat, toPrincipal : Principal) : async Common.TransferResult {
    if (caller.isAnonymous()) {
      return { success = false; error = ?"Must be authenticated to transfer"; newOwnerPrincipal = null };
    };
    if (Principal.equal(caller, toPrincipal)) {
      return { success = false; error = ?"Cannot transfer to yourself"; newOwnerPrincipal = null };
    };
    if (toPrincipal.isAnonymous()) {
      return { success = false; error = ?"Cannot transfer to anonymous principal"; newOwnerPrincipal = null };
    };
    switch (checkRateLimit(caller)) {
      case (#err(msg)) { return { success = false; error = ?msg; newOwnerPrincipal = null } };
      case (#ok) {};
    };
    switch (NftLib.getNft(nftStore, id)) {
      case (null) {
        return { success = false; error = ?"NFT not found"; newOwnerPrincipal = null };
      };
      case (?nft) {
        if (not Principal.equal(nft.ownerId, caller)) {
          return { success = false; error = ?"Unauthorized: Not the owner"; newOwnerPrincipal = null };
        };
        if (nft.status != #active) {
          return { success = false; error = ?"NFT is not active"; newOwnerPrincipal = null };
        };
        let timestamp = Int.abs(Time.now());
        ignore NftLib.transferNft(nftStore, id, toPrincipal, caller, timestamp);
        { success = true; error = null; newOwnerPrincipal = ?toPrincipal.toText() }
      };
    };
  };

  public shared ({ caller }) func updateBusinessMetadata(id : Nat, updates : Common.UpdateMetadataRequest) : async Result.Result<(), Text> {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: Anonymous caller");
    };
    switch (NftLib.getNft(nftStore, id)) {
      case (null) {
        return #err("NFT not found");
      };
      case (?nft) {
        if (nft.status != #active) {
          return #err("NFT is not active");
        };
        let isOwner = Principal.equal(nft.ownerId, caller);
        let isAdmin = AccessControl.isAdmin(accessControlState, caller);
        if (not isOwner and not isAdmin) {
          return #err("Unauthorized: Only the owner or admin can update metadata");
        };
        let timestamp = Int.abs(Time.now());
        let updatedNft = {
          nft with
          businessName = switch (updates.businessName) { case (?v) ?NftLib.sanitizeText(v, 100); case (null) nft.businessName };
          website = switch (updates.website) { case (?v) ?NftLib.sanitizeText(v, 500); case (null) nft.website };
          discountCode = switch (updates.discountCode) { case (?v) ?NftLib.sanitizeText(v, 50); case (null) nft.discountCode };
          membershipId = switch (updates.membershipId) { case (?v) ?NftLib.sanitizeText(v, 100); case (null) nft.membershipId };
          rewardTier = switch (updates.rewardTier) { case (?v) v; case (null) nft.rewardTier };
          tags = switch (updates.tags) { case (?v) v; case (null) nft.tags };
        };
        let entry : Common.AuditEntry = {
          action = "METADATA_UPDATE";
          caller;
          timestamp;
          details = ?("Updated metadata for NFT " # id.toText());
        };
        let finalNft = NftLib.addAuditEntry(updatedNft, entry);
        nftStore.add(id, finalNft);
        #ok()
      };
    };
  };

  public shared ({ caller }) func addNftToCollection(nftId : Nat, collectionId : Nat) : async Result.Result<(), Text> {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: Anonymous caller");
    };
    NftLib.addNftToCollection(nftStore, collectionStore, nftId, collectionId, caller)
  };

  public shared ({ caller }) func removeNftFromCollection(nftId : Nat, collectionId : Nat) : async Result.Result<(), Text> {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: Anonymous caller");
    };
    NftLib.removeNftFromCollection(nftStore, collectionStore, nftId, collectionId, caller)
  };

  public query ({ caller }) func searchNfts(searchTerm : Text) : async [Types.Nft] {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    if (not isAdmin) {
      Runtime.trap("Unauthorized: Admin only");
    };
    NftLib.searchNfts(nftStore, searchTerm, selfCanisterId.value)
  };

}
