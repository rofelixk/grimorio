# Data Model: Profiles, Accounts and the New Design System

**Feature**: `003-profiles-design-system` | **Date**: 2026-09-24

The decisions behind this model are in [research.md](research.md) (R1–R11).

## Storage layout

```text
IndexedDB
├── grimorio-device             (v1)  device-level, not tied to any profile
│   ├── profiles   key: id           ProfileRecord
│   └── meta       key: key          { key: 'activeProfileId', value: string | null }
└── grimorio-profile-{profileId} (v1) one per profile — owned data only
    ├── cards       key: id          CardEntry        (unchanged)
    ├── locations   key: id          StorageLocation  (unchanged)
    ├── decks       key: id          Deck             (unchanged)
    ├── tombstones  key: key         TombstoneRecord  (unchanged, index by-entity)
    └── meta        key: key         { lastSyncedAt }

localStorage
└── grm-cloud:{profileId}            supabase-js session for that profile (managed by supabase-js)

Supabase (project hyzbkxraanzhdyhtnadf)
├── auth.users.user_metadata         { grm_label: string, grm_colors: Color[] }
├── public.storage_locations         PK (user_id, id)   ← was PK (id)
└── public.card_entries              PK (user_id, id)   ← was PK (id)
```

Removed:
- the legacy `grimorio` IndexedDB and `local-storage-migration.ts`;
- the `grimorio.themeColors` and `sb-…-auth-token` localStorage keys;
- `public.profiles`, the `sync_profile_username` trigger, and the `email_for_identifier` and
  `delete_current_user` RPCs.

## Entities

### LocalProfile — `ProfileRecord` (`src/app/core/models/profile.model.ts`)

| Field | Type | Rules |
|---|---|---|
| `id` | `string` (UUID) | generated on create; also names the profile's database and session key |
| `name` | `string` | 3–20 chars, `^[A-Za-z0-9_.-]+$`, unique per device compared with `toLowerCase()` (FR-003); trimmed before storing |
| `colors` | `Color[]` | 1–3 distinct values of `W U B R G`, **pick order** (FR-026) |
| `password` | `PasswordHash` | see below; never exposed outside `ProfileStore` (FR-009) |
| `cloud` | `CloudLink \| null` | `null` = "Só neste aparelho" |
| `createdAt` | `string` (ISO) | list order tiebreak |

`PasswordHash` = `{ algo: 'PBKDF2-SHA256', iterations: number, salt: string /*b64*/, hash: string /*b64*/ }`.

### CloudLink (embedded in ProfileRecord)

| Field | Type | Rules |
|---|---|---|
| `userId` | `string` | Supabase `auth.users.id`; at most one profile per device may hold a given `userId` (FR-016, FR-033) |
| `email` | `string` | shown on the account plate and in success copy, never as the person's name (FR-015) |
| `needsReauth` | `boolean` | set when the stored session is dead (R5); pauses automatic sync (FR-032) |

The session tokens themselves are not in the record. supabase-js keeps them under
`grm-cloud:{id}`.

### ColorIdentity (value object, `src/app/core/utils/identity.util.ts`)

- `colors: Color[]` (1–3, pick order) → `roles`: `primary = colors[0]`, `accent = colors[1] ?? primary`,
  `tertiary = colors[2] ?? accent`. Each role maps to the `--identity-*` base/hover tokens.
- `tribeName(colors)`: the lookup key is the colors sorted in **W U B R G** order, per the DESIGN.md
  table (e.g. `UR` → Izzet, `WUB` → Esper, `R` → Mono-vermelho).
- `colorNames(colors)`: in pick order, joined with " · " (Branco, Azul, Preto, Vermelho, Verde).
  "Preto" replaces the legacy "Roxo" label.
- **Default identity** = `['R','U','G']`. It is used only for chrome roles, never shown as anyone's
  identity. The wheel stays neutral (FR-012, the Default Rule).

### CloudAccount (remote, not stored locally)

| Field | Where | Rules |
|---|---|---|
| e-mail + password | Supabase Auth | unique e-mail; password ≥ 8 (FR-004) |
| `grm_label` | `user_metadata` | the linking profile's name; not unique, never used to sign in (FR-015) |
| `grm_colors` | `user_metadata` | 1–3 colors; absent on a brand-new account |

