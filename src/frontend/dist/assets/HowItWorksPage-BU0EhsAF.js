import { d as devLog, e as useNavigate, a as useSearch, r as reactExports, n as jsxRuntimeExports } from "./main-uWazffZ2.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-meaFW1W3.js";
import "./index-EIV1jZGS.js";
import "./utils-CMIF0FGc.js";
import "./index-7RwC1Qpx.js";
import "./index-DNwVPcY8.js";
const helpTabs = {
  collector: "Collector",
  minter: "Minter"
};
const helpHero = {
  title: "How It Works",
  subtitle: "Everything you need to know about claiming free NFTs, earning referral bonuses, and (for minters) running your own drops."
};
const collectorCards = [
  {
    id: "claim-free-nft",
    title: "Claim a free NFT",
    icon: "🎁",
    bullets: [
      "Free claimable NFTs are drops anyone can claim at no cost — just connect your wallet and click Claim.",
      "Connecting uses Internet Identity, a secure wallet for the Internet Computer. You'll approve the connection once per session.",
      "If your wallet isn't connected yet, the Claim button will ask you to connect first — no charge, just a quick sign-in.",
      "If a drop has already been claimed for your wallet, you'll see a clear message instead of a second copy — each wallet can claim a given drop once."
    ]
  },
  {
    id: "share-for-bonus",
    title: "Share for a bonus",
    icon: "🔗",
    bullets: [
      "After you claim, use the Share on X button to post your unique referral link.",
      "Your referral link is tied to your wallet — anyone who claims a free NFT through it counts toward your bonus.",
      "Sharing doesn't cost anything and doesn't share your wallet address; it only spreads your referral link."
    ]
  },
  {
    id: "track-progress",
    title: "Track your progress",
    icon: "📊",
    bullets: [
      "Your referral count lives on your Dashboard — open it any time to see how many people have claimed through your link.",
      "When someone claims through your link, you'll see the count go up. Bonuses aren't handed out instantly — they're held until the minter releases them.",
      "If your count is rising but you don't have a bonus yet, you're waiting for a reward. You've earned a bonus — we'll notify you when one is available!",
      "There's nothing you need to do while waiting; the minter controls when bonuses are released."
    ]
  },
  {
    id: "claim-bonus",
    title: "Claim your bonus",
    icon: "✨",
    bullets: [
      "When a bonus is ready for you, a banner appears at the top of your Dashboard and Library pages.",
      "The banner tells you a bonus is available and walks you through claiming it.",
      "If you don't see a banner, you're still waiting for a reward — check back after the minter releases the next batch."
    ]
  },
  {
    id: "browse-library",
    title: "Browse the Library",
    icon: "📚",
    bullets: [
      "The Library lists every free claimable drop, each with a claim count showing how many have been taken.",
      "The 'X/Y claimed' badge shows how many wallets have claimed out of the total supply the minter set.",
      "If a drop is sold out, you'll see a 'This drop is sold out' message and the Claim button is disabled — try another drop or check back later."
    ]
  },
  {
    id: "verify-nft",
    title: "Verify an NFT",
    icon: "🛡️",
    bullets: [
      "The Verify flow lets you confirm an NFT you hold is genuine and recorded on the Internet Computer.",
      "Open Verify, pick the NFT from your wallet, and the app checks it against the on-chain record.",
      "Verification is read-only — it never moves or spends your NFT."
    ]
  },
  {
    id: "after-you-claim",
    title: "After you claim",
    icon: "✅",
    bullets: [
      "Right after a successful claim you'll see a success screen confirming the NFT is yours.",
      "Your new NFT shows up in your Library and Profile shortly after — refresh if you don't see it right away.",
      "From there you can share your referral link, verify the NFT, or browse other free drops."
    ]
  }
];
const minterCards = [
  {
    id: "create-nft",
    title: "Create an NFT",
    icon: "🎨",
    bullets: [
      "Upload an image, then set a title and description so collectors know what they're claiming.",
      "Set a supply limit — the total number of wallets that can claim this drop.",
      "Once published, your drop appears in the Library for anyone to claim for free."
    ]
  },
  {
    id: "set-claim-rules",
    title: "Set claim rules",
    icon: "⚙️",
    bullets: [
      "Supply limits cap how many wallets can claim the drop before it's sold out.",
      "A cooldown between claims keeps one wallet from spamming a drop — after a claim, that wallet waits before it can claim again.",
      "Tune both to control how fast a drop moves and how fairly it's distributed."
    ]
  },
  {
    id: "setup-referral-bonus",
    title: "Set up a referral bonus (optional)",
    icon: "🎁",
    bullets: [
      "Choose a reward type to turn the referral bonus on or off — pick 'referral bonus' to enable it, or 'none' to turn it off.",
      "Set the threshold — how many referrals a collector needs before they earn a bonus.",
      "Changing the reward type later just switches the bonus on or off; it doesn't delete your referral history."
    ]
  },
  {
    id: "monitor-health",
    title: "Monitor the Health tab",
    icon: "📈",
    bullets: [
      "See claim counts per NFT so you know how each drop is performing.",
      "The 'waiting for a reward' queue shows collectors who've hit your threshold but haven't been awarded yet.",
      "Use 'award bonuses in batches' to release bonuses to a group at once — when you do, we'll notify you as each batch goes out.",
      "The purge action clears stale entries from the queue when you no longer need them."
    ]
  },
  {
    id: "payments",
    title: "Payments",
    icon: "💳",
    bullets: [
      "The Settings page has a payment verification queue where you review payment proofs submitted by collectors.",
      "For each submission you can approve or reject the payment proof — approving marks it verified, rejecting sends it back.",
      "Approvals and rejections are recorded so you have an audit trail of every decision."
    ]
  }
];
const VALID_TABS = ["collector", "minter"];
const DEFAULT_TAB = "collector";
function resolveTab(value) {
  return typeof value === "string" && VALID_TABS.includes(value) ? value : DEFAULT_TAB;
}
function HelpCardItem({
  card,
  index,
  accentClass
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "article",
    {
      className: `help-card ${accentClass} animate-help-card-enter`,
      style: { animationDelay: `${Math.min(index * 60, 360)}ms` },
      "data-ocid": `howitworks.card.${card.id}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "help-card-icon",
            "aria-hidden": "true",
            "data-ocid": `howitworks.card.${card.id}.icon`,
            children: card.icon
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "h3",
          {
            className: "help-card-title text-foreground",
            "data-ocid": `howitworks.card.${card.id}.title`,
            children: card.title
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "ul",
          {
            className: "help-card-bullets",
            "data-ocid": `howitworks.card.${card.id}.bullets`,
            children: card.bullets.map((bullet, bulletIndex) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "li",
              {
                "data-ocid": `howitworks.card.${card.id}.bullet.${bulletIndex + 1}`,
                children: bullet
              },
              `${card.id}-bullet-${bulletIndex}`
            ))
          }
        )
      ]
    }
  );
}
function HowItWorksPage() {
  devLog("[RENDER] HowItWorksPage render:", {});
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const activeTab = resolveTab(search.tab);
  reactExports.useEffect(() => {
    if (search.tab !== activeTab) {
      navigate({
        to: "/how-it-works",
        search: (prev) => ({ ...prev, tab: activeTab }),
        replace: true
      });
    }
  }, [activeTab, navigate, search.tab]);
  function handleTabChange(value) {
    const next = resolveTab(value);
    navigate({
      to: "/how-it-works",
      search: (prev) => ({ ...prev, tab: next })
    });
  }
  const collectorCardsRendered = reactExports.useMemo(
    () => collectorCards.map((card, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      HelpCardItem,
      {
        card,
        index,
        accentClass: "help-card-collector-accent"
      },
      card.id
    )),
    []
  );
  const minterCardsRendered = reactExports.useMemo(
    () => minterCards.map((card, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      HelpCardItem,
      {
        card,
        index,
        accentClass: "help-card-minter-accent"
      },
      card.id
    )),
    []
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8",
      "data-ocid": "howitworks.page",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "header",
          {
            className: "mx-auto max-w-3xl text-center",
            "data-ocid": "howitworks.hero",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "h1",
                {
                  className: "font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl",
                  "data-ocid": "howitworks.hero.title",
                  children: helpHero.title
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "p",
                {
                  className: "mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg",
                  "data-ocid": "howitworks.hero.subtitle",
                  children: helpHero.subtitle
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Tabs,
          {
            value: activeTab,
            onValueChange: handleTabChange,
            className: "mt-10 sm:mt-12",
            "data-ocid": "howitworks.tabs",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                TabsList,
                {
                  className: "h-auto rounded-full p-1.5",
                  "data-ocid": "howitworks.tabs.list",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      TabsTrigger,
                      {
                        value: "collector",
                        className: "help-tab-collector rounded-full px-5 py-2 text-sm font-medium",
                        "data-ocid": "howitworks.tab.collector",
                        children: helpTabs.collector
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      TabsTrigger,
                      {
                        value: "minter",
                        className: "help-tab-minter rounded-full px-5 py-2 text-sm font-medium",
                        "data-ocid": "howitworks.tab.minter",
                        children: helpTabs.minter
                      }
                    )
                  ]
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TabsContent,
                {
                  value: "collector",
                  className: "mt-8 sm:mt-10",
                  "data-ocid": "howitworks.tab.collector.content",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      className: "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6",
                      "data-ocid": "howitworks.collector.grid",
                      children: collectorCardsRendered
                    }
                  )
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TabsContent,
                {
                  value: "minter",
                  className: "mt-8 sm:mt-10",
                  "data-ocid": "howitworks.tab.minter.content",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      className: "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6",
                      "data-ocid": "howitworks.minter.grid",
                      children: minterCardsRendered
                    }
                  )
                }
              )
            ]
          }
        )
      ]
    }
  );
}
export {
  HowItWorksPage as default
};
