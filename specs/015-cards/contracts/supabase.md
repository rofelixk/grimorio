# Contract: Supabase (spec 015)

Project `hyzbkxraanzhdyhtnadf`. Apply with the MCP `apply_migration`, then run `get_advisors` (security and performance). **Confirm with the user before applying**, because it changes the live project.

## Migration `015_cards`

```sql
-- Catalog: artist and per-printing faces (FR-026, research R3)
alter table public.printings
  add column artist text,
  add column faces jsonb;

-- Catalog: accent-free search key + trigram index (FR-006, research R2)
create extension if not exists pg_trgm with schema extensions;

alter table public.cards
  add column search_name text;

create index cards_search_name_trgm_idx
  on public.cards using gin (search_name extensions.gin_trgm_ops);

-- Owned cards: artist and added-at (FR-021, FR-028)
alter table public.card_entries
  add column artist text,
  add column added_at timestamptz not null default now();
```

- **No new table**, so no new grants or policies. Added columns inherit the existing table grants: `cards`/`printings` select for `anon, authenticated`, and `card_entries` select/insert/update/delete for `authenticated` with the owner-only policies.
- **`added_at`**: `not null` with a default, per the architecture rule for timestamp columns. `card_entries` holds 0 rows, so no backfill is needed.
- **After applying**: the maintainer runs `npm run sync:scryfall` to fill `artist`, `faces` and `search_name`. Until then the search returns nothing.

## `scripts/sync-scryfall.ts` changes

- `ScryfallCard` gains `artist?: string`; `ScryfallCardFace` gains `artist?: string` and keeps `image_uris`.
- `toCardRow` adds `search_name: searchKey(card.name)`. `searchKey` is imported by relative path from `src/app/core/utils/card-search.util.ts`, which must stay free of path aliases and Angular imports so `tsx` can load it.
- `toPrintingRow` adds:
  - `artist: card.artist ?? card.card_faces?.[0]?.artist ?? null`;
  - `faces: card.card_faces && card.card_faces.length > 1 && card.card_faces.some((f) => f.image_uris?.normal) ? card.card_faces.map((f) => ({ name: f.name, image_url: f.image_uris?.normal ?? null })) : null`.

## Client calls

### Catalog (anonymous client, `CardCatalogService`)

| Call | Query |
|---|---|
| `search(text, page)` | `from('cards').select('oracle_id, name, type_line, color_identity, image_url').ilike('search_name', '%' + escapeLike(key) + '%').order('name').order('oracle_id').range(page * 100, page * 100 + 100)`. 101 rows means `hasMore`, and only 100 are shown. |
| `detail(oracleId)` | `from('cards').select('oracle_id, name, type_line, oracle_text, color_identity, commander_legality, card_faces, printings(scryfall_id, set_code, set_name, collector_number, rarity, lang, released_at, image_url, image_small, artist, faces)').eq('oracle_id', oracleId).single()` |

Errors become `CatalogError` (`offline` | `failed`, research R6). PostgREST error text is never shown.

### Owned cards (existing `CardsSyncStep`)

The calls are unchanged: paged `select('*', { count: 'exact' })`, upsert `onConflict: 'user_id,id'`, delete by ids. `cardToRow`/`cardFromRow` carry `artist` and `added_at`.
