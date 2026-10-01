import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { CloudLink } from '@models/profile.model';
import { CardService } from '@services/card.service';
import { CloudAuthService } from '@services/cloud-auth.service';
import { CloudSessionService } from '@services/cloud-session.service';
import { CollectionService } from '@services/collection.service';
import { ConnectivityService } from '@services/connectivity.service';
import { DeckService } from '@services/deck.service';
import { EntryModalService } from '@services/entry-modal.service';
import { ProfileLifecycleService } from '@services/profile-lifecycle.service';
import { ProfileModalService } from '@services/profile-modal.service';
import { ProfileSessionService } from '@services/profile-session.service';
import { PBKDF2_ITERATIONS, ProfileStore } from '@services/profile-store.service';
import { SyncStatusService } from '@services/sync-status.service';
import { SyncService } from '@services/sync.service';
import { ToastService } from '@services/toast.service';
import { MSG } from '@utils/entry-copy';
import { ProfileFlowStore } from './profile-flow.store';

const LINK: CloudLink = { userId: 'u1', email: 'rafa@exemplo.com', needsReauth: false };

describe('ProfileFlowStore', () => {
  const activeId = signal<string | null>(null);
  const online = signal(true);
  const busy = signal(false);
  const decks = signal<unknown[]>([]);
  let profiles: ProfileStore;
  let store: ProfileFlowStore;
  let toasts: ToastService;
  let cloudAuth: Record<string, ReturnType<typeof vi.fn>> & { deleteAccount: Mock<CloudAuthService['deleteAccount']> };
  let cloudSession: { markNeedsReauth: ReturnType<typeof vi.fn> };
  let modal: { close: ReturnType<typeof vi.fn> };
  let entryModal: { open: ReturnType<typeof vi.fn> };
  let sync: { syncNow: ReturnType<typeof vi.fn>; lastSyncedAt: ReturnType<typeof signal<string | null>> };
  let lifecycle: { deleteProfile: ReturnType<typeof vi.fn> };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let cardTombstones: unknown[];
  let deckTombstones: unknown[];
  let rafaId: string;

  beforeEach(async () => {
    online.set(true);
    busy.set(false);
    decks.set([]);
    cardTombstones = [];
    deckTombstones = [];
    cloudAuth = {
      discardPending: vi.fn().mockResolvedValue(undefined),
      signIn: vi.fn().mockResolvedValue({ userId: 'u1', email: 'rafa@exemplo.com' }),
      signUp: vi.fn().mockResolvedValue({ userId: 'u1', email: 'rafa@exemplo.com' }),
      linkPending: vi.fn().mockResolvedValue({ colorsReplaced: null }),
      reauth: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue('unlinked'),
      checkAccount: vi.fn().mockResolvedValue('ok'),
      forgetGoneAccount: vi.fn().mockResolvedValue(undefined),
      changeAccountPassword: vi.fn().mockResolvedValue(undefined),
      deleteAccount: vi.fn().mockResolvedValue(undefined),
      requestResetCode: vi.fn().mockResolvedValue(undefined),
      verifyResetCode: vi.fn().mockResolvedValue({ userId: 'u1', email: 'rafa@exemplo.com' }),
      adoptPending: vi.fn().mockResolvedValue(undefined),
    };
    cloudSession = { markNeedsReauth: vi.fn().mockResolvedValue(undefined) };
    modal = { close: vi.fn() };
    entryModal = { open: vi.fn().mockResolvedValue({ activeProfileId: null }) };
    sync = { syncNow: vi.fn().mockResolvedValue('done'), lastSyncedAt: signal<string | null>(null) };
    lifecycle = { deleteProfile: vi.fn().mockResolvedValue(1) };
    router = { navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ProfileFlowStore,
        { provide: PBKDF2_ITERATIONS, useValue: 5 },
        {
          provide: ProfileSessionService,
          useFactory: () => {
            const store = TestBed.inject(ProfileStore);
            return { active: computed(() => store.byId(activeId()) ?? null) };
          },
        },
        { provide: CloudAuthService, useValue: cloudAuth },
        { provide: CloudSessionService, useValue: cloudSession },
        { provide: ConnectivityService, useValue: { online } },
        { provide: ProfileModalService, useValue: modal },
        { provide: EntryModalService, useValue: entryModal },
        { provide: SyncStatusService, useValue: { busy } },
        { provide: SyncService, useValue: sync },
        { provide: ProfileLifecycleService, useValue: lifecycle },
        { provide: CardService, useValue: { cards: signal([]), getTombstones: async () => cardTombstones } },
        { provide: CollectionService, useValue: { collections: signal([]), getTombstones: async () => [] } },
        { provide: DeckService, useValue: { decks, getTombstones: async () => deckTombstones } },
        { provide: Router, useValue: router },
      ],
    });
    profiles = TestBed.inject(ProfileStore);
    await profiles.whenReady();
    const rafa = await profiles.create({ name: 'rafa', password: 'grimorio123', colors: ['U', 'R'] });
    rafaId = rafa.id;
    activeId.set(rafaId);
    store = TestBed.inject(ProfileFlowStore);
    toasts = TestBed.inject(ToastService);
    store.open('hub');
  });

  const link = (patch: Partial<CloudLink> = {}) => profiles.setCloud(rafaId, { ...LINK, ...patch });
  const type = (fields: Partial<Record<'name' | 'email' | 'pw' | 'pwNew' | 'pwConfirm' | 'code', string>>) => {
    for (const [key, value] of Object.entries(fields)) {
      store.editField(key as never, value);
    }
  };

  describe('navigation (US1)', () => {
    it('opens on the hub with origin hub', () => {
      expect(store.phase()).toBe('hub');
      expect(store.origin()).toBe('hub');
      expect(store.title()).toBe('rafa');
    });

    it('returns from both sub-screens to the hub', () => {
      store.openLocal();
      expect(store.phase()).toBe('local');
      store.back();
      expect(store.phase()).toBe('hub');
      store.openCloud();
      store.back();
      expect(store.phase()).toBe('hub');
    });

    it('records where a step was opened from, and Cancelar / Concluir return there', () => {
      store.openLocal();
      store.openStep('pw');
      expect(store.origin()).toBe('local');
      store.cancel();
      expect(store.phase()).toBe('local');

      store.openCloud();
      store.openStep('unlink');
      store.concluir();
      expect(store.phase()).toBe('cloud');
    });

    it('hands "Trocar de perfil" off to the entry modal’s list', () => {
      store.switchProfile();
      expect(modal.close).toHaveBeenCalled();
      expect(entryModal.open).toHaveBeenCalledWith({ start: 'list' });
      expect(modal.close.mock.invocationCallOrder[0]).toBeLessThan(entryModal.open.mock.invocationCallOrder[0]);
    });

    it('does not switch while a sync runs', () => {
      busy.set(true);
      store.switchProfile();
      expect(modal.close).not.toHaveBeenCalled();
      expect(entryModal.open).not.toHaveBeenCalled();
    });
  });

  describe('rename and colors (US2)', () => {
    it('enables Salvar only for a changed name, never for color taps', () => {
      store.openLocal();
      expect(store.fields().name).toBe('rafa');
      expect(store.salvarEnabled()).toBe(false);

      store.setColors(['G']);
      expect(profiles.byId(rafaId)?.colors).toEqual(['G']);
      expect(store.salvarEnabled()).toBe(false);

      type({ name: 'rafa2' });
      expect(store.salvarEnabled()).toBe(true);
    });

    it('discards an unsaved name on Voltar', () => {
      store.openLocal();
      type({ name: 'rafa2' });
      store.back();
      store.openLocal();
      expect(store.fields().name).toBe('rafa');
      expect(profiles.byId(rafaId)?.name).toBe('rafa');
    });

    it('shows the name rules as a field error', async () => {
      await profiles.create({ name: 'bia', password: 'grimorio123', colors: ['G'] });
      store.openLocal();
      type({ name: 'BIA' });
      await store.submit();
      expect(store.fieldErrors().user).toBe(MSG.userTaken);

      type({ name: 'x!' });
      await store.submit();
      expect(store.fieldErrors().user).toBe(MSG.userLen);
    });

    it('saves, stays on the screen and toasts', async () => {
      store.openLocal();
      type({ name: 'RAFA' });
      await store.submit();

      expect(profiles.byId(rafaId)?.name).toBe('RAFA');
      expect(store.phase()).toBe('local');
      expect(store.salvarEnabled()).toBe(false);
      expect(toasts.toast()).toMatchObject({ label: 'Perfil', text: 'Alterações salvas.' });
    });
  });

  describe('cloud flows (US3)', () => {
    it('links from the hub plate and Concluir returns to the hub', async () => {
      store.openStep('in');
      type({ email: 'rafa@exemplo.com', pw: 'grimorio123' });
      await store.submit();

      expect(cloudAuth['linkPending']).toHaveBeenCalledWith(rafaId, { writeColors: true });
      expect(store.done()).toBe('linked');
      store.concluir();
      expect(store.phase()).toBe('hub');
    });

    it('creates an account from Conta na nuvem and Concluir returns there', async () => {
      store.openCloud();
      store.openStep('in');
      store.followPrompt('up');
      type({ email: 'rafa@exemplo.com', pw: 'grimorio123' });
      await store.submit();

      expect(cloudAuth['signUp']).toHaveBeenCalledWith('rafa@exemplo.com', 'grimorio123', expect.objectContaining({ label: 'rafa' }));
      expect(store.done()).toBe('created');
      store.concluir();
      expect(store.phase()).toBe('cloud');
    });

    it('names the replaced tribe when the account’s colors win', async () => {
      cloudAuth['signIn'].mockResolvedValue({ userId: 'u1', email: 'rafa@exemplo.com', colors: ['W'] });
      cloudAuth['linkPending'].mockResolvedValue({ colorsReplaced: ['W'] });
      store.openStep('in');
      type({ email: 'rafa@exemplo.com', pw: 'grimorio123' });
      await store.submit();

      expect(cloudAuth['linkPending']).toHaveBeenCalledWith(rafaId, { writeColors: false });
      expect(store.replacedTribe()).toBe('Mono-branco');
    });

    it('re-signs in and unlinks', async () => {
      await link({ needsReauth: true });
      store.openStep('reauth');
      type({ pw: 'grimorio123' });
      await store.submit();
      expect(store.done()).toBe('reauthed');

      store.openCloud();
      store.openStep('unlink');
      await store.submit();
      expect(store.done()).toBe('unlinked');
    });

    it('returns the reset flow to where it started, keeping the origin', async () => {
      await link({ needsReauth: true });
      store.openCloud();
      store.openStep('reauth');
      store.forgot();
      expect(store.phase()).toBe('reset-email');
      expect(store.emailLocked()).toBe(true);
      expect(store.fields().email).toBe('rafa@exemplo.com');

      store.followPrompt('back');
      expect(store.phase()).toBe('reauth');
      expect(store.origin()).toBe('cloud');
    });

    it('adopts the reset sign-in for reauth', async () => {
      await link({ needsReauth: true });
      store.openStep('reauth');
      store.forgot();
      await store.submit();
      expect(store.phase()).toBe('reset-code');
      type({ code: '123456', pw: 'novasenha1' });
      await store.submit();
      expect(cloudAuth['adoptPending']).toHaveBeenCalledWith(rafaId);
      expect(store.done()).toBe('reauthed');
    });

    it('drops a result that lands after navigating away', async () => {
      let resolve!: () => void;
      cloudAuth['reauth'].mockReturnValue(new Promise<void>((r) => (resolve = r)));
      await link({ needsReauth: true });
      store.openStep('reauth');
      type({ pw: 'grimorio123' });
      const pending = store.submit();
      store.cancel();
      resolve();
      await pending;

      expect(store.phase()).toBe('hub');
      expect(store.done()).toBeNull();
    });

    it('never starts a sync', async () => {
      store.openStep('in');
      type({ email: 'rafa@exemplo.com', pw: 'grimorio123' });
      await store.submit();
      expect(sync.syncNow).not.toHaveBeenCalled();
    });

    it('hints at unlinking after a failed re-sign-in (FR-019c)', async () => {
      await link({ needsReauth: true });
      cloudAuth['reauth'].mockRejectedValue({ kind: 'form', message: MSG.wrongCloud });
      store.openStep('reauth');
      type({ pw: 'errada123' });
      await store.submit();

      expect(store.formError()).toBe(MSG.wrongCloud);
      expect(store.formHint()).toBe(MSG.goneHint('rafa'));
    });
  });

  describe('passwords (US4)', () => {
    it('checks pw fields in order, then the current password', async () => {
      store.openLocal();
      store.openStep('pw');
      type({ pw: 'grimorio123', pwNew: 'novasenha1', pwConfirm: 'outrasenha' });
      await store.submit();
      expect(store.fieldErrors()).toEqual({ pwConfirm: MSG.pwMismatch });

      type({ pw: 'errada123', pwConfirm: 'novasenha1' });
      await store.submit();
      expect(store.fieldErrors()).toEqual({ pw: MSG.wrongLocal });
      expect(await profiles.verifyPassword(rafaId, 'grimorio123')).toBe(true);
    });

    it('changes the local password', async () => {
      store.openLocal();
      store.openStep('pw');
      type({ pw: 'grimorio123', pwNew: 'novasenha1', pwConfirm: 'novasenha1' });
      await store.submit();

      expect(store.done()).toBe('pwChanged');
      expect(await profiles.verifyPassword(rafaId, 'novasenha1')).toBe(true);
    });

    it('shows same_password and weak_password on the new account password', async () => {
      await link();
      store.openCloud();
      store.openStep('cloudpw');
      await Promise.resolve();
      type({ pw: 'atual1234', pwNew: 'atual1234' });
      cloudAuth['changeAccountPassword'].mockRejectedValue({ kind: 'field', field: 'pwNew', message: MSG.samePassword });
      await store.submit();
      expect(store.fieldErrors()).toEqual({ pwNew: MSG.samePassword });

      cloudAuth['changeAccountPassword'].mockRejectedValue({ kind: 'field', field: 'pw', message: MSG.pwMin });
      type({ pwNew: 'fraca1234' });
      await store.submit();
      expect(store.fieldErrors()).toEqual({ pwNew: MSG.pwMin });
    });
  });

  describe('deletions (US5)', () => {
    it('evaluates unsynced changes when delprofile opens', async () => {
      await link();
      cardTombstones = [{ id: 'c1', deletedAt: '' }];
      store.openLocal();
      store.openStep('delprofile');
      await vi.waitFor(() => expect(store.unsynced()).toBe(true));
    });

    it('counts a deck tombstone as unsynced', async () => {
      await link();
      deckTombstones = [{ id: 'd1', deletedAt: '' }];
      store.openLocal();
      store.openStep('delprofile');
      await vi.waitFor(() => expect(store.unsynced()).toBe(true));
    });

    it('never warns a local profile', async () => {
      cardTombstones = [{ id: 'c1', deletedAt: '' }];
      store.openLocal();
      store.openStep('delprofile');
      await Promise.resolve();
      await Promise.resolve();
      expect(store.unsynced()).toBe(false);
    });

    it('locks deletion while a sync runs, then shows the outcome', async () => {
      await link();
      let finish!: (outcome: string) => void;
      sync.syncNow.mockReturnValue(new Promise((r) => (finish = r)));
      store.openLocal();
      store.openStep('delprofile');
      const syncing = store.syncBeforeDelete();
      expect(store.blockSync()).toBe('syncing');
      expect(store.deleteLocked()).toBe(true);

      finish('offline');
      await syncing;
      expect(store.blockSync()).toBe('offline');
      expect(store.blockFailure()).toBe('Sem conexão');
      expect(store.deleteLocked()).toBe(false);
    });

    it('opens the entry list when profiles remain', async () => {
      store.openLocal();
      store.openStep('delprofile');
      type({ pw: 'grimorio123' });
      await store.submit();

      expect(lifecycle.deleteProfile).toHaveBeenCalledWith(rafaId, 'grimorio123');
      expect(modal.close).toHaveBeenCalled();
      expect(entryModal.open).toHaveBeenCalledWith({ start: 'list' });
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('goes Home after deleting the last profile', async () => {
      lifecycle.deleteProfile.mockResolvedValue(0);
      store.openLocal();
      store.openStep('delprofile');
      type({ pw: 'grimorio123' });
      await store.submit();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/');
      expect(entryModal.open).not.toHaveBeenCalled();
    });

    it('deletes the cloud account and names it on the done screen', async () => {
      await link();
      cloudAuth['deleteAccount'].mockImplementation(async () => profiles.setCloud(rafaId, null));
      store.openCloud();
      store.openStep('delcloud');
      await Promise.resolve();
      type({ pw: 'atual1234' });
      await store.submit();

      expect(store.done()).toBe('cloudDeleted');
      expect(store.doneCopy()?.body).toContain('A conta rafa@exemplo.com e os dados dela na nuvem foram apagados.');
    });

    it('returns to the hub when the account turns out to be gone', async () => {
      await link();
      cloudAuth['checkAccount'].mockResolvedValue('gone');
      store.openCloud();
      store.openStep('cloudpw');
      await vi.waitFor(() => expect(store.phase()).toBe('hub'));
      expect(cloudAuth['forgetGoneAccount']).toHaveBeenCalledWith(rafaId);
      expect(store.origin()).toBe('hub');
    });

    it('shows the expired screen when the session is dead on open', async () => {
      await link();
      cloudAuth['checkAccount'].mockResolvedValue('expired');
      store.openCloud();
      store.openStep('delcloud');
      await vi.waitFor(() => expect(store.phase()).toBe('cloud'));
      expect(cloudSession.markNeedsReauth).toHaveBeenCalledWith(rafaId);
    });

    it('takes the gone path from unlink', async () => {
      await link();
      cloudAuth['unlink'].mockResolvedValue('gone');
      store.openCloud();
      store.openStep('unlink');
      await store.submit();
      expect(store.phase()).toBe('hub');
      expect(store.done()).toBeNull();
    });
  });
});
