import Map "mo:core/Map";
import _Set "mo:core/Set";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import Entity "mo:caffeineai-oql/Entity";
// OQL per-primitive `_toRow` instances — must be top-level imports in the
// file that declares entities; the implicit-argument resolver does not walk
// submodules, so `OQL.NatValue` etc. re-exported via lib.mo do NOT satisfy
// `.payload`'s implicit `V -> Value` argument.
import _OqlNatValue "mo:caffeineai-oql/NatValue";
import _OqlIntValue "mo:caffeineai-oql/IntValue";
import _OqlTextValue "mo:caffeineai-oql/TextValue";
import _OqlPrincipalValue "mo:caffeineai-oql/PrincipalValue";
import _Common "types/common";
import NftTypes "types/nft";
import _UserTypes "types/user";
import NftLib "lib/nft";
import UserLib "lib/user";

import NftMixin "mixins/nft-api";
import UserMixin "mixins/user-api";

import Runtime "mo:core/Runtime";


import Principal "mo:core/Principal";
import StripeMixin "mixins/stripe-api";
import List "mo:core/List";
import Queue "mo:core/Queue";
import _PaymentProofTypes "types/payment-proof";
import PaymentProofLib "lib/payment-proof";
import PaymentProofMixin "mixins/payment-proof-api";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Result "mo:core/Result";
import _ClaimTypes "types/claim-link";
import ClaimLinkLib "lib/claim-link";
import ClaimLinkMixin "mixins/claim-link-api";
import CollectionMixin "mixins/collections-api";
import Array "mo:core/Array";
import MetricsMixin "mixins/metrics-api";
import _MetricsLib "lib/metrics";
import Time "mo:core/Time";
import Auth "lib/auth";
import Text "mo:core/Text";
import Debug "mo:core/Debug";

