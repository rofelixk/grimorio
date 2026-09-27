import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EntryModalService } from './entry-modal.service';
import { ProfileModalService } from './profile-modal.service';
import { ProfileSessionService } from './profile-session.service';
import { ProfileStore } from './profile-store.service';

describe('EntryModalService', () => {
  const profileOpen = signal(false);
  let modal: EntryModalService;

  beforeEach(() => {
    profileOpen.set(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: ProfileSessionService, useValue: { active: signal(null) } },
        { provide: ProfileStore, useValue: { profiles: signal([{ id: 'p1' }]) } },
        { provide: ProfileModalService, useValue: { isOpen: profileOpen } },
      ],
    });
    modal = TestBed.inject(EntryModalService);
  });

  it('opens on the list of a device with profiles', () => {
    void modal.open();
    expect(modal.isOpen()).toBe(true);
    expect(modal.request()).toMatchObject({ context: 'gate', start: 'list' });
  });

  it('does nothing while the profile modal is open', async () => {
    profileOpen.set(true);
    const result = await modal.open({ start: 'list' });
    expect(modal.isOpen()).toBe(false);
    expect(result).toEqual({ activeProfileId: null });
  });
});
