import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileSummary } from '@models/profile.model';
import { EntryModalService } from '@services/entry-modal.service';
import { ProfileSessionService } from '@services/profile-session.service';
import { ShellState } from '@services/shell-state.service';
import { SyncStatusService } from '@services/sync-status.service';
import { SyncDisplay, syncDisplay } from '@utils/sync-status.util';
import { NavDrawer } from './nav-drawer';

const PROFILE: ProfileSummary = { id: 'p1', name: 'rafa', colors: ['U', 'R'], cloud: null, createdAt: '' };

describe('NavDrawer', () => {
  const originals = {
    showModal: HTMLDialogElement.prototype.showModal,
    close: HTMLDialogElement.prototype.close,
  };
  const display = signal<SyncDisplay | null>(null);
  let fixture: ComponentFixture<NavDrawer>;
  let shell: ShellState;
  let menu: HTMLButtonElement;
  let entryModal: { open: ReturnType<typeof vi.fn> };
  let status: { display: typeof display; busy: ReturnType<typeof signal<boolean>>; act: ReturnType<typeof vi.fn> };

  const dialog = () => fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;

  async function openDrawer(): Promise<void> {
    shell.openDrawer(false);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
    menu = document.createElement('button');
    menu.setAttribute('aria-controls', 'grm-drawer');
    document.body.append(menu);

    display.set(syncDisplay({ linked: true, state: 'idle', lastSyncedAt: null, now: Date.now() }));
    entryModal = { open: vi.fn().mockResolvedValue({ activeProfileId: 'p1' }) };
    status = { display, busy: signal(false), act: vi.fn() };

    TestBed.configureTestingModule({
      imports: [NavDrawer],
      providers: [
        provideRouter([]),
        { provide: EntryModalService, useValue: entryModal },
        { provide: SyncStatusService, useValue: status },
        { provide: ProfileSessionService, useValue: { active: signal(PROFILE) } },
      ],
    });
    shell = TestBed.inject(ShellState);
    fixture = TestBed.createComponent(NavDrawer);
    await fixture.whenStable();
  });

  afterEach(() => {
    HTMLDialogElement.prototype.showModal = originals.showModal;
    HTMLDialogElement.prototype.close = originals.close;
    menu.remove();
  });

  it('opens the dialog when the drawer opens', async () => {
    await openDrawer();
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    expect(dialog().open).toBe(true);
  });

  it('closes on cancel (Esc/Back) and returns focus to Menu', async () => {
    await openDrawer();
    dialog().dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(shell.drawerOpen()).toBe(false);
    expect(dialog().open).toBe(false);
    expect(document.activeElement).toBe(menu);
  });

  it('closes the drawer before opening the profile modal, with focus on Menu', async () => {
    await openDrawer();
    const closeDrawer = vi.spyOn(shell, 'closeDrawer');
    let focusedAtOpen: Element | null = null;
    entryModal.open.mockImplementation(() => {
      focusedAtOpen = document.activeElement;
      return Promise.resolve({ activeProfileId: 'p1' });
    });

    (fixture.nativeElement.querySelector('app-profile-control button') as HTMLButtonElement).click();

    expect(entryModal.open).toHaveBeenCalledWith({ context: 'gate', start: 'list' });
    expect(closeDrawer.mock.invocationCallOrder[0]).toBeLessThan(entryModal.open.mock.invocationCallOrder[0]);
    expect(dialog().open).toBe(false);
    expect(focusedAtOpen).toBe(menu);
  });

  it('keeps the drawer open for "Sincronizar agora"', async () => {
    await openDrawer();
    (fixture.nativeElement.querySelector('.action') as HTMLButtonElement).click();
    expect(status.act).toHaveBeenCalled();
    expect(shell.drawerOpen()).toBe(true);
    expect(entryModal.open).not.toHaveBeenCalled();
  });

  it('closes first, then opens the cloud sign-in for "Vincular conta na nuvem"', async () => {
    display.set(syncDisplay({ linked: false, state: 'idle', lastSyncedAt: null, now: Date.now() }));
    await openDrawer();
    const closeDrawer = vi.spyOn(shell, 'closeDrawer');

    (fixture.nativeElement.querySelector('.action') as HTMLButtonElement).click();

    expect(entryModal.open).toHaveBeenCalledWith({ context: 'link', start: 'in' });
    expect(closeDrawer.mock.invocationCallOrder[0]).toBeLessThan(entryModal.open.mock.invocationCallOrder[0]);
    expect(shell.drawerOpen()).toBe(false);
    expect(status.act).not.toHaveBeenCalled();
  });
});
