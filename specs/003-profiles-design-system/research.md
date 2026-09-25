# Research: Profiles, Accounts and the New Design System

**Feature**: `003-profiles-design-system` | **Date**: 2026-09-24

The spec has no open NEEDS CLARIFICATION items (all three allowed ones were resolved in its
Clarifications). This file records the technical decisions that the spec leaves to the plan. Each one
lists the decision, why it was chosen, and the alternatives that were rejected.

---

## R1. Per-profile data isolation: one IndexedDB database per profile

- **Decision**: A device-level database `grimorio-device` holds the profile registry and the active
  profile id. Each profile's owned data (cards, locations, decks, tombstones, sync meta) lives in its
  own database, `grimorio-profile-{profileId}`, with the same stores as today's `grimorio` database.
  `CardService`, `StorageLocationService` and `DeckService` keep their current shape (signal state,
  `whenReady()`, `flush()`, serialized write queue) and gain one method, `load(profileId | null)`. It
  flushes pending writes, clears the signal **synchronously**, points the store at the new database
  (or none), and rehydrates.
- **Rationale**: No row can leak across profiles by construction (SC-002). Services and the reconciler
  don't need a `profileId` filter on every read. Sign-out is just `load(null)`, and a future "delete
  profile" (FR-010, deferred) becomes `deleteDB`. It keeps Principle VI's service shape intact.
- **Alternatives rejected**:
  - *A `profileId` field on every row plus an index*: every read path in legacy screens would need a
    filter, and one missed filter leaks data.
  - *Separate object stores per profile in one database*: needs a schema version bump for every new
    profile.

## R2. Clean start and legacy local data

- **Decision**: No migration. On startup, a one-time idempotent cleanup deletes the legacy `grimorio`
  IndexedDB database, the legacy `grimorio.themeColors` localStorage key and the legacy Supabase
  session key (`sb-hyzbkxraanzhdyhtnadf-auth-token`). It also deletes
  `local-storage-migration.ts` and its spec.
- **Rationale**: The spec requires a clean start (Assumptions, "pre-profile data is not moved"). A
  leftover global session or theme would break the Default Rule, because it would show colors that
  belong to no active profile.

## R3. Local password storage

- **Decision**: PBKDF2-HMAC-SHA-256 through WebCrypto (`crypto.subtle`), with a random 16-byte salt and
  600,000 iterations (OWASP 2023). Each profile record stores `{ algo, iterations, salt, hash }` as
  base64. Verification compares in constant time over the derived bytes. The iteration count is read
  from an injection token, so tests use a small value.
- **Rationale**: FR-009 requires that passwords are never stored in a revealing form. It needs no new
  dependency and works offline. Profile locking is a privacy convenience between people on one device
  (spec Assumptions), not protection against someone with device access, so a standard KDF is
  enough. A derivation of ~0.5–1.5 s on a mid-range phone fits inside SC-003's 10 s switch budget.
- **Alternatives rejected**:
  - *Argon2/bcrypt via WASM*: a new dependency and bundle weight, for no benefit under this threat
    model.
  - *Plain SHA-256*: fails FR-009's spirit, because it is fast to brute-force.
- **Test note**: jsdom's `crypto` may lack `subtle`. `src/test-setup.ts` assigns
  `globalThis.crypto = require('node:crypto').webcrypto` when `crypto.subtle` is undefined.

## R4. One Supabase auth session per profile

