---

description: "Task list for spec 004: App Shell Navigation — Top Bar and Nav Bar"
---

# Tasks: App Shell Navigation — Top Bar and Nav Bar

**Input**: Design documents from `specs/004-app-shell-navigation/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R19), data-model.md, contracts/shell.md, ui.md, quickstart.md

**Tests**: Written only where quickstart.md's "Automated checks" lists them:

- `sync-status.util.spec.ts`
- `sync.service.spec.ts`
- `shell-state.service.spec.ts`
- `nav-drawer.spec.ts`
- the updated `entry-flow.util.spec.ts`

Specs for deleted code are deleted with it, and existing specs that break are updated.

**Visual values**: Every size, color, motion and copy value not quoted here comes from
`design_handoff_app_shell_navigation/README.md` (final, high fidelity). Once T001 lands, DESIGN.md is the source
of truth.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: the user story the task serves (US1–US6)

---

## Phase 1: Setup (design system first, Principle V / FR-032)

**Purpose**: Record every new visual decision in DESIGN.md before any shell UI is built, then add the tokens and
recipes.

- [X] T001 Update `DESIGN.md` per FR-032, using the handoff README's values. Make these changes:
  - **Elevation & depth**: add a "Fio de luz" subsection with the recipes `--band`, `--band-v`, `--band-lit`, the
    flowing line, thread, wash, overlay glow, and gradient text for the wordmark and the current nav label.
    Record them as explicit exceptions to "Every border is exactly 1px, solid" (Shapes) and "Titles … never
    change color" (Typography).
  - **Motion**: add the 120s `grm-flow-*` band animation and `--duration-drawer` 0.36s. Reduced motion stops the
    bands and makes the drawer 0s.
  - **Colors → Named rules**: add a status-color rule. Healthy sync states use text/muted, only failures use
    danger, and identity colors never signal status. Success and warning stay undefined.
  - **Components**:
    - Rewrite "App top bar": wide = wordmark · sync area · divider · profile control; narrow = wordmark · sync
      mark · Menu. It is no longer "identical at every width". Remove the temporary-button exemption.
    - Add entries for "Profile control", "Sync area & sync mark" (all 8 states with mark shapes), "Side nav"
      (collapsed/hover/pinned, pin button, beads), "Drawer" (right side, account block, mirrored nav) and "Legal
      notice".
    - Delete the "Sync line" entry.
  - **Content**:
    - Change "Use de 3 a 20 caracteres." to "Use de 3 a 16 caracteres."
    - Amend "Identity is always named twice" with the shell exception: dots + profile name visible, tribe and
      color names in the accessible name only.
  - **Iconography**: note that "Menu" and the pin are text and ✕ is the only glyph.
- [X] T002 [P] Extend `src/styles/_tokens.scss`:
  - Add `--nav-rail-width: 24px`, `--nav-panel-width: 232px`, `--drawer-width: min(288px, 85%)`,
    `--thread-x: 11px`, `--bead: 7px`, `--status-mark: 8px`, `--delay-nav-leave: 120ms` and
    `--duration-drawer: 0.36s`.
  - On `[data-theme-scope]`, next to the `--role-*` chain, declare `--band` (90deg stops per the handoff),
    `--band-v` (180deg), `--band-lit` (each stop `oklch(from var(--role-x) max(l, 0.68) c h)`) and
    `--glow-overlay: var(--shadow-rest), 0 0 24px -6px rgb(from var(--role-primary) r g b / 45%)`.
  - Add the keyframes `grm-flow-long`, `grm-flow-mark` and `grm-flow-v` (2400px travel).
  - Extend the existing reduced-motion rule so they stop and `--duration-drawer` becomes 0s.
  - Do not add `--z-*` tokens (research R15).
- [X] T003 [P] Create `src/styles/_fio.scss` (used as `@use 'fio'`, resolved through `stylePreprocessorOptions`)
  with these mixins:
  - `band-text($variant: mark | nav)`: transparent color, `--band-lit` clipped to text, 2400px size, the
    drop-shadow filter stack (the wordmark adds the 3px bg shadow; nav uses an 8px glow), animated with
    `grm-flow-mark`/`grm-flow-long`.
  - `line`: an absolutely positioned 1px bottom band.
  - `thread($side: left | right)`: 1px, `--band-v`, glow, at `var(--thread-x)`.
  - `wash($placement: bar | nav-start | nav-end)`: the masked radial washes, opacity .3.

  Every mixin sets `pointer-events: none`.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Make sync manual only, derive the sync display, centralize copy, and build the shell layout that
every story renders into.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

### Sync becomes manual (FR-006, FR-005a, SC-011)

- [X] T004 Modify `src/app/core/services/sync.service.ts` (research R8, R9; contracts/shell.md):
  - Add `export const SYNC_TIMEOUT_MS = 60_000`.
  - Add `start()`, idempotent. It registers `ProfileSessionService` hooks:
    - `beforeSwitch(previous)`: `cloud.stopAutoRefresh(previous.id)` when previous is linked.
    - `afterActivate(active)`: `void this.profileChanged()`, and when `active?.cloud && !active.cloud.needsReauth`,
      `cloud.startAutoRefresh(active.id)`.
    - It never calls `syncNow()`.
  - In `run()`, create an `AbortController` and a 60 s timer. Pass `.abortSignal(signal)` to every
    `client.from(...)` query. Race the whole run against the timer.
  - On timeout, set `'offline'` if `!connectivity.online()`, else `'error'`, and clear `inFlight`.
  - Add a per-run generation number, so a run that settles after a timeout or a newer run never sets state,
    writes `lastSyncedAt` or applies results.
  - Update the class comment: sync is manual only.
- [X] T005 Delete `src/app/core/services/sync-scheduler.service.ts` and
  `src/app/core/services/sync-scheduler.service.spec.ts`. In `src/app/app.ts`, replace
  `inject(SyncScheduler).start()` with `inject(SyncService).start()`.
- [X] T006 Remove the entry modal's automatic sync (research R8):
  - In `src/app/shared/auth/entry-modal/entry-flow.store.ts`:
    - Delete the `SyncKind` type, the `syncLine` signal and every `syncLine.set(...)`.
    - Make `finish(kind: DoneKind)` take no sync argument and never call `sync.syncNow()`.
    - Update every `finish(..., 'sync'|'download')` caller.
    - Remove the `SyncService`, `SyncLineState` and `SYNC` imports if unused.
  - In `src/app/shared/auth/entry-modal/done-panel/done-panel.ts`, remove the `<app-sync-line>` block and the
    `SyncLine` import.
- [X] T007 Delete `src/app/shared/ds/sync-line/` and remove its `SyncLine` export from `src/app/shared/index.ts`
  (depends on T006).
- [X] T008 [P] Create `src/app/core/utils/sync-status.util.ts` exporting:
  - `SyncDisplayKind`, `SyncAction`, `SyncDisplay` (fields: `kind`, `label`, `action`, `actionLabel`, `failure`,
    `opensModal`)
  - `SYNCED_WINDOW_MS = 5 * 60_000`
  - `relativeSince(fromIso, now)`: under 60 min → `há N min` with N = max(1, floor minutes); under 24 h →
    `há N h`; otherwise `há N d`
  - `syncDisplay({ linked, state, lastSyncedAt, now })`, which applies the first matching rule of the
    data-model.md table:
    1. syncing → `action: null`
    2. offline → retry
    3. reauth → kind `expired`, action reauth
    4. error → retry
    5. `!linked` → `local`, link
    6. `lastSyncedAt === null` → never, sync
    7. `now − lastSyncedAt < 5 min` → synced, sync
    8. otherwise → last, sync

  Labels and action labels come from `SYNC_AREA` (T011). `failure` is true for offline, expired and error.
  `opensModal` is true for the reauth and link actions (depends on T011).
- [X] T009 [P] Create `src/app/core/utils/sync-status.util.spec.ts` covering:
  - every row of the priority table, including a failure while unlinked
  - the 5-minute boundary (4:59 → synced, 5:00 → "há 5 min")
  - 59 min → "há 59 min", 60 min → "há 1 h", 23 h → "há 23 h", 24 h → "há 1 d"
  - `relativeSince` of 30 s returns "há 1 min"
  - `failure` and `opensModal` flags per kind

  Depends on T008.
- [X] T010 Create `src/app/core/services/sync-status.service.ts` (`providedIn: 'root'`):
  - A private `now` signal refreshed every 60 000 ms by a `setInterval`, cleared on `DestroyRef`.
  - `display = computed(...)`: `null` when `session.active()` is null (FR-009); otherwise
    `syncDisplay({ linked: !!active.cloud, state: sync.state(), lastSyncedAt: sync.lastSyncedAt(), now: now() })`.
  - `busy = computed(() => sync.state() === 'syncing')`.
  - `act()`: a no-op while busy.
    - `sync` and `retry` → `void sync.syncNow()`
    - `link` → `void entryModal.open({ context: 'link', start: 'in' })`
    - `reauth` → `void entryModal.open({ context: 'link', start: 'reauth' })`

  Depends on T004 and T008.
- [X] T011 [P] Update `src/app/core/utils/entry-copy.ts` (research R17, ui.md §7):
  - Change the header comment to cover the shell.
  - Add `SHELL`: `menu: 'Menu'`, `close: ACTION.close`, `navLabel: 'Navegação principal'`,
    `collection: 'Coleção'`, `pin: 'Fixar menu'`, `unpin: 'Recolher menu'`, `home: 'Grimorio — Início'`,
    `signIn: ACTION.in`, `noProfile: 'Nenhum perfil ativo'`, `profileHint: 'Trocar de perfil ou sair'`,
    `profileBusy: 'Aguarde a sincronização terminar'`, `notice: 'Aviso legal'`, and
    `profileLabel(name, tribe, colors) => \`Perfil ${name} — ${tribe} · ${colors}. Trocar de perfil ou sair.\``.
  - Add `SYNC_AREA`: `syncing: 'Sincronizando…'`, `synced: 'Sincronizado'`,
    `last: (rel) => \`Sincronizado ${rel}\``, `never: 'Nunca sincronizado'`, `local: 'Sem conta na nuvem'`,
    `offline: 'Sem conexão'`, `expired: 'Sessão expirada'`, `error: 'Falha ao sincronizar'`,
    `actSync: 'Sincronizar agora'`, `actRetry: 'Tentar de novo'`, `actReauth: 'Entrar de novo'`,
    `actLink: ACTION.linkCloud`, and `areaLabel: (label, action) => \`${label}. ${action}.\``.
  - Add `export type NoticeRun = string | { text: string; href: string }` and `NOTICE`:
    - `wotc`: the FR-027(a) text with a `{ text: 'Fan Content Policy', href: 'https://company.wizards.com/en/legal/fancontentpolicy' }` run
    - `scryfall`: the FR-027(b) text with a `{ text: 'Scryfall', href: 'https://scryfall.com' }` run
    - `ai: 'Parte do desenvolvimento deste app contou com ferramentas de inteligência artificial.'`

    The wording is taken verbatim from `src/app/views/about/about.html`.
  - Delete `TOP_BAR` and `SYNC`.
  - Set `MSG.userLen` to `'Use de 3 a 16 caracteres.'` and `HELPER.name` to
    `'3 a 16 caracteres: letras, números, _ . ou -'`.
  - Set `SUBTITLE.up` to `(p) => \`${p} pode sincronizar entre aparelhos quando você quiser.\``.
  - Set `SUBTITLE.reauth` to `(p) => \`A sessão da conta expirou. Entre para voltar a sincronizar ${p}.\``.

