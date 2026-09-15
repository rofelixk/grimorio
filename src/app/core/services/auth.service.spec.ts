import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPABASE_CLIENT } from '../supabase-client';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let getSession: ReturnType<typeof vi.fn>;
  let onAuthStateChange: ReturnType<typeof vi.fn>;
  let signUp: ReturnType<typeof vi.fn>;
  let signInWithPassword: ReturnType<typeof vi.fn>;
  let signOut: ReturnType<typeof vi.fn>;
  let updateUser: ReturnType<typeof vi.fn>;
  let rpc: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getSession = vi.fn().mockResolvedValue({ data: { session: null } });
    onAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    signUp = vi.fn().mockResolvedValue({ error: null });
    signInWithPassword = vi.fn().mockResolvedValue({ error: null });
    signOut = vi.fn().mockResolvedValue({ error: null });
    updateUser = vi.fn().mockResolvedValue({ error: null });
    rpc = vi.fn().mockResolvedValue({ error: null });

    const supabaseStub = {
      auth: { getSession, onAuthStateChange, signUp, signInWithPassword, signOut, updateUser },
      rpc,
    };

    TestBed.configureTestingModule({
      providers: [{ provide: SUPABASE_CLIENT, useValue: supabaseStub }],
    });
    service = TestBed.inject(AuthService);
  });

  it('starts with no session and no user', () => {
    expect(service.session()).toBeNull();
    expect(service.user()).toBeNull();
  });

  it('seeds the session from getSession() on construction', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { email: 'a@b.com' } } } });

    TestBed.resetTestingModule();
    const supabaseStub = {
      auth: { getSession, onAuthStateChange, signUp, signInWithPassword, signOut, updateUser },
      rpc,
    };
    TestBed.configureTestingModule({
      providers: [{ provide: SUPABASE_CLIENT, useValue: supabaseStub }],
    });
    const seededService = TestBed.inject(AuthService);

    await Promise.resolve();
    await Promise.resolve();

    expect(seededService.user()).toEqual({ email: 'a@b.com' });
  });

  it('updates the session when the auth state change callback fires', () => {
    const callback = onAuthStateChange.mock.calls[0][0];
    callback('SIGNED_IN', { user: { email: 'c@d.com' } });

    expect(service.user()).toEqual({ email: 'c@d.com' });
  });

  it('exposes username from user_metadata, defaulting to an empty string', () => {
    expect(service.username()).toBe('');

    const callback = onAuthStateChange.mock.calls[0][0];
    callback('SIGNED_IN', { user: { email: 'c@d.com', user_metadata: { username: 'rodrigo_gm' } } });

    expect(service.username()).toBe('rodrigo_gm');
  });

  describe('displayName', () => {
    it('falls back to email when no username is set', () => {
      const callback = onAuthStateChange.mock.calls[0][0];
      callback('SIGNED_IN', { user: { email: 'c@d.com', user_metadata: {} } });

      expect(service.displayName()).toBe('c@d.com');
    });

    it('prefers the username over email when both are present', () => {
      const callback = onAuthStateChange.mock.calls[0][0];
      callback('SIGNED_IN', { user: { email: 'c@d.com', user_metadata: { username: 'rodrigo_gm' } } });

      expect(service.displayName()).toBe('rodrigo_gm');
    });

    it('is an empty string when signed out', () => {
      expect(service.displayName()).toBe('');
    });
  });

  describe('signUp', () => {
    it('rejects with a readable error on failure', async () => {
      signUp.mockResolvedValue({ error: { message: 'Email already registered' } });

      await expect(service.signUp('a@b.com', 'password')).rejects.toThrow(
        'Email already registered',
      );
    });

    it('signs up without a username when none is given', async () => {
      await service.signUp('a@b.com', 'password');

      expect(signUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password' });
    });

    it('passes a trimmed username through as user_metadata when given', async () => {
      await service.signUp('a@b.com', 'password', '  rodrigo_gm  ');

      expect(signUp).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'password',
        options: { data: { username: 'rodrigo_gm' } },
      });
    });

    it('rewrites a duplicate-username error as a readable message', async () => {
      signUp.mockResolvedValue({
        error: { message: 'duplicate key value violates unique constraint "users_username_unique_idx"' },
      });

      await expect(service.signUp('a@b.com', 'password', 'rodrigo_gm')).rejects.toThrow(
        'Nome de usuário já está em uso.',
      );
    });
  });

  describe('signIn', () => {
    it('signs in directly with an email identifier, without resolving it', async () => {
      await service.signIn('a@b.com', 'secret');

      expect(rpc).not.toHaveBeenCalled();
      expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret' });
    });

    it('resolves a username identifier to an email via the RPC, then signs in', async () => {
      rpc.mockResolvedValue({ data: 'a@b.com', error: null });

      await service.signIn('rodrigo_gm', 'secret');

      expect(rpc).toHaveBeenCalledWith('email_for_identifier', { identifier: 'rodrigo_gm' });
      expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret' });
    });

    it('rejects with a generic error when the username does not resolve', async () => {
      rpc.mockResolvedValue({ data: null, error: null });

      await expect(service.signIn('unknown_user', 'secret')).rejects.toThrow(
        'Invalid login credentials',
      );
      expect(signInWithPassword).not.toHaveBeenCalled();
    });

    it('rejects with a readable error on failure', async () => {
      signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });

      await expect(service.signIn('a@b.com', 'wrong')).rejects.toThrow(
        'Invalid login credentials',
      );
    });
  });

  it('signOut resolves when successful', async () => {
    await expect(service.signOut()).resolves.toBeUndefined();
    expect(signOut).toHaveBeenCalled();
  });

  describe('updateUsername', () => {
    it('calls updateUser with the username in data', async () => {
      await service.updateUsername('rodrigo_gm');

      expect(updateUser).toHaveBeenCalledWith({ data: { username: 'rodrigo_gm' } });
    });

    it('rejects with a readable error on failure', async () => {
      updateUser.mockResolvedValue({ error: { message: 'Nome de usuário inválido' } });

      await expect(service.updateUsername('')).rejects.toThrow('Nome de usuário inválido');
    });

    it('rewrites a duplicate-username error as a readable message', async () => {
      updateUser.mockResolvedValue({
        error: { message: 'duplicate key value violates unique constraint "users_username_unique_idx"' },
      });

      await expect(service.updateUsername('rodrigo_gm')).rejects.toThrow(
        'Nome de usuário já está em uso.',
      );
    });
  });

  it('updatePassword re-verifies the current password, then updates it', async () => {
    const callback = onAuthStateChange.mock.calls[0][0];
    callback('SIGNED_IN', { user: { email: 'c@d.com' } });

    await service.updatePassword('oldpass', 'newpass1');

    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'c@d.com', password: 'oldpass' });
    expect(updateUser).toHaveBeenCalledWith({ password: 'newpass1' });
  });

  it('updatePassword rejects without calling updateUser when the current password is wrong', async () => {
    const callback = onAuthStateChange.mock.calls[0][0];
    callback('SIGNED_IN', { user: { email: 'c@d.com' } });
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });

    await expect(service.updatePassword('wrong', 'newpass1')).rejects.toThrow(
      'Senha atual incorreta.',
    );
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('deleteAccount calls the delete_current_user RPC and signs out on success', async () => {
    await service.deleteAccount();

    expect(rpc).toHaveBeenCalledWith('delete_current_user');
    expect(signOut).toHaveBeenCalled();
  });

  it('deleteAccount rejects with a readable error and does not sign out on failure', async () => {
    rpc.mockResolvedValue({ error: { message: 'function delete_current_user() does not exist' } });

    await expect(service.deleteAccount()).rejects.toThrow(
      'function delete_current_user() does not exist',
    );
    expect(signOut).not.toHaveBeenCalled();
  });
});
