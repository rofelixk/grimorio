import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockCardEntryWithoutId } from '@testing/card.mocks';
import { delivered, nextRefresh, otherCopy } from '@testing/cross-tab';
import { failNextPut } from '@testing/idb-failure';
import { DATA } from '@utils/entry-copy';
import { CardEntry } from '@models/card.model';
import { Collection } from '@models/collection.model';
import { getAllFromStore } from '../db/entity-store';
import { openProfileDb } from '../db/profile-db';
import { CardService } from './card.service';
import { CollectionService } from './collection.service';
import { DeckService } from './deck.service';
import { ToastService } from './toast.service';

function mockCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'col-1',
    name: 'Raras',
    color: '#d8cdb0',
    parentId: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

async function seed(profileId: string, collections: Collection[]): Promise<void> {
  const db = await openProfileDb(profileId);
  const tx = db.transaction('collections', 'readwrite');
  await Promise.all([...collections.map((c) => tx.store.put(c)), tx.done]);
}

describe('CollectionService', () => {
  let service: CollectionService;
  let cards: CardService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CollectionService);
    cards = TestBed.inject(CardService);
    await cards.load('p1');
    await service.load('p1');
  });

  afterEach(async () => {
    await service.flush();
    await cards.flush();
  });

  it('starts empty when nothing is persisted', () => {
    expect(service.collections()).toEqual([]);
  });

  it('toasts a failed save and still lands the next one (SC-001)', async () => {
    const show = vi.spyOn(TestBed.inject(ToastService), 'show');
    const restore = failNextPut();
    service.create({ parentId: null, name: 'Raras', color: '#d8cdb0' });
    await service.flush();
    expect(show).toHaveBeenCalledExactlyOnceWith(DATA.saveFailed.label, DATA.saveFailed.text);

    service.create({ parentId: null, name: 'Comuns', color: '#d8cdb0' });
    await service.flush();
    restore();
    expect(show).toHaveBeenCalledOnce();
    expect((await getAllFromStore<Collection>('collections')).map((c) => c.name)).toEqual(['Comuns']);
  });

  describe('with another open copy', () => {
    let other: ReturnType<typeof otherCopy>;

    beforeEach(async () => {
      await service.flush();
      await cards.flush();
      TestBed.resetTestingModule();
      other = otherCopy();
      TestBed.configureTestingModule({ providers: [other.provider] });
      service = TestBed.inject(CollectionService);
      cards = TestBed.inject(CardService);
      await cards.load('p1');
      await service.load('p1');
    });

    const landed = async () => {
      await service.flush();
      await delivered();
    };

    function createRoot(name: string): Collection {
      const result = service.create({ parentId: null, name, color: '#d8cdb0' });
      if (!result.ok) throw new Error(result.error);
      return result.collection;
    }

    it('announces a rename as collections only', async () => {
      const root = createRoot('Raras');
      await landed();
      other.received.length = 0;

      service.update(root.id, { name: 'Míticas' });
      await landed();
      expect(other.received).toEqual([{ kind: 'collections', profileId: 'p1' }]);
    });

    it('announces cards too when a create moves the parent’s cards', async () => {
      const root = createRoot('Raras');
      cards.add(mockCardEntryWithoutId({ locationId: root.id }));
      await cards.flush();
      await landed();
      other.received.length = 0;

      service.create({ parentId: root.id, name: 'Vermelhas', color: '#d8cdb0' });
      await landed();
      expect(other.received).toEqual(
        expect.arrayContaining([
          { kind: 'collections', profileId: 'p1' },
          { kind: 'cards', profileId: 'p1' },
        ]),
      );
      expect(other.received).toHaveLength(2);
    });

    it('announces a delete with its cards once it commits', async () => {
      const root = createRoot('Raras');
      cards.add(mockCardEntryWithoutId({ locationId: root.id }));
      await cards.flush();
      await landed();
      other.received.length = 0;

      await service.remove(root.id, 'delete');
      await delivered();
      expect(other.received).toHaveLength(2);
      expect(other.received).toEqual(
        expect.arrayContaining([
          { kind: 'collections', profileId: 'p1' },
          { kind: 'cards', profileId: 'p1' },
        ]),
      );
    });

    it('announces an applied sync result (FR-014)', async () => {
      service.applySyncResult([mockCollection()]);
      await landed();
      expect(other.received).toEqual([{ kind: 'collections', profileId: 'p1' }]);
    });

    it('refreshes in place when another copy saves, counting no change', async () => {
      const mine = createRoot('Raras');
      await landed();
      const count = service.changeCount();
      const theirs = mockCollection({ id: 'theirs', name: 'Comuns' });
      await seed('p1', [theirs]);

      const refreshed = nextRefresh(service);
      const arrived = other.announce('collections', 'p1');
      expect(service.collections()).toEqual([mine]);
      await arrived;
      await refreshed;
      expect(service.collections()).toHaveLength(2);
      expect(service.changeCount()).toBe(count);
    });

    it('ignores a save for another profile (FR-013)', async () => {
      await seed('p1', [mockCollection()]);
      await other.announce('collections', 'p2');
      await service.flush();
      expect(service.collections()).toEqual([]);
    });

    it('loses a refresh to a newer load()', async () => {
      await seed('p1', [mockCollection()]);
      await Promise.all([service.refresh(), service.load('p2')]);
      expect(service.collections()).toEqual([]);
    });
  });

  it('rejects a failed remove() to its caller with no toast (FR-005)', async () => {
    const show = vi.spyOn(TestBed.inject(ToastService), 'show');
    const result = service.create({ parentId: null, name: 'Raras', color: '#d8cdb0' });
    if (!result.ok) throw new Error(result.error);
    await service.flush();
    const restore = failNextPut();
    await expect(service.remove(result.collection.id, 'move')).rejects.toThrow('The disk is full.');
    restore();
    expect(show).not.toHaveBeenCalled();
  });

  it('hydrates from seeded rows', async () => {
    const root = mockCollection();
    await seed('p1', [root]);

    await service.load('p1');

    expect(service.collections()).toEqual([root]);
  });

  it('isolates load between two profiles', async () => {
    const root = mockCollection();
    await seed('p1', [root]);
    await service.load('p1');
    expect(service.collections()).toEqual([root]);

    await service.load('p2');
    expect(service.collections()).toEqual([]);

    await service.load('p1');
    expect(service.collections()).toEqual([root]);
  });

  describe('derived signals', () => {
    it('computes depth and path root -> id', async () => {
      const root = mockCollection({ id: 'root', name: 'Raras' });
      const child = mockCollection({ id: 'child', name: 'Comuns', parentId: 'root' });
      const grandchild = mockCollection({ id: 'grand', name: 'Lote', parentId: 'child' });
      await seed('p1', [root, child, grandchild]);
      await service.load('p1');

      expect(service.depth('grand')).toBe(3);
      expect(service.path('grand').map((c) => c.id)).toEqual(['root', 'child', 'grand']);
      expect(service.depth('missing')).toBe(0);
      expect(service.path('missing')).toEqual([]);
    });

    it('reports kind as subcollections, cards or empty', async () => {
      const root = mockCollection({ id: 'root', name: 'Raras' });
      const child = mockCollection({ id: 'child', name: 'Comuns', parentId: 'root' });
      const lone = mockCollection({ id: 'lone', name: 'Vazia' });
      await seed('p1', [root, child, lone]);
      await service.load('p1');

      expect(service.kind('root')).toBe('subcollections');
      expect(service.kind('lone')).toBe('empty');

      cards.add(mockCardEntryWithoutId({ locationId: 'lone' }));
      expect(service.kind('lone')).toBe('cards');
    });

    it('recomputes stats when CardService changes', async () => {
      const root = mockCollection({ id: 'root', name: 'Raras' });
      await seed('p1', [root]);
      await service.load('p1');

      expect(service.stats().byId.get('root')?.cards).toBe(0);

      cards.add(mockCardEntryWithoutId({ locationId: 'root', quantity: 3 }));

      expect(service.stats().byId.get('root')?.cards).toBe(3);
    });

    it('keeps a card placed in a deck out of the holding box', async () => {
      const db = await openProfileDb('p1');
      await db.put('decks', { id: 'deck-1', name: 'Elfos', format: 'pauper', updatedAt: '2026-01-01T00:00:00.000Z' });
      await TestBed.inject(DeckService).load('p1');

      cards.add(mockCardEntryWithoutId({ locationId: 'deck-1', quantity: 2 }));

      expect(service.stats().holding.cards).toBe(0);
    });
  });

  describe('create (top level)', () => {
    it('stamps id and updatedAt, trims the name and persists across a reload', async () => {
      const result = service.create({ parentId: null, name: '  Fichário vermelho ', color: '#a8402c' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.collection).toMatchObject({ name: 'Fichário vermelho', color: '#a8402c', parentId: null });
      expect(result.collection.id).toBeTruthy();
      expect(result.collection.updatedAt).toBeTruthy();
      expect(result.moved).toBe(0);
      expect(service.changeCount()).toBe(1);

      await service.flush();
      await service.load('p1');
      expect(service.collections()).toEqual([result.collection]);
    });

    it('rejects empty, too-long and duplicate names without writing', async () => {
      await seed('p1', [mockCollection({ id: 'a', name: 'Fichário' })]);
      await service.load('p1');

      expect(service.create({ parentId: null, name: '   ', color: '#3d6b85' })).toEqual({ ok: false, error: 'empty' });
      expect(service.create({ parentId: null, name: 'x'.repeat(41), color: '#3d6b85' })).toEqual({
        ok: false,
        error: 'too-long',
      });
      expect(service.create({ parentId: null, name: ' FICHÁRIO ', color: '#3d6b85' })).toEqual({
        ok: false,
        error: 'taken',
      });
      expect(service.collections()).toHaveLength(1);
      expect(service.changeCount()).toBe(0);
    });
  });

  describe('create (subcollections)', () => {
    function created(result: ReturnType<CollectionService['create']>): Collection {
      if (!result.ok) throw new Error(result.error);
      return result.collection;
    }

    it('creates levels 2 and 3 and rejects level 4 or a missing parent', () => {
      const l1 = created(service.create({ parentId: null, name: 'Fichário', color: '#3d6b85' }));
      const l2 = created(service.create({ parentId: l1.id, name: 'Azuis', color: '#3d6b85' }));
      const l3 = created(service.create({ parentId: l2.id, name: 'Lote', color: '#3d6b85' }));
      expect(service.depth(l3.id)).toBe(3);
      expect(service.create({ parentId: l3.id, name: 'Fundo', color: '#3d6b85' })).toEqual({
        ok: false,
        error: 'too-deep',
      });
      expect(service.create({ parentId: 'missing', name: 'X', color: '#3d6b85' })).toEqual({
        ok: false,
        error: 'no-parent',
      });
      expect(service.create({ parentId: l1.id, name: ' azuis', color: '#3d6b85' })).toEqual({ ok: false, error: 'taken' });
    });

    it('moves every direct card of a "cards" parent into the new subcollection, other fields unchanged', async () => {
      const parent = created(service.create({ parentId: null, name: 'Caixa', color: '#3d6b85' }));
      const a = cards.add(mockCardEntryWithoutId({ locationId: parent.id, quantity: 3, forSale: true, notes: 'x' }));
      const b = cards.add(mockCardEntryWithoutId({ locationId: parent.id, quantity: 2 }));
      await cards.flush();
      expect(service.kind(parent.id)).toBe('cards');

      const result = service.create({ parentId: parent.id, name: 'Primeira', color: '#4c7a43' });
      expect(result.ok && result.moved).toBe(5);
      const child = created(result);
      expect(service.kind(parent.id)).toBe('subcollections');
      expect(service.stats().byId.get(parent.id)?.cards).toBe(5);
      expect(service.stats().byId.get(child.id)?.directEntries).toBe(2);

      await service.flush();
      const stored = await getAllFromStore<CardEntry>('cards');
      for (const original of [a, b]) {
        const moved = stored.find((card) => card.id === original.id)!;
        expect(moved).toEqual({ ...original, locationId: child.id, updatedAt: child.updatedAt });
      }
      expect((await getAllFromStore<Collection>('collections')).map((c) => c.id)).toContain(child.id);
    });

    it('writes neither the collection nor the moved cards when the transaction fails', async () => {
      const parent = created(service.create({ parentId: null, name: 'Caixa', color: '#3d6b85' }));
      cards.add(mockCardEntryWithoutId({ locationId: parent.id }));
      await cards.flush();
      await service.flush();
      // A card without a key makes its put throw, aborting the whole transaction.
      const [good] = cards.cards();
      cards.applySyncResult([good, { ...good, id: undefined as unknown as string }]);
      await cards.flush();

      const result = service.create({ parentId: parent.id, name: 'Primeira', color: '#4c7a43' });
      expect(result.ok).toBe(true);
      await service.flush();

      const storedCollections = await getAllFromStore<Collection>('collections');
      expect(storedCollections.map((c) => c.id)).toEqual([parent.id]);
      const storedCards = await getAllFromStore<CardEntry>('cards');
      expect(storedCards.every((card) => card.locationId === parent.id)).toBe(true);
    });

    it('moves 5,000 cards in under 3 s', async () => {
      const parent = created(service.create({ parentId: null, name: 'Caixa', color: '#3d6b85' }));
      cards.addMany(Array.from({ length: 5000 }, () => mockCardEntryWithoutId({ locationId: parent.id })));
      await cards.flush();
      await service.flush();

      const start = performance.now();
      const result = service.create({ parentId: parent.id, name: 'Primeira', color: '#4c7a43' });
      await service.flush();
      expect(performance.now() - start).toBeLessThan(3000);
      expect(result.ok && result.moved).toBe(5000);
    });
  });

  describe('remove', () => {
    async function seedTree() {
      const root = mockCollection({ id: 'root', name: 'Fichário' });
      const child = mockCollection({ id: 'child', name: 'Azuis', parentId: 'root' });
      const sibling = mockCollection({ id: 'sib', name: 'Verdes', parentId: 'root' });
      const grand = mockCollection({ id: 'grand', name: 'Lote', parentId: 'child' });
      await seed('p1', [root, child, sibling, grand]);
      await service.load('p1');
      const inGrand = cards.add(mockCardEntryWithoutId({ locationId: 'grand', quantity: 3 }));
      const inSib = cards.add(mockCardEntryWithoutId({ locationId: 'sib', quantity: 2 }));
      await cards.flush();
      return { inGrand, inSib };
    }

    it('"move" deletes the subtree and its tombstones only; the cards land in the holding box', async () => {
      const { inGrand } = await seedTree();
      const result = await service.remove('child', 'move');
      expect(result).toEqual({ collections: 2, cards: 3 });

      expect(service.collections().map((c) => c.id).sort()).toEqual(['root', 'sib']);
      expect(service.stats().holding).toEqual({ cards: 3, sale: 0 });
      expect(service.changeCount()).toBe(1);

      const storedCollections = await getAllFromStore<Collection>('collections');
      expect(storedCollections.map((c) => c.id).sort()).toEqual(['root', 'sib']);
      expect((await service.getTombstones()).map((t) => t.id).sort()).toEqual(['child', 'grand']);
      const storedCards = await getAllFromStore<CardEntry>('cards');
      expect(storedCards.find((c) => c.id === inGrand.id)).toEqual(inGrand);
      expect(await cards.getTombstones()).toEqual([]);
    });

    it('"delete" removes the subtree’s cards with tombstones, leaving the parent and siblings', async () => {
      const { inGrand, inSib } = await seedTree();
      const result = await service.remove('child', 'delete');
      expect(result).toEqual({ collections: 2, cards: 3 });

      expect(cards.cards().map((c) => c.id)).toEqual([inSib.id]);
      const storedCards = await getAllFromStore<CardEntry>('cards');
      expect(storedCards.map((c) => c.id)).toEqual([inSib.id]);
      expect((await cards.getTombstones()).map((t) => t.id)).toEqual([inGrand.id]);
      expect(service.kind('root')).toBe('subcollections');
    });

    it('leaves the parent "empty" once its last subcollection is deleted', async () => {
      await seed('p1', [mockCollection({ id: 'root' }), mockCollection({ id: 'only', name: 'Só', parentId: 'root' })]);
      await service.load('p1');
      await service.remove('only', 'move');
      expect(service.kind('root')).toBe('empty');
    });

    it('rejects and leaves IndexedDB unchanged when the transaction fails', async () => {
      const { inGrand } = await seedTree();
      // A card without a key makes its delete throw, aborting the whole transaction.
      cards.applySyncResult([...cards.cards(), { ...inGrand, id: undefined as unknown as string }]);
      await cards.flush();

      await expect(service.remove('child', 'delete')).rejects.toBeDefined();
      const storedCollections = await getAllFromStore<Collection>('collections');
      expect(storedCollections).toHaveLength(4);
      expect(await service.getTombstones()).toEqual([]);
    });

    it('deletes 5,000 cards in under 3 s', async () => {
      await seed('p1', [mockCollection({ id: 'root' })]);
      await service.load('p1');
      cards.addMany(Array.from({ length: 5000 }, () => mockCardEntryWithoutId({ locationId: 'root' })));
      await cards.flush();

      const start = performance.now();
      const result = await service.remove('root', 'delete');
      expect(performance.now() - start).toBeLessThan(3000);
      expect(result.cards).toBe(5000);
      expect(cards.cards()).toEqual([]);
    });
  });

  describe('update', () => {
    it('renames one collection row and writes no card', async () => {
      const root = mockCollection({ id: 'root', name: 'Raras', color: '#3d6b85' });
      await seed('p1', [root, mockCollection({ id: 'other', name: 'Outra' })]);
      await service.load('p1');
      const card = cards.add(mockCardEntryWithoutId({ locationId: 'root' }));
      await cards.flush();

      expect(service.update('root', { name: 'Raras e míticas' })).toEqual({ ok: true });
      await service.flush();

      const persisted = await getAllFromStore<Collection>('collections');
      const renamed = persisted.find((c) => c.id === 'root')!;
      expect(renamed).toMatchObject({ name: 'Raras e míticas', color: '#3d6b85' });
      expect(renamed.updatedAt).not.toBe(root.updatedAt);
      expect(persisted.find((c) => c.id === 'other')?.updatedAt).toBe(root.updatedAt);
      const [storedCard] = await getAllFromStore<CardEntry>('cards');
      expect(storedCard).toEqual(card);
    });

    it('recolors and keeps the name', async () => {
      await seed('p1', [mockCollection({ id: 'root', name: 'Raras', color: '#3d6b85' })]);
      await service.load('p1');

      expect(service.update('root', { name: 'Raras', color: '#b8732e' })).toEqual({ ok: true });
      expect(service.byId().get('root')).toMatchObject({ name: 'Raras', color: '#b8732e' });
    });

    it('validates a changed name against the siblings, excluding itself', async () => {
      await seed('p1', [mockCollection({ id: 'a', name: 'Raras' }), mockCollection({ id: 'b', name: 'Comuns' })]);
      await service.load('p1');

      expect(service.update('a', { name: 'RARAS ' })).toEqual({ ok: true });
      expect(service.update('a', { name: 'comuns' })).toEqual({ ok: false, error: 'taken' });
      expect(service.update('missing', { name: 'X' })).toEqual({ ok: false, error: 'not-found' });
    });
  });

  describe('resolveMixedCollections', () => {
    it('moves direct cards of a collection with children to its first child, stamped after the sync', async () => {
      await seed('p1', [
        mockCollection({ id: 'root', name: 'Fichário' }),
        mockCollection({ id: 'z', name: 'Zeta', parentId: 'root' }),
        mockCollection({ id: 'a', name: 'Álbum', parentId: 'root' }),
      ]);
      await service.load('p1');
      const stray = cards.add(mockCardEntryWithoutId({ locationId: 'root', quantity: 2 }));
      await cards.flush();

      const syncedAt = new Date(Date.now() + 60_000).toISOString();
      service.resolveMixedCollections(syncedAt);

      const moved = cards.cards().find((c) => c.id === stray.id)!;
      expect(moved.locationId).toBe('a');
      expect(moved.updatedAt > syncedAt).toBe(true);
      expect(service.kind('root')).toBe('subcollections');
      expect(service.changeCount()).toBe(0);

      await service.flush();
      const [stored] = await getAllFromStore<CardEntry>('cards');
      expect(stored).toEqual(moved);
    });

    it('leaves a clean tree alone', async () => {
      await seed('p1', [mockCollection({ id: 'root' })]);
      await service.load('p1');
      const card = cards.add(mockCardEntryWithoutId({ locationId: 'root' }));
      service.resolveMixedCollections(new Date().toISOString());
      expect(cards.cards()).toEqual([card]);
    });
  });

  describe('applySyncResult', () => {
    it('writes only the diff: changed and new rows put, removed rows deleted', async () => {
      const unchanged = mockCollection({ id: 'a', name: 'A', updatedAt: 't1' });
      const toChange = mockCollection({ id: 'b', name: 'B', updatedAt: 't1' });
      const toRemove = mockCollection({ id: 'c', name: 'C', updatedAt: 't1' });
      await seed('p1', [unchanged, toChange, toRemove]);
      await service.load('p1');

      const changed = { ...toChange, name: 'B renomeado', updatedAt: 't2' };
      const added = mockCollection({ id: 'd', name: 'D', updatedAt: 't3' });
      const merged = [unchanged, changed, added];

      service.applySyncResult(merged);
      expect(service.collections()).toEqual(merged);

      await service.flush();
      const persisted = await getAllFromStore<Collection>('collections');
      expect(persisted.map((c) => c.id).sort()).toEqual(['a', 'b', 'd']);
      expect(persisted.find((c) => c.id === 'b')?.name).toBe('B renomeado');
    });
  });
});
