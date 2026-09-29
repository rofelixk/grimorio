# Data Model: Decks Foundation

**Feature**: `009-decks-foundation`. Decisions are in [research.md](research.md).

## Deck (new, stored and synced; replaces the old `Deck`)

`core/models/deck.model.ts`

| Field | Type | Rules |
|---|---|---|
| `id` | `string` (UUID) | Set by `DeckService.create`; callers never pass it. |
| `name` | `string` | Trimmed, 1–40 characters (`MAX_NAME`). Unique among the profile's decks by `normalizeDeckName` (case, accents and surrounding spaces ignored) (FR-003, SC-005). |
| `format` | `DeckFormatId` | One of `DECK_FORMATS`. A new deck defaults to `'commander'` (FR-003). |
| `updatedAt` | `string` (ISO) | Stamped by `create`/`update`, and by the sync rename (R6). Callers never pass it. |

Nothing else is stored: no card data, counts, featured card or colors (FR-011).

### DeckFormatId (constant)

`DECK_FORMATS = ['commander', 'pauper', 'modern', 'standard', 'pioneer', 'legacy', 'vintage', 'casual']`, in display order (FR-003).

`formatOf(id: string): DeckFormatId` returns `id` when it's known, else `'casual'`.

Display names and rule bullets live in `DECK.formats` (`deck-copy.ts`), not in the model (R2, R15):

| Id | Name | Rule set |
|---|---|---|
| `commander` | Commander | Commander bullets (5) |
| `pauper` | Pauper | 60-card base (3) + "Só cartas impressas como comuns." |
| `modern` | Modern | 60-card base + "Cartas de coleções a partir da Oitava Edição." |
| `standard` | Standard | 60-card base + "Só cartas das coleções mais recentes, que rodam com o tempo." |
| `pioneer` | Pioneer | 60-card base + "Cartas de coleções a partir de Retorno a Ravnica." |
| `legacy` | Legacy | 60-card base + "Cartas de todas as coleções, com lista de banidas própria." |
| `vintage` | Vintage | 60-card base + "Cartas de todas as coleções." + "Cartas da lista de restritas: só 1 cópia." |
| `casual` | Casual | "Sem regras fixas: o deck segue o que o seu grupo de jogo combinar." |

The full text is in spec FR-016 and ui.md §7.

## Owned card (existing, record unchanged)

`CardEntry.locationId` may hold a deck id once a later spec places cards in decks (R1). In this slice no app path writes one; tests seed it.

## Tombstone (existing)

`TombstoneEntity` becomes `'cards' | 'collections' | 'decks'`. `DeckService.remove` writes a `decks:{id}` tombstone in the same transaction as the row delete. Sync clears the tombstone once the delete is applied remotely.

## Local storage (IndexedDB `grimorio-profile-{id}`, version 3)

| Store | Change |
|---|---|
| `decks` | Deleted and recreated empty when upgrading from < 3 (old records dropped, FR-013). Key `id`, value `Deck`. |
| `tombstones` | Also holds `decks` entries (`by-entity` index unchanged). |
| `cards`, `collections`, `meta` | Unchanged. |

`EntityStoreName` and `RowOp` include `'decks'`, so `writeRows` can put and delete deck rows alongside tombstones in one transaction.

## Derived state (never stored)

| Where | Signal | Derivation |
|---|---|---|
| `DeckService` | `decks` | the rows |
| `DeckService` | `sorted` | `decks` by `compareDeckNames` (PT-BR, `sensitivity: 'base'`, then id) (FR-004) |
| `DeckService` | `byId` | `Map<id, Deck>` |
| `DeckService` | `ids` | `ReadonlySet<string>` of deck ids |
| `DeckService` | `cardCount(id)` | Σ `quantity` of cards whose `locationId === id`. Used by the delete dialog and toast. Always 0 in this slice unless seeded. |
| `CollectionService` | `stats` | `computeStats(collections, cards, deckIds)`: a card whose `locationId` is a deck id counts neither in a collection nor in `holding` (R1). |

## State transitions

```text
            create(name, format)                update(name?, format?)
  (none) ───────────────────────▶ Deck ───────────────────────────────▶ Deck (updatedAt = now)
                                   │
                                   │ remove(id)  — one writeRows transaction:
                                   │   delete decks/{id} + put tombstone decks:{id}
                                   ▼   (no card written; its cards now match nothing → holding box)
                                (gone)

  sync: reconcileEntities (LWW on updatedAt, tombstones) → repairDeckNames → upload → applySyncResult
```

Validation failures (`'empty' | 'too-long' | 'taken'`) change nothing and return the error to the form (FR-007).

## Cloud (Supabase)

`public.decks` (`user_id uuid`, `id uuid`, `name text`, `format text`, `updated_at timestamptz`), primary key `(user_id, id)`, owner-only RLS. The row mapping is `format` ⇄ `format` and `updated_at` ⇄ `updatedAt` (ISO-normalized as in `collectionFromRow`). The migration is in [contracts/supabase.md](contracts/supabase.md).
