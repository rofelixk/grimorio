---
name: Grimorio
description: A dark tome retinted by the player — local-first MTG collection manager with an identity-driven theme
colors:
  bg: "#14110f"
  surface: "#1e1a17"
  surface-raised: "#292320"
  border: "#3a332e"
  text: "#f2ede8"
  text-muted: "#a89e96"
  backdrop: "rgba(0, 0, 0, 0.75)"
  danger: "oklch(0.72 0.16 28)"
  danger-bg: "oklch(0.27 0.06 28)"
  default-primary: "{colors.identity-r}"
  default-accent: "{colors.identity-u}"
  default-tertiary: "{colors.identity-g}"
  identity-w: "#d8cdb0"
  identity-w-hover: "#e6dcc2"
  identity-u: "#3d6b85"
  identity-u-hover: "#4c7f9c"
  identity-b: "#7c5aa6"
  identity-b-hover: "#8f6bb8"
  identity-r: "#a8402c"
  identity-r-hover: "#bf4f39"
  identity-g: "#4c7a43"
  identity-g-hover: "#5c8f52"
typography:
  display:
    fontFamily: "'Grenze', Georgia, serif"
    fontWeight: 600
    lineHeight: 1.2
  wordmark:
    fontFamily: "'Grenze', Georgia, serif"
    fontWeight: 700
    lineHeight: 1
  body:
    fontFamily: "'Karla', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    lineHeight: 1.5
  label:
    fontFamily: "'Karla', system-ui, sans-serif"
    fontSize: "0.875rem"
  micro:
    fontFamily: "'Karla', system-ui, sans-serif"
    fontSize: "0.75rem"
    letterSpacing: "0.05em"
  eyebrow:
    fontFamily: "'Karla', system-ui, sans-serif"
    fontSize: "0.75rem"
    letterSpacing: "0.14em"
fontSizes:
  xs: "0.75rem"
  sm: "0.875rem"
  md: "1rem"
  lg: "1.25rem"
  xl: "1.5rem"
  2xl: "2rem"
rounded:
  sm: "4px"
  md: "8px"
  ring: "10px"
  full: "50%"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.5rem"
  6: "2rem"
sizes:
  touch-target: "44px"
  list-row: "56px"
  modal-desktop-width: "880px"
  modal-desktop-min-height: "460px"
  modal-identity-pane: "400px"
  wheel-desktop: "300px"
  wheel-mobile: "240px"
  wheel-mini: "36px"
  nav-rail: "24px"
  nav-panel: "232px"
  drawer: "min(288px, 85%)"
  thread-x: "11px"
  bead: "7px"
  status-mark: "8px"
motion:
  ease: "cubic-bezier(0.4, 0, 0.2, 1)"
  fast: "0.18s"
  base: "0.24s"
  slow: "0.5s"
  ring-rotation: "28s"
  halo-flicker: "6s"
  drawer: "0.36s"
  nav-leave-delay: "120ms"
  band-flow: "120s"
components:
  button-primary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{role.primary}"
    borderColor: "{role.primary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.2} {spacing.3}"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    borderColor: "{colors.border}"
    rounded: "{rounded.sm}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
  button-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger}"
    borderColor: "{colors.danger}"
    rounded: "{rounded.sm}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    borderColor: "{colors.border}"
    rounded: "{rounded.sm}"
    minHeight: "{sizes.touch-target}"
  modal:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.md}"
  list-row:
    background: "linear-gradient({colors.surface-raised}, {colors.surface})"
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
    minHeight: "{sizes.list-row}"
---

# Design System: Grimorio

> This document replaces all previous design conventions. It is derived only from the auth and profile blueprint (`Auth Modal v2` / `GrimorioAuthModal`). Anything not described here hasn't been decided yet — extend this file rather than reaching for older patterns.

## Overview

**Creative North Star: "A dark tome, retinted by the player."**

The surface is a constant warm near-black. Every ring, glow, title shadow, primary button and spark takes its color from the **color identity** of the active local profile — up to three of Magic's five colors, picked when the profile is created. Two people sharing one device see two differently colored apps. With no active profile, the app falls back to its own neutral identity.

