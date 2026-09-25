# Handoff: App shell navigation (spec 004)

## Overview
The app shell for **Grimorio**, the PT-BR, local-first MTG collection manager. It covers:
- the top bar (wordmark, sync status, active-profile indicator)
- the desktop side nav (collapsed "thread", hover-expanded, pinned)
- the mobile drawer (account, sync and nav, mirrored to the right edge)
- the view-area scrolling model
- the legal notice at the end of every page

Source requirements: `specs/004-app-shell-navigation/spec.md` on branch `feature/004-app-shell-navigation` of `rofelixk/grimorio`. The visual language follows DESIGN.md plus the **"Fio de luz"** direction (Nav Options 1c + top bar 4b). That direction adds flowing identity-color bands, and they need new DESIGN.md entries (see *DESIGN.md changes*).

## About the design files
The files in this bundle are **design references built in HTML**: prototypes that show the intended look and behavior. They are not production code. The job is to **recreate them in the existing Angular app** (`src/app/shared/layout/`, `src/app/shared/ds/`, `src/styles/`) using its patterns:
- signals
- `mediaQuerySignal`
- the `_breakpoints.scss` mixins
- class primitives from `_controls.scss`
- tokens from `_tokens.scss`

Replace `src/app/shared/layout/top-bar/top-bar.ts` and the legacy `nav-bar`. Do not reuse anything from `src/app/shared/common/` or the legacy nav-bar.

## Fidelity
**High fidelity.** Colors, type, spacing, motion and copy are final. The page content (Início / Coleção) is placeholder and out of scope. The profile modal shown is a simplified stand-in for the existing spec-003 `EntryModal`, which must be reused unchanged.

## Breakpoints
- **≥ 960px (wide):** side nav (collapsed thread / hover / pinned). Top bar = wordmark · sync · profile.
- **< 960px (narrow):** no side nav. Top bar = wordmark · sync indicator · Menu. The nav lives in a right-side drawer.
- Existing `$bp-mobile: 640px` is no longer used by the shell. `$bp-wide: 960px` is the only shell breakpoint.

## Layout and scrolling
- The root is a grid `auto | minmax(0, 1fr)` with `height: 100dvh` and `overflow: clip`. html/body never scroll, sideways or down.
- The top bar is row 1. Row 2 is `display: flex` holding:
  - (wide) a nav spacer
  - the absolutely positioned `<nav>`
  - `<main>`
- `<main>` is the only scroll container: `overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column`, thin scrollbar (`scrollbar-color: var(--color-surface-raised) transparent`).
  - Page content: `flex: none`, padding `space-6`.
  - Notice: `margin-top: auto`, so it sits at the bottom on short pages.
- Reset `main.scrollTop = 0` on every route change.
- Use `focus({ preventScroll: true })` whenever focus moves into or out of off-screen elements (the drawer). Otherwise the browser scrolls the shell sideways.

---

## Shared "light" recipes (new)
All recipes resolve against `--role-*` inside `[data-theme-scope]`.

```
--band:     linear-gradient(90deg,
              var(--role-primary) 0%, var(--role-primary) 20%,
              var(--role-accent) 33%,  var(--role-accent) 53%,
              var(--role-tertiary) 66%, var(--role-tertiary) 86%,
              var(--role-primary) 100%);           /* background-size 2400px, repeat */
--band-v:   same stops at 180deg (vertical)
--band-lit: same stops, each color as oklch(from var(--role-x) max(l, 0.68) c h)   /* for text */
```

Keyframes (120s, linear, infinite):
```
@keyframes grm-flow-long { from { background-position: 0 0 }    to { background-position: 2400px 0 } }
@keyframes grm-flow-mark { from { background-position: -16px 0 } to { background-position: 2384px 0 } }
@keyframes grm-flow-v    { from { background-position: 0 0 }    to { background-position: 0 2400px } }
```
`prefers-reduced-motion: reduce` stops all of these, and the drawer transition becomes 0s.

