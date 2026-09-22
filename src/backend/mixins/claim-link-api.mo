import Queue "mo:core/Queue";
import Result "mo:core/Result";
import Principal "mo:core/Principal";
import Auth "../lib/auth";
import NftLib "../lib/nft";
import ClaimLib "../lib/claim-link";
import NftTypes "../types/nft";
import ClaimTypes "../types/claim-link";
import Common "../types/common";
import Time "mo:core/Time";
import UserLib "../lib/user";
import Random "mo:core/Random";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Debug "mo:core/Debug";
import ReferralLib "../lib/referral-rewards";
import ReferralTypes "../types/referral-rewards";

mixin (
  nftStore : NftLib.NftStore,
  claimTokenStore : ClaimLib.ClaimTokenStore,
  claimersStore : ClaimLib.ClaimersStore,
  nftToClaimToken : ClaimLib.NftToClaimStore,
  globalAuditLog : Queue.Queue<Common.AuditEntry>,
  userStore : UserLib.UserStore,
  nextNftId : { var value : Nat },
  selfCanisterId : { var value : Text },
  admins : { var value : [Principal] },
  // [H3] DEDICATED transient rate-limit store for claimNft, SEPARATE from the
  // shared rateLimitStore. The NFT mint rate-limiter (mixins/nft-api.mo
  // checkRateLimit) shares rateLimitStore and resets windowStart/count on
  // every mint; if claimNft used the same store, an attacker minting a single
  // NFT between claim attempts would reset the claim window and bypass the
  // 1-claim-per-60s limit. Transient (rebuilt empty on every restart) —
  // rate-limit state is not durable and does not need to survive upgrades, so
  // no migration is required and the actor's stable state shape is unchanged.
  claimRateLimitStore : Map.Map<Principal, { var lastClaimSec : Int }>,
  // Referral-rewards stores required for the claimNft referral-recording +
  // synchronous auto-award path. claimNft now accepts an optional ?ref code;
  // after a successful claim it calls ReferralLib.recordReferral to increment
  // the referrer's referralsCount, and if the referrer crosses an in-stock
  // referralBonus NFT threshold (and is not already in awardedTiers for that
  // tier), it triggers the synchronous auto-award by calling
  // claimNftInternal(referrer, internalToken, null) — reusing the SAME
  // validation path as the public claim (anonymous reject, [H3] rate limit,
  // token validation, supply cap, assertClaimable, atomic useToken, [H2]
  // counter-ordering, new NFT copy). If no in-stock bonus NFT exists at
  // trigger time, the referrer is moved to eligible-pending (handled inside
  // ReferralLib.recordReferral). Deactivation preserves pending eligibility.
  referralCodeStore : ReferralLib.ReferralCodeStore,
  eligiblePendingStore : ReferralLib.EligiblePendingStore,
) {

  /// Admin-only: generate a shareable claim URL for a specific NFT.
  /// Returns the relative path "/claim/" # token.
  public shared ({ caller }) func generateClaimLink(nftId : Nat) : async Result.Result<Text, Text> {
    // Admin check FIRST — bypass profile fetch and tier check entirely
    if (not Auth.isAdmin(caller, admins.value)) {
      // Non-admin: fetch profile and enforce tier restriction
      let callerProfile = switch (UserLib.getProfile(userStore, caller)) {
        case (?profile) { profile };
        case (null) {
          return #err("User profile not found. Please create a profile first.");
        };
      };
      let isPaidTier = switch (callerProfile.subscriptionTier) {
        case (#creator) { true };
        case (#pro) { true };
        case (#org) { true };
        case (_) { false };
      };
      if (not isPaidTier) {
        return #err("Free tier cannot generate claim links. Upgrade to Creator, Pro, or Org.");
      };
    };
    // Fetch NFT, validate it exists and is active
    switch (nftStore.get(nftId)) {
      case (null) { return #err("NFT not found") };
      case (?nft) {
        if (nft.status != #active) {
          return #err("Cannot generate claim link: NFT is not active");
        };
        // Use ICP randomness for unpredictable token
        let randomBytes = await Random.blob();
        let token = ClaimLib.buildToken(randomBytes);
        let now = Time.now();
        ClaimLib.storeToken(claimTokenStore, nftToClaimToken, nftId, token, now, nft.supplyLimit, 0);
        #ok("/claim/" # token)
      };
    }
  };

  /// Admin-only: return claim status for a given NFT.
  public query ({ caller }) func getClaimStatus(nftId : Nat) : async Result.Result<ClaimTypes.ClaimStatus, Text> {
    // Admin-only guard using Auth
    if (not Auth.isAdmin(caller, admins.value)) {
      return #err("Unauthorized: Admin only");
    };
    switch (ClaimLib.getTokenForNft(nftToClaimToken, nftId)) {
      case (null) {
        // No token ever generated for this NFT
        #ok({ token = ""; claimed = false; claimedBy = null; supplyLimit = 0; claimedCount = 0 })
      };
      case (?tokenStr) {
        switch (ClaimLib.getToken(claimTokenStore, tokenStr)) {
          case (null) {
            // Token entry missing (shouldn't happen, but handle gracefully)
            #ok({ token = tokenStr; claimed = false; claimedBy = null; supplyLimit = 0; claimedCount = 0 })
          };
          case (?claimToken) {
            #ok({
              token = tokenStr;
              claimed = claimToken.claimedCount >= claimToken.supplyLimit;
              claimedBy = claimToken.usedBy;
              supplyLimit = claimToken.supplyLimit;
              claimedCount = claimToken.claimedCount;
            })
          };
        }
      };
    }
  };

  /// NON-PUBLIC internal claim path. Contains the canonical validation flow
  /// (anonymous reject, [H3] rate limit, token validation, supply cap,
  /// assertClaimable, atomic useToken, [H2] counter-ordering, new NFT copy).
  /// This is the SAME flow the public claimNft uses; it is now extracted as a
  /// PUBLIC function in lib/claim-link.mo (ClaimLib.claimNftInternal) so the
  /// referral auto-award and the retroactive batch-award can REUSE the
  /// canonical mint path instead of creating a parallel mint. This mixin
  /// delegates to ClaimLib.claimNftInternal with all the shared stores.
  ///
  /// `claimer` is the principal who will own the new NFT copy. For a public
  /// claim this is the caller; for an auto-award this is the referrer; for a
  /// batch-award this is the eligible-pending referrer. `ref` is the optional
  /// referral code presented by the claimant — it is ONLY acted on by the
  /// PUBLIC claimNft wrapper (which records the referral + triggers the
  /// auto-award AFTER this internal func returns #ok). When the auto-award or
  /// batch-award calls this internal func, it passes `null` for ref so no
  /// referral is recorded on an auto-award (the referrer is being awarded,
  /// not referring).

  /// Public: claim an NFT by presenting a valid token. Creates a NEW NFT copy
  /// from the master; master NFT is never modified. Accepts an optional
  /// referral code (`ref`) — if present and valid, the referrer's
  /// referralsCount is incremented after a successful claim, and if the
  /// referrer now meets/exceeds a threshold for an active in-stock
  /// referralBonus NFT (and is not already in awardedTiers for that tier),
  /// the referrer is auto-awarded via claimNftInternal(referrer, internalToken,
  /// null) — reusing the SAME validation path as this claim. If the bonus NFT
  /// is sold out at trigger time, the referrer is moved to eligible-pending
  /// (handled inside ReferralLib.recordReferral). Self-referrals (referrer ==
  /// claimer) are rejected. Unknown/invalid ref codes fail OPEN — the claim
  /// still succeeds; only the referral recording is skipped (a bad ref must
  /// never block a legitimate claim).
  public shared ({ caller }) func claimNft(token : Text, ref : ?Text) : async Result.Result<NftTypes.Nft, Text> {
    // Run the canonical validation + mint flow via the lib's internal func.
    let claimResult = ClaimLib.claimNftInternal(
      caller,
      token,
      ref,
      nftStore,
      claimTokenStore,
      claimersStore,
      globalAuditLog,
      nextNftId,
      selfCanisterId,
      claimRateLimitStore,
    );
    switch (claimResult) {
      case (#err(msg)) {
        // Claim failed — do NOT record any referral. Return the error.
        return #err(msg);
      };
      case (#ok(newNft)) {
        // Claim succeeded. Now handle the optional referral code.
        switch (ref) {
          case (null) {
            // No referral code presented — nothing to record.
            return #ok(newNft);
          };
          case (?refCode) {
            // [REFERRAL] Resolve the referrer from the code. Codes never
            // expire (NO EXPIRY). Fail OPEN on unknown/invalid codes — a bad
            // ref must never block a legitimate claim that already succeeded.
            let mapping = ReferralLib.resolveReferralCode(referralCodeStore, refCode);
            switch (mapping) {
              case (null) {
                Debug.print("[REFERRAL] claimNft: unknown ref code '" # refCode # "' — claim succeeds, referral skipped (fail open)");
                return #ok(newNft);
              };
              case (?m) {
                // Reject self-referrals — a referrer cannot refer themselves.
                // Fail OPEN here too (do not revert the successful claim);
                // the self-referral is simply not recorded.
                if (Principal.equal(m.referrerPrincipal, caller)) {
                  Debug.print("[REFERRAL] claimNft: self-referral rejected (referrer == claimer) — claim succeeds, referral skipped");
                  return #ok(newNft);
                };
                // Record the referral: increment the referrer's
                // referralsCount. If no in-stock bonus NFT exists at the
                // crossed threshold, this also enqueues the referrer as
                // eligible-pending (deactivation preserves pending
                // eligibility). If an in-stock bonus NFT exists, the lib
                // returns the crossed thresholdTier so we can trigger the
                // synchronous auto-award below.
                let now : Common.Timestamp = Int.abs(Time.now());
                let result = ReferralLib.recordReferral(
                  userStore,
                  referralCodeStore,
                  eligiblePendingStore,
                  nftStore,
                  refCode,
                  now,
                );
                Debug.print("[REFERRAL] claimNft: recorded referral for referrer " # m.referrerPrincipal.toText() # " newCount=" # result.newReferralsCount.toText() # " newlyEligiblePending=" # debug_show(result.newlyEligiblePending));
                // [AUTO-AWARD] Synchronous auto-award: if the lib found an
                // in-stock bonus NFT whose threshold was just crossed (and
                // the referrer is not already in awardedTiers for that
                // tier), trigger the auto-award by reusing
                // claimNftInternal(referrer, internalToken, null). This goes
                // through the SAME validation path as the public claim
                // (anonymous reject, [H3] rate limit, token validation,
                // supply cap, assertClaimable, atomic useToken, [H2]
                // counter-ordering, new NFT copy). Pass null for ref so no
                // referral is recorded on the auto-award (the referrer is
                // being awarded, not referring).
                switch (result.thresholdTier) {
                  case (null) {
                    // No in-stock bonus NFT crossed — the referrer was
                    // either enqueued as eligible-pending (handled inside
                    // recordReferral) or no threshold was crossed. Nothing
                    // more to do.
                    return #ok(newNft);
                  };
                  case (?tier) {
                    // The lib found an in-stock bonus NFT for this tier.
                    // Re-lookup the in-stock bonus NFT to get its nftId
                    // (recordReferral returns the tier, not the nftId).
                    let awardedTiers = switch (userStore.get(m.referrerPrincipal)) {
                      case (null) { [] };
                      case (?p) { p.awardedTiers };
                    };
                    let bonusNft = ReferralLib.findInStockBonusNft(nftStore, result.newReferralsCount, awardedTiers);
                    switch (bonusNft) {
                      case (null) {
                        // Race: the in-stock bonus NFT was available when
                        // recordReferral checked, but is no longer in-stock
                        // now (e.g. another concurrent claim took the last
                        // copy). Move the referrer to eligible-pending by
                        // re-running recordReferral's enqueue path. The
                        // simplest correct action is to call recordReferral
                        // again — it is idempotent for the count (the
                        // referrer's count was already incremented) BUT it
                        // would double-increment. Instead, we rely on the
                        // eligible-pending enqueue having already happened
                        // inside recordReferral if no in-stock NFT existed
                        // at that time. Since recordReferral returned a
                        // non-null thresholdTier, it found an in-stock NFT
                        // and did NOT enqueue. So we must enqueue here.
                        // Use the lib's eligible-pending store directly:
                        // the referrer crossed `tier` with no in-stock NFT
                        // at this moment, so enqueue them.
                        let entry : ReferralTypes.EligiblePendingEntry = {
                          referrerPrincipal = m.referrerPrincipal;
                          thresholdTier = tier;
                          enqueuedAt = now;
                        };
                        switch (eligiblePendingStore.get(m.referrerPrincipal)) {
                          case (?existing) {
                            let keepEarliest = if (existing.enqueuedAt < now) { existing.enqueuedAt } else { now };
                            let newTier = if (tier > existing.thresholdTier) { tier } else { existing.thresholdTier };
                            eligiblePendingStore.add(m.referrerPrincipal, { entry with thresholdTier = newTier; enqueuedAt = keepEarliest });
                          };
                          case (null) {
                            eligiblePendingStore.add(m.referrerPrincipal, entry);
                          };
                        };
                        Debug.print("[AUTO-AWARD] referrer " # m.referrerPrincipal.toText() # " crossed tier " # tier.toText() # " but bonus NFT sold out at trigger time — moved to eligible-pending");
                        return #ok(newNft);
                      };
                      case (?bonus) {
                        // Look up the existing claim token for the master
                        // bonus NFT. The admin must have generated a claim
                        // link for the referralBonus NFT (via
                        // generateClaimLink) so a token exists. If no token
                        // exists, the auto-award cannot proceed via the
                        // canonical path — move the referrer to
                        // eligible-pending (deactivation preserves pending
                        // eligibility; the next batch-award cycle will
                        // retry once an admin generates a token).
                        switch (nftToClaimToken.get(bonus.nftId)) {
                          case (null) {
                            let entry : ReferralTypes.EligiblePendingEntry = {
                              referrerPrincipal = m.referrerPrincipal;
                              thresholdTier = tier;
                              enqueuedAt = now;
                            };
                            switch (eligiblePendingStore.get(m.referrerPrincipal)) {
                              case (?existing) {
                                let keepEarliest = if (existing.enqueuedAt < now) { existing.enqueuedAt } else { now };
                                let newTier = if (tier > existing.thresholdTier) { tier } else { existing.thresholdTier };
                                eligiblePendingStore.add(m.referrerPrincipal, { entry with thresholdTier = newTier; enqueuedAt = keepEarliest });
                              };
                              case (null) {
                                eligiblePendingStore.add(m.referrerPrincipal, entry);
                              };
                            };
                            Debug.print("[AUTO-AWARD] no claim token for bonus NFT " # bonus.nftId.toText() # " — referrer " # m.referrerPrincipal.toText() # " moved to eligible-pending (admin must generate a claim link for the referralBonus NFT)");
                            return #ok(newNft);
                          };
                          case (?internalToken) {
                            // Trigger the synchronous auto-award via
                            // ClaimLib.claimNftInternal reuse. Pass null for ref.
                            switch (ClaimLib.claimNftInternal(
                              m.referrerPrincipal,
                              internalToken,
                              null,
                              nftStore,
                              claimTokenStore,
                              claimersStore,
                              globalAuditLog,
                              nextNftId,
                              selfCanisterId,
                              claimRateLimitStore,
                            )) {
                              case (#err(msg)) {
                                // Auto-award failed (sold out, rate-limited,
                                // or token invalid). Move the referrer to
                                // eligible-pending (deactivation preserves
                                // pending eligibility; the next batch-award
                                // cycle will retry).
                                let entry : ReferralTypes.EligiblePendingEntry = {
                                  referrerPrincipal = m.referrerPrincipal;
                                  thresholdTier = tier;
                                  enqueuedAt = now;
                                };
                                switch (eligiblePendingStore.get(m.referrerPrincipal)) {
                                  case (?existing) {
                                    let keepEarliest = if (existing.enqueuedAt < now) { existing.enqueuedAt } else { now };
                                    let newTier = if (tier > existing.thresholdTier) { tier } else { existing.thresholdTier };
                                    eligiblePendingStore.add(m.referrerPrincipal, { entry with thresholdTier = newTier; enqueuedAt = keepEarliest });
                                  };
                                  case (null) {
                                    eligiblePendingStore.add(m.referrerPrincipal, entry);
                                  };
                                };
                                Debug.print("[AUTO-AWARD] auto-award failed for referrer " # m.referrerPrincipal.toText() # ": " # msg # " — moved to eligible-pending");
                              };
                              case (#ok(_)) {
                                // Auto-award succeeded — append the awarded
                                // tier (dedup by tier) and dequeue any
                                // eligible-pending entry for this referrer.
                                ReferralLib.appendAwardedTier(userStore, m.referrerPrincipal, tier);
                                ReferralLib.dequeueEligiblePending(eligiblePendingStore, m.referrerPrincipal);
                                Debug.print("[AUTO-AWARD] auto-awarded referrer " # m.referrerPrincipal.toText() # " tier " # tier.toText());
                              };
                            };
                          };
                        };
                      };
                    };
                    return #ok(newNft);
                  };
                };
              };
            };
          };
        };
      };
    };
  };

  /// Public (unauthenticated): retrieve NFT metadata for the claim page preview.
  /// Does NOT modify state; returns error if token invalid or NFT not claimable.
  public query func getClaimPreview(token : Text) : async Result.Result<ClaimTypes.ClaimPreview, Text> {
    // Validate token exists
    let claimToken = switch (ClaimLib.getToken(claimTokenStore, token)) {
      case (null) { return #err("Invalid or expired claim token") };
      case (?ct) { ct };
    };
    // Validate link is not fully redeemed (reusable up to supplyLimit)
    if (claimToken.claimedCount >= claimToken.supplyLimit) {
      return #err("Claim link is fully redeemed");
    };
    // Fetch NFT and validate it is active
    switch (nftStore.get(claimToken.nftId)) {
      case (null) { #err("NFT not found") };
      case (?nft) {
        if (nft.status != #active) {
          return #err("NFT is not available for claiming");
        };
        #ok({
          nft;
          supplyLimit = claimToken.supplyLimit;
          claimedCount = claimToken.claimedCount;
        })
      };
    }
  };

  /// PUBLIC (unauthenticated): per-NFT claim counts for every NFT that has a
  /// ClaimToken. Returns an array of { nftId, claimedCount, supplyLimit } —
  /// ONLY those three fields. No token string, usedBy, usedAt, or any Nft
  /// redacted field (discountCode, membershipId) is exposed. Read-only; does
  /// not mutate any store. This is the public surface for the Library card
  /// indicator. Sits alongside getClaimPreview in the public-no-auth query
  /// list. v251 security redactions preserved — only nftId/claimedCount/
  /// supplyLimit are surfaced.
  public query func getNftClaimCounts() : async [ClaimTypes.NftClaimCount] {
    ClaimLib.getNftClaimCounts(claimTokenStore)
  };
}