The mood is precise and a little arcane, never playful. Titles and identity names are set in a blackletter-adjacent serif; everything functional is quiet and sans. Depth comes from light, not from gray shadows: things glow as if held near a candle.

**Key characteristics**
- Warm near-black page. Never blue-tinted grays.
- Color identity does all the tinting, through three **roles**: primary, accent and tertiary.
- Elevation is light: role-colored glows, conic rings, blurred halos and sparks.
- Two typefaces only: Grenze (display) and Karla (everything else).
- Local-first: profiles live on the device; the cloud account is optional and never blocks anything.
- PT-BR is the only interface language.

## Colors

### Neutral surface scale (constant — never retinted)
- **Page** `#14110f` — page background, modal face, mobile full-bleed modal.
- **Surface** `#1e1a17` — inputs, info plates, the bottom of the list-row gradient.
- **Surface raised** `#292320` — button faces, the top of the list-row gradient, scrollbar thumb.
- **Border** `#3a332e` — every hairline, divider, swatch outline and dashed "create" row.
- **Text** `#f2ede8` — primary text: warm parchment, not pure white.
- **Text muted** `#a89e96` — helpers, subtitles, captions, metadata.
- **Backdrop** `rgba(0,0,0,.75)` — behind every modal.

### Identity colors (the personal layer)
Desaturated on purpose: they tint the UI rather than represent cards.

| Code | Name (PT-BR) | Base | Hover |
|---|---|---|---|
| W | Branco | `#d8cdb0` | `#e6dcc2` |
| U | Azul | `#3d6b85` | `#4c7f9c` |
| B | Preto | `#7c5aa6` | `#8f6bb8` |
| R | Vermelho | `#a8402c` | `#bf4f39` |
| G | Verde | `#4c7a43` | `#5c8f52` |

Black is shown as violet so it can glow against the page at all. The same five values are used everywhere, including swatches, mini wheels and chips. There is no separate "print color" set.

### Roles
Pick order is role order: the 1st pick is **primary**, the 2nd **accent**, the 3rd **tertiary**. An unset role falls back down the chain: tertiary → accent → primary.

- `--role-primary` — ring, halo, radial wash, title glow, primary button, active outline, hover border.
- `--role-accent` — links, spinner, the dashed row's hover border.
- `--role-tertiary` — the third stop of the ring and halo gradients.

A themed subtree sets `--theme-primary/-accent/-tertiary` (and `-hover`). **Each themed root must redeclare the `--role-*` chain** (see `[data-grm]` in the blueprint). Custom properties resolved on `:root` do not pick up values set on descendants.

### Default identity
**Vermelho → Azul → Verde** (R primary, U accent, G tertiary), built from the same identity tokens — there are no extra brand colors. Used when no profile is active: signed out, first run, and new-device sign-in before the account's colors arrive.

- It only tints the chrome (ring, halo, glows, buttons). The identity wheel stays neutral — all five swatches at .85 with the "Grimorio" wordmark in the center — because the default belongs to no one.

### Danger
- **Danger** `oklch(0.72 0.16 28)` — error text under fields, errors for the whole form, danger button text and border. It was chosen to be readable on the page; the old saturated red failed contrast.
- **Danger bg** `oklch(0.27 0.06 28)` — the danger button face: a dark, red-tinted surface, never a pale pastel.

Success and warning colors are **not yet defined**. Don't borrow them from anywhere; define them here first.

### Named rules
**The Identity Rule.** Only the three roles carry color. Never add a second warm accent, and never hard-code an identity hex into UI chrome. The exceptions are swatches and pips, which *are* the identity.

**The Default Rule.** No active profile means the default identity (Vermelho → Azul → Verde). The UI never shows one person's colors while that person's data is hidden.

**The Status Rule.** Healthy states are neutral: they use `text` or `text-muted` only. Only failures use `danger`. Identity colors never signal status, so a red identity never reads as an error. Success and warning stay undefined.

## Typography

**Display:** Grenze 600 (wordmark: Grenze 700). **Text:** Karla 400–700.

