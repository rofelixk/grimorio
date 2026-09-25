# Research: App Shell Navigation (spec 004)

Each entry follows the format: Decision / Rationale / Alternatives considered. The Technical Context has no open
NEEDS CLARIFICATION items. These entries settle the implementation questions that the spec and the design handoff
(`design_handoff_app_shell_navigation/README.md`) leave open.

## R1. Shell composition: the app root is the shell

- **Decision**: `App` (`src/app/app.ts`/`app.html`) stays the themed root and becomes the shell grid:
  - `<app-top-bar>`
  - a row holding `<app-side-nav>` (wide only) and `<main>`
  - `<main>` holds `<router-outlet>` and `<app-legal-notice>`
  - `<app-nav-drawer>` (narrow only)
  - `<app-entry-modal>`

  New components live in `shared/layout/`. The legacy `NavBar`, `ProfileButton`, `CollectionFilters` and
  `BrandMark` are deleted, along with the `showCollectionFilters` route data. The `@shared` barrel loses their
  exports.
- **Rationale**: The root already carries `data-grm`, `data-theme-scope` and the `--theme-*` bindings (spec 003,
  R13). A separate `AppShell` component would only move those bindings. The handoff says to replace the top bar and
  the legacy nav rather than reuse them. CLAUDE.md forbids keeping dead code for compatibility.
- **Alternatives considered**:
  - A wrapping `AppShell` component. It adds a layer that does nothing.
  - Keeping `NavBar` for the collection-filter panel. The spec's Assumptions accept losing that entry point.

## R2. Only one scroll container, and routed views are its direct children

- **Decision**:
  - The host grid is `auto | minmax(0, 1fr)`, `height: 100dvh`, `overflow: clip`.
  - `<main>` is the only scroll container: `overflow-y: auto`, `overflow-x: hidden`, flex column.
  - The routed component's host and the notice are **direct flex children** of `<main>`, with `flex-shrink: 0`.
    There is no padded wrapper around `<router-outlet>`, and views keep their own padding.
  - The notice uses `margin-top: auto`.
  - The row below the top bar is a flex row: a nav spacer (wide) plus `<main>`, and the `<nav>` is absolutely
    positioned inside the row.
- **Rationale**:
  - `collection-detail` sizes itself with `height: 100%` to get its inner scrolling grid. A wrapper with automatic
    height would break that. As direct children, its 100% resolves against `<main>`, and the notice follows below
    it, as the spec's edge case requires (the notice is never inside a nested panel).
  - `100dvh` follows mobile browser bars (FR-025).
  - `overflow: clip` stops programmatic sideways scroll, which `hidden` still allows.
- **Alternatives considered**:
  - The handoff's padded `flex: none` page wrapper. It breaks the legacy views that size themselves to 100%.
  - `position: fixed` on the top bar with the document scrolling. Rejected by FR-023.

## R3. Scroll reset on page change

- **Decision**: `App` subscribes to the Router's `NavigationEnd` and sets `main.scrollTop = 0` when the path
  (`urlAfterRedirects` without query or fragment) differs from the previous one. It does nothing on the
  same-URL re-guard navigations from `ProfileSessionService` (`info.sessionChange`).
- **Rationale**: `withInMemoryScrolling` only scrolls the window, and the window never scrolls here (FR-024). A
  re-guard that keeps the person on the same page must not jump them to the top.
- **Alternatives considered**: `scrollPositionRestoration: 'top'`. It is a no-op for an inner container.

## R4. Wide/narrow detection

- **Decision**:
  - Add `WIDE_QUERY = '(min-width: 960px)'` to `shared/ds/media-query.ts`.
  - `ShellState.wide = mediaQuerySignal(WIDE_QUERY)`.
  - CSS uses `bp.wide` (`$bp-wide: 960px`) for the same split.
  - The shell never uses `MOBILE_QUERY`/`bp.mobile`.
  - The side nav and the drawer are each rendered only in their mode (`@if (wide())`), so their state is dropped
    on a breakpoint crossing.
- **Rationale**: The shell has one breakpoint (spec, Design handoff). Not rendering the other mode's component
  removes any "stray backdrop" risk on rotation. The edge case requires the drawer state to be dropped.
- **Alternatives considered**: CSS-only switching with both components mounted. The drawer's `<dialog>` could
  stay open while hidden.

## R5. Drawer is a native `<dialog>` opened with `showModal()`

