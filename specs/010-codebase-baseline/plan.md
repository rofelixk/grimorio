# Implementation Plan: Codebase Baseline

**Branch**: `010-codebase-baseline` | **Date**: 2026-09-29 (revised 2026-09-30) | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-codebase-baseline/spec.md`

## Summary

Shrink and guard the codebase before the refactor specs, with no user-visible change.

- **Reference note first**: the working configuration of card reading (OCR), card catalog lookup and CSV import is written to `backlog/reference/card-features.md` (FR-002a, research R10).
- **Removals**: all card components go, plus everything only they used: OCR and `tesseract.js`, catalog lookup, card color/filter logic, ThemeService, the legacy select dropdowns with their utilities, the `_modal`/`_dropdown` partials, CSV import and `papaparse`. Other orphans and `@angular/forms` go too (R7).
- **Effective colors**: `IdentityService` gains one `colors` signal that replaces the fallback copies (R8).
- **Budgets**: the production build gets a generous initial limit plus named per-lazy-chunk and per-component-style limits (R6).
- **Lint**: type-aware promise rules, import restrictions (relative imports into `core`/`shared`, static imports of the Planechase data) and signal-API warnings. Existing violations go into ESLint's bulk-suppressions file, and `npm run lint` moves to the ESLint CLI so a stale record fails (R1–R5).
- **Specs and docs**: three units get specs (R9). architecture.md's stale shell/nav bullets and every removed area are rewritten.

## Technical Context

**Language/Version**: TypeScript 6.0, Angular 22.1 (standalone, zoneless)

**Primary Dependencies**: ESLint 10.10 + typescript-eslint 8.69 + angular-eslint 22.5 (lint), `@angular/build` 22.1 (budgets). No new dependencies. Removed: `@angular/forms`, `tesseract.js`, `papaparse`, `@types/papaparse`

**Storage**: N/A (no persisted-data change; `fake-indexeddb` in specs). The Supabase catalog tables and `npm run sync:scryfall` stay, because `sync:planechase` reads them

**Testing**: Vitest via `ng test`, jsdom, `fake-indexeddb`

**Target Platform**: Browser PWA + Capacitor Android (shared production web build)

**Project Type**: Single Angular web app

**Performance Goals**: `npm run lint` with type information stays around today's order (~11 s measured for the probe)

**Constraints**: FR-001 zero behavior change. Every removed item is unreachable from any route today. No kept dead-code tooling (FR-003a)

**Scale/Scope**: ~8 recorded lint exceptions, 17 import rewrites, the whole `shared/cards/` folder plus ~10 more folders/files and 4 dependencies removed, ~20 exports un-exported or deleted, 3 new spec files, 1 reference note, 2 doc files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|-----------|--------|
| I. Physical-World Fidelity | Pass: no card/location data or its persistence touched. The removed card UI was unreachable |
| II. PT-BR-First | Pass: no user-facing text changes (lint messages are maintainer-facing) |
| III. Free and Accessible | Pass: N/A |
| IV. Local-First, Cloud-Optional | Pass: no profile, sync or offline behavior changes |
| V. Zoneless, Signal-Driven Angular | Pass: `IdentityService.colors` is a `computed`. The signal-API lint warning reinforces the principle. Removing legacy components and partials matches "removed view by view". No UI is built |
| VI. Persistence and Sync Pattern | Pass: entity services and `entity-store` are only covered by specs, not changed |
| Development Workflow (fact-based docs) | Pass: architecture.md/commands.md get only lasting facts and drop descriptions of removed code. The reference note lives in `backlog/`, not the guidance files |

**Post-design re-check**: still passes. FR-010's per-lazy-chunk limit is reworded as named `bundle` budgets, because Angular's `anyScript` includes `main` (R6).

## Project Structure

### Documentation (this feature)

```text
specs/010-codebase-baseline/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── guardrails.md
└── tasks.md             # /speckit-tasks
```

### UI Design

No UI surface. The spec builds no UI. Removals only delete components that no route reaches, so there is no `ui.md`. The design-auditor runs only if a removal edits a template or stylesheet that stays.

### Source Code (repository root)

```text
backlog/reference/card-features.md   # NEW: OCR, catalog lookup, CSV import configuration (FR-002a)
eslint.config.js                     # type-aware block, promise rules, import restrictions, signal warnings
eslint-suppressions.json             # NEW: known-exceptions record
angular.json                         # production budgets; `lint` target removed
package.json                         # "lint": "eslint src"; − @angular/forms, tesseract.js, papaparse, @types/papaparse
tsconfig.json                        # + @data/*, @db/*; − bare @shared
.claude/docs/architecture.md         # aliases, shell/nav, budgets, lint conventions; removed areas dropped
.claude/docs/commands.md             # lint + suppression commands
src/styles/_modal.scss, _dropdown.scss   # REMOVED
src/app/
├── core/
│   ├── services/identity.service.ts          # colors signal (+ identity.service.spec.ts NEW)
│   ├── services/profile-session.service.spec.ts   # NEW
│   ├── db/entity-store.spec.ts               # NEW
│   ├── services/{theme,card-ocr,card-lookup,card-filter,card-import}.service.ts (+ specs)   # REMOVED
│   ├── utils/{card-ocr,card-color,card-import,dropdown-placement,dropdown-dismiss}.util.ts (+ specs)   # REMOVED
│   ├── supabase-client.ts                    # − SUPABASE_CLIENT token
│   └── testing/card.mocks.ts                 # − mockCardLookupResult
├── shared/
│   ├── index.ts                              # REMOVED
│   ├── cards/                                # REMOVED (all 5 components)
│   ├── common/{select,filter-select,entity-list}/   # REMOVED
│   ├── effects/{leyline-field,spark-reroll}/ # REMOVED
│   ├── effects/page-sweep/page-sweep.ts      # reads identity.colors()
│   └── layout/dashboard-panel/               # REMOVED
└── (14 files)                                # relative core imports → @data/@db
```

**Structure Decision**: Single existing Angular project. The only new folder is `backlog/reference/`.

## Implementation order (for /speckit-tasks)

1. **Measure baseline**: file/line counts under `src/` (SC-007) and build sizes.
2. **Write the reference note** (FR-002a, R10): `backlog/reference/card-features.md`, before anything is removed.
3. **Remove unused code** (R7): card components and their dependents, then repeat the reference sweep until nothing new turns up. Confirm with build, lint and tests.
4. **Effective colors** (R8).
5. **Import aliases**: add `@data`/`@db` and rewrite the 17 relative imports (R5).
6. **Lint**: type-aware block, rules, import restrictions, `lint` script, suppressions record (R1–R4). Verify the contract rows.
7. **Budgets** (R6): measure component styles on the post-removal build, then set limits. Verify with quickstart step 3.
8. **Specs** (R9): three files, each with its deliberate-break check.
9. **Docs**: architecture.md and commands.md.

The note comes before any removal. Removal comes before effective colors (so ThemeService is never edited), before lint (rules must not flag code about to be deleted) and before budgets (the largest stylesheets are card components). Aliases come before the relative-import rule, so the rule lands with zero violations.

## Complexity Tracking

No constitution violations.
