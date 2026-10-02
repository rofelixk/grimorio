import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardViewModeService } from './card-view-mode.service';
import { ProfileSessionService } from './profile-session.service';
import { PBKDF2_ITERATIONS, ProfileStore } from './profile-store.service';

describe('CardViewModeService', () => {
  let service: CardViewModeService;
  let session: ProfileSessionService;
  let store: ProfileStore;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PBKDF2_ITERATIONS, useValue: 5 }],
    });
    store = TestBed.inject(ProfileStore);
    session = TestBed.inject(ProfileSessionService);
    service = TestBed.inject(CardViewModeService);
    await session.whenReady();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const profile = (name: string) => store.create({ name, password: 'grimorio123', colors: ['R'] });

  it('defaults to details, also with no profile', () => {
    expect(service.mode()).toBe('details');
  });

  it('keeps the choice per profile and resyncs when the profile changes', async () => {
    const a = await profile('a');
    const b = await profile('b');
    await session.activate(a.id);
    service.set('images');
    expect(localStorage.getItem(`grm-card-view:${a.id}`)).toBe('images');

    await session.activate(b.id);
    expect(service.mode()).toBe('details');

    await session.activate(a.id);
    expect(service.mode()).toBe('images');
  });

  it('forgets a profile’s key', async () => {
    const a = await profile('a');
    await session.activate(a.id);
    service.set('images');
    service.forget(a.id);
    expect(localStorage.getItem(`grm-card-view:${a.id}`)).toBeNull();
  });

  it('ignores a stored value that is not a mode', async () => {
    const a = await profile('a');
    localStorage.setItem(`grm-card-view:${a.id}`, 'nope');
    await session.activate(a.id);
    expect(service.mode()).toBe('details');
  });

  it('survives storage throwing', async () => {
    const a = await profile('a');
    await session.activate(a.id);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => service.set('images')).not.toThrow();
    expect(service.mode()).toBe('images');
    expect(() => service.forget(a.id)).not.toThrow();
  });
});
