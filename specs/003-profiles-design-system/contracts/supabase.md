# Contract: Supabase (schema, auth config, metadata)

Project `hyzbkxraanzhdyhtnadf`. The live state was checked on 2026-09-24:
- `storage_locations` and `card_entries` have owner-only RLS for select/insert/update/delete, and
  `authenticated` has CRUD grants;
- `updated_at` is `NOT NULL DEFAULT now()`;
- `cards`/`printings` are granted `SELECT` to `anon` and `authenticated`;
- `public.profiles` has a trigger `on_auth_user_username_sync` on `auth.users`;
- 2 users exist.

## 1. Migration `003_profiles_accounts` (applied via `apply_migration`)

```sql
-- Legacy username/profile machinery (spec 001/002 era)
drop trigger if exists on_auth_user_username_sync on auth.users;
drop function if exists public.sync_profile_username();
drop function if exists public.email_for_identifier(text);
drop function if exists public.delete_current_user();
drop function if exists public.set_collection_items_updated_at();
drop table if exists public.profiles;

-- Composite keys so one profile's rows can live under more than one account (R10)
alter table public.card_entries drop constraint card_entries_location_id_fkey;
alter table public.storage_locations drop constraint storage_locations_parent_id_fkey;
alter table public.card_entries drop constraint card_entries_pkey;
alter table public.storage_locations drop constraint storage_locations_pkey;

alter table public.storage_locations add primary key (user_id, id);
alter table public.card_entries add primary key (user_id, id);

-- Delete rules preserved from the previous single-column FKs (checked live 2026-09-24:
-- parent SET NULL, location CASCADE). The column-list SET NULL (Postgres ≥ 15; the project runs
-- 17.6) nulls only parent_id — a plain SET NULL would also null the NOT NULL user_id.
alter table public.storage_locations
  add constraint storage_locations_parent_fkey
  foreign key (user_id, parent_id) references public.storage_locations (user_id, id)
  on delete set null (parent_id);
alter table public.card_entries
  add constraint card_entries_location_fkey
  foreign key (user_id, location_id) references public.storage_locations (user_id, id)
  on delete cascade;

-- No new tables → no new grants/RLS. Existing owner-only policies and
-- `authenticated` grants on both tables are kept as-is.
```

After the primary-key change, client upserts must set `onConflict: 'user_id,id'`. `SyncService`'s
deletes also filter `.eq('user_id', userId)`.

## 2. Clean-start wipe (separate ops step — destructive, needs explicit user confirmation)

```sql
delete from public.card_entries;
delete from public.storage_locations;
delete from auth.users;
```

## 3. Auth configuration (Dashboard → Authentication; not expressible as a migration)

| Setting | Required value | Why |
|---|---|---|
| Confirm email | **off** (already) | spec Clarification |
| Custom SMTP | **on**, with a sender able to reach any address | the built-in sender only reaches team members (spec Assumptions) |
| Email OTP length | 6 | FR-024 |
| Email OTP expiration | ≤ 3600 s | time-limited codes |
| Minimum interval between e-mails per user | ≤ 30 s | the UI resend cooldown is 30 s (FR-024) |
| Minimum password length | 8 | FR-004, mirrors client validation |
| "Reset password" template | PT-BR, shows `{{ .Token }}`, no link | FR-022 |

Reset password template (subject "Seu código do Grimorio"):

```html
<h2>Recuperar senha</h2>
<p>Use este código no Grimorio para criar uma nova senha:</p>
<p style="font-size:24px;letter-spacing:4px"><strong>{{ .Token }}</strong></p>
<p>O código vale por pouco tempo e só pode ser usado uma vez. Se não foi você, ignore este e-mail.</p>
```

## 4. `user_metadata` contract

| Key | Type | Written | Read |
|---|---|---|---|
| `grm_label` | `string` | on every link and sign-up (the profile's name) | new-device `setup` pre-fill |
| `grm_colors` | `('W'\|'U'\|'B'\|'R'\|'G')[]`, length 1–3, pick order | on sign-up, and on link when absent | on link (it replaces the profile's colors) and on setup |

Legacy keys (`username`, `themeColors`) are neither read nor written.

## 5. Auth calls used (supabase-js v2)

| Flow | Calls |
|---|---|
| sign in | `auth.signInWithPassword({ email, password })` |
| sign up | `auth.signUp({ email, password, options: { data: { grm_label, grm_colors } } })` |
| reset | `auth.resetPasswordForEmail(email)` → `auth.verifyOtp({ email, token, type: 'recovery' })` → `auth.updateUser({ password })` |
| write metadata | `auth.updateUser({ data: { grm_label, grm_colors } })` |
| move a pending session | `auth.setSession({ access_token, refresh_token })` on the profile's client |
| unlink / discard | `auth.signOut({ scope: 'local' })` — **never** the default global scope |
| keep alive | `auth.startAutoRefresh()` / `auth.stopAutoRefresh()` (active profile only) |
