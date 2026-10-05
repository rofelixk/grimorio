import { Injectable, inject, signal } from '@angular/core';
import { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { Color, ProfileSummary } from '@models/profile.model';
import {
  GENERIC_FAILURE,
  OFFLINE_FAILURE,
  isAuthSessionError,
  isNetworkError,
  mapCloudError,
} from '../utils/cloud-error.util';
import { MSG, TOAST } from '../utils/entry-copy';
import { DEFAULT_IDENTITY } from '../utils/identity.util';
import { normalizeEmail } from '../utils/entry-flow.util';
import { CloudSessionService } from './cloud-session.service';
import { ConnectivityService } from './connectivity.service';
import { ProfileSessionService } from './profile-session.service';
import { ProfileStore } from './profile-store.service';
import { ToastService } from './toast.service';

/** Who a cloud sign-in belongs to, read from the account's `user_metadata` (R6). */
export interface CloudIdentity {
  userId: string;
  email: string;
  label?: string;
  colors?: Color[];
  /** When `colors` last changed on any device (spec 005 R6). */
  colorsAt?: string;
  /** When `label` was last written. */
  labelAt?: string;
}

/** What `getUser()` says about a linked profile's account (spec 005 R12). */
export type AccountStatus = 'ok' | 'gone' | 'expired' | 'offline';

/** `checkAccount`'s answer with the fetched user, so a sync reuses it; 'error' = unrecognized. */
export type AccountLookup =
  | { status: 'ok'; user: User }
  | { status: 'gone' | 'expired' | 'offline' }
  | { status: 'error'; error: unknown };

interface Pending {
  client: SupabaseClient;
  session: Session;
  identity: CloudIdentity;
}

const VALID_COLORS: readonly string[] = ['W', 'U', 'B', 'R', 'G'];

const str = (value: unknown) => (typeof value === 'string' ? value : undefined);

export function identityOf(user: User): CloudIdentity {
  const meta = (user.user_metadata ?? {}) as {
    grm_label?: unknown;
    grm_colors?: unknown;
    grm_colors_at?: unknown;
    grm_label_at?: unknown;
  };
  const colors = Array.isArray(meta.grm_colors)
    ? (meta.grm_colors.filter((c) => typeof c === 'string' && VALID_COLORS.includes(c)) as Color[])
    : [];
  return {
    userId: user.id,
    email: user.email ?? '',
    label: str(meta.grm_label),
    colors: colors.length ? [...new Set(colors)].slice(0, 3) : undefined,
    colorsAt: str(meta.grm_colors_at),
    labelAt: str(meta.grm_label_at),
  };
}

function classify(error: unknown): AccountLookup {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === 'user_not_found') {
    return { status: 'gone' };
  }
  if (isNetworkError(error)) {
    return { status: 'offline' };
  }
  if (isAuthSessionError(error)) {
    return { status: 'expired' };
  }
  return { status: 'error', error };
}

