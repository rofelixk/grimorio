# Data Model: Cards

Phase 1 for [plan.md](plan.md). The migration SQL lives in [contracts/supabase.md](contracts/supabase.md).

## Owned card: `CardEntry` (`core/models/card.model.ts`)

The shape is unchanged except for two new fields (FR-021):

| Field | Type | Rule |
|---|---|---|
| `artist` | `string?` | Copied from the chosen printing. Replaced when the printing changes. Absent when the printing has none (FR-028). |
| `addedAt` | `string` (ISO) | Stamped by `CardService.add()`. Never changed by `update`, a printing change, or `mergeInto` (FR-021). Orders the list (R8). |

### Existing fields as this spec fills them

- **Identity, copied from the catalog** (`entryFromPrinting`, FR-012):
  - `scryfallId`, `oracleId`, `name`, `setCode` (uppercased), `setName`, `collectorNumber`;
  - `rarity` (default `'common'`), `commanderLegality`, `colorIdentity`, `typeLine`;
  - `imageUrl` (the printing's `image_url`, else its first face's, else `''`);
  - `faces` (the printing's `faces` when there are two or more with images, else `undefined`);
  - `artist`.
- **`canBeCommander`**: set once at add (R11), never recomputed (FR-021/FR-022).
- **Ownership**:
  - `finish` ∈ `nonfoil | foil | etched`;
  - `language` ∈ `CARD_LANGUAGES` codes (R19);
  - `condition` ∈ `NM | LP | MP | HP | DMG`;
  - `quantity` an integer 1–9999 from the form (merges may exceed it, R20);
  - `forSale` (default false);
  - `notes` (trimmed; empty → `undefined`).
- **`locationId`**: the destination collection's id (R10). The edit form never changes it.
- **`id`, `updatedAt`**: stamped by the service. Edits restamp `updatedAt` (FR-020).

### New exports

- The `CardFinish` and `CardCondition` types.
- `CARD_FINISHES`, `CARD_CONDITIONS` and `CARD_LANGUAGES` (`{ code, name, label }[]`).
- `MAX_QUANTITY = 9999`.

### Validation (`validateQuantity(text)`)

`ok` only for `/^\d+$/` within 1–9999. Otherwise the result is `'invalid'`, and the form shows the error and disables both save buttons (FR-013).

### Identity of "the same card" (FR-015)

`matchKey = scryfallId|finish|language|condition`. Only rows whose `locationId` is a collection count (R9).

### Lifecycle in this spec

```
(add) ──► row in a collection ──(update: details / printing)──► same row, new updatedAt
             │
             ├─(merge on add)──► target row quantity += q; no new row
             └─(merge on edit)─► target row quantity += edited.quantity; edited row deleted + tombstone
```

Nothing else removes or moves a row (FR-018).

## Catalog types (`core/models/catalog.model.ts`, new)

| Type | Fields | Source |
|---|---|---|
| `CatalogCard` | `oracleId`, `name`, `typeLine`, `colorIdentity: Color[]`, `imageUrl: string \| null` | the search (`cards`) |
| `CatalogPrinting` | `scryfallId`, `setCode` (upper), `setName`, `collectorNumber`, `rarity`, `lang`, `releasedAt: string \| null`, `imageUrl: string \| null`, `imageSmall: string \| null`, `artist: string \| null`, `faces: CardFace[] \| null` | `printings` |
| `CatalogCardDetail` | `CatalogCard` + `oracleText: string \| null`, `commanderLegality`, `cardFaces: { oracleText: string }[] \| null`, `printings: CatalogPrinting[]` (sorted, R4) | `detail()` |
| `SearchPage` | `cards: CatalogCard[]`, `hasMore: boolean` | `search()` |
| `CatalogError` | `kind: 'offline' \| 'failed'` (an `Error` subclass) | every catalog call (R6) |

The row → type mapping lives in `card-catalog.service.ts`.

## Search state (`card-search.util.ts`)

```
SearchState {
  text: string;            // as typed
  key: string;             // searchKey(text)
  status: 'idle' | 'short' | 'loading' | 'ok' | 'empty' | 'offline' | 'failed';
  results: CatalogCard[];  // pages appended in order
  hasMore: boolean;
  loadingMore: boolean;
  moreFailed: boolean;
  generation: number;      // bumps on every new key; answers for older generations are ignored
}
```

| From | Event | To |
|---|---|---|
| any | text with key length 0 | `idle`, results cleared |
| any | key length 1–2 | `short`, results cleared, nothing sent |
| any | key length ≥ 3 (after the 250 ms debounce) | `loading` (new generation) |
| `loading` | page 1 with cards | `ok` |
| `loading` | page 1 empty | `empty` |
| `loading` | error | `offline` / `failed` (R6) |
| `ok` + `hasMore` | sentinel visible | `loadingMore` |
| `loadingMore` | page | results appended, `hasMore` updated |
| `loadingMore` | error | `moreFailed` (results kept) |
| `moreFailed` / `offline` / `failed` | "Tentar de novo" | the same request again |

## Duplicate check (`card-entry.util.ts`)

```
CardMatch { card: CardEntry; collection: Collection }
findMatches(cards, draftKey, collectionsById, destinationId, excludeId?) → CardMatch[]   // ordered per R9
```

- **Add**: no matches saves at once. One match opens D1a, two or more open D1b. The choice is `'merge' | 'separate'`, plus `matchIndex`.
- **Edit**: the same, with `'merge' | 'keep'`.

## Display mode preference

`'images' | 'details'`, per profile, in `localStorage['grm-card-view:{profileId}']`. The default is `'details'`. It is never synced, and it is removed when the profile is deleted (R18).

## IndexedDB

- **No schema change**: `DB_VERSION` stays 3. Cards keep the `cards` store; `addedAt`/`artist` are just new fields on its values. No upgrade step and no backfill (FR-022, R8).
- **Writes**: user mutations now use `writeRows` (R7):
  - `add` puts one row;
  - `update` puts one row;
  - `mergeInto` puts the target, plus, on an edit merge, deletes the edited row and puts a `cards` tombstone.

## Supabase

### `public.card_entries` (owned, existing)

New columns:
- `artist text null`;
- `added_at timestamptz not null default now()`.

`sync-rows.ts` maps `artist ⇄ artist` (null ⇄ undefined) and `added_at ⇄ addedAt` (ISO-normalized with `new Date(…).toISOString()`, like `updated_at`). The grants and owner-only RLS are unchanged (column additions inherit table grants).

### `public.printings` (catalog, existing)

New columns:
- `artist text null`;
- `faces jsonb null` (`[{ name, image_url }]`, R3).

### `public.cards` (catalog, existing)

New column `search_name text null` (R2), with a GIN trigram index.

All three tables keep their grants. The catalog stays `select` for `anon, authenticated` (FR-028).

## Relationships

```
cards (catalog) 1 ─── * printings (catalog)
       │                    │ picked in the card modal
       ▼                    ▼
  CatalogCard ──► CatalogCardDetail ──► entryFromPrinting ──► CardEntry ── locationId ──► Collection (leaf)
                                                                         └─ (or a Deck / no match = holding box; untouched here)
```
