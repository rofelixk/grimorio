import { describe, expect, it } from 'vitest';
import { type CollectionPlace, COLLECTION_PAGES } from './collection-pages.util';

const list: CollectionPlace = { kind: 'list' };
const holding: CollectionPlace = { kind: 'holding' };
const root: CollectionPlace = { kind: 'collection', id: 'root', depth: 1 };
const sibling: CollectionPlace = { kind: 'collection', id: 'other', depth: 1 };
const child: CollectionPlace = { kind: 'collection', id: 'child', depth: 2 };
const grand: CollectionPlace = { kind: 'collection', id: 'grand', depth: 3 };

const sweep = (from: CollectionPlace, to: CollectionPlace) => COLLECTION_PAGES.sweep(from, to, null);

describe('COLLECTION_PAGES', () => {
  it('starts on the list', () => {
    expect(COLLECTION_PAGES.initial).toEqual(list);
  });

  it('opens from the list into a top-level collection or the holding box', () => {
    expect(sweep(list, root)).toBe('open');
    expect(sweep(list, holding)).toBe('open');
  });

  it('opens going from a collection into its child', () => {
    expect(sweep(root, child)).toBe('open');
  });

  it('opens between siblings at the same depth', () => {
    expect(sweep(root, sibling)).toBe('open');
  });

  it('closes going up', () => {
    expect(sweep(child, root)).toBe('close');
    expect(sweep(grand, root)).toBe('close');
    expect(sweep(holding, list)).toBe('close');
  });

  it('decides by the depth carried on the place', () => {
    const removed: CollectionPlace = { kind: 'collection', id: 'gone', depth: 2 };
    expect(sweep(removed, root)).toBe('close');
  });

  it('treats the same collection as the same page whatever its depth', () => {
    expect(COLLECTION_PAGES.same(root, { kind: 'collection', id: 'root', depth: 2 })).toBe(true);
    expect(COLLECTION_PAGES.same(root, sibling)).toBe(false);
    expect(COLLECTION_PAGES.same(holding, { kind: 'holding' })).toBe(true);
    expect(COLLECTION_PAGES.same(list, holding)).toBe(false);
  });
});
