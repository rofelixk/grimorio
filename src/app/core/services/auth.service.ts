import { computed, inject, Injectable, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { Color } from '@models/card.model';
import { SUPABASE_CLIENT } from '../supabase-client';

// Username support (project hyzbkxraanzhdyhtnadf) is backed by a public.profiles table
// (id references auth.users, cascades on delete), not a direct index on auth.users —
// the connecting role doesn't own that table. A trigger on auth.users
// (insert/update of raw_user_meta_data) keeps profiles.username in sync, enforced
// unique case-insensitively. Two SECURITY DEFINER RPCs read/write through it:
// `delete_current_user()` (see deleteAccount) and `email_for_identifier(identifier text)`
// (see resolveEmail). Note: decks_user_id_fkey is still ON DELETE NO ACTION (unlike
// collections_user_id_fkey's CASCADE) — deleteAccount() will fail for a user with decks
// until that's fixed, deferred until the decks/collections schema is redone.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  private readonly sessionSignal = signal<Session | null>(null);
  readonly session = this.sessionSignal.asReadonly();
  readonly user = computed(() => this.session()?.user ?? null);
  readonly username = computed(
    () => (this.user()?.user_metadata?.['username'] as string | undefined) ?? '',
  );
  // Cross-device sync for the auth-modal theme picker's picks — undefined means the
  // account has never saved a preference (a pre-existing account, or a fresh sign-up
  // that didn't pass any), distinct from an empty array, which ThemeService never sends.
  readonly themeColors = computed(
    () => this.user()?.user_metadata?.['themeColors'] as Color[] | undefined,
  );
  // What to show for this account anywhere space is tight (e.g. the nav bar) —
  // the username when set, falling back to email.
  readonly displayName = computed(() => this.username() || this.user()?.email || '');

  private readonly initialSession: Promise<void>;

  constructor() {
    this.initialSession = this.supabase.auth
      .getSession()
      .then(({ data }) => this.sessionSignal.set(data.session));
    this.supabase.auth.onAuthStateChange((_event, session) => this.sessionSignal.set(session));
  }

  // Resolves once the session from getSession() has been applied to the `session`
  // signal — lets the auth guard await the real session instead of racing its still-null
  // initial value on a fresh page load (e.g. a direct link/refresh into /profile).
  whenReady(): Promise<void> {
    return this.initialSession;
  }

  async signUp(email: string, password: string, username?: string, themeColors?: Color[]): Promise<void> {
    const trimmedUsername = username?.trim();
    const data: Record<string, unknown> = {};
    if (trimmedUsername) {
      data['username'] = trimmedUsername;
    }
    if (themeColors && themeColors.length > 0) {
      data['themeColors'] = themeColors;
    }
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      ...(Object.keys(data).length > 0 ? { options: { data } } : {}),
    });
    if (error) {
      throw new Error(this.isUsernameTakenError(error) ? 'Nome de usuário já está em uso.' : error.message);
    }
  }

  // Accepts either an email or a username. A username is resolved to its account's
  // email first (via the `email_for_identifier` RPC), then signed in normally. See the
  // PENDING SUPABASE MIGRATION note at the top of this file.
  async signIn(identifier: string, password: string): Promise<void> {
    const email = identifier.includes('@') ? identifier : await this.resolveEmail(identifier);
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }
  }

  private async resolveEmail(identifier: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('email_for_identifier', { identifier });
    if (error || !data) {
      // Same message signInWithPassword uses for a wrong password, so an unknown
      // username can't be distinguished from a wrong password by the error text.
      throw new Error('Invalid login credentials');
    }
    return data as string;
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  async updateUsername(username: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ data: { username } });
    if (error) {
      throw new Error(this.isUsernameTakenError(error) ? 'Nome de usuário já está em uso.' : error.message);
    }
  }

  async updateThemeColors(themeColors: Color[]): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ data: { themeColors } });
    if (error) {
      throw new Error(error.message);
    }
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    const email = this.user()?.email;
    if (email) {
      // Re-verify the current password before changing it — updateUser() only needs a
      // live session, so without this check anyone with an unlocked, signed-in session
      // could change the password without knowing it.
      const { error: verifyError } = await this.supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyError) {
        throw new Error('Senha atual incorreta.');
      }
    }

    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw new Error(error.message);
    }
  }

  // Calls the `delete_current_user` Postgres function (SECURITY DEFINER, deleting the
  // caller's own row from `auth.users`). See the PENDING SUPABASE MIGRATION note at the
  // top of this file.
  async deleteAccount(): Promise<void> {
    const { error } = await this.supabase.rpc('delete_current_user');
    if (error) {
      throw new Error(error.message);
    }
    await this.signOut();
  }

  // The username field has a case-insensitive unique index in the database; GoTrue
  // wraps the resulting Postgres error in a generic message, so this matches on it
  // loosely rather than a specific code.
  private isUsernameTakenError(error: { message: string }): boolean {
    return /duplicate|unique/i.test(error.message);
  }
}
