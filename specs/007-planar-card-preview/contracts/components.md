# Contracts: utils, controller, components

**Feature**: `007-planar-card-preview`. Types and state are in [data-model.md](../data-model.md);
the rationale is in [research.md](../research.md).

## Data (`core/data/planechase/`)

### `default-off.ts` (new)
```ts
export const DEFAULT_OFF_IDS: readonly string[];   // 8 oracle ids, hand-kept, one comment per card name (FR-016)
```

## Utils (pure, `core/utils/`)

### `planar-selection.util.ts` (changed)
```ts
// null → every catalog card except DEFAULT_OFF_IDS (FR-017); a saved selection → unchanged (FR-018).
export function enabledCards(cards: readonly PlanarCard[], selection: PlanarSelection | null): PlanarCard[];
// The draft's starting disabled ids: the saved ones, or the default list.
export function initialDisabledIds(selection: PlanarSelection | null): string[];
```

### `planar-card-text.util.ts` (new, extracted from `PlanarCard`)
```ts
export interface PlanarCardText {
  lang: 'en' | null;                 // 'en' when the card has no up-to-date translation (FR-002)
  text: string[];                    // static text paragraphs; [] for phenomena
  ability: string[] | null;          // null = plane with no chaos ability
  plateLabel: string;                // PLANAR_CARD.chaos | PLANAR_CARD.encounter
}
export function planarCardText(card: PlanarCard): PlanarCardText;
```
`PlanarCard` (the in-game block) switches to it with no visible change, so the preview and the
game can't drift apart (SC-003).

### `planar-preview.util.ts` (new)
```ts
export interface Rect { top: number; left: number; width: number; height: number }
export interface PopoverBounds {
  viewportWidth: number;
  top: number;        // view area's top edge (below the top bar)
  bottom: number;     // deck footer's top edge
  grid: Rect;         // the tile grid, to decide left/right half
}
export const POPOVER_GAP = 12;
// Beside the tile (right if its center is in the grid's left half, else left), top clamped to the
// bounds. If neither side fits: centered horizontally, above or below the tile (more room wins).
// The result never intersects `tile` and stays inside [0, viewportWidth] × [top, bottom] when the
// popover fits there at all (FR-006, SC-004).
export function placePopover(tile: Rect, popover: { width: number; height: number }, bounds: PopoverBounds): { top: number; left: number };

export function visibleOrder(sets: readonly PlanarSet[], collapsed: ReadonlySet<string>): PlanarCard[];
```

## Controller (`views/planechase-deck/planar-preview.controller.ts`, view-scoped)

```ts
@Injectable()   // provided in PlanechaseDeck's `providers`
export class PlanarPreviewController {
  // Wired by the view once (inputs the controller reads, not owns):
  connect(ctx: {
    sets: Signal<readonly PlanarSet[]>;
    collapsed: Signal<ReadonlySet<string>>;
    confirming: Signal<boolean>;
    tileFor: (id: string) => HTMLElement | undefined;   // for focus return and popover anchor
  }): void;

  readonly preview: Signal<{ id: string; mode: 'popover' | 'dialog' } | null>;
  readonly variant: Signal<'narrow' | 'wide'>;
  readonly current: Signal<PlanarCard | null>;
  readonly position: Signal<{ index: number; total: number } | null>;  // 1-based index
  readonly hasPrevious: Signal<boolean>;
  readonly hasNext: Signal<boolean>;

  // Pointer (mouse/pen only; the tile filters pointerType):
  hoverTile(id: string, tile: HTMLElement): void;   // 300 ms open, or immediate switch when a popover is open
  leaveTile(): void;                                // starts the 150 ms close
  enterPopover(): void;                             // cancels the close
  leavePopover(): void;                             // starts the 150 ms close

  openDialog(id: string): void;                     // long-press / right-click / Menu / Shift+F10; closes the popover
  previous(): void;
  next(): void;
  close(): void;                                    // any close path; dialog → focus the tile of `current` (scrollTop on main.view-area)
}
```
Rules the controller enforces:
- Every open is a no-op while `confirming()` is true (FR-013).
- An `effect` closes the preview when `confirming()` becomes true or `current`'s set becomes
  collapsed (FR-013).
- Esc: a `document` `keydown` listener closes the popover while it's open. The dialog handles its
  own Esc (`cancel`).
- The dialog pushes a history entry and listens to `popstate` while open. `close()` from any
  other path pops it (R6).
