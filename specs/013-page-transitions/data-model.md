# Data Model: Page Transitions

Nothing is persisted. These are the in-memory types and the state machine shared by the deck and collection areas.

## Place (per area)

A page an area can show. Plain objects, compared through the area rule's `same`.

| Area | Type | Variants | `same` |
|---|---|---|---|
| Decks | `DeckPlace` (`deck-pages.util.ts`) | `{ kind: 'list' }`, `{ kind: 'deck', id }` | same kind and, for a deck, same id |
| Collections | `CollectionPlace` (`collection-pages.util.ts`) | `{ kind: 'list' }`, `{ kind: 'holding' }`, `{ kind: 'collection', id, depth }` | same kind and, for a collection, same id (depth ignored) |

- `depth` is the collection's tree depth (1–3) when the place was routed (research R2). The list is depth 0 and the holding box depth 1, as today.
- An area's routed place is a `computed` with `equal: same`, so it changes only when the page does.

## PageNav

What the controller captures at each `NavigationStart` (`page-change.util.ts`).

| Field | Type | Source |
|---|---|---|
| `trigger` | `'imperative' \| 'popstate' \| 'hashchange'` | `NavigationStart.navigationTrigger` |
| `info` | `unknown` | `router.currentNavigation()?.extras.info` |

`replaceUrl` is no longer captured (research R4).

**Sweep marking** (`info`), exported constants:

| Constant | Value | Meaning | Used by |
|---|---|---|---|
| `SWEEP_INFO` | `{ sweep: true }` | the area's rule may treat this navigation as asked-for | deck tile (list → deck) |
| `NO_SWEEP_INFO` | `{ sweep: false }` | always an instant swap, decided by the controller before the rule | decks' delete landing and missing-deck redirect; collections' missing-place redirect and delete landing |

## PageRule\<P\>

What an area supplies (research R2). Pure.

| Member | Type | Decks (`DECK_PAGES`) | Collections (`COLLECTION_PAGES`) |
|---|---|---|---|
| `initial` | `P` | list | list |
| `same` | `(a: P, b: P) => boolean` | see Place | see Place |
| `sweep` | `(from: P, to: P, nav: PageNav \| null) => SweepDir \| null` | list → deck: `'open'` only with `info.sweep === true`. deck → list: `'close'`. Anything else: `null`. | `'close'` when `to` is shallower than `from`, otherwise `'open'` |

`SweepDir` is `'open' | 'close'`.

The rule is only asked for two different places, after the controller has handled the first place, reduced motion and `NO_SWEEP_INFO`.

## SweepRun

One running sweep: `{ dir: SweepDir }`, compared by identity. A new object per sweep, so a sweep that replaces another is always a new value, even in the same direction.

## PageChange\<P\> state

| Signal | Type | Meaning |
|---|---|---|
| `shown` | `P` | the incoming place, rendered underneath from the start of a change; starts at `rule.initial` |
| `leaving` | `P \| null` | the outgoing place, rendered in the sweep layer while a run is set |
| `run` | `SweepRun \| null` | the running sweep |
| `reducedMotion` | `boolean` | `prefers-reduced-motion: reduce` |

Invariant: `leaving !== null` ⇔ `run !== null`.

### Transitions — `go(to)`

Evaluated in order. `nav` is the last captured `PageNav`.

1. **First call**: `shown = to`. Nothing runs.
2. **A run is set**: finish it (`leaving = null`, `run = null`). The sweep then settles its dust, unless step 5 starts a new run in the same call (research R5).
3. **`same(shown, to)`**: stop.
4. **Instant**: `reducedMotion`, or `nav.info.sweep === false`, or `rule.sweep(shown, to, nav) === null`. Then `shown = to`.
5. **Sweep** (`dir` from the rule): `leaving = shown`, `shown = to`, `run = { dir }`.

### Transitions — `end(run)`

Called by the sweep once the front has crossed (`SWEEP_MS` after the run's first frame). If `run` is still the current run: `leaving = null`, `run = null`. Otherwise it is a stale end and is ignored.

### Driving

`injectPageChange({ ...rule, target })`: an `effect` calls `go(target())` whenever the target is non-null. The area's `target` returns `null` while its routed place is missing (unknown id, empty holding box), leaving that case to the area's redirect.

## Retained page data

`retained(key, read)` (research R9): a signal of `read(key())` that keeps its last value while `key()` is unchanged and `read` returns `undefined`. It resets when the key changes, and is `undefined` for a `null` key.

| Area | Signals | Key | Value |
|---|---|---|---|
| Decks | `shownDeck`, `leavingDeck` | the deck id of `shown` / `leaving` | `Deck` |
| Collections | `shownPage`, `leavingPage` | the collection id of `shown` / `leaving` | `{ collection, color, ancestors, depth, kind, totals, children }` |