- **Decision**: `NavDrawer` renders `<dialog id="grm-drawer" aria-label="Menu">`, styled as the right-hand sheet,
  and the `::backdrop` stands in for the handoff's backdrop element.
  - **Built in with `showModal()`**: the focus trap (FR-020), inertness of the page behind it, Escape (the
    `cancel` event) and top-layer stacking. Android Back also closes it in Chrome and the PWA, through the
    CloseWatcher integration.
  - **Backdrop tap**: a click whose target is the dialog element itself (the same pattern as `ThemedModal`).
  - **Animation**: open and close animate with `@starting-style`, plus `transition-behavior: allow-discrete` on
    `display`/`overlay`, over `--duration-drawer`. The duration is `0s` under reduced motion.
  - **Open focus**: keyboard activation of Menu (`click` with `detail === 0`) focuses ✕. Pointer activation
    focuses the dialog itself (`tabindex="-1"`), so no focus ring flashes.
  - **Close focus**: every close path puts focus back on Menu.
  - Every programmatic focus uses `{ preventScroll: true }`.
  - **Navigation**: the drawer closes on every router `NavigationStart`. This covers choosing a destination and
    the Capacitor WebView's Back, which navigates history.
- **Rationale**:
  - architecture.md: "Modals: use the native `<dialog>` element". It gives the focus trap and inertness for free,
    where the handoff's `aside role="dialog"` needs them hand-written.
  - The drawer and the entry modal are both top-layer dialogs, so the "never together" rule (FR-020a) comes down
    to ordering.
- **Alternatives considered**:
  - A hand-rolled `aside` with a JS focus trap, as in the handoff prototype. More code, and a weaker guarantee
    that the page behind it is inert.
  - Adding `@capacitor/app` for a hardware Back listener. That is a new dependency only for this. The entry
    modal has the same gap today, so it is left for a later native-polish spec.

## R6. Drawer → modal hand-off and focus return (FR-020a)

- **Decision**: For the drawer controls that open the entry modal (profile, Entrar, Vincular conta na nuvem,
  Entrar de novo), `NavDrawer` does this:
  1. Closes the dialog synchronously.
  2. Focuses Menu with `preventScroll`.
  3. Then calls `EntryModalService.open(...)`.

  `ThemedModal` records `document.activeElement` (Menu) as its opener and restores it on close. "Sincronizar
  agora" and "Tentar de novo" call the sync action and leave the drawer open.
- **Rationale**: This reuses `ThemedModal`'s existing opener-restore, so the modal needs no change.
- **Alternatives considered**: An explicit "return focus to" option on `EntryModalService`. That changes the
  modal, which the spec keeps unchanged.

## R7. Modal inertness (FR-030a)

- **Decision**: No extra code. `EntryModal` opens with `showModal()`, which makes everything outside the top
  layer inert for pointer, keyboard and assistive technology. That includes the hover-expanded nav, because inert
  elements receive no `pointerenter`. The drawer is always closed before a modal opens (R6). The profile gate
  opens the modal only during navigation, and navigation closes the drawer (R5).
- **Rationale**: This holds by construction. jsdom doesn't model top-layer inertness, so this is checked in the
  browser (quickstart V9), not by a unit test.
- **Alternatives considered**: Setting `inert` on the shell by hand while `EntryModalService.isOpen()`. It
  duplicates what the platform already does.

## R8. Sync becomes manual only (FR-006, SC-011)

- **Decision**:
  - Delete `SyncScheduler`. Its two non-sync jobs move into `SyncService.start()`, called once from `App`:
    - registering the `ProfileSessionService` hooks that stop the previous profile's supabase auto-refresh and
      start the new one's
    - calling `profileChanged()`
  - Remove `EntryFlowStore.finish()`'s `syncNow()` call and the whole "sync line" (`syncLine` signal,
    `SyncKind`, the `SyncLine` DS component, the `SYNC` copy, and DESIGN.md's "Sync line" entry).
  - `finish()` keeps its `DoneKind` argument only.
- **Rationale**:
  - The spec removes every automatic trigger, including the modal's.
  - The auto-refresh hooks are still needed so a linked profile's session stays valid for a manual sync.
  - With no automatic sync, the sync line has no job. Keeping it unused would be dead code.
- **Alternatives considered**:
  - Keeping `SyncScheduler` with its triggers switched off. That leaves dead timers and a misleading name.
  - Moving the auto-refresh hooks into `CloudSessionService`. Also viable, but `SyncService` already owns
    `profileChanged()`, which runs from the same hook.

## R9. The 60-second sync bound (FR-005a)

- **Decision**: `SyncService.run()` creates an `AbortController` with a 60 s timer.
  - Every PostgREST call gets `.abortSignal(signal)`.
  - The whole run is raced against the timer, so a hang outside PostgREST (e.g. `auth.getSession()` refreshing)
    also ends.
  - On timeout the state becomes `'error'`, or `'offline'` if `navigator.onLine` is false. `inFlight` clears, and
    a per-run generation number stops a late-settling run from writing state or applying results.
  - A timeout is an error the person sees as "Falha ao sincronizar", or "Sem conexão".
