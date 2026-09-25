# Grimorio design system — brief for Claude Design

This folder is everything needed to build Grimorio's design system **from scratch** in Claude
Design. It is taken only from what the app ships today (`DESIGN.md`, `src/styles/`,
`src/app/shared/ds/`). It **replaces** the earlier "Arcano" project entirely. Don't merge the
two, and don't bring anything from Arcano forward unless it also appears in these files.

## Files and source-of-truth order

When two files disagree, the one higher in this list wins.

1. **`DESIGN.md`**: the rules, tokens, components, content and do's/don'ts.
2. **`tokens.css`**: every token as a CSS custom property, plus the role chain, light
   recipes, keyframes, reduced-motion rule and page base. Compiled from the app's live
   `src/styles/_tokens.scss` + `_base.scss`.
3. **`controls.css`**: the class-based primitives (buttons, fields, plate, labels,
   divider), compiled from `src/styles/_controls.scss`.
4. **`components/*.css`**: compiled styles of the shipped components (see the note on
   `:host` below).
5. **`SPECS.md`**: measurements, layout and behavior for the modal, wheel, rows and
   the other pieces, plus accessibility.
6. **`STATES.md`**: every screen and state of the entry (profile/account) modal, with
   its copy.
7. **`entry-copy.ts`**: every approved PT-BR string, verbatim.

## Product in one paragraph

Grimorio (Portuguese for "grimoire") is a free, PT-BR-only Magic: The Gathering collection and
deck manager. It tracks where each physical card is stored. It is local-first: profiles live
on the device and a cloud account is optional. It runs as a responsive web app/PWA on phones
(for quick use while sorting cards) and on desktop (for larger-scale management). It has no
logo: the word **Grimorio** in Grenze 700, in the primary role color, is the mark.

## Foundations (all in `DESIGN.md` + `tokens.css`)

- **North star:** "A dark tome, retinted by the player."
- **Neutral scale (never retinted):** `--color-bg #14110f`, `--color-surface #1e1a17`,
  `--color-surface-raised #292320`, `--color-border #3a332e`, `--color-text #f2ede8`,
  `--color-text-muted #a89e96`, `--overlay-backdrop rgba(0,0,0,.75)`.
- **Danger:** `--color-danger oklch(0.72 0.16 28)`, `--color-danger-bg oklch(0.27 0.06 28)`.
  These are the only status colors.
- **Identity colors (W U B R G, base/hover):** Branco `#d8cdb0/#e6dcc2`, Azul
  `#3d6b85/#4c7f9c`, Preto `#7c5aa6/#8f6bb8` (shown violet), Vermelho `#a8402c/#bf4f39`,
  Verde `#4c7a43/#5c8f52`. The same five values are used everywhere.
- **Roles:** `--role-primary/-accent/-tertiary` (+`-hover`). Pick order sets role order.
  Fallback runs tertiary → accent → primary → **default identity**. Any themed subtree sets
  `--theme-*` and carries `[data-theme-scope]`, which makes the role chain re-resolve there.
- **Default identity:** Vermelho → Azul → Verde, from `--default-*`. It applies when no profile
  is active. It tints the chrome only; the identity wheel stays neutral.
- **Light recipes:** `--glow-title`, `--glow-button`, `--glow-button-text`,
  `--glow-plate-hover`, `--wash-header`, `--ring-gradient`, `--halo-gradient`. There is one
  neutral shadow, `--shadow-rest`.
- **Type:** Grenze 600 (titles) / 700 (wordmark) and Karla 400–700. Sizes are 0.75 / 0.875 /
  1 / 1.25 / 1.5 / 2rem; line-heights are 1.2 / 1.5; tracking is 0.05em (micro) / 0.14em
  (eyebrow).
- **Spacing:** `--space-1…6` = 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2rem. Nothing is larger than 2rem.
- **Sizes:** 44px touch target, 56px list row, 880px modal, 460px modal minimum height, 400px
  identity pane, and wheels of 300 / 240 / 36px.
- **Shape:** 4px for controls, 8px for containers, 10px for the ring, 50% for swatches. Every
  border is 1px (the create row is dashed).
- **Motion:** easing `cubic-bezier(0.4, 0, 0.2, 1)`. Durations are 0.18s (hover), 0.24s
  (height), 0.5s (swatch/name), 28s (ring spin) and 6s (flicker). Keyframes: `spin-angle`,
  `flicker`, `spark`, `ripple`, `name-in`, `spin`. Under reduced motion, all of it stops.
- **Breakpoint:** 640px (the modal goes full-bleed below it). This is not a token.

## Component inventory (complete — nothing else exists yet)

**Class primitives** (`controls.css`):
- Buttons: `.btn` with `--primary` (the glow button, never filled), `--secondary`, `--ghost`,
  `--danger` and `--block`.
- `.link-btn`.
- Fields: `.field`, `.field__label`, `.field__input` (with `[aria-invalid]` and `[readonly]`),
  `.field__helper`, `.field__error`.
- `.plate`, `.eyebrow`, `.micro-label`, `.divider`.

**Components.** These are Angular components in the app; recreate them in whatever form suits
Claude Design:

