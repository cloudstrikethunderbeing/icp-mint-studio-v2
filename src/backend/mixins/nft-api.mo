import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Storage "mo:caffeineai-object-storage/Storage";
import Auth "../lib/auth";
import Common "../types/common";
import Types "../types/nft";
import NftLib "../lib/nft";
import UserLib "../lib/user";
import Result "mo:core/Result";
import Random "mo:core/Random";
import ClaimLib "../lib/claim-link";
import Sha256 "mo:sha2/Sha256";

mixin (
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
  admins : { var value : [Principal] },
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
        if (elapsed > 60_000_000_000) {
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
    if (not Auth.isAdmin(caller, admins.value)) {
      switch (checkRateLimit(caller)) {
        case (#err(msg)) { return #err({ message = msg }) };
        case (#ok) {};
      };
    };

    if (not NftLib.validateAssetHash(assetHash)) {
      return #err({ message = "Invalid asset hash: must be 64 hex characters" });
    };

    // Server-side image validation: size bounds + content-binding of assetHash
    if (imageBlob.size() == 0) {
      return #err({ message = "Image data is empty" });
    };
    if (imageBlob.size() > 10 * 1024 * 1024) {
      return #err({ message = "Image exceeds maximum size of 10 MiB" });
    };

    // Magic-byte allowlist + trailing-byte rejection: extracted into pure
    // helpers in NftLib so they are unit-testable without canister/auth context.
    // Enforced AFTER size check, BEFORE SHA-256 recompute and createNft.
    // Behavior is identical to the prior inlined implementation: same accepted
    // formats, same error messages, same WebP trailing-byte skip.
    switch (NftLib.validateImageFormat(imageBlob)) {
      case (#err(e)) { return #err({ message = e.message }) };
      case (#ok) {};
    };
    switch (NftLib.validateTrailingBytes(imageBlob)) {
      case (#err(e)) { return #err({ message = e.message }) };
      case (#ok) {};
    };

    // [IMGVAL] Format-dispatched structural validation (additive, after
    // validateTrailingBytes, before SHA-256 recompute). Detects the image
    // format from magic bytes and runs ONLY the matching structural validator:
    // JPEG -> validateJpegMarkers, PNG -> validatePngChunks,
    // WebP -> validateWebpChunks. An unknown format returns #ok here —
    // validateImageFormat above already rejected anything that is not
    // JPEG/PNG/WebP, so this preserves the existing early-return behavior.
    // Replaces the prior three unconditional switch blocks that ran every
    // validator on every image (a clean JPG failed validatePngChunks' signature
    // check with "Invalid PNG: bad signature").
    switch (NftLib.validateStructure(imageBlob)) {
      case (#err(e)) { return #err({ message = e.message }) };
      case (#ok) {};
    };

    let computedHash = Sha256.fromBlob(imageBlob);
    var computedHex = "";
    for (b in computedHash.vals()) {
      let bNat = b.toNat();
      let hi = bNat / 16;
      let lo = bNat % 16;
      let hexDigit = func(d : Nat) : Text {
        switch (d) {
          case 0 { "0" };
          case 1 { "1" };
          case 2 { "2" };
          case 3 { "3" };
          case 4 { "4" };
          case 5 { "5" };
          case 6 { "6" };
          case 7 { "7" };
          case 8 { "8" };
          case 9 { "9" };
          case 10 { "a" };
          case 11 { "b" };
          case 12 { "c" };
          case 13 { "d" };
          case 14 { "e" };
          case _ { "f" };
        };
      };
      computedHex := computedHex # hexDigit(hi) # hexDigit(lo);
    };
    if (computedHex != assetHash) {
      return #err({ message = "assetHash does not match image data" });
    };

    // [H1/M3/P2] supplyLimit validation for ALL callers (admin and non-admin):
    // reject supplyLimit == 0 (deny-by-default — a 0-supply NFT would produce
    // an edition string "1/0" on claim and is meaningless) and cap the absolute
    // maximum at 500 for everyone, including admins. No unbounded admin mint.
    // The 500 cap matches the highest tier (#org) so admins get no more than
    // the top paid tier.
    if (supplyLimit == 0) {
      return #err({ message = "Supply limit must be at least 1" });
    };
    if (supplyLimit > 500) {
      return #err({ message = "Supply limit exceeds absolute maximum of 500" });
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
    if (Auth.isAdmin(caller, admins.value)) {
      let id = if (nextNftId.value == 0) { nextNftId.value := 1; 1 } else { nextNftId.value };
      nextNftId.value := id + 1;
      let creatorId = profile.creatorId;

      // [NFT-INTEGRITY] Mint-path guard: a mint must be purely additive and
      // must never overwrite/reset/rebuild existing NFT state. Refuse before
      // persisting if the id would clobber an existing NFT.
      switch (NftLib.guardMintAdditive(nftStore, id)) {
        case (#err(msg)) { return #err({ message = msg }) };
        case (#ok) {};
      };

      // [NFT-INTEGRITY] Snapshot the catalog BEFORE the mint so the post-mint
      // integrity check can prove the mint was purely additive.
      let integritySnapshot = NftLib.snapshotIntegrity(nftStore);

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

      // [NFT-INTEGRITY] Post-mint integrity check: pre-mint count + 1 must
      // equal post-mint count AND all pre-existing NFT ids must remain listed.
      // If it fails, remove the freshly minted NFT (leaving the catalog
      // unchanged) and surface a clear error.
      switch (NftLib.verifyMintIntegrity(nftStore, integritySnapshot, id)) {
        case (#err(msg)) {
          NftLib.removeNft(nftStore, id);
          return #err({ message = msg });
        };
        case (#ok) {};
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

    // [NFT-INTEGRITY] Mint-path guard: a mint must be purely additive and must
    // never overwrite/reset/rebuild existing NFT state. Refuse before
    // persisting if the id would clobber an existing NFT.
    switch (NftLib.guardMintAdditive(nftStore, id)) {
      case (#err(msg)) { return #err({ message = msg }) };
      case (#ok) {};
    };

    // [NFT-INTEGRITY] Snapshot the catalog BEFORE the mint so the post-mint
    // integrity check can prove the mint was purely additive.
    let integritySnapshot = NftLib.snapshotIntegrity(nftStore);

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

      // [NFT-INTEGRITY] Post-mint integrity check: pre-mint count + 1 must
      // equal post-mint count AND all pre-existing NFT ids must remain listed.
      // If it fails, remove the freshly minted NFT (leaving the catalog
      // unchanged) and surface a clear error.
      switch (NftLib.verifyMintIntegrity(nftStore, integritySnapshot, id)) {
        case (#err(msg)) {
          NftLib.removeNft(nftStore, id);
          return #err({ message = msg });
        };
        case (#ok) {};
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
    // [NFT-INTEGRITY] Redact discountCode/membershipId for non-admin callers.
    // These sensitive bearer-style fields must never be re-exposed to
    // non-admin callers; they remain only in admin-gated surfaces.
    let isAdmin = Auth.isAdmin(caller, admins.value);
    switch (NftLib.getNft(nftStore, id)) {
      case (null) { null };
      case (?nft) {
        if (isAdmin) { ?nft } else { ?NftLib.redactNft(nft) }
      };
    }
  };

  public query ({ caller }) func listMyNfts() : async [Types.Nft] {
    if (caller.isAnonymous()) {
      return [];
    };
    // [NFT-INTEGRITY] Redact discountCode/membershipId for non-admin callers.
    let isAdmin = Auth.isAdmin(caller, admins.value);
    let nfts = NftLib.listNftsByOwner(nftStore, caller, selfCanisterId.value);
    if (isAdmin) {
      nfts
    } else {
      nfts.map(func n = NftLib.redactNft(n))
    }
  };

  public query ({ caller }) func listMyActiveNfts() : async [Types.Nft] {
    if (caller.isAnonymous()) {
      return [];
    };
    // [NFT-INTEGRITY] Redact discountCode/membershipId for non-admin callers.
    let isAdmin = Auth.isAdmin(caller, admins.value);
    let nfts = NftLib.listActiveNftsByOwner(nftStore, caller, selfCanisterId.value);
    if (isAdmin) {
      nfts
    } else {
      nfts.map(func n = NftLib.redactNft(n))
    }
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
            case (?result) { #ok(NftLib.redactVerifyResult(result)) };
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
                      results.add(NftLib.redactVerifyResult(result));
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

    let isAdmin = Auth.isAdmin(caller, admins.value);
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
        let isAdmin = Auth.isAdmin(caller, admins.value);
        if (not isOwner and not isAdmin) {
          return #err("Unauthorized: Only the owner or admin can update metadata");
        };
        // P5: RewardTier self-assignment restriction. Safest conservative
        // default (deny-by-default, reject over allow): non-admins may only
        // set rewardTier to #none; any other value is rejected. Admins may
        // set any rewardTier. This prevents owners from self-assigning
        // gold/platinum tiers.
        let newRewardTier = switch (updates.rewardTier) {
          case (null) { nft.rewardTier };
          case (?v) {
            if (not isAdmin and v != #none) {
              return #err("Unauthorized: Only admins can assign reward tiers above #none");
            };
            v
          };
        };
        // M1: Sanitize each tag with sanitizeText(tag, MAX_TAG_LENGTH) and cap
        // the tags array at MAX_TAGS. Reject (reject over allow) if more than
        // MAX_TAGS tags are supplied. Empty tags after sanitization are dropped.
        let MAX_TAGS = 20;
        let MAX_TAG_LENGTH = 50;
        let newTags = switch (updates.tags) {
          case (null) { nft.tags };
          case (?v) {
            if (v.size() > MAX_TAGS) {
              return #err("Too many tags: maximum " # MAX_TAGS.toText() # " tags allowed");
            };
            let sanitized = List.empty<Text>();
            for (tag in v.vals()) {
              let s = NftLib.sanitizeText(tag, MAX_TAG_LENGTH);
              if (s.size() > 0) {
                sanitized.add(s);
              };
            };
            sanitized.toArray()
          };
        };
        let timestamp = Int.abs(Time.now());
        let updatedNft = {
          nft with
          businessName = switch (updates.businessName) { case (?v) ?NftLib.sanitizeText(v, 100); case (null) nft.businessName };
          website = switch (updates.website) { case (?v) ?NftLib.sanitizeText(v, 500); case (null) nft.website };
          discountCode = switch (updates.discountCode) { case (?v) ?NftLib.sanitizeText(v, 50); case (null) nft.discountCode };
          membershipId = switch (updates.membershipId) { case (?v) ?NftLib.sanitizeText(v, 100); case (null) nft.membershipId };
          rewardTier = newRewardTier;
          tags = newTags;
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
    let isAdmin = Auth.isAdmin(caller, admins.value);
    if (not isAdmin) {
      Runtime.trap("Unauthorized: Admin only");
    };
    NftLib.searchNfts(nftStore, searchTerm, selfCanisterId.value)
  };

  // [NFT-INTEGRITY] Safe all-NFT listing. Returns EVERY NFT in the catalog
  // with NO hardcoded result cap — a capped listing would silently truncate
  // the catalog at scale, making NFTs appear to "disappear". Read-only O(N)
  // scan (never destructive). Admin-gated: this is NOT a public catalog
  // explorer (out of scope) — only admins may list the full catalog.
  public query ({ caller }) func listAllNfts() : async [Types.Nft] {
    if (not Auth.isAdmin(caller, admins.value)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    NftLib.listAllNfts(nftStore, selfCanisterId.value)
  };

  // [NFT-INTEGRITY] Public health-check query. Returns the total NFT count so
  // the frontend health check can correctly detect an empty backend. This is a
  // simple count (NOT a public catalog explorer — out of scope) and does not
  // expose any NFT details. Read-only O(1) store size lookup.
  public query func getTotalNftCount() : async Nat {
    NftLib.countNfts(nftStore)
  };

  // [NFT-INTEGRITY] Stable-storage integrity check. Reports the current sizes
  // of the four stable stores (NFT, collection, user, claim-token) so an
  // operator can MANUALLY confirm the catalog survived an upgrade/reinstall
  // intact (no Init-style wipe reset the stores to empty). This is a manual
  // diagnostic query — it does NOT perform automated alerting (out of scope).
  public query ({ caller }) func getStableStateIntegrity() : async {
    nftCount : Nat;
    collectionCount : Nat;
    userCount : Nat;
    claimTokenCount : Nat;
  } {
    if (not Auth.isAdmin(caller, admins.value)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    {
      nftCount = NftLib.countNfts(nftStore);
      collectionCount = collectionStore.size();
      userCount = userStore.size();
      claimTokenCount = claimTokenStore.size();
    }
  };

  // [NFT-INTEGRITY] Public diagnostic that exposes store-wide catalog state
  // (total NFT count) and account-scoped state (count for the caller). Lets
  // the frontend distinguish 'catalog is empty' (store-wide zero) from 'no
  // NFTs for this account' (store has NFTs but none owned by the caller).
  // Read-only O(N) scan; never destructive. Exposes ONLY counts — no NFT
  // details, so it is safe as a public (non-admin) query. This is a MANUAL
  // diagnostic — it does NOT perform automated alerting (out of scope).
  public query ({ caller }) func getCatalogIntegrity() : async {
    totalNftCount : Nat;
    myNftCount : Nat;
    myActiveNftCount : Nat;
  } {
    {
      totalNftCount = NftLib.countNfts(nftStore);
      myNftCount = NftLib.countNftsByOwner(nftStore, caller);
      myActiveNftCount = NftLib.countActiveNftsByOwner(nftStore, caller);
    }
  };

}