- **Rationale**:
  - The profile control is locked while syncing, so a hung request must never lock it forever.
  - Aborting also stops the late upserts. The generation guard covers the auth call, which cannot be aborted.
- **Alternatives considered**: Only `Promise.race` without aborting. The stale requests would keep running and
  could apply results after the person has switched profile.

## R10. Displayed sync state is a pure derivation

- **Decision**:
  - **Pure function**: `syncDisplay(input): SyncDisplay` in `core/utils/sync-status.util.ts`, fed by a
    `SyncStatusService` (`core/services/sync-status.service.ts`).
  - **Inputs**: whether the profile is linked, `SyncService.state()`, `lastSyncedAt`, and a `now` signal.
  - **Clock**: `now` ticks every 60 s through a root `setInterval` owned by the service.
  - **Priority**: `syncing` > failure (`offline`/`reauth`/`error`) > `local` (not linked) > `never` (no
    `lastSyncedAt`) > `synced` (under 5 min ago) > `last`.
  - **Relative time**: under 60 min → "há N min" (N ≥ 1); under 24 h → "há N h"; otherwise "há N d".
- **Rationale**:
  - A pure function is unit-testable across every FR-007 row and time boundary.
  - One 60 s tick satisfies "updates every minute while displayed" and the 5-min synced → last switch, at a
    negligible cost.
  - Failure states come from `SyncService.state()`, which `profileChanged()` resets and which is never
    persisted. That makes them session-only by construction (Clarification 2026-09-25).
- **Alternatives considered**:
  - A per-component interval. Each copy would drift from the others.
  - Persisting the last outcome. Rejected by the spec.

## R11. The `needsReauth` flag vs. session-only failures

- **Decision**: `CloudLink.needsReauth` stays persisted, as spec 003 has it. The shell does **not** read it for
  display, so after a reload a profile that needs reauth shows "Sincronizado há N…" / "Nunca sincronizado". The
  next manual sync makes `run()` return `'reauth'` without any network call, and the status becomes
  "Sessão expirada · Entrar de novo".
- **Rationale**: This matches the clarification that failures never come back after a reload, and it still takes
  the person to reauth in one tap.
- **Alternatives considered**: Showing "Sessão expirada" from the persisted flag. It contradicts the
  clarification.

## R12. Nav pin preference

- **Decision**:
  - `ShellState.pinned` is a signal persisted in `localStorage` under `grm-nav-pinned` (`'1'` or absent).
  - Reads and writes are wrapped in `try/catch`. A failure means not pinned, and a pin that can't be saved still
    applies for the session.
  - `ShellState` also holds `drawerOpen` and `wide`.
- **Rationale**:
  - This is a device preference, not per-profile owned data, so it doesn't belong in a profile database
    (Principle VI covers entities, not UI prefs).
  - The `grm-` prefix matches `grm-cloud:{id}`.
  - Synchronous storage avoids a first-paint flash from collapsed to pinned.
- **Alternatives considered**: The `grimorio-device` IndexedDB `meta` store. It is async, so the nav would flash
  collapsed before it pins.

## R13. Hover and focus expansion of the collapsed nav (FR-014)

- **Decision**: `SideNav` keeps `hover` and `focusWithin` signals:
  - `pointerenter` sets `hover`. `pointerleave` clears it after `--delay-nav-leave` (120 ms), and a re-enter
    cancels the timer.
  - `focusin` and `focusout` (checking `relatedTarget` against the host) drive `focusWithin`.
  - Touch pointers (`pointerType === 'touch'`) don't set `hover`, so a tap on the strip pins it (the tablet edge
    case) instead of flashing it open.
  - `expanded = pinned || hover || focusWithin`.
  - A click on the nav background (target not inside a link or button) pins it.
  - The layout spacer's width follows `pinned` only, so hover never reflows the content (SC-007).
- **Rationale**: This follows the handoff's behavior. Keeping the spacer tied only to `pinned` is what guarantees
  0 px of content shift on hover.
- **Alternatives considered**: CSS `:hover`/`:focus-within` alone. It can't debounce the leave, and it can't tell
  touch from mouse.

## R14. The current section (FR-012)

- **Decision**:
  - Destinations are a typed const in `shared/layout/nav-links/nav-destinations.ts`: `{ label, path }`, currently
    only `{ 'Coleção', '/collection' }`.
  - Links use `routerLink` + `routerLinkActive` with `[routerLinkActiveOptions]="{ exact: false }"` and
    `ariaCurrentWhenActive="page"`. A prefix match marks `/collection/import` and `/collection/:id` as inside the
    collection.
- **Rationale**: This is built in, and `aria-current` is handled for free. Activating the current destination is
  a same-URL navigation, which is a no-op (edge case).
