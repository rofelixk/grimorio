# Contracts: App Shell (spec 004)

These are the internal TypeScript interfaces between the shell components and the services. The app has no
external API. The signatures are binding for implementation, and the bodies are not shown.

## Services (`src/app/core/services/`)

### `SyncService` (modified)

```ts
export type SyncState = 'idle' | 'syncing' | 'done' | 'offline' | 'reauth' | 'error';
export type SyncOutcome = 'done' | 'offline' | 'reauth' | 'error' | 'skipped';
export const SYNC_TIMEOUT_MS = 60_000;

class SyncService {
  readonly state: Signal<SyncState>;
  readonly lastSyncedAt: Signal<string | null>;
  /** Registers the session hooks once: on switch, stop the old profile's auth auto-refresh; on activate,
   *  profileChanged() and start the new linked profile's auto-refresh. Never syncs. Called from App. */
  start(): void;
  /** Resets state to 'idle' and loads the new profile's lastSyncedAt. */
  profileChanged(): Promise<void>;
  /** The only way a sync starts. Single-flight; settles within SYNC_TIMEOUT_MS. */
  syncNow(): Promise<SyncOutcome>;
}
```

- **Invariant**: nothing in `src/app` calls `syncNow()` except `SyncStatusService.act()` (SC-011).
- **Removed**: `SyncScheduler`, and the `EntryFlowStore.finish()` sync.

### `SyncStatusService` (new)

```ts
class SyncStatusService {
  /** null when no profile is active (FR-009). Re-derived on state/profile change and every 60 s. */
  readonly display: Signal<SyncDisplay | null>;
  /** True while a sync runs: locks the profile control and the sync area (FR-005a, FR-008). */
  readonly busy: Signal<boolean>;
  /** Performs display().action: 'sync'|'retry' → SyncService.syncNow();
   *  'link' → EntryModalService.open({ context: 'link', start: 'in' });
   *  'reauth' → EntryModalService.open({ context: 'link', start: 'reauth' }). No-op while busy. */
  act(): void;
}
```

`SyncDisplay` and the rules that derive it are in [data-model.md](../data-model.md#sync-display-derived).

### `ShellState` (new)

```ts
export const NAV_PINNED_KEY = 'grm-nav-pinned';

class ShellState {
  readonly wide: Signal<boolean>;          // mediaQuerySignal(WIDE_QUERY)
  readonly pinned: Signal<boolean>;        // restored from localStorage, false on failure
  readonly drawerOpen: Signal<boolean>;
  readonly openedViaKeyboard: Signal<boolean>; // drawer focuses ✕ when true, else the dialog
  setPinned(pinned: boolean): void;        // persists; swallows storage errors
  openDrawer(viaKeyboard: boolean): void;  // no-op when wide
  closeDrawer(): void;
}
```

`drawerOpen` becomes `false` when `wide` becomes true, and on every router `NavigationStart`.

## Utils (`src/app/core/utils/`)

```ts
// sync-status.util.ts
export const SYNCED_WINDOW_MS = 5 * 60_000;
export function syncDisplay(input: {
  linked: boolean; state: SyncState; lastSyncedAt: string | null; now: number;
}): SyncDisplay;
export function relativeSince(fromIso: string, now: number): string; // "há 5 min" | "há 2 h" | "há 3 d"
```

```ts
// entry-copy.ts: additions/removals
export const SHELL: { menu; close; navLabel; collection; pin; unpin; home; signIn; noProfile;
                      profileHint; profileBusy; notice;
                      profileLabel(name: string, tribe: string, colors: string): string };
export const SYNC_AREA: { syncing; synced; last(rel: string); never; local; offline; expired; error;
                          actSync; actRetry; actReauth; actLink };
export type NoticeRun = string | { text: string; href: string };
export const NOTICE: { wotc: NoticeRun[]; scryfall: NoticeRun[]; ai: string };
// removed: TOP_BAR, SYNC. Changed: MSG.userLen, HELPER.name → "3 a 16", SUBTITLE.up, SUBTITLE.reauth
```

The profile control's accessible name comes from `SHELL.profileLabel`: `Perfil {nome} — {Tribo} · {Cor} · {Cor}.
Trocar de perfil ou sair.`

## Components (`src/app/shared/`)

All components are standalone, OnPush, and use signal inputs.

| Selector | Folder | Inputs | Behavior contract |
|---|---|---|---|
| `app-top-bar` (rewritten) | `layout/top-bar/` | none | `role="banner"`. Wordmark `routerLink="/"`. Wide: `app-sync-status variant="area"` + divider + `app-profile-control variant="bar"`. Narrow: `app-sync-status variant="mark"` + the Menu button (`aria-expanded`, `aria-controls="grm-drawer"`). |
| `app-profile-control` | `layout/profile-control/` | `variant: 'bar' \| 'drawer'` | Has an active profile: identity dots + name, with the `aria-label` from `SHELL.profileLabel`. With no profile: "Entrar" (plus "Nenhum perfil ativo" in the drawer). Emits `activate`, and the owner opens the modal. Uses `aria-disabled` and a busy label while `busy()`. |
| `app-sync-status` | `layout/sync-status/` | `variant: 'area' \| 'mark' \| 'drawer'` | `area`: a `<button>` with the mark and label, calling `act()`, `aria-disabled` while busy. `mark`: a non-interactive `role="status"` with the full label as its accessible name. `drawer`: `role="status"` line + a `.link-btn` action (hidden while syncing) that emits `action`, so the drawer can close first when `opensModal`. It renders nothing when `display()` is null. |
| `app-sync-mark` | `ds/sync-mark/` | `kind: SyncDisplayKind` | An 8px mark: a spinner, dot, ring or danger dot per state (FR-007a, SC-005). Decorative, `aria-hidden`. |
| `app-nav-links` | `layout/nav-links/` | `mirrored: boolean`, `showLabels: boolean` | Renders `NAV_DESTINATIONS` with a bead and a label, and `routerLinkActive` + `ariaCurrentWhenActive="page"`. |
| `app-side-nav` | `layout/side-nav/` | none | Wide only. `<nav aria-label="Navegação principal">` + the pin button (`aria-pressed`, "Fixar menu"/"Recolher menu") + `app-nav-links`. Handles hover and focus expansion and click-to-pin (research R13). Also renders the layout spacer, whose width follows `pinned` only. |
| `app-nav-drawer` | `layout/nav-drawer/` | none | Narrow only. A native `<dialog id="grm-drawer">` driven by `ShellState.drawerOpen`. Contains ✕, `app-profile-control variant="drawer"`, `app-sync-status variant="drawer"`, a divider and `app-nav-links mirrored showLabels`. Closes before opening the modal and returns focus to Menu (research R5, R6). |
| `app-legal-notice` | `layout/legal-notice/` | none | `<aside aria-label="Aviso legal">` rendering `NOTICE`. Links open with `target="_blank" rel="noopener"` and have a 44px hit area. |

**Removed**:

- `app-nav-bar`
- `app-profile-button`
- `app-collection-filters`
- `app-brand-mark`
- `app-sync-line`, with their `@shared` barrel exports

## Styles

- **`src/styles/_tokens.scss`**:
  - the shell size, motion and band tokens
  - the three `grm-flow-*` keyframes
  - the reduced-motion rule, extended to cover them
- **`src/styles/_fio.scss`** (new): the `band-text`, `line`, `thread` and `wash` mixins (research R15).
- **`src/styles/_breakpoints.scss`**: unchanged. The shell uses `bp.wide` only.