### Shell state and layout (FR-023 to FR-026)

- [X] T012 [P] Add `export const WIDE_QUERY = '(min-width: 960px)';` to `src/app/shared/ds/media-query.ts`.
- [X] T013 Create `src/app/core/services/shell-state.service.ts` (`providedIn: 'root'`, research R4, R12):
  - `NAV_PINNED_KEY = 'grm-nav-pinned'`.
  - `wide = mediaQuerySignal(WIDE_QUERY)`.
  - `pinned`: read once from `localStorage.getItem(NAV_PINNED_KEY) === '1'` inside try/catch, false on any
    throw.
  - `setPinned(v)`: sets the signal, then tries `setItem(key, '1')` or `removeItem(key)`, swallowing errors.
  - `drawerOpen`: a `linkedSignal` on `wide()` that resets to `false` whenever `wide()` changes (no effect),
    plus `openedViaKeyboard` (read by the drawer for its opening focus), with
    `openDrawer(viaKeyboard: boolean)` (a no-op when `wide()`) and `closeDrawer()`.
  - A Router `events` subscription that closes the drawer on every `NavigationStart`.

  Depends on T012.
- [X] T014 [P] Create `src/app/core/services/shell-state.service.spec.ts` covering:
  - the default is not pinned
  - `'1'` in storage restores pinned
  - `setPinned` persists and clears
  - a throwing `localStorage` (stubbed `getItem`/`setItem`) → starts unpinned, and `setPinned(true)` still sets
    the signal without throwing
  - `closeDrawer` on `NavigationStart`
  - `drawerOpen` resets to false when `wide` flips (stub `matchMedia`)

  Depends on T013.