| Role | Face | Size | Notes |
|---|---|---|---|
| Wordmark "Grimorio" | Grenze 700 | 2rem desktop / 1.25rem mobile header and app top bar | `--role-primary`, glow; in the app top bar, flowing gradient text (see "Fio de luz") |
| Modal title / done title | Grenze 600 | 2rem desktop / 1.25rem mobile (done: 2rem) | glow |
| Tribe name (wheel center) | Grenze 600 | 2rem | glow, wraps inside 54% of the wheel |
| Body | Karla 400 | 1rem / 1.5 | |
| Label, subtitle, links, errors | Karla | 0.875rem | |
| Helper, metadata, chips | Karla | 0.75rem | muted |
| Micro label | Karla | 0.75rem, 0.05em tracking, uppercase | "OU", divider labels, "Em uso" badge |
| Eyebrow | Karla | 0.75rem, 0.14em tracking, uppercase | "Sua identidade", "Conta na nuvem" |

- **Title glow:** `text-shadow: 0 0 24px rgb(from var(--role-primary) r g b / 35%)`. Titles glow; they never change color. The exceptions are the app top bar wordmark and the current side-nav label, which use the "Fio de luz" gradient text.
- Sentence case everywhere. Uppercase is reserved for micro labels and eyebrows.
- `text-wrap: pretty` on running copy.

## Layout

- **Spacing:** a 0.25rem base in six steps (0.25 / 0.5 / 0.75 / 1 / 1.5 / 2rem). Nothing is larger than 2rem.
  - `space-2` between related inline items and between list rows.
  - `space-4` between form fields.
  - `space-5`/`space-6` for pane padding.
- **Touch targets:** 44px minimum on every interactive element, including text links on mobile (give them `min-height: 44px`).
- **Desktop modal:** 880px wide, a two-column grid (**identity pane 400px | form pane 1fr**).
  - The form pane has a 44px close row, the form, then a prompt pinned to the bottom (`margin-top: auto`, hairline above).
- **Mobile modal:** full-bleed.
  - A header row with the wordmark and the identity chip + ✕, with a hairline below.
  - A scrolling body; the prompt pins to the bottom.
- **Fluid height:** the desktop surface animates its height to its content (minimum 460px) over `base` 0.24s. Content changes (mode switches, errors appearing, confirmation screens) resize the modal smoothly; it never jumps.
- **Reserved space:** text that swaps under the wheel reserves two lines, so hover previews never shift the wheel.

## Elevation & depth

There is **one** neutral shadow, `0 1px 3px rgba(0,0,0,.4)`, on the modal face at rest. Everything else is light.

| Effect | Recipe |
|---|---|
| **Ring** | 2px padding gap around the face; `conic-gradient(from var(--spin-angle), primary 35%, accent 25%, tertiary 25%, primary 35%)`, rotating over 28s |
| **Halo** | `inset: -32px`, `blur(26px)`, the same conic at 24/18/18/24%, rotating over 28s plus a 6s flicker (opacity .3 ↔ .7) |
| **Sparks** | 20 on desktop, flying outward 28–84px; 12 on mobile, drifting 14–36px inward from the screen edges. 2–4.5px dots in a random role color with `0 0 6px 1px` of their own color. 1.6–3.2s each, staggered; each one gets a new position and color when it fades |
| **Radial wash** | `radial-gradient(circle at 0% 0%, primary 18%, transparent 58%)` — the identity pane and mobile header |
| **Primary button** | role-primary text + border, `text-shadow 0 0 8px` at 60%, `box-shadow 0 0 20px` at 35% |
| **List-row hover** | border → role-primary, `0 0 18px -4px` at 55% |
| **Selected swatch** | `0 0 0 3px bg, 0 0 0 4px <hex>, 0 0 20px <hex> 50%` |

Blur and transparency are used only for atmosphere: the halo, the backdrop, the name blur-in. No frosted-glass panels.

**The Candlelight Rule.** Interactive elevation is a role-tinted glow, never a neutral gray shadow.

