---

description: "Task list for spec 007: Planar Card Preview in Deck Settings"
---

# Tasks: Planar Card Preview in Deck Settings

**Input**: Design documents from `/specs/007-planar-card-preview/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/components.md, ui.md, quickstart.md

**Tests**: Included, following the project convention (spec 006): each new or changed unit gets
a colocated `.spec.ts`. Specs use `@testing/planechase-fixtures`, never the real `cards.json`
(except T020's validity check). The visual and real-device checks are in quickstart.md.

**Organization**: Tasks are grouped by user story, so each story can be built and tested on its
own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1–US4)

## Path Conventions

This is a single Angular project. Paths are relative to the repo root; aliases are `@utils/*`,
`@services/*`, `@testing/*` and `@shared/*` (architecture.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The design system entry, the copy, and a style extraction that the later phases
build on.

- [ ] T001 Add a **Card preview** entry to `DESIGN.md` under "### Gameplay: Planechase", right after "**Card tile**" (Constitution V, FR-015). Take it from the "Proposed DESIGN.md section" in `design_handoff_planar_card_preview/README.md`: the popover (380px, page face, hairline, 8px, `--glow-overlay`, padding/gap `space-3`, name 1.5rem, text 0.875rem, 300ms open, instant switch, 150ms close, no controls, never focused), the wide dialog (> 640px: 880px, themed-modal ring and face with no halo or sparks, 44px header with the eyebrow "{Set} · {i} de {n}" and ✕, body grid 1.15fr | 1fr gap `space-5` with a scrolling text column, name 2rem, text 1rem (one step below the card block, noted as a deviation), hairline footer with secondary Anterior · Próxima on the left and the toggle on the right: secondary "Desativar carta" / primary "Ativar carta"), the narrow dialog (full-bleed, wash + hairline header, scrolling stacked body at the card block's mobile sizes, pinned footer: full-width toggle over Anterior | Próxima, safe-area inset), the status row (bead + micro label "Ativada/Desativada no baralho"; the image is never dimmed; the plate is never lit), and the long-press glow (`0 0 0 1px primary, 0 0 28px -2px primary 70%`, growing over `slow`, instant under reduced motion). Also extend the **Card tile** bullets: the tile keeps its hover glow while its popover is open
- [ ] T002 [P] In `src/app/core/utils/planechase-copy.ts` `DECK`, replace `hint` with `hintPointer: 'Clique numa carta para ativar ou desativar. Pare o ponteiro sobre ela para ler o texto, ou use o botão direito para abri-la. Nada muda até você salvar.'` and `hintTouch: 'Toque numa carta para ativar ou desativar. Toque e segure para ler o texto. Nada muda até você salvar.'`, and add `tileKeys: 'Menu ou Shift+F10 abre a carta.'`, `previewOn: 'Ativada no baralho'`, `previewOff: 'Desativada no baralho'`, `previewPosition: (i: number, n: number) => \`${i} de ${n}\``, `previous: 'Anterior'`, `previousLabel: 'Carta anterior'`, `next: 'Próxima'`, `nextLabel: 'Próxima carta'`, `disable: 'Desativar carta'`, `enable: 'Ativar carta'`, `close: 'Fechar'` (ui.md §7). Point `src/app/views/planechase-deck/planechase-deck.html` at `copy.hintPointer` for now (T018 makes it input-dependent), and update any spec asserting `DECK.hint`
- [ ] T003 [P] Move the `.ring` rules (the 2px conic `--ring-gradient` gap, `--radius-ring`, `spin-angle` over `--duration-spin`, the reduced-motion freeze, and the mobile full-bleed override) from `src/app/shared/ds/themed-modal/themed-modal.scss` into a new partial `src/app/shared/ds/themed-modal/_ring.scss`, following `_face.scss`'s header-comment style, and `@use` it from `themed-modal.scss` with no visual change (R5)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure logic, the shared reading surface and the controller core that US1–US3 all
use.

**⚠️ CRITICAL**: US1–US3 can't start until this phase is done. US4 doesn't depend on it.

- [ ] T004 [P] Create `src/app/core/utils/planar-card-text.util.ts` with `interface PlanarCardText { lang: 'en' | null; text: string[]; ability: string[] | null; plateLabel: string }` and `planarCardText(card: PlanarCard): PlanarCardText`. Move the logic from `src/app/shared/gameplay/planar-card/planar-card.ts`: `lines()` splits on `\n` and drops blank lines, `lang = card.translated ? null : 'en'`, `ability = null` when `card.ability === null`, `plateLabel = PLANAR_CARD.encounter` for phenomena and `PLANAR_CARD.chaos` otherwise. Add `planar-card-text.util.spec.ts` covering a translated plane, an untranslated card (`lang: 'en'`), a phenomenon (`text: []`, encounter label) and a plane with no chaos (`ability: null`)
- [ ] T005 Refactor `src/app/shared/gameplay/planar-card/planar-card.ts` to derive `lang`/`text`/`ability`/`plateLabel` from a single `computed(() => planarCardText(this.card()))`, leaving the template output unchanged (SC-003). Its existing `planar-card.spec.ts` must pass untouched (depends on T004)
- [ ] T006 [P] Create `src/app/core/utils/planar-preview.util.ts` per contracts/components.md: `Rect`, `PopoverBounds { viewportWidth; top; bottom; grid: Rect }`, `POPOVER_GAP = 12`, `visibleOrder(sets, collapsed)` (the cards of the non-collapsed sets in set order, flattened) and `placePopover(tile, popover, bounds)`. Placement: if the tile's center x is in the grid's left half, try `left = tile.left + tile.width + 12`, otherwise `left = tile.left − popover.width − 12`. If the preferred side overflows `[0, viewportWidth]`, try the other side. The vertical position is `top = tile.top`, clamped to `[bounds.top + 12, bounds.bottom − 12 − popover.height]`. If neither side fits, center horizontally (`(viewportWidth − width) / 2`, clamped at 0), place it above (`tile.top − 12 − height`) or below (`tile.top + tile.height + 12`), whichever has more room between the bounds, and clamp. Add `planar-preview.util.spec.ts`: left-half → right, right-half → left, a preferred side overflowing → the other side, the top clamp at both bounds, the narrow fallback (above vs. below), the result never intersecting the tile in any case, and `visibleOrder` skipping collapsed sets and keeping order across sets
- [ ] T007 [P] Create `PlanarPreviewContent` in `src/app/shared/gameplay/planar-preview/` (`planar-preview.ts/.html/.scss/.spec.ts`, OnPush, selector `app-planar-preview`). Inputs: `card: PlanarCard` (required), `on: boolean` (required), `size: 'compact' | 'wide' = 'compact'`, `headingId: string | null = null`. Render from `planarCardText()` (T004): the status row (a 7px bead, on = role-primary fill with `0 0 0 3px bg, 0 0 10px 1px primary`, off = `border` ring on `bg`; plus `.micro-label` `DECK.previewOn`/`previewOff`), then `app-planar-image` with `[address]="card().images.large"`, not lazy, never dimmed. Then `h2 lang="en" [id]="headingId()"` with the name, the type line `[attr.lang]`, one `<p>` per static-text line, and a `.plate` with an `.eyebrow` label and ability lines that is never lit and absent when `ability` is `null`. Sizes follow the handoff: compact name `--font-size-xl` and text `--font-size-sm`; wide name `--font-size-2xl` and text `--font-size-md` at line-height 1.5. No focusable elements. The spec covers on/off labels, the English fallback `lang`, a phenomenon (no static text, "Ao encontrar"), no plate for `ability: null`, and the image not dimmed when off (depends on T002)
- [ ] T008 Create `PlanarPreviewController` in `src/app/views/planechase-deck/planar-preview.controller.ts` (`@Injectable()`, not `providedIn`), with the core that all stories share. `connect({ sets, collapsed, confirming, tileFor })`; the signals `preview: { id; mode: 'popover' | 'dialog' } | null`, `current` (the card from `sets` by `preview.id`, else `null`), `visibleCards = computed(() => visibleOrder(sets(), collapsed()))`, `position` (1-based `{ index, total }` of `current` in `visibleCards`, `null` if absent), `hasPrevious`, `hasNext`; a private `canOpen()` returning `!confirming()`; and `close()` (for now: set `preview` to `null` and clear the timers). Add an `effect` that calls `close()` when `confirming()` becomes true, or when `current`'s set code is in `collapsed()` (FR-013). Use `DestroyRef` to close and clear the timers. Provide it in `PlanechaseDeck`'s `providers` and call `connect(...)` from its constructor (`tileFor` returns the tile's focusable button, `[data-card-id="{id}"] button`, within the view host). Add `planar-preview.controller.spec.ts` (via TestBed with a host providing it and fixture sets): `position`/`hasPrevious`/`hasNext` across a set boundary with a collapsed set in between, and the effect closing on `confirming` and on collapse (depends on T006)

**Checkpoint**: The shared pieces are in place and the app still behaves as in 006.

---

## Phase 3: User Story 1 - Read a card while choosing the deck, with a mouse (Priority: P1) 🎯 MVP

**Goal**: A resting mouse or pen opens a control-free popover beside the tile, showing the card's
large image and its PT-BR (or English) text. Clicking still toggles.

**Independent Test**: On a pointer device, rest on several tiles. Each shows its popover beside
it, inside the window. A quick sweep opens nothing, a click toggles and updates the popover's
status, and leaving or Esc closes it (quickstart "desktop" steps 3–6).

- [ ] T009 [P] [US1] Extend `PlanarTile` (`src/app/shared/gameplay/planar-tile/planar-tile.ts/.html/.scss`). Add the host attribute `[attr.data-card-id]="card().id"` and the inputs `previewing = input(false)` and `describedBy = input<string | null>(null)`. Add the outputs `hoverStart = output<HTMLElement>()` (emitting the button element) and `hoverEnd = output<void>()`. Emit them from `(pointerenter)`/`(pointerleave)` on the button only when `event.pointerType` is `'mouse'` or `'pen'` (R3). Bind `[class.is-previewing]="previewing()"`, which applies the same `box-shadow: var(--glow-plate-hover); opacity: 1` as `:hover` (FR-006). Bind `[attr.aria-describedby]` to `describedBy()` (T017 merges in the keys hint). Extend `planar-tile.spec.ts` with a small `@testing` helper, `pointerEvent(type, { pointerType, clientX, clientY })`, that builds a `PointerEvent`, or a `MouseEvent` with a `pointerType` property where jsdom lacks it (R10). Cover: mouse/pen enter/leave emit, touch enter/leave don't, and `is-previewing` applies
- [ ] T010 [US1] Add hover handling to `src/app/views/planechase-deck/planar-preview.controller.ts` (FR-005, FR-006). `hoverTile(id, tile)`: a no-op unless `canOpen()`; cancel any close timer; if a popover is open, switch at once (`preview.set({ id, mode: 'popover' })`, update `anchor`); otherwise start a 300 ms timer that opens it, replacing any pending open timer. `leaveTile()` and `leavePopover()` cancel a pending open and start a 150 ms close timer. `enterPopover()` cancels the close timer. Expose a readonly `anchor` signal (`HTMLElement | null`). An `effect` on `preview()?.mode === 'popover'` attaches a `document` `keydown` listener for `Escape` that closes it, and removes the listener (and clears `anchor`) as soon as the mode is no longer `'popover'`, whether the popover closed or turned into a dialog. Hover never opens or changes a dialog: `hoverTile` is a no-op while `preview()?.mode === 'dialog'`. Extend the controller spec with `vi.useFakeTimers()`: no popover before 300 ms, one after; leaving before 300 ms cancels it; an immediate switch while open; the 150 ms close cancelled by `enterPopover`; Esc; and no open while `confirming` (depends on T008)
- [ ] T011 [US1] Render the popover in `src/app/views/planechase-deck/planechase-deck.html/.ts/.scss`. While `preview.preview()?.mode === 'popover'`, render `<div id="planar-preview-popover" class="preview-popover" role="tooltip" (pointerenter)="preview.enterPopover()" (pointerleave)="preview.leavePopover()">` wrapping `<app-planar-preview [card]="preview.current()!" [on]="isOn(preview.current()!)" size="compact" />`, as a sibling after the set sections. Style it per T001: `position: fixed`, width 380px, max-width `calc(100vw − 24px)`, `--color-bg` face, 1px `--color-border`, `--radius-md`, `--glow-overlay`, padding `space-3`, z-index above the tiles and below the sticky `.footer`, and an optional `--duration-fast` opacity fade that is off under reduced motion. Wire each tile: `(hoverStart)="preview.hoverTile(card.id, $event)"`, `(hoverEnd)="preview.leaveTile()"`, `[previewing]="preview.preview()?.id === card.id && preview.preview()?.mode === 'popover'"`, `[describedBy]` = the popover id under the same condition. `(toggled)` stays `toggle(card)` (FR-007). Position it with `placePopover` (T006): an `effect` plus `afterRenderEffect`/`ResizeObserver` on the popover element reads the anchor's `getBoundingClientRect()`, the popover size, `window.innerWidth`, the top of `main.view-area` (`closest('main')`), the `.footer`'s top and the anchor's `.tiles` grid rect, then writes `top`/`left` styles. Recompute on the `scroll` of `main.view-area` and on window `resize` (listeners attached only while the popover is open). Extend `planechase-deck.spec.ts`: hover plus timers renders the tooltip with the card name and `aria-describedby` on the tile, a click while open toggles the draft and flips the status label, leaving closes it (depends on T007, T009, T010)

**Checkpoint**: US1 works on desktop and can be shipped alone as the MVP.

---

## Phase 4: User Story 2 - Read a card on a phone or tablet (Priority: P1)

**Goal**: A long-press opens the preview dialog (full-screen at 640px or less, centered and wider
above that) with Anterior/Próxima and an on/off toggle. Back, ✕, Esc and a tap outside close it
without leaving the deck settings. A tap still toggles.

**Independent Test**: On a touch device: a hold opens the dialog without toggling, a scroll
cancels the hold, the dialog's toggle updates the tile and counter, Anterior/Próxima cross sets
and skip collapsed ones, and system back closes only the dialog (quickstart "phone" steps 1–6).

- [ ] T012 [P] [US2] Create `PlanarPreviewDialog` in `src/app/shared/gameplay/planar-preview-dialog/` (`planar-preview-dialog.ts/.html/.scss/.spec.ts`, OnPush) per contracts/components.md. Inputs: `card`, `on`, `variant: 'narrow' | 'wide'`, `setName`, `index`, `total`, `hasPrevious`, `hasNext` (all required). Outputs: `toggled`, `previous`, `next`, `closed`. Lifecycle as in `ThemedModal`: `afterNextRender` → `showModal()` and focus the ✕ button, a backdrop `click` with `event.target === dialog` → `closed`, `(cancel)` → `preventDefault()` + `closed`, destroy → `dialog.close()` with no focus restore (R5). Markup: `<dialog [attr.aria-labelledby]="headingId" [class]="variant()">`. The wide variant has a `.ring` (`@use 'ring'` from T003) wrapping the `.face`; the narrow one has no ring. The header shows `.eyebrow` `<span lang="en">{{ setName() }}</span> · {{ DECK.previewPosition(index(), total()) }}` and a 44×44 ✕ `aria-label` `DECK.close`. The body holds `<app-planar-preview [size]="variant() === 'wide' ? 'wide' : 'compact'" [headingId]="headingId">`: in wide, a grid `minmax(0,1.15fr) minmax(0,1fr)` with the text column scrolling within the dialog's available height; in narrow, a `flex: 1; min-height: 0; overflow-y: auto` stacked body. PlanarPreviewContent (T007) needs a layout hook for this, either `size`-driven host classes or a `layout` input; pick one and keep it in T007's file. The footer has `.btn.btn--secondary` Anterior (`aria-label` `previousLabel`, `[disabled]="!hasPrevious()"`) and Próxima (`nextLabel`, `[disabled]="!hasNext()"`), and the toggle with `[attr.aria-pressed]="on()"`: `.btn--secondary` `DECK.disable` when on, `.btn--primary` `DECK.enable` when off. Layout per ui.md §2: wide = nav left, toggle right; narrow = full-width toggle over nav buttons with `flex: 1`, bottom padding `+ env(safe-area-inset-bottom)`. Narrow host: `margin: 0; width: 100vw; height: 100dvh; max-width: none; max-height: none; padding: 0`. Wide: `--modal-width` 880px, `max-width: 100%`, backdrop `--overlay-backdrop`, 2rem page padding; the ring spins, frozen under reduced motion. Spec: the header text, disabled nav at the ends, toggle labels plus `aria-pressed` for on/off, `closed` on cancel and on a backdrop click (not on an inner click), and ✕ focused on open (depends on T003, T007)
- [ ] T013 [P] [US2] Add the touch long-press to `PlanarTile` (`planar-tile.ts/.html/.scss`) per R7 and FR-008. Add the output `previewRequested = output<void>()`. On `pointerdown` with `pointerType === 'touch'`, record x/y, set a `holding` signal (class `is-holding`) and start a 500 ms timer. Cancel it (clear the timer and `holding`) on `pointermove` beyond 8 px (Euclidean), `pointerup`, `pointercancel` or `pointerleave`. When it fires: set `holdFired = true`, clear `holding`, emit `previewRequested`. `click`: if `holdFired`, reset it and don't emit `toggled`; otherwise emit `toggled` as before. Also reset `holdFired` on every `pointerdown`, because some mobile browsers send no `click` after a long-press and the next real tap must still toggle. `contextmenu`: always `preventDefault()`; do nothing more for touch (the timer decides). Styles: the button gets `-webkit-touch-callout: none; user-select: none; touch-action: pan-y`, and the `app-planar-image` inside it gets a host rule making its `img` `pointer-events: none` with `draggable="false"` (add a `draggable` attribute binding in `src/app/shared/gameplay/planar-image/planar-image.html`, always false). `.is-holding` sets `box-shadow: 0 0 0 1px var(--role-primary), 0 0 28px -2px rgb(from var(--role-primary) r g b / 70%); opacity: 1` with `transition: box-shadow var(--duration-slow) var(--ease-standard)`, and no transition under `prefers-reduced-motion`. Clear the timer on destroy. Spec (fake timers): the hold emits at 500 ms and the following click doesn't toggle; 9 px of movement, `pointercancel` or an early `pointerup` cancel it, and the click still toggles; a fired hold followed by no click, then a fresh `pointerdown`/`click`, toggles; a mouse `pointerdown` never starts a hold
- [ ] T014 [US2] Add the dialog logic to `src/app/views/planechase-deck/planar-preview.controller.ts` (FR-009, FR-009a, FR-011, R6). Add `variant = signal<'narrow' | 'wide'>('wide')`. `openDialog(id)`: a no-op unless `canOpen()`; clear the hover timers; set `variant` from `matchMedia(MOBILE_QUERY).matches` (`@shared/ds/media-query`, `'(max-width: 640px)'`), read once and never updated while open; set `preview` to `{ id, mode: 'dialog' }`; call `history.pushState({ ...history.state, planarPreview: true }, '')`, set `historyPushed = true`, and add a `popstate` listener that sets `historyPushed = false` and closes. `previous()`/`next()` move `preview.id` to the adjacent card in `visibleCards` while keeping `mode`, no-ops at the ends. Extend `close()`: if the mode was `'dialog'`, remove the `popstate` listener; if `historyPushed` and the pushed entry is still current (`history.state?.planarPreview`), call `history.back()`; reset `historyPushed`; then `afterNextRender` (with the injector) focuses `tileFor(currentId)` with `preventScroll: true` and scrolls it into view by setting `scrollTop` on its `closest('main')`, never `scrollIntoView`. On destroy, don't restore focus. Pop the pushed entry only if it's still current (`historyPushed && history.state?.planarPreview`), so a later navigation isn't undone (R6). Spec: `openDialog` pushes one entry and a `popstate` closes without calling `history.back`; close via `close()` calls `history.back` once; previous/next cross the set boundary and stop at the ends; the variant is fixed at open; focus goes to the tile of the card shown after navigating (assert `document.activeElement` is that tile's `<button>`); opening the dialog from an open popover leaves no `document` Esc listener, so Esc in the dialog closes it exactly once; and nothing opens while `confirming` (depends on T008)
- [ ] T015 [US2] Host the dialog in `src/app/views/planechase-deck/planechase-deck.html/.ts`. While `preview.preview()?.mode === 'dialog'`, render `<app-planar-preview-dialog>` with `card = preview.current()`, `on = isOn(card)`, `variant = preview.variant()`, `setName = card.set.name`, `index`/`total` from `preview.position()`, `hasPrevious`/`hasNext`, `(toggled)="toggle(card)"`, `(previous)="preview.previous()"`, `(next)="preview.next()"`, `(closed)="preview.close()"`. Wire each tile's `(previewRequested)="preview.openDialog(card.id)"`. Extend `planechase-deck.spec.ts`: a `previewRequested` emission opens the dialog for that card, the toggle inside updates the counter text and the tile's `aria-pressed`, Próxima changes the header, and `closed` removes the dialog (depends on T012, T013, T014)

**Checkpoint**: US1 and US2 both work; phones get the full preview.

---

## Phase 5: User Story 3 - Keyboard and screen reader access to the preview (Priority: P2)

**Goal**: Menu or Shift+F10 on a focused tile (and right-click with a mouse) opens the dialog.
Focus alone opens nothing, and closing returns focus to the tile.

**Independent Test**: Keyboard only: Tab across tiles and nothing opens. Shift+F10 opens the
dialog with focus on ✕, Tab stays inside, Esc returns focus to the tile, and the tile announces
"Menu ou Shift+F10 abre a carta." (quickstart "keyboard").

- [ ] T016 [US3] In `PlanarTile` (`planar-tile.ts/.html`), add `(keydown)`: on `event.key === 'ContextMenu'`, or `event.key === 'F10' && event.shiftKey`, call `preventDefault()` and emit `previewRequested`; Enter and Space keep their native toggle (FR-010). Extend `(contextmenu)`: for non-touch pointers (`pointerType` from the last `pointerdown`, or a `MouseEvent` with `button === 2`, or a keyboard-generated contextmenu), call `preventDefault()` and emit `previewRequested`, without double-emitting when a keydown already handled Menu/Shift+F10. Spec: the ContextMenu key and Shift+F10 emit once, a plain F10 and Tab/focus don't, Enter still toggles, and a right-click emits and prevents default (depends on T013)
- [ ] T017 [US3] Give `PlanarTile` a visually hidden description: add `<span class="visually-hidden" [id]="keysId">{{ copy.tileKeys }}</span>` inside the tile host (outside the button's accessible name), with `keysId` unique per instance (e.g. `'tile-keys-' + card().id`). Set the button's `aria-describedby` to `keysId`, plus `describedBy()` when set (space-separated). If no visually-hidden utility exists in `src/styles/_base.scss` or `_controls.scss`, add a scoped `.visually-hidden` rule in `planar-tile.scss` (clip-rect pattern). Spec: `aria-describedby` references the hidden span's text, and both ids are present while `describedBy` is set (depends on T016)
- [ ] T018 [US3] Make the hint input-dependent in `src/app/views/planechase-deck/planechase-deck.ts/.html`: `hoverCapable = mediaQuerySignal('(hover: hover) and (pointer: fine)')` (`@shared/ds/media-query`), and the template shows `hoverCapable() ? copy.hintPointer : copy.hintTouch` (FR-008a, R8). Spec: stub `matchMedia` both ways and assert the text

**Checkpoint**: The keyboard and screen-reader path is complete, and each input gets its hint.

---

## Phase 6: User Story 4 - Start from a fair planar deck (Priority: P3)

**Goal**: With no saved selection, the 8 default-off cards are off everywhere. Once a selection
is saved, it alone decides.

**Independent Test**: Clear site data. The deck settings show exactly the 8 cards off (143 de 151),
a full game never draws them, and turning Otaria on and saving makes it drawable (quickstart
"default selection").

This phase has no dependency on Phases 2–5 and can run in parallel with them.

- [ ] T019 [P] [US4] Create `src/app/core/data/planechase/default-off.ts` exporting `DEFAULT_OFF_IDS: readonly string[]` with exactly these oracle ids, each with its card name in a comment (data-model.md): Otaria `29e3371d-aa41-46a9-921a-96565be47eff`, Temple of Atropos `9c925057-ac3d-461e-b505-f80e2fd38c8c`, Sanctum of Serra `f0c8ce35-b627-485c-bd64-d7eae47b8efa`, Norn's Dominion `9d58f647-3f83-4f65-a944-c6236db7c422`, Planewide Disaster `a34b272b-084b-4ff1-8b02-d95116ccfeab`, Morphic Tide `302e4ac2-522b-4a0a-850a-d856639ea2a4`, Lethe Lake `85592710-8637-4726-8b92-552b9be677c0`, Unleash the Flux `14066888-66f6-4903-8de2-cc961aa45d8d`. Add a header comment: "Hand-kept (FR-016); not generated by sync:planechase. Cards that end or undo the game, lock it, or hand one player runaway extra turns."
- [ ] T020 [US4] In `src/app/core/utils/planar-selection.util.ts`, change `enabledCards(cards, null)` to return the cards whose id isn't in `DEFAULT_OFF_IDS` (a saved selection is unchanged: its `disabledIds` alone decide, FR-018), and add `initialDisabledIds(selection: PlanarSelection | null): string[]` returning `selection ? [...selection.disabledIds] : [...DEFAULT_OFF_IDS]`. Update the doc comments ("every catalog card unless disabled" → the default list), and the comment in `src/app/core/models/planar-selection.model.ts` and the `null` comment on `PlanarSelectionService` in `src/app/core/services/planar-selection.service.ts` ("`null` means never saved: the default list applies (FR-017)"). Extend `planar-selection.util.spec.ts`: `null` excludes exactly the default ids present in the fixture (add one default id to a fixture card, or pass ids explicitly), a saved selection ignores the list, and `initialDisabledIds` both ways. Add a test importing the real `src/app/core/data/planechase/cards.json` that asserts every `DEFAULT_OFF_IDS` entry exists there and `validateSelection(enabledCards(cards, null))` is `ok` (≥ 10 cards, ≥ 1 plane) (depends on T019)
- [ ] T021 [US4] In `src/app/views/planechase-deck/planechase-deck.ts`, seed `draft` from `new Set(initialDisabledIds(this.selection.selection()))` instead of `?.disabledIds ?? []`. Check that `src/app/views/planechase/planechase.ts` (which already uses `enabledCards`) and `SyncService.syncPlanarSelection` (which uploads only a non-null local selection) need no change, and don't change them. Extend `planechase-deck.spec.ts`: with no saved selection the default ids render `aria-pressed="false"` and the counter reflects it; with a saved selection they follow it. Extend the relevant `src/app/views/planechase/planechase.spec.ts` case: starting a game with no saved selection passes ids that exclude the default list (depends on T020)

**Checkpoint**: All four stories work independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T022 Run `npm test` and `npm run lint` and fix any failures in the files this feature touched
- [ ] T023 Walk quickstart.md's desktop, keyboard, default-selection and offline sections against the running dev server with the `run` skill (never start or stop port 4200; the user runs `npm start`), and report anything that fails. The phone section needs a real device: hand those steps to the user
- [ ] T024 Propose (don't apply before the user reviews) an update to `.claude/docs/architecture.md`'s "Planechase card data"/"Planechase state" bullets: `default-off.ts` is a hand-kept list that `enabledCards(…, null)` applies when no selection is saved. Per CLAUDE.md's "worth adding" test, say plainly if nothing else qualifies

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none. T001 must land before any UI styling (Constitution V).
- **Foundational (Phase 2)**: T004 → T005; T006 → T008; T007 needs T002. It blocks US1–US3.
- **US1 (Phase 3)**: needs Phase 2. T009 and T010 run in parallel, then T011.
- **US2 (Phase 4)**: needs Phase 2 (and T003). T012 and T013 run in parallel with T014, then T015. It's independent of US1, though both edit `planechase-deck.html` and the controller, so do them one after the other if one person does both.
- **US3 (Phase 5)**: needs US2 (T013's `previewRequested` and the dialog), then T016 → T017. T018 can go any time after T002.
- **US4 (Phase 6)**: independent of every other phase. T019 → T020 → T021.
- **Polish (Phase 7)**: after all the stories you want done.

### Within Each Story

- Pure utils and presentation components come before the controller, and the controller before the view wiring.
- Each task ships with its spec changes in the same task.

## Parallel Example: Phase 2 and US4

```text
T004 planar-card-text.util.ts   |  T006 planar-preview.util.ts  |  T007 PlanarPreviewContent  |  T019 default-off.ts
```

## Parallel Example: User Story 2

```text
T012 PlanarPreviewDialog (shared/gameplay/planar-preview-dialog/)
T013 PlanarTile long-press (shared/gameplay/planar-tile/)
T014 controller dialog logic (views/planechase-deck/planar-preview.controller.ts)
→ then T015 wiring in planechase-deck.html/.ts
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 → Phase 2 → Phase 3.
2. **Stop and validate**: quickstart desktop steps 3–6.

### Incremental Delivery

1. US1 (desktop popover) → US2 (phone dialog, the other P1) → US3 (keyboard) → US4 (default deck).
2. US4 is small and independent. It can land first or alongside any other story.
3. Each story is validated against its quickstart section before moving on.

## Notes

- Edit existing files only with the Edit tool (mixed CRLF/LF repo).
- New UI follows DESIGN.md as updated by T001. The handoff README gives the values, and the
  spec's FR-004/SC-006 wording beats the README's older "Images" paragraph.
- No new saved state: nothing in this feature writes to IndexedDB or Supabase.
