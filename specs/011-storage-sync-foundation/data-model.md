# Data Model: Storage & Sync Foundation

**No stored data changes.** The IndexedDB schemas (`grimorio-device` v1, `grimorio-profile-{id}` v3) and the Supabase tables stay exactly as they are, so there is no version bump and no migration (FR-022). This feature adds in-memory and on-the-wire shapes only.

## Write queue (in memory, one per service)

| Field | Type | Notes |
|---|---|---|
| `tail` | `Promise<unknown>` | The chain. Every task is appended, and its failure is caught so the chain never breaks (FR-003). |
| `before` | `() => Promise<unknown>` (optional) | Awaited before each task. Only `CollectionService` uses it, with `cards.flush()`. |
| `onError` | `(error: unknown) => void` | Called for failed `enqueue` tasks, never for `run` tasks (FR-005). |

Owners and their reporters:

| Owner | Label (console) | Reporter |
|---|---|---|
| `CardService` | `cards` | toast |
| `CollectionService` | `collections` | toast (except `remove`, which uses `run`) |
| `DeckService` | `decks` | toast (except `remove`, which uses `run`) |
| `PlanarSelectionService` | `the planar deck selection` | toast |
| `PlanechaseGameService` | `the Planechase game` | toast |
| `ProfileStore` | — | none: every write uses `run` and the caller reports |

**Rule**: a failure that `isClosedConnectionError` matches (a connection closed because another copy took over) is logged but never toasted (research R2).

## Change announcement (BroadcastChannel `grimorio-data`)

```ts
type ChangeKind = 'cards' | 'collections' | 'decks' | 'planarSelection' | 'planechaseGame' | 'profiles';

interface ChangeMessage {
  source: string;           // the sending copy's random id
  kind: ChangeKind;
  profileId: string | null; // the profile the write targeted; null = device-level
}
```

| Kind | Sent after | `profileId` | Delivered to a copy when | Receiver does |
|---|---|---|---|---|
| `cards` | `CardService` write lands, and `CollectionService` writes that touch cards | target profile | its bound profile matches | `CardService.refresh()` |
| `collections` | `CollectionService` write lands | target profile | match | `CollectionService.refresh()` |
| `decks` | `DeckService` write lands | target profile | match | `DeckService.refresh()` |
| `planarSelection` | `PlanarSelectionService` write lands | target profile, or `null` for the device selection | match (`null` = this copy has no profile) | `PlanarSelectionService.refresh()` |
| `planechaseGame` | `PlanechaseGameService` write lands | `null` | always | `PlanechaseGameService.refresh()` |
| `profiles` | `ProfileStore` write lands | `null` | always | `ProfileStore.refresh()` |

A `CollectionService` write that puts or deletes card rows (create-with-move, delete with "Excluir as cartas", `resolveMixedCollections`) announces `cards` as well as `collections`. Its card changes went through `applyMoved`/`applyRemoved`, not through `CardService`'s queue.

**Validation**: a receiver drops a message whose `source` is its own, whose `kind` is unknown, or whose `profileId` doesn't match for a profile-scoped kind (FR-013).

## Takeover event (module-level, `core/db/connection-events.ts`)

```ts
type TakeoverEvent =
  | { kind: 'upgrade' }                      // another copy opened a newer version of a DB this copy holds
  | { kind: 'deleted'; profileId: string };  // another copy deleted this copy's open profile DB
```

State transitions in `StorageHealthService`:

```text
running ──upgrade──▶ reloadRequired (terminal until the page reloads; the reload prompt is mounted)
running ──deleted(active id)──▶ toast "Este perfil foi excluído em outra janela." ──▶ signOut() ──▶ no profile
running ──deleted(other id)──▶ running (ignored)
```

`goneProfileIds` (in `profile-db.ts`) holds every profile id deleted by another copy during this page's life. `openProfileDb` rejects for those ids, so a deleted database is never recreated (FR-010).

## Sync step context (in memory, per run)

```ts
interface SyncStepContext {
  client: SupabaseClient;
  userId: string;            // run.profile.cloud.userId
  signal: AbortSignal;       // run.abort.signal
  ensureCurrent(): void;     // throws Superseded once the run is disowned (switch, timeout)
}
```

The identity step also receives `profileId` and the GoTrue `User` from the account lookup.

**Paged read** (`fetchAll`): page `n` covers rows `[from, from + 999]` in `id` order. `from` grows by the rows actually returned, and reading stops when the total reaches the response's `count`, or on an empty page. `ensureCurrent()` runs after every page (FR-016, FR-018).
