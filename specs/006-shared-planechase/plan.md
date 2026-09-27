# Implementation Plan: Shared Planechase — First Gameplay Mode

**Branch**: `feature/006-shared-planechase` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-shared-planechase/spec.md`, plus the design handoff
`design_handoff_shared_planechase/` (README → Planechase.dc.html)

## Summary

A new **"Modos de jogo"** nav destination leads to a gameplay menu, and from there to a
**shared-planar-deck Planechase** tool that needs no profile and works offline.

**Card data ships with the app**:
- `npm run sync:planechase` (new script) reads the project's Supabase card catalog (every
  `layout = 'planar'` card) and keeps each card's newest non-gold, English printing. It writes
  `cards.json` deterministically: `oracle_id` as the stable id, the English text with the
  chaos/encounter ability split out, the set, the `small`/`large` images, and a content hash.
- To make that possible, the existing `sync:scryfall` also stores each printing's border, release
  date and `small`/`large` images, through one migration adding four columns.
- The new Claude Code skill `/planechase-translate` writes `cards.pt-br.json`. Each entry records
  the hash it was made from, so a stale or missing translation falls back to English.
- Both files load as one lazy chunk (dynamic `import()`). Planechase makes no Supabase call.

**The game**:
- It's a pure state machine (`planechase-game.util.ts`) fed by a crypto-based `randomInt`
  (rejection sampling, Fisher–Yates):
  - start (with the 901.5 phenomena-to-bottom rule)
  - roll (1 = Planeswalk, 6 = Caos) with the rising cost
  - manual planeswalk
  - the phenomenon chain
  - "Zerar custo"
  - the all-used reset
  - one-step undo
- `PlanechaseGameService` persists the whole state, undo snapshot included, in the device DB's
  `meta` store. It isn't tied to a profile and isn't synced.

**The deck selection**:
- It's a disabled-ids list plus `updatedAt`, in the active profile's `meta` store, or the device's
  when no profile is active.
- It's held by a new entity-shaped `PlanarSelectionService`.
- It syncs through a new owner-only table, `planechase_selections`, reconciled with
  `reconcileEntities` as a single entity.

**Images**: loaded from Scryfall's image host into Cache Storage by the app itself, so they work
offline in dev, in the PWA and on Android. Tiles load lazily through an `IntersectionObserver`.

**UI**:
- Four routed views and a new `shared/gameplay/` folder: the console, the phone dock, the card, the
  image, the tile, and two rAF flairs.
- All of it is added to `DESIGN.md` first.

## Technical Context

**Language/Version**: TypeScript ~6.0, Angular 22.1 (standalone, zoneless, OnPush, signals). The
scripts run on Node via `tsx`.

**Primary Dependencies**: The existing ones only: `idb`, `@supabase/supabase-js` (sync and scripts),
`node:crypto` (the script's hash), Web Crypto (`getRandomValues`), the Cache Storage API and
`IntersectionObserver`. **No new dependencies.**

**Storage**:
- IndexedDB `grimorio-device` → `meta`: `planechaseGame`, `planarSelection` (with no profile
  active).
- `grimorio-profile-{id}` → `meta`: `planarSelection`.
- No store or version changes.
- Cache Storage `grm-planechase-images`.
- Supabase:
  - The new table `planechase_selections`.
  - Four new nullable columns on `printings`.
- Project files: `src/app/core/data/planechase/cards.json` and `cards.pt-br.json`.

**Testing**: Vitest via `ng test` (jsdom + `fake-indexeddb`):
- The pure utils are covered heavily, including a 6,000-roll distribution test.
- The services and components are covered too.
- Browser checks go through the `run` skill (Playwright) against the user's dev server.
- The script and skill are checked by hand (spec Assumptions).

**Target Platform**: Evergreen browsers, the installable PWA, and the Capacitor Android WebView.
Cache Storage and `IntersectionObserver` are baseline in all three.

**Project Type**: A single-project client-only Angular SPA, plus a maintainer Node script. The
backend is hosted Supabase.

**Performance Goals**:
- A roll result renders in the same frame as the tap (a pure transition plus a signal set), far
  inside SC-005's 1 s.
- The catalog chunk (about 250 KB) loads once per session.
- Tile images load only near the viewport.

**Constraints**:
- Offline except for images never shown before.
- Zero Supabase requests during play (SC-008).
- Unbiased randomness (FR-008/008a).
- No used/available disclosure (FR-012).
- No Magic symbols or icons (DESIGN.md).
- PT-BR, except card and set names and the English fallback.
- Reduced motion disables the flairs.

**Scale/Scope**:
- 161 cards (147 planes, 14 phenomena).
- 4 views and 7 `shared/gameplay` pieces (5 components, 2 flairs).
- 4 new services (`PlanechaseCatalogService`, `PlanarSelectionService`, `PlanechaseGameService`,
  `PlanarImageService`) and 3 new utils (`crypto-random`, `planechase-game`, `planar-selection`).
- 1 copy file, 1 script, 1 skill and 2 migrations.
- Edits to `SyncService`, `ProfileSessionService`, `sync-status.util`, `ProfileFlowStore`,
  `nav-destinations`, `entry-copy.ts`, `app.routes.ts`, `app.config.ts`, `sync-scryfall.ts`,
  `package.json`, `tsconfig.json` (possibly), `DESIGN.md`, `architecture.md` and `commands.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constitution v2.1.1.