### "Fio de luz" (the app shell's light)
A band of the three roles flows slowly along the shell's edges. All recipes resolve against `--role-*` inside `[data-theme-scope]`. Every decorative span is `aria-hidden` and `pointer-events: none`; siblings that must sit above one get `position: relative`.

| Recipe | Definition |
|---|---|
| **Band** `--band` | `linear-gradient(90deg, primary 0%, primary 20%, accent 33%, accent 53%, tertiary 66%, tertiary 86%, primary 100%)`, repeated, 2400px long |
| **Vertical band** `--band-v` | the same stops at 180deg |
| **Lit band** `--band-lit` | the same stops, each color as `oklch(from <role> max(l, 0.68) c h)`, so it stays readable as text |
| **Flowing line** | replaces the top bar's hairline: 1px at the bottom edge, `--band`, flowing |
| **Thread** | the side nav's (and the mirrored drawer's) edge: 1px at x = 11px, `--band-v`, a `0 0 6px` primary glow at 35%, flowing |
| **Wash** | Top bar: `--band` at .3 behind the wordmark, 360px (max 70%) wide, masked by `radial-gradient(ellipse 100% 150% at 0% 50%, #000, transparent 75%)`. Nav and drawer: `--band-v` at .3 in the top corner, 360px (max 70%) tall, masked by `ellipse 150% 100% at 0% 0%` (drawer: `at 100% 0%`) |
| **Overlay glow** `--glow-overlay` | `--shadow-rest` plus `0 0 24px -6px` primary at 45%: the hover-expanded nav and the open drawer |
| **Gradient text** | transparent text with `--band-lit` clipped to it, `drop-shadow(0 0 1px bg)` and a primary glow at 30% (10px wordmark, 8px nav label); the wordmark adds a `0 0 3px bg` drop-shadow |

These are deliberate exceptions to two rules: the flowing line and the thread are gradient, glowing 1px edges rather than solid borders, and the wordmark and the current nav label change color over time.

## Shapes

- Radius 4px for controls (buttons, inputs, chips, badges, info plates).
- Radius 8px for containers (modal face, list rows).
- Radius 10px for the ring (8px + the 2px gap).
- 50% for swatches, pips and the wheel.
- Every border is exactly **1px**, solid; the create-row is dashed. No heavier weights. The "Fio de luz" line and thread are the only gradient edges.

## Motion