// Every cloud-account flow (contracts/services.md). Network calls check connectivity first and
// fail with PT-BR `Failure`s only (R8) — never raw backend text. A sign-in that isn't bound to
// a profile yet is held as `pending` on a transient client until it is linked, set up or
// discarded.
@Injectable({ providedIn: 'root' })
export class CloudAuthService {
  private readonly cloud = inject(CloudSessionService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly profiles = inject(ProfileStore);
  private readonly session = inject(ProfileSessionService);
  private readonly toasts = inject(ToastService);

  private pending: Pending | null = null;

  private readonly accountGoneSignal = signal<{ profileId: string; n: number } | null>(null);
  /** Bumped each time a linked profile's account turns out to be gone (FR-019b). */
  readonly accountGone = this.accountGoneSignal.asReadonly();

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.connectivity.online()) {
      throw OFFLINE_FAILURE;
    }
    try {
      return await fn();
    } catch (error) {
      throw mapCloudError(error);
    }
  }

  private hold(client: SupabaseClient, session: Session | null, user: User | null): CloudIdentity {
    if (!session || !user) {
      // Sign-up with e-mail confirmation on returns no session; this app requires it off.
      throw GENERIC_FAILURE;
    }
    const identity = identityOf(user);
    this.pending = { client, session, identity };
    return identity;
  }

  /** Throws the FR-033 form error if another profile on this device holds the account. */
  assertNotLinkedElsewhere(userId: string, allowProfileId?: string): void {
    const holder = this.profiles.findByCloudUser(userId);
    if (holder && holder.id !== allowProfileId) {
      throw { kind: 'form', message: MSG.linkedElsewhere(holder.name) };
    }
  }

  signIn(email: string, password: string): Promise<CloudIdentity> {
    return this.run(async () => {
      await this.discardPending();
      const client = this.cloud.transient();
      const { data, error } = await client.auth.signInWithPassword({ email: normalizeEmail(email), password });
      if (error) {
        throw error;
      }
      return this.hold(client, data.session, data.user);
    });
  }

  /** Creates an account with the linking profile's name and colors, and their times, as its metadata (R6). */
  signUp(
    email: string,
    password: string,
    profile: { label: string; labelAt: string; colors: Color[]; colorsAt: string },
  ): Promise<CloudIdentity> {
    return this.run(async () => {
      await this.discardPending();
      const client = this.cloud.transient();
      const { data, error } = await client.auth.signUp({
        email: normalizeEmail(email),
        password,
        options: {
          data: {
            grm_label: profile.label,
            grm_label_at: profile.labelAt,
            grm_colors: profile.colors,
            grm_colors_at: profile.colorsAt,
          },
        },
      });
      if (error) {
        throw error;
      }
      // An already-registered e-mail can come back as a user with no identities.
      if (data.user && data.user.identities?.length === 0) {
        throw { code: 'user_already_exists' };
      }
      return this.hold(client, data.session, data.user);
    });
  }

  /** Resolves the same way whether or not the account exists (FR-023). */
  requestResetCode(email: string): Promise<void> {
    return this.run(async () => {
      const { error } = await this.cloud.transient().auth.resetPasswordForEmail(normalizeEmail(email));
      if (error) {
        throw error;
      }
    });
  }

  verifyResetCode(email: string, code: string, newPassword: string): Promise<CloudIdentity> {
    return this.run(async () => {
      await this.discardPending();
      const client = this.cloud.transient();
      const verified = await client.auth.verifyOtp({ email: normalizeEmail(email), token: code, type: 'recovery' });
      if (verified.error) {
        throw verified.error;
      }
      const updated = await client.auth.updateUser({ password: newPassword });
      if (updated.error) {
        throw updated.error;
      }
      const { data } = await client.auth.getSession();
      return this.hold(client, data.session ?? verified.data.session, updated.data.user ?? verified.data.user);
    });
  }

  /**
   * Binds the pending sign-in to a profile (FR-014, FR-026): moves the session onto the
   * profile's client, then applies R6 — colors saved on the account replace the profile's
   * (returned as `colorsReplaced`), otherwise the profile's colors are written to the account;
   * the label is always the profile's name.
   */
  async linkPending(profileId: string, opts: { writeColors: boolean }): Promise<{ colorsReplaced: Color[] | null }> {
    const pending = this.requirePending();
    try {
      this.assertNotLinkedElsewhere(pending.identity.userId, profileId);
    } catch (failure) {
      await this.discardPending();
      throw failure;
    }
    const accountColors = !opts.writeColors ? (pending.identity.colors ?? null) : null;
    await this.adopt(profileId, pending);
    if (accountColors) {
      // The account's colors keep their own change time (spec 005 R6).
      await this.profiles.setColors(profileId, accountColors, pending.identity.colorsAt ?? new Date().toISOString());
    }
    const profile = this.requireProfile(profileId);
    await this.writeMetadata(profileId, {
      grm_label: profile.name,
      grm_label_at: profile.nameUpdatedAt,
      grm_colors: profile.colors,
      grm_colors_at: profile.colorsUpdatedAt,
    });
    return { colorsReplaced: accountColors };
  }

  /** New-device setup (FR-018): creates the profile, links it and makes it active. */
  async setupFromPending(input: { name: string; password: string }): Promise<ProfileSummary> {
    const pending = this.requirePending();
    this.assertNotLinkedElsewhere(pending.identity.userId);
    const hasColors = !!pending.identity.colors?.length;
    const created = await this.profiles.create({
      name: input.name,
      password: input.password,
      colors: pending.identity.colors ?? [...DEFAULT_IDENTITY],
    });
    await this.linkPending(created.id, { writeColors: !hasColors });
    await this.session.activate(created.id);
    return this.requireProfile(created.id);
  }

  /** Moves a pending sign-in for this profile's own account onto its client (reauth, recover). */
  async adoptPending(profileId: string): Promise<void> {
    const pending = this.requirePending();
    const profile = this.requireProfile(profileId);
    if (!profile.cloud || profile.cloud.userId !== pending.identity.userId) {
      await this.discardPending();
      throw GENERIC_FAILURE;
    }
    await this.adopt(profileId, pending);
  }

  discardPending(): Promise<void> {
    const pending = this.pending;
    this.pending = null;
    if (!pending) {
      return Promise.resolve();
    }
    // Local scope only — the default global scope would end the account's sessions on the
    // person's other devices (R4).
    return pending.client.auth.signOut({ scope: 'local' }).then(
      () => undefined,
      () => undefined,
    );
  }

  /** Expired sign-in (FR-032): signs in again with the linked account's e-mail. */
  reauth(profileId: string, password: string): Promise<void> {
    return this.signInAsLinked(profileId, password);
  }

  /** Recover a linked profile (FR-025): proves the person holds the linked account. */
  verifyLinkedAccount(profileId: string, password: string): Promise<void> {
    return this.signInAsLinked(profileId, password);
  }

  /**
   * Local-only (FR-021): works offline. The remote account and its rows are kept (FR-019).
   * Online, it first checks the account: one that no longer exists takes the gone path (FR-019b).
   */
  async unlink(profileId: string): Promise<'unlinked' | 'gone'> {
    if (this.connectivity.online() && (await this.checkAccount(profileId)) === 'gone') {
      await this.forgetGoneAccount(profileId);
      return 'gone';
    }
    const client = this.cloud.client(profileId);
    await this.cloud.whileUnlinking(profileId, async () => {
      this.cloud.stopAutoRefresh(profileId);
      if (this.connectivity.online()) {
        await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
      }
      this.cloud.removeSession(profileId);
      await this.profiles.setCloud(profileId, null);
    });
    return 'unlinked';
  }

  /** Asks GoTrue about the linked account (R12): `getUser()` is the only call that does. */
  async checkAccount(profileId: string): Promise<AccountStatus> {
    const lookup = await this.lookupAccount(profileId);
    // An unrecognized failure can't tell anything about the account: treat it like offline.
    return lookup.status === 'error' ? 'offline' : lookup.status;
  }

  /** `checkAccount` with the fetched user (the sync identity step reads its metadata). */
  async lookupAccount(profileId: string): Promise<AccountLookup> {
    if (!this.connectivity.online()) {
      return { status: 'offline' };
    }
    try {
      const { data, error } = await this.cloud.client(profileId).auth.getUser();
      if (error) {
        return classify(error);
      }
      return data.user ? { status: 'ok', user: data.user } : { status: 'expired' };
    } catch (error) {
      return classify(error);
    }
  }

  /**
   * The account no longer exists (FR-019b): the profile turns local-only with its data intact,
   * with no network needed, and a toast says so.
   */
  async forgetGoneAccount(profileId: string): Promise<void> {
    const profile = this.profiles.byId(profileId);
    if (!profile?.cloud) {
      return;
    }
    const email = profile.cloud.email;
    await this.cloud.whileUnlinking(profileId, async () => {
      this.cloud.removeSession(profileId);
      await this.profiles.setCloud(profileId, null);
    });
    const toast = TOAST.gone(email, profile.name);
    this.toasts.show(toast.label, toast.text);
    this.accountGoneSignal.update((last) => ({ profileId, n: (last?.n ?? 0) + 1 }));
  }

  /**
   * Changes the linked account's password (FR-016a, R8), then ends the account's other sessions
   * so the other devices need the new one. This device stays signed in and linked; the local
   * profile password is untouched.
   */
  changeAccountPassword(profileId: string, current: string, next: string): Promise<void> {
    return this.run(async () => {
      await this.verifyAccountPassword(profileId, current);
      const auth = this.cloud.client(profileId).auth;
      const updated = await auth.updateUser({ password: next });
      if (updated.error) {
        throw updated.error;
      }
      // Never 'global': that would also end this device's session (R4).
      const { error } = await auth.signOut({ scope: 'others' });
      if (error) {
        throw error;
      }
    });
  }

  /**
   * Deletes the linked account and every cloud row it owns, atomically, through the
   * `delete_own_account()` function (FR-019a, R11). The profile then becomes local-only.
   */
  async deleteAccount(profileId: string, password: string): Promise<void> {
    await this.run(async () => {
      await this.verifyAccountPassword(profileId, password);
      const { error } = await this.cloud.client(profileId).rpc('delete_own_account');
      if (error) {
        throw error;
      }
    });
    await this.cloud.whileUnlinking(profileId, async () => {
      this.cloud.removeSession(profileId);
      await this.profiles.setCloud(profileId, null);
    });
  }

  // supabase-js can't verify a password on its own: a throwaway sign-in with the linked e-mail
  // does, then is discarded (R8). A wrong password maps to "E-mail ou senha incorretos.".
  private async verifyAccountPassword(profileId: string, password: string): Promise<void> {
    const link = this.requireProfile(profileId).cloud;
    if (!link) {
      throw GENERIC_FAILURE;
    }
    const client = this.cloud.transient();
    const { data, error } = await client.auth.signInWithPassword({ email: link.email, password });
    if (error) {
      throw error;
    }
    await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
    if (data.user?.id !== link.userId) {
      throw GENERIC_FAILURE;
    }
  }

  private async signInAsLinked(profileId: string, password: string): Promise<void> {
    const profile = this.requireProfile(profileId);
    if (!profile.cloud) {
      throw GENERIC_FAILURE;
    }
    await this.signIn(profile.cloud.email, password);
    await this.adoptPending(profileId);
  }

  private async adopt(profileId: string, pending: Pending): Promise<void> {
    // The transient client's session now belongs to the profile — drop it without signing out,
    // which would revoke the very session being moved.
    this.pending = null;
    const client = this.cloud.client(profileId);
    const { error } = await client.auth.setSession({
      access_token: pending.session.access_token,
      refresh_token: pending.session.refresh_token,
    });
    if (error) {
      throw mapCloudError(error);
    }
    await this.profiles.setCloud(profileId, {
      userId: pending.identity.userId,
      email: pending.identity.email,
      needsReauth: false,
    });
    if (this.session.active()?.id === profileId) {
      this.cloud.startAutoRefresh(profileId);
    }
  }

  // Best-effort: the link stands even if the metadata write fails; the next link retries it.
  private async writeMetadata(
    profileId: string,
    data: { grm_label: string; grm_label_at: string; grm_colors: Color[]; grm_colors_at: string },
  ): Promise<void> {
    try {
      await this.cloud.client(profileId).auth.updateUser({ data });
    } catch {
      // Ignored — see above.
    }
  }

  private requirePending(): Pending {
    if (!this.pending) {
      throw GENERIC_FAILURE;
    }
    return this.pending;
  }

  private requireProfile(profileId: string): ProfileSummary {
    const profile = this.profiles.byId(profileId);
    if (!profile) {
      throw GENERIC_FAILURE;
    }
    return profile;
  }
}
