import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProfileSummary } from '@models/profile.model';
import { EntryModalService } from './entry-modal.service';
import { ProfileModalService } from './profile-modal.service';
import { ProfileSessionService } from './profile-session.service';

const RAFA = { id: 'p1', name: 'rafa' } as ProfileSummary;

describe('ProfileModalService', () => {
  const active = signal<ProfileSummary | null>(RAFA);
  const entryOpen = signal(false);
  let modal: ProfileModalService;

  beforeEach(() => {
    active.set(RAFA);
    entryOpen.set(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: ProfileSessionService, useValue: { active } },
        { provide: EntryModalService, useValue: { isOpen: entryOpen } },
      ],
    });
    modal = TestBed.inject(ProfileModalService);
  });

  it('opens on the hub by default, with a new id each time', () => {
    modal.open();
    const first = modal.request()!;
    expect(first.start).toBe('hub');
    expect(modal.isOpen()).toBe(true);

    modal.close();
    modal.open({ start: 'reauth' });
    expect(modal.request()!.start).toBe('reauth');
    expect(modal.request()!.id).not.toBe(first.id);
  });

  it('closes', () => {
    modal.open();
    modal.close();
    expect(modal.isOpen()).toBe(false);
    expect(modal.request()).toBeNull();
  });

  it('does nothing with no active profile', () => {
    active.set(null);
    modal.open();
    expect(modal.isOpen()).toBe(false);
  });

  it('does nothing while the entry modal is open', () => {
    entryOpen.set(true);
    modal.open();
    expect(modal.isOpen()).toBe(false);
  });
});
