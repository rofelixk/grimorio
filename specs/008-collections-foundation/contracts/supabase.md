# Contract: Supabase

**Feature**: `008-collections-foundation`. The migration is applied with the MCP `apply_migration`, then checked with `get_advisors` (security).

Checked in the live project on 2026-09-28: `storage_locations` and `card_entries` both have 0 rows, so dropping loses nothing.

## Migration `008_collections` (FR-018, FR-023, FR-024, research R5)

```sql
-- Holding-box cards keep a location_id that matches no collection (R1).
alter table public.card_entries drop constraint card_entries_location_fkey;

drop table public.storage_locations;

create table public.collections (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  name text not null check (char_length(name) between 1 and 40),
  color text not null, -- the palette hex; the id check was dropped by migration collections_color_hex
  parent_id uuid,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.collections enable row level security;

create policy "select own collections" on public.collections
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own collections" on public.collections
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own collections" on public.collections
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own collections" on public.collections
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.collections to authenticated;
```

- **Policy names** follow the live `"{cmd} own {table}"` pattern of `planechase_selections`.
- **No `anon` grant and no `service_role` grant**: no server-side code reads the table.
- **No `parent_id` FK and no unique-name constraint**: tree integrity and duplicate names are repaired client-side during sync (research R6). A constraint would fail the whole sync mid-batch.
- **Account deletion**: `delete_own_account()` deletes the auth user, and the FK cascade removes the rows.
- **`card_entries`** is otherwise unchanged. `location_id` stays `uuid not null` (FR-024).

## Client calls (per sync, through `CloudSessionService.client(profileId)`)

| Call | When |
|---|---|
| `from('collections').select('id, user_id, name, color, parent_id, updated_at').eq('user_id', uid)` | every sync, before cards |
| `from('collections').upsert(rows, { onConflict: 'user_id,id' })` | local wins, plus repair renames (R6) |
| `from('collections').delete().eq('user_id', uid).in('id', ids)` | tombstoned deletes, plus orphans removed by repair |

The `card_entries` calls are unchanged. A "move" delete sends no card row (R1). A "delete" delete sends the card deletions through the existing tombstone path.

Errors go through the existing `SyncService` classification (network, auth, other) and `mapCloudError`. No new text reaches the UI (FR-025).