- [X] T015 Rebuild the shell layout in `src/app/app.html`, `src/app/app.scss` and `src/app/app.ts` (research R1–R3):
  - **Template**: `<app-top-bar />`, then `<div class="shell-row">` holding
    `@if (shell.wide()) { <app-side-nav /> }` and `<main #main class="view-area"><router-outlet /><app-legal-notice /></main>`,
    then `@if (!shell.wide()) { <app-nav-drawer /> }`, then `<app-entry-modal />`.
  - **SCSS**:
    - The host is a grid `auto minmax(0, 1fr)`, `height: 100dvh`, `overflow: clip`.
    - `.shell-row`: `display: flex; min-height: 0; position: relative`.
    - `.view-area`: `flex: 1; min-width: 0; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; scrollbar-width: thin; scrollbar-color: var(--color-surface-raised) transparent`.
    - `.view-area > *`: `flex-shrink: 0`.
    - Remove all legacy `.app-layout`/`.app-shell`/`--nav-bar-height` rules and the stale comment.
  - **TS**: inject `ShellState` as `shell`. Subscribe to Router `NavigationEnd`; when the path (URL without query
    or fragment) differs from the previous one and the navigation's `info` is not `{ sessionChange: true }`, set
    `main.scrollTop = 0`.
  - The `NavBar` import and `<app-nav-bar />` go away here. The components are created in later phases, so wire
    the imports as each one lands.

  Depends on T005 and T013.
