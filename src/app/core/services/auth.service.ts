import { computed, inject, Injectable, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase-client';

// PENDING SUPABASE MIGRATION (not yet applied as of 2026-09-15, blocked by a Supabase
// maintenance window — retry via `mcp__Supabase__apply_migration` on project
// hyzbkxraanzhdyhtnadf): a case-insensitive unique index on auth.users' username
// metadata field, plus two SECURITY DEFINER RPCs this service calls —
// `delete_current_user()` (see deleteAccount) and `email_for_identifier(identifier text)`
// (see resolveEmail). Until that migration lands: deleteAccount() and signIn() with a
// username (as opposed to an email) both reject at runtime with a Postgres/GoTrue error.
// Plain email sign-in, sign-up, and password change are unaffected. Before applying,
// check collections_user_id_fkey/decks_user_id_fkey's ON DELETE behavior against
// auth.users — a row already exists in `collections`.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  private readonly sessionSignal = signal<Session | null>(null);
  readonly session = this.sessionSignal.asReadonly();
  readonly user = computed(() => this.session()?.user ?? null);
  readonly username = computed(
    () => (this.user()?.user_metadata?.['username'] as string | undefined) ?? '',
  );
  // What to show for this account anywhere space is tight (e.g. the nav bar) —
  // the username when set, falling back to email.
  readonly displayName = computed(() => this.username() || this.user()?.email || '');

  constructor() {
    this.supabase.auth.getSession().then(({ data }) => this.sessionSignal.set(data.session));
    this.supabase.auth.onAuthStateChange((_event, session) => this.sessionSignal.set(session));
  }

  async signUp(email: string, password: string, username?: string): Promise<void> {
    const trimmedUsername = username?.trim();
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      ...(trimmedUsername ? { options: { data: { username: trimmedUsername } } } : {}),
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