**Gradient text** (wordmark, current nav label):
```
color: transparent;
background: var(--band-lit) repeat-x; background-size: 2400px 100%;
-webkit-background-clip: text; background-clip: text; text-shadow: none;
filter: drop-shadow(0 0 1px var(--color-bg))
        [wordmark only: drop-shadow(0 0 3px var(--color-bg))]
        drop-shadow(0 0 10px rgb(from var(--role-primary) r g b / 30%));   /* nav label: 8px */
animation: grm-flow-mark 120s linear infinite;   /* nav label: grm-flow-long */
```

**Wash** (top bar left, nav/drawer top corner):
- Top bar:
  - `position: absolute; inset-block: 0; left: 0; width: 360px; max-width: 70%; opacity: .3`
  - background `--band` repeat-x, size 2400px 100%
  - `mask-image: radial-gradient(ellipse 100% 150% at 0% 50%, #000, transparent 75%)`
  - animated with `grm-flow-long`
- Nav (and the drawer, mirrored with `at 100% 0%` and `right: 0`):
  - `top: 0; left: 0; width: 100%; height: 360px; max-height: 70%; opacity: .3`
  - background `--band-v` repeat-y, size 100% 2400px
  - `mask-image: radial-gradient(ellipse 150% 100% at 0% 0%, #000, transparent 75%)`
  - animated with `grm-flow-v`

**Line** (replaces the top-bar hairline):
- `position: absolute; left: 0; right: 0; bottom: 0; height: 1px`
- background `--band` repeat-x, size 2400px 1px
- animated with `grm-flow-long`

**Thread** (nav edge):
- `position: absolute; top: 0; bottom: 0; left: 11px; width: 1px` (drawer: `right: 11px`)
- background `--band-v` repeat-y, size 1px 2400px
- `box-shadow: 0 0 6px rgb(from var(--role-primary) r g b / 35%)`
- animated with `grm-flow-v`

**Overlay glow** (hover-expanded nav, open drawer): `var(--shadow-rest), 0 0 24px -6px rgb(from var(--role-primary) r g b / 45%)`

All decorative spans are `aria-hidden="true"` and `pointer-events: none`. Siblings that must sit above them get `position: relative`.

---

## Screens / components

### 1. Top bar (`role="banner"`)
- **Container:**
  - `display: flex; align-items: center; gap: var(--space-1); min-height: 44px; overflow: hidden; background: var(--color-bg); position: relative; z-index: 3`
  - Padding: wide `4px var(--space-4)`; narrow `4px var(--space-1) 4px var(--space-4)`
  - No border. The bottom edge is the **Line** recipe, and the **Wash** sits at the left.
- **Wordmark:**
  - `<a>` to Home, `aria-label="Grimorio — Início"`, class `.grm-wordmark`
  - Grenze 700, `font-size: var(--font-size-lg)` (1.25rem), `min-height: 44px`, no padding
  - Gradient text (wordmark variant), no underline on hover
- **Wide right group** (`margin-left: auto; display: flex; align-items: center`), only when a profile is active. It is text only: no faces, no borders.
  1. **Sync area**, a `<button>`:
     - `min-height: 44px; padding: 0 var(--space-3); gap: var(--space-2)`
     - Karla 0.75rem / 1.2, `white-space: nowrap`, transparent background, no border
     - Contents: state mark + full label (see *Sync states*)
     - Hover: color → `--color-text`
     - Locked while syncing: `aria-disabled="true"`, `cursor: not-allowed`, no-op
     - `aria-label`/`title` = full label + action ("Sincronizado há 42 min. Sincronizar agora.")
  2. **Divider:** `1px × 20px`, `background: var(--color-border)`, `aria-hidden`
  3. **Profile indicator**, a `<button>`:
     - `min-height: 44px; padding: 0 var(--space-3); gap: var(--space-2)`, transparent, no border
     - Contents: identity dots (8px circles, `gap: 3px`, `background: var(--identity-x)`, `box-shadow: 0 0 6px var(--identity-x)`, in pick order) + name (Karla 700, 0.875rem)
     - No tribe text visible. `aria-label` = "Perfil {nome} — {Tribo} · {Cor} · {Cor}. Trocar de perfil ou sair."
     - Hover: color → `--role-primary-hover`
     - While syncing: `aria-disabled`, `opacity: .5`, `not-allowed`, title/label "Aguarde a sincronização terminar"
     - Opens the profile modal in the switch/sign-out step