| Principle | Status | Notes |
|---|---|---|
| I. Physical-World Fidelity | Pass | No owned-card or location data is read or written. Enabling a card never implies owning it (spec Assumptions). |
| II. PT-BR-First | Pass | All UI copy lives in `planechase-copy.ts` (PT-BR). The only English is what the spec allows: card names, official set names, and the English fallback for untranslated cards (FR-023), marked `lang="en"`. Sync errors go through the existing mapping, so no raw Supabase text is shown. Translations are reviewed files, never runtime machine translation. |
| III. Free and Accessible | Pass | No monetization surface. |
| IV. Local-First, Cloud-Optional | Pass | The gameplay routes have no guard. The game and the no-profile selection live on the device. The data ships with the app and images are cached, so play works offline. The cloud is used only by the optional manual sync of a linked profile's selection. |
| V. Zoneless, Signal-Driven Angular | Pass | Standalone + OnPush. `computed` covers derivation (enabled list, actions, lit plate), `linkedSignal`/`signal` holds the draft, and `effect` is only for the IntersectionObserver and image-URL side effects. Flairs run from action handlers. No UI framework. **`DESIGN.md` is updated first** with the console, dock, lit plate, image frame, tile, set group and the two flairs. |
| VI. Established Persistence and Sync Pattern | Pass | `PlanarSelectionService` has the entity shape: `load`/`whenReady`/`flush`, a write queue with a captured handle, `updatedAt` stamping, `applySyncResult`, and it joins the switch sequence. Its sync reuses `reconcileEntities`. Tombstones aren't needed because the selection is replaced, never deleted. `PlanechaseGameService` keeps the signal + idb + `whenReady` + queue shape and isn't synced. The new table ships its grants and owner-only RLS in the same migration, with `updated_at NOT NULL DEFAULT now()`. |

**Post-design re-check (after Phase 1)**: Still all pass.
- The one judgment call is Principle VI's "soft-delete tombstones". They apply to entity types
  that can be deleted, and the selection can't be deleted: it only ever gets replaced. Reconciling
  it with an empty tombstone list is the reconciler's documented "never deleted" case, not a
  deviation.
- The new `printings` columns are an `ALTER` on an already-granted catalog table, so there are no
  new grants.

### Spec deviations and notes (not constitutional)

- **Plane with no chaos ability** (R2): no current card lacks one (the gold-only Ghirapur Grand
  Prix is excluded), but the data format and UI still handle `ability: null`: no plate, and a
  "Caos" roll says so. The spec assumes every plane has one.
- **Current card removed by a data update** (R11): the game draws the next card. The spec's edge
  case covers removed cards in general, not the face-up one.
- **Cards that bend the die or the planeswalk pattern aren't modeled one by one.** Examples:
  Chaotic Aether ("each blank roll is a chaos roll"), Bad Wolf Bay ("…Then planeswalk") and Norn's
  Seedcore ("Planeswalk to it, except don't planeswalk away from any plane"). The table reads the card's PT-BR text and uses the manual "Planeswalk" action
  (FR-010) or simply ignores a die result. That action exists for exactly these cases, and "Como
  jogar" says so (R17).
- **New copy, approved by the maintainer** (R17): the refused-start messages, the no-chaos sub line, the
  anytime-reset result, and the count-free reset confirmation body. None are in the handoff in
  this form.
- **Handoff overridden by the spec**: no counts anywhere (footer, mobile header, reset confirm),
  as the clarification decided.

## Project Structure

### Documentation (this feature)

