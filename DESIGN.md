# Design Brief

## Direction

ICP Mint Studio — Premium, focused NFT minting and verification platform for creators on the Internet Computer.

## Tone

Luxury minimalism with precision — refined, intentional interface that celebrates each NFT without distraction.

## Differentiation

Centered gallery-first grid with iOS-style cards, gold accents on critical actions, and breathing whitespace prioritize NFTs over navigation.

## Color Palette

| Token      | Light OKLCH       | Dark OKLCH        | Role                    |
| ---------- | ----------------- | ----------------- | ----------------------- |
| background | 0.97 0.008 300    | 0.11 0.04 290     | Surface                 |
| foreground | 0.15 0.025 290    | 0.93 0.012 295    | Text                    |
| card       | 0.99 0.004 300    | 0.15 0.05 290     | Card surface            |
| primary    | 0.32 0.18 296     | 0.72 0.17 75      | Purple interactive      |
| accent     | 0.72 0.17 75      | 0.72 0.17 75      | Gold highlights & CTAs  |
| muted      | 0.93 0.014 295    | 0.2 0.055 290     | Secondary surfaces      |
| reward-bronze | 0.56 0.15 63   | 0.65 0.18 63      | Bronze tier badge       |
| reward-silver | 0.80 0.01 280   | 0.75 0.015 280    | Silver tier badge       |
| reward-gold   | 0.72 0.17 75    | 0.72 0.17 75      | Gold tier badge         |
| reward-platinum | 0.91 0.008 75 | 0.88 0.01 75      | Platinum tier badge     |

## Typography

Display: Cinzel — section headings, hero text, labels. Body: Inter — body copy, UI labels, breadcrumbs. Mono: JetBrains Mono — creator IDs, principal addresses, code snippets. Scale: h1 `text-4xl md:text-5xl font-bold`, h2 `text-2xl md:text-3xl font-semibold`, label `text-sm font-semibold uppercase`, body `text-base`.

## Reward Tier Badges

Badge system displays creator-assigned reward tiers. CSS classes: `.reward-tier-badge` (base styles) + `.reward-tier-{bronze|silver|gold|platinum}` (color variants). Inline display, 12px radius, uppercase labels, subtle shadows. Derives from business metadata `rewardTier` field — never stored, computed on read. Light mode: distinct saturation per tier. Dark mode: increased chroma for contrast.

## Elevation & Depth

Subtle shadow hierarchy: card shadows (2–8px), elevated modals (24px), no glow or blur effects. Dark mode uses increased saturation to maintain contrast. Reward tier badges use 2px shadows to distinguish from card surfaces.

## Structural Zones

| Zone    | Treatment                    | Border              | Notes                        |
| ------- | ---------------------------- | ------------------- | ---------------------------- |
| Header  | bg-background, border-b      | border-border       | Connect/Disconnect + toggle  |
| Content | bg-background, alternating   | —                   | 3x3 card grid, section gaps  |
| Footer  | bg-muted/10, border-t        | border-border       | Optional, minimal            |

## Spacing & Rhythm

Mobile-first: 16px base grid. Cards 12px radius, 16px padding, 24px gaps. Section margins 32–48px. Large tap targets (48px minimum). Badge padding 6px horizontal, 3px vertical.

## Component Patterns

Buttons: accent bg, purple outline on secondary, 12px radius, full width on mobile. Cards: bg-card, border border-border, shadow-card, 16px padding, 12px radius. Badges: reward tier badges use `.reward-tier-badge` base class + color variant, text-xs font-semibold, full width on mobile. Input: border-input, bg-input, purple focus ring.

## Motion

Entrance: fade + scale (150ms ease-out) on card reveal. Hover: scale 1.02 + shadow-elevated (200ms) on buttons/cards. Reward badges: subtle hover scale (1.05) + shadow lift on interactive contexts. Decorative: none.

## Constraints

No dashboards, no analytics, no decorative gradients. Font Awesome icons only (no emojis, no custom SVGs). Tap targets minimum 48×48px. Card max-width 400px on mobile, 600px on desktop. No animations over 300ms. Reward tier badges display only — never user-clickable.

## Signature Detail

Gold (#D4AF37) accents on Connect button, mint action, and critical transfer modals signal premium quality. Reward tier badges (bronze, silver, gold, platinum) extend the palette with warm metallics for earned credentials, maintaining luxury minimalism across the NFT lifecycle.
