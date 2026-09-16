# Handoff: Add-card card detail step (confirm dialog) — layout rework

## Overview

Reworks the **card detail step** of the add-card flow (`app-add-card-modal`'s confirm dialog + `app-card-add-detail-panel`). Today the panel is a centered single column: small art, a `flex-wrap` bag of form fields, and a lone `Adicionar` button — no hierarchy, and it wastes horizontal space on desktop. This handoff replaces that panel's layout with a **two-column desktop layout (option 2a)** and a **stacked mobile layout (option 2d)**, and creates explicit slots for two not-yet-built features: **print (impressão) selection** and a **double-faced card flip**.

Out of scope / explicitly unchanged: the search dialog, the rotating ring, the side glow, the sparks, the backdrop, the open/close transition. Keep `add-card-modal.scss` and `_motion.scss` as they are except for the one width change noted below.

## About the Design Files

`card-detail-2a-2d.html` in this folder is a **design reference created in HTML** — a static prototype of the intended look and behavior. It is not production code to copy. Recreate it inside the existing codebase (Angular 22, standalone components, SCSS, no UI framework) using that project's established patterns: SCSS partials under `src/styles/`, CSS custom-property tokens, signal `input()`/`output()` component APIs, `ChangeDetectionStrategy.OnPush`.

Notes for reading the reference file:
- It contains exactly the two approved options, side by side: **2a** (desktop) then **2d** (mobile).
- The dark rounded frame around each option is a simulated backdrop/page, **not part of the design**. The design starts at the element with the conic-gradient ring (2a) / the 390px surface (2d).
- Values are hardcoded hex/rem literals so they are unambiguous. In the real implementation they must map back to the existing tokens — see **Design Tokens** below for the literal → token table.
- Diagonal striped boxes labelled `card image 340px` etc. are placeholders for the real `<img [src]="candidate().imageUrl">`.
- The small vanilla JS at the bottom only makes the stepper and checkbox demo-interactive.

## Fidelity

**High fidelity.** Colors, spacing, type sizes and structure are final and taken from the repo's own tokens. Recreate pixel-accurately, but always through the existing token variables rather than the literal hex values.

---

## Screens / Views

### 2a — Desktop: confirm dialog, two columns

**Purpose:** confirm which printing of a card the user found and record its physical details before adding it to a collection.

**Container change (the only edit outside the panel):** the confirm dialog is widened.
`add-card-modal.scss` — `.add-card-modal` keeps `width: min(800px, 92vw)` as the base; add a `.confirm-dialog { width: min(980px, 92vw); }` rule next to the existing `.search-dialog` rule (which stays `min(1500px, 94vw)` / `height: 90vh`). Do **not** pin a height on the confirm dialog — it should hug its content up to `max-height: 90vh`.

**Modal surface (unchanged mixin):** `@include m.modal-surface` — `border-radius: var(--radius-md)`, `background: var(--color-bg)`, `box-shadow: var(--shadow-sm)`, `overflow: hidden`, flex column.

**Structure inside `.modal-surface`** — three rows: header (fixed), scroll body (flex: 1), action bar (fixed).

1. **Header** — `flex: 0 0 auto; display:flex; align-items:flex-start; justify-content:space-between; gap:var(--space-3); padding: var(--space-5) var(--space-5) var(--space-4)`.
   - Left, a two-line title block (`display:flex; flex-direction:column; gap:var(--space-1); min-width:0`):
     - `<h2>` card name — `font-size: var(--font-size-lg)` (1.25rem), `line-height: var(--line-height-tight)`, `margin:0`, `overflow-wrap:anywhere`. Keeps `id="confirm-dialog-title"`.
     - subline — `font-size: var(--font-size-sm)`, `color: var(--color-text-muted)`. Content: `typeLine · setName · #collectorNumber` (reference copy: `Instant · Modern Horizons 2 · #401`).
   - Right, the existing `Voltar` button (`.back-button`: transparent background, `1px solid var(--color-border)`, `border-radius: var(--radius-sm)`, `min-height:44px`, padding `var(--space-2) var(--space-3)`). Unchanged behavior: emits back to the search step.

2. **Scroll body** — `flex:1 1 auto; overflow-y:auto; padding: 0 var(--space-5) var(--space-5)` and the shared `@include m.modal-scroll-body` scrollbar treatment (10px, thumb `--color-surface-raised` with a 2px `--color-bg` inset border, `--color-border` on hover). Inside it, one grid:

   `display:grid; grid-template-columns: 340px minmax(0,1fr); gap: var(--space-6) (2rem); align-items:start`

   **Left column** (`display:flex; flex-direction:column; gap: var(--space-3)`):
   - **Card art** — `width:100%`, `aspect-ratio: 488/680`, `border-radius: var(--radius-md)`. Use the real image; keep `display:block`.
   - **Flip button** — absolutely positioned inside the art's relative wrapper, `bottom: var(--space-2); right: var(--space-2)`. Label `Virar carta`. Styling: `background: rgba(20,17,15,.85)` (i.e. `--color-bg` at 85%), `1px solid var(--color-border)`, `border-radius: var(--radius-sm)`, `font-size: var(--font-size-sm)`, `min-height:44px`, padding `var(--space-2) .625rem`. **Render only when the card has a back face** (`candidate().faces?.length > 1`). Clicking swaps the displayed face; no other state changes.
   - **Impressão field** — a standard `<label>` (column, `gap: var(--space-1)`, `font-size: var(--font-size-sm)`) with a `<select>` styled like the panel's other controls: `padding: var(--space-2)`, `border-radius: var(--radius-sm)`, `1px solid var(--color-border)`, `background: var(--color-surface)`, `color: var(--color-text)`. Option label format: `SET · collectorNumber · Set name` (e.g. `MH2 · 401 · Modern Horizons 2`). This is the **print-selection slot** — a `<select>` is the minimum; if the feature later needs art thumbnails, it can grow in place in this column without touching the right column.

   **Right column** — `display:grid; grid-template-columns:1fr 1fr; gap: var(--space-3) var(--space-4)`. Field order and spans:
   | Field | Control | Span |
   |---|---|---|
   | Acabamento | `<select>`: `nonfoil (padrão)` / `foil` / `etched` | 1 |
   | Condição | `<select>`: `NM (padrão)` / `LP` / `MP` / `HP` / `DMG` | 1 |
   | Idioma | `<input type="text">`, placeholder `en (padrão)` | 1 |
   | Quantidade | stepper (below) | 1 |
   | À venda | checkbox row (below) | `1 / -1` |
   | Notas | `<textarea rows="3">`, `resize: vertical` | `1 / -1` |

   - **Quantidade stepper** — `display:flex; align-items:stretch; gap:.375rem` inside the label:
     - `−` button: `width:44px`, `background: var(--color-surface-raised)`, `1px solid var(--color-border)`, `border-radius: var(--radius-sm)`, `font-size:1.125rem`, `aria-label="Diminuir"`. Hover: `border-color` → the card glow color (`var(--cmp)`).
     - `<input type="number" min="1">`: `flex:1 1 auto; min-width:0; text-align:center; color-scheme: dark`, otherwise the standard field styling.
     - `+` button: mirror of `−`, `aria-label="Aumentar"`.
     - Behavior: `−` clamps at 1; typed values clamp to `max(1, Number(value) || 1)`; empty input resolves to 1 on add (matches today's `Number(this.quantity()) || 1`).
   - **À venda row** — the whole label is a tappable surface: `padding: .625rem var(--space-3)`, `background: var(--color-surface)`, `1px solid var(--color-border)`, `border-radius: var(--radius-sm)`, `min-height:44px`, `cursor:pointer`, hover `border-color: var(--cmp)`. Inside it a custom checkbox: an 18×18 box (`border-radius: var(--radius-sm)`, `1px solid var(--color-border)`, `background: var(--color-bg)`) with a visually-hidden real `<input type="checkbox">` covering it (`opacity:0`, full size — keeps keyboard/AT behavior) and a `✓` glyph (`font: 700 11px system-ui`, `color: var(--cmp)`). **Checked:** box `background: var(--color-surface-raised)`, `border-color: var(--cmp)`, glyph `opacity: 1`. Unchecked: glyph `opacity: 0`. Use `:has(:checked)` or a signal-bound class — no `appearance:none` hacks needed beyond this.

3. **Action bar** — `flex:0 0 auto; display:flex; align-items:center; justify-content:flex-end; gap: var(--space-3); padding: var(--space-4) var(--space-5); border-top: 1px solid var(--color-border); background: var(--color-bg)`. It is pinned because the surface is a flex column and the body scrolls — no `position:sticky` needed.
   - Secondary: `Adicionar e buscar outra` — `background: var(--color-surface-raised)`, `1px solid var(--color-border)`, `min-height:44px`. **New behavior:** submit the entry, then return to the search step with the query intact instead of closing the modal (see State Management).
   - Primary: `Adicionar` — the existing glow button, `@include m.glow-button(var(--cmp))`: `background: var(--color-surface-raised)`, `color`/`border-color` = `var(--cmp)`, `font-weight: bold`, hover `filter: brightness(1.15)`. Padding `var(--space-2) var(--space-5)`, `min-height:44px`.
   - Only one primary CTA — keep the One Flame rule.

### 2d — Mobile: same step, full-bleed

**Purpose:** identical task at `max-width: 640px` (`bp.mobile`), where the dialog is already full-bleed (`@include m.dialog-mobile-fullbleed`) and the side glow/sparks are already `display:none`. Reference frame: 390 × 780.

- Surface fills the viewport; `border-radius: 0`; no ring gap.
- **Header** — same two-line title block + `Voltar`, padding `var(--space-3) var(--space-3) var(--space-2)`.
- **Scroll body** — `padding: 0 var(--space-3) var(--space-3)`, `display:flex; flex-direction:column; gap: var(--space-3)`, same themed scrollbar.
  1. Card art centered, `width: 210px`, `aspect-ratio: 488/680`, with the `Virar carta` button centered at `bottom: var(--space-2)` (`left:50%; transform:translateX(-50%)`).
  2. `Impressão` select, full width, `min-height:44px`.
  3. Paired fields grid: `grid-template-columns:1fr 1fr; gap: var(--space-3) .625rem` — Acabamento, Condição, Idioma, Quantidade (stepper with `gap:.25rem`, 44px buttons). Mobile selects/inputs: `width:100%`, `min-height:44px`, `box-sizing:border-box` (already in the source's mobile block — keep it).
  4. `À venda` row — identical to 2a.
  5. `Notas` textarea, full width, `rows="3"`.
- **Footer** — `flex-direction: column; gap: var(--space-2); padding: var(--space-3); border-top:1px solid var(--color-border)`. Primary `Adicionar` full width `min-height:48px`; below it `Adicionar e buscar outra`, full width, ghost style, `min-height:44px`.
- Every interactive target ≥44px.

---

## Interactions & Behavior

- **Voltar** — unchanged: `back()` → `selected.set(null)`, which closes the confirm dialog and reopens the search dialog through the existing `effect()`.
- **Adicionar** — unchanged `submit()`: builds the entry, `reset()`, `closeAll()`, `closed.emit()`.
- **Adicionar e buscar outra** (new) — submit the same payload, then reset only the physical fields and `selected`, keeping `results`, `nameQuery`/`setCodeInput`/`collectorNumberInput`, `searchMode` and `hasSearched` so the user lands back on their result list. Do **not** emit `closed`. Concretely: extract the payload/insert half of `submit()` into a private method, then `submit()` = insert + `reset()` + `closeAll()` + `closed.emit()`, and `submitAndContinue()` = insert + `resetPhysicalFields()` + `selected.set(null)`. Guard `lastSearchKey` — leave it untouched so an unchanged repeat search still dedupes.
- **Virar carta** — local UI state in the detail panel (`faceIndex` signal, default 0), toggles which of `candidate().faces` is shown. Resets to 0 whenever `candidate()` changes. Rendered only for multi-face cards.
- **Impressão change** — selecting another printing replaces the candidate (new `scryfallId`, `setCode`, `collectorNumber`, `imageUrl`, and therefore possibly a new glow color via `getCardGlowColors`). Emit it upward as a new `CardLookupResult` rather than mutating the panel's input; the existing card-glow computed then re-tints the ring, glow, sparks and primary button automatically. Physical fields keep their current values across a print change (the user already chose finish/condition for the physical card in hand). If the print-selection feature is not yet implemented, ship the select disabled with only the current printing listed, or keep it hidden behind a feature flag — the layout slot is what matters.
- **Stepper** — as specified above; hold-to-repeat is not required.
- **Hover states** — stepper buttons and the À venda row take `border-color: var(--cmp)`; the global `button:hover` rule already does `border-color: var(--color-primary)`, so scope the `--cmp` versions to this panel so the card's own color wins inside the confirm dialog.
- **Focus** — keep the existing `--ring-accent` / `outline: 2px solid var(--cma)` conventions; nothing here overrides focus styling.
- **Animation** — no changes. Open still uses the existing `@starting-style` fade (`opacity 0→1`, `scale .92→1`, `blur 6px→0`, `var(--duration-slow) var(--ease-standard)`), close is still instant for the two-dialog/two-backdrop reason documented in `add-card-modal.scss`. `prefers-reduced-motion` handling stays via `m.dialog-reduced-motion`.
- **Responsive** — single breakpoint switch at `bp.mobile` (640px): the 2a grid (`340px minmax(0,1fr)`) collapses to the 2d stacked layout. Between 640px and ~900px the two-column grid still fits because the right column uses `minmax(0,1fr)`; verify no field overflows at 700px.
- **Loading/error** — unchanged; the confirm step has no async states of its own. If print selection triggers a lookup, reuse the existing `searching` spinner convention (`.spinner` in `_motion.scss`).

## State Management

In `AddCardModal` (unchanged signals): `selected`, `finish`, `language`, `condition`, `quantity`, `forSale`, `notes`, plus the search-side signals. New/changed:
- `selectedPrinting` — optional; if print selection lands, the picked `CardLookupResult` replaces `selected`.
- `submitAndContinue()` — new method described above.
- `CardAddDetailPanel` gains: `faceIndex` (local signal), `printings` input (`CardLookupResult[]`, may be empty), `printingChanged` output, `confirmAndContinue` output. Existing inputs/outputs keep their names and types.
- The card-glow bindings on the confirm dialog (`--card-modal-primary/-accent/-tertiary` from `cardGlow()`) stay exactly as they are.

## Design Tokens

Literal values in the reference file → the token to use in code (`src/styles/_tokens.scss`):

| Literal | Token |
|---|---|
| `#14110f` | `--color-bg` |
| `#1e1a17` | `--color-surface` |
| `#292320` | `--color-surface-raised` |
| `#3a332e` | `--color-border` |
| `#f2ede8` | `--color-text` |
| `#a89e96` | `--color-text-muted` |
| `#3fc4d1` | `--color-accent` |
| `#d3202a` | the picked card's glow color — `var(--cmp)`, from `getCardGlowColors()` (`MTG_PRINT_COLORS.R` in the reference; never hardcode) |
| `rgba(0,0,0,.75)` | `--overlay-backdrop` (backdrop only, already implemented) |
| `.25rem / .5rem / .75rem / 1rem / 1.5rem / 2rem` | `--space-1 … --space-6` |
| `4px / 8px` | `--radius-sm` / `--radius-md` |
| `.75rem / .875rem / 1rem / 1.25rem` | `--font-size-xs / -sm / -md / -lg` |
| `0 1px 3px rgba(0,0,0,.4)` | `--shadow-sm` |
| `1.2 / 1.5` | `--line-height-tight` / `--line-height-normal` |
| `.6875rem` uppercase label, `letter-spacing:.09em` | not in the design system; only used by options 2b/2c, **not needed for 2a/2d** |

Type family: inherited `system-ui, -apple-system, 'Segoe UI', sans-serif` from `styles.scss`. Motion: `--duration-fast/-base/-slow`, `--ease-standard`.

## Assets

None new. Card art comes from the existing Scryfall/Supabase `imageUrl` on `CardLookupResult`; the striped boxes in the reference are placeholders. No icon set is used — the flip control is the text label `Virar carta` (the round `↻` glyph appears only in the unapproved option 2c).

## Files

- `design_handoff_card_detail_step/card-detail-2a-2d.html` — the design reference (2a desktop + 2d mobile only).
- Source files to change in the app:
  - `src/app/shared/card-add-detail-panel/card-add-detail-panel.html` / `.scss` / `.ts` — the layout rework lives here.
  - `src/app/shared/add-card-modal/add-card-modal.scss` — add the `.confirm-dialog { width: min(980px, 92vw) }` rule.
  - `src/app/shared/add-card-modal/add-card-modal.html` / `.ts` — new panel inputs/outputs, `submitAndContinue()`, print-change wiring.
  - Unchanged but relevant: `src/styles/_modal.scss` (`modal-surface`, `modal-scroll-body`, `glow-button`), `src/styles/_tokens.scss`, `src/styles/_buttons.scss`, `src/styles/_forms.scss`, `src/styles/_breakpoints.scss`, `src/styles/_motion.scss`.
- Tests: `card-add-detail-panel` has no spec today; `add-card-modal.spec.ts` covers the flow — extend it for `submitAndContinue()` and keep the existing dialog show/close guards.
