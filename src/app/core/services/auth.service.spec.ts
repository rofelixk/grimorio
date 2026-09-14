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

  beforeEach(() => {
    getSession = vi.fn().mockResolvedValue({ data: { session: null } });
    onAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    signUp = vi.fn().mockResolvedValue({ error: null });
    signInWithPassword = vi.fn().mockResolvedValue({ error: null });
    signOut = vi.fn().mockResolvedValue({ error: null });

    const supabaseStub = {
      auth: { getSession, onAuthStateChange, signUp, signInWithPassword, signOut },
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
      auth: { getSession, onAuthStateChange, signUp, signInWithPassword, signOut },
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

  it('signUp rejects with a readable error on failure', async () => {
    signUp.mockResolvedValue({ error: { message: 'Email already registered' } });

    await expect(service.signUp('a@b.com', 'password')).rejects.toThrow(
      'Email already registered',
    );
  });

  it('signIn rejects with a readable error on failure', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });

    await expect(service.signIn('a@b.com', 'wrong')).rejects.toThrow(
      'Invalid login credentials',
    );
  });

  it('signOut resolves when successful', async () => {
    await expect(service.signOut()).resolves.toBeUndefined();
    expect(signOut).toHaveBeenCalled();
  });
});
