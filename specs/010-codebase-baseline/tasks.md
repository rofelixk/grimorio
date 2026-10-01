---

description: "Task list for 010 Codebase Baseline"
---

# Tasks: Codebase Baseline

**Input**: Design documents from `specs/010-codebase-baseline/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/guardrails.md, quickstart.md

**Tests**: Only User Story 3 asks for new unit specs (FR-018). Every other story is verified by the build, lint and the quickstart checks.

**Organization**: Tasks are grouped by user story. The removals (part of US2's outcome) are in the **Foundational** phase, because the plan's order requires them before lint and budgets: new rules must not flag code about to be deleted, and the budgets are measured on the post-removal build. US2's phase keeps the effective-colors work.

**Agents** (CLAUDE.md): every `npm test` / `npm run lint` / single-spec run goes through the **`test-runner`** agent. The dev server is the user's; never start or stop it. Edit existing files only with the Edit tool (mixed CRLF/LF repo).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

- [X] T000 Before any other task, check out `feature/010-codebase-baseline` from `main` and make its first commit: every uncommitted file under `specs/010-codebase-baseline/` (today `tasks.md` and the edited `spec.md`; there is no design handoff folder for this spec), and nothing else.

---

## Phase 1: Setup (Baseline measurements and reference note)

**Purpose**: Record what exists before anything is removed (SC-007, FR-002a).

- [X] T001 Record the baseline in `specs/010-codebase-baseline/baseline.md`: file count and total line count of `*.ts`/`*.html`/`*.scss` under `src/` (`find src -name '*.ts' -o -name '*.html' -o -name '*.scss' | wc -l` and `… | xargs wc -l | tail -1`), and the `npm run build` output table (initial total, `main`, `styles`, and every lazy chunk with its name and raw size).
- [X] T002 Write `backlog/reference/card-features.md` (new folder `backlog/reference/`) per research R10, reading `src/app/core/utils/card-ocr.util.ts` (+ spec), `src/app/core/services/card-ocr.service.ts`, `src/app/shared/cards/card-scan-capture/` (ts + spec), `src/app/core/services/card-lookup.service.ts` (+ spec), `src/app/core/supabase-client.ts`, `src/app/core/utils/card-import.util.ts` and `src/app/core/services/card-import.service.ts`. Record parameters and rules, not code, in three sections: **Card reading** (tesseract.js version from `package.json`, dynamic `import()` and the ESM/CJS default-export workaround, CDN-hosted worker/wasm/language data, language, page-segmentation mode, character whitelist and every other worker parameter; image preprocessing: crop region, scaling, grayscale/inversion, thresholds; the regexes, normalization and fallbacks that turn recognized text into set code + collector number; camera-capture settings), **Catalog lookup** (Supabase queries on `printings` joined to `cards`, selected columns, filters; set-code and collector-number normalization; one-query-per-distinct-key batching of `lookupManyByScryfallIds`/`lookupManyBySetCode`; result-to-`CardEntry` mapping; the anonymous catalog client options such as `persistSession: false`, `storageKey: 'grm-catalog'`), **CSV import** (accepted source formats and their column names, papaparse options, row-to-`CardEntry` mapping with finish/language/condition/quantity defaults, matching by Scryfall id vs. set code + collector number, batching, how unmatched or invalid rows are reported). Every item listed in R10 must be covered.
- [X] T003 Checkpoint: confirm `backlog/reference/card-features.md` covers every R10 item, then commit Phase 1 ("Codebase baseline: measurements and card features reference").

---

## Phase 2: Foundational (Remove unused code, FR-002–FR-004, research R7)

**Purpose**: Shrink the codebase before any guardrail lands. Blocks every user story: lint (US1) must not flag deleted code, budgets (US1) are measured after the removals, effective colors (US2) must not edit ThemeService, and docs (US4) describe the result.

**⚠️ CRITICAL**: T002 must be committed before any task here. Before each removal, re-confirm by search (`grep -rn` over `src/`, `scripts/`, `angular.json`, `tsconfig*.json`, `package.json`, including templates, `@use`s and lazy `import()`s) that nothing outside the items being removed references it (FR-003). Anything a kept file still references stays (e.g. `CardService`, `card.model.ts`, `mockCardEntry`).

- [X] T004 Delete the barrel `src/app/shared/index.ts` and remove the bare `@shared` entry from `paths` in `tsconfig.json` (keep `@shared/*`). Confirm first that no file imports `from '@shared'`.
- [X] T005 [P] Delete `src/app/shared/cards/` entirely (`add-card-modal`, `card-add-detail-panel`, `card-list`, `card-scan-capture`, `card-search-panel`, with their specs).
- [X] T006 [P] Delete card reading: `src/app/core/utils/card-ocr.util.ts` (+ `card-ocr.util.spec.ts`) and `src/app/core/services/card-ocr.service.ts` (+ spec if any).
- [X] T007 [P] Delete catalog lookup: `src/app/core/services/card-lookup.service.ts` (+ spec); remove the `SUPABASE_CLIENT` token from `src/app/core/supabase-client.ts` (keep `SUPABASE_URL`/`SUPABASE_ANON_KEY`, used by `cloud-session.service.ts`); remove `mockCardLookupResult` from `src/app/core/testing/card.mocks.ts` (keep `mockCardEntry` and anything else still referenced).
- [X] T008 [P] Delete `src/app/core/utils/card-color.util.ts` (+ spec if any) and `src/app/core/services/card-filter.service.ts` (+ spec).
- [X] T009 [P] Delete `src/app/core/services/theme.service.ts` (+ spec). Do not edit it first: it goes as-is.
- [X] T010 [P] Delete `src/app/shared/effects/spark-reroll/` and `src/app/shared/effects/leyline-field/` (keep `shared/effects/page-sweep/`).
- [X] T011 [P] Delete `src/app/shared/common/select/`, `src/app/shared/common/filter-select/` (+ spec), `src/app/core/utils/dropdown-placement.util.ts` and `src/app/core/utils/dropdown-dismiss.util.ts` (+ specs if any). No new specs for these (FR-019).
- [X] T012 [P] Delete `src/styles/_modal.scss` and `src/styles/_dropdown.scss`; confirm no remaining `@use 'modal'`/`@use 'dropdown'` anywhere.
- [X] T013 [P] Delete `src/app/shared/layout/dashboard-panel/` (+ spec) and `src/app/shared/common/entity-list/` (+ spec). Remove the `src/app/shared/common/` folder if it is now empty.
- [X] T014 [P] Delete `src/app/core/services/card-import.service.ts` and `src/app/core/utils/card-import.util.ts`.
- [X] T015 Uninstall the four dependencies in one step: `npm uninstall @angular/forms tesseract.js papaparse @types/papaparse` (updates `package.json` and `package-lock.json`). Confirm first that none is imported anywhere in `src/` or `scripts/`.
- [X] T016 Un-export or delete the exports used only inside their own file (research R7). For each, grep for references outside its file; if used only in its own file, drop the `export` keyword; if unused even there, delete it: `cloudStorageKey` (`src/app/core/services/cloud-session.service.ts`), `isFailure` (`src/app/core/utils/cloud-error.util.ts`), `placeDepth` (`src/app/core/utils/collection-transition.util.ts`), `normalizeDeckName` (`src/app/core/utils/deck.util.ts`), `NAME_PATTERN` and `EntryContext` (`src/app/core/utils/entry-flow.util.ts`), `costText` and `RESULT` (`src/app/core/utils/planechase-copy.ts`), `SYNCED_WINDOW_MS` and `SyncAction` (`src/app/core/utils/sync-status.util.ts`), `BOTTOM_BAR_VAR` (`src/app/shared/gameplay/planar-dock/planar-dock.ts`), `HOLD_MS` and `HOLD_TOLERANCE_PX` (`src/app/shared/gameplay/planar-tile/planar-tile.ts`), `HOVER_OPEN_MS` and `HOVER_CLOSE_MS` (`src/app/views/planechase-deck/planar-preview.controller.ts`), `PlanarTranslation` (`src/app/core/data/planechase/planar-card.model.ts`), `DeviceMetaRecord` (`src/app/core/db/device-db.ts`), `MetaRecord` and `ProfileDbSchema` (`src/app/core/db/profile-db.ts`), `EntryStart` (`src/app/core/services/entry-modal.service.ts`), `IdentityWrite` (`src/app/core/utils/identity-sync.util.ts`). Keep the test-setup helpers (`resetDeviceDbForTests`, `unbindProfileDbForTests`, `resetAllGrimorioDbsForTests`, `profileDbName`), `prettier`, `fake-indexeddb` and `public/assets/mana/` (R7 "Keep").
- [X] T017 Repeat the reference sweep until it finds nothing new: run `npx knip` once more (via `npx`, never installed or configured, FR-003a) plus grep, and remove whatever the previous removals orphaned (e.g. card-only exports in `src/app/core/models/card.model.ts`, unused `@testing` helpers in `src/app/core/testing/`, an unused `--role-*`/style partial). Confirm each remaining `src/styles/` partial (`_base`, `_breakpoints`, `_controls`, `_fio`, `_page-sweep`, `_tokens`) still has a `@use` outside removed code. Ensure no knip config or other file is left behind.
- [X] T018 Checkpoint: `npm run build` succeeds; run the full suite and `npm run lint` (still the old `ng lint`) through `test-runner`; fix everything; confirm with `grep -rn "tesseract\|papaparse\|ThemeService\|CardLookupService\|SUPABASE_CLIENT" src package.json` that nothing remains. Then commit Phase 2 ("Codebase baseline: remove unused code").

**Checkpoint**: Codebase is at its post-removal size. Guardrails can now land.

---

## Phase 3: User Story 1 - Refactor against guardrails (Priority: P1) 🎯 MVP

**Goal**: Lint and the production build stop the three regressions (static Planechase data import, unhandled promise, relative import into core/shared) and size growth, while the unchanged tree passes.

**Independent Test**: quickstart.md steps 2 and 3: each deliberate regression fails lint/build and passes again once reverted; the unchanged tree lints with 0 errors and 0 warnings and builds with no budget warning.

### Import aliases (FR-015, research R5)

- [X] T019 [US1] Add `"@data/*": ["src/app/core/data/*"]` and `"@db/*": ["src/app/core/db/*"]` to `paths` in `tsconfig.json`, next to the existing per-folder aliases.
- [X] T020 [US1] Rewrite the 17 relative imports into `core/` to the new aliases (`../…/core/data/…` → `@data/…`, `../…/core/db/…` → `@db/…`), keeping `import type` where present, in: `src/app/shared/gameplay/planar-card/planar-card.ts`, `src/app/shared/gameplay/planar-card/planar-card.spec.ts`, `src/app/shared/gameplay/planar-preview/planar-preview.ts`, `src/app/shared/gameplay/planar-preview/planar-preview.spec.ts`, `src/app/shared/gameplay/planar-preview-dialog/planar-preview-dialog.ts`, `src/app/shared/gameplay/planar-tile/planar-tile.ts`, `src/app/shared/gameplay/tunnel-choice/tunnel-choice.ts`, `src/app/views/collection-area/collection-area.spec.ts`, `src/app/views/planechase/planechase.ts`, `src/app/views/planechase/planechase.spec.ts` (3 imports), `src/app/views/planechase-deck/planar-preview.controller.ts`, `src/app/views/planechase-deck/planar-preview.controller.spec.ts`, `src/app/views/planechase-deck/planechase-deck.ts`, `src/app/views/planechase-deck/planechase-deck.spec.ts` (2 imports). Afterwards `grep -rnE "from '(\.\./)+([a-z-]+/)*(core|shared)/" src --include=*.ts` must show hits only inside the same area (SC-004).

### Lint rules (FR-009, FR-011–FR-017, research R1–R4)

- [X] T021 [US1] In `eslint.config.js`'s `**/*.ts` block, add `languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: __dirname } }` and the rules `'@typescript-eslint/no-floating-promises': 'error'` (default options, so `void` marks a deliberate fire-and-forget) and `'@typescript-eslint/no-misused-promises': 'error'`. Do not add any `*TypeChecked` preset and do not change any other rule's level (FR-011a).
- [X] T022 [US1] In the same block, add `'@angular-eslint/prefer-signals': 'warn'` and `'@angular-eslint/prefer-output-emitter-ref': 'warn'` (FR-013; nothing to grandfather, research R2).
- [X] T023 [US1] Add `@typescript-eslint/no-restricted-imports` (`patterns` with the `regex` form) to `eslint.config.js` in three file-scoped blocks after the `**/*.ts` block. Flat config replaces a rule's options per block, so each file must match exactly one block and each block repeats the patterns it needs: (a) `src/app/core/**/*.ts`: only the Planechase pattern; (b) `src/app/shared/**/*.ts`: Planechase + core patterns; (c) `src/**/*.ts` with `ignores` for `src/app/core/**` and `src/app/shared/**`: Planechase + core + shared patterns. Patterns: regex `planechase/cards(\.pt-br)?\.json$`, message pointing to `PlanechaseCatalogService`'s lazy `import()`; regex `^(\.\./)+(.*/)?core/`, message "use an alias (@models, @services, @utils, @testing, @data, @db)"; regex `^(\.\./)+(.*/)?shared/`, message "use @shared/…". No `tesseract.js` pattern (FR-009).
- [X] T024 [US1] Switch lint to the ESLint CLI: in `package.json` set `"lint": "eslint src"`; in `angular.json` remove the `lint` target (`@angular-eslint/builder:lint`) from `projects.grimorio.architect` (keep `schematicCollections`). Confirm `eslint src` still lints `*.html` templates.
- [X] T025 [US1] Create the known-exceptions record at the repo root: `npx eslint src --suppress-rule @typescript-eslint/no-floating-promises --suppress-rule @typescript-eslint/no-misused-promises`. Check `eslint-suppressions.json` matches data-model.md: `no-floating-promises` for `src/app/views/collection-area/collection-area.ts` (3) and `src/app/views/deck-area/deck-area.ts` (1); `no-misused-promises` for `src/app/core/services/sync.service.spec.ts` (3) and `src/app/shared/auth/profile-modal/profile-flow.store.spec.ts` (1). Investigate any difference before accepting it; the relative-import rule must have no entry (FR-015). Do not fix the recorded violations (FR-016).

### Budgets (FR-008, FR-010, research R6)

- [X] T026 [US1] Measure component stylesheets: temporarily add `{ "type": "anyComponentStyle", "maximumWarning": "1kb" }` to `projects.grimorio.architect.build.configurations.production.budgets` in `angular.json`, run `npm run build`, note the largest compiled component stylesheet and the post-removal lazy chunk sizes (`cards-json`, `cards-pt-br-json`) in `specs/010-codebase-baseline/baseline.md`, then remove the temporary budget.
- [X] T027 [US1] Set the production `budgets` in `angular.json`: `{ "type": "initial", "maximumWarning": "1.25mb", "maximumError": "1.5mb" }`; `anyComponentStyle` with warning ≈2× and error ≈4× the largest stylesheet from T026 (rounded to whole kB); `{ "type": "bundle", "name": "cards-json", … }` and `{ "type": "bundle", "name": "cards-pt-br-json", … }`, each at warning ≈2× / error ≈4× today's largest lazy chunk (≈210 kB / ≈420 kB). `npm run build` must show no budget warning.

### Verify

- [X] T028 [US1] Verify every row of `contracts/guardrails.md` (quickstart steps 2 and 3), reverting each temporary change: static `@data/planechase/cards.json` import in `src/app/app.ts` fails lint, `await import(…)` passes; bare `this.router.navigateByUrl('/')` fails, `void`-prefixed passes; a `'../../core/services/identity.service'` import in `src/app/views/home/home.ts` fails; an extra floating promise in `src/app/views/deck-area/deck-area.ts` fails; fixing a recorded exception without `--prune-suppressions` fails; lowering the `initial` error to `800kb` and the `cards-json` error to `50kb` each fails the build (the second naming the chunk); a temporary `@Input() probe = '';` (with its import) in `src/app/views/home/home.ts` shows a `prefer-signals` warning while lint still exits 0. Lint runs go through `test-runner`.
- [X] T029 [US1] Checkpoint: `npm run build` (no budget warning), full suite and `npm run lint` (exit 0, 0 errors, 0 warnings) through `test-runner`; fix everything, then commit Phase 3 ("Codebase baseline: lint guardrails and bundle budgets").

**Checkpoint**: Guardrails in place; later phases are checked by them.

---

## Phase 4: User Story 2 - Work in a smaller codebase: effective colors (Priority: P2)

**Goal**: One source for "the active profile's colors, or the default identity" (FR-005–FR-007). The removal half of this story is done in Phase 2.

**Independent Test**: `grep -rn "?? DEFAULT_IDENTITY\|?? \[...DEFAULT_IDENTITY\]" src/app --include=*.ts` finds only `identity.service.ts`, `entry-flow.store.ts` and `cloud-auth.service.ts`; the app's colors are unchanged with and without an active profile.

- [X] T030 [US2] In `src/app/core/services/identity.service.ts`, replace `activeColors: Color[] | null` with `readonly colors = computed<readonly Color[]>(() => this.session.active()?.colors ?? DEFAULT_IDENTITY)` (data-model.md "Effective colors") and make `roles` compute `rolesFor(this.colors())`. Remove `activeColors`; grep for any remaining reader first.
- [X] T031 [US2] In `src/app/shared/effects/page-sweep/page-sweep.ts`, read the dust colors from `identity.colors()` instead of repeating the fallback. Do not touch `src/app/shared/auth/entry-modal/entry-flow.store.ts` (draft identity, FR-007) or `src/app/core/services/cloud-auth.service.ts` (pending sign-up identity).
- [X] T032 [US2] Checkpoint: run the SC-005 grep above; full suite and lint through `test-runner`; run **`design-auditor`** (a component `.ts` changed) and fix what it reports; then commit Phase 4 ("Codebase baseline: single effective-colors source").

**Checkpoint**: US2 complete: smaller codebase, one colors source.

---

## Phase 5: User Story 3 - Trust the logic that breaks silently (Priority: P2)

**Goal**: Specs for the multi-store write, the profile session and the identity service (FR-018, research R9).

**Independent Test**: The three new spec files pass, and each fails under its deliberate break (quickstart step 4).

**Depends on**: Phase 4 (the identity spec covers `colors()`).

- [X] T033 [P] [US3] Create `src/app/core/db/entity-store.spec.ts` with real `fake-indexeddb` (reset per test by `src/test-setup.ts`): a `writeRows` whose later op is a put missing its keyPath rejects and none of the earlier puts/deletes across `collections`, `decks`, `cards` and `tombstones` persist; empty ops open nothing; with no bound profile, writes reject and reads return empty; `setActiveProfileDb` rebinds to another profile's database.
- [X] T034 [P] [US3] Create `src/app/core/services/profile-session.service.spec.ts` with TestBed, stub entity services (spies recording `flush`/`load` order and argument) and a real `ProfileStore`/device DB: `whenReady` loads every service with the saved active id, or `null` when none is saved or the saved id is unknown; `activate`/`signOut` flush then load with the new id; readiness resolves only after every `load` settles (use a deferred `load`); `active()` is `null` while a switch is loading; the `beforeSwitch`/`afterActivate` hooks run.
- [X] T035 [P] [US3] Create `src/app/core/services/identity.service.spec.ts` stubbing `ProfileSessionService.active` with a writable signal: `colors()` equals the profile's colors with a profile and `DEFAULT_IDENTITY` without; `roles()` equals `rolesFor` of each; switching back to no profile falls back to the default.
- [X] T036 [US3] Run each deliberate break from quickstart step 4 against its spec file through `test-runner`, confirm at least one failure each, and revert: remove `tx.abort()` from `writeRows`' catch in `src/app/core/db/entity-store.ts`; swap the `flush` and `load` `Promise.all` lines in `loadEntities` in `src/app/core/services/profile-session.service.ts`; change the fallback to `['W']` in `src/app/core/services/identity.service.ts`.
- [X] T037 [US3] Checkpoint: full suite and lint through `test-runner` (new specs must add no lint error or suppression); fix everything, then commit Phase 5 ("Codebase baseline: entity-store, profile-session and identity specs").

---

## Phase 6: User Story 4 - Read accurate project docs (Priority: P3)

**Goal**: The architecture guide and command reference describe the code that exists, plus the lasting conventions this spec added (FR-020, FR-021).

**Independent Test**: Every path and component name in architecture.md's page-shell/navigation bullets exists (quickstart step 7); nothing removed is described.

- [X] T038 [US4] Draft the edits to `.claude/docs/architecture.md` from the current `src/app/app.html` and `src/app/shared/layout/`: rewrite the **Page shell** and **Nav bar** bullets to describe the real layout components (`top-bar`, `nav-drawer`, `side-nav`, `nav-links`, and whatever `app.html` actually renders), dropping `nav-bar/`, `--nav-bar-height`, `.app-layout`/`.app-shell` if gone; update **Path aliases** (add `@data/*`, `@db/*`; drop the bare `@shared` barrel and the barrel-avoidance note); update the `shared/` subfolder list (no `cards/`; drop `common/` if removed); remove the **OCR** bullet, ThemeService, the `_modal`/`_dropdown` partials, CSV import, `CardLookupService`/`SUPABASE_CLIENT` and the card-component examples (`card-add-detail-panel` in the `linkedSignal` bullet → a kept example, `CardOcrService` in the utils bullet, `card-search-panel` in legacy idioms) while keeping the catalog tables / `sync:scryfall` facts that `sync:planechase` needs; add the lasting conventions: `void` marks a deliberate fire-and-forget promise, `eslint-suppressions.json` records grandfathered errors and only shrinks, relative imports into `core/`/`shared/` are a lint error, Planechase data may only be `import()`ed, production budgets live in `angular.json` and a new lazy chunk gets its own named `bundle` budget. Update the **Project** sentence in `CLAUDE.md` that says cards can be added by scanning (OCR). Show the proposed edits to the user for review before applying (CLAUDE.md "Maintaining these files").
- [X] T039 [US4] Draft the edits to `.claude/docs/commands.md`: `npm run lint` is now the ESLint CLI (`eslint src`); a single-file lint (`npx eslint <path>`); `npx eslint src --prune-suppressions` after fixing a recorded exception; `npx eslint src --suppress-rule <rule>` only when a new rule lands. Show them to the user with T038's edits, then apply both after review.
- [X] T040 [US4] Checkpoint: `ls` every path named in the rewritten page-shell/nav bullets (SC-009); confirm `grep -n "nav-bar\|ThemeService\|tesseract\|OCR\|papaparse\|_dropdown\|_modal.scss\|CardLookupService" .claude/docs/*.md CLAUDE.md` returns nothing stale; then commit Phase 6 ("Codebase baseline: docs").

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Whole-spec validation against the success criteria.

- [X] T041 Run quickstart.md steps 1 and 5: build with no budget warning; lint exit 0 with 0 warnings and full suite through `test-runner`; SC-004 and SC-005 greps; file and line counts under `src/` compared with `specs/010-codebase-baseline/baseline.md` (both lower, SC-007); zero references to every R7 removed item.
- [X] T042 Run quickstart.md step 6 (SC-008) with the user's running dev server via the `run` skill: Home, collection area, deck area, Planechase game and deck, entry modal, profile modal and the page-change dust, once with a non-default-colored profile and once with no profile (R/U/G). Report any visible difference.
- [X] T043 Run **`design-auditor`** over the whole feature diff and fix what it reports.
- [X] T044 Checkpoint: if T041–T043 changed anything, rerun the full suite and lint through `test-runner`, then commit the polish phase ("Codebase baseline: validation fixes"); if nothing changed, there is nothing to commit.

---

## Dependencies & Execution Order

### Phase Dependencies

- **T000** → **Setup (Phase 1)**: T002 (reference note) must be committed before any removal (FR-002a).
- **Foundational (Phase 2)**: depends on Phase 1. Blocks every story.
- **US1 (Phase 3)**: depends on Phase 2 (lint and budgets on post-removal code). T019 → T020 → T023 (aliases first, so the import rule lands with zero violations); T021–T024 → T025 (record after all rules exist); T026 → T027.
- **US2 (Phase 4)**: depends on Phase 2 (ThemeService gone). Runs after US1 so the new lint rules check it.
- **US3 (Phase 5)**: depends on Phase 4 (identity spec covers `colors()`).
- **US4 (Phase 6)**: depends on Phases 2–5 (docs describe the final state).
- **Polish (Phase 7)**: depends on everything.

### Within Phases

- Phase 2: T004 first (the barrel references most removed components); T005–T014 in any order; T015 after T005–T014; T016 after T015; T017 last.
- Phase 5: T033–T035 in parallel; T036 after all three.

### Parallel Opportunities

- Phase 2: T005–T014 touch disjoint files (after T004).
- Phase 5: T033, T034, T035 are separate new files.
- Phases are sequential by design: one commit per phase.

---

## Parallel Example: User Story 3

```bash
Task: "Create src/app/core/db/entity-store.spec.ts (all-or-nothing writeRows, no bound profile, rebind)"
Task: "Create src/app/core/services/profile-session.service.spec.ts (load order, readiness, switch, hooks)"
Task: "Create src/app/core/services/identity.service.spec.ts (colors/roles with and without a profile)"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. T000, Phase 1 (measurements + reference note), Phase 2 (removals).
2. Phase 3: guardrails. **Stop and validate** with quickstart steps 2 and 3: later refactor specs can already rely on them.

### Incremental Delivery

1. Setup + Foundational → smaller codebase, reference note kept.
2. US1 → guardrails (MVP).
3. US2 → single colors source.
4. US3 → specs for the data layer and session.
5. US4 → accurate docs.
6. Polish → full quickstart and visual pass.

---

## Notes

- Work on `feature/010-codebase-baseline` from T000; commit once per phase, in its checkpoint task, only after its checks pass.
- No compatibility shims for removed code (early-development policy).
- No dead-code tool, script or config stays in the project (FR-003a).
