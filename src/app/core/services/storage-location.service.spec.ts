import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { StorageLocationService } from './storage-location.service';

describe('StorageLocationService', () => {
  let service: StorageLocationService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageLocationService);
  });

  it('starts empty when nothing is persisted', () => {
    expect(service.locations()).toEqual([]);
    expect(service.tree()).toEqual([]);
  });

  it('adds a location and persists it to localStorage', () => {
    const added = service.add({ name: 'Box 1', parentId: null });

    expect(service.locations()).toEqual([added]);
    expect(JSON.parse(localStorage.getItem('grimorio.locations')!)).toEqual([added]);
  });

  it('builds a nested tree from flat parentId references', () => {
    const box = service.add({ name: 'Box 1', parentId: null });
    const binder = service.add({ name: 'Binder A', parentId: box.id });
    const page = service.add({ name: 'Page 12', parentId: binder.id });

    const tree = service.tree();

    expect(tree).toEqual([
      { ...box, children: [{ ...binder, children: [{ ...page, children: [] }] }] },
    ]);
  });

  it('treats a dangling parentId as a root location', () => {
    const orphan = service.add({ name: 'Orphan', parentId: 'does-not-exist' });

    expect(service.tree()).toEqual([{ ...orphan, children: [] }]);
  });

  it('updates and removes a location', () => {
    const added = service.add({ name: 'Box 1', parentId: null });

    service.update(added.id, { name: 'Box 1 (renamed)' });
    expect(service.locations()[0].name).toBe('Box 1 (renamed)');

    service.remove(added.id);
    expect(service.locations()).toEqual([]);
  });

  it('finds a location by id', () => {
    const added = service.add({ name: 'Box 1', parentId: null });

    expect(service.byId(added.id)()).toEqual(added);
    expect(service.byId('missing')()).toBeUndefined();
  });
});
