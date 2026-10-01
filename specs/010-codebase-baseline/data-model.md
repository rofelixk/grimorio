# Data Model: Codebase Baseline

This spec adds no persisted data: no IndexedDB store, Supabase table or record shape changes (FR-001). Its entities are configuration artifacts and one derived signal.

## Known-exceptions record

- **Where**: `eslint-suppressions.json` (repo root), ESLint's bulk-suppressions format: `{ "<relative file path>": { "<rule id>": { "count": <n> } } }`.
- **Initial content** (research R2): `@typescript-eslint/no-floating-promises` for `src/app/views/collection-area/collection-area.ts` (3), `src/app/views/deck-area/deck-area.ts` (1); `@typescript-eslint/no-misused-promises` for `src/app/core/services/sync.service.spec.ts` (3), `src/app/shared/auth/profile-modal/profile-flow.store.spec.ts` (1).
- **Rules**:
  - Only `error`-level violations are recorded. The relative-import rule never appears in it (FR-015).
  - Counts are per file and rule. A new violation in a recorded file pushes the count past the record and fails lint.
  - Lifecycle: entries are only removed (`--prune-suppressions`) or created when a new rule lands (`--suppress-rule`). Lint fails while an entry is stale (FR-017).

## Size budgets

- **Where**: `angular.json` → `projects.grimorio.architect.build.configurations.production.budgets`.

| Budget | type / name | Warning | Error |
|--------|-------------|---------|-------|
| Initial bundle | `initial` | 1.25 MB | 1.5 MB |
| Each component stylesheet | `anyComponentStyle` | ≈2× largest today | ≈4× largest today |
| Planechase cards chunk | `bundle` / `cards-json` | ≈210 kB | ≈420 kB |
| Planechase translations chunk | `bundle` / `cards-pt-br-json` | ≈210 kB | ≈420 kB |

- **Rules**: Budgets apply only to the production configuration (the default `ng build`), which the PWA and Android builds share. A lazy chunk added later gets its own named `bundle` budget in the spec that adds it. Raising a limit is a deliberate edit in the spec that needs it.

## Effective colors (`IdentityService.colors`)

- **Shape**: `computed<readonly Color[]>`: the active profile's `colors` when `ProfileSessionService.active()` is non-null, else `DEFAULT_IDENTITY` (`['R', 'U', 'G']`).
- **Readers**: `IdentityService.roles` (`rolesFor(colors())`), `PageSweep` dust colors. ThemeService, a former reader, is removed.
- **Not readers**: `EntryFlowStore` (draft identity), `CloudAuthService` (pending sign-up identity).
- **Replaces**: `IdentityService.activeColors: Color[] | null`, which is removed.
