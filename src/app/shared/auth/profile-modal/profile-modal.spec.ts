import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudLink, ProfileSummary } from '@models/profile.model';
import { CloudAuthService } from '@services/cloud-auth.service';
import { EntryModalService } from '@services/entry-modal.service';
import { ProfileModalService } from '@services/profile-modal.service';
import { ProfileSessionService } from '@services/profile-session.service';
import { SyncStatusService } from '@services/sync-status.service';
import { syncDisplay } from '@utils/sync-status.util';
import { ProfileModal } from './profile-modal';

const LINK: CloudLink = { userId: 'u1', email: 'rafa@exemplo.com', needsReauth: false };

describe('ProfileModal', () => {
  const originals = {
    showModal: HTMLDialogElement.prototype.showModal,
    close: HTMLDialogElement.prototype.close,
  };
  const active = signal<ProfileSummary | null>(null);
  let fixture: ComponentFixture<ProfileModal>;
  let modal: ProfileModalService;

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
    TestBed.configureTestingModule({
      imports: [ProfileModal],
      providers: [
        provideRouter([]),
        { provide: ProfileSessionService, useValue: { active } },
        { provide: EntryModalService, useValue: { isOpen: signal(false), open: vi.fn() } },
        { provide: CloudAuthService, useValue: { discardPending: vi.fn().mockResolvedValue(undefined) } },
        {
          provide: SyncStatusService,
          useValue: {
            busy: signal(false),
            act: vi.fn(),
            display: computed(() =>
              syncDisplay({ linked: !!active()?.cloud, state: 'idle', lastSyncedAt: null, now: Date.now() }),
            ),
          },
        },
      ],
    });
    modal = TestBed.inject(ProfileModalService);
    fixture = TestBed.createComponent(ProfileModal);
    await fixture.whenStable();
  });

  afterEach(() => {
    // Destroying closes the dialog, so it must happen while the stubs are still in place.
    fixture.destroy();
    HTMLDialogElement.prototype.showModal = originals.showModal;
    HTMLDialogElement.prototype.close = originals.close;
  });

  async function openFor(cloud: CloudLink | null) {
    active.set({
      id: 'p1',
      name: 'rafa',
      colors: ['U', 'R'],
      cloud,
      createdAt: '',
      nameUpdatedAt: '',
      colorsUpdatedAt: '',
    });
    modal.open();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const rowNames = (el: HTMLElement) =>
    [...el.querySelectorAll('app-action-row button')].map((b) => b.getAttribute('aria-label'));

  it('opens on the hub, titled with the profile name and labelled by it', async () => {
    const el = await openFor(null);
    const dialog = el.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    const title = el.querySelector('h2')!;
    expect(title.textContent?.trim()).toBe('rafa');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(el.querySelector('.prompt')?.textContent).toContain('Trocar de perfil');
  });

  it('shows the cloud row meta per link state', async () => {
    expect(rowNames(await openFor(null))).toEqual([
      'Perfil neste aparelho. Cores, nome e senha.',
      'Conta na nuvem. Vincular para sincronizar entre aparelhos.',
    ]);
    modal.close();
    expect(rowNames(await openFor(LINK))[1]).toBe('Conta na nuvem. rafa@exemplo.com.');
    modal.close();
    expect(rowNames(await openFor({ ...LINK, needsReauth: true }))[1]).toBe(
      'Conta na nuvem. Sessão expirada · rafa@exemplo.com.',
    );
  });

  it('opens a sub-screen from its row and returns with Voltar', async () => {
    const el = await openFor(LINK);
    el.querySelectorAll<HTMLButtonElement>('app-action-row button')[1].click();
    await fixture.whenStable();
    expect(el.querySelector('h2')?.textContent?.trim()).toBe('Conta na nuvem');

    [...el.querySelectorAll<HTMLButtonElement>('.btn--ghost')].find((b) => b.textContent?.trim() === 'Voltar')!.click();
    await fixture.whenStable();
    expect(el.querySelector('h2')?.textContent?.trim()).toBe('rafa');
  });

  it('opens straight at a requested step', async () => {
    active.set({ id: 'p1', name: 'rafa', colors: ['R'], cloud: null } as ProfileSummary);
    modal.open({ start: 'in' });
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('h2')?.textContent?.trim()).toBe('Entrar na conta');
  });
});