- **Wide, no profile:** text button "Entrar" (Karla 700, 0.875rem, 44px, padding `0 var(--space-3)`, hover `--role-primary-hover`). It opens the modal at the profile list. No sync area.
- **Narrow right group** (`margin-left: auto; gap: var(--space-1)`):
  1. **Sync indicator:**
     - Mark only, in a `24 × 44` span, `role="status"`, `aria-label`/`title` = full label
     - **Not interactive on mobile.** Syncing happens from the drawer.
     - Hidden with no profile.
  2. **Menu button:**
     - `.btn .btn--ghost`, padding `0 var(--space-2)`
     - Text "Menu" as an eyebrow: 0.75rem, `letter-spacing: var(--tracking-eyebrow)`, uppercase, `--color-text-muted`
     - `aria-expanded`, `aria-controls="grm-drawer"`

### 2. Sync states
Healthy states are **neutral**: identity colors never signal status, so a red identity never looks like an error. Only failures use `--color-danger`. Marks are 8px.

| State | Mark | Label color | Full label (bar, drawer, aria) | Tap (wide / drawer action) |
|---|---|---|---|---|
| syncing | `.grm-sync .spinner` in `--color-text-muted`, 0.75rem | muted | Sincronizando… | locked, no-op |
| synced (< 5 min) | dot `--color-text` + `0 0 8px rgb(from var(--color-text) r g b / 60%)` | text | Sincronizado | sync · "Sincronizar agora" |
| last synced | dot `--color-text-muted`, no glow | muted | Sincronizado há N min / h / d | sync · "Sincronizar agora" |
| never | 1px ring `--color-text` | muted | Nunca sincronizado | sync · "Sincronizar agora" |
| no cloud account | 1px ring `--color-text-muted` | muted | Sem conta na nuvem | modal → link account · "Vincular conta na nuvem" |
| offline | dot `--color-danger` + `0 0 8px` danger | danger | Sem conexão | retry · "Tentar de novo" |
| session expired | same | danger | Sessão expirada | modal → session-expired step · "Entrar de novo" |
| error | same | danger | Falha ao sincronizar | retry · "Tentar de novo" |

- Relative time: `< 60 min` → "há N min"; `< 24 h` → "há N h"; otherwise "há N d". It updates every minute while shown.
- "Sincronizado" lasts 5 minutes after success, then switches to "há 5 min".
- A sync must end, in success or error, within 60s.
- Nothing starts a sync except the user.

### 3. Desktop nav (≥ 960px)
- `<nav aria-label="Navegação principal">`:
  - `position: absolute; left: 0; top: 0; bottom: 0; z-index: 2; box-sizing: border-box`
  - `display: flex; flex-direction: column; gap: 4px; overflow: hidden; background: var(--color-bg)`
- **A spacer** before `<main>` holds the layout: 24px normally, 232px when pinned. It transitions width over `--duration-base`. Content never shifts on hover.
- **Collapsed:**
  - width **24px**, padding `10px 0`, `border-right: 1px solid transparent`
  - Shows the **Thread** and **Wash**
  - Items show only their bead
  - Clicking the nav background (the thread) pins it
- **Expanded on hover or focus:**
  - width **232px**, padding `10px 10px 10px 0`, `border-right: 1px solid var(--color-border)`
  - **Overlay glow**, overlays the content
  - Opens on pointer enter or focus inside. Closes 120ms after pointer leave (debounced) and on focus out.
- **Pinned:**
  - Same 232px width, no glow, spacer 232px
  - Stored per device in `localStorage` (the prototype uses key `grimorio-proto:nav-pinned`; pick an app key)
  - Falls back to collapsed if storage fails
