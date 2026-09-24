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
motion:
  ease: "cubic-bezier(0.4, 0, 0.2, 1)"
  fast: "0.18s"
  base: "0.24s"
  slow: "0.5s"
  ring-rotation: "28s"
  halo-flicker: "6s"
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
- `--role-accent` — links, spinner, the sync dot, the dashed row's hover border.
- `--role-tertiary` — the third stop of the ring and halo gradients.

A themed subtree sets `--theme-primary/-accent/-tertiary` (and `-hover`). **Each themed root must redeclare the `--role-*` chain** (see `[data-grm]` in the blueprint). Custom properties resolved on `:root` do not pick up values set on descendants.

### Default identity
**Vermelho → Azul → Verde** (R primary, U accent, G tertiary), built from the same identity tokens — there are no extra brand colors. Used when no profile is active: signed out, first run, and new-device sign-in before the account's colors arrive.

- It only tints the chrome (ring, halo, glows, buttons). The identity wheel stays neutral — all five swatches at .85 with the "Grimorio" wordmark in the center — because the default belongs to no one.
- In the prototype, the default identity is `DEFAULT_ID` in `GrimorioAuthModal`.

### Danger
- **Danger** `oklch(0.72 0.16 28)` — error text under fields, errors for the whole form, danger button text and border. It was chosen to be readable on the page; the old saturated red failed contrast.
- **Danger bg** `oklch(0.27 0.06 28)` — the danger button face: a dark, red-tinted surface, never a pale pastel.

Success and warning colors are **not yet defined**. Don't borrow them from anywhere; define them here first.

### Named rules
**The Identity Rule.** Only the three roles carry color. Never add a second warm accent, and never hard-code an identity hex into UI chrome. The exceptions are swatches and pips, which *are* the identity.

**The Default Rule.** No active profile means the default identity (Vermelho → Azul → Verde). The UI never shows one person's colors while that person's data is hidden.

## Typography

**Display:** Grenze 600 (wordmark: Grenze 700). **Text:** Karla 400–700.

| Role | Face | Size | Notes |
|---|---|---|---|
| Wordmark "Grimorio" | Grenze 700 | 2rem desktop / 1.25rem mobile header | `--role-primary`, glow |
| Modal title / done title | Grenze 600 | 2rem desktop / 1.25rem mobile (done: 2rem) | glow |
| Tribe name (wheel center) | Grenze 600 | 2rem | glow, wraps inside 54% of the wheel |
| Body | Karla 400 | 1rem / 1.5 | |
| Label, subtitle, links, errors | Karla | 0.875rem | |
| Helper, metadata, chips | Karla | 0.75rem | muted |
| Micro label | Karla | 0.75rem, 0.05em tracking, uppercase | "OU", divider labels, "Em uso" badge |
| Eyebrow | Karla | 0.75rem, 0.14em tracking, uppercase | "Sua identidade", "Conta na nuvem" |

- **Title glow:** `text-shadow: 0 0 24px rgb(from var(--role-primary) r g b / 35%)`. Titles glow; they never change color.
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

## Shapes

- Radius 4px for controls (buttons, inputs, chips, badges, info plates).
- Radius 8px for containers (modal face, list rows).
- Radius 10px for the ring (8px + the 2px gap).
- 50% for swatches, pips and the wheel.
- Every border is exactly **1px**, solid; the create-row is dashed. No heavier weights.

## Motion

- The easing is always `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Durations:** 0.18s hover/focus, 0.24s modal height, 0.5s swatch state and name entrance.
- **Name entrance:** fade + `blur(6px)` + `scale(.92)` over 0.5s, re-triggered whenever the tribe name changes.
- **Swatch pick:** the swatch scales to 1.06 (unpicked ones 0.88–0.9). A 0.7s ripple ring (scale 1 → 1.9, fading out) plus a burst of 8 sparks (26–46px, 0.6–0.9s) in the picked color.
- **Retint on link:** when a cloud account's saved colors replace the profile's, the wheel ripples on every newly lit color.
- **Hover preview:** in the profile list, hovering or focusing a row retints the whole modal to that profile. Leaving the *list* (not an individual row) restores it, so there's no flicker in the gaps.
- **`prefers-reduced-motion`:** all ring, halo, spark and ripple animation stops. Rings freeze.

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

### Sync line
Shown after linking, creating an account, unlocking a linked profile or setting up a new device. While syncing: a spinner in role-accent + "Sincronizando…" / "Baixando sua coleção…". When finished: an 8px role-accent dot with a glow + "Sincronizado agora" / "Coleção baixada".

## Content

- **PT-BR only.** Second person, imperative, no "we", no exclamation marks, no emoji. Em dashes are welcome.
- **Buttons are verbs:** Entrar, Criar perfil, Desbloquear, Enviar código, Salvar e entrar, Desvincular, Sair de {perfil}, Concluir.
- **Errors are plain and specific,** and never raw backend text:
  - "E-mail ou senha incorretos." — the one generic message; never reveals whether an account exists.
  - "Esse e-mail já está em uso." + "É seu? Recupere o acesso"
  - "Essa conta já está vinculada ao perfil {nome} neste aparelho."
  - "Senha incorreta." · "Use pelo menos 8 caracteres." · "Use de 3 a 20 caracteres." · "Use só letras, números, _ . ou -." · "Esse nome já está em uso neste aparelho."
  - "Código incorreto ou expirado. Peça um novo código." · "Digite os 6 dígitos do código."
  - "Sem conexão. A conta na nuvem precisa de internet — o resto do app continua funcionando."
  - "Algo deu errado. Tente de novo em instantes." — the fallback for unrecognized errors.
- **Destructive or permissive actions state the consequence:** unlinking deletes nothing; resetting an unlinked profile warns that anyone on this device can do it.
- **Prompts at the bottom of the form pane are a question + a link:** "Ainda não tem conta na nuvem? Criar conta", "Não é você? Trocar de perfil", "Perfil em outro aparelho? Entrar com conta na nuvem".
- **Identity is always named twice:** the tribe name for flavor, the color names for clarity. Never rely on color alone.

## Iconography

- **No icon library, and no Magic symbols** (Wizards of the Coast fan-content policy). Identity is shown with plain color swatches plus written names.
- The only glyphs used as text are **✕** (close) and **+** (create).
- **No logo:** the word **Grimorio** in Grenze 700, in role-primary, is the mark.

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
