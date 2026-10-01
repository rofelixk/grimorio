import type { SyncStepContext } from './sync-run';

/** Rows per cloud read; a server with a lower row cap only adds requests (research R7). */
export const PAGE_SIZE = 1000;

/** A PostgREST response, as the sync reads it. */
interface PageResponse {
  data: unknown[] | null;
  error: unknown;
  count?: number | null;
}

/** The part of a PostgREST select builder a paged read uses. */
export interface PagedQuery extends PromiseLike<PageResponse> {
  order(column: string): PagedQuery;
  range(from: number, to: number): PagedQuery;
  abortSignal(signal: AbortSignal): PagedQuery;
}

/**
 * Reads every row of a table (FR-016): pages in `id` order, so none is skipped or repeated, each
 * starting after the rows already read. Stops once the rows read reach the response's `count`, or
 * on an empty page. `build` must select with `{ count: 'exact' }` and filter by the account.
 * `ensureCurrent()` runs after every page, so a cancelled run stops before reconciling (FR-018).
 */
export async function fetchAll<Row>(build: () => PagedQuery, ctx: SyncStepContext): Promise<Row[]> {
  const rows: Row[] = [];
  for (;;) {
    const from = rows.length;
    const { data, error, count } = await build()
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
      .abortSignal(ctx.signal);
    if (error) {
      throw error;
    }
    ctx.ensureCurrent();
    const page = (data ?? []) as Row[];
    rows.push(...page);
    if (page.length === 0 || (count != null && rows.length >= count)) {
      return rows;
    }
  }
}

/** Upserts the account's rows in one request; nothing to send, no request. */
export async function upsertRows(ctx: SyncStepContext, table: string, rows: object[], onConflict: string): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  const { error } = await ctx.client.from(table).upsert(rows, { onConflict }).abortSignal(ctx.signal);
  if (error) {
    throw error;
  }
}

/** Deletes the account's rows with these ids in one request; nothing to delete, no request. */
export async function deleteRows(ctx: SyncStepContext, table: string, ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  const { error } = await ctx.client
    .from(table)
    .delete()
    .eq('user_id', ctx.userId)
    .in('id', ids)
    .abortSignal(ctx.signal);
  if (error) {
    throw error;
  }
}
