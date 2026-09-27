import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileSummary } from '@models/profile.model';
import { EntryModalService } from '@services/entry-modal.service';
import { ProfileModalService } from '@services/profile-modal.service';
import { ProfileSessionService } from '@services/profile-session.service';
import { ShellState } from '@services/shell-state.service';
import { SyncStatusService } from '@services/sync-status.service';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  const active = signal<ProfileSummary | null>(null);
  let entryModal: { open: ReturnType<typeof vi.fn> };
  let profileModal: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    entryModal = { open: vi.fn().mockResolvedValue({ activeProfileId: null }) };
    profileModal = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [TopBar],
      providers: [
        provideRouter([]),
        { provide: ShellState, useValue: { wide: signal(true), drawerOpen: signal(false) } },
        { provide: ProfileSessionService, useValue: { active } },
        { provide: EntryModalService, useValue: entryModal },
        { provide: ProfileModalService, useValue: profileModal },
        { provide: SyncStatusService, useValue: { display: signal(null), busy: signal(false), act: vi.fn() } },
      ],
    });
  });

  async function clickProfile() {
    const fixture = TestBed.createComponent(TopBar);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('app-profile-control button')!.click();
  }

  it('opens the profile modal’s hub for the active profile', async () => {
    active.set({ id: 'p1', name: 'rafa', colors: ['R'], cloud: null } as ProfileSummary);
    await clickProfile();
    expect(profileModal.open).toHaveBeenCalledWith();
    expect(entryModal.open).not.toHaveBeenCalled();
  });

  it('opens the entry modal with no active profile', async () => {
    active.set(null);
    await clickProfile();
    expect(entryModal.open).toHaveBeenCalledWith();
    expect(profileModal.open).not.toHaveBeenCalled();
  });
});
