# Research: Page Transitions

All Technical Context unknowns are resolved below. Each entry: Decision, Rationale, Alternatives considered.

## R1. One controller, `PageChange<P>`, created by `injectPageChange(rule)`

**Decision**: A plain class `PageChange<P>` in `shared/effects/page-sweep/page-change.ts`, created in the area's field initializer through `injectPageChange<P>(options)`, the way `mediaQuerySignal` is called today. It owns everything both controllers copy:

- `shown`, `leaving`, `run` (the running sweep) and `reducedMotion`;
- the first place shown instantly;
- the finish-then-start rule for a change that lands while another runs;
- capturing the navigation (`NavigationStart` → `PageNav`, today only in `DeckTurn`);
- following the area's target place through its own `effect` (R6).

The area passes only its rule (R2) and its target place signal. Both area views drop their `providers` entry for a controller.

**Rationale**: The two controllers differ only in the direction call (`turnFor` vs `transitionDir`) and in how a close holds its places (R3). A factory function runs in the area's injection context (`Router`, `DestroyRef`, `matchMedia`), keeps the class generic without a DI token per area, and needs no provider wiring.

**Alternatives considered**:
- An `@Injectable()` generic class in each area's `providers`, configured after construction. Rejected: DI can't carry the type parameter, and a `configure(rule)` step is mutable setup the factory avoids.
- One `providePageChange(rule)` provider factory. Rejected: the collections rule would then need the area's own signals through DI; with places carrying their depth (R2) it no longer does, but the factory form is still simpler and matches `mediaQuerySignal`.

## R2. The area rule: `same` + `sweep(from, to, nav)`, pure, in `core/utils`

**Decision**: An area supplies a `PageRule<P>` constant:

- `initial`: the place rendered before the first `go()` (both areas: the list);
- `same(a, b)`: when two places are the same page;
- `sweep(from, to, nav)`: `'open'`, `'close'` or `null` (instant).

The rules live in `core/utils/deck-pages.util.ts` (`DECK_PAGES`, `DeckPlace`) and `core/utils/collection-pages.util.ts` (`COLLECTION_PAGES`, `CollectionPlace`), replacing `deck-turn.util.ts` and `collection-transition.util.ts`. A collection place carries the depth it had when routed (`{ kind: 'collection', id, depth }`), so `sweep` is pure and needs no `depthOf` callback.

**Rationale**: Pure rules keep the whole trigger table unit-testable, as `turnFor` is today. Putting the depth on the place replaces `knownDepth` and `depthOf`: the outgoing place is the stored `shown` place, so a collection removed mid-change still has the depth it had when shown (spec edge case). `same` ignores the depth, so the routed place never changes because a depth did.

**Alternatives considered**:
- Passing `depthOf` into the rule. Rejected: it keeps the `knownDepth` map alive in the area only to remember depths the place could carry itself.
- One rule per area as a method on the area component. Rejected: not testable without mounting the view.

## R3. Decks move to `shown` + `leaving` (#2)

**Decision**: Every sweep sets `leaving = from` and `shown = to` at its start, whatever its direction. `pendingClose` is removed. The shared sweep (R7) renders `shown` underneath and `leaving` in the outgoing layer for both directions.

The deck page's data comes from two retained signals, one per slot (R9). The outgoing deck page reads `leavingPage`, not the shown place, so it stays whole during a close (FR-004).

**Rationale**: It is the collections model, which already works for open and close alike. The only reason decks held the incoming place back was that `shownDeck` derived from `shown`. Once the deck data derives per slot, the hold-back has no purpose.

**Alternatives considered**: Keeping `pendingClose` as an option of the shared controller. Rejected: two models in one controller is the duplication the spec removes.

## R4. Navigation marking: `info.sweep`, one convention for both areas (#5)

**Decision**: Navigation `info` carries `{ sweep: true }` or `{ sweep: false }`, exported as `SWEEP_INFO` and `NO_SWEEP_INFO` from `page-change.util.ts`:

- **`sweep: false`** (the controller decides, before the rule): an instant swap. Used by the decks' delete landing, the decks' missing-deck redirect, and the collections' missing-place redirect (including the landing on the parent after a delete).
- **`sweep: true`** (read by the decks rule): the deck tile asks list → deck to sweep open.
- **Neither**: the rule decides.

