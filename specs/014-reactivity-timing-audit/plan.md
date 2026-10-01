# Implementation Plan: Reactivity & Timing Audit

**Branch**: `014-reactivity-timing-audit` | **Date**: 2026-10-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-reactivity-timing-audit/spec.md`

## Summary

This plan audits every timer, effect, after-render effect and router-event subscription outside spec files. There are 38 call sites; the spec said 39, see research R0. Each gets a recorded verdict. Five change, the rest stay with a reason, all listed in [research.md § Verdict list](research.md#verdict-list).

- **Page sweep's end**: it comes from the sweep's own rAF frame instead of a parallel timer.
- **`SweepLoop`**: it reads its host and canvas itself, so the copying effect and the unreachable no-host timer go.
- **Page change**: it becomes one `linkedSignal` over the routed target and reads the router's navigation signals, so its effect and `NavigationStart` subscription go.
- **Identity wheel**: its bursts become a `linkedSignal` over the lit colors.
- **Cross-tab test helper**: it waits for delivery and `refresh()` instead of a macrotask.

Separately, the six recorded promise violations are fixed: two navigations marked `void`, four spec mocks typed correctly. `eslint-suppressions.json` is then pruned and deleted, and the architecture guide gains the general rule. Users see no difference.

## Technical Context

**Language/Version**: TypeScript 5.x, Angular 22.1 (standalone, zoneless, signals)

**Primary Dependencies**: `@angular/core` signals (`linkedSignal`, `computed`, `effect`, `afterRenderEffect`), `@angular/router` 22.1 (`currentNavigation`/`lastSuccessfulNavigation` signals), ESLint with typescript-eslint (type-aware)

**Storage**: N/A, since no persisted shape changes

**Testing**: Vitest via `ng test` (jsdom, `fake-indexeddb`), `@testing/cross-tab` fake channel, Vitest fake timers for kept timers and fake rAF for the sweep

**Target Platform**: Browser PWA plus Capacitor Android (same web build)

**Project Type**: Single Angular web app (`src/app`)

**Performance Goals**: No change. The sweep stays one rAF loop and gains no extra timer.

**Constraints**: No user-visible change (FR-001), with motion on and with reduced motion. No production code special-cases tests. Pending items #39 and #40 (sync, storage) are out of scope.

**Scale/Scope**: 38 audited call sites. About 8 production files and 10 spec files change, plus `architecture.md`, `commands.md` and one deleted file.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|-----------|-------|--------|
| I. Physical-World Fidelity | No owned-card data or location logic touched | Pass |
| II. PT-BR-First | No copy added or changed | Pass |
| III. Free and Accessible | N/A | Pass |
| IV. Local-First, Cloud-Optional | No persistence or sync behavior change (T9, T11 kept) | Pass |
| V. Zoneless, Signal-Driven | This spec enforces it: derived state moves from `effect` to `linkedSignal` (E6, E12), and effects stay only for side effects. No zone, no UI framework, no new UI | Pass |
| VI. Persistence and Sync Pattern | Services untouched. Only the spec helper for cross-tab waiting changes | Pass |
| Development Workflow | The `architecture.md`/`commands.md` edits are fact-based (a new convention and a removed file) | Pass |

**Post-design re-check**: unchanged, all pass. No violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/014-reactivity-timing-audit/
├── plan.md              # This file
├── research.md          # Phase 0: verdict list (38 entries) + decisions R0–R9
├── data-model.md        # Phase 1: reactive state shapes that change
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── internal-apis.md # Phase 1: PageChange, SweepLoop, @testing/cross-tab
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### UI Design

No UI surface: no `ui.md`. No template or stylesheet is expected to change, because the templates read the same signals. `design-auditor` runs only if one does.

### Source Code (repository root)

```text
src/app/
├── shared/effects/page-sweep/
│   ├── page-change.ts          # E6, R3: linkedSignal over target; router signals; go() removed
│   ├── page-change.spec.ts     # drives a target signal instead of go()
│   ├── page-sweep.ts           # E3: attach effect removed; start() gets the dust getter
│   ├── page-sweep.spec.ts      # target signal; fakes rAF only
│   └── sweep-loop.ts           # T2, T3: no timers; host injected; onCrossed from step()
├── shared/ds/identity-wheel/
│   ├── identity-wheel.ts       # E12: bursts = linkedSignal over lit
│   └── identity-wheel.spec.ts  # burst on read, no effect flush needed
├── core/testing/cross-tab.ts   # T12: delivered(), nextRefresh(); settleChannel() removed
├── core/services/
│   ├── {card,collection,deck,planar-selection,planechase-game,profile-store}.service.spec.ts
│   │                           # settleChannel() → delivered()/nextRefresh()
│   └── sync.service.spec.ts    # R8: typed `from` mock (3 violations)
├── shared/auth/profile-modal/profile-flow.store.spec.ts   # R8: typed cloudAuth mock (1)
└── views/collection-area/collection-area.ts               # R7: void navigate (2)

eslint-suppressions.json        # pruned, then deleted
.claude/docs/architecture.md    # R9: rule bullet; suppressions sentences dropped
.claude/docs/commands.md        # R9: suppressions paragraph dropped
```

**Structure Decision**: existing single-app layout. No new folders or files except the contract doc in the spec folder.

## Implementation order (for /speckit-tasks)

1. **Promises and lint (US3)**: R7, R8, prune, delete the file, lint. This is independent and lands first, so any later new violation fails at once.
2. **Sweep loop (US1)**: R1 and R2 (T2, T3, E3), with the page-sweep spec on fake rAF only.
3. **Page change (US2)**: R3 (E6, R3), with page-change, page-sweep, and the collection- and deck-area specs.
4. **Identity wheel (US2)**: R4 (E12).
5. **Cross-tab helper (US1)**: R5 (T12) across the six service specs.
6. **Docs and record (US4)**: R9. Re-run the inventory grep against the verdict list.
7. **Checkpoint**: full suite, lint and build through `test-runner`, then the quickstart manual pass.

## Complexity Tracking

None.
