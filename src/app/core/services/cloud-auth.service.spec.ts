import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileSummary } from '@models/profile.model';
import { MSG } from '../utils/entry-copy';
import { CloudAuthService } from './cloud-auth.service';
import { CloudSessionService } from './cloud-session.service';
import { ConnectivityService } from './connectivity.service';
import { ProfileSessionService } from './profile-session.service';
import { PBKDF2_ITERATIONS, ProfileStore } from './profile-store.service';
import { ToastService } from './toast.service';

const ACCOUNT_AT = '2026-05-01T00:00:00.000Z';

function mockClient() {
  return {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      setSession: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
      getUser: vi.fn(),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

type MockClient = ReturnType<typeof mockClient>;

const signedIn = (userId: string, meta: Record<string, unknown> = {}) => ({
  data: {
    session: { access_token: 'a', refresh_token: 'r' },
    user: { id: userId, email: 'rafa@exemplo.com', user_metadata: meta },
  },
  error: null,
});

describe('CloudAuthService', () => {
  const online = signal(true);
  let store: ProfileStore;
  let auth: CloudAuthService;
  let toasts: ToastService;
  let profileClient: MockClient;
  let transient: MockClient;
  let cloud: {
    client: ReturnType<typeof vi.fn>;
    transient: ReturnType<typeof vi.fn>;
    removeSession: ReturnType<typeof vi.fn>;
    stopAutoRefresh: ReturnType<typeof vi.fn>;
    startAutoRefresh: ReturnType<typeof vi.fn>;
    whileUnlinking: (id: string, fn: () => Promise<unknown>) => Promise<unknown>;
  };
  let rafa: ProfileSummary;

  beforeEach(async () => {
    online.set(true);
    profileClient = mockClient();
    transient = mockClient();
    cloud = {
      client: vi.fn(() => profileClient),
      transient: vi.fn(() => transient),
      removeSession: vi.fn(),
      stopAutoRefresh: vi.fn(),
      startAutoRefresh: vi.fn(),
      whileUnlinking: (_id, fn) => fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: PBKDF2_ITERATIONS, useValue: 5 },
        { provide: CloudSessionService, useValue: cloud },
        { provide: ConnectivityService, useValue: { online } },
        { provide: ProfileSessionService, useValue: { active: signal(null), activate: vi.fn() } },
      ],
    });
    store = TestBed.inject(ProfileStore);
    auth = TestBed.inject(CloudAuthService);
    toasts = TestBed.inject(ToastService);
    await store.whenReady();
    rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['U', 'R'] });
  });

  const link = () => store.setCloud(rafa.id, { userId: 'u1', email: 'rafa@exemplo.com', needsReauth: false });

  describe('metadata timestamps', () => {
    it('writes the label and color times on sign-up', async () => {
      transient.auth.signUp.mockResolvedValue(signedIn('u1'));
      await auth.signUp('rafa@exemplo.com', 'grimorio123', {
        label: 'rafa',
        labelAt: rafa.nameUpdatedAt,
        colors: ['U', 'R'],
        colorsAt: rafa.colorsUpdatedAt,
      });
      expect(transient.auth.signUp.mock.calls[0][0].options.data).toEqual({
        grm_label: 'rafa',
        grm_label_at: rafa.nameUpdatedAt,
        grm_colors: ['U', 'R'],
        grm_colors_at: rafa.colorsUpdatedAt,
      });
    });

    it('writes the profile’s times on link', async () => {
      transient.auth.signInWithPassword.mockResolvedValue(signedIn('u1'));
      await auth.signIn('rafa@exemplo.com', 'grimorio123');
      await auth.linkPending(rafa.id, { writeColors: true });

      expect(profileClient.auth.updateUser).toHaveBeenCalledWith({
        data: {
          grm_label: 'rafa',
          grm_label_at: rafa.nameUpdatedAt,
          grm_colors: ['U', 'R'],
          grm_colors_at: rafa.colorsUpdatedAt,
        },
      });
    });

    it('keeps the account’s own time when its colors replace the profile’s', async () => {
      transient.auth.signInWithPassword.mockResolvedValue(
        signedIn('u1', { grm_colors: ['G'], grm_colors_at: ACCOUNT_AT }),
      );
      await auth.signIn('rafa@exemplo.com', 'grimorio123');
      const { colorsReplaced } = await auth.linkPending(rafa.id, { writeColors: false });

      expect(colorsReplaced).toEqual(['G']);
      expect(store.byId(rafa.id)).toMatchObject({ colors: ['G'], colorsUpdatedAt: ACCOUNT_AT });
      expect(profileClient.auth.updateUser.mock.calls[0][0].data).toMatchObject({
        grm_colors: ['G'],
        grm_colors_at: ACCOUNT_AT,
      });
    });
  });

  describe('changeAccountPassword', () => {
    beforeEach(link);

    it('fails offline without a request', async () => {
      online.set(false);
      await expect(auth.changeAccountPassword(rafa.id, 'atual1234', 'novasenha1')).rejects.toEqual({
        kind: 'form',
        message: MSG.offline,
      });
      expect(transient.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('rejects a wrong current password with the generic credentials message', async () => {
      transient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { code: 'invalid_credentials' },
      });
      await expect(auth.changeAccountPassword(rafa.id, 'errada123', 'novasenha1')).rejects.toEqual({
        kind: 'form',
        message: MSG.wrongCloud,
      });
      expect(profileClient.auth.updateUser).not.toHaveBeenCalled();
    });

    it('refuses a sign-in that belongs to another user', async () => {
      transient.auth.signInWithPassword.mockResolvedValue(signedIn('u2'));
      await expect(auth.changeAccountPassword(rafa.id, 'atual1234', 'novasenha1')).rejects.toEqual({
        kind: 'form',
        message: MSG.generic,
      });
      expect(profileClient.auth.updateUser).not.toHaveBeenCalled();
    });

    it('updates the password, then ends only the other sessions', async () => {
      transient.auth.signInWithPassword.mockResolvedValue(signedIn('u1'));
      await auth.changeAccountPassword(rafa.id, 'atual1234', 'novasenha1');

      expect(transient.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(profileClient.auth.updateUser).toHaveBeenCalledWith({ password: 'novasenha1' });
      expect(profileClient.auth.signOut).toHaveBeenCalledWith({ scope: 'others' });
      expect(profileClient.auth.signOut).not.toHaveBeenCalledWith({ scope: 'global' });
      expect(store.byId(rafa.id)?.cloud).not.toBeNull();
      expect(await store.verifyPassword(rafa.id, 'grimorio123')).toBe(true);
    });

    it('shows same_password on the new password field', async () => {
      transient.auth.signInWithPassword.mockResolvedValue(signedIn('u1'));
      profileClient.auth.updateUser.mockResolvedValue({ data: {}, error: { code: 'same_password' } });
      await expect(auth.changeAccountPassword(rafa.id, 'atual1234', 'atual1234')).rejects.toEqual({
        kind: 'field',
        field: 'pwNew',
        message: MSG.samePassword,
      });
    });
  });

  describe('checkAccount', () => {
    beforeEach(link);

    it.each([
      [{ data: { user: { id: 'u1' } }, error: null }, 'ok'],
      [{ data: { user: null }, error: { code: 'user_not_found', status: 403 } }, 'gone'],
      [{ data: { user: null }, error: { code: 'session_not_found', status: 403 } }, 'expired'],
      [{ data: { user: null }, error: { name: 'AuthSessionMissingError', status: 400 } }, 'expired'],
      [{ data: { user: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } }, 'offline'],
    ])('maps %o to %s', async (response, expected) => {
      profileClient.auth.getUser.mockResolvedValue(response);
      expect(await auth.checkAccount(rafa.id)).toBe(expected);
    });

    it('is offline without a request while offline', async () => {
      online.set(false);
      expect(await auth.checkAccount(rafa.id)).toBe('offline');
      expect(profileClient.auth.getUser).not.toHaveBeenCalled();
    });
  });

  describe('forgetGoneAccount', () => {
    beforeEach(link);

    it('turns the profile local with a toast, keeping local data', async () => {
      await auth.forgetGoneAccount(rafa.id);

      expect(cloud.removeSession).toHaveBeenCalledWith(rafa.id);
      expect(store.byId(rafa.id)).toMatchObject({ name: 'rafa', colors: ['U', 'R'], cloud: null });
      expect(toasts.toast()).toMatchObject({
        label: 'Conta na nuvem',
        text: 'A conta rafa@exemplo.com não existe mais. rafa continua neste aparelho com todos os dados.',
      });
      expect(auth.accountGone()).toEqual({ profileId: rafa.id, n: 1 });
    });
  });

  describe('unlink', () => {
    beforeEach(link);

    it('takes the gone path when the account no longer exists', async () => {
      profileClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'user_not_found' } });
      expect(await auth.unlink(rafa.id)).toBe('gone');
      expect(store.byId(rafa.id)?.cloud).toBeNull();
      expect(toasts.toast()).not.toBeNull();
    });

    it('unlinks offline without checking the account', async () => {
      online.set(false);
      expect(await auth.unlink(rafa.id)).toBe('unlinked');
      expect(profileClient.auth.getUser).not.toHaveBeenCalled();
      expect(profileClient.auth.signOut).not.toHaveBeenCalled();
      expect(store.byId(rafa.id)?.cloud).toBeNull();
      expect(toasts.toast()).toBeNull();
    });

    it('unlinks online after a successful check', async () => {
      profileClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      expect(await auth.unlink(rafa.id)).toBe('unlinked');
      expect(profileClient.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });
  });

  describe('deleteAccount', () => {
    beforeEach(link);

    it('fails offline', async () => {
      online.set(false);
      await expect(auth.deleteAccount(rafa.id, 'atual1234')).rejects.toEqual({ kind: 'form', message: MSG.offline });
      expect(profileClient.rpc).not.toHaveBeenCalled();
    });

    it('deletes nothing on a wrong password', async () => {
      transient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { code: 'invalid_credentials' },
      });
      await expect(auth.deleteAccount(rafa.id, 'errada123')).rejects.toEqual({ kind: 'form', message: MSG.wrongCloud });
      expect(profileClient.rpc).not.toHaveBeenCalled();
      expect(store.byId(rafa.id)?.cloud).not.toBeNull();
    });

    it('calls delete_own_account, then turns the profile local', async () => {
      transient.auth.signInWithPassword.mockResolvedValue(signedIn('u1'));
      await auth.deleteAccount(rafa.id, 'atual1234');

      expect(profileClient.rpc).toHaveBeenCalledWith('delete_own_account');
      expect(cloud.removeSession).toHaveBeenCalledWith(rafa.id);
      expect(store.byId(rafa.id)?.cloud).toBeNull();
    });

    it('reports a dropped connection as offline, never success', async () => {
      transient.auth.signInWithPassword.mockResolvedValue(signedIn('u1'));
      profileClient.rpc.mockResolvedValue({ data: null, error: { message: 'TypeError: Failed to fetch' } });
      await expect(auth.deleteAccount(rafa.id, 'atual1234')).rejects.toEqual({ kind: 'form', message: MSG.offline });
      expect(store.byId(rafa.id)?.cloud).not.toBeNull();
    });
  });
});
