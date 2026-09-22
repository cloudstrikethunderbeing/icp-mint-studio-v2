# Design Brief

## Direction

ICP Mint Studio — Premium NFT minting and verification platform with dual-role architecture (Creator/Admin dashboard + Collector Wallet). New Diagnostic/Health view reports NFT catalog health and confirms the data-loss fix is working. PWA installable on iOS, Android, Windows, macOS.

## Tone

Command-console precision with calm reassurance — a clean, trustworthy diagnostic dashboard. Technical grotesk + mono typography, restrained purple/gold brand, explicit status colors, and a quiet incident-report presentation that reads as authoritative without alarm.

## Differentiation

The Diagnostic view reads like a live system status console: monospace tabular readouts, clear healthy/warning/error indicators, and a calm incident report — while the rest of the app keeps its luxury gallery-first minting experience. One brand, two registers: editorial minting, technical health.

## Color Palette

| Token | Light OKLCH | Dark OKLCH | Role |
|---|---|---|---|
| background | 0.97 0.008 300 | 0.11 0.04 290 | Surface |
| foreground | 0.15 0.025 290 | 0.93 0.012 295 | Text |
| card | 0.99 0.004 300 | 0.15 0.05 290 | Card surface |
| primary | 0.32 0.18 296 | 0.72 0.17 75 | Purple interactive (light) / gold (dark) |
| accent | 0.72 0.17 75 | 0.72 0.17 75 | Gold highlights & CTAs |
| muted | 0.93 0.014 295 | 0.2 0.055 290 | Secondary surfaces |
| destructive | 0.55 0.22 25 | 0.65 0.19 22 | Error status |
| success | 0.50 0.16 150 | 0.70 0.17 150 | Healthy status |
| warning | 0.62 0.16 70 | 0.76 0.15 75 | Warning status |
| reward-bronze | 0.56 0.15 63 | 0.65 0.18 63 | Bronze tier badge |
| reward-silver | 0.80 0.01 280 | 0.75 0.015 280 | Silver tier badge |
| reward-gold | 0.72 0.17 75 | 0.72 0.17 75 | Gold tier badge |
| reward-platinum | 0.91 0.008 75 | 0.88 0.01 75 | Platinum tier badge |

## Typography

- Display: Space Grotesk — headings, hero, section titles, status labels
- Body: DM Sans — body copy, UI labels, breadcrumbs
- Mono: Geist Mono — creator IDs, principal addresses, diagnostic readouts, code snippets
- Scale: hero `text-4xl md:text-5xl font-bold tracking-tight`, h2 `text-2xl md:text-3xl font-semibold`, label `text-sm font-semibold uppercase tracking-widest`, body `text-base`

## Elevation & Depth

Subtle layered hierarchy: `shadow-subtle` on cards, `shadow-elevated` on modals/incident panels, no glow or neon. Dark mode raises chroma to hold contrast. Status dots use a soft 3px halo ring for legibility at a glance.

## Structural Zones

| Zone | Treatment | Border | Notes |
|---|---|---|---|
| Header | bg-background, border-b, theme toggle, logo | border-border | Connect/Disconnect + dark/light mode |
| Content | bg-background, alternating `bg-muted/30` sections | — | Minting grids, Collections, Dashboard, Diagnostic view |
| Bottom Nav | bg-card, fixed bottom, sticky | border-t | Role-adaptive: Creator or Collector |
| Footer | bg-muted/10 | border-border | Optional, minimal |

## Spacing & Rhythm

Mobile-first 16px base grid. Cards 12px radius, 16px padding, 24px gaps. Section margins 32–48px. Diagnostic readout rows 14px vertical padding with 1px border seams for scannable tabular data. Bottom nav 64px fixed with safe-area insets (PWA). Tap targets ≥48px.

## Component Patterns

- Buttons: accent bg, purple outline on secondary, 12px radius, full width on mobile
- Cards: bg-card, border border-border, shadow-subtle, 16px padding, 12px radius
- Status indicators: `.status-dot` (healthy/warning/error) + `.status-pill` (mono uppercase, tinted bg/border) + `.status-pulse` animation
- Diagnostic readout: `.diag-readout` grid with 1px seams, mono right-aligned values, muted labels
- Badges: reward tier badges use `.reward-tier-badge` base + color variant

## Motion

- Entrance: fade + rise (300ms ease-out) on card reveal
- Hover: translateY(-2px) + shadow lift (200ms) on buttons/cards
- Status: `status-pulse` (2s ease-in-out) on live/in-progress indicators only; decorative: none

## Constraints

No dashboards beyond Creator Dashboard, Collector Wallet, and the Diagnostic/Health view. No analytics, no decorative gradients. Font Awesome icons only. Tap targets ≥48×48px. No animations over 300ms (except status pulse). Collector view hides all admin/creation features. Reward tier badges display-only, never clickable. Diagnostic view is read-only — no snapshot restore or backup actions.

## Signature Detail

The Diagnostic/Health view is the standout: a calm, monospace status console with healthy/warning/error pills and tabular NFT-catalog readouts that visibly confirm the data-loss fix is working — precision that earns trust without alarm, keeping the premium gold/purple brand intact.

## How It Works Page

New `/how-it-works` help page — content/UI only, two-tab toggle (Collector | Minter) with single-idea cards. No footer or edge-case tooltips (out of scope).

### Tab Accents (one consistent color per tab, not per-card)

| Token | Light OKLCH | Dark OKLCH | Role |
|---|---|---|---|
| accent-collector | 0.55 0.14 200 | 0.70 0.14 200 | Cool teal — all Collector cards + active Collector tab |
| accent-minter | 0.62 0.18 25 | 0.70 0.17 25 | Warm coral — all Minter cards + active Minter tab |

Distinct from existing gold (hue 75) and purple (hue 296). Teal (200) vs coral (25) = warm-cool complementary split, clearly different at a glance.

### Card Grid Spec

Small single-idea cards, responsive: 1 col mobile / 2 col sm / 3 col lg+. Each card: emoji/icon, short title (Space Grotesk), 3–4 bullets (DM Sans). CSS classes: `.help-card` base + `.help-card-collector-accent` or `.help-card-minter-accent` variant (sets `--card-accent` for bullet dots, icon tint, hover border). Hover/focus: translateY(-2px) + shadow lift + accent-tinted border (25ms cubic-bezier). Entrance: `animate-help-card-enter` (fade + 8px rise, 300ms ease-out).

### Tab Toggle

Use existing `components/ui/tabs.tsx` (shadcn/Radix) — same pattern as VerifyPage.tsx. Active tab text colored via `.help-tab-collector[data-state=active]` / `.help-tab-minter[data-state=active]`. Inactive tab uses default muted-foreground.

### Hero/Header

Page hero: Space Grotesk `text-4xl md:text-5xl` "How It Works" + DM Sans subtitle naming ICP Mint Studio. One accent rule: hero uses neutral foreground (no tab color) so it stays consistent across tabs.

### Typography & Breakpoints

Existing system: Space Grotesk display, DM Sans body. Breakpoints: mobile-first, `sm:` 640px (2-col), `lg:` 1024px (3-col). Card padding 20px, gap 20px, radius 12px. Bullets 14.4px muted-foreground.