The collections' `redirecting` flag is removed. The decks rule no longer reads `replaceUrl`: the missing-deck redirect now says `sweep: false` itself.

**Rationale**: The marking travels with the navigation that performs it, so it can't leak into the next one. That covers the "redirect back to the place already shown" edge case: the next navigation's `NavigationStart` replaces the captured `PageNav`. Reading `replaceUrl` was a proxy that needed a popstate exception (the router marks every popstate `replaceUrl`). An explicit flag needs none. Handling `sweep: false` in the controller means no rule can forget it.

**Alternatives considered**:
- Keeping `info.deckTurn` and adding `info.instant`. Rejected: two keys for one question.
- Router state (`state`). Rejected: it's persisted into history, so a browser back would replay it. `info` is per navigation only.

## R5. Interrupted changes: the sweep settles, never asks (#4)

**Decision**: `PageSweep.start` loses its `active` callback. The dust loop (R8) has an explicit `settle()`:

- A navigation that sweeps while one runs finishes the running change and starts a new run. The loop's `start` stops the old run and clears its dust (FR-009, first half).
- A navigation that doesn't sweep, or returns to the place already shown, finishes the running change with no new run. The run becomes `null`, and the sweep calls `settle()`: the front stops, the outgoing layer is gone, and the dust starts the DESIGN.md settle at once (all gone ≤ 1 s, FR-009).
- A normal end is unchanged: the loop settles itself once `SWEEP_MS` has elapsed. The controller's `end(run)` then clears the run, and the later `settle()` is a no-op.

**Rationale**: It is the clarified behavior (Clarifications, 2026-10-01). It already matches decks today, where `active()` turned false and the dust settled from that frame. Collections called `stop()` on an instant swap, which cleared the canvas abruptly. Driving it from the controller's `run` signal satisfies FR-010: the controller says when the page settled, and the sweep never asks.

**Alternatives considered**: Keeping the front pushing dust until `SWEEP_MS` after an interrupt. Rejected in clarify: the outgoing page is already gone, so a moving front with nothing behind it reads as a glitch.

## R6. The controller follows the area's target place

**Decision**: `injectPageChange` takes `target: () => P | null`. The area returns `null` while the routed place is missing, and the controller's `effect` calls `go(target)` for every non-null value. `go` itself ignores a place equal to `shown` (after finishing a running change). The areas' `last` variables and their "drive the transition from the address" effects are removed.

**Rationale**: Both areas wrote the same effect. The missing check is area-specific, so it stays as the area's `null`. `go`'s own same-place check covers what `last` did, including the FR-009 case where the navigation returns to the place already shown.

**Alternatives considered**: Leaving the effect in each area. Rejected: it's identical in both, so it's part of the state machine FR-001 moves.

## R7. `PageSweep` becomes a component; the place template is projected (#3)

**Decision**: `<app-page-sweep [change]="pages">` with one `<ng-template pagePlace let-place let-leaving="leaving">` child, picked up by `contentChild.required(PagePlace)`. The component:

- renders the template for `shown`, then, while `leaving` is set, inside its own `.sweep` layer (`viewChild`) for `leaving`;
- renders the dust canvas unless reduced motion is on, and connects it to the loop (`viewChild` + `effect`, replacing each area's `attach` effect);
- sets `inert` on its host while a change runs (FR-012);
- captures the `<main>` scroll at a run's start (the outgoing layer's `top`) and resets it to 0;
- resets `--front` on its own layer at each start (the quick-second-change fix);
- sets `--band` from `FRONT_BAND` (R10);
- focuses the incoming page's `h1` after each change, except on the first place (R11).

The host is the positioned flex column that both areas' `:host` is today. The `_page-sweep.scss` partial moves into the component's stylesheet and is deleted.

**Rationale**: The clarified form (Clarifications, 2026-10-01): a component, because it renders the canvas and the layer. A template projected once and stamped twice is how collections already render both slots (`placeView`). Decks merge their two templates (`listPlace`, `deckPlace`) into one `@switch`, which also removes the deck area's three-branch `@if`. A `viewChild` replaces `querySelector('.sweep')`.

