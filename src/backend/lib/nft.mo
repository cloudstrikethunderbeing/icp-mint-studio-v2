import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Storage "mo:caffeineai-object-storage/Storage";
import Common "../types/common";
import Types "../types/nft";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Char "mo:core/Char";
import Result "mo:core/Result";

module {
  public type NftStore = Map.Map<Nat, Types.Nft>;
  public type CollectionStore = Map.Map<Nat, Types.Collection>;

  public func initNftStore() : NftStore {
    Map.empty<Nat, Types.Nft>()
  };

  public func initCollectionStore() : CollectionStore {
    Map.empty<Nat, Types.Collection>()
  };

  public func generateCreatorId(principal : Principal) : Common.CreatorId {
    let bytes = principal.toBlob();
    let hexChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
    var hex = "";
    var i = 0;
    for (byte in bytes.vals()) {
      if (i >= 5) { break };
      let high = Nat8.toNat(byte / 16);
      let low = Nat8.toNat(byte % 16);
      hex := hex # hexChars[high] # hexChars[low];
      i += 1;
    };
    let chars = hex.toIter().toArray();
    let part1Chars = Array.tabulate(6, func(j) = chars[j]);
    let part2Chars = Array.tabulate(4, func(j) = chars[6 + j]);
    "ICPMS-" # Text.fromIter(part1Chars.vals()) # "-" # Text.fromIter(part2Chars.vals())
  };

  public func getTierMaxSize(tier : Common.SubscriptionTier) : Nat {
    switch (tier) {
      case (#free) { 1 };
      case (#creator) { 10 };
      case (#pro) { 100 };
      case (#org) { 500 };
    }
  };

  public func getTierCredits(tier : Common.SubscriptionTier) : Nat {
    switch (tier) {
      case (#free) { 1 };
      case (#creator) { 10 };
      case (#pro) { 100 };
      case (#org) { 500 };
    }
  };

  public func canMint(store : NftStore, _collections : CollectionStore, ownerId : Principal, tier : Common.SubscriptionTier, _creditsUsed : Nat, _creditsTotal : Nat) : Bool {
    let maxSize = getTierMaxSize(tier);
    let activeCount = countActiveNftsByOwner(store, ownerId);
    activeCount < maxSize
  };

  public func createNft(store : NftStore, id : Nat, ownerId : Principal, creatorId : Common.CreatorId, imageBlob : Storage.ExternalBlob, assetHash : Text, title : Text, description : Text, edition : Text, timestamp : Common.Timestamp, collectionId : ?Nat, businessName : ?Text, website : ?Text, discountCode : ?Text, membershipId : ?Text, canisterId : Text, supplyLimit : Nat) : Types.Nft {
    let sanitizedTitle = sanitizeText(title, 100);
    let sanitizedDesc = sanitizeText(description, 1000);
    let sanitizedBusinessName = switch (businessName) {
      case (null) { null };
      case (?t) { ?sanitizeText(t, 100) };
    };
    let sanitizedWebsite = switch (website) {
      case (null) { null };
      case (?t) { ?sanitizeText(t, 500) };
    };
    let sanitizedDiscountCode = switch (discountCode) {
      case (null) { null };
      case (?t) { ?sanitizeText(t, 50) };
    };
    let sanitizedMembershipId = switch (membershipId) {
      case (null) { null };
      case (?t) { ?sanitizeText(t, 100) };
    };
    let nftUniqueId = canisterId # ":0:" # id.toText();
    let nft : Types.Nft = {
      id;
      ownerId;
      creatorId;
      imageBlob;
      assetHash;
      title = sanitizedTitle;
      description = sanitizedDesc;
      edition;
      mintDate = timestamp;
      claimedAt = null;
      status = #active;
      auditHistory = [];
      collectionId;
      businessName = sanitizedBusinessName;
      website = sanitizedWebsite;
      discountCode = sanitizedDiscountCode;
      membershipId = sanitizedMembershipId;
      rewardTier = #none;
      tags = [];
      nftUniqueId;
      supplyLimit;
    };
    store.add(id, nft);
    nft
  };

  public func softDeleteNft(store : NftStore, id : Nat, caller : Principal, timestamp : Common.Timestamp) : ?Types.Nft {
    switch (store.get(id)) {
      case (null) { null };
      case (?nft) {
        let entry : Common.AuditEntry = {
          action = "DELETE";
          caller;
          timestamp;
          details = ?("Deleted NFT " # id.toText());
        };
        let updated = addAuditEntry(nft, entry);
        let finalNft = { updated with status = #deleted };
        store.add(id, finalNft);
        ?finalNft
      };
    }
  };

  public func burnNft(store : NftStore, id : Nat, caller : Principal, timestamp : Common.Timestamp) : ?Types.Nft {
    switch (store.get(id)) {
      case (null) { null };
      case (?nft) {
        let entry : Common.AuditEntry = {
          action = "BURN";
          caller;
          timestamp;
          details = ?("Burned NFT " # id.toText());
        };
        let updated = addAuditEntry(nft, entry);
        let finalNft = { updated with status = #burned };
        store.add(id, finalNft);
        ?finalNft
      };
    }
  };

  public func getNft(store : NftStore, id : Nat) : ?Types.Nft {
    store.get(id)
  };

  public func listNftsByOwner(store : NftStore, ownerId : Principal, canisterId : Text) : [Types.Nft] {
    let results = List.empty<Types.Nft>();
    for ((_, nft) in store.entries()) {
      if (Principal.equal(nft.ownerId, ownerId)) {
        let nftUniqueId = canisterId # ":0:" # nft.id.toText();
        results.add({ nft with nftUniqueId });
      };
    };
    results.toArray()
  };

  public func listActiveNftsByOwner(store : NftStore, ownerId : Principal, canisterId : Text) : [Types.Nft] {
    let results = List.empty<Types.Nft>();
    for ((_, nft) in store.entries()) {
      if (Principal.equal(nft.ownerId, ownerId) and nft.status == #active) {
        let nftUniqueId = canisterId # ":0:" # nft.id.toText();
        results.add({ nft with nftUniqueId });
      };
    };
    results.toArray()
  };

  public func countActiveNftsByOwner(store : NftStore, ownerId : Principal) : Nat {
    var count = 0;
    for ((_, nft) in store.entries()) {
      if (Principal.equal(nft.ownerId, ownerId) and nft.status == #active and nft.claimedAt == null) {
        count += 1;
      };
    };
    count
  };

  public func addAuditEntry(nft : Types.Nft, entry : Common.AuditEntry) : Types.Nft {
    let history = List.empty<Common.AuditEntry>();
    for (e in nft.auditHistory.vals()) {
      history.add(e);
    };
    history.add(entry);
    if (history.size() > 100) {
      let trimmed = List.empty<Common.AuditEntry>();
      let size = history.size();
      if (size >= 100) {
        let start = Nat.sub(size, 100);
        var i = 0;
        for (e in history.toArray().vals()) {
          if (i >= start) {
            trimmed.add(e);
          };
          i += 1;
        };
        { nft with auditHistory = trimmed.toArray() }
      } else {
        { nft with auditHistory = history.toArray() }
      }
    } else {
      { nft with auditHistory = history.toArray() }
    }
  };

  public func sanitizeText(input : Text, maxLength : Nat) : Text {
    let trimmed = input.trim(#text " \t\n\r");
    if (trimmed.size() > maxLength) {
      let chars = trimmed.toIter().toArray();
      let truncated = Array.tabulate(maxLength, func(i) = chars[i]);
      Text.fromIter(truncated.vals())
    } else {
      trimmed
    }
  };

  public func verifyNft(store : NftStore, id : Nat, canisterId : Text) : ?Types.VerifyResult {
    if (canisterId == "") {
      return null;
    };
    switch (store.get(id)) {
      case (null) { null };
      case (?nft) {
        let nftUniqueId = canisterId # ":0:" # nft.id.toText();
        ?{
          tokenId = nft.id;
          owner = nft.ownerId;
          creatorId = nft.creatorId;
          mintDate = nft.mintDate;
          edition = nft.edition;
          network = "ICP";
          canisterId;
          assetHash = nft.assetHash;
          collectionId = nft.collectionId;
          businessName = nft.businessName;
          website = nft.website;
          discountCode = nft.discountCode;
          membershipId = nft.membershipId;
          rewardTier = nft.rewardTier;
          nftUniqueId;
          tags = nft.tags;
          supplyLimit = nft.supplyLimit;
          status = nft.status;
        }
      };
    }
  };

  public func validateEdition(edition : Text) : { #ok : { current : Nat; total : Nat }; #err : Text } {
    let trimmed = edition.trim(#text " \t\n\r");
    let parts = trimmed.split(#char '/');
    let partList = List.empty<Text>();
    for (part in parts) {
      partList.add(part);
    };
    if (partList.size() != 2) {
      return #err("Edition must be in format 'current/total'");
    };
    let currentText = partList.get(0);
    let totalText = partList.get(1);
    switch (currentText, totalText) {
      case (?ct, ?tt) {
        let currentOpt = Nat.fromText(ct);
        let totalOpt = Nat.fromText(tt);
        switch (currentOpt, totalOpt) {
          case (?current, ?total) {
            if (current == 0 or total == 0) {
              return #err("Edition numbers must be greater than 0");
            };
            if (current > total) {
              return #err("Edition current number cannot exceed total");
            };
            #ok({ current; total })
          };
          case (_) {
            #err("Edition must contain valid numbers")
          };
        };
      };
      case (_) {
        #err("Edition must be in format 'current/total'")
      };
    };
  };

  public func validateAssetHash(assetHash : Text) : Bool {
    let trimmed = assetHash.trim(#text " \t\n\r");
    if (trimmed.size() != 64) {
      return false;
    };
    let chars = trimmed.toIter().toArray();
    var i = 0;
    while (i < 64) {
      let c = chars[i];
      let valid = switch (Text.fromChar(c)) {
        case ("0") true; case ("1") true; case ("2") true; case ("3") true;
        case ("4") true; case ("5") true; case ("6") true; case ("7") true;
        case ("8") true; case ("9") true; case ("a") true; case ("b") true;
        case ("c") true; case ("d") true; case ("e") true; case ("f") true;
        case ("A") true; case ("B") true; case ("C") true; case ("D") true;
        case ("E") true; case ("F") true;
        case (_) false;
      };
      if (not valid) {
        return false;
      };
      i += 1;
    };
    true
  };

  public func findNftsByCreatorId(store : NftStore, creatorId : Common.CreatorId) : [Types.Nft] {
    let results = List.empty<Types.Nft>();
    for ((_, nft) in store.entries()) {
      if (nft.creatorId == creatorId and nft.status == #active) {
        results.add(nft);
      };
    };
    results.toArray()
  };

  public func searchNfts(store : NftStore, searchQuery : Text, canisterId : Text) : [Types.Nft] {
    let lowerQuery = searchQuery.toLower();
    let results = List.empty<Types.Nft>();
    for ((_, nft) in store.entries()) {
      if (nft.status == #active) {
        let titleMatch = nft.title.toLower().contains(#text(lowerQuery));
        let descMatch = nft.description.toLower().contains(#text(lowerQuery));
        let businessMatch = switch (nft.businessName) {
          case (null) { false };
          case (?name) { name.toLower().contains(#text(lowerQuery)) };
        };
        let tagMatch = nft.tags.find(func(t) = t.toLower().contains(#text(lowerQuery))) != null;
        if (titleMatch or descMatch or businessMatch or tagMatch) {
          let nftUniqueId = canisterId # ":0:" # nft.id.toText();
          results.add({ nft with nftUniqueId });
        };
      };
    };
    results.toArray()
  };

  public func countCollectionsByOwner(store : CollectionStore, ownerId : Principal) : Nat {
    var count = 0;
    for ((_, col) in store.entries()) {
      if (Principal.equal(col.ownerId, ownerId)) {
        count += 1;
      };
    };
    count
  };

  public func countNftsInCollection(store : NftStore, collectionId : Nat) : Nat {
    var count = 0;
    for ((_, nft) in store.entries()) {
      if (nft.status == #active) {
        switch (nft.collectionId) {
          case (?cid) {
            if (cid == collectionId) { count += 1 };
          };
          case (null) {};
        };
      };
    };
    count
  };

  public func addNftToCollection(store : NftStore, collectionStore : CollectionStore, nftId : Nat, collectionId : Nat, caller : Principal) : Result.Result<(), Text> {
    switch (store.get(nftId)) {
      case (null) { #err("NFT not found") };
      case (?nft) {
        if (not Principal.equal(nft.ownerId, caller)) {
          return #err("Unauthorized: Not the NFT owner");
        };
        switch (collectionStore.get(collectionId)) {
          case (null) { #err("Collection not found") };
          case (?col) {
            if (not Principal.equal(col.ownerId, caller)) {
              return #err("Unauthorized: Not the collection owner");
            };
            let nftCount = countNftsInCollection(store, collectionId);
            if (nftCount >= col.maxSize) {
              return #err("Collection is full");
            };
            // Update NFT's collectionId
            let updatedNft = { nft with collectionId = ?collectionId };
            store.add(nftId, updatedNft);
            // Update collection's nftIds list
            let nftIdList = List.empty<Nat>();
            for (id in col.nftIds.vals()) {
              if (id != nftId) { nftIdList.add(id) };
            };
            nftIdList.add(nftId);
            // Set preview image from first NFT's asset if empty
            let newPreviewImage = switch (col.previewImage) {
              case (null) { ?nft.assetHash };
              case (?_) { col.previewImage };
            };
            let updatedCol = {
              col with
              nftIds = nftIdList.toArray();
              previewImage = newPreviewImage;
            };
            collectionStore.add(collectionId, updatedCol);
            #ok()
          };
        };
      };
    }
  };

  public func removeNftFromCollection(store : NftStore, collectionStore : CollectionStore, nftId : Nat, collectionId : Nat, caller : Principal) : Result.Result<(), Text> {
    switch (store.get(nftId)) {
      case (null) { #err("NFT not found") };
      case (?nft) {
        if (not Principal.equal(nft.ownerId, caller)) {
          return #err("Unauthorized: Not the NFT owner");
        };
        switch (collectionStore.get(collectionId)) {
          case (null) { #err("Collection not found") };
          case (?col) {
            if (not Principal.equal(col.ownerId, caller)) {
              return #err("Unauthorized: Not the collection owner");
            };
            // Update NFT's collectionId to null
            let updatedNft = { nft with collectionId = null };
            store.add(nftId, updatedNft);
            // Update collection's nftIds list
            let nftIdList = List.empty<Nat>();
            for (id in col.nftIds.vals()) {
              if (id != nftId) { nftIdList.add(id) };
            };
            let updatedCol = {
              col with nftIds = nftIdList.toArray()
            };
            collectionStore.add(collectionId, updatedCol);
            #ok()
          };
        };
      };
    }
  };

  public func transferNft(store : NftStore, id : Nat, newOwnerId : Principal, caller : Principal, timestamp : Common.Timestamp) : ?Types.Nft {
    switch (store.get(id)) {
      case (null) { null };
      case (?nft) {
        if (not Principal.equal(nft.ownerId, caller)) {
          return null;
        };
        if (nft.status != #active) {
          return null;
        };
        let entry : Common.AuditEntry = {
          action = "TRANSFER";
          caller;
          timestamp;
          details = ?("Transferred NFT " # id.toText() # " to " # newOwnerId.toText());
        };
        let updated = addAuditEntry(nft, entry);
        let finalNft = { updated with ownerId = newOwnerId };
        store.add(id, finalNft);
        ?finalNft
      };
    }
  };
}
