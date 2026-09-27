# Handoff: Planar card preview (spec 007)

Repo: `rofelixk/grimorio`, branch `feature/007-planar-card-preview`. Spec: `specs/007-planar-card-preview/spec.md`.

## Overview
This adds a card preview to "Baralho planar" (`src/app/views/planechase-deck/`). The preview shows the large card image, the English name, the type line, the static text and the ability plate. The text is in PT-BR when translated and in English otherwise, and the preview shows whether the card is on or off in the draft. There are three presentations. **The input decides which one opens, not the screen width:**

1. **Hover popover.** A pointer rests on a tile. The popover has no controls and never takes focus.
2. **Wide preview dialog.** Opened by right-click, the Menu key or Shift+F10, or by a long-press when the screen is wider than 640px. It is centered with the image beside the text.
3. **Narrow preview dialog.** Opened by the same triggers at 640px or narrower. It is full-screen with the image and text stacked.

## About the design files
The files in this bundle are **design references built in HTML**. They are prototypes that show the intended look and behavior, not production code. Rebuild them in the existing Angular app using its patterns: standalone OnPush components, signals, the `_controls.scss` classes and the `_tokens.scss` variables. Reuse the existing `PlanarImage`, the `PlanarCard` content logic (`lines()`, `lang`, `plateLabel`) and `PlanarTile`. Add every string to `src/app/core/utils/planechase-copy.ts`, in `DECK`.

**Constitution V / FR-015:** add the "Card preview" section below to `DESIGN.md` (under Gameplay: Planechase) before building.

## Fidelity
**High fidelity.** Every value below comes from `DESIGN.md` and `_tokens.scss`. Use the tokens, not the hex values.

---

## Screens / views

### 1. Deck settings, changed (desktop and phone)
Nothing changes on this screen except:
- **Hint copy (FR-008a).** Replace `DECK.hint` with a version that depends on the input. Pick it with `matchMedia('(hover: hover) and (pointer: fine)')`:
  - Pointer: `Clique numa carta para ativar ou desativar. Pare o ponteiro sobre ela para ler o texto, ou use o botão direito para abri-la. Nada muda até você salvar.`
  - Touch: `Toque numa carta para ativar ou desativar. Toque e segure para ler o texto. Nada muda até você salvar.`
  - On hybrid devices (touchscreen laptops), show the pointer copy.
- **Tile accessible description (FR-010).** `aria-description` (or `aria-describedby` pointing to a visually hidden span) set to `Menu ou Shift+F10 abre a carta.`
- **Tile while the popover is open.** The tile the popover belongs to keeps `--glow-plate-hover` (the same as its hover state) while the pointer is over the popover.
- **Tile during a long-press (new, needs your approval).** From `pointerdown` until the hold completes or is cancelled, the tile gets `box-shadow: 0 0 0 1px var(--role-primary), 0 0 28px -2px rgb(from var(--role-primary) r g b / 70%)` and `opacity: 1`, with a transition of `box-shadow var(--duration-slow) var(--ease-standard)`. This confirms that the hold is building. Under reduced motion there is no transition.
- The tile adds `-webkit-touch-callout: none; user-select: none; touch-action: pan-y` to the button, and `draggable="false"` plus `pointer-events: none` to the `<img>` (FR-008: no image menu, selection or drag).

