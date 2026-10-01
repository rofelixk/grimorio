# Contract: Shared page change

The public surface an area uses to get page changes (US2). Types are in [data-model.md](../data-model.md). Names are the plan's; signatures are illustrative, not code to paste.

## `core/utils/page-change.util.ts` (pure)

```ts
type SweepDir = 'open' | 'close';
interface PageNav { trigger: 'imperative' | 'popstate' | 'hashchange'; info?: unknown }
interface PageRule<P> {
  initial: P;
  same(a: P, b: P): boolean;
  sweep(from: P, to: P, nav: PageNav | null): SweepDir | null;
}
const SWEEP_INFO = { sweep: true };
const NO_SWEEP_INFO = { sweep: false };
function sweepInfo(nav: PageNav | null): boolean | undefined; // reads info.sweep
```

## `shared/effects/page-sweep/page-change.ts`

```ts
function injectPageChange<P>(options: PageRule<P> & { target: () => P | null }): PageChange<P>;

class PageChange<P> {
  readonly shown: Signal<P>;
  readonly leaving: Signal<P | null>;
  readonly run: Signal<SweepRun | null>;
  readonly reducedMotion: Signal<boolean>;
  go(to: P): void;          // the state machine in data-model.md; public for tests
  end(run: SweepRun): void; // called by PageSweep; ignores a stale run
}

function retained<K, T>(key: () => K | null, read: (key: K) => T | undefined): Signal<T | undefined>;
```

- Call it in an injection context (a field initializer). Its router subscription and effect end with the caller.
- `target` may read signals declared later in the class.

## `<app-page-sweep>` (`shared/effects/page-sweep/page-sweep.ts`)

```html
<app-page-sweep [change]="pages">
  <ng-template pagePlace let-place let-leaving="leaving">
    <!-- one place's page, from place.kind; leaving tells which retained data slot to read -->
  </ng-template>
</app-page-sweep>
```

| Part | Contract |
|---|---|
| `change` input (required) | the area's `PageChange` |
| `PagePlace` directive (`ng-template[pagePlace]`) | exactly one, as content. It's rendered with context `{ $implicit: place, leaving: boolean }` |
| Host | a positioned flex column that fills its parent's main axis. `inert` while `change.run()` is set |
| Incoming page | the template for `shown`, rendered directly in the host and kept across changes |
| Outgoing layer | `div.sweep` (`.sweep--close` for close) with the template for `leaving`, only while a run is set. `top` = −(scroll captured at the run's start). `--band` = `FRONT_BAND` px. `--front` is written per frame and reset at each start |
| Dust | `canvas.dust`, `aria-hidden`, absent under reduced motion |
| On a new run | stops any previous run, captures and resets the `<main>` scroll, starts the loop. Calls `change.end(run)` once the front has crossed |
| On `run` → `null` | the loop settles: the front stops, and the dust fades out within `SETTLE_MAX_MS` |
| After a change ends | focuses the incoming page's first `h1` (it must be `tabindex="-1"`), except for the first place |
| On destroy | timers and rAF stop, with nothing left running |

The area writes no `.sweep`, canvas, `inert`, scroll offset, `attach` or focus code. It keeps only its own `:host` layout and its page styles.

## `SweepLoop` (`shared/effects/page-sweep/sweep-loop.ts`, internal)

Provided by `PageSweep`. Not used by areas.

```ts
const SWEEP_MS = 500;
class SweepLoop {
  attach(canvas: HTMLCanvasElement | null, host: HTMLElement): void;
  start(dir: SweepDir, layer: () => HTMLElement | null, onCrossed: () => void): void; // layer is read on the first frame
  settle(): void; // idempotent; no-op with no run
  stop(): void;   // cancels timers/rAF and clears the canvas
}
```

Timing, front, fade, dust physics and settle are unchanged from today's `PageSweep` service (FR-014, DESIGN.md Motion "Page sweep").

## Area rules

| File | Exports |
|---|---|
| `core/utils/deck-pages.util.ts` | `DeckPlace`, `DECK_PAGES: PageRule<DeckPlace>` |
| `core/utils/collection-pages.util.ts` | `CollectionPlace`, `COLLECTION_PAGES: PageRule<CollectionPlace>` |
