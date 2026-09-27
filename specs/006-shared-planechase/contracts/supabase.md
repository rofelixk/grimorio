# Contract: Supabase

**Feature**: `006-shared-planechase`. The migrations are applied with the MCP `apply_migration`, and
`get_advisors` (security) is run after each one.

## Migration `006_printings_border_release_images` (FR-024b, R8)

```sql
alter table public.printings
  add column border_color text,
  add column released_at date,
  add column image_small text,
  add column image_large text;
```

These are new columns on an existing catalog table. The existing `select` grants to
`anon`/`authenticated` already cover them. The columns are nullable because rows are filled in by
the next `npm run sync:scryfall`.

## Migration `006_planechase_selections` (FR-021, R7)

```sql
create table public.planechase_selections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  disabled_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.planechase_selections enable row level security;

create policy "Owner can read" on public.planechase_selections
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can insert" on public.planechase_selections
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can update" on public.planechase_selections
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete" on public.planechase_selections
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.planechase_selections to authenticated;
```

- **No `anon` grant and no `service_role` grant**: no server-side code reads the table.
- **Account deletion**: `delete_own_account()` deletes the auth user, and the FK cascade removes the
  row.
- **Policy names**: they follow the existing `storage_locations`/`card_entries` policies. Match
  their exact naming when writing the migration.

## Client calls

The calls go through the linked profile's client, `CloudSessionService.client(profileId)`.

| Call | When |
|---|---|
| `from('planechase_selections').select('user_id, disabled_ids, updated_at').eq('user_id', uid)` | each sync |
| `from('planechase_selections').upsert(row, { onConflict: 'user_id' })` | each sync where local wins |

Errors go through the existing `SyncService` classification (network, auth, other). Nothing new
reaches the UI.

## Script reads (service-role key, `scripts/sync-planechase.ts`)

| Call | Purpose |
|---|---|
| `from('cards').select('oracle_id, name, type_line, oracle_text').eq('layout', 'planar')` | the planar cards |
| `from('printings').select('oracle_id, set_code, set_name, collector_number, border_color, released_at, image_small, image_large').in('oracle_id', ids).eq('lang', 'en').neq('border_color', 'gold')` | the candidate printings |

The app itself makes **no** Supabase call for Planechase (FR-002, SC-008).