- [X] T016 Remove `data: { showCollectionFilters: true }` from the `collection/:id` route in
  `src/app/app.routes.ts`, and update `src/app/app.routes.spec.ts` if it asserts that data. Update
  `src/app/app.spec.ts` so `App` still creates, with `provideRouter([])` and its new children.

**Checkpoint**: Sync is manual, the display is derivable and tested, the copy exists, and the shell grid is
scrolling-correct. Stories can start.

---

## Phase 3: User Story 1 — See who is using the app and reach the profile flows (Priority: P1) 🎯 MVP

**Goal**: The top bar shows the wordmark and the profile control (dots + name, or Entrar). Tapping it opens the
entry modal. The control locks while a sync runs.

**Independent Test**: quickstart V1–V3. At wide and narrow widths, with and without a profile, the control shows
correctly and opens the modal. Narrow depends on US4's drawer for placement, so test US1 at wide first.

- [X] T017 [P] [US1] Create `src/app/shared/layout/profile-control/profile-control.ts` (+ `.html`/`.scss`):
  - **Inputs and output**: input `variant: 'bar' | 'drawer'` (required), output `activate`.
  - **With an active profile**: a `<button type="button">` holding identity dots (8px circles, `gap: 3px`, in
    `profile.colors` order, background `var(--identity-x)` / `IDENTITY_HEX` with `box-shadow: 0 0 6px`) + the
    name (Karla 700; 0.875rem in the bar, 1rem in the drawer).
  - **Accessible name**: `SHELL.profileLabel(name, tribeName(colors), colorNames(colors))`.
  - **While `SyncStatusService.busy()`**: `aria-disabled="true"`, `opacity: .5`, `cursor: not-allowed`,
    `aria-label` and `title` = `SHELL.profileBusy`, and the click does not emit.
  - **With no profile**: an "Entrar" button (`SHELL.signIn`). The drawer variant precedes it with
    `<p>` `SHELL.noProfile` (0.75rem muted).
  - **Layout**: 44px min height. The drawer variant is right-aligned. No truncation (`white-space: nowrap`, no
    ellipsis).
  - Hover color → `--role-primary-hover`.
- [X] T018 [US1] Rewrite `src/app/shared/layout/top-bar/top-bar.ts` (split into `.html`/`.scss`), `role="banner"`:
  - **Wordmark**: `<a routerLink="/" class="wordmark" [attr.aria-label]="SHELL.home">Grimorio</a>` with
    `@include fio.band-text(mark)`, Grenze 700, `--font-size-lg`, 44px min height, no underline.
  - **Decorative spans**: `fio.wash(bar)` and `fio.line` (`aria-hidden`).
  - **Container**: `display: flex; align-items: center; gap: var(--space-1); min-height: 44px; overflow: hidden; position: relative; z-index: 3; background: var(--color-bg)`.
    Padding is `4px var(--space-4)` wide and `4px var(--space-1) 4px var(--space-4)` narrow. There is no border.
  - **Wide** (`ShellState.wide()`): a right group (`margin-left: auto`) holding
    `<app-profile-control variant="bar" (activate)="openProfile()">`. The sync area and its divider are added by
    T028.
  - **`openProfile()`**: with an active profile → `entryModal.open({ context: 'gate', start: 'list' })`; with no
    profile → `entryModal.open()`.
  - **Narrow**: the Menu slot is added by T031.

  Depends on T017.
- [X] T019 [US1] Wire `TopBar` into `src/app/app.ts`, and delete `src/app/shared/auth/profile-button/` along with
  its `ProfileButton` export in `src/app/shared/index.ts` (FR-010; the unlink gap is accepted, research R19).
- [X] T020 [P] [US1] Enforce the 3–16 name rule (FR-033):
  - In `src/app/core/utils/entry-flow.util.ts`, change the name-length check from `> 20` to `> 16`.
  - In `src/app/core/models/profile.model.ts`, change the `ProfileRecord.name` doc comment to "3–16 chars".
  - Do not add a `maxlength` attribute anywhere.
- [X] T021 [P] [US1] Update `src/app/core/utils/entry-flow.util.spec.ts`: 16 characters is valid, and
  `'a'.repeat(17)` returns `MSG.userLen` (replacing the current 21-character case). Depends on T020.

**Checkpoint**: On wide screens, the top bar shows who is active and opens the modal. The MVP is shippable.

---

## Phase 4: User Story 2 — Navigate between Home and the collection (Priority: P1)

**Goal**: A left side nav on wide screens, collapsed thread → hover/focus overlay → pinned (persisted), with
"Coleção" marked current on `/collection/**`.

**Independent Test**: quickstart V4–V6.

- [X] T022 [P] [US2] Create `src/app/shared/layout/nav-links/nav-destinations.ts` with
  `export interface NavDestination { label: string; path: string }` and
  `export const NAV_DESTINATIONS: readonly NavDestination[] = [{ label: SHELL.collection, path: '/collection' }]`.
  It has no Home entry (FR-011).
