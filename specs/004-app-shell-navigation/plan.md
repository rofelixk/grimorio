# Implementation Plan: App Shell Navigation — Top Bar and Nav Bar

**Branch**: `feature/004-app-shell-navigation` | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-app-shell-navigation/spec.md`, plus the design handoff
`design_handoff_app_shell_navigation/README.md`

## Summary

This plan replaces spec 003's temporary top bar and the legacy nav with the final app shell:

- **Top bar**: the wordmark links Home, with a sync area and the profile control on wide screens, or a sync mark
  and "Menu" on narrow ones.
- **Left side nav** on wide screens: collapsed thread → hover-expanded → pinned, with the pin stored per device.
- **Right-side drawer** on narrow screens: a native `<dialog>` holding the account block and the nav.
- **Scrolling**: the document never scrolls, and `<main>` is the only scroll container.
- **Legal notice**: a shared WotC/Scryfall/AI notice ends every page.

Sync becomes **manual only**:

- `SyncScheduler` and the entry modal's automatic syncs (and its sync line) are removed.
- `SyncService` gains a 60 s bound.
- A new `SyncStatusService` derives the eight FR-007 states with a pure util and a 60 s clock.

Also in scope:

- The "Fio de luz" light recipes land as tokens plus a `_fio.scss` mixin partial, and DESIGN.md is updated first
  (FR-032).
- The profile-name limit drops to 16.

## Technical Context

**Language/Version**: TypeScript ~6.0, Angular 22.1 (standalone, zoneless, OnPush, signals)

**Primary Dependencies**: The existing ones only: `@angular/router` (`routerLinkActive`), `@supabase/supabase-js`
(PostgREST `.abortSignal()`), `idb`. **No new dependencies.**

**Storage**:
- localStorage `grm-nav-pinned` (device preference).
- The existing profile-DB `meta.lastSyncedAt`.
- No IndexedDB or Supabase schema changes.

**Testing**: Vitest via `ng test` (jsdom + `fake-indexeddb`). Browser checks go through the `run` skill
(Playwright) against the user's dev server.

**Target Platform**: Evergreen browsers, the installable PWA, and the Capacitor Android WebView. The drawer
animation needs `@starting-style` and `transition-behavior: allow-discrete`, and the bands need CSS relative color,
which is already required.

**Project Type**: A single-project client-only Angular SPA (Capacitor-wrapped). The backend is hosted Supabase.

**Performance Goals**:
- A profile or sync state change shows in ≤ 1 s (SC-004).
- A hover expand causes 0 px of content shift (SC-007).
- A sync settles in ≤ 60 s (FR-005a).
- The band animations are background-position only, with no layout work.

**Constraints**:
- The document never scrolls (FR-023).
- 44px targets at every width (FR-022).
- One breakpoint, 960px.
- No icons or Magic symbols.
- Reduced motion stops all bands.
- Status never uses identity colors (FR-007a).

**Scale/Scope**:
- About 8 new or rewritten components, 2 new services, 1 new util, 1 new Sass partial.
- About 5 legacy components removed.
- Edits to `SyncService`, `EntryFlowStore`/`DonePanel`, `entry-copy.ts`, `entry-flow.util.ts`, the About view,
  DESIGN.md and architecture.md.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Physical-World Fidelity | Pass | Owned-card and location data are untouched. Manual sync reuses the same reconciler. |
| II. PT-BR-First | Pass | All shell copy is PT-BR in `entry-copy.ts`. Sync failures map to three fixed labels, so no backend text reaches the UI. |
| III. Free and Accessible | Pass | No monetization surface. |
| IV. Local-First, Cloud-Optional | Pass | The shell works fully offline. Sync stays optional and is now explicitly user-triggered. Home stays ungated, and the gate on the collection is unchanged. |
| V. Zoneless, Signal-Driven Angular | Pass | Standalone + OnPush, `computed` for derivations, `effect` only for side effects (dialog open/close, scroll reset). No UI framework. **DESIGN.md is updated before the shell UI is built** (FR-032), as the first implementation phase. |
| VI. Established Persistence and Sync Pattern | Pass | No new entities or tables. The nav pin is a device UI preference, not an entity. Sync keeps `reconcileEntities`, `updatedAt` and tombstones. |

**Post-design re-check (after Phase 1)**: Still all pass. The design adds no persistence shape, dependency or UI
framework. The drawer uses the native `<dialog>` that architecture.md prescribes.

### Spec deviations (not constitutional)

- **FR-010**: the spec now names the accepted exception. Removing the temporary profile button leaves the modal's "Desvincular conta" step without
  an entry point until the profile-modal rework spec. The user accepted this on 2026-09-25 (research R19).
- **Modal copy**: `SUBTITLE.reauth` is reworded along with `SUBTITLE.up`, because it promised an automatic push
  that no longer happens (research R17). This falls under the spec's "removing its automatic syncs" assumption.

## Project Structure

### Documentation (this feature)

```text
specs/004-app-shell-navigation/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R19
├── data-model.md        # Phase 1: state, derived sync display, pin preference
├── quickstart.md        # Phase 1: validation scenarios V1–V22
├── contracts/
│   └── shell.md         # Phase 1: service/util/component contracts
├── ui.md                # Phase 1: surfaces, layout, states, flow, a11y, copy
├── checklists/          # (from /speckit-specify)
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### UI Design (Phase 1 → `ui.md`)

