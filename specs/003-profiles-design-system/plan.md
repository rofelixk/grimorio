# Implementation Plan: Profiles, Accounts and the New Design System

**Branch**: `003-profiles-design-system` | **Date**: 2026-09-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-profiles-design-system/spec.md`

## Summary

This plan rebuilds Grimorio's entry experience on a new design foundation:

- **Local profiles**: name, PBKDF2-hashed password and a 1–3 color identity, stored in a device
  registry. Each profile's owned data lives in its **own IndexedDB database**, so isolation holds by
  construction.
- **Cloud accounts** (Supabase Auth, e-mail + password): optional, one **per-profile auth session**
  each, linked and unlinked per profile.
- **Password reset** by a 6-digit e-mailed code.
- **Automatic sync**: on link, setup, unlock, reauth, and within 60 s of a change, reusing the
  existing last-write-wins reconciler.
- **One themed entry modal** that implements every STATES.md phase.
- **A temporary top-bar profile button and menu.**
- **Replacement of every legacy global style and token** with the DESIGN.md/tokens.css foundation.
  The app root is themed by the active profile, or by the default R → U → G identity.

## Technical Context

**Language/Version**: TypeScript ~6.0, Angular 22.1 (standalone, zoneless, OnPush, signals)

**Primary Dependencies**: `@supabase/supabase-js` ^2.116 (auth + data), `idb` ^8 (IndexedDB), WebCrypto
(PBKDF2). **No new dependencies.**

**Storage**:
- IndexedDB: `grimorio-device` (the profile registry) plus one `grimorio-profile-{id}` database per
  profile.
- localStorage: supabase-js session per profile, under `grm-cloud:{id}`.
- Supabase Postgres: `storage_locations`, `card_entries`, with composite primary keys after the
  migration.
- Supabase Auth: `user_metadata` holds the account label and colors.

**Testing**: Vitest 4 via `ng test` (jsdom + `fake-indexeddb`). WebCrypto is polyfilled from
`node:crypto` in `src/test-setup.ts` if jsdom lacks `subtle`.

**Target Platform**: Evergreen browsers (desktop and mobile), the installable PWA, and the Capacitor
Android WebView. CSS relative-color syntax and `@property` are required, as tokens.css already
assumes.

**Project Type**: Single-project, client-only web app (Angular SPA wrapped by Capacitor). The backend
is hosted Supabase, with no server code.

**Performance Goals**:
- Profile creation ≤ 30 s end-to-end (SC-001).
- A switch including the password ≤ 10 s (SC-003). PBKDF2 at 600k iterations is ~0.5–1.5 s on
  mid-range Android.
- A local change reaches the cloud within 60 s while online (US4-10).
- Modal height transitions at 0.24 s.

**Constraints**:
- Fully offline for every local action (FR-021).
- No profile's data or colors are visible while another profile, or none, is active (SC-002).
- 44px touch targets.
- Reduced motion stops all decorative animation.
- `anyComponentStyle` budget of 8 kB per component stylesheet.
- PT-BR only, with no raw backend text.

**Scale/Scope**:
- ≥ 10 profiles per device.
- 14 modal phases × 3 contexts, plus 8 success screens and 13 error cases (STATES.md).
- 5 gated routes.
- About 8 new DS primitives, about 6 new services and utils, and about 7 legacy files deleted.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* The constitution is v2.1.1.

| Principle | Assessment | Result |
|---|---|---|
| I. Physical-World Fidelity | Storage locations stay per profile and keep syncing ahead of cards. The location model is unchanged; only ownership scoping changes. | PASS |
| II. PT-BR-First | All copy comes from STATES.md/DESIGN.md, centralised in `entry-copy.ts`. `mapCloudError` guarantees no raw Supabase text (R8). `index.html` switches to `lang="pt-BR"`. | PASS |
| III. Free and Accessible | Nothing monetizable. Cloud stays optional. | PASS |
| IV. Local-First, Cloud-Optional | A profile is a name and password on the device, with no e-mail or network. Profiles are isolated (per-profile DB). Cloud is optional per profile. Home, About and gameplay areas are ungated. Sign-in methods are a spec-level choice (v2.1.1); this spec uses e-mail + password only. | PASS |
| V. Zoneless, Signal-Driven Angular + DESIGN.md | The code is standalone/OnPush/signals with `linkedSignal`/`computed`/`effect`. There is no UI framework, and the modal uses native `<dialog>` and `popover`. New UI follows DESIGN.md. **Gap**: DESIGN.md has no app-shell top bar, so an "App top bar" entry is added to DESIGN.md before it is built (R16). **Deviation**: legacy `src/styles/*` global rules are removed all at once instead of "view by view", and `data-grm` sits on the app root — see Complexity Tracking (2 rows). | PASS with justified deviations |
| VI. Persistence and Sync Pattern | `ProfileStore` and the entity services keep signal + idb + `whenReady`/`flush` + a write queue. Sync reuses `reconcileEntities` and `updatedAt` stamping. There are no new Supabase tables. The migration only alters keys, and existing grants and owner-only RLS stay (verified live). | PASS |
| Dev workflow | Plan checked against the constitution before implementation. Doc updates go to `notes.md` for user review after the work lands. | PASS |

**Post-design re-check (after Phase 1)**: No new violations. The composite primary key (R10) keeps
RLS as-is. The per-profile Supabase clients (R4) add no dependency. `ThemeService` survives only as a
legacy adapter, so legacy components still compile without inheriting stale colors (R13).

## Project Structure

### Documentation (this feature)

```text
specs/003-profiles-design-system/
├── plan.md              # this file
├── research.md          # Phase 0 — decisions R1–R16
├── data-model.md        # Phase 1 — storage layout, entities, transitions, validation
├── quickstart.md        # Phase 1 — automated + 23 manual validation scenarios
├── contracts/
│   ├── services.md      # TS surface of the core services, the modal API and the guard
│   └── supabase.md      # migration SQL, clean-start wipe, auth config, user_metadata
├── ui.md                # Phase 1 — surfaces, layouts, states, flow, a11y, copy
├── checklists/          # existing
└── tasks.md             # Phase 2 (/speckit-tasks) — not created here
```

### UI Design (Phase 1 → `ui.md`)

See [ui.md](ui.md): the new top bar with a temporary profile button and menu; one themed entry modal
(desktop two-pane, mobile full-bleed) covering every STATES.md phase; new DS primitives under
`src/app/shared/ds/`; and minimal legacy `NavBar` edits.

### Source Code (repository root)

```text
DESIGN.md                                   # + "App top bar" entry (R16)
src/
├── index.html                              # lang="pt-BR"; font link trimmed to Grenze 600/700 + Karla
├── styles.scss                             # @use tokens, base, controls only
├── styles/
│   ├── _tokens.scss                        # NEW: port of design_handoff tokens.css (replaces legacy)
│   ├── _base.scss                          # NEW: body, a, ::selection, focus-visible
│   ├── _controls.scss                      # NEW: .btn*, .field, .plate, .eyebrow, .micro-label, .divider, .link-btn
│   ├── _breakpoints.scss                   # kept
│   ├── _modal.scss, _dropdown.scss         # kept (legacy mixin-only; emit no global CSS)
│   └── _reset/_motion/_buttons/_forms/_fence.scss   # DELETED
├── test-setup.ts                           # reset all grimorio-* DBs; WebCrypto polyfill
└── app/
    ├── app.ts / app.html / app.scss        # themed root host bindings; <app-top-bar/>; <app-entry-modal/>
    ├── app.config.ts                       # initializer: legacy cleanup → ProfileStore → ProfileSession
    ├── app.routes.ts                       # profileGuard on 5 core routes; /profile → redirect ''
    ├── core/
    │   ├── db/
    │   │   ├── device-db.ts                # NEW: grimorio-device (profiles, meta)
    │   │   ├── profile-db.ts               # NEW: open/close grimorio-profile-{id} (was grimorio-db.ts)
    │   │   ├── entity-store.ts             # bound to the active profile DB
    │   │   ├── legacy-cleanup.ts           # NEW: delete old DB + keys (R2)
    │   │   └── local-storage-migration.ts  # DELETED
    │   ├── guards/profile.guard.ts         # NEW (auth.guard.ts DELETED)
    │   ├── models/profile.model.ts         # NEW
    │   ├── services/
    │   │   ├── profile-store.service.ts    # NEW
    │   │   ├── profile-session.service.ts  # NEW
    │   │   ├── identity.service.ts         # NEW
    │   │   ├── cloud-session.service.ts    # NEW: per-profile Supabase clients
    │   │   ├── cloud-auth.service.ts       # NEW (auth.service.ts DELETED)
    │   │   ├── connectivity.service.ts     # NEW
    │   │   ├── entry-modal.service.ts      # NEW
    │   │   ├── sync.service.ts             # REWRITTEN (per-profile client, composite keys)
    │   │   ├── sync-scheduler.service.ts   # NEW
    │   │   ├── theme.service.ts            # REDUCED to a legacy adapter over IdentityService
    │   │   └── card/storage-location/deck.service.ts   # + load(profileId), changeCount
    │   ├── supabase-client.ts              # catalog client → anonymous-only
    │   └── utils/
    │       ├── password-hash.util.ts       # NEW (PBKDF2)
    │       ├── identity.util.ts            # NEW (tribes, color names, roles)
    │       ├── entry-flow.util.ts          # NEW (phases, validation, prompts, labels)
    │       ├── entry-copy.ts               # NEW (all PT-BR strings)
    │       └── cloud-error.util.ts         # NEW
    ├── shared/
    │   ├── ds/                             # NEW domain folder: new-system primitives
    │   │   ├── themed-modal/  spark-field/  identity-wheel/  mini-wheel/
    │   │   └── identity-chip/ profile-row/  sync-line/
    │   ├── auth/
    │   │   ├── entry-modal/                # NEW (+ phase children: profile-list, profile-form,
    │   │   │                               #       cloud-form, reset-form, done-panel)
    │   │   ├── profile-button/             # NEW (temporary, FR-029)
    │   │   └── auth-control/, auth-modal/  # DELETED
    │   ├── effects/color-theme-picker/     # DELETED
    │   ├── layout/
    │   │   ├── top-bar/                    # NEW
    │   │   ├── sync-indicator/             # DELETED
    │   │   └── nav-bar/                    # drop auth-control, sync-indicator, /profile link
    │   └── index.ts                        # barrel updated
    └── views/profile/                      # DELETED (FR-030)
```

**Structure Decision**: The existing single-project Angular layout is kept.
- A new `src/app/shared/ds/` domain folder holds the DESIGN.md primitives, keeping them visibly apart
  from legacy `common/`/`effects/` components.
- Auth UI stays in `shared/auth/`.
- Pure logic goes in `core/utils/` so the STATES.md matrix is unit-testable without rendering.
- The Supabase schema change is applied with the MCP `apply_migration`, and its SQL is recorded in
  `contracts/supabase.md`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Principle V says legacy styles are "removed view by view", but this spec deletes every legacy **global** partial that emits CSS (`_reset`, `_tokens`, `_motion`, `_buttons`, `_forms`) and `_fence` at once | Spec FR-039/SC-010 and the 2026-09-24 clarification require the new tokens and base styles to replace the legacy globals app-wide, with 0 legacy global rules left. Legacy **component** stylesheets are still left in place and are removed view by view, as the principle intends. | Keeping the legacy globals behind the fence fails SC-010, and the fence is pointless once no legacy global rules remain. The mixin-only partials (`_modal`, `_dropdown`) are kept so legacy components still compile. |
| Principle V says legacy styles are "fenced off from any `[data-grm]` subtree", but T062 puts `data-grm` on the app root, so legacy components render inside it | FR-035 requires the new base styles and every new surface to be tinted by the active profile's roles app-wide, and the new base (`_base.scss`) targets the whole page. Legacy component stylesheets are view-encapsulated by Angular, so they can't leak into new UI; the reverse (new base under legacy views) is expected by FR-039/US9-2. | Scoping `data-grm` to the top bar and modal only leaves the page body on no themed root, and it contradicts SC-010 ("every screen renders on the new tokens and base styles"). |
| Principle V says legacy styles are "frozen", but T061 edits `src/app/app.scss` and T003 adds header comments to `_modal.scss`/`_dropdown.scss` | The new top bar (FR-029) has to sit above the legacy layout, and only the app shell's own stylesheet can split the page height between them. The T003 comments stop new UI from picking up the kept mixin partials by mistake. Neither edit changes how a legacy view looks. | Leaving `app.scss` untouched means the top bar either overlaps `.app-layout` or the page scrolls at the root, which breaks the 100dvh shell. Leaving the partials unmarked invites new UI to reuse legacy mixins against Principle V. |

## Out-of-plan prerequisites (need explicit user action)

1. **Clean-start wipe** of Supabase `card_entries`, `storage_locations` and `auth.users`. This is
   destructive; see contracts/supabase.md §2.
2. **Auth dashboard settings**: custom SMTP, OTP length and expiry, the 30 s e-mail interval, and the
   PT-BR reset template. None of these can be set from the codebase.
