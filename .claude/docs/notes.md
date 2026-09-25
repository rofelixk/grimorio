## Notes

Dated, fact-based entries accumulated session-to-session go here — new dependencies, new durable conventions, new scripts/commands, structural changes. See the "worth adding" test in `CLAUDE.md`'s Maintaining section before adding anything. Keep entries short; if a note describes something stable enough to be a permanent reference, move it into `architecture.md` or `commands.md` instead and remove it from here.

## 2026-09-24

- `DESIGN.md` (root) is the design system's source of truth; UI it doesn't cover is undecided.
  Legacy styles (`src/styles/*`, existing component `.scss`) are frozen.
- The pre-rebuild auth UI is preserved at git tag `auth-modal-v1`.

## 2026-09-24 (spec 003)

- Owned data is per local profile: IndexedDB `grimorio-device` (profile registry + `activeProfileId`)
  plus one `grimorio-profile-{id}` database per profile. Entity services gain `load(profileId | null)`
  and `changeCount`; `ProfileSessionService` owns switching. The legacy `grimorio` database is deleted
  on startup (`core/db/legacy-cleanup.ts`).
- `profileGuard` (`core/guards/profile.guard.ts`) gates owned-data routes; gated routes also set
  `runGuardsAndResolvers: 'always'` so a sign-out/switch re-guards the current page.
- One Supabase auth client per linked profile (`CloudSessionService`, storage key `grm-cloud:{id}`);
  the shared `SUPABASE_CLIENT` is anonymous-only (catalog reads). Cloud errors reach the UI only via
  `mapCloudError` (`core/utils/cloud-error.util.ts`).
- New-system UI primitives live in `src/app/shared/ds/`; entry-modal PT-BR copy is centralized in
  `core/utils/entry-copy.ts`.
- `@utils/*` path alias → `src/app/core/utils/*` (already in tsconfig; now used).

## 2026-09-25

- `design_brief/` holds the self-contained design-system brief for Claude Design; its `tokens.css`/`controls.css`/`components/*.css` are compiled from `src/styles/` and `shared/ds/` and must be regenerated when those change.