- **Width, box-shadow and border-color** transition over `var(--duration-base) var(--ease-standard)`.
- **Pin button:** always in the DOM at the top, so items never jump.
  - `visibility: hidden; opacity: 0` while collapsed; fades in over `--duration-base` when expanded
  - `min-height: 44px; margin: 0 0 6px 20px; width: calc(100% - 20px); padding: 0 8px`
  - 1px transparent border, radius `--radius-sm`; hover: border `--color-border`, text `--color-text`
  - Eyebrow text: 0.75rem, tracking eyebrow, uppercase, muted
  - Label "Fixar menu" / "Recolher menu", `aria-pressed`
- **Item** (only "Coleção" for now):
  - Structure: `<a>` with `aria-current="page"` when current (the collection or any page inside it)
  - Box: `display: flex; align-items: center; gap: 14px; min-height: 44px; padding: 0 4px; border: 1px solid transparent; border-radius: 0 4px 4px 0; white-space: nowrap; color: var(--color-text-muted)`
  - **Bead:** 7px circle, `margin-left: 3px`, `box-sizing: border-box`, so it centers on the thread at x = 11.5
    - Default: `border: 1px solid var(--color-border); background: var(--color-bg)`
    - Current: border and fill `--role-primary`, `box-shadow: 0 0 0 3px var(--color-bg), 0 0 10px 1px var(--role-primary)`
  - **Label:** shown only when expanded. Karla 0.875rem. Current: 700 + gradient text (nav variant).
  - **Hover / focus (the "flair"):** all transitions over `--duration-fast`
    - text → `--color-text`
    - row background `linear-gradient(90deg, rgb(from var(--role-primary) r g b / 16%), transparent 75%)` (expanded only)
    - bead border → role-primary, `scale(1.3)`, `box-shadow: 0 0 0 3px var(--color-bg), 0 0 8px 1px rgb(from var(--role-primary) r g b / 70%)`
    - label `translateX(3px)` + `text-shadow: var(--glow-title)`
    - current bead glow grows to `0 0 16px 3px`
- There is no Home link: the wordmark is Home. On "Coleção" with no active profile, the existing profile gate opens the modal.

### 4. Mobile drawer (< 960px)
- **Backdrop** (always mounted when narrow): `position: absolute; inset: 0; z-index: 10; background: var(--overlay-backdrop)`. Opacity 0 ↔ 1 over **0.36s** `--ease-standard`, `pointer-events` none/auto. Tapping it closes the drawer.
- **Drawer** `<aside id="grm-drawer" role="dialog" aria-modal="true" aria-label="Menu" tabindex="-1">`:
  - Position: `position: absolute; right: 0; top: 0; bottom: 0; z-index: 11; width: min(288px, 85%)`
  - Surface: `background: var(--color-bg); border-left: 1px solid var(--color-border); outline: none`
  - Open state: `transform: translateX(0)` + overlay glow
  - Closed state: `translateX(100%)`, no shadow, `visibility: hidden` with a 0.36s delay
  - `transition: transform 0.36s, box-shadow 0.36s` (`--ease-standard`)
  - **Mirrored** Thread (`right: 11px`) and Wash (`at 100% 0%`)
- **Header row:** `min-height: 44px; padding: 4px 20px 4px var(--space-1)`, containing only ✕ (44×44, transparent, muted, hover text, `aria-label="Fechar"`) at the left.
- **Account block:**
  - `flex column; align-items: flex-end; gap: var(--space-1); padding: var(--space-2) 28px var(--space-4) var(--space-4); text-align: right`
  - **Profile button** (44px min): dots 8px + name (Karla 700, 1rem) on one line; hover `--role-primary-hover`. Opens the modal (switch / sign out). Locked (opacity .5) while syncing.
  - **Sync line** (`role="status"`): mark + full label, 0.75rem, right-aligned.
  - **Action:**
    - `.link-btn`, 0.75rem eyebrow style (tracking, uppercase)
    - Muted, or danger for failures; hover text + underline
    - Label per the table above; hidden while syncing
  - No profile: "Nenhum perfil ativo" (0.75rem muted) + "Entrar" (Karla 700, 1rem, 44px).
