# Data Model: Reactivity & Timing Audit

**Feature**: [spec.md](spec.md) | **Research**: [research.md](research.md)

This spec stores no data and changes no persisted shape: IndexedDB, Supabase and localStorage are untouched. The only "entities" are in-memory reactive state whose declaration changes, plus the audit record itself.

## Audit inventory entry (spec folder only)

Recorded in [research.md § Verdict list](research.md#verdict-list), one row per call site.

| Field | Meaning |
|-------|---------|
| `#` | Stable id: `T` one-shot timer, `I` repeating timer, `E` effect, `A` after-render effect, `R` router-event subscription |
| Location | File and member |
| Purpose | What the call does today |
| Verdict | `keep`, `keep (fallback)`, `convert` or `remove` (exactly one, FR-003) |
| Reason / replacement | One line. Convert/remove entries name the replacement |

**Rules**: every in-scope call site in `src/` (non-spec) has exactly one row (SC-002). A convert or remove row's call site no longer exists after implementation (US4-2). A keep row's call site still exists (US4 independent test).

## `PageChange<P>` state (converted: E6, R3)

There was one effect calling `go()` and three writable signals. Now one `linkedSignal`:

```text
PageState<P> {
  started: boolean    // a first non-null target has been shown
  shown:   P          // the incoming place (rule.initial until started)
  leaving: P | null   // the outgoing place while a sweep runs
  run:     SweepRun | null  // the running sweep; a new object per sweep
}
source: target(): P | null
```

**Transitions** (computation, given `to = target()` and the previous state `s`):

| Condition | Result |
|-----------|--------|
| no previous state | `{ started: to !== null, shown: to ?? rule.initial, leaving: null, run: null }` |
| `to === null` | `s` (missing place: left to the area's redirect) |
| `!s.started` | `{ started: true, shown: to, leaving: null, run: null }` |
| `rule.same(s.shown, to)` | `s` with `leaving`/`run` cleared if a sweep was running (the old sweep finishes first) |
| reduced motion, `NO_SWEEP_INFO`, or `rule.sweep(...) === null` | `{ started, shown: to, leaving: null, run: null }` |
| otherwise | `{ started, shown: to, leaving: s.shown, run: { dir } }` |

**Local write**: `end(run)` sets `{ ...s, leaving: null, run: null }` only when `s.run === run`.

**Derived views**: `shown`, `leaving` and `run` are read-only `computed`s over the state. Their consumers (`PageSweep`, `retained(...)`, the areas) are unchanged.

## `IdentityWheel.bursts` (converted: E12, R4)

`signal<Burst[]>` written by an effect becomes `linkedSignal<Color[], Burst[]>` with source `lit`:

- no previous value → `[]`
- otherwise → `prev.value` plus one `makeBurst(color)` per color in `lit` that isn't in `prev.source`, unless reduced motion is on (read untracked)
- local write (unchanged): a burst's animation end removes it with `update`.

## `SweepLoop` run (converted: T2, T3, E3, R1, R2)

The `Run` shape is unchanged. What changes:

- The `endTimer` field is gone. `onCrossed` is called from `step()` on the frame where `turning` first turns false while not settling.
- The `canvas`/`host` fields set by `attach()` are gone. The host comes from the injected `ElementRef`, and the canvas from the `dust` getter passed to `start()`, read on the first frame.
- `stop()` clears the canvas of the run it stops (`run.dust.ctx`).