See [ui.md](ui.md) for the shell layout at wide (≥ 960px) and narrow widths, the profile/sync/nav/drawer state
tables, the interaction flow (including the drawer → modal hand-off), design-system reuse, accessibility and all
PT-BR copy.

### Source Code (repository root)

```text
DESIGN.md                                   # FR-032 entries: Fio de luz, top bar, nav, drawer, sync, notice, status colors, identity exception, 3–16
.claude/docs/architecture.md                # shell structure, manual sync, _fio partial (after implementation)
src/styles/
├── _tokens.scss                            # + shell size/motion tokens, --band*, --glow-overlay, grm-flow-* keyframes
└── _fio.scss                               # NEW: band-text / line / thread / wash mixins
src/app/
├── app.ts | app.html | app.scss            # shell grid, <main> scroll container, scroll reset, SyncService.start()
├── app.routes.ts                           # drop showCollectionFilters data
├── core/
│   ├── services/
│   │   ├── sync.service.ts                 # start() hooks, 60 s abort/timeout, generation guard
│   │   ├── sync-status.service.ts          # NEW: display(), busy(), act(), 60 s clock
│   │   ├── shell-state.service.ts          # NEW: wide, pinned (localStorage), drawerOpen
│   │   └── sync-scheduler.service.ts       # DELETED
│   ├── utils/
│   │   ├── sync-status.util.ts             # NEW: syncDisplay(), relativeSince()
│   │   ├── entry-copy.ts                   # + SHELL, SYNC_AREA, NOTICE; − TOP_BAR, SYNC; 3–16; SUBTITLE.up/reauth
│   │   └── entry-flow.util.ts              # name length 3–16
│   └── models/profile.model.ts             # doc comment 3–16
├── shared/
│   ├── ds/
│   │   ├── media-query.ts                  # + WIDE_QUERY
│   │   ├── sync-mark/                      # NEW
│   │   └── sync-line/                      # DELETED
│   ├── layout/
│   │   ├── top-bar/                        # REWRITTEN
│   │   ├── profile-control/                # NEW
│   │   ├── sync-status/                    # NEW
│   │   ├── nav-links/                      # NEW (+ nav-destinations.ts)
│   │   ├── side-nav/                       # NEW
│   │   ├── nav-drawer/                     # NEW
│   │   ├── legal-notice/                   # NEW
│   │   ├── nav-bar/                        # DELETED
│   │   └── brand-mark/                     # DELETED (only used by nav-bar)
│   ├── auth/
│   │   ├── profile-button/                 # DELETED
│   │   └── entry-modal/                    # entry-flow.store.ts + done-panel: sync line removed
│   ├── locations/collection-filters/       # DELETED (only used by nav-bar)
│   └── index.ts                            # barrel exports updated
└── views/about/                            # WotC/Scryfall paragraphs rendered from NOTICE
```

Each new component has its own `.spec.ts` next to it, following the existing convention.

**Structure Decision**: The single Angular project. Shell components go in `shared/layout/` (the layout domain
folder), the one reusable status primitive goes in `shared/ds/`, and the services and the pure util go in
`core/`, per architecture.md's folder rules.

### Implementation order (for /speckit-tasks)

1. DESIGN.md entries (FR-032) → tokens + `_fio.scss`.
2. Sync groundwork:
   - `SyncService` start/timeout
   - delete `SyncScheduler`
   - remove the modal's sync line
   - `sync-status.util` + `SyncStatusService`
3. Copy + the 3–16 name rule.
4. `ShellState`, then the shell layout in `App` (grid, `<main>`, scroll reset), then `LegalNotice` + About.
5. `TopBar`, `ProfileControl`, `SyncStatus`/`SyncMark` (US1, US3 wide).
6. `NavLinks`, `SideNav` (US2).
7. `NavDrawer` (US4).
8. Delete the legacy components, update the barrel, run the quickstart pass, update architecture.md.

## Complexity Tracking

No constitution violations. Nothing to justify.
