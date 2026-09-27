---

description: "Task list for spec 005 — Profile Modal"
---

# Tasks: Profile Modal

**Input**: Design documents from `specs/005-profile-modal/` (plan.md, spec.md, research.md R1–R20,
data-model.md, contracts/services.md, contracts/supabase.md, ui.md, quickstart.md V1–V23), plus the
design handoff `design_handoff_profile_modal/` (README.md → ProfileModalApp.dc.html →
IdentityWheelV2.js → EntryModal.jsx).

**Tests**: Included. quickstart.md lists the expected unit coverage, and plan.md says each new
component or service gets its own `.spec.ts` alongside it. Tests run with `npm test` (Vitest via
`ng test`, jsdom + `fake-indexeddb`); a single file with `npx ng test --include='**/<name>.spec.ts'`.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested on its
own. All paths are relative to the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: The user story the task belongs to (US1–US5)

## Conventions every task follows

- Standalone, OnPush, zoneless components; `computed` for derivation, `linkedSignal` for resettable
  local state, `effect` only for dialog/popover/timer side effects (architecture.md).
- Imports across `core`/`shared` use the `@models/*`, `@services/*`, `@utils/*`, `@shared/*` aliases;
  inside `shared`, cross-component imports use `@shared/<deep-path>`, never the barrel.
- New UI follows root `DESIGN.md` only (updated in Phase 1); no icons, no Magic symbols; no bare
  `button`/`input` styles — use `.btn*`, `.field*`, `.plate`, `.eyebrow`, `.micro-label`, `.link-btn`.
- All PT-BR copy lives in `src/app/core/utils/entry-copy.ts`; cloud errors reach the UI only via
  `mapCloudError` (`src/app/core/utils/cloud-error.util.ts`), never raw Supabase text.
- Where ui.md §7 says a string is "taken verbatim from the handoff", copy it from
  `design_handoff_profile_modal/ProfileModalApp.dc.html` (the named `ph.*` screen).
- No backward-compatibility code or migrations for old data (CLAUDE.md). Removed paths are deleted,
  not kept as dead branches.

---

## Phase 1: Setup (Design system first, then the backend object)

**Purpose**: Constitution V requires `DESIGN.md` to cover every new visual before it is built;
the Supabase function must exist before US5's cloud deletion can be exercised.

- [ ] T001 Update `DESIGN.md` per research R20: (a) **Themed modal** — add the profile modal and its
  modes (hub, "Perfil neste aparelho", "Conta na nuvem", action steps, done screens; desktop 880px
  face with 400px identity pane + fluid form pane, 460px min; mobile full-bleed with header chip and
  240px wheel on `hub`/`local` only), and remove the entry modal's link/reauth/unlink modes;
  (b) **Identity wheel** — v2 anatomy (`disc`/`rim`/`dot` per swatch; states `on`/`off`/`locked`/`neutral`;
  `off:hover`), picker usage in the create step and on every profile-modal screen, breathing and
  motes, and the reduced-motion list (spin, breathing, motes, bursts stop); (c) new **Action rows**
  (leading mini wheel or 36px spacer, title + meta, trailing micro-label verb, danger variant with
  the title in `danger`, 56px min height, 44px targets); (d) new **Sync plate** (row on desktop,
  column with full-width button on mobile; expired uses the `danger` border); (e) new **Danger
  plate** (`.plate` modifier with a `danger` border); (f) new **Toast** (desktop fixed top-right
  below the 44px bar + `space-4`, max 380px; mobile `space-3` from top/left/right; 8px accent dot,
  micro label + text column, 44px ✕; no transition under reduced motion); (g) new **Empty-device
  state** (centered, 360px max, `space-4` gap: eyebrow, muted line, `.btn--primary`); (h) **Profile
  control** now opens the profile modal; (i) **Content** — the new messages from ui.md §7. Take all
  visual values from `design_handoff_profile_modal/` (final path only; ignore the rejected variants
  listed in its README).
