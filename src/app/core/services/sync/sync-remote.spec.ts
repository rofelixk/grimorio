import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { type PagedQuery, deleteRows, fetchAll, upsertRows } from './sync-remote';
import { Superseded, type SyncStepContext } from './sync-run';

interface Row {
  id: string;
}

const rowsOf = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: `r${String(i).padStart(5, '0')}` }));

/**
 * A select over `table` that honors `range` like PostgREST, capped at `cap` rows per response,
 * and records every range it was asked for.
 */
function fakeTable(table: Row[], options: { cap?: number; count?: boolean; error?: unknown } = {}) {
  const ranges: [number, number][] = [];
  const build = (): PagedQuery => {
    let from = 0;
    let to = Infinity;
    const query: PagedQuery = {
      order: () => query,
      range: (start, end) => ((from = start), (to = end), ranges.push([start, end]), query),
      abortSignal: () => query,
      then: (resolve, reject) => {
        const end = Math.min(to + 1, from + (options.cap ?? Infinity));
        const response = {
          data: options.error ? null : table.slice(from, end),
          error: options.error ?? null,
          count: options.count === false ? null : table.length,
        };
        return Promise.resolve(response).then(resolve, reject);
      },
    };
    return query;
  };
  return { build, ranges };
}

function context(ensureCurrent: () => void = () => undefined): SyncStepContext {
  return { client: {} as SupabaseClient, userId: 'u1', signal: new AbortController().signal, ensureCurrent };
}

describe('fetchAll', () => {
  it('reads 2,500 rows in three pages, in order (SC-005)', async () => {
    const table = rowsOf(2500);
    const { build, ranges } = fakeTable(table);

    expect(await fetchAll<Row>(build, context())).toEqual(table);
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it('reads exactly 2,000 rows in two pages', async () => {
    const { build, ranges } = fakeTable(rowsOf(2000));

    expect(await fetchAll<Row>(build, context())).toHaveLength(2000);
    expect(ranges).toHaveLength(2);
  });

  it('still reads every row when the server caps each response at 500', async () => {
    const table = rowsOf(2500);
    const { build, ranges } = fakeTable(table, { cap: 500 });

    expect(await fetchAll<Row>(build, context())).toEqual(table);
    expect(ranges).toHaveLength(5);
    expect(ranges[1]).toEqual([500, 1499]);
  });

  it('stops on the first empty page when no count comes back', async () => {
    const { build, ranges } = fakeTable(rowsOf(1500), { count: false });

    expect(await fetchAll<Row>(build, context())).toHaveLength(1500);
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [1500, 2499],
    ]);
  });

  it('makes a single request for an account under one page', async () => {
    const { build, ranges } = fakeTable(rowsOf(3));

    expect(await fetchAll<Row>(build, context())).toHaveLength(3);
    expect(ranges).toHaveLength(1);
  });

  it('stops with Superseded once the run is cancelled between pages (FR-018)', async () => {
    const { build, ranges } = fakeTable(rowsOf(2500));
    const ensureCurrent = vi.fn(() => {
      throw new Superseded();
    });

    await expect(fetchAll<Row>(build, context(ensureCurrent))).rejects.toBeInstanceOf(Superseded);
    expect(ranges).toHaveLength(1);
  });

  it('rejects with a page error', async () => {
    const failure = { code: 'PGRST000' };
    const { build } = fakeTable(rowsOf(10), { error: failure });

    await expect(fetchAll<Row>(build, context())).rejects.toBe(failure);
  });
});

describe('upsertRows / deleteRows', () => {
  /** A client recording each builder call as [method, ...args], answering `error`. */
  function recordingContext(error: unknown = null) {
    const calls: unknown[][] = [];
    const query: Record<string, unknown> = {};
    for (const method of ['upsert', 'delete', 'eq', 'in', 'abortSignal']) {
      query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query);
    }
    query['then'] = (resolve: (value: unknown) => unknown) => Promise.resolve({ error }).then(resolve);
    const client = { from: (table: string) => (calls.push(['from', table]), query) } as unknown as SupabaseClient;
    const signal = new AbortController().signal;
    const ctx: SyncStepContext = { client, userId: 'u1', signal, ensureCurrent: () => undefined };
    return { ctx, calls, signal };
  }

  it('sends nothing for an empty list', async () => {
    const { ctx, calls } = recordingContext();
    await upsertRows(ctx, 'decks', [], 'user_id,id');
    await deleteRows(ctx, 'decks', []);
    expect(calls).toEqual([]);
  });

  it('upserts every row in one request', async () => {
    const { ctx, calls, signal } = recordingContext();
    await upsertRows(ctx, 'decks', [{ id: 'd1' }, { id: 'd2' }], 'user_id,id');
    expect(calls).toEqual([
      ['from', 'decks'],
      ['upsert', [{ id: 'd1' }, { id: 'd2' }], { onConflict: 'user_id,id' }],
      ['abortSignal', signal],
    ]);
  });

  it("deletes only the account's rows with those ids", async () => {
    const { ctx, calls, signal } = recordingContext();
    await deleteRows(ctx, 'card_entries', ['c1']);
    expect(calls).toEqual([
      ['from', 'card_entries'],
      ['delete'],
      ['eq', 'user_id', 'u1'],
      ['in', 'id', ['c1']],
      ['abortSignal', signal],
    ]);
  });

  it('rejects with the response error', async () => {
    const failure = { code: '42501' };
    const { ctx } = recordingContext(failure);
    await expect(upsertRows(ctx, 'decks', [{ id: 'd1' }], 'user_id,id')).rejects.toBe(failure);
    await expect(deleteRows(ctx, 'decks', ['d1'])).rejects.toBe(failure);
  });
});