- [X] T023 [US2] Create `src/app/shared/layout/nav-links/nav-links.ts` (+ `.html`/`.scss`):
  - Inputs: `mirrored = false`, `showLabels = true`.
  - Renders one `<a>` per destination with `routerLink`, `routerLinkActive="is-current"`,
    `[routerLinkActiveOptions]="{ exact: false }"` and `ariaCurrentWhenActive="page"`.
  - Item box: flex, `gap: 14px`, 44px min height, `padding: 0 4px`, 1px transparent border, radius
    `0 4px 4px 0` (mirrored: `4px 0 0 4px`, `flex-direction: row-reverse`), muted text, no wrapping.
  - Bead: 7px, `margin-left: 3px` (mirrored: right), centered on the thread. The current bead has role-primary
    fill and glow. The label is always in the DOM. When `showLabels` is false it is visually hidden (clipped, still read by
    assistive technology), so each collapsed link keeps its accessible name (SC-003). The current label is 700
    with `fio.band-text(nav)`.
  - Hover/focus "flair" over `--duration-fast`: text color, a row gradient (mirrored at 270deg), bead scale 1.3
    with glow, label `translateX(±3px)` + `--glow-title`.

  Depends on T022.
- [X] T024 [US2] Create `src/app/shared/layout/side-nav/side-nav.ts` (+ `.html`/`.scss`), research R13:
  - **Host**: `display: contents`. It renders a spacer `<div class="nav-spacer">` (width `--nav-panel-width`
    when `shell.pinned()`, else `--nav-rail-width`, transitioning over `--duration-base`) and
    `<nav aria-label="Navegação principal">`.
  - **`<nav>` styles**: `position: absolute; left: 0; top: 0; bottom: 0; z-index: 2; display: flex; flex-direction: column; gap: 4px; overflow: hidden; background: var(--color-bg)`.
    Collapsed: width rail, `padding: 10px 0`, transparent right border. Expanded: width panel,
    `padding: 10px 10px 10px 0`, `--color-border` right border. When expanded but not pinned, add
    `box-shadow: var(--glow-overlay)`.
  - **Decorative**: `fio.thread(left)` + `fio.wash(nav-start)`.
  - **Signals**: `hover` and `focusWithin`, with `expanded = computed(pinned || hover || focusWithin)`.
    - `pointerenter` (ignored when `pointerType === 'touch'`) sets `hover` and cancels the leave timer.
    - `pointerleave` clears `hover` after 120 ms.
    - `focusin` sets `focusWithin`. `focusout` clears it when `relatedTarget` is outside the nav.
  - **Click to pin**: a click on the nav whose target is not inside an `a` or `button` calls
    `shell.setPinned(true)`.
  - **Pin button**: always rendered first, with `visibility: hidden; opacity: 0` while collapsed.
    `min-height: 44px; margin: 0 0 6px 20px; width: calc(100% - 20px)`, eyebrow text,
    `[attr.aria-pressed]="shell.pinned()"`, label `shell.pinned() ? SHELL.unpin : SHELL.pin`, and it toggles
    `setPinned`.
  - **Links**: `<app-nav-links [showLabels]="expanded()" />`.

  Depends on T013 and T023.
- [X] T025 [US2] Wire `SideNav` into `src/app/app.ts` (it is rendered only when `shell.wide()`). Delete
  `src/app/shared/layout/nav-bar/`, `src/app/shared/layout/brand-mark/` and
  `src/app/shared/locations/collection-filters/`, including their specs, and remove their `NavBar`, `BrandMark`
  and `CollectionFilters` exports from `src/app/shared/index.ts`. First confirm with grep that they have no other
  consumers (FR-017).

**Checkpoint**: On wide screens, Home and the collection are reachable, and the nav hover and pin work and
persist.

---

## Phase 5: User Story 3 — Sync my collection when I choose to (Priority: P2)

**Goal**: A wide sync area button, a narrow status mark, and eight distinct states. Sync starts only from the
person.

**Independent Test**: quickstart V11–V16. The drawer action half is completed in US4 (T030).

- [X] T026 [P] [US3] Create `src/app/shared/ds/sync-mark/sync-mark.ts` (`aria-hidden`), input
  `kind: SyncDisplayKind`, 8px (`--status-mark`):
  - syncing: a `.spinner` (existing `spin` keyframe), muted, 0.75rem
  - synced: a `--color-text` dot + `0 0 8px rgb(from var(--color-text) r g b / 60%)`
  - last: a muted dot with no glow
  - never: a 1px `--color-text` ring
  - local: a 1px muted ring
  - offline, expired, error: a `--color-danger` dot + `0 0 8px` danger glow

  Identity colors are never used (FR-007a).
