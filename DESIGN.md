---
name: Grimorio
description: A candlelit-grimoire dark theme for a personal MTG collection and deck manager
colors:
  bg: "#14110f"
  surface: "#1e1a17"
  surface-raised: "#292320"
  border: "#3a332e"
  text: "#f2ede8"
  text-muted: "#a89e96"
  primary: "#e8792f"
  primary-hover: "#f5893f"
  primary-contrast: "#1a1008"
  accent: "#3fc4d1"
  accent-hover: "#5ad3df"
  success-bg: "#e3f6e5"
  success-text: "#1e5c28"
  warning-bg: "#fdf3d8"
  warning-text: "#7a5c05"
  danger: "#cc0000"
  danger-bg: "#fbe3e3"
typography:
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    letterSpacing: "0.05em"
rounded:
  sm: "4px"
  md: "8px"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.5rem"
  6: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-contrast}"
    rounded: "{rounded.sm}"
    padding: "{spacing.2} {spacing.3}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "{spacing.2} {spacing.3}"
  button-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger}"
    rounded: "{rounded.sm}"
    padding: "{spacing.2} {spacing.3}"
  card-result:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "{spacing.2}"
  modal:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
---

# Design System: Grimorio

## Overview

**Creative North Star: "The Candlelit Grimoire"**

Grimorio's interface reads like a spellbook studied by candlelight: a near-black page (`#14110f`) that recedes into the dark, warmed by a single ember-orange accent that behaves like the only light source in the room. The mood is moody and mysterious — closer to the game's fantasy atmosphere than to a typical productivity dashboard — and deliberately avoids anything playful or cartoonish. Depth is not conveyed by flat tonal steps alone; interactive surfaces are meant to feel lifted and lit, gaining a soft ember glow as they're touched, the way an object catches candlelight as a hand moves near it.

The palette stays restrained by design: orange is the one warm voice, used sparingly for primary actions and brand marks, while a cool spectral teal appears only for links and active navigation state, playing the role of a faint enchantment against the fire-toned foreground. Everything else — surfaces, borders, muted text — lives in a narrow band of warm near-blacks and browns, so the two accent colors read as genuinely rare, not just "the palette."

**Key Characteristics:**
- Near-black warm background, never a cool/blue-tinted dark
- Single warm accent (ember orange) carries primary actions and brand identity
- Cool teal accent is reserved and sparing — navigation/links only
- Elevation is atmospheric: glow and shadow, not flat color-step layering alone
- Mobile-first, touch-target-conscious (44px minimum interactive height)

## Colors

The palette is intentionally narrow: one warm neutral scale, one warm accent, one cool accent, and a small status set.

### Primary
- **Ember Orange** (`#e8792f`): primary actions, brand mark (nav bar wordmark), anything that should read as "the thing to do here." Hover state lightens to `#f5893f`. Text placed on it uses **Ember Contrast** (`#1a1008`), a near-black, not white — keeps the warm-on-warm relationship instead of a stark light-on-dark flip.

### Secondary
- **Spectral Teal** (`#3fc4d1`): the cool counterpoint — active nav links, in-progress/selected state. Hover lightens to `#5ad3df`. Used sparingly; it should never compete with orange for the eye's first stop on a screen.

### Neutral
- **Void Black** (`#14110f`): page background.
- **Ash Surface** (`#1e1a17`): first elevation step — panels, sticky toolbars, drawers.
- **Ember Surface Raised** (`#292320`): second elevation step — hover states on list rows, nav links, card backgrounds on surfaces.
- **Charred Border** (`#3a332e`): all hairline borders and dividers.
- **Parchment Text** (`#f2ede8`): primary text — warm off-white, not pure white.
- **Faded Ink** (`#a89e96`): secondary/muted text — helper copy, labels, timestamps.

### Status
- **Success** (bg `#e3f6e5` / text `#1e5c28`), **Warning** (bg `#fdf3d8` / text `#7a5c05`), **Danger** (`#cc0000` on bg `#fbe3e3`): light-mode-style pastel status colors carried over as-is. They currently sit outside the dark palette's tonal logic (light backgrounds on a near-black page) rather than being adapted to it — treat as the honest current state, not a target to imitate for new components.

### Named Rules
**The One Flame Rule.** Ember Orange is the only warm accent and should stay rare — primary CTAs and the brand mark, not decoration. If a screen has more than one orange element competing for attention, that's a hierarchy bug, not a style choice.

## Typography

**Body Font:** system-ui, -apple-system, "Segoe UI", sans-serif (system font stack; no custom/display font loaded yet)