- **Divider:** 1px `--color-border`, `margin: 0 20px var(--space-2) var(--space-4)`.
- **Nav items:** the same component mirrored:
  - `flex-direction: row-reverse`, bead `margin-right: 3px`
  - Radius `4px 0 0 4px`, hover wash `270deg`, label nudge `-3px`
  - Labels always visible; no pin button
- **Behavior:**
  - Open with Menu. Close on destination pick, backdrop tap, ✕ or Escape/Back.
  - Focus is trapped (Tab wraps between first and last focusable).
  - Keyboard open focuses ✕ and keyboard close returns focus to Menu. Pointer open/close focuses the drawer itself, so no ring flashes.
  - Always `focus({ preventScroll: true })`.
  - On resize to ≥ 960, the drawer state is dropped and the desktop pin preference applies.

### 5. Legal notice (end of `<main>`)
- **Container:** `<aside aria-label="Aviso legal">`
  - `margin-top: auto; flex-column; gap: var(--space-2); padding: var(--space-5) var(--space-6)` (narrow: `var(--space-5) var(--space-4)`)
  - `border-top: 1px solid var(--color-border)`
  - Text: 0.75rem / 1.5, `--color-text-muted`; each `p` has `max-width: 72ch; text-wrap: pretty`
- **Links:**
  - `--role-accent`, hover `--role-accent-hover` + underline, `target="_blank" rel="noopener"`
  - 44px hit area without changing the line box: `display: inline-block; padding: 13px 0; margin: -13px 0`
