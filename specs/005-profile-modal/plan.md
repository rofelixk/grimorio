# Implementation Plan: Profile Modal

**Branch**: `feature/005-profile-modal` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-profile-modal/spec.md`, plus the design handoff
`design_handoff_profile_modal/` (README → ProfileModalApp.dc.html → IdentityWheelV2.js → EntryModal.jsx)

## Summary

A new **profile modal** manages the active profile. It has a hub plus two sub-screens: "Perfil neste
aparelho" and "Conta na nuvem". It replaces the entry modal as the profile control's destination.

**Local profile** (all offline):
- The identity wheel changes colors on tap and retints the app at once.
- The name is renamed through "Salvar", with a toast.
- The local password changes with the current one plus the new one entered twice.
- "Excluir perfil" deletes the profile's IndexedDB database, and the app lands on Home's new
  empty-device state when it was the last profile.

**Cloud account**:
- Link, re-sign-in and unlink move here from the entry modal. The cloud forms are shared through a
  `CloudFlowHost` token.
- The account password changes with a throwaway sign-in to verify it, then `updateUser` and
  `signOut({ scope: 'others' })`.
- "Excluir conta na nuvem" calls a new `SECURITY DEFINER` function, `delete_own_account()`. It
  deletes the auth user, and the existing FK cascades remove every cloud row atomically.
- **Colors and label follow the account**: each sync starts with an identity step, where
  `getUser()` both reads the metadata and detects a deleted account. Colors reconcile last-write-wins
  on the new `colorsUpdatedAt`/`grm_colors_at` timestamps.

**Shared pieces**:
- **Toasts**: an app-wide `ToastService`. Outlets render as top-layer popovers inside whichever
  dialog is on top, so a toast shows above modals.
- **Identity wheel**: rewritten to the v2 visuals in place, so the API doesn't change.
- **Entry modal**: it loses its link context and its reauth/unlink phases, and gains the redesigned
  "Redefinir senha do perfil".

## Technical Context

**Language/Version**: TypeScript ~6.0, Angular 22.1 (standalone, zoneless, OnPush, signals)

**Primary Dependencies**: The existing ones only: `@supabase/supabase-js` (auth, `rpc`) and `idb`
(`deleteDB`). The native `<dialog>` and Popover API. **No new dependencies.**

**Storage**:
- IndexedDB `grimorio-device`: `ProfileRecord` gains `colorsUpdatedAt` and `nameUpdatedAt`. There is
  no version bump.
- Each `grimorio-profile-{id}` database is deleted on profile deletion.
- Supabase: `user_metadata` gains `grm_colors_at` and `grm_label_at`, plus one new function,
  `public.delete_own_account()`. There are no new tables.

**Testing**: Vitest via `ng test` (jsdom + `fake-indexeddb`). Browser checks go through the `run` skill
(Playwright) against the user's dev server. The cloud scenarios run against the live project with
throwaway accounts.

**Target Platform**: Evergreen browsers, the installable PWA, and the Capacitor Android WebView. The
Popover API (`popover="manual"`) is baseline in the supported engines.

**Project Type**: A single-project client-only Angular SPA. The backend is hosted Supabase.

**Performance Goals**:
- A color tap retints the app in the same frame (it's a signal patch), well inside SC-002's 5 s.
- Every rename, color change or link change shows everywhere without a reload (SC-003).
- A toast lasts 5 s.

**Constraints**:
- Rename, recolor, local password, unlink and profile deletion work offline (SC-005).
- A cloud account deletion is atomic (FR-019a).
- Only one modal is open at a time.
- No icons.
- Reduced motion stops the wheel's spin, breathing, motes and bursts.
- PT-BR only, with no raw backend text.

**Scale/Scope**:
- About 9 new components or DS primitives (the profile modal and its 7 screen/step parts,
  `ActionRow`, `SyncPlate`, `ToastOutlet`).
- 3 new services (`ProfileModalService`, `ProfileLifecycleService`, `ToastService`).
- 2 new utils (`profile-flow.util`, `identity-sync.util`).
- 1 Supabase migration.
- Edits to `ProfileStore`, `CloudAuthService`, `SyncService`, `SyncStatusService`, `EntryFlowStore`,
  `entry-flow.util`, `entry-copy.ts`, `IdentityWheel`, `ThemedModal`, `TopBar`, `NavDrawer`, `Home`,
  `App`, `DESIGN.md` and `architecture.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constitution v2.1.1.