actor Main {
  let nftStore : NftLib.NftStore;
  let collectionStore : NftLib.CollectionStore;
  let userStore : UserLib.UserStore;


  let nextNftId : { var value : Nat };
  let nextCollectionId : { var value : Nat };
  let selfCanisterId : { var value : Text };
  let rateLimitStore : Map.Map<Principal, {var count : Nat; var windowStart : Nat}>;
  // [ADMIN-RATELIMIT] Dedicated transient rate-limit store for setupAdmin(),
  // SEPARATE from rateLimitStore. The NFT rate-limiter (mixins/nft-api.mo
  // checkRateLimit) shares rateLimitStore and resets windowStart/count on
  // every mint; if setupAdmin used the same store, an attacker minting a
  // single NFT between setupAdmin attempts would reset the hourly counter to
  // 1 and bypass the 3-attempts/hour limit entirely. This dedicated store
  // is transient (rebuilt empty on every restart) — rate-limit state is not
  // durable state and does not need to survive upgrades, so no migration is
  // required and the actor's stable state shape is unchanged.
  transient let setupAdminRateLimitStore : Map.Map<Principal, {var count : Nat; var windowStart : Nat}> = Map.empty();
  let stripeConfigStore : { var secretKey : ?Text; var publicKey : ?Text };
  let verifiedEmails : { verifiedEmails : _Set.Set<Text> };
  let lastMintTime : { var value : Int };
  let mintCount : { var value : Nat };
  let paymentProofStore : PaymentProofLib.PaymentProofStore;
  let globalAuditLog : Queue.Queue<_Common.AuditEntry>;
  let creatorIndex : Map.Map<Text, List.List<Nat>>;
  let claimTokenStore : ClaimLinkLib.ClaimTokenStore;
  // Per-principal dedup store for reusable claim links: token Text -> Set of
  // principals who have already claimed that token. STABLE actor field so the
  // dedup set SURVIVES upgrades (a transient store would reset on every
  // redeploy, silently re-eligibilizing every prior claimer — defeating the
  // point of dedup for any drop running across an upgrade). A SEPARATE stable
  // variable from claimTokenStore so adding it does NOT change the ClaimToken
  // record shape and does NOT trigger M0170. Initialized empty on fresh
  // installs by the migration chain; no migration file required for a new
  // stable field under enhanced orthogonal persistence.
  let claimersStore : ClaimLinkLib.ClaimersStore;
  let backendBuildTimestamp : { var value : Nat };
  let nftToClaimToken : ClaimLinkLib.NftToClaimStore;

  // adminPrincipals is a mutable record wrapper so mixins (which capture the
  // record by reference) always read the current array via .value. This matches
  // the selfCanisterId pattern. Initialized empty on fresh installs by the
  // migration chain; the seedAdminsIfLive() helper below seeds the two
  // hardcoded PIDs ONLY on the LIVE canister. On draft it stays empty until
  // setupAdmin() is called once.
  let adminPrincipals : { var value : [Principal] };

  // Known LIVE backend canister id. Anything else is draft.
  transient let LIVE_CANISTER_ID : Text = "kd6s6-ziaaa-aaaam-ajfwa-cai";
  transient let LIVE_ADMIN_1 : Principal = Principal.fromText("e4ok7-bgcq7-gib2e-vvxbv-soaw7-nkf2r-h3sth-afp3p-dmd7e-hdmqj-nqe");
  transient let LIVE_ADMIN_2 : Principal = Principal.fromText("krtlu-ux45b-xojnq-2au32-wgntc-3xk5u-6ne45-d6ll3-rad2l-5p5r4-aae");

  // selfCanisterId is declared without an inline initializer (required under
  // --enhanced-migration). It is seeded with a safe empty default by
  // seedSelfCanisterIdIfEmpty() in the actor body. setupAdmin() computes
  // liveness directly from selfCanisterId.value == LIVE_CANISTER_ID rather
  // than relying on this transient flag, so isLive.value remaining at its
  // declaration default (false) is the intended pre-v212 behavior.
  transient let isLive : { var value : Bool } = { var value = false };

  // Private helper that seeds adminPrincipals with the two hardcoded LIVE PIDs
  // if and only if (a) we are on the LIVE canister AND (b) adminPrincipals is
  // currently empty. On draft this is a no-op, leaving adminPrincipals empty
  // so setupAdmin() can claim the first admin.
  //
  // FRESH-INSTALL SEEDING GAP (documented limitation):
  // A brand-new canister install runs ONLY the actor body — neither
  // preupgrade() nor postupgrade() runs on the very first deploy. The actor
  // body cannot call Principal.fromActor(Main) under --enhanced-migration, so
  // it cannot self-identify as live vs draft at init time. Therefore a
  // genuinely fresh LIVE install has an empty adminPrincipals until the FIRST
  // upgrade runs postupgrade() and seeds the two LIVE PIDs. This is an
  // accepted platform constraint, not a bug — standard Caffeine deploy flows
  // include an upgrade step that triggers postupgrade() and seeds the admins.
  private func seedAdminsIfLive() {
    if (selfCanisterId.value == LIVE_CANISTER_ID and adminPrincipals.value.size() == 0) {
      adminPrincipals.value := [LIVE_ADMIN_1, LIVE_ADMIN_2];
    };
  };

  // Private helper that seeds selfCanisterId.value with the REAL canister id
  // (Principal.fromActor(Main).toText()) if it is currently empty. This is the
  // single wiring fix that makes the existing liveness check
  // (selfCanisterId.value == LIVE_CANISTER_ID) actually return true on the
  // live canister and false on draft. Without this, selfCanisterId.value stays
  // empty on every canister (the migration chain initializes it to ""), so
  // every liveness comparison is always false and the setupAdmin()
  // hard-reject-on-live guard (and the postupgrade defense-in-depth seeding
  // guard) NEVER fire — letting every new user claim admin on the live
  // canister. The 5 existing query methods (getCanisterId, getCanisterIdSafe,
  // verifyNftPublic, verifyNftByCreatorId, verifyNftByCreatorIdWithHistory)
  // already prove Principal.fromActor(Main).toText() works in this actor.
  // Idempotent: only assigns when the value is empty, so postupgrade()'s
  // unconditional re-sync (which runs first on upgrades) does not conflict.
  // Called directly in the actor body BEFORE the system funcs so it runs on
  // both fresh installs and upgrades (mirroring the actor-body init pattern
  // used for admin seeding).
  private func seedSelfCanisterIdIfEmpty() {
    if (selfCanisterId.value == "") {
      selfCanisterId.value := Principal.fromActor(Main).toText();
    };
  };

  seedSelfCanisterIdIfEmpty();

  system func postupgrade() {
    // Re-sync selfCanisterId.value with the REAL canister id as the FIRST
    // statement in postupgrade(), BEFORE backendBuildTimestamp, BEFORE
    // seedAdminsIfLive(), and BEFORE the defense-in-depth seeding guard below.
    // This is required because: (a) a future migration could carry a stale or
    // empty selfCanisterId.value, and (b) the seeding guards below key on
    // (selfCanisterId.value == LIVE_CANISTER_ID) — if the id is stale/empty
    // when those guards run, they evaluate to false and live admins are NOT
    // re-seeded after the migration resets adminPrincipals to []. The 5
    // existing query methods prove Principal.fromActor(Main).toText() works in
    // this actor. This is the upgrade-path counterpart to
    // seedSelfCanisterIdIfEmpty() (which handles fresh installs in the actor
    // body).
    selfCanisterId.value := Principal.fromActor(Main).toText();
    Debug.print("[ADMIN-SELFID] postupgrade: resolved selfCanisterId.value = " # selfCanisterId.value);
    backendBuildTimestamp.value := Int.abs(Time.now());
    // Re-seed the two LIVE_ADMIN PIDs on the live canister after every
    // upgrade. On draft this is a no-op (the isLive check inside
    // seedAdminsIfLive guards it). The migration chain resets
    // adminPrincipals to [] unconditionally, so this re-seed is what
    // restores live admins post-upgrade.
    seedAdminsIfLive();
    // [ADMIN-SEED] Defense-in-depth lockout-prevention guard: if we are on
    // the LIVE canister AND adminPrincipals is STILL empty after
    // seedAdminsIfLive() ran, re-seed it with the two LIVE_ADMIN PIDs
    // directly. This guards against any latent bug in seedAdminsIfLive()
    // (e.g. isLive.value being stale) that would otherwise leave a live
    // canister with zero admins — an unrecoverable lockout. On draft this
    // branch never fires (live=false), so the first-caller setupAdmin()
    // claim flow is unaffected.
    if (selfCanisterId.value == LIVE_CANISTER_ID and adminPrincipals.value.size() == 0) {
      Debug.print("[ADMIN-SEED] postupgrade: live canister had empty adminPrincipals after seedAdminsIfLive — re-seeding LIVE_ADMIN PIDs as lockout-prevention guard");
      adminPrincipals.value := [LIVE_ADMIN_1, LIVE_ADMIN_2];
    };
  };

  include ClaimLinkMixin(nftStore, claimTokenStore, claimersStore, nftToClaimToken, globalAuditLog, userStore, nextNftId, selfCanisterId, adminPrincipals);

  include MixinObjectStorage();

  include MixinViews();

  // OQL (Data Intelligence) — exposes schema() and execute(qJson) query
  // methods. One entity per persisted store; all use the default
  // #controllerOnly auth (private to users, readable by the Data
  // Intelligence agent). Variants/options/nested fields are projected to
  // OQL.Value sentinels via .payload extractors.
  include Expose({
    entities = [
      // nftStore : Map<Nat, Nft>
      OQL.Entity.manual<(Nat, NftTypes.Nft)>(
        "nft",
        func() = nftStore.entries(),
        "Nft",
        "id",
      )
        .payload("id", func((_, n)) = n.id)
        .payload("ownerId", func((_, n)) = n.ownerId)
        .payload("creatorId", func((_, n)) = n.creatorId)
        .payload("assetHash", func((_, n)) = n.assetHash)
        .payload("title", func((_, n)) = n.title)
        .payload("description", func((_, n)) = n.description)
        .payload("edition", func((_, n)) = n.edition)
        .payload("mintDate", func((_, n)) = n.mintDate)
        .payload("claimedAt", func((_, n)) = switch (n.claimedAt) { case (?v) v; case null 0 })
        .payload("status", func((_, n)) : Text = switch (n.status) { case (#active) "active"; case (#deleted) "deleted"; case (#burned) "burned" })
        .payload("auditHistoryCount", func((_, n)) = n.auditHistory.size())
        .payload("collectionId", func((_, n)) = switch (n.collectionId) { case (?v) v; case null 0 })
        .payload("businessName", func((_, n)) = switch (n.businessName) { case (?v) v; case null "" })
        .payload("website", func((_, n)) = switch (n.website) { case (?v) v; case null "" })
        .payload("discountCode", func((_, n)) = switch (n.discountCode) { case (?v) v; case null "" })
        .payload("membershipId", func((_, n)) = switch (n.membershipId) { case (?v) v; case null "" })
        .payload("rewardTier", func((_, n)) : Text = switch (n.rewardTier) { case (#none) "none"; case (#bronze) "bronze"; case (#silver) "silver"; case (#gold) "gold"; case (#platinum) "platinum" })
        .payload("nftUniqueId", func((_, n)) = n.nftUniqueId)
        .payload("tagsCount", func((_, n)) = n.tags.size())
        .payload("supplyLimit", func((_, n)) = n.supplyLimit)
        .controllerOnly()
        .build(),

      // collectionStore : Map<Nat, Collection>
      OQL.Entity.manual<(Nat, NftTypes.Collection)>(
        "collection",
        func() = collectionStore.entries(),
        "Collection",
        "id",
      )
        .payload("id", func((_, c)) = c.id)
        .payload("ownerId", func((_, c)) = c.ownerId)
        .payload("name", func((_, c)) = c.name)
        .payload("description", func((_, c)) = c.description)
        .payload("tier", func((_, c)) : Text = switch (c.tier) { case (#free) "free"; case (#creator) "creator"; case (#pro) "pro"; case (#org) "org" })
        .payload("maxSize", func((_, c)) = c.maxSize)
        .payload("createdAt", func((_, c)) = c.createdAt)
        .payload("previewImage", func((_, c)) = switch (c.previewImage) { case (?v) v; case null "" })
        .payload("nftIdsCount", func((_, c)) = c.nftIds.size())
        .controllerOnly()
        .build(),

      // userStore : Map<Principal, UserProfile>
      OQL.Entity.manual<(Principal, _UserTypes.UserProfile)>(
        "userProfile",
        func() = userStore.entries(),
        "UserProfile",
        "principalId",
      )
        .payload("principalId", func((p, _)) = p)
        .payload("creatorId", func((_, u)) = u.creatorId)
        .payload("oisyWalletAddress", func((_, u)) = switch (u.oisyWalletAddress) { case (?v) v; case null "" })
        .payload("email", func((_, u)) = switch (u.email) { case (?v) v; case null "" })
        .payload("emailAlertsCount", func((_, u)) = u.emailAlerts.size())
        .payload("subscriptionTier", func((_, u)) : Text = switch (u.subscriptionTier) { case (#free) "free"; case (#creator) "creator"; case (#pro) "pro"; case (#org) "org" })
        .payload("creditsUsed", func((_, u)) = u.creditsUsed)
        .payload("creditsTotal", func((_, u)) = u.creditsTotal)
        .payload("creditsResetAt", func((_, u)) = u.creditsResetAt)
        .payload("activeSlots", func((_, u)) = u.activeSlots)
        .payload("maxSlots", func((_, u)) = u.maxSlots)
        .payload("createdAt", func((_, u)) = u.createdAt)
        .payload("stripeProductId", func((_, u)) = switch (u.stripeProductId) { case (?v) v; case null "" })
        .controllerOnly()
        .build(),

      // paymentProofStore : Map<Text, PaymentProof>
      OQL.Entity.manual<(Text, _PaymentProofTypes.PaymentProof)>(
        "paymentProof",
        func() = paymentProofStore.entries(),
        "PaymentProof",
        "id",
      )
        .payload("id", func((_, p)) = p.id)
        .payload("principal", func((_, p)) = p.principal)
        .payload("txHash", func((_, p)) = p.txHash)
        .payload("tierRequested", func((_, p)) = p.tierRequested)
        .payload("networkType", func((_, p)) = p.networkType)
        .payload("status", func((_, p)) : Text = switch (p.status) { case (#pending) "pending"; case (#approved) "approved"; case (#rejected) "rejected" })
        .payload("submittedAt", func((_, p)) = p.submittedAt)
        .payload("reviewedAt", func((_, p)) = switch (p.reviewedAt) { case (?v) v; case null 0 })
        .payload("reviewedBy", func((_, p)) = switch (p.reviewedBy) { case (?v) v; case null Principal.fromText("aaaaa-aa") })
        .payload("rejectionReason", func((_, p)) = switch (p.rejectionReason) { case (?v) v; case null "" })
        .controllerOnly()
        .build(),

      // claimTokenStore : Map<Text, ClaimToken>
      OQL.Entity.manual<(Text, _ClaimTypes.ClaimToken)>(
        "claimToken",
        func() = claimTokenStore.entries(),
        "ClaimToken",
        "token",
      )
        .payload("nftId", func((_, t)) = t.nftId)
        .payload("token", func((_, t)) = t.token)
        .payload("createdAt", func((_, t)) = t.createdAt)
        .payload("usedBy", func((_, t)) = switch (t.usedBy) { case (?v) v; case null Principal.fromText("aaaaa-aa") })
        .payload("usedAt", func((_, t)) = switch (t.usedAt) { case (?v) v; case null 0 })
        .payload("supplyLimit", func((_, t)) = t.supplyLimit)
        .payload("claimedCount", func((_, t)) = t.claimedCount)
        .controllerOnly()
        .build(),
    ];
  });

  include NftMixin(nftStore, collectionStore, nextNftId, nextCollectionId, rateLimitStore, userStore, selfCanisterId, creatorIndex, claimTokenStore, nftToClaimToken, adminPrincipals);
  include UserMixin(userStore, nftStore, globalAuditLog, selfCanisterId, adminPrincipals);
  include PaymentProofMixin(paymentProofStore, userStore, globalAuditLog, adminPrincipals);
  include StripeMixin(stripeConfigStore, globalAuditLog, adminPrincipals);
  include CollectionMixin(collectionStore, nftStore);
  include MetricsMixin(nftStore, collectionStore, userStore, rateLimitStore, claimTokenStore, nftToClaimToken, creatorIndex, paymentProofStore, globalAuditLog, selfCanisterId, backendBuildTimestamp, adminPrincipals);


  public shared query ({ caller }) func isAdmin() : async Bool {
    Auth.isAdmin(caller, adminPrincipals.value)
  };

  // PUBLIC (non-admin-gated) query that tells a non-admin frontend whether a
  // REAL admin has been claimed on this canister. A "real" admin is any PID in
  // adminPrincipals that is NOT one of the two hardcoded LIVE_ADMIN PIDs. This
  // mirrors setupAdmin()'s effectivelyEmpty logic exactly so the frontend and
  // backend agree on what counts as a real admin: on draft, adminPrincipals
  // containing only the LIVE_ADMIN PIDs (seeded unconditionally by migration
  // 20260625_000001) is treated as "no real admin set", letting the Settings
  // page distinguish 'no admin set' from 'admin exists but you are not one'.
  public shared query func hasRealAdmin() : async Bool {
    let live : Bool = selfCanisterId.value == LIVE_CANISTER_ID;
    let admins = adminPrincipals.value;
    let onlyLivePids : Bool = admins.all(
      func(p : Principal) : Bool {
        Principal.equal(p, LIVE_ADMIN_1) or Principal.equal(p, LIVE_ADMIN_2)
      },
    );
    let effectivelyEmpty : Bool = admins.size() == 0 or (not live and onlyLivePids);
    not effectivelyEmpty
  };

  // ONE-SHOT first-caller-becomes-admin. Returns false if an admin is already
  // set (either by setupAdmin on draft or by seedAdminsIfLive on live). On the
  // LIVE canister this always returns false because admins are seeded at
  // postupgrade() time.
  public shared ({ caller }) func setupAdmin() : async Bool {
    // HARD REJECT ON LIVE — first logic in the function. Compute liveness
    // directly from selfCanisterId (NOT the transient isLive.value flag,
    // which resets to false on every canister restart and is therefore
    // unreliable for guard logic). On live, setupAdmin() ALWAYS returns
    // false — unconditionally, before rate-limiting, before any admin-claim
    // logic. No effectivelyEmpty bypass, no first-caller path, no
    // rate-limiting-as-protection on live. The hard reject IS the protection
    // on live. Live admins are seeded exclusively by seedAdminsIfLive() in
    // postupgrade().
    let live : Bool = selfCanisterId.value == LIVE_CANISTER_ID;
    if (live) {
      return false;
    };

    // [ADMIN-RATELIMIT] Per-principal rate-limit gate at the TOP of
    // setupAdmin(), before any admin-claim logic runs. Prevents an attacker
    // from repeatedly calling setupAdmin() to race-claim admin on a live
    // canister with an empty admin list. Uses the DEDICATED
    // setupAdminRateLimitStore (NOT the shared rateLimitStore) so the NFT
    // rate-limiter's window resets cannot interfere with this hourly count.
    // Same sliding-window pattern as checkRateLimit in mixins/nft-api.mo,
    // adapted to an hourly window (3 attempts per principal per hour). The
    // legitimate first claim is never blocked: the first call always passes
    // (count starts at 1). Only ABUSIVE repeated calls beyond the limit are
    // rejected.
    //
    // NOTE: On live this block is unreachable — the hard reject above returns
    // before rate-limiting even runs. The rate-limiter is harmless on draft
    // and is NOT the protection on live.
    //
    // Window: 1 hour = 3_600_000_000_000 nanoseconds (Time.now() is ns).
    // Max attempts: 3 per principal per hour.
    let now : Nat = Int.abs(Time.now());
    let windowNs : Nat = 3_600_000_000_000;
    let maxAttempts : Nat = 3;
    switch (setupAdminRateLimitStore.get(caller)) {
      case (null) {
        let entry = { var count = 1; var windowStart = now };
        setupAdminRateLimitStore.add(caller, entry);
      };
      case (?entry) {
        let elapsed : Nat = if (entry.windowStart >= now) { 0 } else { Nat.sub(now, entry.windowStart) };
        if (elapsed > windowNs) {
          entry.count := 1;
          entry.windowStart := now;
          setupAdminRateLimitStore.add(caller, entry);
        } else {
          if (entry.count >= maxAttempts) {
            Debug.print("[ADMIN-RATELIMIT] setupAdmin rate limit exceeded for caller — blocking repeated admin-claim attempt");
            Runtime.trap("Rate limit exceeded: too many setupAdmin attempts, please wait an hour before retrying");
          };
          entry.count += 1;
          setupAdminRateLimitStore.add(caller, entry);
        };
      };
    };

    // On draft, adminPrincipals may contain only the two hardcoded LIVE admin
    // PIDs seeded by migration 20260625_000001 (which runs unconditionally on
    // ALL canisters, including draft). Those PIDs are live-canister-only
    // identities and are NOT real admins on draft. Draft canisters rotate
    // (recycled by Caffeine after long idle periods) and the developer must be
    // able to re-claim admin on every fresh login attempt, so on draft ANY
    // adminPrincipals state is treated as effectively empty — the first
    // authenticated caller always wins and overwrites adminPrincipals.value :=
    // [caller]. The live path is unreachable here because the hard reject at
    // the top of this function already returned false when live=true.
    let admins = adminPrincipals.value;
    let onlyLivePids : Bool = admins.all(
      func(p : Principal) : Bool {
        Principal.equal(p, LIVE_ADMIN_1) or Principal.equal(p, LIVE_ADMIN_2)
      },
    );
    // On draft (live=false), effectivelyEmpty is ALWAYS true regardless of
    // admins content — first caller always wins. The `not live and
    // onlyLivePids` term is kept for documentation parity with hasRealAdmin()
    // but is redundant once `not live` is true.
    let effectivelyEmpty : Bool = admins.size() == 0 or (not live) or (not live and onlyLivePids);

    // Draft-only path (live path already returned false above). Block only if
    // there is a real (non-live-PID) admin already set.
    if (not effectivelyEmpty) {
      return false;
    };

    adminPrincipals.value := [caller];
    true
  };

  // Admin-gated. Appends p if not already present. Returns false if caller is
  // not an admin or if p is already an admin.
  public shared ({ caller }) func addAdmin(p : Principal) : async Bool {
    if (not Auth.isAdmin(caller, adminPrincipals.value)) {
      return false;
    };
    if (adminPrincipals.value.find(func x = Principal.equal(x, p)) != null) {
      return false;
    };
    adminPrincipals.value := adminPrincipals.value.concat([p]);
    true
  };

  // Admin-gated. Removes p if present. Refuses to remove the last admin
  // (adminPrincipals must never become empty). Returns false if caller is not
  // an admin, if p is not an admin, or if p is the only admin.
  public shared ({ caller }) func removeAdmin(p : Principal) : async Bool {
    if (not Auth.isAdmin(caller, adminPrincipals.value)) {
      return false;
    };
    let remaining = adminPrincipals.value.filter(func x = not Principal.equal(x, p));
    if (remaining.size() == adminPrincipals.value.size()) {
      // p was not an admin; nothing to remove.
      return false;
    };
    if (remaining.size() == 0) {
      // Guard against removing the last admin.
      return false;
    };
    adminPrincipals.value := remaining;
    true
  };

  // Admin-gated. Returns [] for non-admin callers, the current admin list for
  // admins.
  public query ({ caller }) func listAdmins() : async [Principal] {
    if (not Auth.isAdmin(caller, adminPrincipals.value)) {
      return [];
    };
    adminPrincipals.value
  };

  public query func getCanisterId() : async Text {
    let canisterId = Principal.fromActor(Main).toText();
    if (canisterId == "") {
      selfCanisterId.value
    } else {
      canisterId
    }
  };

  public query func getCanisterIdSafe() : async Text {
    let canisterId = Principal.fromActor(Main).toText();
    if (canisterId == "") {
      selfCanisterId.value
    } else {
      canisterId
    }
  };

  // Lets the frontend determine draft-vs-live at runtime without baking any
  // canister ID into the frontend bundle. Frontend reads /env.json for the
  // actor id and calls this query to gate live-only UI.
  public query func isLiveCanister() : async Bool {
    return selfCanisterId.value == LIVE_CANISTER_ID;
  };

  // computeNftUniqueId is defined in the NftMixin

  // These public query wrappers resolve the real canisterId using
  // Principal.fromActor(Main) — available in actor scope but not in mixin files.
  // The mixin provides non-public internal helpers that accept canisterId as a param.

  public query func verifyNftPublic(nftUniqueId : Text) : async Result.Result<NftTypes.VerifyResult, Text> {
    verifyNftPublicInternal(nftUniqueId, Principal.fromActor(Main).toText())
  };

  public query func verifyNftByCreatorId(creatorId : Text) : async Result.Result<[NftTypes.VerifyResult], Text> {
    verifyNftByCreatorIdInternal(creatorId, Principal.fromActor(Main).toText())
  };

  public query ({ caller }) func verifyNftByCreatorIdWithHistory(creatorId : Text) : async Result.Result<[NftTypes.VerifyResult], Text> {
    if (not Auth.isAdmin(caller, adminPrincipals.value)) {
      return #err("Unauthorized: Admin only");
    };
    verifyNftByCreatorIdWithHistoryInternal(creatorId, Principal.fromActor(Main).toText())
  };

  // Collection NFT assignment endpoints are included via CollectionMixin

};