### 2. Hover popover (component `PlanarPreview`, variant `popover`)
- **Container.** `role="tooltip"` (the tile gets `aria-describedby` pointing to it while it's open). `position: absolute`, anchored to the tile grid's positioned wrapper. `z-index` sits above the tiles and below the sticky deck footer's stacking context. Use a CDK-free overlay in the view if that's simpler.
- **Size.** Width `380px`. Padding `var(--space-3)`. Flex column, gap `var(--space-3)`.
- **Face.** Background `var(--color-bg)`, border `1px solid var(--color-border)`, radius `var(--radius-md)` (8px), shadow `var(--glow-overlay)`, which is `--shadow-rest` plus `0 0 24px -6px` of primary at 45%. This is the same recipe as the hover-expanded side nav.
- **Image frame.** Reuse `app-planar-image` with its default `--planar-border` (`--color-border`, not tinted). Aspect ratio 1.4, `--planechase-radius` (1.25rem). The placeholder name uses `--font-size-lg`.
- **Text column.** Flex column, gap `var(--space-2)`:
  1. **Status row.** Flex, gap `var(--space-2)`, align center. A 7px bead (see "Status bead"), then `.micro-label` with `Ativada no baralho` or `Desativada no baralho`.
  2. **Name.** `h2 lang="en"`, Grenze 600, `--font-size-xl` (1.5rem), line-height `--line-height-tight`.
  3. **Type line.** `--font-size-sm`, `--color-text-muted`, `[attr.lang]`.
  4. **Static text.** One `<p>` per line. `--font-size-sm`, line-height 1.5, `text-wrap: pretty`. Omitted for phenomena.
  5. **Ability plate.** `.plate` with gap `var(--space-1)`, an `.eyebrow` label (`Caos` or `Ao encontrar`), and the lines at `--font-size-sm`. It is **never lit** in the preview. A plane with no chaos ability has no plate.
- **Placement (FR-006).**
  - Horizontal: tiles in columns 1–2 put the popover at `tile.offsetLeft + tile.offsetWidth + 12px` (to the right). Tiles in columns 3–4 put it at `tile.offsetLeft − 380 − 12px` (to the left). It never covers its tile.
  - Vertical: `top = tile.offsetTop`, clamped between `scrollTop + 12px` and `scrollTop + clientHeight − footerHeight − 12px − popoverHeight`. Values are relative to the view-area scroll container (`main.view-area`).
  - Re-clamp on scroll, resize and image load, or when the popover's height changes (ResizeObserver).
  - If neither side fits the window (for example a narrow window with a mouse), center the popover horizontally in the view area and put it above or below the tile, whichever has more room.
- **Mouse behavior.** The popover keeps `pointer-events: auto` so the pointer can rest on it (FR-006). It holds no focusable elements.

### 3. Wide preview dialog (variant `wide`, above 640px)
- **Host.** A native `<dialog>` opened with `showModal()`. The backdrop is `var(--overlay-backdrop)`, black at 75%. The page padding around the dialog is `2rem`.
- **Ring.** Width `880px` (`--modal-width`), `max-width: 100%`, `max-height: 100%`. Padding `2px`, radius `var(--radius-ring)` (10px), background `var(--ring-gradient)` with the `spin-angle` animation over 28s, as in the themed modal. **No halo and no sparks**, because this is a reading surface. The prototype shows the ring frozen; the app should rotate it, and it stops under reduced motion.
- **Face.** `var(--color-bg)`, radius `var(--radius-md)`, `var(--shadow-rest)`, `overflow: hidden`. A flex column with three parts:
  1. **Header.** Min-height 44px, `padding-left: var(--space-5)`, space-between. On the left, `.eyebrow`: `<span lang="en">{set name}</span> · {i} de {n}`, where i/n count across all visible tiles. On the right, a 44×44 `✕` button: transparent, `--color-text-muted`, hover `--color-text`, `aria-label="Fechar"`.
  2. **Body.** Grid `minmax(0,1.15fr) minmax(0,1fr)`, gap `var(--space-5)`, `align-items: start`, padding `0 var(--space-5) var(--space-5)`.
     - Left: `app-planar-image` (aspect 1.4).
     - Right: the text column, gap `var(--space-3)`, with `overflow-y: auto` and a max-height that fits (the prototype uses 440px; in the app use the dialog's available height). The status row is the same as the popover's. Name: Grenze 600 `--font-size-2xl` (2rem). Type line: `--font-size-md`, muted. Text and plate lines: `--font-size-md`, line-height 1.5. **Deviation:** the in-game card block uses `--font-size-lg` for its text; this dialog steps down one size so the full text fits beside the image.
  3. **Footer.** `border-top: 1px solid var(--color-border)`, padding `var(--space-3) var(--space-5)`, space-between.
     - Left group, gap `var(--space-2)`: `.btn.btn--secondary` **Anterior** (`aria-label="Carta anterior"`) and **Próxima** (`aria-label="Próxima carta"`). Each is disabled at its end of the list.
     - Right: the toggle, `aria-pressed` set to the card's state. On: `.btn.btn--secondary` **Desativar carta**. Off: `.btn.btn--primary` **Ativar carta** (glow).
- **Label.** `aria-labelledby` points to the h2 (the card name).

### 4. Narrow preview dialog (variant `narrow`, 640px or narrower)
- **Host.** A native `<dialog>`, full-bleed: `margin: 0; width: 100vw; height: 100dvh; max-width: none; max-height: none; padding: 0`. Background `var(--color-bg)`. No ring. Flex column.
- **Header.** Min-height 44px, padding `4px 4px 4px var(--space-4)`, `border-bottom: 1px solid var(--color-border)`, background `var(--wash-header)`. On the left, the same eyebrow as the wide header. On the right, `✕` 44×44 (`aria-label="Fechar"`).
- **Body.** `flex: 1; min-height: 0; overflow-y: auto`. Padding `var(--space-4)`, flex column, gap `var(--space-3)`. Full-width image frame (`flex: none`), then the text column with gap `var(--space-2)`. Name `--font-size-xl`. Type, text and plate at `--font-size-sm` (the card block's mobile sizes). Themed thin scrollbar.
- **Footer.** Pinned. `border-top` hairline, padding `var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom))`, flex column, gap `var(--space-2)`:
  1. The toggle at full width (the same classes and labels as the wide dialog).
  2. A row, gap `var(--space-2)`: Anterior and Próxima, each `flex: 1`.

### Status bead (shared)
A 7px circle (`--bead`), 1px border, `border-radius: 50%`.
- **On:** border and fill `var(--role-primary)`, `box-shadow: 0 0 0 3px var(--color-bg), 0 0 10px 1px var(--role-primary)`.
- **Off:** border `var(--color-border)`, fill `var(--color-bg)`, no shadow.

The image stays at **full strength** when the card is off.

### Image missing (edge case)
The preview never shows a blank frame, and the text shows at once.
- **While loading:** the frame keeps its 1.4 ratio and shows the card name (Grenze 600 1.25rem).
- **Load failed or offline without a cached copy:** the name plus the `.eyebrow` `Imagem indisponível sem conexão`. This is the existing `PlanarImage` behavior.

---

## Interactions and behavior

**Pointer (desktop): FR-005 to FR-007**
- **Opening.** `mouseenter` on a tile starts a 300ms timer. If a preview is already open, it switches to the new card immediately with no timer and no close/reopen animation. A pass across a tile shorter than 300ms opens nothing.
- **Closing.** `mouseleave` from the tile or the popover starts a 150ms close timer. Entering the tile or the popover cancels it. `Esc` closes.
- **Clicking.** A click toggles the tile exactly as today, and the popover stays open and updates its status row.
- **Right-click.** `contextmenu` on a tile calls `preventDefault()` and opens the dialog. The popover closes first.
- **Scope.** Only respond to `pointerType === 'mouse'` or `'pen'` for hover. Touch never opens the popover.

**Touch: FR-008**
- `pointerdown` (touch) starts a 500ms timer and records x/y.
- `pointermove` farther than 8px, `pointercancel` (scroll) or `pointerup` before 500ms cancels the hold.
- When the hold completes, open the dialog and set a `longPressFired` flag. The next `click` on that tile is swallowed and the flag resets, so the tile doesn't toggle.
- `contextmenu` on touch calls `preventDefault()` and nothing else.
- A plain tap toggles as today.

**Keyboard: FR-010 and FR-011**
- On a focused tile, `ContextMenu`, or `Shift+F10`, calls `preventDefault()` and opens the dialog. Enter and Space still toggle. Focus alone opens nothing.
- **Dialog focus.** Focus moves into the dialog (to ✕, or to the dialog with `tabindex="-1"`) and is trapped by the native `showModal()`. `Esc` closes.
- **Closing (✕, Esc, backdrop click, system back):** focus returns to the tile of the card **currently shown**, scrolled into view if needed: set `scrollTop` on `main.view-area`, never `scrollIntoView`.

**Dialog navigation: FR-009a**
- Anterior and Próxima move through the **visible tile order**: sets in catalog order, cards in set order, skipping collapsed sets.
- Anterior is disabled on the first visible card and Próxima on the last. The position text updates.
- There is no swipe gesture.

**Closing and back: FR-009 and SC-005**
- The wide dialog closes on a backdrop click (target === dialog).
- On mobile, `history.pushState({ planarPreview: true })` runs on open, and `popstate` closes the dialog. Closing through ✕ or Esc calls `history.back()` if the state was pushed. This way the system back button **never leaves the deck settings**, which would silently discard the draft (006 FR-017).

**Guards: FR-012 and FR-013**
- At most one preview is open. Opening the dialog closes the popover.
- Nothing opens while `confirming()` is true (the restart footer).
- Collapsing the set that contains the open card closes the preview.
- Leaving the route closes it.

**Motion**
- The popover appears and disappears instantly (or with a 0.18s opacity fade).
- The dialog uses no entrance animation beyond the ring's rotation.
- Under `prefers-reduced-motion`, everything is instant and the ring is frozen.
- There are no flairs in the preview.

**Images: FR-004 and SC-006**
- The preview uses `card.images.large` through the existing `PlanarImageService` cache.
- The image loads only when that card's preview opens. Don't prefetch neighboring cards, including in the dialog's Anterior/Próxima.

## State (in `PlanechaseDeck` or a small `PlanarPreviewController`)
- `preview = signal<{ id: string; mode: 'popover' | 'dialog' } | null>(null)`
- `popoverAnchor: HTMLElement | null`, plus the open and close timers
- `longPress: { id; x; y; fired } | null`, plus its timer
- `visibleOrder = computed(() => sets().filter(s => !collapsed().has(s.code)).flatMap(s => s.cards))`
- The on/off state is read from and written to the existing `draft` through `toggle(card)`. Nothing new is saved.
- An effect closes the preview when `confirming()` turns true or the card's set collapses.

## New copy (add to `DECK` in `planechase-copy.ts`)
```ts
hintPointer: 'Clique numa carta para ativar ou desativar. Pare o ponteiro sobre ela para ler o texto, ou use o botão direito para abri-la. Nada muda até você salvar.',
hintTouch: 'Toque numa carta para ativar ou desativar. Toque e segure para ler o texto. Nada muda até você salvar.',
tileKeys: 'Menu ou Shift+F10 abre a carta.',
previewOn: 'Ativada no baralho',
previewOff: 'Desativada no baralho',
previewPosition: (i: number, n: number) => `${i} de ${n}`,
previous: 'Anterior', previousLabel: 'Carta anterior',
next: 'Próxima', nextLabel: 'Próxima carta',
disable: 'Desativar carta', enable: 'Ativar carta',
close: 'Fechar',
```
The card name, set name and English fallback text come from the card data (`lang="en"`). `Caos`, `Ao encontrar` and `Imagem indisponível sem conexão` already exist in `PLANAR_CARD`.

## Design tokens used (all existing)
- **Colors:** `--color-bg` #14110f · `--color-surface` #1e1a17 · `--color-surface-raised` #292320 · `--color-border` #3a332e · `--color-text` #f2ede8 · `--color-text-muted` #a89e96 · `--overlay-backdrop` rgba(0,0,0,.75) · `--role-primary / -accent / -tertiary` from the profile. The prototype's default is Vermelho #a8402c → Azul #3d6b85.
- **Spacing:** `--space-1` 0.25rem · `-2` 0.5rem · `-3` 0.75rem · `-4` 1rem · `-5` 1.5rem
- **Type:**
  - Grenze 600 for the name: 2rem wide, 1.5rem narrow and in the popover.
  - Karla for everything else: 1rem wide text; 0.875rem narrow and popover text; 0.75rem for eyebrows and micro labels. Tracking is 0.14em for eyebrows and 0.05em for micro labels.
- **Radius:** `--radius-sm` 4px (buttons, plate) · `--radius-md` 8px (popover and dialog face) · `--radius-ring` 10px · `--planechase-radius` 1.25rem (image frame)
- **Shadows and light:** `--shadow-rest` · `--glow-overlay` (popover) · `--ring-gradient` (dialog) · `--glow-plate-hover` (tile hover) · `--wash-header` (narrow header) · `--glow-button` (primary toggle)
- **Sizes:** `--touch-target` 44px · `--bead` 7px · `--modal-width` 880px
- **Motion:** `--ease-standard` · `--duration-fast` 0.18s · `--duration-slow` 0.5s (hold glow) · hover delay 300ms · close delay 150ms · long-press 500ms · move tolerance 8px
- **Breakpoint:** `bp.mobile` (640px or narrower) picks the narrow or wide dialog **only when the dialog opens**. It never switches the popover to the dialog.

## Proposed DESIGN.md section (paste under "Gameplay: Planechase")
> **Card preview** (deck settings). The input picks the surface: a resting pointer gives the **popover**; right-click, Menu / Shift+F10 or a long-press give the **preview dialog**. Content mirrors the card block (image frame, name, type line, text, unlit ability plate), plus a status row: the tile's bead and a micro label "Ativada no baralho" / "Desativada no baralho"; the image is never dimmed.
> - **Popover:** 380px, page face, hairline, 8px, `--glow-overlay`, padding and gap `space-3`; compact type (name 1.5rem, text 0.875rem). Beside its tile (right for columns 1–2, left for 3–4), clamped between the top bar and the deck footer; 300ms open delay, instant switch, 150ms close; no controls, never focused.
> - **Dialog, wide (> 640px):** 880px, the themed modal's ring and face (no halo, no sparks). Header 44px: eyebrow "{Set} · {i} de {n}" + ✕. Body grid 1.15fr | 1fr, gap `space-5`; the text scrolls; name 2rem, text 1rem. Footer hairline: secondary Anterior · Próxima left; toggle right (secondary "Desativar carta" / primary "Ativar carta").
> - **Dialog, narrow:** full-bleed; header with wash + hairline; scrolling stacked body (mobile card block sizes); pinned footer: full-width toggle over Anterior | Próxima.
> - **Long-press feedback:** the tile's glow grows over `slow` while the 500ms hold builds.

## Assets
There are no new assets. Card images are the existing Scryfall `images.large` URLs from `cards.json`, shown through `PlanarImage` (which turns the portrait image back to landscape). There are no icons; `✕` is the only glyph.

## Files
- `Planar Card Preview.dc.html` is the canvas with every frame, all interactive:
  - 1a: desktop popover
  - 1b: wide dialog
  - 1c: phone deck settings with long-press
  - 1d–1f: narrow dialog states (on and translated · off with English fallback · phenomenon with the image missing)
- `PlanarPreview.dc.html` is the preview component with its three variants (`popover`, `wide`, `narrow`).
- The sample card data (9 Doctor Who cards) is at the top of the logic in `Planar Card Preview.dc.html`, taken from `cards.json` and `cards.pt-br.json`. Some cards are marked untranslated only to show the English fallback.
