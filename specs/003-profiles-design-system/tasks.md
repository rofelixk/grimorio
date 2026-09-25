---

description: "Task list for spec 003 — Profiles, Accounts and the New Design System"
---

# Tasks: Profiles, Accounts and the New Design System

**Input**: Design documents from `specs/003-profiles-design-system/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R16), data-model.md, contracts/services.md,
contracts/supabase.md, ui.md, quickstart.md. Copy and phase matrix: `design_handoff_auth_profiles/STATES.md`.
Visual rules: root `DESIGN.md` + `design_handoff_auth_profiles/tokens.css`. Behavior reference only:
`design_handoff_auth_profiles/prototype/`.

**Tests**: Included only where quickstart.md "Automated checks" lists them (pure utils, `ProfileStore`,
entity-service `load()` isolation, `profileGuard`, `SyncScheduler`). Legacy specs broken by deletions
are deleted or updated with the code they cover.

**Organization**: Grouped by user story. Story order follows priority: P1 (US1, US2, US8) → P2 (US3,
US4, US9) → P3 (US5, US6). US7 (delete profile) is deferred by the spec (FR-010) and has no tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1…US9 for story phases; none for Setup, Foundational and Polish

## Path Conventions

Single Angular project. Aliases: `@models/*`, `@services/*`, `@testing/*` → `src/app/core/…`;
`@shared/*` → `src/app/shared/…`. Every new component is standalone + `ChangeDetectionStrategy.OnPush`,
uses signals (`computed`/`linkedSignal`/`effect`), and keeps its compiled stylesheet under the 8 kB
`anyComponentStyle` budget. New UI lives under a `[data-grm]` root and follows the root `DESIGN.md` only
— never the legacy "Styling / design system" section of `architecture.md`.

---

## Phase 1: Setup

**Purpose**: Document gaps and page-level settings that every later phase assumes.

- [ ] T001 Add an "App top bar" entry to root `DESIGN.md` (R16): page background, 1px bottom hairline, the "Grimorio" wordmark per DESIGN.md's Typography table (Grenze 700, role-primary), 44px minimum height, horizontal padding `space-4`, no new tokens; state that the temporary profile button/menu inside it is exempt (FR-029)
- [ ] T002 [P] In `src/index.html` set `<html lang="pt-BR">` and reduce the Google Fonts `<link>` to Grenze 600/700 + Karla 400–700 (matching `tokens.css`), keeping `display=swap`
- [ ] T003 [P] Add a header comment to `src/styles/_modal.scss` and `src/styles/_dropdown.scss` marking them legacy-only, mixin-only partials that must emit no global CSS and must not be used by new UI

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The new style foundation, the per-profile storage layer, the core profile/identity
services, the pure flow/copy utils, the design-system primitives and the modal shell. Also removes the
legacy auth/theme UI that would otherwise stop compiling once `ThemeService` shrinks.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Style foundation (FR-039, R14)

- [ ] T004 Replace the contents of `src/styles/_tokens.scss` with a verbatim port of `design_handoff_auth_profiles/tokens.css` minus its font `@import`: all tokens, the role chain redeclared on `[data-theme-scope]`, the recipe variables (glow, wash, ring, halo), all keyframes, and the reduced-motion rule `[data-theme-scope] * { animation: none }` under `prefers-reduced-motion: reduce`
- [ ] T005 [P] Create `src/styles/_base.scss`: `*, *::before, *::after { box-sizing: border-box }`, `body` (margin 0, page background, text color, `--font-sans`, base size/line-height from tokens), `a`, `::selection`, `:focus-visible` ring from tokens, `text-wrap: pretty` on text blocks — no bare `button`/`input` rules
- [ ] T006 [P] Create `src/styles/_controls.scss` with class-based primitives per DESIGN.md: `.btn` + `.btn--primary`/`--secondary`/`--ghost`/`--danger` (busy/disabled state), `.field` (label, input, helper, error; error hides helper), `.plate` (info plate) + `.eyebrow`, `.micro-label`, `.divider`, `.link-btn` (text link with a 44×44 minimum target); every interactive class has a ≥44px target (FR-040) and colors only from `--role-*` (FR-041)
- [ ] T007 Rewrite `src/styles.scss` to `@use` only `styles/tokens`, `styles/base`, `styles/controls` (drop its local `body` rule), then delete `src/styles/_reset.scss`, `src/styles/_motion.scss`, `src/styles/_buttons.scss`, `src/styles/_forms.scss` and `src/styles/_fence.scss` (depends on T004–T006)

### Models and pure utils

- [ ] T008 [P] Create `src/app/core/models/profile.model.ts`: re-export `Color` (`'W'|'U'|'B'|'R'|'G'`) from `card.model`; `CloudLink { userId: string; email: string; needsReauth: boolean }`; `PasswordHash { algo: 'PBKDF2-SHA256'; iterations: number; salt: string /*b64*/; hash: string /*b64*/ }`; `ProfileRecord { id; name; colors; password; cloud: CloudLink | null; createdAt }` with doc comments quoting the rules — name "3–20 chars, `^[A-Za-z0-9_.-]+$`, unique per device compared with `toLowerCase()`; trimmed before storing", colors "1–3 distinct values of `W U B R G`, pick order"; and `ProfileSummary` = `ProfileRecord` without `password`
- [ ] T009 [P] Create `src/app/core/utils/password-hash.util.ts` (R3): `hashPassword(password, iterations): Promise<PasswordHash>` using WebCrypto PBKDF2-HMAC-SHA-256 with a random 16-byte salt, base64 salt/hash; `verifyPassword(password, stored): Promise<boolean>` re-deriving with the stored iterations and comparing the derived bytes in constant time
- [ ] T010 [P] Create `src/app/core/utils/identity.util.ts` (data-model ColorIdentity): `DEFAULT_IDENTITY = ['R','U','G']`; `rolesFor(colors)` → `{ primary, primaryHover, accent, accentHover, tertiary, tertiaryHover }` hex strings from the `--identity-*` base/hover values in tokens.css, with `accent = colors[1] ?? primary`, `tertiary = colors[2] ?? accent`; `tribeName(colors)` keyed by the colors sorted in W U B R G order using all 25 entries of DESIGN.md's tribe table (e.g. `UR` → Izzet, `WUB` → Esper, `R` → Mono-vermelho); `colorNames(colors)` in pick order joined with " · " (Branco, Azul, Preto, Vermelho, Verde — "Preto", never "Roxo"); `COLOR_NAME` map for swatch labels
- [ ] T011 [P] Create `src/app/core/utils/cloud-error.util.ts` (R8, contracts/services.md): export `FieldKey = 'email'|'pw'|'code'|'user'`, `Failure = { kind: 'field'; field; message; emailInUse?: true } | { kind: 'form'; message }`, and `mapCloudError(error: unknown): Failure` keyed on `AuthError.code`: `invalid_credentials` → form "E-mail ou senha incorretos."; `user_already_exists`/`email_exists` → email field "Esse e-mail já está em uso." with `emailInUse: true`; `otp_expired`/`invalid_otp`/`otp_disabled` → code field "Código incorreto ou expirado. Peça um novo código."; `weak_password` → pw field "Use pelo menos 8 caracteres."; `AuthRetryableFetchError`, fetch `TypeError`, or `navigator.onLine === false` → form "Sem conexão. A conta na nuvem precisa de internet — o resto do app continua funcionando."; anything else (incl. `over_email_send_rate_limit`) → form "Algo deu errado. Tente de novo em instantes."; never returns raw `error.message`
- [ ] T012 [P] Create `src/app/core/utils/entry-copy.ts` holding every PT-BR string from `STATES.md` verbatim (titles/subtitles per phase and context, field labels, helpers, busy labels, bottom prompts and their link labels, success titles/bodies incl. "Perfil trocado" and the "As cores da conta ({Tribe}) passaram a valer para este perfil." sentence, sync line labels "Sincronizando…"/"Sincronizado agora"/"Baixando sua coleção…"/"Coleção baixada", the sign-out notice, every error message, "Em uso", "Vinculado à nuvem", "Só neste aparelho", "+ Criar novo perfil", "Sair de {P}", "Fechar", "Concluir"), plus the wheel captions from the prototype's `leftCaption` rules and the FR-029 placeholder strings from ui.md §7; placeholders as functions taking `{P}`, `{email}`, `{Tribe}`, `{previous}`, `{nome}`, `{n}`
- [ ] T013 Create `src/app/core/utils/entry-flow.util.ts` (R15) using `entry-copy.ts`: `EntryPhase` union (`list`, `unlock`, `localreset-warn`, `localreset-newpw`, `profile`, `in`, `up`, `reset-email`, `reset-code`, `setup`, `reauth`, `recover-form`, `recover-newpw`, `unlink`) and `DoneKind` (`unlocked`, `profiled`, `linked`, `created`, `setup`, `reauthed`, `recovered`, `unlinked`); pure functions `titleFor`, `subtitleFor`, `fieldsFor`, `primaryLabel`/`busyLabel`, `promptFor(phase, context)` (incl. the device vs gate variants), `colorSourceFor(phase, context)` (profile/picks/cloud/default per STATES Colors column); and `validate(phase, fields, { isNameTaken })` implementing data-model's table verbatim — E-mail (`in`,`up`,`reset-email`): empty → "Digite seu e-mail.", not `^\S+@\S+\.\S+$` → "Esse e-mail não parece válido." (trimmed, lowercased); Senha: empty → "Digite sua senha."; new password (`up`,`reset-code`,`setup`,`recover-newpw`,`profile`,`localreset-newpw`): length < 8 → "Use pelo menos 8 caracteres."; Nome do perfil (`profile`,`setup`): length ∉ 3–20 → "Use de 3 a 20 caracteres.", bad chars → "Use só letras, números, _ . ou -.", taken (case-insensitive) → "Esse nome já está em uso neste aparelho."; Código (`reset-code`): not `^\d{6}$` → "Digite os 6 dígitos do código." (depends on T012)
- [ ] T014 [P] Create `src/app/core/services/connectivity.service.ts`: `online` signal from `navigator.onLine`, updated by `online`/`offline` window events

### Tests for the pure utils

- [ ] T015 [P] Create `src/app/core/utils/password-hash.util.spec.ts`: round-trip verify, wrong password fails, distinct salts per hash, stored iterations honored (use a small iteration count)
- [ ] T016 [P] Create `src/app/core/utils/identity.util.spec.ts`: all 25 tribe names (order-independent input), role fallback chain for 1/2/3 colors, color names in pick order, default identity R→U→G
- [ ] T017 [P] Create `src/app/core/utils/cloud-error.util.spec.ts`: every mapped code, the offline cases, the generic fallback, and that no result contains the input's raw message
- [ ] T018 [P] Create `src/app/core/utils/entry-flow.util.spec.ts`: every validation rule/message above, prompt per phase × context, busy labels, color source per phase

### Per-profile storage (R1, R2)

- [ ] T019 Create `src/app/core/db/device-db.ts`: `grimorio-device` v1 with stores `profiles` (keyPath `id`, `ProfileRecord`) and `meta` (keyPath `key`, `{ key: 'activeProfileId', value: string | null }`); memoized `getDeviceDb()` plus a test-only reset
- [ ] T020 Rename `src/app/core/db/grimorio-db.ts` → `src/app/core/db/profile-db.ts`: `openProfileDb(profileId)` opens `grimorio-profile-{profileId}` v1 with the same stores as today (`cards`, `locations`, `decks`, `tombstones` with index `by-entity`, `meta`), no localStorage migration; `closeProfileDb()`; test-only `resetAllGrimorioDbsForTests()` deleting every `grimorio-*` database; move/rename `grimorio-db.spec.ts` → `profile-db.spec.ts` accordingly
- [ ] T021 Rebind `src/app/core/db/entity-store.ts` to the active profile database: add `setActiveProfileDb(profileId: string | null)`; every accessor uses the bound DB; with no bound profile reads return `[]`/`undefined` and writes reject (depends on T020)
- [ ] T022 Create `src/app/core/db/legacy-cleanup.ts` (R2): one-time, idempotent `runLegacyCleanup()` that deletes the `grimorio` IndexedDB and the localStorage keys `grimorio.themeColors` and `sb-hyzbkxraanzhdyhtnadf-auth-token`; delete `src/app/core/db/local-storage-migration.ts` and `local-storage-migration.spec.ts`
- [ ] T023 Update `src/test-setup.ts`: if `globalThis.crypto?.subtle` is undefined assign `globalThis.crypto = (await import('node:crypto')).webcrypto`; `beforeEach` awaits `resetAllGrimorioDbsForTests()` and the device-db reset (depends on T019, T020)
- [ ] T024 Add `load(profileId: string | null): Promise<void>` and `readonly changeCount: Signal<number>` to `src/app/core/services/card.service.ts`, `src/app/core/services/storage-location.service.ts` and `src/app/core/services/deck.service.ts`: constructors no longer hydrate on their own; `load` = flush pending writes → clear the state signal synchronously → `setActiveProfileDb` → hydrate; `whenReady()` resolves after the latest `load`; `changeCount` bumps on `add`/`addMany`/`update`/`remove` only, never on `applySyncResult`; update the three existing specs to call `load('p1')` first (depends on T021)
- [ ] T025 [P] Create `src/app/core/services/entity-load-isolation.spec.ts`: data written under profile A is invisible after `load('B')` and after `load(null)`, and reappears after `load('A')`; `changeCount` ignores `applySyncResult` (depends on T024)

### Core profile and identity services

- [ ] T026 Create `src/app/core/services/profile-store.service.ts` (contracts/services.md, Principle VI): `PBKDF2_ITERATIONS` `InjectionToken<number>` defaulting to 600000; signal `profiles()` of `ProfileSummary` sorted by `createdAt`, hydrated from `grimorio-device`; `whenReady()`, `flush()`, serialized write queue; `isNameTaken(name, exceptId?)` (trimmed, case-insensitive); `create({ name, password, colors })` (UUID id, trimmed name, hashed password, `cloud: null`); `verifyPassword`; `setPassword`; `setColors`; `setCloud`; `findByCloudUser(userId)`; password hash never leaves the service (FR-009) (depends on T008, T009, T019)
- [ ] T027 [P] Create `src/app/core/services/profile-store.service.spec.ts`: case-insensitive/trimmed uniqueness, hash verification (small iterations via the token), `profiles()` never exposes `password`, persistence across a fresh instance
- [ ] T028 Create `src/app/core/services/profile-session.service.ts`: `active` signal; `whenReady()` restores `meta.activeProfileId` (US1-5) and `load`s the three entity services; `activate(id)` and `signOut()` implement data-model "Entering active(P)" steps 2–4 (flush + `load(null)`, `load(P.id)`, write `meta.activeProfileId`), leaving explicit hook points for steps 1, 5, 6 (cloud auto-refresh and sync, wired in US4); after a change, re-run the current route's guards via `router.navigateByUrl(router.url, { onSameUrlNavigation: 'reload' })` (R12) (depends on T024, T026)
- [ ] T029 [P] Create `src/app/core/services/identity.service.ts`: `activeColors` (`Color[] | null` from `ProfileSessionService.active()`), `roles` = `rolesFor(activeColors() ?? DEFAULT_IDENTITY)` (FR-012) (depends on T010, T028)
- [ ] T030 Reduce `src/app/core/services/theme.service.ts` to a legacy adapter (R13): keep `roles()` in its current `ThemeRoles` shape and `colors()`, both derived from `IdentityService`; keep exporting `THEME_COLOR_PALETTE`, `THEME_COLOR_ORDER`, `DEFAULT_THEME_COLORS`; remove `toggle()`, `saveToAccount()`, the `grimorio.themeColors` persistence and any `AuthService` use; rewrite `theme.service.spec.ts` to cover the adapter only (depends on T029)
- [ ] T031 [P] Make `src/app/core/supabase-client.ts`'s `SUPABASE_CLIENT` anonymous-only (R4): `auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'grm-catalog' }`
- [ ] T032 Update `src/app/app.config.ts`'s `provideAppInitializer`: `await runLegacyCleanup()` → `await ProfileStore.whenReady()` → `await ProfileSessionService.whenReady()` (which loads the entity services); drop the direct entity `whenReady()` calls (depends on T022, T026, T028)

### Legacy removal (keeps the build green)

- [ ] T033 Delete the legacy auth/theme UI with their specs: `src/app/shared/auth/auth-control/`, `src/app/shared/auth/auth-modal/`, `src/app/shared/layout/sync-indicator/`, `src/app/shared/effects/color-theme-picker/`, `src/app/views/profile/`; remove their exports from `src/app/shared/index.ts`
- [ ] T034 Delete `src/app/core/services/auth.service.ts` (+spec), `src/app/core/guards/auth.guard.ts` (+spec) and the legacy `src/app/core/services/sync.service.ts` (rewritten in US4); remove every remaining import of them (grep `src/`) so `npm run build` passes (depends on T033)
- [ ] T035 In `src/app/shared/layout/nav-bar/nav-bar.ts`/`.html` remove `AuthControl`, `SyncIndicator` and the `/profile` link — nothing else in it changes (R16)
- [ ] T036 In `src/app/app.routes.ts` replace the `profile` route with `{ path: 'profile', redirectTo: '' }` and drop the `Profile`/`authGuard` imports (FR-030) (depends on T033, T034)

### Design-system primitives (`src/app/shared/ds/`, ui.md §5)

- [ ] T037 [P] Create `src/app/shared/ds/themed-modal/` (`themed-modal.ts/.html/.scss`): native `<dialog>` with `showModal()`/`close()`, `data-grm` + `data-theme-scope`, `--theme-primary/-accent/-tertiary(-hover)` inputs, conic ring with 2px gap, halo, face; desktop face 880px grid `[400px | 1fr]` with fluid height (≥460px, height transition 0.24s kept under reduced motion); mobile (< 640px, `bp.mobile`) full-bleed with safe-area padding and the ring gap on the screen edge; emits `closed` on ✕/Esc/backdrop click; restores focus to the opener on close
- [ ] T038 [P] Create `src/app/shared/ds/spark-field/`: `count` and `direction` (`outward`|`inward`) inputs, signal-held spark specs, `(animationend)` rerolls one spark, renders nothing under `prefers-reduced-motion` (via `matchMedia` signal)
- [ ] T039 [P] Create `src/app/shared/ds/identity-wheel/`: `mode` (`picker`|`display`), `picks` model, `neutral` input (default identity → neutral wheel with the "Grimorio" wordmark), tribe name + color names beneath (FR-034), ripple on newly lit colors, name blur-in; picker swatches are `<button aria-pressed aria-label="Branco|Azul|Preto|Vermelho|Verde">`, at most 3 picks, the last pick can't be removed and a 4th is locked via `aria-disabled="true"` (not `disabled`); size input (300 desktop / 240 mobile)
- [ ] T040 [P] Create `src/app/shared/ds/mini-wheel/` (small display-only wheel for list rows) and `src/app/shared/ds/identity-chip/` (dot + "{P} · {Tribe}" for the mobile header)
- [ ] T041 [P] Create `src/app/shared/ds/profile-row/`: `<button>` inside a `role="listitem"` wrapper showing name, mini wheel, tribe name and "Vinculado à nuvem"/"Só neste aparelho"; `active` input adds "Em uso", `aria-current="true"` and `aria-disabled="true"`; `dashed` variant for "+ Criar novo perfil"; 44px min height
- [ ] T042 [P] Create `src/app/shared/ds/sync-line/`: `role="status"`; spinner + busy label while pending, role-accent dot + done label when done, plain status text for the offline/generic failure (no success/warning colors, FR-041)

### Entry modal shell (R15)

- [ ] T043 Create `src/app/core/services/entry-modal.service.ts`: `EntryContext`, `EntryStart`, `EntryRequest`, `EntryResult` per contracts/services.md; `open(request?)` defaults context to `device` if `ProfileStore.profiles()` is empty else `gate`, resolves with `{ activeProfileId }` on close; `isOpen` signal; a second `open` while open returns the pending promise
- [ ] T044 Create `src/app/shared/auth/entry-modal/entry-flow.store.ts`: component-provided signals store porting the prototype's state machine — `context`, `phase` (derived from mode/step), `selectedProfile`, `hoveredProfile`, `backTarget`, fields (`name`, `email`, `pw`, `code`), `fieldErrors`, `formError`, `loading`, `done`/`doneKind`, `syncing`, `cooldown`, `cloudColors`, `picks`, `notice`, `previousProfileName`; methods `start(request)`, `go(phase)` (clears errors and password/code fields, keeps e-mail — FR-028), `editField(key, value)` (clears only that field's error — FR-005), `reset()`; a `submit()` dispatcher that runs `validate()` first and locks re-entry while `loading` (double-submit edge case); a `colors` computed per `colorSourceFor` (picks, hovered profile, cloud colors, active/selected profile, or default) (depends on T013)
- [ ] T045 Create `src/app/shared/auth/entry-modal/entry-modal.ts/.html/.scss`: provides `EntryFlowStore`, renders `ThemedModal` bound to the store's `colors` roles; desktop identity pane (wash, `IdentityWheel` display 300, tribe + subline, 2-line caption) + form pane (close row with ✕ `aria-label="Fechar"`, Grenze title/subtitle, phase body slot, form error `role="alert"` above the primary, full-width primary with busy label, secondary items, hairline, bottom prompt "Pergunta? **Link**"); mobile header (Grimorio + `IdentityChip` + ✕), scrolling body, prompt pinned last; `SparkField` 20 outward (desktop) / 12 inward (mobile); fluid height via `ResizeObserver` on form + prompt → `faceHeight = max(460, 12 + 44 + form + (prompt ? 16 + prompt : 0) + 24)`, re-measured after `document.fonts.ready` and in `afterRenderEffect`; focus moves to the first field (or first row in `list`) on open; dismiss resets the store and resolves the service (depends on T037–T044)
- [ ] T046 Create `src/app/shared/auth/entry-modal/done-panel/`: done title, body, optional `SyncLine`, optional secondary button, **Concluir** (closes and resets — FR-037); prompt hidden on success screens
- [ ] T047 Render `<app-entry-modal />` once in `src/app/app.html` and import it in `src/app/app.ts`; export the new ds/auth components from `src/app/shared/index.ts`

**Checkpoint**: `npm run lint`, `npm test`, `npm run build` pass; the modal can be opened programmatically and shows an empty shell tinted R→U→G.

---

## Phase 3: User Story 1 — Create a local profile and use the app (Priority: P1) 🎯 MVP

**Goal**: Offline creation of a profile (name, password, 1–3 colors) that becomes active, persists across
restarts, and unlocks the gated routes.

**Independent Test**: No profiles, offline → open `/collection` → modal on "Criar perfil" (device) → create
with two colors → "Perfil criado" → Concluir lands on `/collection`; reload keeps it active (quickstart #1–3).

- [ ] T048 [P] [US1] Create `src/app/shared/auth/entry-modal/profile-form/` (phases `profile`, `unlock`, `localreset-newpw`, `recover-newpw`): for `profile` — Nome do perfil (`autocomplete="username"`, helper) → Senha (`autocomplete="new-password"`, helper) → on mobile only the "SUA IDENTIDADE" eyebrow + `IdentityWheel` picker 240 + helper "Escolha até 3 cores. …"; fields use `.field` with the error replacing the helper; inputs call `store.editField`
- [ ] T049 [US1] In `entry-flow.store.ts` implement the `profile` submit: `validate` (name "3–20 chars, `^[A-Za-z0-9_.-]+$`, unique per device compared with `toLowerCase()`"; password "length < 8 → 'Use pelo menos 8 caracteres.'") → `ProfileStore.create({ name, password, colors: picks })` → `ProfileSessionService.activate(id)` → `done('profiled')`; busy label "Criando perfil…"; works offline (FR-021) (depends on T048)
- [ ] T050 [US1] Wire the desktop identity pane to show the `IdentityWheel` in picker mode during `profile` and retint the whole modal live to the picks (US1-3); default picks start empty-safe (at least one always picked per the picker rules)
- [ ] T051 [US1] Implement the `profile` bottom prompts per context — device: "Já tem conta na nuvem? **Entrar**" → `in`; gate: "Já tem um perfil aqui? **Ver perfis**" → `list` — and the "Perfil criado" done screen body (its "Vincular conta na nuvem" secondary is wired in US4, T085)
- [ ] T052 [US1] Create `src/app/core/guards/profile.guard.ts` (R12): returns `true` with an active profile; otherwise awaits `EntryModalService.open({ context: profiles.length ? 'gate' : 'device' })` and returns `true` if a profile became active, `false` if the router had already navigated, or `router.parseUrl('/')` on the initial navigation
- [ ] T053 [US1] Add `canActivate: [profileGuard]` to `collection`, `collection/import`, `collection/:id`, `decks` and `decks/:id` in `src/app/app.routes.ts` (FR-001)
- [ ] T054 [P] [US1] Create `src/app/core/guards/profile.guard.spec.ts` covering the three outcomes (active → true; closed after a profile became active → true; closed without one → false after a prior navigation, `UrlTree('/')` on the initial one), with `EntryModalService` stubbed via a TestBed provider

**Checkpoint**: US1 works standalone — a profile can be created offline and persists across reloads.

---

## Phase 4: User Story 2 — Share a device between several people (Priority: P1)

**Goal**: Profile list with hover previews, unlock, switch, sign out, and the temporary top-bar button/menu.

**Independent Test**: Two profiles with different colors and seeded per-profile data (DevTools) → switch via
"Trocar perfil" → each shows only its own data and colors; signing out hides both (quickstart #4–6).

- [ ] T055 [P] [US2] Create `src/app/shared/auth/entry-modal/profile-list/`: optional notice plate (`role="status"`, "Você saiu de {P}. Os dados desse perfil ficaram ocultos."), `role="list"` of `ProfileRow`s with the active profile first marked "Em uso" and unpickable, the dashed "+ Criar novo perfil" row (→ `profile`, clears the preview), and "Sair de {P}" secondary below the list when a profile is active; row `mouseenter`/`focusin` sets `store.hoveredProfile`, the **list's** `mouseleave`/`focusout` (leaving the list as a whole, not a row) clears it without flicker (FR-031)
- [ ] T056 [US2] Implement the `list` titles/subtitles for signed-out vs active-profile variants and the prompt "Perfil em outro aparelho? **Entrar com conta na nuvem**" → `in`; colors: hovered/focused row, else active profile, else default with the wheel neutral
- [ ] T057 [US2] Implement `unlock` in `profile-form` and the store: title {P}, subtitle "{Tribe} · Vinculado à nuvem" / "· Só neste aparelho"; Senha (`current-password`); "Esqueci minha senha" link (target wired in US6); prompt "Não é você? **Trocar de perfil**" → `list`; submit → `ProfileStore.verifyPassword` → wrong: field error "Senha incorreta." with no data change (US2-4) → right: `ProfileSessionService.activate` → `done('unlocked')` titled "Perfil desbloqueado", or "Perfil trocado" with "{P} está ativo. Os dados de {previous} ficaram ocultos." when switching; busy "Desbloqueando…"
- [ ] T058 [US2] Implement sign out in the store: "Sair de {P}" → busy "Saindo…" (700 ms minimum) → `ProfileSessionService.signOut()` → `list` (signed-out variant) with the notice and the default identity (FR-008)
- [ ] T059 [P] [US2] Create `src/app/shared/layout/top-bar/` (`top-bar.ts/.html/.scss`) per the DESIGN.md "App top bar" entry (T001): "Grimorio" wordmark (Grenze 700, role-primary) + `<app-profile-button />`; identical at every width
- [ ] T060 [P] [US2] Create `src/app/shared/auth/profile-button/` (temporary, unstyled beyond 44px targets, FR-029): label "Nenhum perfil ativo" / "{P} · Vinculado à nuvem" / "{P} · Só neste aparelho"; with no profile, click → `EntryModalService.open()` (gate or device); with a profile, toggles a native `popover` menu with "Trocar perfil" → `open({ context: 'gate', start: 'list' })` (the "Conta na nuvem" and "Sincronizar agora" items are added in US4, T086)
- [ ] T061 [US2] Update `src/app/app.html` to render `<app-top-bar />` above `.app-layout`, and `src/app/app.scss` so `.app-layout` height is `100dvh` minus the top bar height (legacy `--nav-bar-height` math left alone) (depends on T059)

**Checkpoint**: US1 + US2 work — create, list, preview, unlock, switch and sign out, all offline.

---

## Phase 5: User Story 8 — The app wears the active profile's colors (Priority: P1)

**Goal**: The app root and every new surface are tinted by the active profile's roles, or R→U→G with none;
reduced motion stops every decorative animation.

**Independent Test**: With two differently-colored profiles, the top bar and every modal screen retint on
switch; with none they use Vermelho → Azul → Verde and the wheel stays neutral (quickstart #6, #20).

- [ ] T062 [US8] In `src/app/app.ts` add `host: {}` bindings `data-grm`, `data-theme-scope`, and `[style.--theme-primary]`/`--theme-primary-hover`/`--theme-accent`/`--theme-accent-hover`/`--theme-tertiary`/`--theme-tertiary-hover` from `IdentityService.roles()` (R13)
- [ ] T063 [US8] Verify `EntryFlowStore.colors` follows STATES.md's Colors column for every phase (profile, picks, cloud, default; hover preview in `list`) and that the default identity never lights the wheel (neutral) nor shows as anyone's tribe (FR-012); fix mismatches in `entry-flow.store.ts`/`entry-flow.util.ts`
- [ ] T064 [US8] Reduced-motion audit of `themed-modal`, `spark-field`, `identity-wheel` and `top-bar` stylesheets: ring rotation, halo flicker, sparks, ripples and name blur-in all stop under `prefers-reduced-motion: reduce` while the fluid-height transition stays (US8-3, FR-040)
- [ ] T065 [US8] Confirm legacy components that read `ThemeService.roles()` now follow `IdentityService` (no stale profile colors after sign-out) by exercising sign-out in `theme.service.spec.ts`

**Checkpoint**: All P1 stories done — this is the MVP.

---

## Phase 6: User Story 3 — Use profile-free areas without any profile (Priority: P2)

**Goal**: Home and About (and future gameplay tools) never prompt for a profile.

**Independent Test**: With no active profile, open `/` and `/about` — no prompt, default identity
(quickstart #7).

- [ ] T066 [US3] Confirm `''` (Home) and `about` in `src/app/app.routes.ts` carry no guard, and that `src/app/views/home/home.html` shows no owned-card data and no links into `collection`/`decks` (FR-011a); remove any such link found
- [ ] T067 [P] [US3] Create `src/app/app.routes.spec.ts` asserting `''` and `about` have no `canActivate`, the five core routes have `profileGuard`, and `profile` redirects to `''`

**Checkpoint**: Profile-free areas verified.

---

## Phase 7: User Story 4 — Link a cloud account to sync a profile (Priority: P2)

**Goal**: Optional per-profile cloud accounts: sign-up, sign-in (link or new-device setup), reauth, unlink,
automatic and manual sync.

**Independent Test**: Link a profile to a new account on device 1; on device 2 sign in, set up the profile
and see its data and colors arrive (quickstart #8–15, #18–19).

### Backend prerequisites (need explicit user confirmation)

- [ ] T068 [US4] **Ask the user first**, then apply migration `003_profiles_accounts` from `contracts/supabase.md` §1 with the Supabase MCP `apply_migration` on project `hyzbkxraanzhdyhtnadf` (drops legacy trigger/functions/`public.profiles`; composite PKs `(user_id, id)` and composite FKs); afterwards run `get_advisors` and confirm the existing owner-only RLS policies and `authenticated` grants on both tables are intact
- [ ] T069 [US4] **User action, destructive**: present the clean-start wipe SQL (`contracts/supabase.md` §2) and the Auth dashboard settings (§3: confirm email off, custom SMTP on, OTP length 6, OTP expiry ≤ 3600 s, e-mail interval ≤ 30 s, min password 8, PT-BR "Reset password" template with `{{ .Token }}`) and have the user run/confirm them — never run the wipe without explicit confirmation

### Services

- [ ] T070 [US4] Create `src/app/core/services/cloud-session.service.ts` (R4): `client(profileId)` lazily creates one `SupabaseClient` per linked profile with `auth: { storageKey: 'grm-cloud:{profileId}', persistSession: true, autoRefreshToken: false, detectSessionInUrl: false }`; a transient in-memory-storage client for device/gate sign-ins; `startAutoRefresh(profileId)`/`stopAutoRefresh(profileId)`; `removeSession(profileId)` clears the `grm-cloud:{id}` key; subscribe to `SIGNED_OUT` and, when no unlink is in progress, mark the profile `needsReauth` (R5)
- [ ] T071 [US4] Create `src/app/core/services/cloud-auth.service.ts` per contracts/services.md: every network method checks `ConnectivityService.online()` first and rejects with the offline `Failure`; all errors go through `mapCloudError`; `signIn`/`signUp` on the transient client return `CloudIdentity { userId, email, label?, colors? }` from `user_metadata.grm_label`/`grm_colors` (`signUp` passes `options.data: { grm_label, grm_colors }` when a profile is known); `linkPending(profileId, { writeColors })` runs the FR-033 check via `ProfileStore.findByCloudUser` (same profile allowed for re-link; otherwise `discardPending()` and form error "Essa conta já está vinculada ao perfil {nome} neste aparelho."), moves the session onto the profile client with `auth.setSession`, applies R6 (account colors replace the profile's if present — returns `colorsReplaced` — else writes the profile's colors; always writes `grm_label`), then `ProfileStore.setCloud`; `setupFromPending({ name, password })` creates + links + activates; `discardPending()` = `signOut({ scope: 'local' })`; `reauth`; `verifyLinkedAccount` (must match `cloud.userId`); `unlink` = `signOut({ scope: 'local' })` + `removeSession` + `setCloud(id, null)` without needing the network (FR-021) — never the default global scope
- [ ] T072 [US4] Rewrite `src/app/core/services/sync.service.ts` (R11): takes the active profile's client and `cloud.userId` from `ProfileSessionService`/`CloudSessionService`; reconciles locations then cards with the existing `reconcileEntities` (`src/app/core/utils/sync-reconcile.util.ts`); upserts with `onConflict: 'user_id,id'`; deletes filter `.eq('user_id', userId)`; single-flight `syncNow()`; generation token discards results if the active profile changed mid-sync; `state` (`'idle'|'syncing'|'done'|'offline'|'reauth'|'error'`) and `lastSyncedAt` persisted in the profile DB's `meta`; auth errors (`session_not_found`, `refresh_token_not_found`, `refresh_token_already_used`, 401/403 `bad_jwt`) set `needsReauth` and state `reauth`; offline or `needsReauth` makes it a no-op; decks never sync
- [ ] T073 [US4] Create `src/app/core/services/sync-scheduler.service.ts`: `effect` on the entity services' `changeCount()` with a 15 s debounce and 60 s max-wait → `syncNow()` when linked, online and not `needsReauth`; retry on the `online` event when changes are pending; started from `src/app/app.ts`
- [ ] T074 [P] [US4] Create `src/app/core/services/sync-scheduler.service.spec.ts` with fake timers: debounce fires 15 s after the last change, max-wait fires by 60 s under continuous changes, no sync while offline/unlinked/`needsReauth`, retry on `online`
- [ ] T075 [US4] Wire `ProfileSessionService` hook points (T028): step 1 `stopAutoRefresh` on the previous profile, step 5 `startAutoRefresh` for a linked profile, step 6 `SyncService.syncNow()` if linked and not `needsReauth`; ensure profile B's activation never touches A's client (US2-8)

### Modal phases

- [ ] T076 [P] [US4] Create `src/app/shared/auth/entry-modal/cloud-form/` (phases `in`, `up`, `setup`, `reauth`, `recover-form`, `unlink`): E-mail (`autocomplete="email"`), Senha (`current-password` for in/reauth/recover-form, `new-password` for up/setup), "Esqueci minha senha" link on in/reauth/recover-form (target wired in US5), the "Conta na nuvem" account plate with {email} on setup/reauth/recover-form, Nome do perfil (`username`, pre-filled) on setup; in `up` with `emailInUse`, the e-mail field error is followed by "É seu? **Recupere o acesso**" (→ `reset-email`, wired in US5); `unlink` shows the subtitle only with a danger "Desvincular" + ghost "Cancelar"
- [ ] T077 [US4] Store: `in` in *link* context → `CloudAuthService.signIn` → `linkPending(activeId, { writeColors: !identity.colors })` → `done('linked')` with "{P} agora sincroniza com {email}." plus, when colors were replaced, "As cores da conta ({Tribe}) passaram a valer para este perfil." and the wheel ripple on newly lit colors (US4-2); modal colors switch from profile → cloud on success; busy "Entrando…"; wrong credentials → only "E-mail ou senha incorretos." (US4-3)
- [ ] T078 [US4] Store: `in` in *device*/*gate* context → `signIn` → FR-033 check → `setup` with `cloudColors` set, name pre-filled from `label`; prompts per context (device: "Ainda não tem perfil? **Criar perfil**"; gate: "**Ver perfis**")
- [ ] T079 [US4] Store: `up` (link only) → `signUp` with the profile's name/colors → `linkPending(activeId, { writeColors: true })` → `done('created')` "Conta criada"; busy "Criando conta…"; prompt "Já tem conta? **Entrar**" → `in`; e-mail in use → field error + recovery link (US4-4)
- [ ] T080 [US4] Store: `setup` → validate name ("3–20 chars, `^[A-Za-z0-9_.-]+$`, unique per device compared with `toLowerCase()`") and "Senha deste aparelho" (≥ 8) → `setupFromPending` → `done('setup')` "Perfil pronto" with sync line "Baixando sua coleção…" → "Coleção baixada"; tinted with the account's colors (US4-5)
- [ ] T081 [US4] Store: `reauth` (FR-032) → `CloudAuthService.reauth` → `done('reauthed')` "Sincronização retomada" with the sync line; pending changes are sent
- [ ] T082 [US4] Store: `unlink` → `CloudAuthService.unlink` → `done('unlinked')` "Conta desvinculada"; busy "Desvinculando…"; works offline; "Cancelar" closes the modal (US4-7, FR-019)
- [ ] T083 [US4] Drive every done screen's `SyncLine` from the real `SyncService.syncNow()` promise on link, account creation, unlock of a linked profile (T057), setup and reauth; a failed sync shows the offline/generic message as status text while the success stands (FR-016a)
- [ ] T084 [US4] Offline handling: any cloud submit while offline shows the offline form error and leaves local phases unaffected (US4-11, FR-021)
- [ ] T085 [US4] Wire the "Perfil criado" secondary "Vincular conta na nuvem" → `up` in *link* context for the new profile (FR-014, FR-037)
- [ ] T086 [US4] Extend `profile-button` (T060) menu: "Conta na nuvem" → not linked `open({ context: 'link', start: 'in' })`, `needsReauth` → `start: 'reauth'`, linked → `start: 'unlink'`; "Sincronizar agora" (linked only) → `needsReauth` opens `reauth`, otherwise `SyncService.syncNow()` with no modal; a `role="status"` line in the menu showing "Sincronizando…" / "Sincronizado agora" / the offline message / "Algo deu errado. Tente de novo em instantes." (US4-8)

**Checkpoint**: Cloud linking, setup on a second device, reauth, unlink and sync all work; local use
never blocks on the network.

---

## Phase 8: User Story 9 — One design foundation for the whole app (Priority: P2)

**Goal**: Every screen renders on the new tokens and base; no legacy global rule or token remains.

**Independent Test**: Build and inspect the global CSS; open each existing screen and confirm the page,
text and typography come from the new base (quickstart #22).

- [ ] T087 [US9] Run `npm run build` and search `dist/grimorio/browser/styles-*.css` for legacy tokens (`--nav-bar-height`, `--shadow-glow-primary-strong`, `--ring-accent`, `--overlay-backdrop`, `--color-bg`) and bare `button{` / `input[type=text]` / `label{` rules; remove any source that still emits them from `src/styles/` (SC-010)
- [ ] T088 [US9] Grep `src/` for `@use 'fence'`, `$legacy`, `@use 'motion'`, `@use 'buttons'`, `@use 'forms'`, `@use 'reset'` and fix any remaining reference so the build passes without the deleted partials; legacy component stylesheets are otherwise left untouched (US9-2)

**Checkpoint**: Foundation replacement verified app-wide.

---

## Phase 9: User Story 5 — Recover a forgotten cloud account password (Priority: P3)

**Goal**: 6-digit e-mailed code reset flow, entered in the app, returning to the flow it came from.

**Independent Test**: Request a code for an existing and an unknown e-mail (identical responses), enter
the code with a new password, sign in (quickstart #16).

- [ ] T089 [P] [US5] Create `src/app/shared/auth/entry-modal/reset-form/` (phases `reset-email`, `reset-code`): E-mail; Código (`autocomplete="one-time-code"`, `inputmode="numeric"`, `maxlength="6"`, input strips non-digits) → Nova senha da conta (`new-password`) → primary → "Enviar novo código" / disabled "Reenviar em {n}s" → "Usar outro e-mail"; prompt "Lembrou a senha? **Voltar**"
- [ ] T090 [US5] Store: every "Esqueci minha senha" on cloud forms (`in`, `reauth`, `recover-form`) and the "Recupere o acesso" link go to `reset-email`, recording `backTarget` (origin phase + context); "Voltar" returns to it (US5-5)
- [ ] T091 [US5] Store: `reset-email` → `CloudAuthService.requestResetCode(email)` → always `reset-code` on success regardless of whether the account exists (FR-023); busy "Enviando…"; start a 30 s `cooldown` countdown signal
- [ ] T092 [US5] Store: `reset-code` → validate code "not `^\d{6}$` → 'Digite os 6 dígitos do código.'" and new password ≥ 8 → `verifyResetCode` (`verifyOtp({ type: 'recovery' })` + `updateUser({ password })`) → continue as the origin flow's post-sign-in step (link, setup, reauth or recover); wrong/expired → code field "Código incorreto ou expirado. Peça um novo código."; busy "Salvando…"; "Enviar novo código" blocked for 30 s after each send with a live "Reenviar em {n}s" (FR-024); "Usar outro e-mail" → `reset-email` keeping `backTarget` (US5-4)

**Checkpoint**: Cloud password recovery works end to end.

---

## Phase 10: User Story 6 — Recover a forgotten local profile password (Priority: P3)

**Goal**: A forgotten local password is recoverable with data intact — via the linked account, or by
anyone on the device after a warning.

**Independent Test**: From unlock, recover one linked and one unlinked profile; both unlock with data
intact (quickstart #17).

- [ ] T093 [US6] Store: "Esqueci minha senha" on `unlock` → `recover-form` if the selected profile is linked, else `localreset-warn`
- [ ] T094 [US6] Implement `localreset-warn` (subtitle-only body in `profile-form` or the modal: primary "**Entendi, redefinir**" → `localreset-newpw`, ghost "Cancelar" → `unlock`) and `localreset-newpw` (single "Nova senha do perfil" field ≥ 8 → `ProfileStore.setPassword` → `activate` → `done('recovered')` "Perfil desbloqueado — {P} está ativo com todos os dados intactos."; busy "Salvando…"; offline-safe) (US6-2)
- [ ] T095 [US6] Implement `recover-form` (account plate, "Senha da conta", busy "Verificando…" → `CloudAuthService.verifyLinkedAccount`) → `recover-newpw` ("Nova senha do perfil" ≥ 8 → `setPassword` → `activate` → `done('recovered')`); needs a connection (offline error otherwise) (US6-1, FR-025)

**Checkpoint**: All user stories are independently functional.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [ ] T096 [P] Accessibility pass over every modal phase (FR-038, ui.md §6): focus trapped and returned to the opener, `role="alert"` on form errors, `role="status"` on sync lines/notices/menu status, swatch `aria-pressed`/names, active row `aria-current`, ✕ labelled "Fechar", autocomplete values per field
- [ ] T097 [P] 44×44 target audit across top bar, profile button/menu, modal controls, links and swatches (FR-040, SC-009)
- [ ] T098 [P] Copy audit: every visible string in the modal and top bar comes from `entry-copy.ts` and matches `STATES.md` verbatim; no raw backend text reachable (SC-006)
- [ ] T099 Run `npm run lint`, `npm test`, `npm run build` and fix failures, including any component stylesheet over the 8 kB `anyComponentStyle` budget (split the phase child or shorten aliases)
- [ ] T100 Walk the quickstart.md manual scenarios #1–#23 on desktop and a 393×852 mobile viewport using the `run` skill against the user's already-running dev server (never start/stop port 4200); record any failures as follow-up tasks here
- [ ] T101 Propose (do not write) doc updates for user review per CLAUDE.md's "worth adding" test — e.g. `notes.md`: per-profile IndexedDB layout, `src/app/shared/ds/` folder, new style partials replacing the legacy globals, `profileGuard`, per-profile Supabase clients

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: after Setup; blocks every story. Internal order: style foundation
  (T004–T007) ∥ models/utils (T008–T018) → storage (T019–T025) → services (T026–T032) → legacy removal
  (T033–T036) → DS primitives (T037–T042, parallel) → modal shell (T043–T047).
- **US1 (Phase 3)**: after Foundational.
- **US2 (Phase 4)**: after Foundational; shares `profile-form` and the store with US1, so run after US1
  or coordinate on those files.
- **US8 (Phase 5)**: after US1 + US2 (it verifies their surfaces).
- **US3 (Phase 6)**: after US1 (needs the guarded route table).
- **US4 (Phase 7)**: after US1 + US2 (link context needs an active profile; menu needs the button).
  T068/T069 need user confirmation and block the manual cloud scenarios, not the code tasks.
- **US9 (Phase 8)**: after Foundational; can run any time after T007.
- **US5 (Phase 9)**: after US4 (continues into link/setup/reauth/recover).
- **US6 (Phase 10)**: after US2 (unlock); T095 also needs US4's `CloudAuthService`.
- **Polish (Phase 11)**: after all stories.

### Story completion order

```text
Setup → Foundational → US1 → US2 → US8 ──► MVP
                         ├──► US3
                         └──► US4 → US5
                   US2 ──► US6 (T095 after US4)
          Foundational ──► US9
                                     all ──► Polish
```

### Within each story

- Presentational child component ([P]) before its store wiring.
- Store submit handlers before the success/sync-line wiring.
- Each checkpoint: `npm test` + `npm run build` stay green.

---

## Parallel Examples

### Foundational

```text
T005 _base.scss   ∥ T006 _controls.scss   ∥ T008 profile.model.ts
T009 password-hash.util.ts ∥ T010 identity.util.ts ∥ T011 cloud-error.util.ts ∥ T012 entry-copy.ts ∥ T014 connectivity.service.ts
T015 ∥ T016 ∥ T017 ∥ T018 (util specs)
T037 themed-modal ∥ T038 spark-field ∥ T039 identity-wheel ∥ T040 mini-wheel/identity-chip ∥ T041 profile-row ∥ T042 sync-line
```

### User Story 1

```text
T048 profile-form component ∥ T054 profile.guard.spec.ts
```

### User Story 2

```text
T055 profile-list ∥ T059 top-bar ∥ T060 profile-button
```

### User Story 4

```text
T074 sync-scheduler.service.spec.ts ∥ T076 cloud-form component   (after T070–T073)
```

### User Story 5

```text
T089 reset-form component, then T090–T092 in the store
```

---

## Implementation Strategy

### MVP first (P1: US1 + US2 + US8)

1. Phase 1 Setup → Phase 2 Foundational (the largest phase; the style swap lands here).
2. US1 → validate quickstart #1–3 offline.
3. US2 → validate #4–6.
4. US8 → validate #6, #20. **Stop and validate the MVP**: a fully local, multi-profile, themed app.

### Incremental delivery

1. US3 (tiny) and US9 (verification) next — both are quick confirmations of foundation work.
2. US4 once the user has confirmed and applied T068/T069 → validate #8–15, #18–19.
3. US5 → #16. US6 → #17.
4. Polish → full quickstart walk (#1–#23), then propose doc notes.

---

## Notes

- [P] = different files, no dependency on an incomplete task.
- Legacy screens (collection, decks, import, etc.) are not used to verify this spec; visual or
  behavioral breakage there is expected (spec Assumptions, US9-2).
- Never run the Supabase clean-start wipe or change auth settings without explicit user confirmation.
- The user runs `npm start`; tasks never start or stop the dev server.