- On `DestroyRef`: close without restoring focus, clear the timers and pop the history entry if
  it's still current.

## Components

### `PlanarTile` (changed, `shared/gameplay/planar-tile/`)
```ts
readonly card = input.required<PlanarCard>();
readonly on = input.required<boolean>();
readonly previewing = input(false);           // new: keeps the hover glow while its popover is open (FR-006)
readonly describedBy = input<string | null>(null);  // new: popover id while it's open (role="tooltip")
readonly toggled = output<void>();
readonly hoverStart = output<HTMLElement>();  // new: mouse/pen pointerenter
readonly hoverEnd = output<void>();           // new: mouse/pen pointerleave
readonly previewRequested = output<void>();   // new: long-press fired, contextmenu (non-touch), ContextMenu key, Shift+F10
```
- Touch hold: 500 ms, cancelled by more than 8 px of movement, `pointerup`, `pointercancel` or
  `pointerleave`. `is-holding` stays on while it builds. A fired hold swallows the next `click`
  (FR-008).
- `contextmenu`: always `preventDefault()`. It emits `previewRequested` only for non-touch
  pointers (touch opens through the timer; R3).
- `keydown`: `ContextMenu`, or `F10` with `shiftKey`, calls `preventDefault()` and emits.
  Enter/Space stay native toggles (FR-010).
- An accessible description with `DECK.tileKeys` (a visually hidden span via
  `aria-describedby`, merged with `describedBy` when the popover is open).

### `PlanarPreviewContent` (new, `shared/gameplay/planar-preview/`)
The shared reading surface used by the popover and both dialog variants.
```ts
readonly card = input.required<PlanarCard>();
readonly on = input.required<boolean>();
readonly size = input<'compact' | 'wide'>('compact');   // popover and narrow: compact; wide dialog: wide
readonly headingId = input<string | null>(null);         // the dialog's aria-labelledby target
```
It renders the status row (bead plus "Ativada/Desativada no baralho"), `app-planar-image`
(`images.large`, not lazy), the name `h2 lang="en"`, the type line, the static text and the unlit
ability plate, using `planarCardText()`. It has no focusable elements.

### `PlanarPreviewDialog` (new, `shared/gameplay/planar-preview-dialog/`)
```ts
readonly card = input.required<PlanarCard>();
readonly on = input.required<boolean>();
readonly variant = input.required<'narrow' | 'wide'>();
readonly setName = input.required<string>();
readonly index = input.required<number>();    // 1-based
readonly total = input.required<number>();
readonly hasPrevious = input.required<boolean>();
readonly hasNext = input.required<boolean>();
readonly toggled = output<void>();
readonly previous = output<void>();
readonly next = output<void>();
readonly closed = output<void>();             // ✕, Esc (cancel), backdrop click
```
- Mount: `showModal()` after the first render, then focus ✕. Destroy: `close()`. It doesn't
  restore focus; the controller focuses the right tile (R5).
- The header is the eyebrow `<span lang="en">{setName}</span> · {DECK.previewPosition(i, n)}` plus
  ✕. The toggle has `aria-pressed="{on}"`: "Desativar carta" (secondary) or "Ativar carta"
  (primary). Anterior/Próxima are disabled at the ends.
- `aria-labelledby` points to the content's `h2`.

### `PlanechaseDeck` (changed, `views/planechase-deck/`)
- Provides and connects `PlanarPreviewController`. It wires each tile's `hoverStart`/`hoverEnd`/
  `previewRequested`, and passes `previewing`/`describedBy`.
- It renders the popover (a `div role="tooltip" id="planar-preview-popover"` wrapping
  `PlanarPreviewContent size="compact"`, `position: fixed`, placed with `placePopover`) while
  `preview().mode === 'popover'`, and `PlanarPreviewDialog` while it's `'dialog'`.
- `draft` seeds from `initialDisabledIds(selection())`. `restart()`/`save()` are unchanged.
- The hint is `hintPointer`/`hintTouch`, picked by `(hover: hover) and (pointer: fine)` (R8).

## Copy (`core/utils/planechase-copy.ts`, `DECK`)
`hint` is replaced by `hintPointer` and `hintTouch`. New keys: `tileKeys`, `previewOn`,
`previewOff`, `previewPosition(i, n)`, `previous`, `previousLabel`, `next`, `nextLabel`,
`disable`, `enable`, `close`. The texts are exactly as in the handoff README's "New copy" block
and in [ui.md](../ui.md) §7.
