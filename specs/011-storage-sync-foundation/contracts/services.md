# Contracts: Storage & Sync Foundation

These are internal TypeScript contracts. The app exposes no external API, and the Supabase surface is unchanged: same tables and columns, with only `order`/`range`/`count` added to the reads.

## `core/db/write-queue.ts`

```ts
export interface WriteQueueOptions {
  before?: () => Promise<unknown>;
  onError?: (error: unknown) => void;
}

export class WriteQueue {
  constructor(options?: WriteQueueOptions);
  /** Fire-and-forget. A failure goes to onError and later tasks still run. onLanded runs after success only. */
  enqueue(task: () => Promise<unknown>, onLanded?: () => void): void;
  /** Caller-reported: resolves or rejects with the task. onError is NOT called. Later tasks still run. */
  run<T>(task: () => Promise<T>): Promise<T>;
  /** Resolves once every task queued so far has settled (success or failure). Never rejects. */
  flush(): Promise<void>;
}
```

## `core/services/save-queue.service.ts`

```ts
@Injectable({ providedIn: 'root' })
export class SaveQueueService {
  /** A queue whose failures log "Grimorio: failed to persist {label}." and toast DATA.saveFailed,
   *  except closed-connection failures (logged only). */
  create(label: string, before?: () => Promise<unknown>): WriteQueue;
}
```

## `core/db/connection-events.ts`

```ts
export type TakeoverEvent = { kind: 'upgrade' } | { kind: 'deleted'; profileId: string };
export function onTakeover(listener: (event: TakeoverEvent) => void): () => void;
export function emitTakeover(event: TakeoverEvent): void;
export function isClosedConnectionError(error: unknown): boolean; // DOMException 'InvalidStateError'
export function resetConnectionEventsForTests(): void;           // clears listeners and gone ids
```

## `core/db/profile-db.ts` / `device-db.ts` (changed)

- `openProfileDb(id)` passes `blocking`. On a delete (`blockedVersion === null`) it closes the connection, forgets it, marks the id as gone and emits `deleted`. On an upgrade it closes and emits `upgrade`.
- `openProfileDb(id)` rejects with `ProfileGoneError` for a gone id.
- `getDeviceDb()` passes `blocking`: it closes and emits `upgrade`.
- `resetAllGrimorioDbsForTests` also clears the gone ids.

## `core/db/entity-store.ts` (changed)

```ts
/** The profile id bound now (null = none). Captured with the handle when a write is queued. */
export function boundProfileId(): string | null;
```

## `core/services/cross-tab.service.ts`

```ts
export type ChangeKind = 'cards' | 'collections' | 'decks' | 'planarSelection' | 'planechaseGame' | 'profiles';
export interface CrossTabChannel {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  close(): void;
}
/** Defaults to new BroadcastChannel('grimorio-data'), or null when unsupported (FR-015). */
export const CROSS_TAB_CHANNEL: InjectionToken<CrossTabChannel | null>;

@Injectable({ providedIn: 'root' })
export class CrossTabService {
  announce(kind: ChangeKind, profileId: string | null): void;
  /** Profile-scoped kinds fire only when profileId === boundProfileId(); device kinds always. */
  on(kind: ChangeKind, handler: () => void): () => void;
}
```

## Entity services (changed)

Every one of `CardService`, `CollectionService`, `DeckService`, `PlanarSelectionService`, `PlanechaseGameService` and `ProfileStore`:

- replaces `writeQueue`/`enqueueWrite` with a `WriteQueue` (`SaveQueueService.create(...)`, or `new WriteQueue()` in `ProfileStore`). `flush()` delegates to it.
- announces its kind after each landed write (`onLanded`, or `.then` after `run`). The `profileId` is captured together with the handle.
- registers `crossTab.on(kind, () => void this.refresh())` in its constructor.
- gains `refresh(): Promise<void>`. It awaits `flush()`, re-reads its own target and sets the signal only if no `load()` began meanwhile. It never clears the signal first, never bumps `changeCount` and never writes.