**Alternatives considered**:
- Two `<ng-content>` slots (incoming, outgoing). Rejected: the outgoing slot appears and disappears with the run, so the area would still write the `@if` and the layer markup.
- A `[place]` `TemplateRef` input. Equivalent; rejected only because the projected `<ng-template>` keeps the markup inside the component's tag.
- Host as `display: contents`. Rejected: the loop measures the host (`clientWidth`/`clientHeight`), which is 0 under `display: contents`.

## R8. The drawing engine stays a provided class: `SweepLoop`

**Decision**: The rAF/dust code of today's `PageSweep` service becomes `SweepLoop` (`sweep-loop.ts`), provided by the component (`providers: [SweepLoop]`), so it dies with the view. API: `attach(canvas | null, host)`, `start(dir, layer | null, onCrossed)`, `settle()`, `stop()`. `SWEEP_MS` moves with it. Its loop no longer reads `active()`. It settles when `SWEEP_MS` has elapsed or `settle()` was called, whichever comes first.

**Rationale**: The physics, sprites and timing are unchanged (FR-014), and keeping them out of the component lets the timing tests drive them with fake timers and a fake 2D context, as `deck-turn.spec.ts` does today.

**Alternatives considered**: Merging the loop into the component. Rejected: the timing tests would then need a mounted component for every case.

## R9. Per-slot page data, retained (#8, FR-004, edge case)

**Decision**: A helper `retained(key, read)` (in `page-change.ts`) returns a `linkedSignal` that follows `read(key())` but keeps its last value while the key is unchanged and `read` returns `undefined`. Each area derives two of them, keyed by the id of `shown` and of `leaving`:

- **Collections**: `shownPage` / `leavingPage` build the page data (collection, color, ancestors, depth, kind, totals, children) once per change of their inputs. This replaces the per-render `pageOf(id)` method (FR-016).
- **Decks**: `shownDeck` / `leavingDeck` hold the deck record. This replaces `shownDeck`, which already retained its value.

The template picks the slot from the outlet context's `leaving` flag.

**Rationale**: Two computeds per area is the memoization #8 asks for. Retention keeps an outgoing page whole when its record is removed mid-sweep (spec edge case). Collections went blank there before, and decks already retained.

**Alternatives considered**: One `computed` map keyed by id for both slots. Rejected: a change in one slot's inputs would rebuild both.

## R10. `--band` from `FRONT_BAND` (#9)

**Decision**: The component binds `[style.--band.px]="band"` with `band = FRONT_BAND` on the `.sweep` layer. The stylesheet's `--band: 160px` and its "matches" comment are removed.

**Rationale**: One definition (SC-003). The mask gradients keep reading `var(--band)`.

**Alternatives considered**: The loop writing `--band` alongside `--front`. Rejected: it's a constant, so a template binding is enough and is present before the first frame.

## R11. Heading focus moves into the shared sweep

**Decision**: After each change (an instant swap, or a sweep's end), except the first place, the component focuses the incoming page's first `h1` after the next render. Both areas' `h1` already carry `tabindex="-1"`. The areas' `#heading` view queries and focus effects are removed.

**Rationale**: The two focus effects are identical, and the component is the one unit that knows when a change ends and which layer is incoming. The spec leaves the placement to the plan, and the behavior is unchanged (US1 scenario 7).

**Alternatives considered**: Keeping the effect per area. Rejected: a third area would copy it again.

## R12. Names and locations (#10)

**Decision**:

- `core/utils/deck-dust.util.ts` → `core/utils/sweep-dust.util.ts`. It stays in `core/utils` because it's pure, per architecture.md.
- `deck-turn.util.ts` → `deck-pages.util.ts` (+ spec).
- `collection-transition.util.ts` → `collection-pages.util.ts` (+ spec).
- The shared types (`PageNav`, `PageRule`, `SweepDir`, the info constants) → `core/utils/page-change.util.ts`.
- `views/deck-area/deck-turn.ts` and `views/collection-area/collection-transition.ts` (+ specs) are deleted.
- In `app.routes.ts` and `deck-tile.ts`, "page turn" becomes "page change".

**Rationale**: FR-017. The wording follows DESIGN.md ("page change", "page sweep").

**Alternatives considered**: Moving the dust util next to the component. Rejected: architecture.md places pure functions in `core/utils`.