- The easing is always `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Durations:** 0.18s hover/focus, 0.24s modal height, 0.5s swatch state and name entrance.
- **Name entrance:** fade + `blur(6px)` + `scale(.92)` over 0.5s, re-triggered whenever the tribe name changes.
- **Swatch pick:** the swatch scales to 1.06 (unpicked ones 0.88–0.9). A 0.7s ripple ring (scale 1 → 1.9, fading out) plus a burst of 8 sparks (26–46px, 0.6–0.9s) in the picked color.
- **Retint on link:** when a cloud account's saved colors replace the profile's, the wheel ripples on every newly lit color.
- **Hover preview:** in the profile list, hovering or focusing a row retints the whole modal to that profile. Leaving the *list* (not an individual row) restores it, so there's no flicker in the gaps.
- **Band flow:** the "Fio de luz" bands move over 120s, linear, infinite (`grm-flow-long` and `grm-flow-mark` horizontally, `grm-flow-v` vertically, 2400px of travel).
- **Drawer:** slides in from the right over 0.36s (`--duration-drawer`), and the backdrop fades over the same time.
- **Side nav:** width, border and glow change over `base` 0.24s. It collapses 120ms after the pointer leaves.
- **`prefers-reduced-motion`:** all ring, halo, spark, ripple and band animation stops. Rings and bands freeze, and the drawer opens and closes instantly (0s).

## Components

### Themed modal (the blueprint)
A native `<dialog>` with a transparent dialog, the opaque page-colored face inside the 2px ring gap, the halo and sparks. ✕ closes and fully resets fields and errors.

**Modes**
- **Local profile:**
  - Profile list
  - Unlock
  - Switch / sign out (when a profile is active)
  - Create profile (with the identity picker)
  - Local reset — warning, then new password
- **Cloud account (optional):**
  - Sign in
  - Create account
  - Forgot password: e-mail → 6-digit code + new password
  - New-device profile setup
  - Session expired
  - Recover a linked profile
  - Unlink

### Identity wheel (signature component)
- **Layout:** five swatches on a pentagon, **clockwise from the top: W → U → B → R → G**.
  - Swatches are 19% of the wheel, centered on a 37% radius.
  - A rotating 2px ring through their centers in the role colors (opacity .7), over an inner radial glow at 18% primary.
  - Sizes: 300px desktop, 240px mobile.
- **Center:** the **tribe name** (Grenze) plus a muted subline (profile name, or the color names in pick order).
  - With no colors, the center shows the "Grimorio" wordmark and all five swatches sit neutral at .85.
- **States:**
  - **Picker** (create profile only): up to 3 picks, at least 1 kept. Unpicked .55, locked .3 + `not-allowed`.
  - **Display** (everywhere else): lit colors 1, unlit .35.

**Tribe names**

| Colors | Names |
|---|---|
| Mono | Mono-branco · Mono-azul · Mono-preto · Mono-vermelho · Mono-verde |
| Pairs | Azorius WU · Orzhov WB · Boros WR · Selesnya WG · Dimir UB · Izzet UR · Simic UG · Rakdos BR · Golgari BG · Gruul RG |
| Triples | Esper WUB · Jeskai WUR · Bant WUG · Mardu WBR · Abzan WBG · Naya WRG · Grixis UBR · Sultai UBG · Temur URG · Jund BRG |

### Mini wheel & identity chip
- **Mini wheel:** 36px, with 22% dots (lit 1 + a `0 0 6px` glow in their own color, unlit .18). Used in list rows.
- **Identity chip:** in the mobile header, 8px dots + "name · tribe" in 0.75rem, on surface, with a hairline and 4px radius.

### Buttons
- **Primary:** the glow button. Dark raised face; role-primary border and text; glow. **Never filled** — a filled Branco CTA can't stay readable.
- **Secondary:** raised face, hairline, text color.
- **Ghost:** transparent. Used for Cancelar.
- **Danger:** a dark red-tinted face with danger text and border (Desvincular).
- **All buttons:** 44px touch height. Disabled is `opacity .5` + `not-allowed`. No shrink on press.
- Progress rewrites the label ("Entrando…", "Criando perfil…", "Enviando…", "Saindo…"); the button is locked until the request resolves, so double-submit is impossible.

### Inputs
- **Field:** surface background, hairline, 4px radius, 44px minimum height. The label (0.875rem) sits above the field.
- **Helper:** 0.75rem muted, below the field. It is hidden while an error shows.
- **Field error:** 0.875rem danger, directly under the field.
- **Form-level error** (wrong credentials, offline, unrecognized error, account linked elsewhere): 0.875rem danger, `role="alert"`, right above the primary button.
- Set `autocomplete` correctly: `username`, `email`, `current-password`, `new-password`, `one-time-code`. The code field is numeric-only, 6 digits.

### Profile list rows
- **Row:** a full-width button, 56px minimum. Mini wheel + name (Karla 700) + meta ("Izzet · Vinculado à nuvem" / "Só neste aparelho"). The background is a vertical `surface-raised → surface` gradient.
- **Active profile:** listed first, outlined in its own primary color, with an **"Em uso"** badge (micro label, own-color border + glow), `aria-current`. It can't be picked.
- **Create row:** dashed hairline + "+ Criar novo perfil", muted text. On hover the text turns to the text color and the border to role-accent.

### Info plates
The e-mail chip ("Conta na nuvem" eyebrow + address) and status notices ("Você saiu de rafa…"): surface background, hairline, 4px radius, `role="status"` for notices.

### App top bar
The thin app-shell row above every screen (`role="banner"`). Its layout changes at the shell's one breakpoint, 960px.
- **Surface:** page background, no border and no shadow. The bottom edge is the "Fio de luz" flowing line, and the wash sits behind the wordmark.
- **Height:** 44px minimum. Padding `4px space-4` wide, `4px space-1 4px space-4` narrow. Contents are vertically centered.
- **Wordmark:** "Grimorio", a link to Início (`aria-label` "Grimorio — Início"). Grenze 700, 1.25rem, gradient text, no underline.
- **Wide (≥ 960px):** wordmark · sync area · divider (1px × 20px, `border`) · profile control. With no profile: wordmark · Entrar. The right group is text only: no faces, no borders.
- **Narrow (< 960px):** wordmark · sync mark · Menu. Menu is a ghost button with muted eyebrow text, `aria-expanded` and `aria-controls` pointing at the drawer. The profile control lives in the drawer.

### Profile control
Shows who is active and opens the profile modal at switch / sign out.
- **Active profile:** identity dots (8px circles, 3px apart, in pick order, each with a `0 0 6px` glow in its own color) + the name in Karla 700 (0.875rem in the bar, 1rem in the drawer). The name is never truncated.
- **No profile:** "Entrar" (Karla 700). In the drawer it follows "Nenhum perfil ativo" (0.75rem muted).
- 44px minimum, transparent, no border. Hover: text → `role-primary-hover`.
- **While a sync runs:** `aria-disabled`, opacity .5, `not-allowed`, and its label becomes "Aguarde a sincronização terminar".

### Sync area & sync mark
The active profile's sync status. It is never shown without a profile, and nothing starts a sync except the person.

| State | Mark (8px) | Label color | Label | Action |
|---|---|---|---|---|
| syncing | spinner, muted | muted | Sincronizando… | none (locked) |
| synced (< 5 min) | `text` dot + `0 0 8px` text glow at 60% | text | Sincronizado | Sincronizar agora |
| last | `text-muted` dot, no glow | muted | Sincronizado há N min / h / d | Sincronizar agora |
| never | 1px `text` ring | muted | Nunca sincronizado | Sincronizar agora |
| local | 1px `text-muted` ring | muted | Sem conta na nuvem | Vincular conta na nuvem |
| offline | `danger` dot + `0 0 8px` danger glow | danger | Sem conexão | Tentar de novo |
| expired | same | danger | Sessão expirada | Entrar de novo |
| error | same | danger | Falha ao sincronizar | Tentar de novo |

- **Sync area (wide):** a text button: mark + label, Karla 0.75rem, 44px, padding `0 space-3`. Hover: text color. Its accessible name is "{label}. {action}.", and it is locked while syncing.
- **Sync mark (narrow bar):** the mark alone in a 24 × 44 `role="status"` box, named by the label. Not interactive.
- **Drawer line:** `role="status"` mark + label (0.75rem, right-aligned), then the action as an eyebrow `.link-btn` (muted, danger for failures), hidden while syncing.

### Side nav
Wide only. `<nav aria-label="Navegação principal">` at the left edge of the area below the top bar.
- **Collapsed:** a 24px rail with the thread and the wash. Items show only their bead. Clicking the rail background pins the nav.
- **Hover / focus:** expands to 232px *over* the content, with the overlay glow and a `border` edge. It collapses 120ms after the pointer leaves, and when focus leaves.
- **Pinned:** 232px, no glow, and the content narrows. The choice is stored per device and falls back to collapsed if storage fails.
- A layout spacer follows the pinned width only, so hovering never moves the content.
- **Pin button:** always present at the top, hidden while collapsed so items never jump. Eyebrow text, 1px transparent border (hover: `border`), "Fixar menu" / "Recolher menu", `aria-pressed`.
- **Items:** 44px, gap 14px, muted, radius `0 4px 4px 0`. A 7px **bead** sits on the thread: a `border` ring on the page background; when current, filled `role-primary` with a `0 0 0 3px bg, 0 0 10px 1px primary` glow. The label shows only when expanded. The current label is 700 with gradient text, and the link has `aria-current="page"`.
- **Hover / focus:** text → `text`, a row wash (`primary` 16% → transparent at 75%), the bead scales 1.3 and glows, and the label nudges 3px and takes the title glow.

### Drawer
Narrow only. A native `<dialog>` (modal) anchored to the right edge, `min(288px, 85%)` wide, page background, a `border` left edge, the overlay glow when open, and the mirrored thread and wash. The backdrop is the modal backdrop.
- **Order:** ✕ (44 × 44, at the left of the header row) · account block (profile control, sync line, action; right-aligned) · 1px divider · nav items.
- **Nav items** are mirrored: the bead is on the right, radius `4px 0 0 4px`, the wash runs at 270deg, and labels are always shown. There is no pin button.
- **Closes** on ✕, a backdrop tap, Esc / Back and any navigation. Focus returns to Menu. Controls that open the profile modal close the drawer first.

### Legal notice
The last thing in every page's scroll area: `<aside aria-label="Aviso legal">`, a `border` hairline above, padding `space-5 space-6` (narrow: `space-5 space-4`), 0.75rem / 1.5 muted, paragraphs at most 72ch. It sits at the bottom of short pages.
- Three paragraphs: the Wizards of the Coast Fan Content notice, the Scryfall credit and the AI-assistance note.
- Links use `role-accent` (hover: `role-accent-hover` + underline) and open in a new tab, with a 44px hit area that doesn't change the line box.

## Content

- **PT-BR only.** Second person, imperative, no "we", no exclamation marks, no emoji. Em dashes are welcome.
- **Buttons are verbs:** Entrar, Criar perfil, Desbloquear, Enviar código, Salvar e entrar, Desvincular, Sair de {perfil}, Concluir.
- **Errors are plain and specific,** and never raw backend text:
  - "E-mail ou senha incorretos." — the one generic message; never reveals whether an account exists.
  - "Esse e-mail já está em uso." + "É seu? Recupere o acesso"
  - "Essa conta já está vinculada ao perfil {nome} neste aparelho."
  - "Senha incorreta." · "Use pelo menos 8 caracteres." · "Use de 3 a 16 caracteres." · "Use só letras, números, _ . ou -." · "Esse nome já está em uso neste aparelho."
  - "Código incorreto ou expirado. Peça um novo código." · "Digite os 6 dígitos do código."
  - "Sem conexão. A conta na nuvem precisa de internet — o resto do app continua funcionando."
  - "Algo deu errado. Tente de novo em instantes." — the fallback for unrecognized errors.
- **Destructive or permissive actions state the consequence:** unlinking deletes nothing; resetting an unlinked profile warns that anyone on this device can do it.
- **Prompts at the bottom of the form pane are a question + a link:** "Ainda não tem conta na nuvem? Criar conta", "Não é você? Trocar de perfil", "Perfil em outro aparelho? Entrar com conta na nuvem".
- **Identity is always named twice:** the tribe name for flavor, the color names for clarity. Never rely on color alone.
  - **Shell exception:** the profile control shows only the identity dots + the profile name. The tribe and color names are in its accessible name ("Perfil {nome} — {Tribo} · {Cor} · {Cor}. Trocar de perfil ou sair.").

## Iconography

- **No icon library, and no Magic symbols** (Wizards of the Coast fan-content policy). Identity is shown with plain color swatches plus written names.
- The only glyphs used as text are **✕** (close) and **+** (create). The shell's "Menu" and pin controls are words, not icons.
- **No logo:** the word **Grimorio** in Grenze 700, in role-primary, is the mark.
- Tribe/guild names are Wizards of the Coast terms — confirm fan-content policy compliance before release.

## Do's and Don'ts

### Do
- Tint with `--role-*` only; redeclare the role chain on every themed root.
- Glow instead of drop shadows; animate size changes; respect reduced motion.
- Keep 44px touch targets and correct `autocomplete` on every field.
- Lock submit while a request runs; clear errors when switching forms; reset everything on close.
- Show who is signed in (the "Em uso" row, the identity chip) whenever switching is possible.
- Write every string in PT-BR.

### Don't
- Don't use Magic's symbols, an icon library, emoji or a third typeface.
- Don't fill a primary button with an identity color.
- Don't use pale pastel status backgrounds on the dark page.
- Don't show a profile's colors while no profile is active (the Default Rule).
- Don't make any capability depend on a cloud account.
- Don't add Google or other third-party sign-in until a spec reintroduces it.
- Don't carry forward any convention older than this document.
