import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PBKDF2_ITERATIONS, ProfileStore } from './profile-store.service';
import { StoragePersistenceService } from './storage-persistence.service';

describe('StoragePersistenceService', () => {
  let service: StoragePersistenceService;
  let store: ProfileStore;
  let persisted: ReturnType<typeof vi.fn>;
  let persist: ReturnType<typeof vi.fn>;
  const original = Object.getOwnPropertyDescriptor(navigator, 'storage');

  function stubStorage(storage: unknown): void {
    Object.defineProperty(navigator, 'storage', { value: storage, configurable: true });
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: PBKDF2_ITERATIONS, useValue: 1 }] });
    service = TestBed.inject(StoragePersistenceService);
    store = TestBed.inject(ProfileStore);
    await store.whenReady();
    persisted = vi.fn(async () => false);
    persist = vi.fn(async () => true);
    stubStorage({ persisted, persist });
  });

  afterEach(() => {
    if (original) {
      Object.defineProperty(navigator, 'storage', original);
    } else {
      delete (navigator as { storage?: unknown }).storage;
    }
  });

  const addProfile = () => store.create({ name: 'Ana', password: 'x', colors: ['R'] });

  it('does nothing without the Storage API', async () => {
    stubStorage(undefined);
    await expect(service.request('created')).resolves.toBeUndefined();
  });

  it('does not ask again once storage is persistent', async () => {
    persisted.mockResolvedValue(true);
    await service.request('created');
    expect(persist).not.toHaveBeenCalled();
  });

  it('does not ask at startup on a device with no profile', async () => {
    await service.request('startup');
    expect(persisted).toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it('asks once at startup on a device with a profile', async () => {
    await addProfile();
    persist.mockClear();
    await service.request('startup');
    expect(persist).toHaveBeenCalledOnce();
  });

  it('asks once when a profile is created', async () => {
    await service.request('created');
    expect(persist).toHaveBeenCalledOnce();
  });

  it('swallows a failure (FR-007)', async () => {
    persisted.mockRejectedValue(new Error('denied'));
    await expect(service.request('created')).resolves.toBeUndefined();
    persisted.mockResolvedValue(false);
    persist.mockRejectedValue(new Error('denied'));
    await expect(service.request('created')).resolves.toBeUndefined();
  });
});
