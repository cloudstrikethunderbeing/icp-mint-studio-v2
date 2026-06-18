# Design Brief

## Direction

ICP Mint Studio — Premium NFT minting and verification platform with dual-role architecture: Creator/Admin dashboard (full minting, collections, tier management) and Collector Wallet (lightweight recipient view). Progressive Web App installable on iOS, Android, Windows, macOS.

## Tone

Luxury minimalism with precision — refined, intentional interface that celebrates each NFT without distraction. Creator view emphasizes creative control; Collector view emphasizes trust and simplicity.

## Differentiation

Centered gallery-first grid with iOS-style cards, gold accents on critical actions, breathing whitespace. Dual bottom navigation adapts to user role. Collector Wallet strips all creation controls, exposing only verification and collection browsing. PWA provides native-app feel across platforms.

## Color Palette

| Token | Light OKLCH | Dark OKLCH | Role |
|---|---|---|---|
| background | 0.97 0.008 300 | 0.11 0.04 290 | Surface |
| foreground | 0.15 0.025 290 | 0.93 0.012 295 | Text |
| card | 0.99 0.004 300 | 0.15 0.05 290 | Card surface |
| primary | 0.32 0.18 296 | 0.72 0.17 75 | Purple interactive |
| accent | 0.72 0.17 75 | 0.72 0.17 75 | Gold highlights & CTAs |
| muted | 0.93 0.014 295 | 0.2 0.055 290 | Secondary surfaces |
| reward-bronze | 0.56 0.15 63 | 0.65 0.18 63 | Bronze tier badge |
| reward-silver | 0.80 0.01 280 | 0.75 0.015 280 | Silver tier badge |
| reward-gold | 0.72 0.17 75 | 0.72 0.17 75 | Gold tier badge |
| reward-platinum | 0.91 0.008 75 | 0.88 0.01 75 | Platinum tier badge |

## Typography

Display: Cinzel — section headings, hero text, labels. Body: Inter — body copy, UI labels, breadcrumbs. Mono: JetBrains Mono — creator IDs, principal addresses, code snippets. Scale: h1 `text-4xl md:text-5xl font-bold`, h2 `text-2xl md:text-3xl font-semibold`, label `text-sm font-semibold uppercase`, body `text-base`.

## Dual Navigation

Creator/Admin: Mint | Collections | Dashboard | Profile | Settings. Collector: My NFTs | Verify | Notifications | Profile. Non-admin users see Collector-style navigation with no creation or admin controls.

## Collector Wallet View

Read-only NFT recipient dashboard. Cards show: thumbnail, title, "In Collection" label (if applicable), Verify badge. No mint, burn, delete, or collection assignment controls. Share and verify buttons only.

## Reward Tier Badges

Badge system displays creator-assigned reward tiers. CSS classes: `.reward-tier-badge` (base styles) + `.reward-tier-{bronze|silver|gold|platinum}` (color variants). Inline display, 12px radius, uppercase labels, subtle shadows. Derives from business metadata `rewardTier` field — never stored, computed on read. Light mode: distinct saturation per tier. Dark mode: increased chroma for contrast.

## Elevation & Depth

Subtle shadow hierarchy: card shadows (2–8px), elevated modals (24px), no glow or blur effects. Dark mode uses increased saturation to maintain contrast. Reward tier badges use 2px shadows to distinguish from card surfaces.

## Structural Zones

| Zone | Treatment | Border | Notes |
|---|---|---|---|
| Header | bg-background, border-b, theme toggle, logo | border-border | Connect/Disconnect + dark/light mode |
| Content | bg-background, alternating sections | — | Creator: 3×3 grid, Collections, Dashboard. Collector: My NFTs grid, Verify results |
| Bottom Nav | bg-card, fixed bottom, sticky | border-t | Role-adaptive: Creator or Collector |
| Footer | bg-muted/10 | border-border | Optional, minimal |

## Spacing & Rhythm

Mobile-first: 16px base grid. Cards 12px radius, 16px padding, 24px gaps. Section margins 32–48px. Bottom nav 64px fixed height with safe-area insets (PWA). Large tap targets (48px minimum). Badge padding 6px horizontal, 3px vertical.

## Component Patterns

Buttons: accent bg, purple outline on secondary, 12px radius, full width on mobile. Cards: bg-card, border border-border, shadow-card, 16px padding, 12px radius. Badges: reward tier badges use `.reward-tier-badge` base class + color variant, text-xs font-semibold, full width on mobile. Input: border-input, bg-input, purple focus ring.

## Motion

Entrance: fade + scale (150ms ease-out) on card reveal. Hover: scale 1.02 + shadow-elevated (200ms) on buttons/cards. Reward badges: subtle hover scale (1.05) + shadow lift on interactive contexts. Decorative: none.

## PWA Details

Manifest: app name "ICP Mint Studio", start_url "/", display "standalone", theme_color dark purple (#1a1a2e). Icons: 192×192 and 512×512 PNG. Splash screens: 540×720 with logo. Service worker: offline shell with cached index.html, app shell caching strategy. No live data offline.

## Constraints

No dashboards beyond Creator Dashboard and Collector Wallet. No analytics, no decorative gradients. Font Awesome icons only (no emojis, no custom SVGs). Tap targets minimum 48×48px. Card max-width 400px on mobile, 600px on desktop. No animations over 300ms. Collector view hides all admin and creation features. Reward tier badges display only — never user-clickable.

## Signature Detail

Gold (#D4AF37) accents on Connect button, mint action, and critical transfer modals signal premium quality. Reward tier badges (bronze, silver, gold, platinum) extend the palette with warm metallics for earned credentials, maintaining luxury minimalism across the NFT lifecycle. Collector Wallet preserves the same accent language while removing creation and management complexity.