- [X] T027 [US3] Create `src/app/shared/layout/sync-status/sync-status.ts` (+ `.html`/`.scss`), input
  `variant: 'area' | 'mark' | 'drawer'`, output `action`. It renders nothing when `SyncStatusService.display()`
  is null.
  - **`area`**: a `<button type="button">` with `<app-sync-mark>` + the label.
    - `min-height: 44px; padding: 0 var(--space-3); gap: var(--space-2)`, Karla 0.75rem/1.2, nowrap,
      transparent, no border.
    - Label color: text for synced, danger when `failure`, muted otherwise. Hover color → `--color-text`.
    - `aria-label` and `title` = `SYNC_AREA.areaLabel(label, actionLabel)`, or just the label while syncing.
    - While busy: `aria-disabled="true"` and `cursor: not-allowed`, and the click is a no-op. Otherwise the
      click calls `SyncStatusService.act()`.
  - **`mark`**: a `24×44` span, `role="status"`, `aria-label`/`title` = label, containing only
    `<app-sync-mark>`. Not focusable and not clickable (FR-018a).
  - **`drawer`**: a `<p role="status">` line (mark + label, 0.75rem, right-aligned). When `action !== null`, it
    is followed by a `.link-btn` (0.75rem eyebrow, muted, or danger when `failure`) labelled `actionLabel`, whose
    click emits `action` with the `SyncDisplay` so the drawer can decide the order (T030).

  Depends on T010 and T026.
- [X] T028 [US3] In `src/app/shared/layout/top-bar/top-bar.html`, add these to the wide right group before the
  profile control, only when a profile is active: `<app-sync-status variant="area" />` and a
  `<span class="divider" aria-hidden="true">` (1px × 20px, `--color-border`). In the narrow layout, add
  `<app-sync-status variant="mark" />` before the Menu slot, only when a profile is active (FR-018).
- [X] T029 [P] [US3] Create `src/app/core/services/sync.service.spec.ts` covering:
  - `syncNow()` twice while running returns the same promise, and only one run happens
  - a stalled Supabase call (a mocked client whose query never resolves), with fake timers advanced by 60 s →
    the state is `'error'`, or `'offline'` when `navigator.onLine` is stubbed to false, and `inFlight` clears
  - a late resolution after the timeout does not change state or `lastSyncedAt`
  - `start()` registers hooks that never call `syncNow()`: activate a linked profile and assert no sync
  - `profileChanged()` resets a failure state to `'idle'`

  Depends on T004.

**Checkpoint**: On wide screens, the full sync status and trigger work, and nothing syncs by itself.

---

## Phase 6: User Story 4 — Use the shell comfortably on a phone (Priority: P2)

**Goal**: The narrow top bar (wordmark · sync mark · Menu) and a right-hand drawer with the account block and the
nav.

**Independent Test**: quickstart V7, V8, V10 and V22 at 360px and 320px.

- [X] T030 [US4] Create `src/app/shared/layout/nav-drawer/nav-drawer.ts` (+ `.html`/`.scss`), research R5 and R6:
  - **Element**: `<dialog #dialog id="grm-drawer" [attr.aria-label]="SHELL.menu" tabindex="-1">`, driven by an
    `effect` on `shell.drawerOpen()` (`showModal()` / `close()`).
  - **Surface**: `position: fixed; inset: 0 0 0 auto; margin: 0; height: 100dvh; max-height: none; width: var(--drawer-width); background: var(--color-bg); border: 0; border-left: 1px solid var(--color-border); padding: 0`.
    When open, it carries `box-shadow: var(--glow-overlay)`.
  - **Animation**: `translateX(100%)` → `0` via `@starting-style` and
    `transition: transform var(--duration-drawer) var(--ease-standard), overlay var(--duration-drawer) allow-discrete, display var(--duration-drawer) allow-discrete`.
    `::backdrop` uses `var(--color-backdrop)` with an opacity transition.
  - **Decorative**: `fio.thread(right)` + `fio.wash(nav-end)`.
  - **Content, top to bottom**:
    - A header row with a ✕ button (44×44, `aria-label` = `SHELL.close`)
    - An account block (flex column, `align-items: flex-end`, right text): `<app-profile-control variant="drawer" (activate)="openModal(...)">` and `<app-sync-status variant="drawer" (action)="onSyncAction($event)">`
    - A 1px divider
    - `<app-nav-links mirrored [showLabels]="true" />`
  - **Close paths**: the `cancel` event (Esc/Back) → `preventDefault()` + close. A `click` whose target is the
    dialog itself (backdrop) → close. ✕ → close.
  - **Every close**: `shell.closeDrawer()`, then focus the Menu button (found by
    `document.querySelector('[aria-controls="grm-drawer"]')` or through `ShellState`) with
    `{ preventScroll: true }`.
  - **Opening focus**: if `shell.openedViaKeyboard()`, focus ✕; otherwise focus the dialog. Both use
    `{ preventScroll: true }`.
  - **`openModal(request)`**: close the drawer synchronously → focus Menu (`preventScroll`) →
    `entryModal.open(request)`.
    - Profile control: with an active profile, `{ context: 'gate', start: 'list' }`; with none, the defaults.
  - **`onSyncAction(display)`**: if `display.opensModal`, call `openModal` with link → `{ context: 'link', start: 'in' }`
    or reauth → `{ context: 'link', start: 'reauth' }`. Otherwise call `SyncStatusService.act()` and keep the
    drawer open (FR-020a).
  - There is no pin button (FR-021).

  Depends on T010, T013, T017, T023 and T027.
