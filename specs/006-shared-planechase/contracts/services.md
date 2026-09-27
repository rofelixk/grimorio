# Contracts: services, utils, components

**Feature**: `006-shared-planechase`. Types are in [data-model.md](../data-model.md).

## Utils (pure, `core/utils/`)

### `crypto-random.util.ts`
```ts
export type RandomInt = (n: number) => number;              // uniform in [0, n)
export function randomInt(n: number, source?: (a: Uint32Array) => Uint32Array): number;  // rejection sampling
export function shuffle<T>(items: readonly T[], rnd: RandomInt): T[];                    // Fisher–Yates, returns a copy
export type DieFace = 'planeswalk' | 'chaos' | 'blank';
export function rollPlanarDie(rnd: RandomInt): DieFace;     // 1 → planeswalk, 6 → chaos, 2–5 → blank
```

### `planechase-game.util.ts`
```ts
export type CardKindOf = (id: string) => 'plane' | 'phenomenon';
export function startGame(enabledIds: string[], kindOf: CardKindOf, rnd: RandomInt): PlanechaseGame;
export function roll(game: PlanechaseGame, kindOf: CardKindOf, rnd: RandomInt): PlanechaseGame;
export function planeswalk(game: PlanechaseGame, kindOf: CardKindOf): PlanechaseGame;
export function confirmPhenomenon(game: PlanechaseGame, kindOf: CardKindOf): PlanechaseGame;
export function resetCost(game: PlanechaseGame): PlanechaseGame;
export function reshuffle(game: PlanechaseGame, kindOf: CardKindOf, rnd: RandomInt): PlanechaseGame;
export function undo(game: PlanechaseGame): PlanechaseGame;
export function repairGame(game: PlanechaseGame, known: ReadonlySet<string>, kindOf: CardKindOf): PlanechaseGame | null;
export function availableActions(game: PlanechaseGame): {
  roll: boolean; planeswalk: boolean; resetCost: boolean; confirm: boolean;
  reshuffle: boolean; undo: boolean;
};
export function abilityLit(game: PlanechaseGame): boolean;
```
Every transition called in a state where it isn't allowed throws. The service checks
`availableActions` first, so a throw means a bug.

### `planar-selection.util.ts`
```ts
export function enabledCards(cards: readonly PlanarCard[], selection: PlanarSelection | null): PlanarCard[];
export type SelectionCheck =
  | { ok: true; notice: boolean }                       // notice = size rule (non-blocking)
  | { ok: false; error: 'tooFew'; count: number } | { ok: false; error: 'noPlane' };
export function validateSelection(enabled: readonly PlanarCard[]): SelectionCheck;
export function sameEnabledSet(a: readonly string[], b: readonly string[]): boolean;
```

### `sync-status.util.ts` (changed)
`hasUnsyncedChanges` input gains `planarSelectionUpdatedAt: string | null`. It counts as unsynced
when it's newer than `lastSyncedAt`, or when it's non-null and nothing has synced yet.

## Services (`core/services/`, `providedIn: 'root'`)

### `PlanechaseCatalogService`
```ts
load(): Promise<void>;                      // dynamic import() of both JSON files, once (R4)
readonly cards: Signal<readonly PlanarCard[]>;
readonly sets: Signal<readonly PlanarSet[]>;
byId(id: string): PlanarCard | undefined;
kindOf: CardKindOf;
```
`planechaseCatalogResolver` (`ResolveFn<void>`) awaits `load()`. It's on the three
`/modes/planechase*` routes.

### `PlanarSelectionService` (entity-service shape, R6)
```ts
load(profileId: string | null): Promise<void>;   // clears the signal synchronously, then reads profile or device meta
whenReady(): Promise<void>;
flush(): Promise<void>;
readonly selection: Signal<PlanarSelection | null>;
save(disabledIds: string[]): void;               // stamps updatedAt, enqueues a write to the captured target
applySyncResult(selection: PlanarSelection): void;  // sync-only; no restamp
```
It's added to `ProfileSessionService.entityServices`.

### `PlanechaseGameService`
```ts
whenReady(): Promise<void>;                      // hydrates from device meta; awaited in the app initializer
readonly game: Signal<PlanechaseGame | null>;
readonly inProgress: Signal<boolean>;
readonly actions: Signal<ReturnType<typeof availableActions> | null>;
start(enabledIds: string[]): void;               // replaces any game (FR-022)
roll(): void; planeswalk(): void; confirmPhenomenon(): void; resetCost(): void;
reshuffle(): void; undo(): void; end(): void;
flush(): Promise<void>;
```
- Repair (`repairGame`) runs the first time both the game and the catalog are available. The
  catalog loads lazily, so hydration stores the raw game, and `repairIfNeeded()` runs from the
  resolver after `load()`.
- The service never reads a profile, so switches don't touch it.

### `PlanarImageService` (R12)
```ts
url(address: string): Promise<string | null>;    // object URL from Cache Storage (fetch + put on miss); null on failure
```

### `SyncService` (changed)
It gets a new private step, `syncPlanarSelection(client, run)`, after `syncCards`. It flushes
`PlanarSelectionService` first, then selects the row
`planechase_selections.select('user_id, disabled_ids, updated_at').eq('user_id', userId)`, and
reconciles.
- A local win → `upsert({ user_id, disabled_ids, updated_at }, { onConflict: 'user_id' })`.
- A remote win → `applySyncResult`.

The step is guarded with `ensureCurrent(run)` and the abort signal, like the other steps.

## Components

| Selector | Folder | Inputs / outputs | Notes |
|---|---|---|---|
| `GameModes` | `views/game-modes/` | — | the menu; one `app-action-row` → `/modes/planechase`; verb from `game.inProgress()` |
| `Planechase` | `views/planechase/` | — | no-game ↔ game; owns the confirm state (`'reset' \| 'end' \| null`) and the flair triggers |
| `PlanechaseRules` | `views/planechase-rules/` | — | TOC + article; back label depends on `inProgress` |
| `PlanechaseDeck` | `views/planechase-deck/` | — | the draft (R14); set groups, tiles, footer confirm |
| `app-planar-console` | `shared/gameplay/planar-console/` | `game`, `actions`, `confirm`; outputs per action | the wide console and its variants; `role="status"` region |
| `app-planar-dock` | `shared/gameplay/planar-dock/` | same as the console | the mobile dock (R16) |
| `app-planar-card` | `shared/gameplay/planar-card/` | `card: PlanarCard`, `lit: boolean` | image + name + type + text + ability plate |
| `app-planar-image` | `shared/gameplay/planar-image/` | `address`, `name`, `lazy = false` | loads through `PlanarImageService`; placeholder on null |
| `app-planar-tile` | `shared/gameplay/planar-tile/` | `card`, `on`; `toggle` output | an `aria-pressed` button, `aria-label="{name}, plano\|fenômeno"`, lazy image |
| `app-planeswalk-flair` / `app-chaos-flair` | `shared/gameplay/flairs/` | `play(target: HTMLElement): Promise<void>` | rAF-driven; no-op under reduced motion (R15) |
