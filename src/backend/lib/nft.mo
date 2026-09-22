import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Nat32 "mo:core/Nat32";
import Runtime "mo:core/Runtime";
import Storage "mo:caffeineai-object-storage/Storage";
import Common "../types/common";
import Types "../types/nft";
import ReferralTypes "../types/referral-rewards";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Char "mo:core/Char";
import Result "mo:core/Result";

module {
  public type NftStore = Map.Map<Nat, Types.Nft>;
  public type CollectionStore = Map.Map<Nat, Types.Collection>;

  // Format a Nat8 as a two-digit uppercase hex string (e.g. 0xE2 -> "E2").
  // Used for unambiguous JPEG marker-tag error messages (tag.toText() emits
  // decimal, which renders 0xE2 as "226" — confusing in a "0xFF..." context).
  func nat8ToHex(b : Nat8) : Text {
    let hexChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
    let high = Nat8.toNat(b / 16);
    let low = Nat8.toNat(b % 16);
    hexChars[high] # hexChars[low]
  };

  public func initNftStore() : NftStore {
    Map.empty()
  };

  public func initCollectionStore() : CollectionStore {
    Map.empty()
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
      // Referral-rewards defaults for a brand-new NFT: not a referral bonus
      // asset (#none) and the default referral threshold placeholder (3,
      // admin-tunable via adminSetNftReferralThreshold). Only meaningful when
      // an admin later flips rewardType to #referralBonus.
      rewardType = #none;
      referralThreshold = ReferralTypes.DEFAULT_REFERRAL_THRESHOLD;
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
      if (Principal.equal(nft.ownerId, ownerId) and nft.status == #active and nft.claimedAt == null) {
        let nftUniqueId = canisterId # ":0:" # nft.id.toText();
        results.add({ nft with nftUniqueId });
      };
    };
    results.toArray()
  };

  // [NFT-INTEGRITY] Safe all-NFT listing. Returns EVERY NFT in the store with
  // NO hardcoded result cap — a capped listing would silently truncate the
  // catalog at scale, making NFTs appear to "disappear". Read-only O(N) scan
  // (never destructive, never clears/rebuilds state). The caller (an
  // admin-gated query in the mixin) decides authorization; this function is
  // purely a complete, uncapped projection of the store.
  public func listAllNfts(store : NftStore, canisterId : Text) : [Types.Nft] {
    let results = List.empty<Types.Nft>();
    for ((_, nft) in store.entries()) {
      let nftUniqueId = canisterId # ":0:" # nft.id.toText();
      results.add({ nft with nftUniqueId });
    };
    results.toArray()
  };

  // [NFT-INTEGRITY] Mint-path integrity guard. A mint must be PURELY ADDITIVE:
  // it adds exactly one NFT and must never overwrite, reset, or rebuild any
  // existing NFT state. This guard refuses to mint into an id that already
  // exists in the store, making the invariant explicit and fail-closed. Since
  // nextNftId is monotonically increasing this should never fire, but it
  // guarantees no code path can clobber existing state as a side effect of a
  // single mint.
  public func guardMintAdditive(store : NftStore, id : Nat) : Result.Result<(), Text> {
    switch (store.get(id)) {
      case (null) { #ok() };
      case (?_) {
        #err("Mint integrity guard: NFT id " # id.toText() # " already exists — refusing to overwrite existing state")
      };
    }
  };

  // [NFT-INTEGRITY] Snapshot of the catalog taken BEFORE a mint/claim so the
  // post-mint integrity check can prove the operation was purely additive.
  // Captures the pre-mint count and the set of pre-existing NFT ids. Read-only.
  public type MintIntegrity = {
    preCount : Nat;
    preExistingIds : [Nat];
  };

  // [NFT-INTEGRITY] Captures the pre-mint catalog snapshot. Read-only O(N)
  // scan; never destructive. Called immediately before a mint/claim persists
  // its new NFT so verifyMintIntegrity can compare against it afterwards.
  public func snapshotIntegrity(store : NftStore) : MintIntegrity {
    let ids = List.empty<Nat>();
    for ((id, _) in store.entries()) {
      ids.add(id);
    };
    { preCount = store.size(); preExistingIds = ids.toArray() }
  };

  // [NFT-INTEGRITY] Post-mint integrity check. Verifies the mint/claim was
  // PURELY ADDITIVE: the post-mint count equals pre-mint count + 1, every
  // pre-existing NFT id is still listed, and the newly minted id is present.
  // If any invariant fails, returns #err so the caller can surface a clear
  // error and roll back the freshly minted NFT (leaving the catalog unchanged).
  public func verifyMintIntegrity(store : NftStore, snapshot : MintIntegrity, newId : Nat) : Result.Result<(), Text> {
    let postCount = store.size();
    let expected = snapshot.preCount + 1;
    if (postCount != expected) {
      return #err("Mint integrity check failed: expected post-mint count " # expected.toText() # " but got " # postCount.toText());
    };
    for (id in snapshot.preExistingIds.values()) {
      switch (store.get(id)) {
        case (null) {
          return #err("Mint integrity check failed: pre-existing NFT id " # id.toText() # " is missing after mint");
        };
        case (?_) {};
      };
    };
    switch (store.get(newId)) {
      case (null) {
        return #err("Mint integrity check failed: newly minted NFT id " # newId.toText() # " is not present after mint");
      };
      case (?_) {};
    };
    #ok()
  };

  // [NFT-INTEGRITY] Hard-removes a single NFT from the store. Used ONLY as the
  // rollback for a failed post-mint integrity check, where the freshly minted
  // NFT must be removed to leave the catalog exactly as it was before the mint.
  // This is NOT a general delete path — deleteNft/burnNft use softDeleteNft/
  // burnNft (status transitions) to preserve audit history.
  public func removeNft(store : NftStore, id : Nat) {
    store.remove(id);
  };

  // [NFT-INTEGRITY] Stable-storage integrity guard. Verifies the NFT store is
  // intact (not wiped to empty by a reinstall/Init-style migration). Returns
  // the current NFT count so an operator can manually confirm the catalog
  // survived an upgrade/reinstall. This is a MANUAL diagnostic — it does NOT
  // perform automated alerting (out of scope).
  public func countNfts(store : NftStore) : Nat {
    store.size()
  };

  // [NFT-INTEGRITY] Count of NFTs owned by a given principal (any status).
  // Account-scoped counterpart to countNfts (store-wide). Used by the public
  // getCatalogIntegrity diagnostic so the frontend can distinguish 'catalog is
  // empty' (store-wide zero) from 'no NFTs for this account' (store has NFTs
  // but none owned by the caller).
  public func countNftsByOwner(store : NftStore, ownerId : Principal) : Nat {
    var count = 0;
    for ((_, nft) in store.entries()) {
      if (Principal.equal(nft.ownerId, ownerId)) {
        count += 1;
      };
    };
    count
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

  // [NFT-INTEGRITY] Redacts the sensitive bearer-style fields (discountCode,
  // membershipId) from a VerifyResult. Applied ONLY on the PUBLIC verify paths
  // (verifyNftPublic, verifyNftByCreatorId) so redacted fields are never
  // re-exposed to unauthenticated callers. Admin-gated surfaces
  // (verifyNftByCreatorIdWithHistory) keep the full VerifyResult.
  public func redactVerifyResult(r : Types.VerifyResult) : Types.VerifyResult {
    { r with discountCode = null; membershipId = null }
  };

  // [NFT-INTEGRITY] Redacts the sensitive bearer-style fields (discountCode,
  // membershipId) from a full Nft record. Applied on authenticated query paths
  // (getNft, listMyNfts, listMyActiveNfts) so redacted fields are never
  // re-exposed to non-admin callers, consistent with the redaction already
  // applied to the public verify paths. They remain only in admin-gated
  // surfaces.
  public func redactNft(n : Types.Nft) : Types.Nft {
    { n with discountCode = null; membershipId = null }
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

  public type ImageFormatError = { message : Text };

  /// Magic-byte allowlist: accept ONLY JPEG, PNG, WebP. Rejects everything else
  /// (including SVG, which starts with '<' rather than a binary magic header).
  /// No separate SVG check is needed — the allowlist implicitly excludes it.
  /// Pure function — unit-testable without canister/auth context.
  public func validateImageFormat(imageBlob : Storage.ExternalBlob) : Result.Result<(), ImageFormatError> {
    let blobSize = imageBlob.size();
    let isJpeg = blobSize >= 3
      and imageBlob[0] == 0xFF
      and imageBlob[1] == 0xD8
      and imageBlob[2] == 0xFF;
    let isPng = blobSize >= 4
      and imageBlob[0] == 0x89
      and imageBlob[1] == 0x50
      and imageBlob[2] == 0x4E
      and imageBlob[3] == 0x47;
    let isWebp = blobSize >= 12
      and imageBlob[0] == 0x52 // 'R'
      and imageBlob[1] == 0x49 // 'I'
      and imageBlob[2] == 0x46 // 'F'
      and imageBlob[3] == 0x46 // 'F'
      and imageBlob[8] == 0x57 // 'W'
      and imageBlob[9] == 0x45 // 'E'
      and imageBlob[10] == 0x42 // 'B'
      and imageBlob[11] == 0x50; // 'P'
    if (not isJpeg and not isPng and not isWebp) {
      return #err({ message = "Unsupported image format. Only JPEG, PNG, and WebP are allowed." });
    };
    #ok()
  };

  /// Trailing-byte rejection: reject non-zero bytes after the format's EOF marker.
  /// Find the LAST occurrence of the marker (JPEG FF D9 and PNG IEND can appear
  /// inside compressed data, so a first-occurrence scan would reject valid images).
  /// - JPEG: scan for the last FF D9; reject non-zero bytes after it.
  /// - PNG: scan for the last IEND chunk trailer (49 45 4E 44 AE 42 60 82);
  ///   reject non-zero bytes after the 8-byte trailer.
  /// - WebP: RIFF size bounding. Parse the u32 LE declared size at offset 4-7
  ///   and require the blob length to equal exactly 8 + declared_size. This
  ///   rejects any trailing bytes beyond the RIFF container and any declared
  ///   size that is inconsistent with the actual blob length. The WebP FourCC
  ///   allowlist walk is performed separately by validateWebpChunks.
  /// Pure function — unit-testable without canister/auth context.
  public func validateTrailingBytes(imageBlob : Storage.ExternalBlob) : Result.Result<(), ImageFormatError> {
    let blobSize = imageBlob.size();
    // Detect format from magic bytes (mirrors validateImageFormat).
    let isJpeg = blobSize >= 3
      and imageBlob[0] == 0xFF
      and imageBlob[1] == 0xD8
      and imageBlob[2] == 0xFF;
    let isPng = blobSize >= 4
      and imageBlob[0] == 0x89
      and imageBlob[1] == 0x50
      and imageBlob[2] == 0x4E
      and imageBlob[3] == 0x47;
    let isWebp = blobSize >= 12
      and imageBlob[0] == 0x52
      and imageBlob[1] == 0x49
      and imageBlob[2] == 0x46
      and imageBlob[3] == 0x46
      and imageBlob[8] == 0x57
      and imageBlob[9] == 0x45
      and imageBlob[10] == 0x42
      and imageBlob[11] == 0x50;
    if (isJpeg) {
      var lastEoi : Nat = 0;
      var foundEoi : Bool = false;
      var i = 0;
      while (i + 1 < blobSize) {
        if (imageBlob[i] == 0xFF and imageBlob[i + 1] == 0xD9) {
          lastEoi := i;
          foundEoi := true;
        };
        i += 1;
      };
      if (foundEoi) {
        var j = lastEoi + 2;
        while (j < blobSize) {
          if (imageBlob[j] != 0x00) {
            return #err({ message = "Invalid JPEG: trailing bytes after EOI marker" });
          };
          j += 1;
        };
      } else {
        // A JPEG without any FF D9 marker is malformed.
        return #err({ message = "Invalid JPEG: missing EOI marker" });
      };
    } else if (isPng) {
      // PNG IEND chunk: 4-byte length (0x00000000) + 4-byte type "IEND" + 4-byte CRC.
      // The unique trailer is "IEND" + CRC = 49 45 4E 44 AE 42 60 82 (8 bytes).
      // Scan for the last occurrence of this 8-byte sequence.
      var lastIend : Nat = 0;
      var foundIend : Bool = false;
      var i = 0;
      while (i + 8 <= blobSize) {
        if (imageBlob[i] == 0x49 // 'I'
          and imageBlob[i + 1] == 0x45 // 'E'
          and imageBlob[i + 2] == 0x4E // 'N'
          and imageBlob[i + 3] == 0x44 // 'D'
          and imageBlob[i + 4] == 0xAE
          and imageBlob[i + 5] == 0x42
          and imageBlob[i + 6] == 0x60
          and imageBlob[i + 7] == 0x82) {
          lastIend := i;
          foundIend := true;
        };
        i += 1;
      };
      if (foundIend) {
        var j = lastIend + 8;
        while (j < blobSize) {
          if (imageBlob[j] != 0x00) {
            return #err({ message = "Invalid PNG: trailing bytes after IEND chunk" });
          };
          j += 1;
        };
      } else {
        // A PNG without an IEND chunk is malformed/truncated.
        return #err({ message = "Invalid PNG: missing IEND chunk" });
      };
    } else if (isWebp) {
      // WebP RIFF size bounding (replaces the v249 unconditional #ok skip).
      // RIFF layout: bytes 0-3 = "RIFF", bytes 4-7 = u32 LE declared payload
      // size (includes "WEBP " + chunks, NOT the 8-byte RIFF header itself),
      // bytes 8-11 = "WEBP". The total file size must equal 8 + declared_size.
      // Reject if declared size is inconsistent with the actual blob size.
      if (blobSize < 12) {
        return #err({ message = "Invalid WebP: blob too small for RIFF header" });
      };
      let declaredSize = imageBlob[4].toNat()
        + imageBlob[5].toNat() * 256
        + imageBlob[6].toNat() * 65536
        + imageBlob[7].toNat() * 16777216;
      // declared_size must be at least 4 (to contain the "WEBP" FourCC).
      if (declaredSize < 4) {
        return #err({ message = "Invalid WebP: RIFF declared size too small to contain WEBP header" });
      };
      // Total file size must equal 8 (RIFF header) + declared_size.
      if (blobSize != 8 + declaredSize) {
        return #err({ message = "Invalid WebP: RIFF declared size does not match blob length" });
      };
      // Reject any bytes beyond 8 + declared_size — already enforced by the
      // exact-equality check above, so no trailing bytes can exist.
    } else {
      // Not a recognized format — validateImageFormat is responsible for that
      // check; here we just pass through (no trailing-byte opinion).
      return #ok();
    };
    #ok()
  };

  /// [IMGVAL] Format-dispatched structural validation. Detects the image
  /// format from magic bytes (the same isJpeg/isPng/isWebp checks used by
  /// validateTrailingBytes and validateImageFormat) and runs ONLY the matching
  /// structural validator. A JPEG runs validateJpegMarkers and skips the PNG
  /// and WebP validators entirely (and symmetrically for PNG/WebP). An unknown
  /// format returns #ok — by the time this runs, validateImageFormat has
  /// already rejected anything that is not JPEG/PNG/WebP, so reaching the
  /// else-branch with #ok preserves the existing early-return behavior.
  /// Pure function — unit-testable without canister/auth context.
  public func validateStructure(imageBlob : Storage.ExternalBlob) : Result.Result<(), ImageFormatError> {
    let blobSize = imageBlob.size();
    let isJpeg = blobSize >= 3
      and imageBlob[0] == 0xFF
      and imageBlob[1] == 0xD8
      and imageBlob[2] == 0xFF;
    let isPng = blobSize >= 4
      and imageBlob[0] == 0x89
      and imageBlob[1] == 0x50
      and imageBlob[2] == 0x4E
      and imageBlob[3] == 0x47;
    let isWebp = blobSize >= 12
      and imageBlob[0] == 0x52
      and imageBlob[1] == 0x49
      and imageBlob[2] == 0x46
      and imageBlob[3] == 0x46
      and imageBlob[8] == 0x57
      and imageBlob[9] == 0x45
      and imageBlob[10] == 0x42
      and imageBlob[11] == 0x50;
    if (isJpeg) {
      validateJpegMarkers(imageBlob);
    } else if (isPng) {
      validatePngChunks(imageBlob);
    } else if (isWebp) {
      validateWebpChunks(imageBlob);
    } else {
      // Unknown format — validateImageFormat already rejected it earlier;
      // preserve the existing early-return behavior by passing through.
      #ok();
    };
  };

  /// JPEG marker allowlist walk. After SOI (FF D8), walk markers and allow only:
  /// SOI (FFD8), SOF0 (FFC0), SOF2 (FFC2), DHT (FFC4), DQT (FFDB), SOS (FFDA),
  /// EOI (FFD9), RSTn (FFD0-FFD7), APP0/JFIF (FFE0), APP2/ICC (FFE2). Reject
  /// COM (FFFE), reserved JPG (FFC8), JPGn (FFF0-FFFD), APP1/EXIF (FFE1), and
  /// any non-allowlisted marker. SOI and EOI have 0-length segments (no length
  /// field); every other allowlisted marker is followed by a 2-byte big-endian
  /// length that includes its own 2 bytes, and the segment must fit within the
  /// blob. SOS is followed by entropy-coded data terminated by the next marker
  /// (no length walk past SOS — scan for the next FF-prefixed marker, skipping
  /// FF 00 stuffing). Pure function — unit-testable without canister/auth
  /// context.
  public func validateJpegMarkers(imageBlob : Storage.ExternalBlob) : Result.Result<(), ImageFormatError> {
    let blobSize = imageBlob.size();
    // Must start with SOI (FF D8).
    if (blobSize < 2 or imageBlob[0] != 0xFF or imageBlob[1] != 0xD8) {
      return #err({ message = "Invalid JPEG: missing SOI marker" });
    };
    var i = 2;
    var sawSos = false;
    var sawEoi = false;
    while (i < blobSize) {
      // Find the next marker: a 0xFF byte. In entropy-coded data after SOS,
      // 0xFF 00 is byte-stuffing (literal 0xFF in the stream) and is skipped;
      // any other 0xFF xx introduces a real marker.
      if (imageBlob[i] != 0xFF) {
        // If we are past SOS, this is entropy-coded data — scan forward for
        // the next 0xFF. If we are NOT past SOS, a non-0xFF byte outside a
        // marker segment is malformed.
        if (sawSos) {
          i += 1;
          continue;
        } else {
          return #err({ message = "Invalid JPEG: unexpected byte outside marker segment" });
        };
      };
      // We are at a 0xFF. Skip any fill bytes (multiple 0xFF in a row before
      // the actual marker tag) per the JPEG spec.
      var markerStart = i;
      while (markerStart < blobSize and imageBlob[markerStart] == 0xFF) {
        markerStart += 1;
      };
      if (markerStart >= blobSize) {
        return #err({ message = "Invalid JPEG: truncated marker after fill bytes" });
      };
      let tag = imageBlob[markerStart];
      // 0xFF 00 is byte-stuffing inside entropy-coded data — skip both bytes.
      if (tag == 0x00) {
        if (not sawSos) {
          return #err({ message = "Invalid JPEG: byte-stuffing 0xFF00 outside entropy data" });
        };
        i := markerStart + 1;
        continue;
      };
      // SOI: 0-length segment, no length field. Must only appear at start.
      if (tag == 0xD8) {
        return #err({ message = "Invalid JPEG: SOI marker must only appear at start" });
      };
      // EOI: 0-length segment, no length field. Must be the last marker.
      if (tag == 0xD9) {
        sawEoi := true;
        // EOI should be the final meaningful byte; any bytes after EOI are
        // rejected by validateTrailingBytes. Here we just stop the walk.
        return #ok();
      };
      // RSTn (FFD0-FFD7): 0-length segment, no length field. Only valid
      // inside entropy-coded data (after SOS).
      if (tag >= 0xD0 and tag <= 0xD7) {
        if (not sawSos) {
          return #err({ message = "Invalid JPEG: RSTn marker outside entropy data" });
        };
        i := markerStart + 1;
        continue;
      };
      // Allowlisted markers with a 2-byte length field:
      //   SOF0 (C0), SOF2 (C2), DHT (C4), DQT (DB), SOS (DA), APP0/JFIF (E0),
      //   APP2/ICC (E2).
      let isAllowlisted = switch (tag) {
        case (0xC0) true; // SOF0
        case (0xC2) true; // SOF2
        case (0xC4) true; // DHT
        case (0xDB) true; // DQT
        case (0xDA) true; // SOS
        case (0xE0) true; // APP0/JFIF
        case (0xE2) true; // APP2/ICC color profile
        case (_) false;
      };
      if (not isAllowlisted) {
        // Explicitly rejected markers (fail-closed with a specific message):
        if (tag == 0xFE) {
          return #err({ message = "Invalid JPEG: COM marker not allowed (0xFFFE)" });
        };
        if (tag == 0xC8) {
          return #err({ message = "Invalid JPEG: reserved JPG marker not allowed (0xFFC8)" });
        };
        if (tag >= 0xF0 and tag <= 0xFD) {
          return #err({ message = "Invalid JPEG: JPGn marker not allowed (0xFF" # nat8ToHex(tag) # ")" });
        };
        if (tag == 0xE1) {
          return #err({ message = "Invalid JPEG: APP1/EXIF marker not allowed (0xFFE1)" });
        };
        return #err({ message = "Invalid JPEG: non-allowlisted marker 0xFF" # nat8ToHex(tag) });
      };
      // Need 2 bytes for the length field after the tag byte.
      let lenOffset = markerStart + 1;
      if (lenOffset + 1 >= blobSize) {
        return #err({ message = "Invalid JPEG: truncated marker length field" });
      };
      let segLen = imageBlob[lenOffset].toNat() * 256 + imageBlob[lenOffset + 1].toNat();
      // The length includes its own 2 bytes, so it must be >= 2.
      if (segLen < 2) {
        return #err({ message = "Invalid JPEG: marker segment length < 2" });
      };
      // The segment (length field + remaining segment bytes) must fit in blob.
      // segLen covers [lenOffset .. lenOffset + segLen - 1].
      if (lenOffset + segLen > blobSize) {
        return #err({ message = "Invalid JPEG: marker segment exceeds blob bounds" });
      };
      if (tag == 0xDA) {
        // SOS: after the SOS header segment, entropy-coded data begins. We
        // stop walking structured markers here and scan for the next real
        // marker (FF xx where xx != 00 and xx != FF).
        sawSos := true;
        i := lenOffset + segLen;
        continue;
      };
      // For non-SOS markers, advance past the entire segment.
      i := lenOffset + segLen;
    };
    if (not sawEoi) {
      return #err({ message = "Invalid JPEG: missing EOI marker" });
    };
    #ok()
  };

  /// PNG chunk-type allowlist walk. After the 8-byte signature, walk chunks.
  /// Allow only raster-essential chunk types: IHDR, PLTE, IDAT, IEND, tRNS,
  /// gAMA, cHRM, sRGB, pHYs, bKGD, tIME. Reject caBX (C2PA/JUMBF), iCCP, sPLT,
  /// tEXt, iTXt, zTXt, and any non-allowlisted chunk type. Each chunk is:
  /// 4-byte big-endian length + 4-byte type + length bytes data + 4-byte CRC.
  /// IHDR must be first; IEND must be present and last. Fixed-length chunks
  /// are pinned: pHYs=9, sRGB=1, gAMA=4, cHRM=32. Pure function.
  public func validatePngChunks(imageBlob : Storage.ExternalBlob) : Result.Result<(), ImageFormatError> {
    let blobSize = imageBlob.size();
    // Must start with the 8-byte PNG signature. Typed as [Nat8] so the
    // per-byte comparison against imageBlob[s] (Nat8) is type-consistent
    // (avoids M0062 Nat8-vs-Nat incompatible-comparison warning).
    let sig : [Nat8] = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    if (blobSize < 8) {
      return #err({ message = "Invalid PNG: blob too small for signature" });
    };
    var s = 0;
    while (s < 8) {
      if (imageBlob[s] != sig[s]) {
        return #err({ message = "Invalid PNG: bad signature" });
      };
      s += 1;
    };
    var i = 8;
    var sawIhdr = false;
    var sawIend = false;
    while (i + 8 <= blobSize) {
      if (sawIend) {
        // validateTrailingBytes handles bytes after IEND; here we just stop.
        return #ok();
      };
      let dataLen = imageBlob[i].toNat() * 16777216
        + imageBlob[i + 1].toNat() * 65536
        + imageBlob[i + 2].toNat() * 256
        + imageBlob[i + 3].toNat();
      let t0 = imageBlob[i + 4];
      let t1 = imageBlob[i + 5];
      let t2 = imageBlob[i + 6];
      let t3 = imageBlob[i + 7];
      // Chunk type as 4 chars for comparison. Uses the non-deprecated
      // Nat.toNat32 + Nat32.toChar conversions (replaces the deprecated
      // Nat32.fromNat + Char.fromNat32 pair flagged by M0154).
      let typeText = t0.toNat().toNat32().toChar().toText()
        # t1.toNat().toNat32().toChar().toText()
        # t2.toNat().toNat32().toChar().toText()
        # t3.toNat().toNat32().toChar().toText();
      // Allowlist check.
      let isAllowlisted = switch (typeText) {
        case ("IHDR") true;
        case ("PLTE") true;
        case ("IDAT") true;
        case ("IEND") true;
        case ("tRNS") true;
        case ("gAMA") true;
        case ("cHRM") true;
        case ("sRGB") true;
        case ("pHYs") true;
        case ("bKGD") true;
        case ("tIME") true;
        case (_) false;
      };
      if (not isAllowlisted) {
        // Explicitly rejected chunk types (fail-closed with specific messages):
        if (typeText == "caBX") {
          return #err({ message = "Invalid PNG: caBX (C2PA/JUMBF) chunk not allowed" });
        };
        if (typeText == "iCCP") {
          return #err({ message = "Invalid PNG: iCCP chunk not allowed" });
        };
        if (typeText == "sPLT") {
          return #err({ message = "Invalid PNG: sPLT chunk not allowed" });
        };
        if (typeText == "tEXt") {
          return #err({ message = "Invalid PNG: tEXt chunk not allowed" });
        };
        if (typeText == "iTXt") {
          return #err({ message = "Invalid PNG: iTXt chunk not allowed" });
        };
        if (typeText == "zTXt") {
          return #err({ message = "Invalid PNG: zTXt chunk not allowed" });
        };
        return #err({ message = "Invalid PNG: non-allowlisted chunk type " # typeText });
      };
      // IHDR must be the first chunk.
      if (typeText == "IHDR") {
        if (sawIhdr) {
          return #err({ message = "Invalid PNG: multiple IHDR chunks" });
        };
        if (i != 8) {
          return #err({ message = "Invalid PNG: IHDR must be the first chunk" });
        };
        sawIhdr := true;
      } else {
        if (not sawIhdr) {
          return #err({ message = "Invalid PNG: chunk before IHDR" });
        };
      };
      // Fixed-length chunk pinning.
      let expectedLen : ?Nat = switch (typeText) {
        case ("pHYs") ?9;
        case ("sRGB") ?1;
        case ("gAMA") ?4;
        case ("cHRM") ?32;
        case (_) null;
      };
      switch (expectedLen) {
        case (?fixed) {
          if (dataLen != fixed) {
            return #err({ message = "Invalid PNG: " # typeText # " chunk length must be " # fixed.toText() # ", got " # dataLen.toText() });
          };
        };
        case (null) {};
      };
      // The full chunk is 4 (len) + 4 (type) + dataLen (data) + 4 (CRC).
      let chunkEnd = i + 4 + 4 + dataLen + 4;
      if (chunkEnd > blobSize) {
        return #err({ message = "Invalid PNG: chunk " # typeText # " exceeds blob bounds" });
      };
      if (typeText == "IEND") {
        if (dataLen != 0) {
          return #err({ message = "Invalid PNG: IEND chunk must have length 0" });
        };
        sawIend := true;
      };
      i := chunkEnd;
    };
    if (not sawIhdr) {
      return #err({ message = "Invalid PNG: missing IHDR chunk" });
    };
    if (not sawIend) {
      return #err({ message = "Invalid PNG: missing IEND chunk" });
    };
    #ok()
  };

  /// WebP FourCC allowlist walk. After RIFF bounding (performed in
  /// validateTrailingBytes' WebP branch), walk the WebP chunks starting at
  /// offset 12 (after "RIFF" + size + "WEBP"). Allow only VP8, VP8L, VP8X,
  /// ALPH, ANIM, ANMF FourCCs. Reject EXIF, XMP, ICCP, PSAI and any
  /// non-allowlisted FourCC. Each chunk is: 4-byte FourCC + 4-byte LE size +
  /// size bytes data (+ 1 pad byte if size is odd). Validate chunk sizes
  /// against the RIFF declared size. Pure function.
  public func validateWebpChunks(imageBlob : Storage.ExternalBlob) : Result.Result<(), ImageFormatError> {
    let blobSize = imageBlob.size();
    if (blobSize < 12) {
      return #err({ message = "Invalid WebP: blob too small for RIFF/WEBP header" });
    };
    // RIFF declared size (bytes 4-7, little-endian). Total file = 8 + declared.
    let declaredSize = imageBlob[4].toNat()
      + imageBlob[5].toNat() * 256
      + imageBlob[6].toNat() * 65536
      + imageBlob[7].toNat() * 16777216;
    if (declaredSize < 4) {
      return #err({ message = "Invalid WebP: RIFF declared size too small" });
    };
    if (blobSize != 8 + declaredSize) {
      return #err({ message = "Invalid WebP: RIFF declared size does not match blob length" });
    };
    // Chunks live in [12 .. 8 + declaredSize). The "WEBP" FourCC occupies
    // bytes 8-11, so chunk data starts at offset 12.
    let riffEnd = 8 + declaredSize;
    var i = 12;
    var sawBitstream = false;
    while (i + 8 <= riffEnd) {
      let f0 = imageBlob[i];
      let f1 = imageBlob[i + 1];
      let f2 = imageBlob[i + 2];
      let f3 = imageBlob[i + 3];
      let fourcc = f0.toNat().toNat32().toChar().toText()
        # f1.toNat().toNat32().toChar().toText()
        # f2.toNat().toNat32().toChar().toText()
        # f3.toNat().toNat32().toChar().toText();
      let isAllowlisted = switch (fourcc) {
        case ("VP8 ") true;
        case ("VP8L") true;
        case ("VP8X") true;
        case ("ALPH") true;
        case ("ANIM") true;
        case ("ANMF") true;
        case (_) false;
      };
      if (not isAllowlisted) {
        if (fourcc == "EXIF") {
          return #err({ message = "Invalid WebP: EXIF chunk not allowed" });
        };
        if (fourcc == "XMP ") {
          return #err({ message = "Invalid WebP: XMP chunk not allowed" });
        };
        if (fourcc == "ICCP") {
          return #err({ message = "Invalid WebP: ICCP chunk not allowed" });
        };
        if (fourcc == "PSAI") {
          return #err({ message = "Invalid WebP: PSAI chunk not allowed" });
        };
        return #err({ message = "Invalid WebP: non-allowlisted FourCC " # fourcc });
      };
      // 4-byte little-endian chunk size after the FourCC.
      let chunkSize = imageBlob[i + 4].toNat()
        + imageBlob[i + 5].toNat() * 256
        + imageBlob[i + 6].toNat() * 65536
        + imageBlob[i + 7].toNat() * 16777216;
      // Chunk payload occupies [i+8 .. i+8+chunkSize).
      let payloadEnd = i + 8 + chunkSize;
      if (payloadEnd > riffEnd) {
        return #err({ message = "Invalid WebP: " # fourcc # " chunk exceeds RIFF bounds" });
      };
      // RIFF chunks are padded to even size: if chunkSize is odd, a single
      // pad byte follows the payload.
      var nextChunk = payloadEnd;
      if (chunkSize % 2 == 1) {
        nextChunk += 1;
        if (nextChunk > riffEnd) {
          return #err({ message = "Invalid WebP: " # fourcc # " chunk pad byte exceeds RIFF bounds" });
        };
      };
      if (fourcc == "VP8 " or fourcc == "VP8L" or fourcc == "VP8X") {
        sawBitstream := true;
      };
      i := nextChunk;
    };
    if (not sawBitstream) {
      return #err({ message = "Invalid WebP: missing bitstream chunk (VP8/VP8L/VP8X)" });
    };
    #ok()
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
      let valid = switch (c.toText()) {
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