- [X] T031 [US4] In `src/app/shared/layout/top-bar/top-bar.html` and `.scss`, add the narrow layout: a right group
  (`margin-left: auto; gap: var(--space-1)`) with the sync mark (T028) and
  `<button type="button" class="btn btn--ghost menu" aria-controls="grm-drawer" [attr.aria-expanded]="shell.drawerOpen()" (click)="shell.openDrawer($event.detail === 0)">Menu</button>`
  (`padding: 0 var(--space-2)`, eyebrow text: 0.75rem, `--tracking-eyebrow`, uppercase, muted). The profile
  control is not rendered narrow (FR-018).
- [X] T032 [US4] Wire `NavDrawer` into `src/app/app.ts` (it is rendered only when `!shell.wide()`).
- [X] T033 [P] [US4] Create `src/app/shared/layout/nav-drawer/nav-drawer.spec.ts`. Stub
  `HTMLDialogElement.prototype.showModal`/`close` if jsdom lacks them. Cover:
  - `drawerOpen` true → `showModal` called
  - the `cancel` event closes, and focus lands on the Menu button
  - the profile control activation calls `closeDrawer()` **before** `EntryModalService.open` (spy call order),
    and focus is on Menu when `open` is called
  - a `sync` action does not close the drawer
  - a `link` action closes it first, then opens `{ context: 'link', start: 'in' }`

  Depends on T030.

**Checkpoint**: The phone shell is complete. Every destination and the profile modal are within 2 taps.

---

## Phase 7: User Story 5 — Scroll only the content (Priority: P2)

**Goal**: Only `<main>` scrolls. The top bar and the nav stay put, and the scroll resets on page change. Most of
this is delivered by T015. This phase verifies it and fixes legacy views.

**Independent Test**: quickstart V17 and V18.

- [X] T034 [US5] Audit the legacy views under `src/app/views/` (`home`, `collection`, `collection-detail`,
  `collection-import`, `decks`, `deck-detail`, `about`) for rules that assume the document scrolls or depend on
  `--nav-bar-height` (`100vh`/`100dvh` heights, `position: fixed` headers). Fix only what keeps them usable
  inside `.view-area`. `collection-detail`'s `:host { height: 100%; overflow: hidden }` must keep working as a
  direct flex child (research R2). Do not restyle anything else (unreleased-redo scope).
- [X] T035 [US5] Using the `run` skill against the user's running dev server (never start or stop port 4200),
  verify quickstart V17 and V18 at 1280×800 and 360×740: `document.documentElement.scrollTop === 0` after
  scrolling a long collection, the top bar's position is unchanged, and `<main>.scrollTop` resets on
  navigation.

---

## Phase 8: User Story 6 — See the legal and attribution notice (Priority: P3)

**Goal**: A shared WotC/Scryfall/AI notice at the end of every page, from one source.

**Independent Test**: quickstart V19.

- [X] T036 [P] [US6] Create `src/app/shared/layout/legal-notice/legal-notice.ts` (+ `.html`/`.scss`):
  - **Element**: `<aside [attr.aria-label]="SHELL.notice">` rendering `NOTICE.wotc`, `NOTICE.scryfall` (runs:
    strings as text; `{ text, href }` as `<a [href] target="_blank" rel="noopener">`) and `NOTICE.ai` as three
    `<p>`.
  - **Host styles**: `margin-top: auto; display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-5) var(--space-6)`
    (narrow: `var(--space-5) var(--space-4)`), `border-top: 1px solid var(--color-border)`, 0.75rem/1.5 muted.
  - **Paragraphs**: `max-width: 72ch; text-wrap: pretty`.
  - **Links**: `--role-accent`, hover `--role-accent-hover` + underline, and
    `display: inline-block; padding: 13px 0; margin: -13px 0` for a 44px hit area (FR-022).
- [X] T037 [US6] Wire `<app-legal-notice />` as the last child of `<main>` in `src/app/app.html` (T015
  placeholder). Depends on T036.
- [X] T038 [P] [US6] Update `src/app/views/about/about.ts` and `about.html` so the WotC and Scryfall paragraphs
  render from `NOTICE.wotc` and `NOTICE.scryfall` (the same run-rendering as T036), keeping the first "projeto
  pessoal" paragraph as is (FR-029). Update `src/app/views/about/about.spec.ts` if it asserts the hard-coded
  text.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T039 Confirm that `src/app/shared/index.ts` exports the new shell components only where other code imports
  them through the barrel (within `shared/`, use `@shared/deep-path`, per architecture.md). Remove stale exports.
