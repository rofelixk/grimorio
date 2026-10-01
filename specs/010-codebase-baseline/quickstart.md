# Quickstart: validating the Codebase Baseline

Prerequisites: clean working tree on `010-codebase-baseline`, `npm install` done. Tests and lint go through the `test-runner` agent (CLAUDE.md). The dev server is the user's own; nothing here starts it.

## 1. Everything green (SC-001, SC-003)

1. `npm run build`: succeeds with **no** budget warnings.
2. `npm run lint`: exit 0, 0 errors, 0 warnings, with `eslint-suppressions.json` present.
3. `npm test`: full suite passes, including the 3 new spec files (step 4).

## 2. The three deliberate regressions (SC-002, contract [guardrails.md](contracts/guardrails.md))

Make each change on its own, run `npm run lint`, confirm it fails on that line, then revert.

| # | Temporary change | Expected |
|---|------------------|----------|
| 1 | In `src/app/app.ts`, add `import cards from '@data/planechase/cards.json';` | lint error: restricted import |
| 2 | In any component method, call `this.router.navigateByUrl('/')` as a bare statement | lint error: `no-floating-promises` |
| 3 | In `src/app/views/home/home.ts`, import `IdentityService` from `'../../core/services/identity.service'` | lint error: restricted relative import |

Also check the pass side: prefixing #2 with `void` passes, and #1 written as `await import('@data/planechase/cards.json')` passes.

## 3. Budgets actually bite (FR-008, FR-010)

1. Temporarily lower the `initial` error budget in `angular.json` below the current size (e.g. `800kb`): `npm run build` fails. Revert.
2. Temporarily lower the `cards-json` bundle error budget to `50kb`: the build fails and names that chunk. This proves the name matches. Revert.

## 4. New specs catch breakage (SC-006)

For each unit, apply the break, run that spec file, see at least one failure, and revert.

| Spec | Deliberate break |
|------|------------------|
| `entity-store.spec.ts` | Remove `tx.abort()` from `writeRows`' catch |
| `profile-session.service.spec.ts` | Swap the order of the `flush` and `load` `Promise.all` lines in `loadEntities` |
| `identity.service.spec.ts` | Change the fallback to `['W']` |

## 5. Smaller, single-sourced (SC-004, SC-005, SC-007)

- `grep -rnE "from '(\.\./)+([a-z-]+/)*(core|shared)/" src --include=*.ts`, then filter out hits inside the same area: none should remain from outside `core/` or `shared/`.
- `grep -rn "?? DEFAULT_IDENTITY\|?? \[...DEFAULT_IDENTITY\]" src/app --include=*.ts`: only `identity.service.ts`, `entry-flow.store.ts` and `cloud-auth.service.ts` remain.
- Compare `find src -name '*.ts' -o -name '*.html' -o -name '*.scss' | xargs wc -l | tail -1` (and file count) with the numbers recorded before the removals. Both go down.
- Every removed item from research R7 has zero references (`grep -rn`).
- `backlog/reference/card-features.md` exists, was written before the card, OCR, catalog-lookup and CSV import files were deleted, and covers every item listed in research R10.
- `shared/cards/`, `tesseract.js`, `papaparse`, ThemeService and the `_modal`/`_dropdown` partials are gone, and `grep -rn "tesseract\|papaparse\|ThemeService\|CardLookupService" src package.json` finds nothing.

## 6. No visible change (SC-008)

With the user's dev server running, use the `run` skill or a manual pass: Home, collection area, deck area, Planechase (game and deck), entry modal, profile modal, and the page-change dust. Do this once with a profile whose colors differ from the default, and once with no profile (R/U/G). Everything looks as before.

## 7. Docs (SC-009)

Every path and component name in architecture.md's page-shell/navigation bullets exists (`ls` each path). The removed `nav-bar/`, `--nav-bar-height`, `.app-layout`/`.app-shell` and the `@shared` barrel are no longer mentioned.
