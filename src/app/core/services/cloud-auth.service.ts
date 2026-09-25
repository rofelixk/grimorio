import { Injectable, inject } from '@angular/core';
import { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { Color, ProfileSummary } from '@models/profile.model';
import { GENERIC_FAILURE, OFFLINE_FAILURE, mapCloudError } from '../utils/cloud-error.util';
import { MSG } from '../utils/entry-copy';
import { DEFAULT_IDENTITY } from '../utils/identity.util';
import { normalizeEmail } from '../utils/entry-flow.util';
import { CloudSessionService } from './cloud-session.service';
import { ConnectivityService } from './connectivity.service';
import { ProfileSessionService } from './profile-session.service';
import { ProfileStore } from './profile-store.service';

/** Who a cloud sign-in belongs to, read from the account's `user_metadata` (R6). */
export interface CloudIdentity {
  userId: string;
  email: string;
  label?: string;
  colors?: Color[];
}

interface Pending {
  client: SupabaseClient;
  session: Session;
  identity: CloudIdentity;
}

const VALID_COLORS: readonly string[] = ['W', 'U', 'B', 'R', 'G'];

function identityOf(user: User): CloudIdentity {
  const meta = (user.user_metadata ?? {}) as { grm_label?: unknown; grm_colors?: unknown };
  const colors = Array.isArray(meta.grm_colors)
    ? (meta.grm_colors.filter((c) => typeof c === 'string' && VALID_COLORS.includes(c)) as Color[])
    : [];
  return {
    userId: user.id,
    email: user.email ?? '',
    label: typeof meta.grm_label === 'string' ? meta.grm_label : undefined,
    colors: colors.length ? [...new Set(colors)].slice(0, 3) : undefined,
  };
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

  private pending: Pending | null = null;

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

  /** Creates an account with the linking profile's name and colors as its metadata (R6). */
  signUp(email: string, password: string, profile: { label: string; colors: Color[] }): Promise<CloudIdentity> {
    return this.run(async () => {
      await this.discardPending();
      const client = this.cloud.transient();
      const { data, error } = await client.auth.signUp({
        email: normalizeEmail(email),
        password,
        options: { data: { grm_label: profile.label, grm_colors: profile.colors } },
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
    const profile = this.requireProfile(profileId);
    const accountColors = !opts.writeColors ? (pending.identity.colors ?? null) : null;
    const colors = accountColors ?? profile.colors;
    await this.adopt(profileId, pending);
    if (accountColors) {
      await this.profiles.setColors(profileId, accountColors);
    }
    await this.writeMetadata(profileId, { grm_label: profile.name, grm_colors: colors });
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

  /** Local-only (FR-021): works offline. The remote account and its rows are kept (FR-019). */
  async unlink(profileId: string): Promise<void> {
    const client = this.cloud.client(profileId);
    await this.cloud.whileUnlinking(profileId, async () => {
      this.cloud.stopAutoRefresh(profileId);
      if (this.connectivity.online()) {
        await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
      }
      this.cloud.removeSession(profileId);
      await this.profiles.setCloud(profileId, null);
    });
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
  private async writeMetadata(profileId: string, data: { grm_label: string; grm_colors: Color[] }): Promise<void> {
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
