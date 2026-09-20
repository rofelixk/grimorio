import { Injectable, computed, signal } from '@angular/core';
import { StorageLocation, StorageLocationNode } from '@models/storage-location.model';
import { Tombstone } from '@models/tombstone.model';
import { clearTombstones, getAllFromStore, getTombstonesFor, putTombstone, replaceStore } from '../db/entity-store';

function buildTree(locations: StorageLocation[]): StorageLocationNode[] {
  const nodesById = new Map<string, StorageLocationNode>(
    locations.map((location) => [location.id, { ...location, children: [] }]),
  );
  const roots: StorageLocationNode[] = [];

  for (const location of locations) {
    const node = nodesById.get(location.id)!;
    if (location.parentId && nodesById.has(location.parentId)) {
      nodesById.get(location.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

@Injectable({ providedIn: 'root' })
export class StorageLocationService {
  private readonly locationsSignal = signal<StorageLocation[]>([]);
  readonly locations = this.locationsSignal.asReadonly();
  readonly tree = computed(() => buildTree(this.locations()));

  private readonly readyPromise: Promise<void>;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor() {
    this.readyPromise = this.hydrate();
  }

  private async hydrate(): Promise<void> {
    const locations = await getAllFromStore<StorageLocation>('locations');
    this.locationsSignal.set(locations);
  }

  // Resolves once this service's initial IndexedDB read has landed in the signal.
  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  // Resolves once every write enqueued so far has landed in IndexedDB.
  flush(): Promise<void> {
    return this.writeQueue.then(() => undefined);
  }

  private enqueueWrite(fn: () => Promise<unknown>): void {
    this.writeQueue = this.writeQueue
      .then(fn)
      .catch((e) => console.error('Grimorio: failed to persist locations.', e));
  }

  private persist(locations: StorageLocation[]): void {
    this.enqueueWrite(() => replaceStore('locations', locations));
  }

  add(location: Omit<StorageLocation, 'id' | 'updatedAt'>): StorageLocation {
    const entry: StorageLocation = {
      ...location,
      id: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    };
    this.locationsSignal.update((locations) => {
      const next = [...locations, entry];
      this.persist(next);
      return next;
    });
    return entry;
  }

  update(id: string, patch: Partial<StorageLocation>): void {
    this.locationsSignal.update((locations) => {
      const next = locations.map((location) =>
        location.id === id ? { ...location, ...patch, updatedAt: new Date().toISOString() } : location,
      );
      this.persist(next);
      return next;
    });
  }

  remove(id: string): void {
    this.locationsSignal.update((locations) => {
      const next = locations.filter((location) => location.id !== id);
      this.persist(next);
      return next;
    });
    this.addTombstone(id);
  }

  byId(id: string) {
    return computed(() => this.locations().find((location) => location.id === id));
  }

  breadcrumb(id: string) {
    return computed(() => {
      const byId = new Map(this.locations().map((location) => [location.id, location]));
      const path: StorageLocation[] = [];
      let current = byId.get(id);
      while (current) {
        path.unshift(current);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      return path;
    });
  }

  childrenOf(parentId: string | null) {
    return computed(() => this.locations().filter((location) => location.parentId === parentId));
  }

  descendantIds(id: string) {
    return computed(() => {
      const childrenByParent = new Map<string | null, StorageLocation[]>();
      for (const location of this.locations()) {
        const siblings = childrenByParent.get(location.parentId) ?? [];
        siblings.push(location);
        childrenByParent.set(location.parentId, siblings);
      }

      const ids: string[] = [];
      const stack = [...(childrenByParent.get(id) ?? [])];
      while (stack.length > 0) {
        const location = stack.pop()!;
        ids.push(location.id);
        stack.push(...(childrenByParent.get(location.id) ?? []));
      }
      return ids;
    });
  }

  // Sync-only: tombstones let SyncService tell a locally-deleted id apart
  // from one that simply never existed on this device, so a pull doesn't
  // resurrect something this device deliberately removed.
  getTombstones(): Promise<Tombstone[]> {
    return getTombstonesFor('locations');
  }

  clearTombstones(ids: string[]): Promise<void> {
    return clearTombstones('locations', ids);
  }

  // Sync-only: applies an already-reconciled result verbatim — no id
  // generation, no updatedAt restamping, no tombstone side effects — since
  // SyncService has already decided what the merged local state should be.
  applySyncResult(merged: StorageLocation[]): void {
    this.locationsSignal.set(merged);
    this.persist(merged);
  }

  private addTombstone(id: string): void {
    this.enqueueWrite(() => putTombstone('locations', { id, deletedAt: new Date().toISOString() }));
  }
}
