# Quickstart: Page Transitions

How to check that the feature works. Contracts: [contracts/page-change.md](contracts/page-change.md). States: [data-model.md](data-model.md).

## Automated

Run through the `test-runner` agent (CLAUDE.md):

1. `npm test`: the full suite passes.
2. `npm run lint`: clean. If an entry in `eslint-suppressions.json` points at a deleted or renamed file, prune it with `npx eslint src --prune-suppressions`.
3. `npm run build`: the budgets hold (`anyComponentStyle` covers the new `page-sweep.scss`).

The suites that must exist and pass:

| Spec | Covers |
|---|---|
| `page-change.spec.ts` | first place instant; sweep sets `shown`/`leaving`/`run`; `end` clears it and ignores a stale run; instant via the rule, via `NO_SWEEP_INFO`, under reduced motion; a sweep during a sweep; an instant swap during a sweep; the same place during a sweep (FR-019, US3); `retained` keeps the last value and resets on a new key |
| `page-sweep.spec.ts` | mounted in a test host: the layer only while running, `inert`, `--band` = `FRONT_BAND`, the front moves right → left on open and back on close, `--front` reset on a quick second change, the end a full sweep after the first frame, dust settled and the canvas cleared ≤ `SETTLE_MAX_MS` after an interrupt without a new sweep, nothing running after destroy, focus on the `h1` after a change, no canvas under reduced motion |
| `deck-pages.util.spec.ts` | the decks trigger table (moved from `deck-turn.util.spec.ts`) |
| `collection-pages.util.spec.ts` | open deeper or sideways, close going up, depth carried on the place |
| `sweep-dust.util.spec.ts` | renamed from `deck-dust.util.spec.ts`, unchanged |
| `deck-area.spec.ts`, `collection-area.spec.ts`, `deck-tile.spec.ts` | unchanged, except the navigation `info` expectations (`{ sweep: true }`, `{ sweep: false }`) |

## Manual (dev server, motion on)

With `npm start` running (the user's own server) or the `run` skill, signed into a profile that has nested collections, holding-box cards and two decks:

1. **Collections**: list → collection (open, right → left), → subcollection (open), breadcrumb up (close), browser back and forward (close, then open), list → holding box (open). The outgoing page starts from where it was scrolled. Focus lands on the new `h1`.
2. **Decks**: tile → deck (open). Back link, side-nav "Decks", browser back (close: the deck header stays whole as it dissolves). Browser forward and a typed `/decks/{id}` (instant).
3. **Redirects**: `/collection/nope`, `/collection/caixa` with an empty holding box, `/decks/nope` (instant). Delete a subcollection from its page (lands on the parent, instant). Delete a deck (lands on the list, instant).
4. **Redirect back to the same place**: from the list, go to `/collection/caixa` with an empty holding box (it lands back on the list), then open a collection: it sweeps.
5. **Interruptions** (US3): start a sweep and, before it ends, press back (a new sweep); trigger a redirect (instant: the dust fades out, no abrupt clear); go to the place already shown. Every time, input works afterwards and no dust is left after 1 s.
6. **Reduced motion** (OS setting or DevTools emulation): every change above is an instant swap, with no canvas in the DOM.

Then run the `design-auditor` agent against DESIGN.md Motion and [ui.md](ui.md) (SC-006).
