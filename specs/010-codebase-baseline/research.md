# Research: Codebase Baseline

Measured on 2026-09-29 against branch `010-codebase-baseline` (ESLint 10.10, typescript-eslint 8.69, angular-eslint 22.5, @angular/build 22.1.8).

## R1 — Known-exceptions record: ESLint bulk suppressions, run via the ESLint CLI

- **Decision**: Record grandfathered violations in `eslint-suppressions.json` at the repo root (ESLint's built-in bulk suppressions), and switch `npm run lint` from `ng lint` to the ESLint CLI (`eslint src`). The `lint` target is removed from `angular.json`, so there is one lint path.
- **Rationale**: The ESLint CLI applies the suppressions file automatically and **fails when a recorded suppression no longer occurs** ("There are suppressions left that do not occur anymore… `--prune-suppressions`"). That is exactly FR-017's "the record only shrinks": a fixed exception must be pruned or lint fails. The `@angular-eslint/builder:lint` builder can *apply* suppressions (`applySuppressions`, `suppressionsLocation`), but it goes through the Node API and never reports unused ones, so a stale record would go unnoticed. The flat config already lints `**/*.html` files, so `eslint src` covers templates as `ng lint` did.
- **Alternatives considered**: Keep `ng lint` with `applySuppressions: true`. Rejected because it has no unused-suppression check. Inline `eslint-disable-next-line` comments were also rejected: they're scattered, easy to copy, and never shrink on their own. The spec's Assumptions already prefer the built-in record.
- **Commands**: create/extend the record with `npx eslint src --suppress-rule <rule>`. After fixing an exception, run `npx eslint src --prune-suppressions`.

## R2 — Current violation counts (probe run with the new rules)

| Rule | Level | Violations today |
|------|-------|------------------|
| `@typescript-eslint/no-floating-promises` | error | 4 in 2 files after the removals (`views/collection-area/collection-area.ts` ×3, `views/deck-area/deck-area.ts`). A 5th, in `add-card-modal.ts`, leaves with the card components |
| `@typescript-eslint/no-misused-promises` | error | 4 in 2 files (`core/services/sync.service.spec.ts` ×3, `shared/auth/profile-modal/profile-flow.store.spec.ts`) |
| `@angular-eslint/prefer-signals` | warn | 0 |
| `@angular-eslint/prefer-output-emitter-ref` | warn | 0 |
| relative `../` into `core/` or `shared/` | error | 17 imports in 14 files, all into `core/data/` (15) or `core/db/` (2). These are fixed, not recorded (FR-015) |
| static import of Planechase data | error | 0 |

- **Consequence for clarification Q5** (grandfathering signal-API warnings): the codebase has **no** decorator-based inputs, outputs or queries (`@Input`/`@Output`/`@ViewChild`… occur 0 times), so there is nothing to grandfather. There's no per-file override, and FR-014's warning clause needs no mechanism. Bulk suppressions only record `error` severity anyway (`suppressions-service.js`: `severity === 2`).
- The record is created after the removals (plan order), so it never lists a removed file.

## R3 — Type-aware linting setup

- **Decision**: Enable type information only in the `**/*.ts` config block with `parserOptions: { projectService: true, tsconfigRootDir: __dirname }`. Add the two promise rules individually, not a `*TypeChecked` preset (clarification Q1).
- **Rationale**: The probe run with `projectService` resolved types for both app and spec files: the root `tsconfig.json` is a solution file that references `tsconfig.app.json`/`tsconfig.spec.json`/`tsconfig.scripts.json`, and TypeScript's project service follows those references. It found real violations in specs, so spec types load. Full `src` lint took ~11 s.
- **Fire-and-forget marking**: `no-floating-promises` accepts the `void` operator by default (`ignoreVoid: true`). The codebase already uses `void this.router.navigateByUrl(…)`, so `void` is the convention (US4-2, recorded in architecture.md).
- **Alternatives considered**: `parserOptions.project: [...]` with an explicit tsconfig list. It works too, but it's slower and has to be kept in sync by hand.

## R4 — Import restrictions (FR-009, FR-012)

- **Decision**: Use `@typescript-eslint/no-restricted-imports` with `patterns` (the `regex` form), in three file-scoped config blocks. Flat config replaces a rule's options per block, so each block repeats the lazy-dependency patterns:
  - **Everywhere** (`src/**/*.ts`): forbid regex `planechase/cards(\.pt-br)?\.json$`. The message points to `PlanechaseCatalogService`'s lazy `import()`. There is no `tesseract.js` pattern: a later card-reading spec adds the OCR guard (FR-009).
  - **Files outside `src/app/core/`**: forbid regex `^(\.\./)+(.*/)?core/` → "use an alias (@models, @services, @utils, @testing, @data, @db)".
  - **Files outside `src/app/shared/`**: forbid regex `^(\.\./)+(.*/)?shared/` → "use @shared/…".
- **Rationale**: `no-restricted-imports` checks static `import`/`export … from` declarations only, never `import()` expressions, so lazy loading stays allowed with no extra rule. Relative imports inside `core/` (for example `../utils/identity.util` from `core/services`) and inside `shared/` (for example `../entry-flow.store`) are left alone (spec edge case "Relative imports inside a single area").
- **Why lint, not the budget** (clarification Q2): with ~640 kB of headroom under the 1.5 MB error limit, the ~170 kB of Planechase data would slip into the initial bundle unnoticed. (`tesseract.js` leaves with the card components. Today's production build has no tesseract chunk anyway, because the card-scan path is unreachable and gets tree-shaken.)

## R5 — New path aliases for the relative-import fixes

- **Decision**: Add `@data/*` → `src/app/core/data/*` and `@db/*` → `src/app/core/db/*` to `tsconfig.json`, then rewrite the 17 violating imports.
- **Rationale**: This follows the existing per-folder alias scheme (`@models/*`, `@services/*`…). Every violation targets one of those two folders. `core/guards` and `core/supabase-client.ts` are imported only via `./core/...` from `src/app/` root files (no `../`), so they need no alias yet. A later violation there fails lint, and the alias gets added then.
- **Alternatives considered**: One catch-all `@core/*` alias. Rejected because it would make two spellings for the same file (`@core/services/x` vs `@services/x`).

## R6 — Bundle budgets (FR-008, FR-010)

- **Today's production build**: initial total 861.7 kB raw (`main` 852.5 kB, `styles` 8.8 kB, one 449 B shared chunk). Lazy chunks: `cards-json` 105.5 kB and `cards-pt-br-json` 66.4 kB. There is no budget configured at all (`angular.json` production config has none).
- **Decision** (`angular.json` → `build.configurations.production.budgets`):
  - `initial`: warning `1.25mb`, error `1.5mb` (clarification Q2).
  - `anyComponentStyle`: warning ≈2×, error ≈4× the largest compiled component stylesheet. Measure it at implementation time by first setting a deliberately tiny `anyComponentStyle` warning (e.g. `1kb`), so the build prints each component's size. Measure **after** the removals: the largest SCSS sources today are card components (`add-card-modal.scss` ~14 KB, `card-search-panel.scss` ~9 KB), and they go away.
  - **Per lazy chunk**: one `bundle` budget per current lazy chunk, by name (`cards-json`, `cards-pt-br-json`), each at warning ≈2× / error ≈4× today's largest lazy chunk (≈210 kB / ≈420 kB).
- **Why named `bundle` budgets, not `anyScript`**: Angular's `anyScript` calculator checks **every** `.js` output, `main` included (`bundle-calculator.js`, `AnyScriptCalculator`). Any threshold under ~850 kB would fail on `main` today, so `anyScript` can't express a lazy-chunk limit. `bundle` budgets match chunks by name (`chunk.names`), and the esbuild builder already names lazy chunks after their import (see the build output's "Names" column), with no `namedChunks` change needed.
- **Consequence**: a lazy chunk added by a later spec gets a limit only when that spec adds its named budget (documented in architecture.md as a convention). FR-010 is reworded to match.
- **Alternatives considered**: A custom post-build size script. Rejected: it's extra tooling, and the user chose no kept tooling in clarification Q4's spirit. `anyScript` at the initial limits was also rejected: it duplicates `initial` and says nothing about lazy chunks.

## R7 — Unused-code inventory (one-time scan, FR-002/FR-003a)

Scan: `npx knip` (not installed, nothing kept), plus a per-folder reference sweep and SCSS `@use` checks. Every candidate is re-confirmed by search at implementation time (FR-003).

**Remove:**

| Item | Evidence |
|------|----------|
| `src/app/shared/index.ts` (barrel) + the bare `@shared` alias in `tsconfig.json` | No `from '@shared'` import anywhere. The barrel is the only reference keeping several orphans alive |
| `shared/effects/leyline-field/` (ts, html, scss, spec if any) | Referenced only by the barrel |
| `shared/layout/dashboard-panel/` (+ spec) | Referenced only by its own spec and the barrel |
| `shared/common/entity-list/` (+ spec) | Referenced only by its own spec and the barrel |
| `@angular/forms` dependency | Imported nowhere in `src/` |
| `core/services/card-import.service.ts`, `core/utils/card-import.util.ts` (no specs exist), `papaparse`, `@types/papaparse` | Referenced by nothing; papaparse only by `card-import.service.ts` |
| **All card components**: `shared/cards/` entirely (`add-card-modal`, `card-add-detail-panel`, `card-list`, `card-scan-capture`, `card-search-panel`, with their specs) | FR-004 (clarification 2026-09-30). Reachable from no route: only the barrel references them |
| Card reading: `core/utils/card-ocr.util.ts` (+ spec), `core/services/card-ocr.service.ts`, the `tesseract.js` dependency | Used only by card components |
| Card catalog lookup: `core/services/card-lookup.service.ts` (+ spec), the `SUPABASE_CLIENT` token in `core/supabase-client.ts` (`SUPABASE_URL`/`SUPABASE_ANON_KEY` stay, since `cloud-session.service.ts` uses them), `mockCardLookupResult` in `core/testing/card.mocks.ts` | Used only by card components, CSV import and that mock. The catalog tables and `npm run sync:scryfall` stay, because `sync:planechase` reads them |
| `core/utils/card-color.util.ts`, `core/services/card-filter.service.ts` (+ spec) | Used only by card components (card-filter by nothing at all) |
| `core/services/theme.service.ts` (+ spec) | Its only consumers are `add-card-modal` and `card-color.util` |
| `shared/effects/spark-reroll/` | Used only by `add-card-modal` and `leyline-field` |
| `shared/common/select/`, `shared/common/filter-select/` (+ spec), `core/utils/dropdown-placement.util.ts`, `core/utils/dropdown-dismiss.util.ts` | `select` is used only by card components; `filter-select` by nothing; the two utils only by these two components |
| `src/styles/_modal.scss`, `src/styles/_dropdown.scss` | `@use`d only by card components, `select` and `filter-select` |
| Exports used only inside their own file (drop the `export` keyword): `cloudStorageKey`, `isFailure`, `placeDepth`, `normalizeDeckName`, `NAME_PATTERN`, `costText`, `RESULT`, `SYNCED_WINDOW_MS`, `BOTTOM_BAR_VAR`, `HOLD_MS`, `HOLD_TOLERANCE_PX`, `HOVER_OPEN_MS`, `HOVER_CLOSE_MS`, and the exported types `PlanarTranslation`, `DeviceMetaRecord`, `MetaRecord`, `ProfileDbSchema`, `EntryContext`, `EntryStart`, `IdentityWrite`, `SyncAction` | knip "unused exports". Each must be re-checked: if the symbol is used only in its own file, un-export it; if unused even there, delete it |

**Order**: R10's reference note first. Then remove these, and repeat the reference sweep (knip + grep) until it finds nothing new: removing a layer can orphan the next one, for example card-only exports of `card.model.ts` or now-unused `@testing` helpers. Everything a kept file still references stays (spec edge case), e.g. `CardService`, `card.model.ts`, `mockCardEntry`.

**Keep (false positive or documented):**

| Item | Reason |
|------|--------|
| `resetDeviceDbForTests`, `unbindProfileDbForTests`, `resetAllGrimorioDbsForTests`, `profileDbName`, `src/test-setup.ts`, `fake-indexeddb` | Used by `src/test-setup.ts` (wired via `angular.json` `setupFiles`, which knip doesn't read) |
| `prettier` | Used through `.prettierrc` by the editor, not imported |
| `public/assets/mana/` | architecture.md documents it as kept for future mana-cost rendering |

After the removals, the remaining `src/styles/` partials (`_base`, `_breakpoints`, `_controls`, `_fio`, `_page-sweep`, `_tokens`) each have at least one `@use` outside the removed code. Confirm this during the sweep.

## R8 — Effective colors (FR-005–FR-007)

- **Decision**: `IdentityService` replaces `activeColors: Color[] | null` with `colors = computed<readonly Color[]>(() => session.active()?.colors ?? DEFAULT_IDENTITY)`. `roles` becomes `rolesFor(this.colors())`. `page-sweep.ts` reads `identity.colors()`. `activeColors` is removed (its only readers are these and ThemeService; nothing needs the `null` "no profile" distinction).
- **ThemeService**, the third copy of the fallback, is deleted with the card components (R7). Do the removal before this change, so ThemeService is never edited.
- **Not touched**: `entry-flow.store.ts` (draft identity, FR-007) and `cloud-auth.service.ts:241` (the colors of a *pending* cloud identity during sign-up, not the active profile's colors).
- **SC-005 count**: after the change, `?? DEFAULT_IDENTITY` for active-profile colors appears once (`identity.service.ts`). Before, it appeared 3 times.

## R9 — Unit spec design (FR-018)

- The dropdown placement/dismissal utilities originally on this list are removed instead (R7), so they get no specs (FR-019).
- **db/entity-store**: use real `fake-indexeddb`, which is already reset per test by `test-setup.ts`. All-or-nothing: a `writeRows` whose later op is a put missing its keyPath rejects, and none of the earlier puts/deletes (across `collections`, `cards`, `tombstones`) persist. Also: empty ops open nothing; no bound profile → writes reject and reads return empty; `setActiveProfileDb` rebinds.
- **profile-session.service**: TestBed with stub entity services (spies recording `flush`/`load` order and argument) and a real `ProfileStore`/device DB. Covers `whenReady` loading every service with the saved active id, or `null` when none is saved or the saved id is unknown; `activate`/`signOut` flush-then-load with the new id; readiness resolving only after every `load` settles (a deferred `load`); `active()` being `null` while the switch is loading; hooks' `beforeSwitch`/`afterActivate`.
- **identity.service**: stub `ProfileSessionService.active` with a writable signal. Covers `colors()` = profile colors / `DEFAULT_IDENTITY`; `roles()` matching `rolesFor` of each; switching back to no profile falls back.
- Each spec file's "break one behavior on purpose" check (SC-006) is listed in quickstart.md.

## R10 — Card reading, catalog lookup and CSV import reference note (FR-002a)

- **Decision**: Before the first removal, write `backlog/reference/card-features.md`. It records parameters and rules, not code, read from `card-ocr.util.ts`, `card-ocr.service.ts`, `card-scan-capture.ts` (OCR), `card-lookup.service.ts` (catalog), and `card-import.util.ts`, `card-import.service.ts` (CSV), plus the specs that pin the behavior that works (`card-ocr.util.spec.ts`, `card-scan-capture.spec.ts`, `card-lookup.service.spec.ts`).
  - **Card reading**: tesseract.js version and how it's loaded (dynamic `import()`, the ESM/CJS default-export workaround, CDN-hosted worker/wasm/language data), language, page-segmentation mode, character whitelist and any other worker parameters; image preprocessing (crop region, scaling, grayscale/inversion, thresholds); the parsing rules that turn recognized text into set code + collector number (regexes, normalization, fallbacks); camera-capture settings in `card-scan-capture`.
  - **Catalog lookup**: the Supabase queries (`printings` joined to `cards`, selected columns, filters), set-code and collector-number normalization, the multi-row batching (one query per distinct key), the result shape mapped to a `CardEntry`, and the anonymous catalog-client options (`persistSession: false`, `storageKey: 'grm-catalog'`…).
  - **CSV import**: accepted source formats and their column names, papaparse options, row-to-`CardEntry` mapping (finish, language, condition, quantity defaults), how rows are matched to the catalog (by Scryfall id vs. set code + collector number) and batched into one query per distinct key, and how unmatched or invalid rows are reported.
- **Rationale**: All three work today and are deleted in this spec. The note is what lets the fresh card features rebuild them without rediscovering tuned values.
- **Where**: `backlog/` already holds future-facing material (`features.md`, `pending-items.md`). The note isn't a fact about present code, so it doesn't go in CLAUDE.md or `.claude/docs/`.