**Character:** Plain and utilitarian by necessity — there is no display typeface distinguishing headings from body today. Weight and the `--font-size-*` scale carry all hierarchy.

### Hierarchy
- **Title** (bold, `2rem`/32px, line-height 1.2): page-level headings (e.g. `<h1>Grimorio</h1>` on Home).
- **Headline** (bold, `1.5rem`/24px, line-height 1.2): section/panel headings.
- **Subhead** (default weight, `1.25rem`/20px): modal titles, card names in lists.
- **Body** (default weight, `1rem`/16px, line-height 1.5): default running text.
- **Label** (default weight, `0.875rem`/14px): form labels, secondary line items.
- **Micro** (default weight, `0.75rem`/12px, `0.05em` tracking, uppercase where used): drawer group headings, printing/set metadata under card names.

### Named Rules
**The No-Display-Font Rule.** There is currently no dedicated display/heading typeface — don't introduce one ad hoc in a single component. If a display face becomes a real product decision, it belongs in a dedicated pass that updates this token set project-wide.

## Layout

Mobile-first, single content column up to `960px` (the `.app-shell` max-width), centered with `var(--space-4)` side gutters. Two breakpoints only: `$bp-mobile: 640px` (narrows controls, stacks toolbars, forces full-width touch targets) and `$bp-wide: 960px` (nav bar becomes a pinned sidebar via CSS Grid instead of an overlay drawer; `.app-shell` drops its max-width/centering since it now sits in the grid's second column).

Spacing rhythm runs on a 0.25rem base (`--space-1` through `--space-6`, up to `2rem`): tight `--space-1`/`--space-2` gaps between related inline elements (list items, pips), `--space-4`/`--space-5` between sections and modal padding, `--space-6` for large block separation (e.g. dashboard panel bottom margin).

Card/result grids use `repeat(auto-fill, minmax(180px, 1fr))` on wide viewports, collapsing to a fixed 2-column grid under `$bp-mobile` rather than continuing to auto-fill down to one column.

## Elevation & Depth

The system is moving from flat tonal layering (the only mechanism implemented today — three background steps: `--color-bg` → `--color-surface` → `--color-surface-raised`, plus a single ambient `--shadow-sm`) toward a shadow- and glow-driven model as the confirmed direction: components should feel tactile and lit rather than just color-stepped, with interactive elements gaining a warm ember glow as they're focused or hovered, echoing candlelight catching an object rather than a neutral drop shadow.

### Shadow Vocabulary
- **Ambient** (`box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4)`, token `--shadow-sm`): the one shadow currently in use — raised surfaces like the add-card modal, resting slightly above the page.
- **Ember Glow** (`box-shadow: 0 0 12px rgba(232, 121, 47, 0.35)`, not yet a token — establish as `--shadow-glow-primary` when implemented): intended hover/focus treatment for primary interactive elements (primary buttons, focused inputs, active cards), derived from the primary color rather than neutral black. This is the confirmed direction, not yet applied across components — apply it as interactive elements get their next pass, rather than retrofitting everything at once.

### Named Rules
**The Candlelight Rule.** Light comes from the accent color, not from a generic gray shadow. When adding elevation to a new interactive element, prefer a soft glow tinted with `--color-primary` (or `--color-accent` for teal-toned elements) over a neutral `rgba(0,0,0,…)` shadow.

## Shapes

Two radius steps only: `--radius-sm` (4px) for buttons, inputs, list rows, and small chips; `--radius-md` (8px) for larger containers — modals, result cards. Corners are soft but not rounded-pill; nothing in the system uses fully circular radii except the color-identity pips (see Components). Borders are `1px solid var(--color-border)` throughout — no heavier border weights observed.

## Components

### Buttons
- **Shape:** `--radius-sm` (4px), `1px solid` border on all variants.
- **Baseline:** every raw `<button>` gets the same treatment by default — `--color-surface-raised` background, `--color-text`, border in `--color-border` — so unstyled buttons never look unstyled.
- **Primary** (`.btn-primary`): Ember Orange background and border, `--color-primary-contrast` text, bold weight; hover lightens to `--color-primary-hover`.
- **Danger** (`.btn-danger`): pastel danger background/border/text at rest; hover inverts to solid `--color-danger` with white text — the one place a fully saturated red fills a surface.
- **Disabled:** `cursor: not-allowed`, `opacity: 0.5` on any variant.
- **No dedicated ghost/tertiary variant** exists yet — the transparent, borderless treatment on `.menu-toggle` and modal close/back buttons is currently bespoke per-component rather than a shared utility class.

### Cards / Containers
- **Corner Style:** `--radius-md` (8px) for result cards and modals; `--radius-sm` for smaller list-row surfaces.
- **Background:** `--color-surface` for panels and result cards; `--color-bg` for the modal body (matches the page, not the panel level).
- **Shadow Strategy:** see Elevation & Depth — modals get `--shadow-sm` today; result-card hover/focus glow is the confirmed but not-yet-implemented direction.
- **Border:** `1px solid var(--color-border)` on result cards; modals are borderless (shadow + backdrop carry the separation instead).
- **Internal Padding:** `--space-2` for compact result cards, `--space-5` (`--space-3` on mobile) for modal header/body.

### Inputs / Fields
- **Style:** `1px solid var(--color-border)`, `--color-surface` background, `--radius-sm`, `font: inherit`.
- **Mobile:** search/filter controls expand to `min-height: 44px` and full width under `$bp-mobile` — the system's one explicit touch-target rule.
- **Error:** error text uses `--color-danger` at `--font-size-sm`, placed directly below the control rather than inline with it.

### Navigation
- **Style:** sticky top bar (`z-index: 20`) in `--color-surface` with a bottom border; brand wordmark in `--color-primary`, bold.
- **Drawer:** below `$bp-wide`, a fixed-position overlay drawer (16rem wide, slides in via `transform: translateX`) with a semi-transparent backdrop; at `$bp-wide` it becomes a static sidebar pinned in the page grid and the backdrop/toggle disappear.
- **Links:** default `--color-text`; hover gets `--color-surface-raised` background; active state pairs `--color-surface-raised` background with `--color-accent` (Spectral Teal) text and bold weight — the one place the teal accent appears as a fill-adjacent color rather than a flat accent.
- **Grouping:** links are grouped under labeled sections (`h2` in uppercase, `--font-size-xs`, `0.05em` tracking, `--color-text-muted`) — additive, so new nav groups slot in without restructuring.

### Modal
- **Pattern:** native `<dialog>` (`showModal()`/`close()`), not a library — this is the system-wide modal contract.
- **Shape:** `--radius-md`, no border, `--shadow-sm`; backdrop is `rgba(0,0,0,0.5)`.
- **Mobile:** goes full-bleed — `100vw`/`100vh`, radius drops to 0 — rather than staying a centered floating card.
- **Structure:** fixed header (title + close/back buttons) and a scrollable body region, so long content scrolls without moving the header.
- **Note:** the add-card modal is the current reference implementation for this pattern (fully token-based); an older modal (auth) predates the token system and still uses hardcoded pixel/color values — treat the add-card modal as canonical when building new modals.

### Color Identity Pips (signature component)
A row of small circular pips (`1.5rem`, fully round) representing MTG's five colors (W/U/B/R/G), each filled with that color's traditional print-color when active (`#f8f6d8` white, `#0e68ab` blue, `#150b00` black, `#d3202a` red, `#00733e` green) and a neutral gray/outline (`#eee` bg, `#999` text, `#ccc` border) when inactive. This is the one place the system departs from its own token palette on purpose — the five colors are drawn from Magic's own color identity, not from `_tokens.scss`, because they need to stay recognizable to MTG players rather than match the app's brand palette.

## Do's and Don'ts

### Do:
- **Do** use the ember-orange glow (derived from `--color-primary`) for hover/focus on primary interactive elements as elevation work continues — the confirmed direction, even where not yet implemented.
- **Do** treat the add-card modal (`add-card-modal.scss`) as the reference pattern for new modals — token-based, mobile full-bleed, fixed header/scrollable body.
- **Do** keep Ember Orange rare — primary CTAs and brand mark only (**The One Flame Rule**).
- **Do** keep the five MTG color-identity pip colors as their traditional print colors, not tokens from the app's own palette — they need to stay recognizable to players.

### Don't:
- **Don't** introduce a second warm accent color competing with Ember Orange; the palette's restraint is the point.
- **Don't** use neutral gray/black shadows for new interactive elevation — prefer a color-tinted glow per **The Candlelight Rule**.
- **Don't** copy hardcoded hex/px values from older components (`entity-list`, `card-list`, `dashboard-panel`, `auth-modal`) into new work — they predate the token system in `_tokens.scss`; use the CSS custom properties instead.
- **Don't** introduce a display/heading typeface in a single component ad hoc (**The No-Display-Font Rule**) — it's a project-wide decision, not yet made.
