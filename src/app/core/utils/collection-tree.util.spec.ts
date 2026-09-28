import { describe, expect, it } from 'vitest';
import type { CardEntry } from '@models/card.model';
import type { Collection } from '@models/collection.model';
import {
  buildChildrenOf,
  compareByName,
  computeStats,
  defaultColor,
  depthOf,
  normalizeName,
  repairCollectionTree,
  subtreeIds,
  suffixedName,
  validateCollectionName,
} from './collection-tree.util';

function makeCollection(overrides: Partial<Collection> & { id: string }): Collection {
  return {
    name: 'Coleção',
    color: 'branco',
    parentId: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeCard(overrides: Partial<CardEntry> & { id: string }): Pick<
  CardEntry,
  'locationId' | 'quantity' | 'forSale'
> {
  return {
    locationId: 'holding',
    quantity: 1,
    forSale: false,
    ...overrides,
  };
}

describe('normalizeName', () => {
  it('trims and lowercases with pt-BR collation', () => {
    expect(normalizeName('  FICHÁRIO  ')).toBe('fichário');
  });
});

describe('compareByName', () => {
  it('sorts case/accent-insensitively', () => {
    const a = makeCollection({ id: 'a', name: 'árvore' });
    const b = makeCollection({ id: 'b', name: 'Banco' });
    const c = makeCollection({ id: 'c', name: 'Cinza' });
    const sorted = [c, a, b].sort(compareByName);
    expect(sorted.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('breaks ties on id when names collide under base sensitivity', () => {
    const a = makeCollection({ id: 'b', name: 'Raras' });
    const b = makeCollection({ id: 'a', name: 'RARAS' });
    const sorted = [a, b].sort(compareByName);
    expect(sorted.map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('validateCollectionName', () => {
  const siblings = [makeCollection({ id: 's1', name: 'Fichário' })];

  it('rejects an empty (or whitespace-only) name', () => {
    expect(validateCollectionName('', siblings)).toBe('empty');
    expect(validateCollectionName('   ', siblings)).toBe('empty');
  });

  it('rejects a name over 40 characters', () => {
    expect(validateCollectionName('a'.repeat(41), siblings)).toBe('too-long');
    expect(validateCollectionName('a'.repeat(40), siblings)).toBeNull();
  });

  it('rejects a name already used by a sibling, trim/case/accent-insensitive', () => {
    expect(validateCollectionName(' FICHÁRIO ', siblings)).toBe('taken');
  });

  it('excludes selfId from the taken check (rename to its own name)', () => {
    expect(validateCollectionName('Fichário', siblings, 's1')).toBeNull();
  });

  it('allows a name that differs only by an accent from a sibling', () => {
    expect(validateCollectionName('Rarás', [makeCollection({ id: 's2', name: 'Raras' })])).toBeNull();
  });
});

describe('defaultColor', () => {
  it('picks the first unused palette color', () => {
    const siblings = [
      makeCollection({ id: '1', color: 'branco' }),
      makeCollection({ id: '2', color: 'azul' }),
    ];
    expect(defaultColor(siblings)).toBe('violeta');
  });

  it('falls back to branco when every color is used', () => {
    const siblings = [
      'branco',
      'azul',
      'violeta',
      'vermelho',
      'verde',
      'carvao',
      'nevoa',
      'anil',
      'vinho',
      'ocre',
      'salvia',
      'cinza',
      'turquesa',
      'rosa',
      'laranja',
      'dourado',
    ].map((color, i) => makeCollection({ id: `${i}`, color: color as Collection['color'] }));
    expect(defaultColor(siblings)).toBe('branco');
  });
});

describe('subtreeIds', () => {
  it('collects id plus all descendants across 3 levels', () => {
    const collections = [
      makeCollection({ id: 'root' }),
      makeCollection({ id: 'child1', parentId: 'root' }),
      makeCollection({ id: 'child2', parentId: 'root' }),
      makeCollection({ id: 'grandchild', parentId: 'child1' }),
    ];
    const childrenOf = buildChildrenOf(collections);
    expect(subtreeIds('root', childrenOf).sort()).toEqual(
      ['root', 'child1', 'child2', 'grandchild'].sort(),
    );
    expect(subtreeIds('child2', childrenOf)).toEqual(['child2']);
  });
});

describe('depthOf', () => {
  it('returns 1 for a root, incrementing per ancestor, 0 when unknown', () => {
    const collections = [
      makeCollection({ id: 'root' }),
      makeCollection({ id: 'child', parentId: 'root' }),
      makeCollection({ id: 'grandchild', parentId: 'child' }),
    ];
    const byId = new Map(collections.map((c) => [c.id, c]));
    expect(depthOf('root', byId)).toBe(1);
    expect(depthOf('child', byId)).toBe(2);
    expect(depthOf('grandchild', byId)).toBe(3);
    expect(depthOf('missing', byId)).toBe(0);
  });
});

describe('computeStats', () => {
  it('counts a quantity-3 entry fully, for-sale only', () => {
    const collections = [makeCollection({ id: 'c1' })];
    const cards = [makeCard({ id: 'e1', locationId: 'c1', quantity: 3, forSale: true })];
    const stats = computeStats(collections, cards);
    expect(stats.byId.get('c1')).toEqual({ cards: 3, sale: 3, subs: 0, directEntries: 1 });
  });

  it('rolls totals up to both ancestors and counts subs at every level', () => {
    const collections = [
      makeCollection({ id: 'root' }),
      makeCollection({ id: 'child', parentId: 'root' }),
      makeCollection({ id: 'grandchild', parentId: 'child' }),
    ];
    const cards = [makeCard({ id: 'e1', locationId: 'grandchild', quantity: 5, forSale: false })];
    const stats = computeStats(collections, cards);
    expect(stats.byId.get('grandchild')).toEqual({
      cards: 5,
      sale: 0,
      subs: 0,
      directEntries: 1,
    });
    expect(stats.byId.get('child')).toEqual({ cards: 5, sale: 0, subs: 1, directEntries: 0 });
    expect(stats.byId.get('root')).toEqual({ cards: 5, sale: 0, subs: 2, directEntries: 0 });
  });

  it('sends unknown locationIds to holding', () => {
    const collections = [makeCollection({ id: 'c1' })];
    const cards = [
      makeCard({ id: 'e1', locationId: 'caixa', quantity: 2, forSale: true }),
      makeCard({ id: 'e2', locationId: 'caixa', quantity: 1, forSale: false }),
    ];
    const stats = computeStats(collections, cards);
    expect(stats.holding).toEqual({ cards: 3, sale: 2 });
    expect(stats.byId.get('c1')).toEqual({ cards: 0, sale: 0, subs: 0, directEntries: 0 });
  });

  it('reports 0 cards for a collection with only empty children, but counts its subs', () => {
    const collections = [
      makeCollection({ id: 'root' }),
      makeCollection({ id: 'child', parentId: 'root' }),
    ];
    const stats = computeStats(collections, []);
    expect(stats.byId.get('root')).toEqual({ cards: 0, sale: 0, subs: 1, directEntries: 0 });
  });

  it('finishes 50,000 entries over 100 collections well under 1s', () => {
    const collections: Collection[] = [];
    for (let i = 0; i < 10; i++) {
      collections.push(makeCollection({ id: `root-${i}` }));
      for (let j = 0; j < 9; j++) {
        collections.push(makeCollection({ id: `root-${i}-child-${j}`, parentId: `root-${i}` }));
      }
    }
    expect(collections.length).toBe(100);

    const cards: Pick<CardEntry, 'locationId' | 'quantity' | 'forSale'>[] = [];
    for (let i = 0; i < 50_000; i++) {
      const target = collections[i % collections.length];
      cards.push(
        makeCard({
          id: `e${i}`,
          locationId: target.id,
          quantity: 1,
          forSale: i % 3 === 0,
        }),
      );
    }

    const start = performance.now();
    const stats = computeStats(collections, cards);
    const elapsed = performance.now() - start;

    expect(stats.byId.size).toBe(100);
    expect(elapsed).toBeLessThan(1000);
  });
});

describe('suffixedName', () => {
  it('appends the suffix to a trimmed base', () => {
    expect(suffixedName('  Fichário  ', 2)).toBe('Fichário (2)');
  });

  it('cuts a 40-character base so the total stays within 40 characters', () => {
    const base = 'a'.repeat(40);
    const result = suffixedName(base, 12);
    expect(result.length).toBeLessThanOrEqual(40);
    expect(result.endsWith(' (12)')).toBe(true);
  });
});

describe('repairCollectionTree', () => {
  const NOW = '2026-02-01T00:00:00.000Z';

  it('removes a 2-level chain of orphans and leaves everything else unchanged', () => {
    const collections = [
      makeCollection({ id: 'root' }),
      makeCollection({ id: 'child', parentId: 'missing' }),
      makeCollection({ id: 'grandchild', parentId: 'child' }),
    ];
    const result = repairCollectionTree(collections, new Set(), NOW);
    expect(result.collections.map((c) => c.id)).toEqual(['root']);
    expect(result.removedIds.sort()).toEqual(['child', 'grandchild']);
    expect(result.renamed).toEqual([]);
  });

  it('a clean tree is returned unchanged', () => {
    const collections = [
      makeCollection({ id: 'a', name: 'Alfa' }),
      makeCollection({ id: 'b', name: 'Beta' }),
    ];
    const result = repairCollectionTree(collections, new Set(['a', 'b']), NOW);
    expect(result.collections).toEqual(collections);
    expect(result.removedIds).toEqual([]);
    expect(result.renamed).toEqual([]);
  });

  it('keeps the sibling already on the remote as the survivor, renaming the other', () => {
    const collections = [
      makeCollection({ id: 'local-only', name: 'Raras' }),
      makeCollection({ id: 'on-remote', name: 'Raras' }),
    ];
    const result = repairCollectionTree(collections, new Set(['on-remote']), NOW);
    const byId = new Map(result.collections.map((c) => [c.id, c]));
    expect(byId.get('on-remote')!.name).toBe('Raras');
    expect(byId.get('local-only')!.name).toBe('Raras (2)');
    expect(result.renamed).toEqual([byId.get('local-only')]);
  });

  it('breaks a tie (no remote member, or several) on the lowest id', () => {
    const collections = [
      makeCollection({ id: 'z', name: 'Raras' }),
      makeCollection({ id: 'a', name: 'Raras' }),
    ];
    const result = repairCollectionTree(collections, new Set(), NOW);
    const byId = new Map(result.collections.map((c) => [c.id, c]));
    expect(byId.get('a')!.name).toBe('Raras');
    expect(byId.get('z')!.name).toBe('Raras (2)');
  });

  it('skips an existing "Nome (2)" sibling and renames to "(3)"', () => {
    const collections = [
      makeCollection({ id: 'a', name: 'Nome' }),
      makeCollection({ id: 'b', name: 'Nome' }),
      makeCollection({ id: 'c', name: 'Nome (2)' }),
    ];
    const result = repairCollectionTree(collections, new Set(), NOW);
    const byId = new Map(result.collections.map((c) => [c.id, c]));
    expect(byId.get('a')!.name).toBe('Nome');
    expect(byId.get('b')!.name).toBe('Nome (3)');
    expect(byId.get('c')!.name).toBe('Nome (2)');
  });

  it('treats case and space variants as duplicates', () => {
    const collections = [
      makeCollection({ id: 'a', name: 'Fichário' }),
      makeCollection({ id: 'b', name: ' FICHÁRIO ' }),
    ];
    const result = repairCollectionTree(collections, new Set(), NOW);
    const byId = new Map(result.collections.map((c) => [c.id, c]));
    expect(byId.get('b')!.name).toBe('FICHÁRIO (2)');
    expect(byId.get('b')!.updatedAt).toBe(NOW);
  });

  it('cuts a 40-character base when renaming', () => {
    const base = 'a'.repeat(40);
    const collections = [
      makeCollection({ id: 'a', name: base }),
      makeCollection({ id: 'b', name: base }),
    ];
    const result = repairCollectionTree(collections, new Set(), NOW);
    const byId = new Map(result.collections.map((c) => [c.id, c]));
    expect(byId.get('b')!.name.length).toBeLessThanOrEqual(40);
    expect(byId.get('b')!.name.endsWith(' (2)')).toBe(true);
  });
});
