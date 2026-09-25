# Contract: Core services (TypeScript surface)

These are the public shapes that the entry modal, guard, top bar and sync depend on. Bodies are
omitted. All services are `providedIn: 'root'` unless noted. Every async method rejects with a
`CloudFailure` or `LocalFailure` (below), never with a raw backend error.

```ts
// src/app/core/models/profile.model.ts
export type Color = 'W' | 'U' | 'B' | 'R' | 'G';           // re-exported from card.model
export interface CloudLink { userId: string; email: string; needsReauth: boolean }
export interface ProfileSummary { id: string; name: string; colors: Color[]; cloud: CloudLink | null; createdAt: string }

// src/app/core/utils/cloud-error.util.ts
export type FieldKey = 'email' | 'pw' | 'code' | 'user';
export type Failure =
  | { kind: 'field'; field: FieldKey; message: string; emailInUse?: true }
  | { kind: 'form'; message: string };                      // role="alert" above the primary button
export function mapCloudError(error: unknown): Failure;    // R8; never returns raw text
```

## ProfileStore — device registry (`src/app/core/services/profile-store.service.ts`)

Follows Principle VI: signal state hydrated from `grimorio-device`, `whenReady()`, `flush()`, and a
serialized write queue.

```ts
readonly profiles: Signal<ProfileSummary[]>;               // sorted by createdAt
whenReady(): Promise<void>;
flush(): Promise<void>;
isNameTaken(name: string, exceptId?: string): boolean;     // case-insensitive, trimmed
create(input: { name: string; password: string; colors: Color[] }): Promise<ProfileSummary>;
verifyPassword(id: string, password: string): Promise<boolean>;
setPassword(id: string, password: string): Promise<void>; // local reset / recover (FR-025)
setColors(id: string, colors: Color[]): Promise<void>;     // cloud colors replacing on link
setCloud(id: string, link: CloudLink | null): Promise<void>;
findByCloudUser(userId: string): ProfileSummary | undefined; // FR-033
```

## ProfileSessionService — which profile is active

```ts
readonly active: Signal<ProfileSummary | null>;
whenReady(): Promise<void>;                                // restores meta.activeProfileId (US1-5)
activate(id: string): Promise<void>;                       // switch sequence in data-model.md
signOut(): Promise<void>;                                  // → none; FR-008
```

`app.config.ts`'s `provideAppInitializer` awaits `ProfileStore.whenReady()`, then
`ProfileSessionService.whenReady()`, which loads the entity services for the restored profile.

## Entity services (existing: CardService, StorageLocationService, DeckService)

The existing API is unchanged, with these additions:

```ts
load(profileId: string | null): Promise<void>;  // flush → clear signal synchronously → rebind DB → hydrate
readonly changeCount: Signal<number>;           // bumped by add/addMany/update/remove, not applySyncResult
```

## IdentityService

```ts
readonly activeColors: Signal<Color[] | null>;    // null = no active profile
readonly roles: Signal<Roles>;                    // default R→U→G when null (FR-012)
// Roles = { primary, primaryHover, accent, accentHover, tertiary, tertiaryHover } as hex strings
```

`ThemeService` (legacy adapter) keeps only `roles()` (the `ThemeRoles` shape) and `colors()`, both
derived from `IdentityService`. It keeps exporting `THEME_COLOR_PALETTE`, `THEME_COLOR_ORDER` and
`DEFAULT_THEME_COLORS` for legacy imports.

## CloudAuthService — cloud flows

It wraps `CloudSessionService` (per-profile clients, R4). Every method checks `ConnectivityService`
first, and fails with the offline `Failure` when offline.

```ts
// Transient sign-in (device/gate context) → setup, or link (link context)
signIn(email: string, password: string): Promise<CloudIdentity>;   // CloudIdentity = { userId, email, label?: string, colors?: Color[] }
signUp(email: string, password: string): Promise<CloudIdentity>;   // confirmation is off → session immediately
requestResetCode(email: string): Promise<void>;                    // same outcome for unknown e-mails
verifyResetCode(email: string, code: string, newPassword: string): Promise<CloudIdentity>;

// Bind the pending (transient) session to a profile
linkPending(profileId: string, opts: { writeColors: boolean }): Promise<{ colorsReplaced: Color[] | null }>;
setupFromPending(input: { name: string; password: string }): Promise<ProfileSummary>; // creates + links + activates
discardPending(): Promise<void>;                                   // signOut({ scope: 'local' }) on the transient client

// Linked-profile flows
reauth(profileId: string, password: string): Promise<void>;        // FR-032; clears needsReauth
verifyLinkedAccount(profileId: string, password: string): Promise<void>; // recover-form; must match cloud.userId
unlink(profileId: string): Promise<void>;                          // local-only operation, never needs network (FR-021)
```

## SyncService / SyncScheduler

```ts
// SyncService
readonly state: Signal<'idle' | 'syncing' | 'done' | 'offline' | 'reauth' | 'error'>;
readonly lastSyncedAt: Signal<string | null>;
syncNow(): Promise<void>;          // single-flight; generation-guarded against profile switches (R11)

// SyncScheduler (started from App): link/setup/unlock/reauth call syncNow() directly;
// changeCount debounce 15 s / max-wait 60 s; retry on 'online' when changes are pending.
```

## EntryModalService — opening the modal

```ts
export type EntryContext = 'device' | 'gate' | 'link';
export type EntryStart = 'list' | 'profile' | 'in' | 'up' | 'unlink' | 'reauth';
export interface EntryRequest { context?: EntryContext; start?: EntryStart }  // context defaults: device if no profiles, else gate
export interface EntryResult { activeProfileId: string | null }

open(request?: EntryRequest): Promise<EntryResult>;   // resolves on close (✕, Esc, or Concluir)
readonly isOpen: Signal<boolean>;
```

These entry points use it:

| Caller | Request |
|---|---|
| `profileGuard`, no active profile | `{ context: profiles.length ? 'gate' : 'device' }` (→ `list` or `profile`) |
| Top-bar button, no active profile | same as above |
| Menu "Trocar perfil" | `{ context: 'gate', start: 'list' }` |
| Menu "Conta na nuvem" | not linked → `{ context: 'link', start: 'in' }`; `needsReauth` → `{ context: 'link', start: 'reauth' }`; linked → `{ context: 'link', start: 'unlink' }` |
| Menu "Sincronizar agora" | `needsReauth` → `{ context: 'link', start: 'reauth' }`; otherwise `SyncService.syncNow()` with no modal |

## profileGuard

```ts
export const profileGuard: CanActivateFn; // R12
```
