# Quickstart: validating the Reactivity & Timing Audit

**Feature**: [spec.md](spec.md) | **Verdicts**: [research.md](research.md#verdict-list) | **Contracts**: [contracts/internal-apis.md](contracts/internal-apis.md)

## Prerequisites

- `npm install` done. The dev server is run by the maintainer (`npm start`), so it isn't started here.
- Test and lint runs go through the `test-runner` agent (CLAUDE.md).

## 1. Lint with no exceptions record (US3, SC-001, SC-007)

```bash
test ! -e eslint-suppressions.json   # the file is gone
npm run lint                         # passes
```

**Negative check**: add `Promise.resolve();` as a statement in any `src/` file. `npm run lint` must fail with `no-floating-promises`. Revert it.

## 2. Inventory matches the code (US4, SC-002)

```bash
grep -rnE "\bsetTimeout\(|\bsetInterval\(|\beffect\(|afterRenderEffect\(|\.events\.subscribe" src --include=*.ts | grep -v "\.spec\.ts"
```

Every line matches a **keep** row in the verdict list: 31 at plan time, plus any added during implementation. No line is a convert or remove row (T2, T3, T12, E3, E6, E12, R3).

## 3. Tests and build (SC-001)

```bash
npm test
npm run build
```

Both pass. In particular:

- `page-change.spec.ts`: setting `target` then reading `shown()`/`run()` with no `detectChanges` gives the new state (US2 independent test).
- `page-sweep.spec.ts`: fakes only `requestAnimationFrame`/`cancelAnimationFrame`. The change ends on the frame the front completes.
- Service specs that used `settleChannel()` use `delivered()` or `nextRefresh(service)`, with no `setTimeout` (FR-012).
- `identity-wheel.spec.ts`: a newly lit color adds a burst on the next read of `bursts()`.

## 4. Duration-change check (SC-005)

1. Set `SWEEP_MS` in `sweep-loop.ts` to `1500` temporarily.
2. Run `npx ng test --include='**/page-sweep.spec.ts'` through `test-runner`. Specs that advance by `SWEEP_MS` still pass, and none depends on the old 500.
3. In the app, open a collection: the page stays inert until the slower front has fully crossed, then focus moves to the new `h1`.
4. Revert.

## 5. Manual pass, motion on and reduced motion (SC-006)

Toggle reduced motion in the OS or with DevTools → Rendering → "Emulate CSS prefers-reduced-motion". In each mode:

| Flow | Expect |
|------|--------|
| Collection list → collection → subcollection → back (browser back too); holding box | Sweeps in the right direction (instant under reduced motion), focus on the new `h1`, input never left blocked |
| Delete the open collection or deck | Lands on the parent or list with no sweep, toast shown |
| Decks list → deck → back; rapid double navigation mid-sweep | The second change supersedes the first, with no double end |
| Side nav (wide): hover in/out, pin, keyboard focus | Collapses about 120 ms after leaving, as before |
| Nav drawer (narrow): open, navigate, resize past 960 px | Closes on navigation and on crossing the breakpoint |
| Toast | Shows 5 s, inside an open modal when one is open |
| Entry and profile modals: switch screens, sign out ("Saindo…") | Fluid height animates after the first interaction, no scrollbar flash, "Saindo…" lasts at least about 0.7 s |
| Profile modal identity wheel: pick a color | Burst and ripple on the new color (none under reduced motion) |
| Planechase game: roll, planeswalk | Next image ready, flairs as before |
| Planechase deck settings: hover a tile, long-press (touch emulation), collapse a set while previewing | Popover after 300 ms, dialog on hold, preview closes on collapse |

## 6. Design audit

Only if a `.html` or `.scss` changed: run `design-auditor`. None is expected, because the templates read the same signals.