| Component | Inputs / variants | Notes |
|---|---|---|
| ThemedModal | `open`, `roles`, `faceHeight`, `labelledBy`; slots: aside (identity pane), sparks, body | Native `<dialog>` and its own themed root. Ring + halo + face. Full-bleed under 640px. `components/themed-modal.css` |
| IdentityWheel | `mode: picker \| display`, `picks` (1–3, ordered), `neutral`, `subline`, `size` | Swatches clockwise W U B R G. Tribe name + subline in the center; wordmark when neutral. Ripple + burst on each newly lit color. `components/identity-wheel.css` |
| MiniWheel | `colors` | 36px, decorative (`aria-hidden`) |
| IdentityChip | `colors`, `label` | 8px glowing dots + "{P} · {Tribe}", 28px high, on surface |
| ProfileRow | `profile`, `active`, `dashed` | Gradient row, 56px, mini wheel + name + meta. The active row gets an "Em uso" badge in its own color. The dashed row is "+ Criar novo perfil". `components/profile-row.css` |
| TextField | `label`, `type`, `value`, `helper`, `error`, `readonly`, `autocomplete`, `inputmode`, `maxlength` | Built on `.field*`. The error replaces the helper. Uses `aria-describedby` |
| SparkField | `count` (20 desktop / 12 mobile), `direction: outward \| inward` | Decorative. Renders nothing under reduced motion. `components/spark-field.css` |
| SyncLine | `state: pending \| done \| failed`, `label` | `role="status"`: a role-accent spinner, then a dot. "failed" is plain text, with no status color |
| App top bar | — | Page background, hairline below, 44px high, wordmark at 1.25rem on the left |

`:host` in the component CSS means the component's root element. The custom properties that
the component CSS reads but `tokens.css` doesn't declare are set per element by the component:
`--hex` (a swatch or dot's identity color), `--own` (the active profile's primary), `--size`
(the wheel's size), and `--dx`/`--dy`/`--dur`/`--delay`/`--c` (per-spark randomization). The
themed root sets `--theme-*`.

**Tribe names** are listed in `DESIGN.md` → Identity wheel. The lookup key is the picked colors
in W U B R G order.

## Content

- PT-BR only. Second person and imperative. No "we", no exclamation marks, no emoji. Em
  dashes are fine.
- Buttons are verbs. While a request runs, the button's label is rewritten ("Entrando…").
- Errors are plain and specific. Use the strings in `entry-copy.ts` / `DESIGN.md` → Content.
- Identity is always named twice: the tribe name and the color names.

## Discard — retired definitions still present in the old Arcano project

None of these exist any more. Don't recreate them.

- The ember-orange / teal brand fallback (`--color-primary`, `--color-primary-hover`,
  `--color-primary-contrast`, `--color-accent`, `--color-accent-hover`), a role chain that
  ends in orange, `--shadow-glow-primary-strong`, and the teal `--ring-accent` focus ring.
  Focus is now `outline: 2px solid var(--role-accent)`.
- The old status palette: `#c00` danger, and the pastel `success`/`warning` background and
  text colors.
- MTG print colors (`--print-*`), `--glow-colorless/-four-color/-five-color`, and
  `--radius-card: 14px`.
- The mana/card symbol set, the `ManaSymbol` component, and the glyphs ☰ − ✓ and the `/`
  breadcrumb separator. The only glyphs are ✕ and +.
- "Roxo" as the name for B. It is **Preto**.
- Grenze 400 and italic. Only 600 and 700 are loaded.
- The layout tokens `--nav-bar-height`, `--shell-max-width`, `--sidebar-width`,
  `--bp-mobile`/`--bp-wide`, and the semantic aliases (`--surface-*`, `--text-*`, `--type-*`,
  `--border-hairline`).
- All legacy components: NavBar/NavDrawer, AuthControl, ViewHeader, CardScatterGrid,
  CardRowList, LocationStrip, SearchToolbar, DashboardPanel, EntityList, StatusBadge,
  EmptyState, FusedBar, SegmentedToggle, Select, Checkbox, CardArt, ColorIdentity,
  ColorThemePicker, the `filled` button variant, and the `ui_kits/grimorio-app` recreation.
- The legacy idioms: dialog `@starting-style` entrance, grid-rows collapse, themed
  scrollbars, card scatter/hover lift, and collection/deck example copy.

## Undecided — do not invent

These are open questions, not gaps to fill. Leave them out of the design system.

- Success and warning colors.
- The delete-profile flow.
- The active-profile / sync-status indicator in the app shell. The top bar's profile button
  and its menu are temporary placeholders (their strings in `entry-copy.ts` under the top-bar
  section are placeholders too).
- Navigation, Home, and any collection, card, deck, location or scan UI.
- Any use of Magic symbols or card imagery.

## Suggested project layout

- `styles.css`: imports `tokens.css` and `controls.css`.
- Specimen cards: Colors (neutral + danger), Identity (five colors, roles, default identity),
  Type, Spacing, Sizes, Shape, Elevation/light recipes, Motion.
- One card per component in the inventory above, showing its states (for example, the wheel
  in picker/display/neutral modes, the row in normal/active/dashed variants, and the sync
  line pending/done/failed).
- The entry modal, desktop and mobile, as the single composed example.