Public signatures are otherwise unchanged. `remove()` on collections and decks still returns the committing promise and still rejects on failure (FR-005).

## `core/services/storage-health.service.ts`

```ts
@Injectable({ providedIn: 'root' })
export class StorageHealthService {
  /** True after another copy opened a newer DB version; mounts ReloadPrompt (FR-009). */
  readonly reloadRequired: Signal<boolean>;
  /** Subscribes to takeovers once. Called from App's constructor. */
  start(): void;
}
```

On `deleted` for the active profile it shows `DATA.deletedElsewhere`, then calls `ProfileSessionService.signOut()` (FR-010).

## `core/services/storage-persistence.service.ts`

```ts
@Injectable({ providedIn: 'root' })
export class StoragePersistenceService {
  /** Never rejects and never awaited by callers. 'startup' needs ≥1 profile (FR-006, FR-007). */
  request(trigger: 'startup' | 'created'): Promise<void>;
}
```

Callers: the app initializer calls `void persistence.request('startup')` after `store.whenReady()`, and `ProfileStore.create` calls `void persistence.request('created')` after the record lands.

## Sync

### `core/services/sync.service.ts` (orchestrator, public surface unchanged)

`SyncState`, `SyncOutcome`, `SYNC_TIMEOUT_MS`, `SyncService.{state, lastSyncedAt, start, profileChanged, syncNow}` all keep their exact current types and semantics. `run()` additionally wraps the timed exchange in `SYNC_LOCK` (FR-014a). `'syncing'` is set before the lock is requested.

### `core/services/sync/sync-lock.ts`

```ts
export type SyncLock = <T>(fn: () => Promise<T>) => Promise<T>;
/** navigator.locks.request('grimorio-sync', fn), or fn() when Web Locks is unavailable. */
export const SYNC_LOCK: InjectionToken<SyncLock>;
```

### `core/services/sync/sync-remote.ts`

```ts
export const PAGE_SIZE = 1000;
/** Reads every row: order('id') + range pages, count:'exact'; ensureCurrent after each page. */
export function fetchAll<Row>(
  build: () => PostgrestFilterBuilder<...>, // client.from(t).select(cols, { count: 'exact' }).eq('user_id', userId)
  ctx: SyncStepContext,
): Promise<Row[]>;
export function upsertRows(ctx: SyncStepContext, table: string, rows: object[], onConflict: string): Promise<void>; // no-op when empty
export function deleteRows(ctx: SyncStepContext, table: string, ids: string[]): Promise<void>;                     // no-op when empty
```

### Steps (`core/services/sync/*.step.ts`)

```ts
@Injectable({ providedIn: 'root' })
export class IdentitySyncStep { run(ctx: SyncStepContext, profileId: string, user: User): Promise<void>; }
export class CollectionsSyncStep { run(ctx: SyncStepContext): Promise<void>; }
export class DecksSyncStep { run(ctx: SyncStepContext): Promise<void>; }
export class CardsSyncStep { run(ctx: SyncStepContext): Promise<void>; }
export class PlanarSelectionSyncStep { run(ctx: SyncStepContext): Promise<void>; }
```

Each step throws the same errors today's private methods throw (a Supabase `error`, `Superseded`), and calls `ctx.ensureCurrent()` at the same points, so the orchestrator's error classification is unchanged (FR-020).

## Copy (`core/utils/entry-copy.ts`, new block)

```ts
export const DATA = {
  saveFailed: { label: 'Dados', text: 'Não foi possível salvar a alteração neste aparelho.' },
  deletedElsewhere: { label: 'Perfil', text: 'Este perfil foi excluído em outra janela.' },
  reload: {
    title: 'O Grimorio foi atualizado',
    body: 'Uma versão mais nova foi aberta em outra janela. Recarregue esta para continuar.',
    action: 'Recarregar',
  },
} as const;
```
