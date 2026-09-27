# Contract: Supabase (function, metadata, auth calls)

Project `hyzbkxraanzhdyhtnadf`. The live state was checked on 2026-09-27:
- `card_entries_user_id_fkey` and `storage_locations_user_id_fkey` both reference `auth.users(id) ON DELETE CASCADE`.
- There are no `public` functions besides `rls_auto_enable` and `set_updated_at`.
- Default API-role privileges were revoked (migration `revoke_unused_default_privileges_from_api_roles`).

## 1. Migration `005_delete_own_account` (applied via `apply_migration`)

```sql
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  -- card_entries and storage_locations cascade from auth.users (user_id FKs), as do the
  -- account's sessions, refresh tokens and identities: one statement, one transaction.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
```

There are no new tables, so no grants or RLS beyond the function's `EXECUTE`. After applying the
migration, run `get_advisors` (security). The definer function is intentional and scoped to
`auth.uid()`.

## 2. `user_metadata` contract (extends spec 003 §4)

| Key | Type | Written | Read |
|---|---|---|---|
| `grm_label` | `string` | on link and sign-up, and by a sync when the local rename is newer | new-device setup pre-fill |
| `grm_label_at` | ISO `string` | together with `grm_label` | the sync identity step |
| `grm_colors` | `Color[]` 1–3 | on sign-up, on link when absent, and by a sync when the local change is newer | on link, on setup, and by a sync when the remote is newer |
| `grm_colors_at` | ISO `string` | together with `grm_colors` | the sync identity step |

## 3. Auth calls added by this feature (supabase-js v2)

| Flow | Calls |
|---|---|
| Account check (R12) | `client(id).auth.getUser()`: `user_not_found` → gone; auth/session errors → expired |
| Identity step of a sync | `getUser()` (the metadata), then `auth.updateUser({ data })` when there's something to write |
| Verify the current cloud password | a transient `signInWithPassword({ email, password })`, check `user.id`, then `signOut({ scope: 'local' })` |
| Change the account password | `client(id).auth.updateUser({ password })`, then `client(id).auth.signOut({ scope: 'others' })` |
| Delete the account | verify (as above), then `client(id).rpc('delete_own_account')` |

`signOut({ scope: 'global' })` stays forbidden (spec 003 R4).

## 4. Error codes mapped (`mapCloudError`)

| Code | Result |
|---|---|
| `invalid_credentials` | `MSG.wrongCloud` (unchanged) |
| `same_password` | **new**: field `pwNew`, `MSG.samePassword` |
| `weak_password` | field `pw` (or `pwNew` on `cloudpw`, remapped by the store), `MSG.pwMin` |
| `user_not_found` | handled by `checkAccount` before it can reach `mapCloudError`. If it does reach it, `GENERIC_FAILURE` |
| network or offline | `MSG.offline` (unchanged) |