| Principle | Status | Notes |
|---|---|---|
| I. Physical-World Fidelity | Pass | Owned-card and location data are never altered by this feature. They are only deleted with their own profile (local) or with their own account (cloud), both explicitly confirmed. Other profiles are untouched by construction (one DB per profile). |
| II. PT-BR-First | Pass | All new copy goes in `entry-copy.ts`, from the handoff. The new Supabase error paths (`same_password`, `user_not_found`, the RPC errors) are mapped to PT-BR, and nothing raw reaches the UI. Three new strings are flagged for review (research R8, R12, R16). |
| III. Free and Accessible | Pass | No monetization surface. |
| IV. Local-First, Cloud-Optional | Pass | Every local edit and profile deletion is offline-capable. The cloud actions are optional, and a gone or expired account never deletes or blocks local data (FR-019b). Home stays ungated. |
| V. Zoneless, Signal-Driven Angular | Pass | Standalone + OnPush. `computed` covers derivation (Salvar enablement, link state, unsynced), and `effect` is only for dialog/popover side effects and timers. No UI framework. **DESIGN.md is updated first** (R20) for the toast, action rows, sync plate, danger plate, empty-device state, wheel v2 and the profile modal's modes. |
| VI. Established Persistence and Sync Pattern | Pass | No new entity types. `ProfileStore` keeps its queue and signal shape. The identity step reuses LWW semantics on timestamps and runs inside the existing single-flight, time-bounded sync. The new Supabase object is a function, not a table: its `EXECUTE` grant ships in the same migration, and there's no table needing RLS. |

**Post-design re-check (after Phase 1)**: Still all pass. The `SECURITY DEFINER` function is scoped to
`auth.uid()`, `EXECUTE` is limited to `authenticated`, and `search_path` is empty, per Supabase's
guidance. It's checked with `get_advisors` after applying.

### Spec deviations and notes (not constitutional)

- **FR-012a clock**: LWW compares device-stamped ISO times, as entity sync already does. Clock skew
  between devices can make an older change win. This is accepted as it is for entities.
- **FR-019b detection**: it depends on GoTrue returning `user_not_found` from `getUser()` for a
  deleted user. If it reports a session error instead, the spec's FR-019c fallback is the behavior.
  Quickstart V18 records which happens.
- **Old dev profiles**: profiles created before this feature lack the new timestamp fields. There is
  no migration (the project rule), so start from a clean device (quickstart prerequisites).
- **Copy flagged for review**: `MSG.samePassword`, `MSG.goneHint`, and the profile control's new
  "Gerenciar perfil" hint. None are in the handoff.

## Project Structure

### Documentation (this feature)

