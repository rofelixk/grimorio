import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileSummary } from '@models/profile.model';
import { CloudAuthService } from '@services/cloud-auth.service';
import { EntryModalService } from '@services/entry-modal.service';
import { ProfileModalService } from '@services/profile-modal.service';
import { ProfileSessionService } from '@services/profile-session.service';
import { ProfileStore } from '@services/profile-store.service';
import { EntryFlowStore } from './entry-flow.store';

const RAFA = {
  id: 'p1',
  name: 'rafa',
  colors: ['R'],
  cloud: { userId: 'u1', email: 'rafa@exemplo.com', needsReauth: false },
} as ProfileSummary;

describe('EntryFlowStore', () => {
  let store: EntryFlowStore;
  let entryModal: { close: ReturnType<typeof vi.fn> };
  let profileModal: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    entryModal = { close: vi.fn() };
    profileModal = { open: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        EntryFlowStore,
        { provide: EntryModalService, useValue: entryModal },
        { provide: ProfileModalService, useValue: profileModal },
        { provide: ProfileSessionService, useValue: { active: signal(RAFA) } },
        {
          provide: ProfileStore,
          useValue: { profiles: signal([RAFA]), byId: (id: string) => (id === 'p1' ? RAFA : undefined) },
        },
        { provide: CloudAuthService, useValue: { discardPending: vi.fn().mockResolvedValue(undefined) } },
      ],
    });
    store = TestBed.inject(EntryFlowStore);
  });

  it('hands "Vincular conta na nuvem" on "Perfil criado" to the profile modal at account creation', () => {
    store.start({ id: 0, context: 'device', start: 'profile' });
    store.linkAfterCreate();

    expect(entryModal.close).toHaveBeenCalled();
    expect(profileModal.open).toHaveBeenCalledWith({ start: 'up' });
    expect(entryModal.close.mock.invocationCallOrder[0]).toBeLessThan(profileModal.open.mock.invocationCallOrder[0]);
  });

  it('leads a linked profile’s forgotten password to "Redefinir senha do perfil", and Cancelar back to unlock', () => {
    store.start({ id: 0, context: 'gate', start: 'list' });
    store.pickProfile('p1');
    store.forgot();
    expect(store.phase()).toBe('recover-form');
    expect(store.title()).toBe('Redefinir senha do perfil');
    expect(store.plateEmail()).toBe('rafa@exemplo.com');

    store.cancelToUnlock();
    expect(store.phase()).toBe('unlock');
  });

  it('continues "Esqueci a senha da conta" into the cloud reset with the account e-mail locked', () => {
    store.start({ id: 0, context: 'gate', start: 'list' });
    store.pickProfile('p1');
    store.forgot();
    store.forgot();

    expect(store.phase()).toBe('reset-email');
    expect(store.fields().email).toBe('rafa@exemplo.com');
    expect(store.emailLocked()).toBe(true);
    store.followPrompt('back');
    expect(store.phase()).toBe('recover-form');
  });
});