- **Decision**: `CloudClientFactory` creates one `SupabaseClient` per linked profile, each with
  `auth: { storageKey: 'grm-cloud:{profileId}', persistSession: true, autoRefreshToken: false,
  detectSessionInUrl: false }`. Only the active profile's client runs `auth.startAutoRefresh()`.
  Switching or signing out calls `stopAutoRefresh()` on the old client and never `signOut()`, so each
  profile keeps its own sign-in (FR-016). Cloud sign-in from the *device*/*gate* context, before any
  profile exists, uses a transient client with in-memory storage. On setup, its session is moved onto
  the new profile's client with `auth.setSession(...)`.
  - The shared catalog client (`SUPABASE_CLIENT`, used by `CardLookupService`) becomes
    anonymous-only: `persistSession: false`, `autoRefreshToken: false`, and a distinct `storageKey`.
- **Rationale**: FR-016 requires per-profile sign-ins that survive switching, sign-out and restarts.
  supabase-js only warns about multiple GoTrue clients when they share a storage key, so distinct keys
  are the supported pattern.
- **Unlink / wrong-account cleanup**: `auth.signOut({ scope: 'local' })`. The default `global` scope
  would also revoke the account's sessions on the person's other devices.

## R5. Detecting an expired cloud sign-in (FR-032)

- **Decision**: A profile is marked `needsReauth` when:
  - its client emits `SIGNED_OUT` without an unlink in progress, or
  - a refresh or sync request fails with an auth error (`session_not_found`,
    `refresh_token_not_found`, `refresh_token_already_used`, or HTTP 401/403 with `bad_jwt`).

  Automatic sync then pauses silently. "Conta na nuvem" and "Sincronizar agora" route to the
  `reauth` phase. After a successful re-auth, the flag is cleared and a sync runs
  ("Sincronização retomada").
- **Rationale**: This matches spec edge cases ("cloud password changed elsewhere") without
  interrupting local use.

## R6. Account label and saved colors: `user_metadata`

- **Decision**: The account stores `user_metadata.grm_label` (the profile name) and
  `user_metadata.grm_colors` (`Color[]`, 1–3, in pick order).
  - On link or sign-up, the label is always overwritten with the linking profile's name. Colors are
    read first: if present, they replace the profile's colors ("Conta vinculada" + ripple), and if
    absent the profile's colors are written ("Conta criada" / linked without a color change).
  - On new-device setup, the label pre-fills the name field and the colors seed the new profile.
- **Rationale**: This is per-account data with no need to be queried across users. `user_metadata` is
  writable by the account owner through `auth.updateUser`, needs no table, grant or RLS, and arrives
  with the sign-in response.
- **Alternatives rejected**: *a new `account_identity` table*, which adds a migration, grants and
  RLS for two fields.
- **Legacy keys** `username` and `themeColors` are not read. The legacy `public.profiles` table and
  its `sync_profile_username` trigger are dropped (R10).

## R7. Password reset by 6-digit code (FR-022–FR-024)

- **Decision**:
  1. Call `auth.resetPasswordForEmail(email)`. The hosted "Reset password" email template is changed
     to show `{{ .Token }}` (PT-BR text, no link).
  2. Call `auth.verifyOtp({ email, token, type: 'recovery' })`, which yields a session.
  3. Call `auth.updateUser({ password })`.
  4. Continue as a cloud sign-in: link, setup, reauth or recover, depending on `backTarget`/context,
     as in the prototype's `afterCloudSignIn`.
- **Same response for unknown e-mails**: `resetPasswordForEmail` already succeeds for unknown
  addresses, and the UI always advances to `reset-code` on success.
- **Ops prerequisites** (recorded in [contracts/supabase.md](contracts/supabase.md)):
  - custom SMTP, because the built-in sender only reaches project members (spec Assumptions);
  - email OTP length = 6;
  - OTP expiry ≤ 1 h;
  - the minimum interval between e-mails to one user ≤ 30 s, so the UI's 30 s cooldown never hits a
    server-side 429. The UI still maps `over_email_send_rate_limit` to the generic message.
- **Alternatives rejected**: *a magic link*. The spec requires a code typed into the app.

## R8. Backend error → PT-BR mapping (FR-027, Principle II)

- **Decision**: A pure `mapCloudError(error, context)` in `src/app/core/utils/cloud-error.util.ts`
  returns a typed result `{ kind: 'form' | 'field', field?, message }`. It keys on `AuthError.code`:
  - `invalid_credentials` → "E-mail ou senha incorretos."
  - `user_already_exists` / `email_exists` → the e-mail field "Esse e-mail já está em uso." plus the
    in-use link
  - `otp_expired` / `invalid_otp` / `otp_disabled` → the code field "Código incorreto ou expirado.
    Peça um novo código."
  - `weak_password` → "Use pelo menos 8 caracteres."
  - `AuthRetryableFetchError`, `TypeError` fetch failures, or `navigator.onLine === false` → the
    offline message
  - anything else → the generic fallback

  Raw `error.message` is never shown.
- **Offline precheck**: `ConnectivityService.online` (a signal backed by `navigator.onLine` and the
  `online`/`offline` events) is checked before every cloud action.

## R9. Account already linked on this device (FR-033)

- **Decision**: After a successful cloud sign-in (in any context), the registry is searched for
  another profile whose `cloud.userId === session.user.id`. If one is found, the transient session is
  discarded (`signOut({ scope: 'local' })`) and the form error names that profile. In the *link*
  context, the same user id on the *same* profile (a re-link after an expired sign-in) is allowed.

## R10. Supabase schema changes

- **Decision**: One migration (full SQL in [contracts/supabase.md](contracts/supabase.md)):
  - Drop the legacy `sync_profile_username` trigger and function, `public.profiles`, and the
    `email_for_identifier` and `delete_current_user` RPCs. Drop the unused
    `set_collection_items_updated_at` function.
  - Change the primary keys of `storage_locations` and `card_entries` to `(user_id, id)`, and the
    foreign keys to composite `(user_id, location_id)` / `(user_id, parent_id)`.
  - Existing owner-only RLS policies and `authenticated` grants stay unchanged (verified live).
    `updated_at` is already `NOT NULL DEFAULT now()`.
  - Clean-start wipe of `card_entries`, `storage_locations` and `auth.users`, run as a separate,
    explicitly confirmed ops step, not inside the migration.
- **Rationale for composite keys**: A profile can be unlinked and then linked to a *different*
  account. Its rows keep their UUIDs, and with a single-column primary key the upsert would collide
  with rows owned by the first account, so RLS would reject the update. Composite keys make each
  account's copy independent.
- **Alternatives rejected**: *regenerating ids on link*, which breaks the per-item merge that FR-017
  requires.

## R11. When sync runs (FR-016a)

- **Decision**: `SyncService` is rewritten to take the active profile's cloud client and user id
  from `ProfileSessionService`. It keeps the existing `reconcileEntities` per-item last-write-wins
  rule for locations and then cards. A `SyncScheduler` triggers it:
  - on link, setup, unlock of a linked profile, and reauth — awaited by the modal's sync line;
  - within ≤ 60 s of a local change while online, using a 15 s debounce with a 60 s max-wait, driven
    by a `changeCount` signal that each entity service bumps on user mutations (never on
    `applySyncResult`);
  - on the `online` event when changes are pending;
  - manually, through "Sincronizar agora".

  Syncs are single-flight. A sync that started for profile A is discarded if the active profile
  changes before it applies results (a generation token). Offline or `needsReauth` makes the trigger
  a no-op; pending changes stay pending.
- **Scope**: Decks stay local-only (unchanged; the prototype deck tables were dropped earlier). The
  spec reuses the existing sync rule and only adds when sync runs.
- **Alternatives rejected**: *Supabase Realtime* — out of scope; sync stays pull/push.

## R12. Gating core routes (FR-001)

- **Decision**: A functional `profileGuard` (`CanActivateFn`) on `collection`, `collection/import`,
  `collection/:id`, `decks` and `decks/:id`.
  - If a profile is active, it returns `true`.
  - Otherwise it awaits `EntryModalService.open({ context: device|gate })`, which resolves when the
    modal closes. It returns `true` if a profile became active ("return to where they were headed").
    If not, it returns `false` when the router has already navigated (the person stays where they
    were), or `UrlTree('/')` on the initial navigation (a direct link or reload lands on Home).
  - Signing out, or switching while on a gated route, re-runs the current route's guards with
    `router.navigateByUrl(router.url, { onSameUrlNavigation: 'reload' })`. With no profile, it lands
    on Home.
  - `/profile` becomes `{ path: 'profile', redirectTo: '' }`, and the `Profile` view and `authGuard`
    are deleted (FR-030).
- **Rationale**: Gated content never renders, and there is one place to list which routes are gated.

## R13. Theming: identity → roles on a themed root

- **Decision**: `IdentityService` exposes `activeColors` (the active profile's colors, or `null`) and
  `roles` (per DESIGN.md: primary/accent/tertiary with the tertiary → accent → primary fallback, or
  the default R → U → G when no profile is active).
  - The app root host sets `--theme-primary/-accent/-tertiary(-hover)` plus `data-theme-scope` and
    `data-grm`. Every new-system screen inherits from it.
  - The entry modal is its own themed root, colored by the identity in view (picks, hovered profile,
    cloud colors, or the active profile), per STATES.md's Colors column.
  - `ThemeService` is kept only as a thin legacy adapter: `roles()` in its current `ThemeRoles`
    shape, derived from `IdentityService`. Legacy components (nav bar, collection header, etc.) keep
    compiling, and they also stop showing a stale profile's colors. `toggle()`/`saveToAccount()` and
    the localStorage persistence are removed.
- **Rationale**: The tokens.css role chain must be redeclared on every themed root
  (`[data-theme-scope]`), as DESIGN.md requires. A `<dialog>` in the top layer still inherits custom
  properties from its DOM ancestors.

## R14. Style foundation replacement (FR-039, SC-010)

- **Decision**:
  - `src/styles.scss` imports only new partials:
    - `_tokens.scss` — tokens.css ported verbatim, minus the font `@import`, which stays as the
      `<link>` in `index.html`: tokens, role chain, keyframes, reduced motion;
    - `_base.scss` — `box-sizing`, `body`, `a`, `::selection`, `:focus-visible`, `text-wrap: pretty`;
    - `_controls.scss` — class-based primitives: `.btn` (+ `--primary`/`--secondary`/`--ghost`/
      `--danger`), `.field` (label/input/helper/error), `.plate` (info plate + eyebrow),
      `.micro-label`, `.divider`, `.link-btn` (a text link with a 44px target).
  - Deleted: `_reset`, legacy `_tokens`, `_motion`, `_buttons`, `_forms`, `_fence`.
  - Kept: `_breakpoints` (640/960, reused by new UI), plus `_modal` and `_dropdown`, which are pure
    Sass mixin files that emit no global CSS. Legacy component stylesheets that `@use` them still
    compile, and those files get a header comment marking them legacy-only.
  - Primitives are class-based rather than bare tag selectors, so the new base doesn't silently
    restyle legacy components beyond page, text and typography (US9-2 accepts breakage but doesn't
    require it).
- **Rationale**: Deleting the mixin-only partials would break the build of 14 legacy component
  stylesheets. They contribute nothing to the global cascade, so SC-010 ("0 legacy global style
  rules or legacy tokens") holds.
- **Alternatives rejected**:
  - *Inlining the mixins into each legacy component*: that edits many frozen files for no gain.
  - *Keeping the fence*: nothing is left to fence.
- **Also**: `index.html` switches to `lang="pt-BR"`, and its font link is reduced to Grenze 600/700 +
  Karla 400–700, matching tokens.css.

## R15. Entry modal architecture

- **Decision**:
  - One `EntryModal` component, rendered once in `app.html`, driven by a root
    `EntryModalService.open(request): Promise<EntryModalResult>`.
  - Its state lives in a component-scoped `EntryFlowStore`, a signals-based `@Injectable` provided
    on the modal, which ports the prototype's state machine: `mode`/`step` → `phase`, `context`,
    `selectedProfile`, `hoveredProfile`, `backTarget`, fields, `fieldErrors`, `formError`, `loading`,
    `done`/`doneKind`, `syncing`, `cooldown`, `cloudColors`, `notice`.
  - Pure pieces live in `src/app/core/utils/`:
    - `entry-flow.util.ts` — phase derivation, validation, which fields and prompts show, busy labels;
    - `entry-copy.ts` — every PT-BR string from STATES.md;
    - `identity.util.ts` — tribe names, color names, roles.
  - Phase bodies are split into a few presentational child components (list, profile form, cloud
    form, reset, done), so each stylesheet stays under the 8 kB `anyComponentStyle` budget.
- **Fluid height**: A `ResizeObserver` on the form content and the prompt sets a `faceHeight` signal
  from `max(460, 12 + 44 + form + (prompt ? 16 + prompt : 0) + 24)`. It re-measures after
  `document.fonts.ready` and in `afterRenderEffect`.
- **Sparks**: A `SparkField` component with N signal-held spark specs. `(animationend)` rerolls one
  spark, and nothing renders under `prefers-reduced-motion`. It is a new-system component; the legacy
  `SparkRerollDirective` is left untouched.
- **Rationale**: This keeps the exhaustive STATES.md matrix testable as pure functions, since most
  test cases don't need to render anything.

## R16. Temporary top bar and profile button (FR-029)

- **Decision**:
  - A new `TopBar` component, a thin row above the existing layout holding the "Grimorio" wordmark
    (role-primary, Grenze 700) and a temporary `ProfileButton`.
  - The button shows "{P} · Vinculado à nuvem" / "{P} · Só neste aparelho" / "Nenhum perfil ativo".
  - With an active profile, the button toggles a native `popover` menu with "Trocar perfil", "Conta
    na nuvem" and "Sincronizar agora" (linked only). The menu also shows the sync status text:
    "Sincronizando…", "Sincronizado agora", the offline message or the generic error.
  - The button and menu are deliberately unstyled beyond the 44px target, as FR-029 exempts them.
  - The legacy `NavBar` loses `AuthControl` and `SyncIndicator` (deleted with the legacy auth UI) and
    its `/profile` link (FR-030). Nothing else in it is touched.
- **DESIGN.md gap**: The top bar itself (not the placeholder button) is new UI built on the new
  foundation, and DESIGN.md doesn't describe an app-shell bar. Per Principle V, a short "App top bar"
  entry is added to DESIGN.md before it is built: page background, 1px bottom hairline, the wordmark
  per the Typography table, 44px minimum height, and horizontal padding `space-4`. No new tokens.