```text
specs/006-shared-planechase/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R18
├── data-model.md        # Phase 1: card data files, selection, game state machine
├── quickstart.md        # Phase 1: validation scenarios V1–V26
├── contracts/
│   ├── services.md           # utils, services, components
│   ├── supabase.md           # 2 migrations, client calls, script reads
│   └── card-data-tooling.md  # sync:planechase + /planechase-translate
├── ui.md                # Phase 1: surfaces, layout, states, flow, DS reuse, a11y, copy
├── checklists/          # (from /speckit-specify)
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### UI Design (Phase 1 → `ui.md`)

See [ui.md](ui.md). It covers:
- the menu, the no-game page, the wide console, the mobile dock, the rules and the deck settings
- the state table mapped to FRs
- the flow, including the silent draft discard on leave
- the new DS pieces for `DESIGN.md`
- accessibility (live results, `alertdialog` confirms, `aria-pressed` tiles, `lang="en"` names) and
  the PT-BR copy

### Source Code (repository root)

```text
DESIGN.md                                   # console, dock, lit plate, image frame, tile, set group, 2 flairs
.claude/docs/architecture.md                # Planechase data, gameplay folder, selection sync (after implementation)
.claude/docs/commands.md                    # npm run sync:planechase
.claude/skills/planechase-translate/         # NEW: SKILL.md, glossary.md
package.json                                # + "sync:planechase"
tsconfig.json                               # resolveJsonModule, if not already implied
scripts/
├── sync-scryfall.ts                        # + border_color, released_at, image_small, image_large
└── sync-planechase.ts                      # NEW
src/app/
├── app.routes.ts                           # /modes, /modes/planechase{,/rules,/deck} + catalog resolver
├── app.config.ts                           # initializer awaits PlanechaseGameService.whenReady()
├── core/
│   ├── data/planechase/
│   │   ├── cards.json                      # NEW (generated)
│   │   ├── cards.pt-br.json                # NEW (skill output)
│   │   └── planar-card.model.ts            # NEW: file + runtime types
│   ├── models/
│   │   ├── planar-selection.model.ts       # NEW
│   │   └── planechase-game.model.ts        # NEW
│   ├── services/
│   │   ├── planechase-catalog.service.ts   # NEW (+ planechaseCatalogResolver)
│   │   ├── planar-selection.service.ts     # NEW
│   │   ├── planechase-game.service.ts      # NEW
│   │   ├── planar-image.service.ts         # NEW
│   │   ├── profile-session.service.ts      # + PlanarSelectionService in entityServices
│   │   └── sync.service.ts                 # + syncPlanarSelection step
│   └── utils/
│       ├── crypto-random.util.ts           # NEW
│       ├── planechase-game.util.ts         # NEW
│       ├── planar-selection.util.ts        # NEW
│       ├── planechase-copy.ts              # NEW: UI copy + "Como jogar" sections
│       ├── sync-status.util.ts             # + planarSelectionUpdatedAt
│       └── entry-copy.ts                   # + SHELL.modes
├── shared/
│   ├── gameplay/                           # NEW domain folder
│   │   ├── planar-console/  planar-dock/  planar-card/  planar-image/  planar-tile/
│   │   └── flairs/                         # planeswalk-flair, chaos-flair
│   ├── auth/profile-modal/profile-flow.store.ts  # passes planarSelectionUpdatedAt
│   └── layout/nav-links/nav-destinations.ts      # + Modos de jogo
└── views/
    ├── game-modes/                         # NEW
    ├── planechase/                         # NEW
    ├── planechase-rules/                   # NEW
    └── planechase-deck/                    # NEW
```

- **Supabase**: the migrations `006_printings_border_release_images` and
  `006_planechase_selections` are applied with `apply_migration`, then checked with `get_advisors`
  ([contracts/supabase.md](contracts/supabase.md)).
- **Tests**: each new util, service and component gets its own `.spec.ts` alongside it.

**Structure Decision**: The single Angular project, following architecture.md's folder rules:
- Views go under `views/`, one folder each.
- The Planechase building blocks go in a new `shared/gameplay/` domain folder, the home of future
  modes too.
- The services and pure utils go in `core/`.
- The generated data goes in a new `core/data/`.
- The maintainer tooling sits beside `sync-scryfall.ts`.

### Implementation order (for /speckit-tasks)

1. **Foundation**:
   - the `DESIGN.md` entries
   - both migrations and an advisors check
   - the `sync-scryfall.ts` columns
   - the maintainer reruns `sync:scryfall`
2. **Data**:
   - `sync-planechase.ts` + the npm script. The maintainer runs it and generates `cards.json`.
   - the `planechase-translate` skill + glossary. The maintainer runs it, and produces and reviews
     `cards.pt-br.json`.

   **Maintainer-only runs**: implementation writes and edits the scripts and the skill, but never
   runs `npm run sync:scryfall`, `npm run sync:planechase` or `/planechase-translate`, not even to
   test them. The maintainer runs and tests every script and skill change. Until the real files
   exist, app code and tests use small hand-written fixture JSON.
   - `PlanechaseCatalogService` + the resolver
3. **Pure core**: `crypto-random`, `planechase-game`, `planar-selection`, all with tests. SC-003
   and SC-004 are covered here.
4. **Services**: `PlanechaseGameService` (+ app initializer), `PlanarSelectionService` (+ the switch
   sequence) and `PlanarImageService`.
5. **US1**:
   - routes, nav and the gameplay menu
   - the Planechase page (no game / game)
   - console, dock, card, image
   - flairs
6. **US2**: "Como jogar".
7. **US3**: the English fallback and the offline image placeholder checks.
8. **US4**: all-used, reset and end confirms, and persistence checks.
9. **US5**:
   - deck settings: tiles, set groups, draft, confirm
   - `SyncService` step + `hasUnsyncedChanges`
10. **Finish**: the quickstart pass, then the `architecture.md`/`commands.md` updates.

## Complexity Tracking

No constitution violations. Nothing to justify.
