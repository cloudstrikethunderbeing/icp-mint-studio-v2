/**
 * helpCopy.ts — single source of truth for ALL user-facing copy on the
 * /how-it-works page. Tweak wording here, not in components.
 *
 * Plain-language only. No internal terms verbatim:
 *  - "common NFT"      -> "free claimable drop" / "free NFT"
 *  - "trial"           -> (removed; describe actual cooldown behavior)
 *  - "deactivate/reactivate" -> "turn on / off by choosing the reward type"
 *  - "eligible-pending"     -> "waiting for a reward" / "we'll notify you"
 *  - "batch award"          -> "award bonuses in batches"
 *  - "auto-award trigger"   -> "we'll notify you"
 */

/** A single help card on the How It Works page. */
export interface HelpCard {
  /** Stable id used for keys and data-ocid markers. */
  id: string;
  /** Short card title shown above the bullets. */
  title: string;
  /** Emoji string used as the card icon. */
  icon: string;
  /** 3-4 plain-language bullets explaining the step. */
  bullets: string[];
}

/** Tab labels for the Collector / Minter switch. */
export const helpTabs = {
  collector: "Collector",
  minter: "Minter",
} as const;

/** Page hero copy. */
export const helpHero = {
  title: "How It Works",
  subtitle:
    "Everything you need to know about claiming free NFTs, earning referral bonuses, and (for minters) running your own drops.",
} as const;

/**
 * Collector journey — 7 cards in user-journey order.
 * Plain-language only. Edge cases (wallet not connected, claim already used,
 * sold-out drops, waiting-for-reward) are folded into the relevant card's
 * bullets per the spec.
 */
export const collectorCards: HelpCard[] = [
  {
    id: "claim-free-nft",
    title: "Claim a free NFT",
    icon: "🎁",
    bullets: [
      "Free claimable NFTs are drops anyone can claim at no cost — just connect your wallet and click Claim.",
      "Connecting uses Internet Identity, a secure wallet for the Internet Computer. You'll approve the connection once per session.",
      "If your wallet isn't connected yet, the Claim button will ask you to connect first — no charge, just a quick sign-in.",
      "If a drop has already been claimed for your wallet, you'll see a clear message instead of a second copy — each wallet can claim a given drop once.",
    ],
  },
  {
    id: "share-for-bonus",
    title: "Share for a bonus",
    icon: "🔗",
    bullets: [
      "After you claim, use the Share on X button to post your unique referral link.",
      "Your referral link is tied to your wallet — anyone who claims a free NFT through it counts toward your bonus.",
      "Sharing doesn't cost anything and doesn't share your wallet address; it only spreads your referral link.",
    ],
  },
  {
    id: "track-progress",
    title: "Track your progress",
    icon: "📊",
    bullets: [
      "Your referral count lives on your Dashboard — open it any time to see how many people have claimed through your link.",
      "When someone claims through your link, you'll see the count go up. Bonuses aren't handed out instantly — they're held until the minter releases them.",
      "If your count is rising but you don't have a bonus yet, you're waiting for a reward. You've earned a bonus — we'll notify you when one is available!",
      "There's nothing you need to do while waiting; the minter controls when bonuses are released.",
    ],
  },
  {
    id: "claim-bonus",
    title: "Claim your bonus",
    icon: "✨",
    bullets: [
      "When a bonus is ready for you, a banner appears at the top of your Dashboard and Library pages.",
      "The banner tells you a bonus is available and walks you through claiming it.",
      "If you don't see a banner, you're still waiting for a reward — check back after the minter releases the next batch.",
    ],
  },
  {
    id: "browse-library",
    title: "Browse the Library",
    icon: "📚",
    bullets: [
      "The Library lists every free claimable drop, each with a claim count showing how many have been taken.",
      "The 'X/Y claimed' badge shows how many wallets have claimed out of the total supply the minter set.",
      "If a drop is sold out, you'll see a 'This drop is sold out' message and the Claim button is disabled — try another drop or check back later.",
    ],
  },
  {
    id: "verify-nft",
    title: "Verify an NFT",
    icon: "🛡️",
    bullets: [
      "The Verify flow lets you confirm an NFT you hold is genuine and recorded on the Internet Computer.",
      "Open Verify, pick the NFT from your wallet, and the app checks it against the on-chain record.",
      "Verification is read-only — it never moves or spends your NFT.",
    ],
  },
  {
    id: "after-you-claim",
    title: "After you claim",
    icon: "✅",
    bullets: [
      "Right after a successful claim you'll see a success screen confirming the NFT is yours.",
      "Your new NFT shows up in your Library and Profile shortly after — refresh if you don't see it right away.",
      "From there you can share your referral link, verify the NFT, or browse other free drops.",
    ],
  },
];

/**
 * Minter journey — 5 cards in user-journey order.
 * Plain-language only. No "trial" wording (describe the actual cooldown),
 * no "deactivate/reactivate" wording (describe choosing the reward type).
 */
export const minterCards: HelpCard[] = [
  {
    id: "create-nft",
    title: "Create an NFT",
    icon: "🎨",
    bullets: [
      "Upload an image, then set a title and description so collectors know what they're claiming.",
      "Set a supply limit — the total number of wallets that can claim this drop.",
      "Once published, your drop appears in the Library for anyone to claim for free.",
    ],
  },
  {
    id: "set-claim-rules",
    title: "Set claim rules",
    icon: "⚙️",
    bullets: [
      "Supply limits cap how many wallets can claim the drop before it's sold out.",
      "A cooldown between claims keeps one wallet from spamming a drop — after a claim, that wallet waits before it can claim again.",
      "Tune both to control how fast a drop moves and how fairly it's distributed.",
    ],
  },
  {
    id: "setup-referral-bonus",
    title: "Set up a referral bonus (optional)",
    icon: "🎁",
    bullets: [
      "Choose a reward type to turn the referral bonus on or off — pick 'referral bonus' to enable it, or 'none' to turn it off.",
      "Set the threshold — how many referrals a collector needs before they earn a bonus.",
      "Changing the reward type later just switches the bonus on or off; it doesn't delete your referral history.",
    ],
  },
  {
    id: "monitor-health",
    title: "Monitor the Health tab",
    icon: "📈",
    bullets: [
      "See claim counts per NFT so you know how each drop is performing.",
      "The 'waiting for a reward' queue shows collectors who've hit your threshold but haven't been awarded yet.",
      "Use 'award bonuses in batches' to release bonuses to a group at once — when you do, we'll notify you as each batch goes out.",
      "The purge action clears stale entries from the queue when you no longer need them.",
    ],
  },
  {
    id: "payments",
    title: "Payments",
    icon: "💳",
    bullets: [
      "The Settings page has a payment verification queue where you review payment proofs submitted by collectors.",
      "For each submission you can approve or reject the payment proof — approving marks it verified, rejecting sends it back.",
      "Approvals and rejections are recorded so you have an audit trail of every decision.",
    ],
  },
];
