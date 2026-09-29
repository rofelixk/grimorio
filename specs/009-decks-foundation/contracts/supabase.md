# Contract: Supabase

**Feature**: `009-decks-foundation`. The migration is applied with the MCP `apply_migration`, then checked with `get_advisors` (security).

Checked in the live project on 2026-09-28: there is no `decks` or `deck_cards` table in `public` (the prototype ones were already dropped), so this creates rather than replaces.

## Migration `009_decks` (FR-012, research R5)

```sql
create table public.decks (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  name text not null check (char_length(name) between 1 and 40),
  format text not null check (format in (
    'commander', 'pauper', 'modern', 'standard', 'pioneer', 'legacy', 'vintage', 'casual'
  )),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.decks enable row level security;

create policy "select own decks" on public.decks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own decks" on public.decks
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own decks" on public.decks
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own decks" on public.decks
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.decks to authenticated;
```

- **Policy names** follow the `"{cmd} own {table}"` pattern of `collections` and `planechase_selections`.
- **No `anon` grant and no `service_role` grant**: no server-side code reads the table.
- **No unique-name constraint**: duplicates are renamed client-side during sync (R6). A constraint would fail the whole sync mid-batch.
- **Account deletion**: `delete_own_account()` deletes the auth user, and the FK cascade removes the rows.
- **`card_entries`** is unchanged. A card in a deck will carry the deck id in `location_id` (R1), which has no FK.

## Client calls (per sync, through `CloudSessionService.client(profileId)`)

| Call | When |
|---|---|
| `from('decks').select('id, user_id, name, format, updated_at').eq('user_id', uid)` | every sync, after collections and before cards |
| `from('decks').upsert(rows, { onConflict: 'user_id,id' })` | local wins, plus duplicate renames (R6) |
| `from('decks').delete().eq('user_id', uid).in('id', ids)` | tombstoned deletes |

Errors go through the existing `SyncService` classification (network, auth, other) and `mapCloudError`. No new text reaches the UI (FR-014).