- [X] T040 Run `grep -rn "syncNow(" src/app --include=*.ts` (excluding `*.spec.ts`) and confirm that only
  `sync.service.ts` and `sync-status.service.ts` match. Also confirm that `SyncScheduler`, `ProfileButton`,
  `NavBar`, `SyncLine`, `TOP_BAR` and `SYNC.` have no references left (SC-011).
- [X] T041 Run `npm run lint` and `npm test`, and fix any failures.
- [X] T042 Using the `run` skill (on the user's dev server), walk through quickstart V1–V22 at 1280×800, 360×740
  and 320px. Include:
  - V4: hover causes 0 px of content shift, compared with `getBoundingClientRect`
  - V9: the modal makes the shell inert
  - V10: resize across 960px with the drawer open
  - V16: a red identity never shows danger
  - V20: reduced motion
  - V22: every target ≥ 44px, no horizontal overflow

  Report any scenario that can't be automated for manual checking.
- [ ] T043 Update `.claude/docs/architecture.md` (propose the edit for review first, per CLAUDE.md):
  - Sync: sync is manual only, `SyncScheduler` is removed, `SyncService.start()` registers the auto-refresh
    hooks, and a sync run is capped at 60 s.
  - The shell structure: the top bar / side nav / drawer / `<main>` as the only scroll container / legal notice,
    and `ShellState` with the `grm-nav-pinned` localStorage key.
  - The new `src/styles/_fio.scss` partial (`@use 'fio'`).
  - The "Page shell" and "Nav bar" bullets, which no longer describe legacy `.app-layout`/`NavBar`.
  - `ProfileButton` is gone from the Auth section.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001–T003)**: T001 comes first (DESIGN.md before UI, Principle V). T002 and T003 can run in parallel
  after it.
- **Foundational (T004–T016)**: depends on Setup and blocks every story.
- **US1 (T017–T021)**: after Foundational. This is the MVP.
- **US2 (T022–T025)**: after Foundational. It is independent of US1 except for shared edits to `app.ts` (do them
  one after the other).
- **US3 (T026–T029)**: after Foundational. T028 edits the top bar, so it comes after T018.
- **US4 (T030–T033)**: needs T017 (US1), T023 (US2) and T027 (US3), because the drawer composes all three.
- **US5 (T034–T035)**: after T015. Best done after US2/US4, so both layouts exist.
- **US6 (T036–T038)**: after Foundational. Independent.
- **Polish (T039–T043)**: after all the stories.

### Key task dependencies

- T004 → T005, T010, T029
- T006 → T007
- T008 → T009, T010
- T011 → T008 (labels)
- T012 → T013 → T014, T015, T024, T030
- T017 → T018 → T019, T028, T031
- T022 → T023 → T024, T030
- T026 → T027 → T028, T030
- T030 → T032, T033
- T036 → T037

### Parallel opportunities

- **Setup**: T002 ∥ T003.
- **Foundational**:
  - T008 ∥ T011 ∥ T012. Write T011 first, or stub the labels, since T008 reads them.
  - T009 ∥ T014, once their subjects exist.
- **Across stories** after Foundational: T017 (US1) ∥ T022/T023 (US2) ∥ T026 (US3) ∥ T036 (US6). Each is a new
  file.
- T020/T021 (the name rule) can run in parallel with any UI task.
- T038 (About) can run in parallel with T036.

## Parallel Example: after Phase 2

```text
Task: "T017 [US1] Create ProfileControl in src/app/shared/layout/profile-control/"
Task: "T023 [US2] Create NavLinks in src/app/shared/layout/nav-links/"
Task: "T026 [US3] Create SyncMark in src/app/shared/ds/sync-mark/"
Task: "T036 [US6] Create LegalNotice in src/app/shared/layout/legal-notice/"
Task: "T020 [US1] Enforce the 3–16 name rule in entry-flow.util.ts"
```

## Implementation Strategy

### MVP (User Story 1)

1. Phase 1 (DESIGN.md, tokens, `_fio`) → Phase 2 (manual sync, sync display, copy, shell grid).
2. Phase 3: the top bar with the wordmark and the profile control on wide screens.
3. **Stop and validate** with quickstart V1–V3 at wide widths.

### Incremental delivery

1. US1 → the wide top bar identifies the profile.
2. US2 → the wide side nav (collection reachable without typing a URL).
3. US3 → the wide sync area. At this point wide screens are feature-complete.
4. US4 → the narrow top bar + drawer. Phones are complete.
5. US5 → legacy view fixes and scroll verification.
6. US6 → the legal notice + About reuse.
7. Polish → full quickstart pass and the architecture.md update.

## Notes

- Never add backward-compatibility code, migrations or `maxlength` truncation (CLAUDE.md, FR-033 edge case).
- New components are standalone and OnPush, and use signal inputs and outputs. The `effect` blocks are only for
  dialog open/close and the router scroll reset.
- New UI must not use `src/styles/_modal.scss`, `_dropdown.scss`, or anything under `shared/common/`.
- The "Desvincular conta" gap is accepted (research R19). Do not add an entry point for it.