```text
specs/005-profile-modal/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R20
├── data-model.md        # Phase 1: ProfileRecord fields, metadata, reconciliation, modal state machine
├── quickstart.md        # Phase 1: validation scenarios V1–V23
├── contracts/
│   ├── services.md      # Phase 1: service/util/component contracts
│   └── supabase.md      # Phase 1: migration 005_delete_own_account, metadata, auth calls, error codes
├── ui.md                # Phase 1: surfaces, layout, states, flow, DS reuse, a11y, copy
├── checklists/          # (from /speckit-specify)
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### UI Design (Phase 1 → `ui.md`)

See [ui.md](ui.md). It covers:
- the profile modal's hub, sub-screens, action steps and done screens, at desktop and mobile widths
- the entry modal's "Redefinir senha do perfil"
- the toast placement and the empty-device state
- the state table mapped to FRs, the interaction flow, DS reuse vs. the new primitives, accessibility
  and all PT-BR copy

### Source Code (repository root)

```text
DESIGN.md                                   # R20: toast, action rows, sync/danger plates, empty device, wheel v2, modal modes
.claude/docs/architecture.md                # profile modal, toasts, identity sync step, delete_own_account (after implementation)
src/app/
├── app.ts | app.html                       # <app-profile-modal />, base ToastOutlet
├── core/
│   ├── db/profile-db.ts                    # + deleteProfileDb()
│   ├── models/profile.model.ts             # + colorsUpdatedAt, nameUpdatedAt
│   ├── services/
│   │   ├── profile-store.service.ts        # + rename, setColors(at), remove; timestamps on create
│   │   ├── profile-lifecycle.service.ts    # NEW: deleteProfile
│   │   ├── profile-modal.service.ts        # NEW
│   │   ├── toast.service.ts                # NEW
│   │   ├── cloud-auth.service.ts           # + checkAccount, forgetGoneAccount, accountGone, changeAccountPassword, deleteAccount; unlink → gone-aware; metadata timestamps
│   │   ├── sync.service.ts                 # identity step first, 'gone' outcome
│   │   ├── sync-status.service.ts          # link/reauth → profile modal
│   │   └── entry-modal.service.ts          # no link context / reauth / unlink starts; one-modal guard
│   └── utils/
│       ├── identity-sync.util.ts           # NEW: reconcileIdentity
│       ├── profile-flow.util.ts            # NEW: profile modal rules and copy selection
│       ├── sync-status.util.ts             # + hasUnsyncedChanges
│       ├── entry-flow.util.ts              # − link/reauth/unlink; + validateName; recover-form copy
│       ├── cloud-error.util.ts             # + same_password; FieldKey + pwNew/pwConfirm
│       └── entry-copy.ts                   # + PROFILE, TOAST, MSG additions; SHELL hint
├── shared/
│   ├── ds/
│   │   ├── identity-wheel/                 # REWRITTEN internals (v2), same API
│   │   ├── action-row/                     # NEW
│   │   ├── sync-plate/                     # NEW
│   │   ├── toast/                          # NEW: ToastOutlet
│   │   └── themed-modal/                   # + ToastOutlet host; + fluid-face.ts (shared with EntryModal)
│   ├── auth/
│   │   ├── cloud-flow-host.ts              # NEW: abstract class for CloudForm/ResetForm
│   │   ├── entry-modal/                    # store/forms use CloudFlowHost; link/reauth/unlink removed; recover-form UI; linkAfterCreate hand-off
│   │   └── profile-modal/                  # NEW: profile-modal.ts/html/scss, profile-flow.store.ts,
│   │                                       #      hub/, local-screen/, cloud-screen/, password-step/,
│   │                                       #      delete-profile-step/, delete-cloud-step/, done-panel/
│   └── layout/
│       ├── top-bar/                        # openProfile → profile modal
│       └── nav-drawer/                     # ToastOutlet host; profile/sync actions → profile modal
└── views/home/                             # empty-device state
```

Supabase: the migration `005_delete_own_account` is applied with `apply_migration`
([contracts/supabase.md](contracts/supabase.md)). Each new component or service gets its own
`.spec.ts` alongside it.

**Structure Decision**: The single Angular project, following architecture.md's folder rules:
- The new modal sits beside the entry modal in `shared/auth/`.
- The reusable visual primitives go in `shared/ds/`.
- The services and pure utils go in `core/`.

### Implementation order (for /speckit-tasks)

1. `DESIGN.md` entries (R20), then the Supabase migration and an advisors check.
2. Foundation:
   - the `ProfileRecord` fields and the `ProfileStore` methods
   - `deleteProfileDb`
   - `ToastService` + `ToastOutlet` + the hosts (`App`, `ThemedModal`, `NavDrawer`)
   - `fluid-face.ts`, extracted from `EntryModal`
   - the copy
3. Identity wheel v2 (both modals pick it up).
4. `CloudFlowHost` refactor of `CloudForm`/`ResetForm`, then the entry-modal pruning (FR-006) and
   "Redefinir senha do perfil" (FR-024).
5. `ProfileModalService`, `ProfileModal`, the hub, `SyncPlate`, `ActionRow`, and the shell wiring
   (US1).
6. `local` screen: live colors and rename (US2).
7. `cloud` screen: link, reauth and unlink in the profile modal (US3). The `SyncStatusService`
   routing.
8. The `pw` step and `cloudpw` + `changeAccountPassword` (US4).
9. `ProfileLifecycleService` + `delprofile` (with the unsynced block) + the Home empty state. Then
   `delete_own_account` + `delcloud` (US5).
10. The sync identity step + `checkAccount`/`forgetGoneAccount` (FR-012a, FR-019b/c). Then the
    quickstart pass and the architecture.md update.

## Complexity Tracking

No constitution violations. Nothing to justify.