- **Alternatives considered**: A hand-rolled URL signal. It needs more code for the same result.

## R15. "Fio de luz" recipes as a Sass partial plus tokens

- **Decision**:
  - **Tokens** added to `_tokens.scss`: `--band`, `--band-v`, `--band-lit`, `--glow-overlay`, the shell size
    tokens (`--nav-rail-width`, `--nav-panel-width`, `--drawer-width`, `--thread-x`, `--bead`, `--status-mark`),
    `--delay-nav-leave` and `--duration-drawer`.
  - **Keyframes** added there too: `grm-flow-long`, `grm-flow-mark`, `grm-flow-v`. The existing reduced-motion
    rule is extended to stop them.
  - **Mixins** in a new `src/styles/_fio.scss` (`@use 'fio'`):
    - `band-text($variant: mark | nav)`
    - `line`
    - `thread($side)`
    - `wash($placement: bar | nav-start | nav-end)`
  - The band tokens are declared on `[data-theme-scope]` next to the `--role-*` chain, so they resolve per themed
    root.
  - `--z-*` tokens are dropped: the drawer and the modal live in the top layer, and only the nav needs a local
    `z-index`.
- **Rationale**:
  - Five components share these recipes: the top bar, the wordmark, the side nav, the drawer and the nav links.
    Mixins keep one definition.
  - `_controls.scss` holds class primitives for content, and these are decorative layers inside components.
- **Alternatives considered**:
  - Global utility classes. Each decorative span would need several classes, and the mirrored variants would
    multiply them.
  - The handoff's `--z-drawer`/`--z-modal`. Unnecessary with the top layer.

## R16. The legal notice has one source (FR-029)

- **Decision**:
  - `NOTICE` copy goes in `entry-copy.ts` as structured parts: text runs plus `{ text, href }` links for (a) WotC
    and (b) Scryfall, and a plain string for (c) AI.
  - `LegalNotice` (`shared/layout/legal-notice/`) renders all three inside `<aside aria-label="Aviso legal">`.
  - The About view renders its (a) and (b) paragraphs from the same `NOTICE` parts instead of hard-coded HTML.
- **Rationale**: The About page is legacy. It only needs to read the shared constants, and restyling it is out of
  scope.
- **Alternatives considered**: Embedding `<app-legal-notice>` in About. The notice would then appear twice on
  About, since the shell already shows it.

## R17. Shell copy location

- **Decision**:
  - `SHELL` and `SYNC_AREA` (from the handoff) and `NOTICE` are added to `core/utils/entry-copy.ts`, and the file
    header now says it covers the shell.
  - `TOP_BAR` and `SYNC` are removed.
  - The name limit becomes 3–16 (`MSG.userLen`, `HELPER.name`).
  - `SUBTITLE.up` is reworded to "`{p}` pode sincronizar entre aparelhos quando você quiser."
  - `SUBTITLE.reauth` drops its promise that pending changes will be sent: "A sessão da conta expirou. Entre para
    voltar a sincronizar `{p}`."
- **Rationale**:
  - architecture.md: all entry PT-BR copy is centralized there, and the handoff names the file.
  - The reauth subtitle promised an automatic push that no longer happens. Rewording it is part of the spec's
    "removing its automatic syncs", not a new modal change.
- **Alternatives considered**: A separate `shell-copy.ts`. It splits closely related copy across files, since the
  shell reuses `ACTION.in` and `ACTION.close`.

## R18. Profile name limit 16 (FR-033)

- **Decision**:
  - `entry-flow.util.ts` changes its validation from `> 20` to `> 16`.
  - Also updated: the `ProfileRecord.name` doc comment, `MSG.userLen`, `HELPER.name`, and DESIGN.md's Content
    list.
  - The input keeps no `maxlength`, so a 17th character produces the plain length error rather than a silent cut
    (edge case).
  - Existing profiles with 17–20 characters are not migrated (CLAUDE.md: no backward-compatibility code; single
    user).
- **Rationale**: This is exactly the scope of FR-033.
- **Alternatives considered**: A `maxlength="16"` attribute. It cuts silently, which the edge case forbids.

## R19. Accepted deviation: unlinking a cloud account becomes unreachable (FR-010)

- **Decision**: The modal's `unlink` step is reached only through the temporary profile button's "Conta na
  nuvem" item. With that button removed and the modal unchanged, "Desvincular conta" has no entry point until the
  profile-modal rework spec restores one. The user accepted this deviation on 2026-09-25.
- **Rationale**: The spec keeps the modal unchanged apart from three listed edits. Adding an entry point belongs
  to the planned rework. The app is unreleased, with a single user.
- **Alternatives considered**:
  - Adding a "Desvincular conta" entry to the modal's active-profile list.
  - A secondary unlink action in the sync area.

  The user rejected both.