### Owned data (unchanged shapes)

`CardEntry`, `StorageLocation`, `Deck`, `Tombstone` keep their current models. Ownership is implied
by which profile database they live in. Remotely, rows are scoped by `user_id`. Decks do not sync.

### ResetCode (remote only)

A 6-digit numeric code, single-use and time-limited, issued by Supabase Auth's recovery flow (R7). The
app only enforces the format (`^\d{6}$`) and the 30 s resend cooldown on the client.

## Runtime state (signals, not persisted)

| Owner | Signal | Meaning |
|---|---|---|
| `ProfileStore` | `profiles()` | every `ProfileRecord` with the password hash stripped (`ProfileSummary`) |
| `ProfileSessionService` | `active()` | `ProfileSummary \| null`, restored from `meta.activeProfileId` at startup (US1-5) |
| `IdentityService` | `roles()` | the active profile's roles, or the default |
| `CloudSessionService` | `client(profileId)` | lazily created client per linked profile (R4) |
| `SyncService` | `state()` | `'idle' \| 'syncing' \| 'done' \| 'offline' \| 'reauth' \| 'error'`, plus `lastSyncedAt` |
| `ConnectivityService` | `online()` | `navigator.onLine` plus events |
| entity services | `changeCount()` | bumped on user mutations; feeds the auto-sync debounce (R11) |

## State transitions

### Active profile

```text
          create / unlock / setup / recover / local-reset
   ┌──────────────── none ─────────────────┐
   │                                        ▼
 none ◄──────── sign out ──────────── active(P)
                                        │  ▲
                                        └──┘ switch: unlock(Q) → active(Q)
```

- Entering `active(P)`:
  1. stop auto-refresh on the previous client;
  2. flush and `load(null)` the entity services;
  3. `load(P.id)`;
  4. write `meta.activeProfileId`;
  5. start auto-refresh for P if linked;
  6. trigger sync if linked and not `needsReauth`.
- Entering `none` runs the same steps without a new profile. The identity returns to the default, and
  a gated route re-guards to Home (R12).

### Cloud link (per profile)

```text
unlinked ──sign-up / sign-in (+ FR-033 check)──► linked ──session dies──► linked+needsReauth
   ▲                                              │  ▲                         │
   └──────────── unlink (signOut scope:local) ────┘  └──── reauth success ─────┘
```

- **Link via sign-in**: if the account has `grm_colors`, the profile's `colors` are replaced (the
  "linked" success with the tribe sentence and ripple). Otherwise the profile's colors are written to
  the account. `grm_label` is always set to the profile's name (FR-026).
- **Link via sign-up**: the profile's colors and name are written to the account (the "created"
  success).
- **Unlink**: `cloud = null`, the session key is removed, and local data is kept. The remote
  account and its rows are not deleted (FR-019).

## Validation rules (checked on submit, before any request — FR-005)

| Field | Phases | Rule → message (STATES.md) |
|---|---|---|
| E-mail | `in`, `up`, `reset-email` | empty → "Digite seu e-mail."; not `^\S+@\S+\.\S+$` → "Esse e-mail não parece válido." (trimmed, lowercased) |
| Senha | every phase with a password field | empty → "Digite sua senha." |
| New password | `up`, `reset-code`, `setup`, `recover-newpw`, `profile`, `localreset-newpw` | length < 8 → "Use pelo menos 8 caracteres." |
| Nome do perfil | `profile`, `setup` | length ∉ 3–20 → "Use de 3 a 20 caracteres."; bad chars → "Use só letras, números, _ . ou -."; taken (case-insensitive) → "Esse nome já está em uso neste aparelho." |
| Código | `reset-code` | not `^\d{6}$` → "Digite os 6 dígitos do código." (input strips non-digits, max 6) |
| Picks | `profile` | always 1–3; enforced by the picker itself (the last pick can't be removed, and a 4th is locked) |

Editing a field clears only that field's error. Switching forms clears errors and the
password/code fields but keeps the e-mail. Closing the modal resets everything (FR-028).