- **Copy** (one shared source with About):
  1. Grimorio é Fan Content não-oficial, permitido segundo a [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy) da Wizards of the Coast. Não é aprovado nem endossado pela Wizards. Partes dos materiais usados são propriedade da Wizards of the Coast. ©Wizards of the Coast LLC.
  2. Os dados e imagens de cartas exibidos no Grimorio são fornecidos por [Scryfall](https://scryfall.com).
  3. Parte do desenvolvimento deste app contou com ferramentas de inteligência artificial.

### 6. Modal interplay
- Reuse the existing `EntryModal` unchanged.
- **Open it at:**
  - switch/sign-out: profile tap with an active profile
  - profile list: "Entrar" with no profile, or Coleção without a profile
  - link cloud account: sync tap with no cloud account
  - session expired: sync tap in the expired state
- **While it's open**, everything behind it is inert: top bar, nav, drawer and view.
- **Remove the modal's automatic syncs** after link, set-up, unlock and re-auth.

## State
- `activeProfile` → name, colors (pick order), `linked`.
- Per-profile sync status: `idle | syncing | offline | expired | error`, plus `lastSyncedAt: number | null` persisted per profile.
- Derived display state (table above), re-evaluated every 60s.
- `navPinned` (device pref), `navHover`, `navFocusWithin`, `drawerOpen`, `route` (for `aria-current`, prefix match on the collection routes).
- **Theming:** the app root sets `--theme-primary/-accent/-tertiary` (+ `-hover`) from the profile's picks. Unset roles copy the previous one; with no profile, use Vermelho → Azul → Verde. The root carries `[data-theme-scope]`.

## Design tokens used
- **Neutrals:** bg `#14110f`, surface `#1e1a17`, raised `#292320`, border `#3a332e`, text `#f2ede8`, muted `#a89e96`, backdrop `rgba(0,0,0,.75)`.
- **Danger:** `oklch(0.72 0.16 28)`.
- **Identity:** W `#d8cdb0`, U `#3d6b85`, B `#7c5aa6`, R `#a8402c`, G `#4c7a43` (plus the hover variants in `_tokens.scss`).
- **Type:** Grenze 700 (wordmark), Karla 400/700. Sizes 0.75 / 0.875 / 1 / 1.25rem. Tracking micro .05em, eyebrow .14em.
- **Spacing:** space-1…6 = 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2rem. Touch target 44px.
- **Radii:** 4px (controls, nav items), 8px (containers).
- **Motion:** ease `cubic-bezier(0.4, 0, 0.2, 1)`, fast .18s, base .24s. The drawer uses **0.36s** (new: `--duration-drawer`).

### New tokens to add to `_tokens.scss`
```
--nav-rail-width: 24px;   --nav-panel-width: 232px;   --drawer-width: min(288px, 85%);
--thread-x: 11px;         --bead: 7px;                --status-mark: 8px;
--delay-nav-leave: 120ms; --duration-drawer: 0.36s;
--z-nav: 2; --z-drawer: 10; --z-modal: 20;
--band / --band-v / --band-lit / --glow-overlay (recipes above)
```

### New copy (`entry-copy.ts`)
```ts
export const SHELL = {
  menu: 'Menu', close: ACTION.close, navLabel: 'Navegação principal', collection: 'Coleção',
  pin: 'Fixar menu', unpin: 'Recolher menu', home: 'Grimorio — Início',
  signIn: ACTION.in, noProfile: 'Nenhum perfil ativo',
  profileHint: 'Trocar de perfil ou sair', profileBusy: 'Aguarde a sincronização terminar',
  notice: 'Aviso legal',
} as const;
export const SYNC_AREA = {
  syncing: 'Sincronizando…', synced: 'Sincronizado', last: (rel: string) => `Sincronizado ${rel}`,
  never: 'Nunca sincronizado', local: 'Sem conta na nuvem', offline: 'Sem conexão',
  expired: 'Sessão expirada', error: 'Falha ao sincronizar',
  actSync: 'Sincronizar agora', actRetry: 'Tentar de novo', actReauth: 'Entrar de novo',
  actLink: 'Vincular conta na nuvem',
} as const;
```
- Remove `TOP_BAR.*`.
- Profile name rule becomes **3 a 16**: `HELPER.name` "3 a 16 caracteres: letras, números, _ . ou -", `MSG.userLen` "Use de 3 a 16 caracteres."
- `SUBTITLE.up` still promises automatic sync. Reword it.

## DESIGN.md changes required (FR-032)
1. **Additions:** the new light recipes (band, band-lit, flowing line, thread, wash), gradient text for the wordmark and the current nav label, and continuous band animation that stops under reduced motion. These are exceptions to "every border is 1px solid" and "titles never change color".
2. **Update:** the App top bar entry (no longer "identical at every width"), plus new entries for the side nav, drawer, sync area/indicator and notice.
3. **Status colors:** healthy statuses are neutral (text/muted); danger is used only for failures. Success/warning stay undefined.
4. **Mobile identity:** it shows as dots + name only, and the tribe is in the accessible name. This relaxes "identity is always named twice" on mobile. Decide and record it.

## Spec deviations to resolve
The mobile direction was chosen deliberately in design review:
- **FR-018 / FR-019:** the mobile bar order is wordmark · sync indicator · Menu, and the drawer opens from the **right**.
- **FR-018a:** mobile sync is mark only in the bar, with the full text in the drawer.
- **FR-008 on mobile:** the bar indicator is not interactive; syncing happens from the drawer action.
- **FR-003 / SC-001 on mobile:** the profile is reached through the drawer, in 2 taps instead of 1.

## Assets
None. No icons, images or fonts beyond Grenze and Karla from Google Fonts. The only glyph is ✕.

## Files
- `AppShell.dc.html`: the shell component, with all behavior and states (props: w, h, profile, sync, outcome, page, pinned, navExpanded, drawer, modal, long, persist, fast).
- `Grimorio App Shell.dc.html`: the presentation board. Sections:
  1. interactive desktop + phone
  2. nav states
  3. mobile frames
  4. every sync state
  5. spec sheet (earlier notes; this README supersedes it where they differ)
- `AppShell v1.dc.html`: the earlier pre-"Fio de luz" version, for reference only.
- `support.js`, `_ds/`: the runtime and design-system bundle needed to open the HTML files locally.
