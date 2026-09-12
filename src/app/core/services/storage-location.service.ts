import { Injectable, computed, signal } from '@angular/core';
import { StorageLocation, StorageLocationNode } from '../models/storage-location.model';

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
  private readonly storageKey = 'grimorio.locations';
  private readonly locationsSignal = signal<StorageLocation[]>(this.load());
  readonly locations = this.locationsSignal.asReadonly();
  readonly tree = computed(() => buildTree(this.locations()));

  private load(): StorageLocation[] {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : [];
  }

  private persist(locations: StorageLocation[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(locations));
  }

  add(location: Omit<StorageLocation, 'id'>): StorageLocation {
    const entry: StorageLocation = { ...location, id: crypto.randomUUID() };
    this.locationsSignal.update((locations) => {
      const next = [...locations, entry];
      this.persist(next);
      return next;
    });
    return entry;
  }

  update(id: string, patch: Partial<StorageLocation>): void {
    this.locationsSignal.update((locations) => {
      const next = locations.map((location) => (location.id === id ? { ...location, ...patch } : location));
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
}
