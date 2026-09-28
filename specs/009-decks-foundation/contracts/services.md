# Contract: Services, utils, routes and components

**Feature**: `009-decks-foundation`. Decisions are in [research.md](research.md); records in [data-model.md](data-model.md).

## `DeckService` (`core/services/deck.service.ts`, rewritten)

It has the same shape as `CollectionService` (Constitution VI): `load(profileId | null)`, `whenReady()`, `flush()`, `changeCount`, a serialized `enqueueWrite` with a captured `currentDbHandle()`, and `writeRows` for every write.

```ts
readonly decks: Signal<Deck[]>;
readonly sorted: Signal<Deck[]>;                    // FR-004 order
readonly byId: Signal<Map<string, Deck>>;
readonly ids: Signal<ReadonlySet<string>>;          // read by CollectionService.stats (R1)
cardCount(id: string): number;                      // Σ quantity of cards with locationId === id

create(input: { name: string; format: DeckFormatId }):
  { ok: true; deck: Deck } | { ok: false; error: DeckNameError };
update(id: string, patch: { name?: string; format?: DeckFormatId }):
  { ok: true } | { ok: false; error: DeckNameError | 'not-found' };
remove(id: string): Promise<{ cards: number }>;    // one transaction: row delete + tombstone; no card write (FR-009)

getTombstones(): Promise<Tombstone[]>;              // sync-only
clearTombstones(ids: string[]): Promise<void>;      // sync-only
applySyncResult(merged: Deck[]): void;              // sync-only; writes only the diff; never bumps changeCount
```

- `DeckNameError = 'empty' | 'too-long' | 'taken'`.
- `update` with an unchanged name (by trimmed equality) skips validation, so renaming "Krenko" to " Krenko " can't collide with itself.
- `remove` of an unknown id resolves `{ cards: 0 }` and writes nothing.
- It stays in `ProfileSessionService.entityServices` (already listed).

## `CollectionService` change

`stats = computed(() => computeStats(this.collections(), this.cards.cards(), this.decks.ids()))`, with `DeckService` injected. `computeStats(collections, cards, deckIds = new Set())` skips cards whose `locationId` is in `deckIds` (R1). No other change.

## `entity-store.ts` / `profile-db.ts`

- `DB_VERSION = 3`; the upgrade recreates `decks` when `oldVersion < 3` (data-model).
- `TombstoneEntity` gains `'decks'`; `EntityStoreName` and `RowOp.store` gain `'decks'`.

## Pure utils (`core/utils/`)

**`deck.util.ts`**:
- `normalizeDeckName(name): string`: trim, NFD, strip marks, then lowercase in pt-BR (R4).
- `compareDeckNames(a, b): number`: pt-BR `sensitivity: 'base'`, then id.
- `validateDeckName(name, decks, selfId?): DeckNameError | null`.
- `repairDeckNames(merged, remoteIds, now): { decks: Deck[]; renamed: Deck[] }`: duplicates by `normalizeDeckName`. The remote member (or the lowest id) keeps its name; the others take the lowest free `suffixedName(base, k)` for k ≥ 2, stamped `now` (R6).

**`deck-turn.util.ts`**:
- `type DeckPlace = { kind: 'list' } | { kind: 'deck'; id: string }`.
- `turnFor(from: DeckPlace | null, to: DeckPlace, nav: { trigger: 'imperative' | 'popstate' | 'hashchange'; info?: unknown; replaceUrl?: boolean }): 'open' | 'close' | null`. It implements the R8 table; a `null` `from` (first place) gives `null`.

**`deck-dust.util.ts`** (R10), all deterministic given `random`:
- `makeSpecks(count, width, height, colors, random): Speck[]`;
- `edgeX(theta, width, perspective, offsetX): number`;
- `stepSpeck(speck, frame: { t, edgeX, vex, width, turning }): void` (mutates in place, for the hot loop);
- `settleSchedule(specks, random): void`, which assigns each speck `fadeDelay ∈ [0, 600]` ms and `fadeMs ∈ [600, 1400]`;
- `settledAlpha(speck, msSinceSettle): number`, which is 0 for every speck by 2000 ms.

**`deck-copy.ts`**: `DECK`, verbatim copy (ui.md §7), including `formats: Record<DeckFormatId, { name: string; rules: string[] }>`.

**`sync-status.util.ts`**: `hasUnsyncedChanges` input gains `decks: { updatedAt: string }[]`; the tombstone count includes deck tombstones.

## `SyncService` changes

- `syncDecks(client, run)` runs between `syncCollections` and `syncCards`, after `decks.flush()`. It does select, `reconcileEntities`, `repairDeckNames`, then upserts `toUpsertRemote` plus the renamed rows, deletes `toDeleteRemoteIds`, `applySyncResult`, and `clearTombstones`.
- `DeckRow = { id, user_id, name, format, updated_at }`, mapped by `deckToRow` and `deckFromRow` (`format` through `formatOf`, `updated_at` ISO-normalized).
- The header comment's "Decks never sync" is removed.

## `ProfileFlowStore` / profile modal

- `decksNote` is removed, along with its `@if` in `delete-profile-step.ts` and `DELETE_PROFILE.decksNote` in `entry-copy.ts`.
- The unsynced-changes input reads `DeckService.decks()` and the deck tombstones.

## Routes (`app.routes.ts`)

```ts
export const deckMatcher = (segments: UrlSegment[]): UrlMatchResult | null => …;  // 'decks' | 'decks/:ref'
{ matcher: deckMatcher, component: DeckArea, ...gated },
```

This replaces the `decks` and `decks/:id` routes. Opening a deck from a tile passes `{ info: { deckTurn: true } }`; landing after a delete passes `{ info: { deckTurn: false } }`; the missing-deck redirect uses `replaceUrl: true`.

## Shell

`NAV_DESTINATIONS` becomes `Coleção (/collection)`, `Decks (/decks)`, `Modos de jogo (/modes)`, and `SHELL.decks = 'Decks'` is added.

## Components

| Component | Folder | Inputs → outputs |
|---|---|---|
| `DeckArea` (view) | `views/deck-area/` | `ref?: string` (route); provides `DeckTurn` |
| `DeckTurn` (controller, not a component) | `views/deck-area/deck-turn.ts` | `go(to, nav)`, `shown`, `turning`, `canvas` binding; rAF and timers on `DestroyRef` |
| `DeckTile` | `shared/decks/deck-tile/` | `deck: Deck` (links itself, with `info.deckTurn`) |
| `DeckFan` | `shared/decks/deck-fan/` | `scale: number`, featured slot (placeholder only in this slice) |
| `FormatPicker` | `shared/decks/format-picker/` | `value: DeckFormatId` → `valueChange`; renders the radiogroup and the rules plate |
| `DeckFormDialog` | `shared/decks/deck-form-dialog/` | `mode: 'create' \| 'edit'`, `deckId?` → `closed`, `saved(Deck)` |
| `DeckDeleteDialog` | `shared/decks/deck-delete-dialog/` | `deckId` → `closed`, `deleted({ name, cards })` |

Reused: `CompactModal` (`shared/ds/`), `CreateRow` (`@shared/collections/create-row/create-row`), `ToastService`, `IdentityService.roles`, `MOBILE_QUERY` and `REDUCED_MOTION_QUERY` (`@shared/ds/media-query`).
