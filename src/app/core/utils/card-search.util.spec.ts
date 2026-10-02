import { describe, expect, it } from 'vitest';
import type { CatalogCard } from '../models/catalog.model';
import {
  INITIAL_SEARCH,
  canLoadMore,
  escapeLike,
  moreRequested,
  pageFailed,
  pageLoaded,
  retried,
  searchKey,
  typed,
} from './card-search.util';

const card = (n: number): CatalogCard => ({
  oracleId: `o${n}`,
  name: `Card ${n}`,
  typeLine: 'Artifact',
  colorIdentity: [],
  imageUrl: null,
});

const loading = () => typed(INITIAL_SEARCH, 'sol ring');
const ok = (hasMore = true) => pageLoaded(loading(), 1, [card(1), card(2)], hasMore);

describe('searchKey', () => {
  it('strips accents, lowercases and collapses spaces', () => {
    expect(searchKey('Jötun')).toBe('jotun');
    expect(searchKey('  Sol   RING ')).toBe('sol ring');
  });
});

describe('escapeLike', () => {
  it('escapes backslash, percent and underscore', () => {
    expect(escapeLike('100%_a\\b')).toBe('100\\%\\_a\\\\b');
  });
});

describe('typed', () => {
  it('goes idle with an empty key and clears results', () => {
    expect(typed(ok(), '   ')).toMatchObject({ status: 'idle', results: [], key: '' });
  });

  it('goes short for 1–2 characters without a new generation', () => {
    const s = typed(ok(), 'so');
    expect(s).toMatchObject({ status: 'short', results: [], generation: 1 });
  });

  it('goes loading with a new generation from 3 characters', () => {
    expect(loading()).toMatchObject({ status: 'loading', key: 'sol ring', generation: 1 });
    expect(typed(loading(), 'sol rin').generation).toBe(2);
  });
});

describe('pageLoaded', () => {
  it('goes ok with cards and empty without', () => {
    expect(ok()).toMatchObject({ status: 'ok', hasMore: true });
    expect(pageLoaded(loading(), 1, [], false).status).toBe('empty');
  });

  it('drops answers for an older generation', () => {
    const stale = typed(loading(), 'sol rin');
    expect(pageLoaded(stale, 1, [card(1)], false)).toBe(stale);
    expect(pageFailed(stale, 1, 'failed')).toBe(stale);
  });

  it('appends the next page and updates hasMore', () => {
    const more = moreRequested(ok());
    const s = pageLoaded(more, 1, [card(3)], false);
    expect(s.results.map((c) => c.oracleId)).toEqual(['o1', 'o2', 'o3']);
    expect(s).toMatchObject({ hasMore: false, loadingMore: false });
  });
});

describe('pageFailed', () => {
  it('shows offline or failed for the first page', () => {
    expect(pageFailed(loading(), 1, 'offline').status).toBe('offline');
    expect(pageFailed(loading(), 1, 'failed').status).toBe('failed');
  });

  it('keeps the results and sets moreFailed for a next page', () => {
    const s = pageFailed(moreRequested(ok()), 1, 'failed');
    expect(s).toMatchObject({ status: 'ok', moreFailed: true, loadingMore: false });
    expect(s.results).toHaveLength(2);
  });
});

describe('canLoadMore / moreRequested', () => {
  it('is true only with a next page and nothing in flight or failed', () => {
    expect(canLoadMore(ok())).toBe(true);
    expect(canLoadMore(ok(false))).toBe(false);
    expect(canLoadMore(loading())).toBe(false);
    expect(canLoadMore(moreRequested(ok()))).toBe(false);
    expect(canLoadMore(pageFailed(moreRequested(ok()), 1, 'failed'))).toBe(false);
  });

  it('retries a failed next page', () => {
    const failed = pageFailed(moreRequested(ok()), 1, 'failed');
    expect(moreRequested(failed)).toMatchObject({ loadingMore: true, moreFailed: false });
  });
});

describe('retried', () => {
  it('re-sends the first page as a new generation', () => {
    const failed = pageFailed(loading(), 1, 'offline');
    expect(retried(failed)).toMatchObject({ status: 'loading', generation: 2 });
    expect(retried(ok())).toEqual(ok());
  });
});