- [ ] T002 Apply the Supabase migration `005_delete_own_account` with the Supabase MCP
  `apply_migration` tool on project `hyzbkxraanzhdyhtnadf`, using the exact SQL in
  `specs/005-profile-modal/contracts/supabase.md` §1 (`SECURITY DEFINER`, `set search_path = ''`,
  raises `42501` when `auth.uid()` is null, `delete from auth.users where id = uid`,
  `revoke all … from public, anon; grant execute … to authenticated;`). Then run `get_advisors`
  (type `security`) and confirm the only finding about this function is the intentional definer
  (record the result in the task's commit message).

---

## Phase 2: Foundational (Blocking prerequisites)

**Purpose**: Model fields, store methods, toasts, shared modal behavior, copy and the shared cloud
forms that every story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Model and stores

- [ ] T003 Add `nameUpdatedAt: string` and `colorsUpdatedAt: string` (ISO timestamps) to
  `ProfileRecord` in `src/app/core/models/profile.model.ts`; `ProfileSummary`
  (`Omit<ProfileRecord, 'password'>`) carries both. No `grimorio-device` version bump.
- [ ] T004 In `src/app/core/services/profile-store.service.ts`: make `create()` set `nameUpdatedAt`
  and `colorsUpdatedAt` to the creation time; add `rename(id, name)` (trims, stamps
  `nameUpdatedAt = now`, patches the signal synchronously, persists through the existing serialized
  queue); add `setColors(id, colors: Color[], at?: string)` (stamps `colorsUpdatedAt = at ?? now`,
  same patch-then-queue shape); add `remove(id)` (drops the registry record; if it was the active
  one, `activeProfileId` becomes `null`). Keep `isNameTaken(name, exceptId?)` case-insensitive and
  make sure `exceptId` excludes that profile (depends on T003).
- [ ] T005 [P] Add `deleteProfileDb(profileId: string): Promise<void>` to
  `src/app/core/db/profile-db.ts`: close and forget the memoized connection for that id, then
  `deleteDB(profileDbName(profileId))` from `idb`.
- [ ] T006 Extend `src/app/core/services/profile-store.service.spec.ts`: `create` sets both
  timestamps; `rename` trims, restamps only `nameUpdatedAt`, persists across a fresh load; `setColors`
  restamps `colorsUpdatedAt` (and keeps a passed `at`); `remove` drops the record and clears
  `activeProfileId` when active; `isNameTaken('ABC', ownId)` is false for one's own name and true for
  another profile's name in other case. Add a `deleteProfileDb` case to
  `src/app/core/db/profile-db.spec.ts` (create file if absent) proving the database is gone and a
  second profile's database is untouched.

### Toasts (FR-022, research R13)

- [ ] T007 [P] Create `src/app/core/services/toast.service.ts` (`providedIn: 'root'`) per
  contracts/services.md: `export const TOAST_MS = 5_000`; `toast: Signal<{ id: number; label:
  string; text: string } | null>` (at most one); `show(label, text)` replaces the current toast with
  a new id and restarts a single 5 s timer; `dismiss()` clears it and the timer; `pushHost(): number`
  returns an increasing host id (newest on top); `popHost(id)` removes that id; `topHost:
  Signal<number>` is the last pushed id.
- [ ] T008 [P] Write `src/app/core/services/toast.service.spec.ts` (fake timers): a second `show`
  replaces the first and restarts the 5 s window; the toast clears at exactly `TOAST_MS`; `dismiss`
  clears it; `pushHost`/`popHost` keep a stack and `topHost` follows it, including popping a
  non-top host.
- [ ] T009 Create `ToastOutlet` in `src/app/shared/ds/toast/toast-outlet.ts|.html|.scss`: on init it
  calls `ToastService.pushHost()` and stores its id (pop on destroy), or accepts an input `hostId`
  when the host pushes itself (T010/T011); renders a `popover="manual"` element and, in an `effect`,
  calls `showPopover()` while `topHost() === hostId && toast()` and `hidePopover()` otherwise; keeps a
  persistent `role="status"` `aria-live="polite"` region; content per DESIGN.md Toast (8px accent
  dot, micro label, text, 44px ✕ labelled `TOAST.close` "Fechar aviso" calling `dismiss()`); never
  moves focus; no transition under `prefers-reduced-motion`. Add
  `src/app/shared/ds/toast/toast-outlet.spec.ts` (renders only when it is the top host; ✕ dismisses).
  Export it from `src/app/shared/index.ts` (depends on T007).
- [ ] T010 Host the outlets: render a base `<app-toast-outlet />` in `src/app/app.html` (imported in
  `src/app/app.ts`); in `src/app/shared/ds/themed-modal/themed-modal.ts|.html`, place an outlet
  inside the `<dialog>` that pushes its host when the dialog opens (`showModal()`) and pops it on
  close. Depends on T009.
- [ ] T011 In `src/app/shared/layout/nav-drawer/nav-drawer.ts|.html`, place a `ToastOutlet` inside
  the drawer's `<dialog>` that pushes on open and pops on close, the same as T010's `ThemedModal`.
  Depends on T009.

### Shared modal behavior (research R19)

- [ ] T012 Extract `src/app/shared/ds/themed-modal/fluid-face.ts` from
  `src/app/shared/auth/entry-modal/entry-modal.ts`: a small helper class, created in a modal's
  constructor, that owns the ResizeObserver fluid-height measuring (`PANE_CHROME`, the capped check,
  instant under reduced motion) and the "focus the first field or first action row when the screen
  changes" effect, parameterized by a screen-key signal. Rewire `EntryModal` to use it with no
  behavior change (its existing `entry-modal.spec.ts` must still pass).

### Copy and validation

- [ ] T013 Add the copy to `src/app/core/utils/entry-copy.ts` from ui.md §7: a new `PROFILE` section
  (hub title/caption/rows/verb "Abrir"/prompt "Não é você?" + "Trocar de perfil"; sync-plate local
  meta and buttons; "Perfil neste aparelho" title/subtitles/caption/rows/buttons; "Conta na nuvem"
  title/caption/subtitles/plates/rows; every step's title/subtitle/caption/verb/busy from the §7
  steps table; field labels and the "Nova senha do perfil" helper; the `delprofile` plate, linked
  note, unsynced block and sync lines; the `delcloud` plate and notes — take the `delprofile` linked
  note and the `delcloud` plate/notes verbatim from `ProfileModalApp.dc.html` `ph.delprofile` /
  `ph.delcloud`; all done titles and bodies; the empty-device eyebrow/line/button); a new `TOAST`
  section (`saved` "Perfil" / "Alterações salvas.", `gone(email, nome)` "Conta na nuvem" / "A conta
  {email} não existe mais. {nome} continua neste aparelho com todos os dados.", `close` "Fechar
  aviso"); new `MSG.pwMismatch` "As senhas não são iguais.", `MSG.samePassword` "A nova senha precisa
  ser diferente da atual.", `MSG.goneHint(nome)` "Se a conta não existe mais, Desvincular conta
  mantém {nome} e os dados neste aparelho."; `SHELL.profileHint` and `SHELL.profileLabel`'s tail
  become "Gerenciar perfil"; the new "Redefinir senha do perfil" strings (subtitle, "Esqueci a senha
  da conta", "Cancelar"/"Continuar"/"Confirmando…", caption "Redefinir a senha não apaga nada.").
  Move the `reauth`/`unlink` titles/subtitles/captions/done copy into `PROFILE` (they are deleted
  from the entry-modal sections in T045). Add `PROFILE.delprofileDecksNote` "Decks ainda não vão
  para a nuvem — saem junto com o perfil.". Mark the four review strings (`samePassword`,
  `goneHint`, the shell hint, `delprofileDecksNote`) with a `// review:` comment.
- [ ] T014 [P] In `src/app/core/utils/cloud-error.util.ts`: extend `FieldKey` with `pwNew` and
  `pwConfirm`; map `same_password` → field `pwNew`, `MSG.samePassword`; keep `weak_password` → field
  `pw`, `MSG.pwMin`; `user_not_found` falls to `GENERIC_FAILURE`. Add cases to
  `src/app/core/utils/cloud-error.util.spec.ts`. Depends on T013.
- [ ] T015 [P] In `src/app/core/utils/entry-flow.util.ts`, extract `validateName(name: string,
  isTaken: (n: string) => boolean): string | null` (3–16 characters, `^[A-Za-z0-9_.-]+$`, trimmed,
  same messages as creation) and make `validate()` use it. Add `validateName` cases to
  `src/app/core/utils/entry-flow.util.spec.ts` (too short, bad characters, taken, case-only change
  of one's own name passes when `isTaken` excludes self).

### Shared cloud forms (research R2)

- [ ] T016 Create the abstract class `CloudFlowHost` in `src/app/shared/auth/cloud-flow-host.ts`
  declaring exactly what `CloudForm`/`ResetForm` templates read and call: `fields`, `fieldErrors`,
  `shown`, `phase`, `pwLabel`, `pwAutocomplete`, `pwHelper`, `plateEmail`, `emailInUse`,
  `emailLocked`, `editField()`, `forgot()`, `recoverAccess()` (plus any other member the two
  templates actually use — read both before writing it).
- [ ] T017 Make `src/app/shared/auth/entry-modal/cloud-form/cloud-form.ts` and
  `src/app/shared/auth/entry-modal/reset-form/reset-form.ts` inject `CloudFlowHost` instead of
  `EntryFlowStore`, and make `EntryModal` (or `EntryFlowStore`'s providers in
  `src/app/shared/auth/entry-modal/entry-modal.ts`) provide `{ provide: CloudFlowHost, useExisting:
  EntryFlowStore }` with `EntryFlowStore` extending/implementing it. Update the forms' specs to
  provide the token. No behavior change. Depends on T016.

### Identity wheel v2 (FR-023, research R14)

- [ ] T018 Rewrite the internals of `src/app/shared/ds/identity-wheel/identity-wheel.ts|.html|.scss`
  to the handoff's `design_handoff_profile_modal/IdentityWheelV2.js` anatomy, keeping the public API
  (`mode`, `picks` model, `neutral`, `subline`, `size`) and the pick rules (1–3 in pick order, last
  pick not removable, others locked at 3), positions, 28 s spin, ripple and bursts: each swatch
  has `disc`, `rim`, `dot`; state classes `on`/`off`/`locked`/`neutral` with `off:hover`; breathing
  as a CSS animation; motes from a 700 ms `setInterval` started in `afterNextRender` and cleared on
  destroy — each tick every selected color emits one mote with a 26% chance into a signal list of
  `{id, x, y, dx, dy, dur, peak}`, each removed on `animationend`; no interval while
  `prefers-reduced-motion` matches, and spin/breathing/motes/bursts all stop under it; locked swatches
  get `aria-disabled="true"` (taps ignored) and keep `aria-pressed`; add an optional input to put
  `aria-live="polite"` on the center tribe name (used by the profile modal, ui.md §6). Update
  `identity-wheel.spec.ts` (pick rules, locked aria, no motes under reduced motion).

**Checkpoint**: Foundation ready — stories can start.

---

## Phase 3: User Story 1 — Open the profile hub and switch profile (Priority: P1) 🎯 MVP

**Goal**: The profile control opens a profile modal on its hub (name, wheel, sync plate, two
entries, "Trocar de perfil"); sub-screens open and "Voltar" returns; "Trocar de perfil" hands off to
the entry modal's list.

**Independent Test**: quickstart V1–V3 — with an active profile, open the control at both widths;
the hub shows the right identity and link state; each sub-screen opens and "Voltar" returns;
"Trocar de perfil" opens the entry list where switching and "Sair de {P}" work; with no profile the
entry modal opens; during a shell sync nothing opens.

### Tests for User Story 1

- [ ] T019 [P] [US1] Write `src/app/core/services/profile-modal.service.spec.ts`: `open()` is a
  no-op with no active profile and while the entry modal is open; `open({start})` sets `request`
  with a new id and `start ?? 'hub'`; `close()` clears `isOpen`. Also add to
  `src/app/core/services/entry-modal.service.spec.ts`: `open()` is a no-op while the profile modal is
  open.
- [ ] T020 [P] [US1] Write `src/app/core/utils/profile-flow.util.spec.ts` for the US1 rules:
  `linkState` (`local` when `cloud === null`, `expired` when `cloud.needsReauth`, else `linked`) and
  `hubCloudMeta` (e-mail / "Sessão expirada · {email}" / "Vincular para sincronizar entre
  aparelhos").

### Implementation for User Story 1

- [ ] T021 [P] [US1] Create `src/app/core/services/profile-modal.service.ts` per
  contracts/services.md: `export type ProfileStart = 'hub' | 'in' | 'up' | 'reauth'`;
  `ResolvedProfileRequest { id: number; start: ProfileStart }`; `request` and `isOpen` signals;
  `open(request?)` is a no-op when `ProfileSessionService` has no active profile or
  `EntryModalService.isOpen()`; `close()`.
- [ ] T022 [US1] In `src/app/core/services/entry-modal.service.ts`, make `open()` a no-op while
  `ProfileModalService.isOpen()` (inject lazily with `inject()` inside the method if needed to avoid
  a circular DI graph). Depends on T021.
- [ ] T023 [P] [US1] Create `src/app/core/utils/profile-flow.util.ts` with `ProfilePhase` (`hub`,
  `local`, `cloud`, `pw`, `delprofile`, `cloudpw`, `unlink`, `delcloud`, `in`, `up`, `reauth`,
  `reset-email`, `reset-code`), `ProfileOrigin = 'hub' | 'local' | 'cloud'`, `LinkState`,
  `linkState(profile)`, `hubCloudMeta(profile)`, and the first entries of `titleFor`/`subtitleFor`/
  `captionFor`/`promptFor` for `hub`, `local`, `cloud` (copy from `PROFILE`, T013). Later stories add
  their phases to the same functions.
- [ ] T024 [US1] Create `ProfileFlowStore` in
  `src/app/shared/auth/profile-modal/profile-flow.store.ts` (provided on the component, like
  `EntryFlowStore`) with the data-model §6 state: `phase`, `origin`, `backTarget`, `fields {name,
  email, pw, pwNew, pwConfirm, code}`, `fieldErrors`, `formError`, `formHint`, `emailInUse`,
  `emailLocked`, `loading`, `done`, `replacedTribe`, `unsynced`, `blockSync`, `cooldown`,
  `resending`, `generation`; derived `active` (the active profile), `linkState`, `title`/`subtitle`/
  `caption`/`prompt`. Transitions for US1: `open(start)` (reset everything, `phase = start ?? 'hub'`,
  `origin = 'hub'`), `openLocal()` (loads `fields.name` from the active profile), `openCloud()`,
  `back()` (sub-screen → hub, discards the unsaved name), `go(phase)` (bumps `generation`; clears
  passwords, code, errors, hint and done; keeps the e-mail), `openStep(step)` (`origin = phase`, then
  `go(step)`), `cancel()`/`concluir()` (→ `origin`), `close()` (reset everything), and
  `switchProfile()` (disabled while `SyncStatusService.busy()`: `ProfileModalService.close()` then
  synchronously `EntryModalService.open({ start: 'list' })`). It implements `CloudFlowHost` (members,
  and `openStep('in' | 'reauth')`, are no-ops until US3's T042). Depends on T016, T021, T023.
- [ ] T025 [P] [US1] Create the `ActionRow` DS primitive in
  `src/app/shared/ds/action-row/action-row.ts|.html|.scss`: inputs `title`, `meta`, `verb`, `danger?`,
  `disabled?`, `hint?` (appended to the description, e.g. "Aguarde a sincronização terminar"); a
  leading content slot; one `<button>` (56px min height) whose accessible name is "{title}. {meta}.";
  emits `activate`; styles per DESIGN.md Action rows. Add `action-row.spec.ts`; export from
  `src/app/shared/index.ts`.
- [ ] T026 [P] [US1] Create the `SyncPlate` DS primitive in
  `src/app/shared/ds/sync-plate/sync-plate.ts|.html|.scss`: reads `SyncStatusService` and the
  active profile; per ui.md §3 — linked: `SyncMark` + the `syncDisplay()` label, the e-mail,
  secondary "Sincronizar agora" (calls `act()`); syncing: spinner + "Sincronizando…", no button;
  offline/error after a hub sync: danger mark/label, e-mail, "Tentar de novo" (calls `act()`);
  local: hollow ring, "Sem conta na nuvem", meta "Sem conta na nuvem — funciona sem internet.",
  "Vincular conta na nuvem" (emits `link`); expired: danger mark, label and border, e-mail,
  **primary** "Entrar de novo" (emits `reauth`). Row on desktop, column with full-width button on
  mobile. Add `sync-plate.spec.ts` (one case per state); export from `src/app/shared/index.ts`.
- [ ] T027 [US1] Create the `ProfileModal` component in
  `src/app/shared/auth/profile-modal/profile-modal.ts|.html|.scss`: provides `ProfileFlowStore` and
  `{ provide: CloudFlowHost, useExisting: ProfileFlowStore }`; opens/closes a `ThemedModal` from
  `ProfileModalService.request`/`isOpen` (calling `store.open(start)` on each new request id) with
  `[roles]` bound to `IdentityService.roles()` so it retints live; `aria-labelledby` on the current
  title (including done titles); desktop frame = identity pane (300px `IdentityWheel`, caption with
  two lines reserved) + form pane (✕ row, scrolling body, pinned bottom prompt only on `hub`, `in`,
  `up` and the reset steps); mobile = full-bleed with wordmark, `IdentityChip` ("name · tribe") and
  ✕ in the header; uses `fluid-face.ts` (T012) with the entry modal's constants; closing (✕, Esc,
  backdrop) calls `store.close()` and `ProfileModalService.close()`, and focus returns to the
  opener. Switches on `store.phase()` to render the screen components. Depends on T012, T024.
- [ ] T028 [US1] Create `ProfileHub` in
  `src/app/shared/auth/profile-modal/hub/profile-hub.ts|.html|.scss`: title `{nome}` (no subtitle),
  `SyncPlate` (its `link` → `store.openStep('in')`, `reauth` → `store.openStep('reauth')`, both with
  `origin = 'hub'`), `ActionRow` "Perfil neste aparelho" / "Cores, nome e senha" with a leading
  `MiniWheel`, `ActionRow` "Conta na nuvem" / `hubCloudMeta` with a 36px spacer, verbs "Abrir"; the
  prompt "Não é você? Trocar de perfil" calls `store.switchProfile()` and is disabled while
  syncing. Depends on T025, T026, T027.
- [ ] T029 [P] [US1] Create the `LocalScreen` scaffold in
  `src/app/shared/auth/profile-modal/local-screen/local-screen.ts|.html|.scss` (title, subtitle
  linked/expired vs local, ghost "Voltar" → `store.back()`); US2, US4 and US5 fill it in.
- [ ] T030 [P] [US1] Create the `CloudScreen` scaffold in
  `src/app/shared/auth/profile-modal/cloud-screen/cloud-screen.ts|.html|.scss` (title, per-link-state
  subtitle, ghost "Voltar" → `store.back()`); US3–US5 fill it in.
- [ ] T031 [US1] Render `<app-profile-modal />` once in `src/app/app.html` next to
  `<app-entry-modal />` (import in `src/app/app.ts`). Depends on T027.
- [ ] T032 [US1] Route the profile control (FR-001, research R16): in
  `src/app/shared/layout/top-bar/top-bar.ts`, `openProfile()` calls `ProfileModalService.open()`
  when a profile is active and `EntryModalService.open()` otherwise; in
  `src/app/shared/layout/nav-drawer/nav-drawer.ts`, `onProfile()` closes the drawer then does the
  same (focus returns to "Menu" on close). The sync lock (spec 004 FR-005a) still blocks both while
  syncing. Update `top-bar.spec.ts` and `nav-drawer.spec.ts`. Depends on T021.
- [ ] T033 [US1] Write `src/app/shared/auth/profile-modal/profile-flow.store.spec.ts` for US1:
  `open` resets to `hub` with `origin 'hub'`; `openLocal`/`openCloud` then `back()` return to `hub`;
  `openStep` records `origin`; `cancel`/`concluir` return to it; `switchProfile` closes and opens
  the entry modal on `list`, and does nothing while syncing. Add
  `src/app/shared/auth/profile-modal/profile-modal.spec.ts` (opens on the hub for an active profile;
  shows the right hub meta per link state). Depends on T024, T027, T028.

**Checkpoint**: US1 works on its own — quickstart V1–V3.

---

## Phase 4: User Story 2 — Change colors anywhere, rename on "Perfil neste aparelho" (Priority: P1)

**Goal**: The wheel in the profile modal changes the active profile's colors on tap and retints the
app at once; the name is renamed with "Salvar" and a toast; colors follow the account across
devices (last-write-wins).

**Independent Test**: quickstart V4–V6 and V13 — tap colors on the hub and on "Perfil neste
aparelho" (app retints, survives reload, "Salvar" stays disabled); rename valid/invalid/case-only;
"Voltar"/✕ discard an unsaved name; two linked devices converge on the latest colors.

### Tests for User Story 2

- [ ] T034 [P] [US2] Write `src/app/core/utils/identity-sync.util.spec.ts` covering every row of
  data-model §2's reconciliation table: remote newer → `adoptColors`; remote absent or local newer
  with different colors → `write.grm_colors` + `grm_colors_at = colorsUpdatedAt`; equal colors →
  nothing regardless of timestamps; `labelAt` absent or `nameUpdatedAt > labelAt` →
  `write.grm_label = name` + `grm_label_at = nameUpdatedAt`; otherwise label untouched; the remote
  label is never adopted.

### Implementation for User Story 2

- [ ] T035 [P] [US2] Create `src/app/core/utils/identity-sync.util.ts`: `LocalIdentity { colors,
  colorsUpdatedAt, name, nameUpdatedAt }`, `RemoteIdentity { colors?, colorsAt?, labelAt? }`,
  `IdentityResult { adoptColors: { colors, at } | null; write: Partial<{ grm_colors, grm_colors_at,
  grm_label, grm_label_at }> | null }`, and pure `reconcileIdentity(local, remote)` per data-model §2
  (an absent `grm_colors_at` counts as older than any local change; color equality compares the
  ordered arrays).
- [ ] T036 [US2] Wire the live wheel (FR-008, research R4): in `ProfileModal`'s identity pane
  (desktop) and at the top of the body on `hub` and `local` (mobile, 240px), render `IdentityWheel`
  `mode="picker"` with `[picks]` = the active profile's colors and `(picksChange)` →
  `ProfileStore.setColors(activeId, colors)`, with the center tribe name `aria-live="polite"`
  (T018's input). Show the hub caption / "Toque nas cores da roda para mudar. A primeira tinge o app
  inteiro." on `local`. Files:
  `src/app/shared/auth/profile-modal/profile-modal.html`, `hub/profile-hub.html`,
  `local-screen/local-screen.html`. The entry modal's wheel is untouched.
- [ ] T037 [US2] Fill the rename part of `LocalScreen` (FR-009, FR-009a): `TextField` "Nome do
  perfil" (helper, `autocomplete="username"`, the field error replaces the helper) bound to
  `store.fields().name`; primary "Salvar" / "Salvando…" enabled only by `salvarEnabled = phase ===
  'local' && fields.name.trim() !== active.name && !loading`; ghost "Voltar". Add `saveName()` to
  `ProfileFlowStore`: `validateName(name, n => ProfileStore.isNameTaken(n, activeId))` (T015) → field
  error on `user`, else `ProfileStore.rename()`, stay on `local`, `ToastService.show(TOAST.saved)`.
  Files: `local-screen/local-screen.ts|.html|.scss`, `profile-flow.store.ts`. Depends on T004, T015,
  T029.
- [ ] T038 [US2] Add the sync identity step (FR-012, FR-012a, research R6) to
  `src/app/core/services/sync.service.ts`: in `exchange()`, before locations and cards, call
  `client.auth.getUser()`; read `grm_colors`/`grm_colors_at`/`grm_label_at` from `user_metadata`;
  run `reconcileIdentity`; if `adoptColors`, `ProfileStore.setColors(id, colors, at)` (silent
  retint); if `write`, one `auth.updateUser({ data: write })`. A failure fails the sync like any
  other sync request. (US5's T067 later routes the `getUser()` classification through
  `checkAccount`.) Depends on T035.
- [ ] T039 [US2] In `src/app/core/services/cloud-auth.service.ts`, make `linkPending` and `signUp`
  write `grm_label_at` (= `nameUpdatedAt`) and `grm_colors_at` (= `colorsUpdatedAt`) alongside
  `grm_label`/`grm_colors`; when a link adopts the account's colors (spec 003 FR-026), call
  `ProfileStore.setColors(id, accountColors, grm_colors_at ?? now)`.
- [ ] T040 [US2] Extend tests: `src/app/core/services/sync.service.spec.ts` (identity step adopts
  newer remote colors, writes newer local colors/label in one `updateUser`, runs before locations);
  `src/app/core/services/cloud-auth.service.spec.ts` (link/sign-up write the `_at` keys; adopted
  colors keep the remote timestamp); `profile-flow.store.spec.ts` (`salvarEnabled` false on open and
  after color taps, true after a name edit; `back()` discards; invalid names set the field error;
  save toasts). Depends on T037, T038, T039.

**Checkpoint**: US1 + US2 work — quickstart V4–V6 (V13 needs two devices; see Polish).

---

## Phase 5: User Story 3 — Link, re-sign-in or unlink on "Conta na nuvem" (Priority: P2)

**Goal**: Link (sign in / create / reset), re-sign-in and unlink move from the entry modal into the
profile modal; the shell's sync area opens the profile modal at the right step.

**Independent Test**: quickstart V8–V10, V21 — link a local profile via sign-in, create and reset;
unlink offline keeping data; expired session re-sign-in from the shell and from "Conta na nuvem";
"Perfil criado" → "Vincular conta na nuvem" opens the profile modal at `up`.

### Implementation for User Story 3

- [ ] T041 [US3] Add the cloud phases to `src/app/core/utils/profile-flow.util.ts`: titles,
  subtitles, captions, prompts and `doneCopy` for `in`, `up`, `reauth`, `reset-email`, `reset-code`,
  `unlink` and the done kinds `linked`, `created`, `reauthed`, `unlinked` (copy from `PROFILE`,
  moved from spec 003's link-context entries); `primaryLabel`/`busyLabel`, `fieldsFor` and
  `validate` for the shared cloud phases delegate to `entry-flow.util`. Extend
  `profile-flow.util.spec.ts`.
- [ ] T042 [US3] Implement the cloud flows in `ProfileFlowStore` (research R2, R18, data-model §6):
  the full `CloudFlowHost` members; `submit()` for `in` (link, `done = 'linked'`, set
  `replacedTribe` when the account's colors replaced the profile's), `up` (sign-up + link, `done =
  'created'`), `reauth` (`done = 'reauthed'`), `reset-email`/`reset-code` with the resend
  `cooldown`/`resending` (from `in`: link → `'linked'`; from `reauth`: adopt → `'reauthed'`),
  `unlink` (`CloudAuthService.unlink`, `done = 'unlinked'`); `in` ⇄ `up` and `in`/`reauth` →
  reset keep `origin`; `forgot()` records `backTarget` (`in` or `reauth`) and "Lembrou a senha?
  Voltar" returns to it; `emailLocked` on a reset from `reauth`; stale results dropped by
  `generation`; no flow starts a sync (FR-016). Reuse `EntryFlowStore`'s calls into
  `CloudAuthService` (read it first). Depends on T041.
- [ ] T043 [US3] Fill `CloudScreen` (FR-004) per ui.md §2: **linked** — plate "Vinculado à nuvem" /
  `{email}`, `ActionRow` "Senha da conta" (US4 wires it; render it now calling
  `store.openStep('cloudpw')`), `ActionRow` "Desvincular conta" → `openStep('unlink')`, separate
  list with danger `ActionRow` "Excluir conta na nuvem" (US5 wires it; calls
  `openStep('delcloud')`), ghost "Voltar"; **expired** — plate "Sessão expirada" (danger) + e-mail +
  xs muted note, primary block "Entrar de novo" → `openStep('reauth')`, `ActionRow` "Desvincular
  conta", ghost "Voltar", nothing else; **local** — plate "Só neste aparelho" + muted note,
  secondary block "Vincular conta na nuvem" → `openStep('in')`, ghost "Voltar". Render `in`/`up`/
  `reauth` with `CloudForm` and the reset steps with `ResetForm` in `ProfileModal`, each with a
  ghost "Cancelar" + verb row; create the `unlink` confirmation (no fields, danger verb, "Desvincular
  não apaga nada — nem aqui, nem na nuvem." copy) in
  `src/app/shared/auth/profile-modal/unlink-step/unlink-step.ts|.html`. Files:
  `cloud-screen/*`, `profile-modal.html`.
- [ ] T044 [US3] Create `ProfileDonePanel` in
  `src/app/shared/auth/profile-modal/done-panel/profile-done-panel.ts|.html|.scss` (reusing the
  entry modal's done-panel styling): title, one sentence from `doneCopy(done, profile)`, primary
  block "Concluir" → `store.concluir()`. Used by every done kind in US3–US5.
- [ ] T045 [US3] Prune the entry modal (FR-006, research R3): `EntryContext` becomes `'device' |
  'gate'`; remove the phases `reauth`/`unlink`, done kinds `reauthed`/`unlinked`, their `EntryStart`
  members, and the `link`-context branches in `promptFor`, `colorSourceFor`, `captionFor`,
  `subtitleFor` and `EntryFlowStore.afterCloudSignIn`; delete their now-unused copy entries from the
  entry-modal sections of `entry-copy.ts`. Files: `src/app/core/utils/entry-flow.util.ts`,
  `src/app/shared/auth/entry-modal/entry-flow.store.ts`, `entry-modal.ts|.html`,
  `src/app/core/services/entry-modal.service.ts`, `src/app/core/utils/entry-copy.ts`, and their
  `.spec.ts` files (delete the removed cases). Run `npx tsc --noEmit -p tsconfig.app.json` or
  `npm run build` to find every leftover reference.
- [ ] T046 [US3] Hand-off from "Perfil criado" (research R3): `EntryFlowStore.linkAfterCreate` now
  calls `EntryModalService.close()` and then `ProfileModalService.open({ start: 'up' })` (origin
  `hub`). File: `src/app/shared/auth/entry-modal/entry-flow.store.ts` (+ its spec).
- [ ] T047 [US3] Route the shell's sync area (FR-007, research R16): in
  `src/app/core/services/sync-status.service.ts`, `act()` maps `link` → `profileModal.open({ start:
  'in' })` and `reauth` → `profileModal.open({ start: 'reauth' })`; in
  `src/app/shared/layout/nav-drawer/nav-drawer.ts`, `onSyncAction()` closes the drawer then does the
  same. Update `sync-status.service.spec.ts` and `nav-drawer.spec.ts`.
- [ ] T048 [US3] Extend `profile-flow.store.spec.ts`: link/sign-up/reauth/unlink success set the
  right `done` and "Concluir" returns to `origin` (`cloud` vs `hub`); reset returns to its
  `backTarget`; a stale result after `go()` is dropped; no sync is triggered. Depends on T042.

**Checkpoint**: US3 works — quickstart V8–V10, V21.

---

## Phase 6: User Story 4 — Change the profile or cloud account password (Priority: P2)

**Goal**: Local password change on "Perfil neste aparelho"; cloud account password change on
"Conta na nuvem" that signs out other devices; the entry modal's "Redefinir senha do perfil".

**Independent Test**: quickstart V7, V11, V12, V20.

### Implementation for User Story 4

- [ ] T049 [US4] Add `pw` and `cloudpw` to `src/app/core/utils/profile-flow.util.ts`: copy per ui.md
  §7 steps table (`pw` subtitle linked vs local), done copy `pwChanged` (linked adds " A senha da
  conta na nuvem continua a mesma.") and `cloudPwChanged`, and `validateStep(phase, fields, deps)`
  for `pw` in order: current empty → `MSG.pwEmpty` on `pw`; new < 8 → `MSG.pwMin` on `pwNew`;
  confirmation differs → `MSG.pwMismatch` on `pwConfirm`; for `cloudpw`: current empty →
  `MSG.pwEmpty`, new < 8 → `MSG.pwMin` on `pwNew`. Extend `profile-flow.util.spec.ts`.
- [ ] T050 [US4] Create `PasswordStep` in
  `src/app/shared/auth/profile-modal/password-step/password-step.ts|.html|.scss`, used for both
  phases: `pw` — "Senha atual do perfil" (`current-password`), "Nova senha do perfil" (helper
  "Pelo menos 8 caracteres. Funciona sem internet.", `new-password`), "Confirmar nova senha"
  (`new-password`); `cloudpw` — e-mail plate, "Senha atual da conta" (`current-password`), "Nova senha
  da conta" (`new-password`); form error (`role="alert"`); ghost "Cancelar" + verb/busy label; fields
  and verb locked while `loading`.
- [ ] T051 [US4] Wire the local password change (FR-010, research R7) in `ProfileFlowStore`:
  `validateStep`, then `ProfileStore.verifyPassword` (wrong → `MSG.wrongLocal` on `pw`), then
  `ProfileStore.setPassword` (new PBKDF2 hash), `done = 'pwChanged'`; works offline. Wire the
  `LocalScreen` `ActionRow` "Senha do perfil" / "Desbloqueia o perfil neste aparelho" / "Mudar" →
  `openStep('pw')`. Files: `profile-flow.store.ts`, `local-screen/local-screen.html`.
- [ ] T052 [US4] Add `changeAccountPassword(profileId, current, next)` to
  `src/app/core/services/cloud-auth.service.ts` (research R8) through the existing `run()` wrapper
  (offline → `MSG.offline`): verify with a transient `signInWithPassword` on the linked e-mail and
  check `user.id === link.userId` (discard with `signOut({ scope: 'local' })`; `invalid_credentials`
  → `MSG.wrongCloud`); then `client(profileId).auth.updateUser({ password: next })`; then
  `client(profileId).auth.signOut({ scope: 'others' })`. Never `scope: 'global'`. The profile stays
  linked; the local password is untouched. Reuse `verifyLinkedAccount`'s transient-client pattern.
- [ ] T053 [US4] Wire `cloudpw` (FR-016a) in `ProfileFlowStore`: submit → `validateStep` →
  `changeAccountPassword`; map a `pw`-field `weak_password` failure onto `pwNew`; `same_password`
  shows on `pwNew`; offline/wrong credentials show as the form error; success `done =
  'cloudPwChanged'`. The `CloudScreen` "Senha da conta" row (T043) opens it. (US5's T066 adds the
  `checkAccount` on open.)
- [ ] T054 [US4] Redesign the entry modal's `recover-form` into "Redefinir senha do perfil"
  (FR-024, research R3): keep the phase and flow (verify the account password, then `recover-newpw`);
  change title, subtitle ("{nome} está vinculado à nuvem. Confirme a senha da conta para criar uma
  nova senha do perfil neste aparelho."), desktop caption ("Redefinir a senha não apaga nada."), the
  forgot link label ("Esqueci a senha da conta", still leading to the cloud reset), and add a button
  row with ghost "Cancelar" (→ `unlock`) and primary "Continuar" / "Confirmando…"; keep the account
  e-mail plate; the wheel shows the selected profile. Unlinked profiles keep the local-reset
  warning. Files: `src/app/core/utils/entry-flow.util.ts`,
  `src/app/shared/auth/entry-modal/entry-flow.store.ts`, `entry-modal.html` (and the form component
  that renders `recover-form`), plus specs.
- [ ] T055 [US4] Tests: `cloud-auth.service.spec.ts` for `changeAccountPassword` with a mocked
  client (offline, wrong password, user-id mismatch, success calls `updateUser` then
  `signOut({scope:'others'})`, never `'global'`); `profile-flow.store.spec.ts` for `pw` (error order,
  wrong current, success) and `cloudpw` (`same_password` on `pwNew`); `entry-flow.store.spec.ts` for
  the `recover-form` Cancelar → unlock.

**Checkpoint**: US4 works — quickstart V7, V11, V20 (V12 needs two devices).

---

## Phase 7: User Story 5 — Delete the profile or the cloud account (Priority: P3)

**Goal**: "Excluir perfil" removes the profile and its IndexedDB database (entry list or Home's
empty-device state afterwards), with an unsynced-changes block; "Excluir conta na nuvem" deletes the
account atomically via `delete_own_account()`; other devices detect a gone account.

**Independent Test**: quickstart V14–V19.

### Tests for User Story 5

- [ ] T056 [P] [US5] Add `hasUnsyncedChanges` cases to `src/app/core/utils/sync-status.util.spec.ts`:
  false for a local profile; true with a tombstone; true with a row newer than `lastSyncedAt`; true
  with any row when `lastSyncedAt` is null; true when `colorsUpdatedAt` or `nameUpdatedAt` is newer;
  false otherwise.
- [ ] T057 [P] [US5] Write `src/app/core/services/profile-lifecycle.service.spec.ts`: wrong password
  throws `{ kind: 'field', field: 'pw', message: MSG.wrongLocal }` and deletes nothing; success signs
  out, deletes `grimorio-profile-{id}`, removes the record, leaves another profile's database and
  data intact (SC-004), clears a linked profile's `grm-cloud:{id}` session, and resolves with the
  number of profiles left.

### Implementation for User Story 5

- [ ] T058 [P] [US5] Add pure `hasUnsyncedChanges(input)` to `src/app/core/utils/sync-status.util.ts`
  with the contracts/services.md signature (`linked`, `lastSyncedAt`, `cards`, `locations`,
  `tombstoneCount`, `colorsUpdatedAt`, `nameUpdatedAt`) per data-model §4. Decks never count.
- [ ] T059 [US5] Create `src/app/core/services/profile-lifecycle.service.ts` (`providedIn: 'root'`)
  with `deleteProfile(id, password): Promise<number>` per research R9: `verifyPassword` (or throw
  the `MSG.wrongLocal` field failure) → `ProfileSessionService.signOut()` → for a linked profile,
  under `whileUnlinking`: `stopAutoRefresh`, best-effort `signOut({ scope: 'local' })` when online,
  `removeSession` (no network required; account and cloud data untouched) →
  `deleteProfileDb(id)` → `ProfileStore.remove(id)` → resolve with the remaining profile count.
  Depends on T004, T005.
- [ ] T060 [US5] Create `DeleteProfileStep` in
  `src/app/shared/auth/profile-modal/delete-profile-step/delete-profile-step.ts|.html|.scss` (FR-017,
  FR-018a): the "Sai deste aparelho:" plate (Cartas · Locais de armazenamento · Decks · Cores · O
  perfil {nome}); the linked note (cloud account and data are not deleted); the decks note
  (`PROFILE.delprofileDecksNote`) when `linkState !== 'local' && DeckService.decks().length > 0`
  (FR-018a); when `store.unsynced()`,
  a danger plate "Há mudanças que ainda não foram sincronizadas. Se excluir agora, elas se perdem."
  with secondary "Sincronizar agora" and the `blockSync` line ("Sincronizando…" with spinner /
  "Sincronizado agora — nada se perde na nuvem." / the SyncLine failure label + "Tentar de novo");
  "Senha do perfil" (`current-password`); ghost "Cancelar" + danger verb "Excluir perfil" /
  "Excluindo…", locked while `blockSync === 'syncing'` or `SyncStatusService.busy()`.
- [ ] T061 [US5] Wire `delprofile` in `ProfileFlowStore` (research R10, R17): on open evaluate
  `unsynced` with `hasUnsyncedChanges` from `CardService`, `StorageLocationService`
  (`getTombstones()`), `SyncService.lastSyncedAt()` and the active profile; `blockSync()` runs
  `SyncService.syncNow()` and maps `done` → `'done'` (re-evaluate `unsynced`), `offline`/`reauth`/
  `error` → that state, `gone` → `toGoneHub()` (T066); submit → `ProfileLifecycleService.deleteProfile`
  → close the modal, then `EntryModalService.open({ start: 'list' })` when profiles remain, else
  `router.navigateByUrl('/')`. Wire the `LocalScreen` danger `ActionRow` "Excluir perfil" / "Apaga
  {nome} e os dados dele deste aparelho" / "Excluir" → `openStep('delprofile')`, disabled with the
  hint "Aguarde a sincronização terminar" while syncing. Depends on T058, T059, T060.
- [ ] T062 [US5] Home empty-device state (FR-018b, research R15): in
  `src/app/views/home/home.ts|.html|.scss`, inject `ProfileStore` and when `profiles().length === 0`
  render the DESIGN.md empty-device pattern — eyebrow "Nenhum perfil neste aparelho", muted line
  "Crie um perfil para começar — funciona sem internet, sem e-mail.", `.btn--primary` "Criar perfil"
  → `EntryModalService.open({ context: 'device', start: 'profile' })`. Home stays ungated. Update
  `home.spec.ts`.
- [ ] T063 [US5] Add account-state detection to `src/app/core/services/cloud-auth.service.ts`
  (research R12): `checkAccount(profileId): Promise<'ok' | 'gone' | 'expired' | 'offline'>` via
  `client(profileId).auth.getUser()` (`user_not_found` → `gone`; the auth/session error set
  `SyncService` already treats as reauth, or no session → `expired`; offline or network error →
  `offline`); `forgetGoneAccount(profileId)` with no network: `removeSession`, `setCloud(id, null)`,
  `ToastService.show(TOAST.gone(email, nome))`, and bump `accountGone: Signal<{ profileId; n } |
  null>`; `unlink(profileId): Promise<'unlinked' | 'gone'>` runs `checkAccount` first when online and
  takes the gone path on `gone`. `expired` runs the existing `markNeedsReauth`.
- [ ] T064 [US5] Add `deleteAccount(profileId, password)` to
  `src/app/core/services/cloud-auth.service.ts` (research R11) through `run()`: offline →
  `MSG.offline`; verify the password with the transient sign-in from T052 (wrong →
  `MSG.wrongCloud`); `client(profileId).rpc('delete_own_account')`; then under `whileUnlinking`,
  `removeSession` and `ProfileStore.setCloud(id, null)`. A dropped connection after the RPC reports
  the offline failure, never success.
- [ ] T065 [US5] Create `DeleteCloudStep` in
  `src/app/shared/auth/profile-modal/delete-cloud-step/delete-cloud-step.ts|.html|.scss` (FR-019):
  the "Sai da nuvem para sempre:" plate and its notes (verbatim from `ph.delcloud`: other linked
  devices stop syncing; this device's profile and data stay), "Senha da conta"
  (`current-password`), form error, ghost "Cancelar" + danger verb "Excluir conta" / "Excluindo…".
- [ ] T066 [US5] Wire `delcloud` and the gone path in `ProfileFlowStore`: add `delcloud`/`delprofile`
  copy and the `cloudDeleted` done copy to `profile-flow.util.ts`; `openStep('cloudpw' | 'delcloud')`
  runs `checkAccount` when online (`gone` → `forgetGoneAccount`; `expired` → back to `cloud`, now
  showing the expired state); `delcloud` submit → `deleteAccount`, `done = 'cloudDeleted'`; the
  `unlink` submit's `'gone'` result takes the gone path; add a private `toGoneHub()` (after
  `forgetGoneAccount`: `phase = 'hub'`, `origin = 'hub'`, clear step state) and call it from every
  gone result the store receives — `openStep`'s `checkAccount`, the `unlink` submit, and T061's
  `blockSync`. No `effect`; `accountGone` stays for the shell's consumers;
  on `reauth`, an `invalid_credentials` failure sets `formError = MSG.wrongCloud` and `formHint =
  MSG.goneHint(nome)` (FR-019c), rendered under the form error. The `CloudScreen` "Excluir conta na
  nuvem" row is only rendered in the linked (not expired) state. Depends on T063, T064, T065.
- [ ] T067 [US5] Make the sync identity step gone-aware (data-model §4): in
  `src/app/core/services/sync.service.ts`, add `'gone'` to `SyncOutcome`; `exchange()` starts with
  `checkAccount` — `gone` → `forgetGoneAccount`, state `idle`, return `'gone'`; `expired` →
  `markNeedsReauth`, state `reauth`; `ok` → the T038 identity step, then locations, then cards (reuse
  the fetched user instead of calling `getUser()` twice, e.g. by having `checkAccount` expose the
  user internally). Make `SyncStatusService`/`SyncPlate` treat `'gone'` as settling to `local`.
- [ ] T068 [US5] Tests: `cloud-auth.service.spec.ts` for `checkAccount` (each result),
  `forgetGoneAccount` (session removed, `cloud` null, toast shown, `accountGone` bumped, local data
  kept), `deleteAccount` (offline, wrong password, success calls `rpc('delete_own_account')` then
  unlinks), and gone-aware `unlink`; `sync.service.spec.ts` for the `gone` and `expired` outcomes;
  `profile-flow.store.spec.ts` for `delprofile` (unsynced evaluation, delete locked while syncing,
  entry list vs navigate `/`, the decks note shown for a linked profile with decks and hidden for a
  local profile or one with no decks), `delcloud`, gone → hub, and the `reauth` `goneHint`.

**Checkpoint**: All stories work — quickstart V14–V19.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T069 Remove anything the rework left unused: old identity-wheel styles/helpers, entry-modal
  code only the link context used, and unused `entry-copy.ts` keys (search with Grep before
  deleting). No compatibility shims.
- [ ] T070 [P] Accessibility pass across `src/app/shared/auth/profile-modal/`,
  `src/app/shared/ds/action-row/`, `sync-plate/`, `toast/`: 44px targets (row verbs, toast ✕, prompt
  links on mobile), `aria-labelledby` on the current title, first field/row focused on each screen
  change, disabled rows with the sync hint, password `autocomplete` values and "do perfil" vs "da
  conta" labels (ui.md §6).
- [ ] T071 Run `npm run lint` and `npm test`; fix every failure.
- [ ] T072 Update `.claude/docs/architecture.md` with the durable conventions only (per CLAUDE.md's
  "worth adding" test): the profile modal (`ProfileModalService`, `ProfileFlowStore`,
  `shared/auth/profile-modal/`) and the one-modal rule; the `CloudFlowHost` token shared by
  `CloudForm`/`ResetForm`; `ToastService` + `ToastOutlet` hosts (popover inside the top dialog);
  `fluid-face.ts`; the sync identity step and `user_metadata` `grm_*_at` timestamps; profile deletion
  via `ProfileLifecycleService` + `deleteProfileDb`; `delete_own_account()` as the only cloud
  deletion path; the entry modal's contexts now `device | gate`. Show the proposed edit to the user
  before writing it.
- [ ] T073 Run the quickstart browser scenarios V1–V11, V14–V16, V19–V23 with the `run` skill against
  the user's dev server (never start or stop it). Then the two-device and live-cloud scenarios V12,
  V13, V17, V18 with throwaway accounts; for V18, **record the actual error code** from `getUser()`
  for a deleted user (`user_not_found` vs a session error) in `specs/005-profile-modal/research.md`
  R12, and after V17 query `card_entries`/`storage_locations` for that user id to confirm 0 rows.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none. T001 must land before any UI task; T002 before T064's live check.
- **Foundational (Phase 2)**: after Setup; blocks every story.
- **US1 (Phase 3)**: after Foundational. Every later story renders inside the modal US1 builds.
- **US2 (Phase 4)**: after US1 (needs `ProfileModal`, `LocalScreen`, `ProfileFlowStore`).
- **US3 (Phase 5)**: after US1. Independent of US2 except T039 and T042 both touch
  `cloud-auth.service.ts`/the store — do them in sequence.
- **US4 (Phase 6)**: after US1; `cloudpw` needs US3's `CloudScreen` (T043).
- **US5 (Phase 7)**: after US1; `delcloud`/gone need US3's `CloudScreen` and unlink (T042, T043);
  T064 reuses T052's transient sign-in (US4); T067 builds on T038 (US2).
- **Polish (Phase 8)**: after the stories you intend to ship.

### Within each story

- Pure utils and their specs first, then services, then components, then store wiring, then the
  store/component specs.
- Tasks editing the same file (`profile-flow.store.ts`, `profile-flow.util.ts`,
  `cloud-auth.service.ts`, `sync.service.ts`, `entry-copy.ts`) run in sequence even across stories.

## Parallel Opportunities

- **Phase 2**: T005, T007/T008, T014, T015 run in parallel once T003/T013 are done; T009 → T010/T011;
  T016 → T017; T012 and T018 are independent of the rest.
- **US1**: T019, T020, T021, T023, T025, T026 in parallel; then T024 → T027 → T028; T029/T030 in
  parallel.
- **US2**: T034 and T035 in parallel with T037.
- **US5**: T056, T057, T058 in parallel; T060 and T065 (components) in parallel with T063/T064
  (service).

### Parallel example: User Story 1

```text
Task: "T021 Create ProfileModalService in src/app/core/services/profile-modal.service.ts"
Task: "T023 Create profile-flow.util.ts in src/app/core/utils/profile-flow.util.ts"
Task: "T025 Create ActionRow in src/app/shared/ds/action-row/"
Task: "T026 Create SyncPlate in src/app/shared/ds/sync-plate/"
```

## Implementation Strategy

### MVP (US1 + US2)

1. Phase 1 (DESIGN.md, migration) and Phase 2 (foundation).
2. US1: the control opens the hub, sub-screens navigate, "Trocar de perfil" works → quickstart V1–V3.
3. US2: live colors and rename → V4–V6. This is the smallest shippable profile modal. Until US3,
   the hub sync plate's "Vincular conta na nuvem" and "Entrar de novo" are inert (store stubs);
   linking and re-sign-in still work from the shell's sync area, which keeps the entry-modal path
   until T045/T047.

### Incremental delivery

4. US3 moves link/reauth/unlink and prunes the entry modal (V8–V10, V21).
5. US4 adds both password changes and "Redefinir senha do perfil" (V7, V11, V20).
6. US5 adds both deletions, the empty-device state and gone-account detection (V14–V19).
7. Polish: cleanup, a11y, lint/test, architecture.md, the full quickstart including two-device runs.
