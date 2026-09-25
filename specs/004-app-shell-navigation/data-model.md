# Data Model: App Shell Navigation (spec 004)

This spec adds no persisted entities and no Supabase changes. It adds client-side state and one device
preference, and it narrows one validation rule.

## Active profile (read-only for the shell)

Source: `ProfileSessionService.active(): ProfileSummary | null` (spec 003).

| Field | Use in the shell |
|---|---|
| `name` | The profile control's visible text. 3–16 characters after this spec (FR-033). |
| `colors` (1–3, pick order) | The identity dots, in order. The tribe and color names go in the accessible name (`tribeName`, `colorNames`). |
| `cloud` | `null` → the "Sem conta na nuvem" state. Otherwise the profile is linked. `cloud.needsReauth` is **not** read for display (research R11). |

**Validation change**: `name.length` must be between 3 and 16 (was 20). This applies only when a profile is
created through the entry flow. Stored names are not migrated.

## Sync run state (session-only)

Source: `SyncService.state(): SyncState` = `'idle' | 'syncing' | 'done' | 'offline' | 'reauth' | 'error'`
(existing).

- **Resets to `'idle'**: on every profile activation (`profileChanged()`), and on every app load. It is never
  persisted, so failures last only for the session.
- **Single flight**: a `syncNow()` call while `'syncing'` returns the in-flight promise. It never starts a second
  run.
- **Bounded**: a run settles in ≤ 60 s. On timeout, the state becomes `'error'`, or `'offline'` when the device is
  offline (research R9).

State transitions:

```
idle|done|offline|reauth|error ──syncNow()──▶ (unlinked) no change, 'skipped'
                                         ├──▶ (needsReauth) reauth
                                         ├──▶ (offline) offline
                                         └──▶ syncing ──success──▶ done  (lastSyncedAt := now)
                                                      ├─auth────▶ reauth (cloud.needsReauth := true)
                                                      ├─network─▶ offline
                                                      ├─timeout─▶ error | offline
                                                      └─other───▶ error
any ──profile switch / reload──▶ idle
```

## Last synced time (persisted, existing)

Source: `SyncService.lastSyncedAt(): string | null`. It is the ISO timestamp stored in the profile database's
`meta` store under `lastSyncedAt`. It is written only after a successful sync, and loaded on activation.

## Sync display (derived)

`syncDisplay({ linked, state, lastSyncedAt, now }): SyncDisplay | null`. It returns `null` when there is no active
profile (FR-009).

```ts
type SyncDisplayKind = 'syncing' | 'synced' | 'last' | 'never' | 'local' | 'offline' | 'expired' | 'error';
type SyncAction = 'sync' | 'retry' | 'reauth' | 'link' | null;

interface SyncDisplay {
  kind: SyncDisplayKind;
  label: string;          // FR-007 label, e.g. "Sincronizado há 42 min"
  action: SyncAction;     // null only while syncing
  actionLabel: string | null;
  failure: boolean;       // offline | expired | error → danger color (FR-007a)
  opensModal: boolean;    // reauth | link → drawer closes first (FR-020a)
}
```

The first matching rule wins:

| # | Condition | kind | action |
|---|---|---|---|
| 1 | `state === 'syncing'` | syncing | null |
| 2 | `state === 'offline'` | offline | retry |
| 3 | `state === 'reauth'` | expired | reauth |
| 4 | `state === 'error'` | error | retry |
| 5 | `!linked` | local | link |
| 6 | `lastSyncedAt === null` | never | sync |
| 7 | `now − lastSyncedAt < 5 min` | synced | sync |
| 8 | otherwise | last | sync |

Relative time for `last`: under 60 min → `há N min` (N = floor minutes, at least 1). Under 24 h → `há N h`.
Otherwise `há N d`. `now` is re-read every 60 s.

## Nav pin preference (device, localStorage)

| Key | Values | Default | Failure |
|---|---|---|---|
| `grm-nav-pinned` | `'1'` (pinned) / absent (not pinned) | not pinned | If the read throws, the nav starts not pinned. If a write throws, the choice lasts only for the session. |

The preference is per device, not per profile (FR-016). It survives reloads and profile switches.

## Shell UI state (in memory)

| Signal | Owner | Meaning |
|---|---|---|
| `wide` | `ShellState` | `(min-width: 960px)` matches |
| `pinned` | `ShellState` | the nav pin preference |
| `drawerOpen` | `ShellState` | the narrow drawer is open. It is forced to `false` when `wide` becomes true or on navigation. |
| `hover`, `focusWithin` | `SideNav` | transient expansion of the collapsed nav. `hover` clears 120 ms after the pointer leaves. |
| `expanded` | `SideNav` (computed) | `pinned || hover || focusWithin` |

## Navigation destination

```ts
interface NavDestination { label: string; path: string; }
const NAV_DESTINATIONS: readonly NavDestination[] = [{ label: 'Coleção', path: '/collection' }];
```

A destination is current when the URL is `path` or starts with `path + '/'`, using `routerLinkActive` with
`exact: false`.

## Disclaimer notice (copy)

`NOTICE` in `entry-copy.ts` is the single source (FR-029). It holds three paragraphs, each a list of runs:
`string | { text: string; href: string }`. Paragraph (a) links "Fan Content Policy", (b) links "Scryfall", and (c)
is plain text. Both the shell's `LegalNotice` and the About view render it.
