import { TestBed } from '@angular/core/testing';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CardEntry } from '@models/card.model';
import { mockCardEntryWithoutId } from '@testing/card.mocks';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CardService } from '../card.service';
import { CardsSyncStep } from './cards-sync.step';
import { type CardEntryRow, cardToRow } from './sync-rows';
import type { SyncStepContext } from './sync-run';

/** `card_entries` in memory: reads every row, upserts by id, deletes by id. */
class FakeRemote {
  readonly rows = new Map<string, CardEntryRow>();

  client(): SupabaseClient {
    const rows = this.rows;
    const from = () => {
      let deleting = false;
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        range: () => query,
        abortSignal: () => query,
        upsert: (sent: CardEntryRow[]) => {
          for (const row of sent) rows.set(row.id, structuredClone(row));
          return query;
        },
        delete: () => ((deleting = true), query),
        in: (_column: string, ids: string[]) => {
          if (deleting) for (const id of ids) rows.delete(id);
          return query;
        },
        then: (resolve: (value: unknown) => unknown) => {
          const data = [...rows.values()].map((row) => structuredClone(row));
          return Promise.resolve({ data, error: null, count: data.length }).then(resolve);
        },
      };
      return query;
    };
    return { from } as unknown as SupabaseClient;
  }
}

const tick = () => new Promise((r) => setTimeout(r, 2));

describe('CardsSyncStep (spec 015 cards)', () => {
  let remote: FakeRemote;
  let cards: CardService;
  let step: CardsSyncStep;
  let ctx: SyncStepContext;

  function add(over: Partial<CardEntry> = {}): CardEntry {
    const { addedAt: _a, updatedAt: _u, ...entry } = mockCardEntryWithoutId(over);
    void [_a, _u];
    return cards.add(entry);
  }

  beforeEach(async () => {
    remote = new FakeRemote();
    TestBed.configureTestingModule({});
    cards = TestBed.inject(CardService);
    step = TestBed.inject(CardsSyncStep);
    await cards.load('p1');
    ctx = { client: remote.client(), userId: 'u1', signal: new AbortController().signal, ensureCurrent: () => undefined };
  });

  afterEach(async () => {
    await cards.flush();
    TestBed.resetTestingModule();
  });

  it('uploads a card added through CardService.add with its artist and added_at', async () => {
    const card = add({ artist: 'Christopher Rush', locationId: 'c1' });
    await step.run(ctx);
    expect(remote.rows.get(card.id)).toMatchObject({ artist: 'Christopher Rush', added_at: card.addedAt });
  });

  it('restores artist (null → absent) and addedAt from a pulled row', async () => {
    const pulled = (id: string, artist: string | null): CardEntryRow => ({
      ...cardToRow({ ...mockCardEntryWithoutId({ addedAt: '2026-02-03T04:05:06.000Z' }), id }, 'u1'),
      artist,
    });
    remote.rows.set('r1', pulled('r1', 'Mark Poole'));
    remote.rows.set('r2', pulled('r2', null));
    await step.run(ctx);

    const byId = new Map(cards.cards().map((c) => [c.id, c]));
    expect(byId.get('r1')).toMatchObject({ artist: 'Mark Poole', addedAt: '2026-02-03T04:05:06.000Z' });
    expect(byId.get('r2')?.addedAt).toBe('2026-02-03T04:05:06.000Z');
    expect(byId.get('r2')?.artist).toBeUndefined();
  });

  it('deletes the row an edit merge removed, through its tombstone', async () => {
    const target = add({ locationId: 'c1', quantity: 3 });
    const edited = add({ locationId: 'c1', quantity: 2, condition: 'LP' });
    await step.run(ctx);
    expect([...remote.rows.keys()].sort()).toEqual([target.id, edited.id].sort());

    // The merge's tombstone must be newer than the uploaded row (last write wins).
    await tick();
    cards.mergeInto(target.id, edited.quantity, edited.id);
    await cards.flush();
    await step.run(ctx);

    expect([...remote.rows.keys()]).toEqual([target.id]);
    expect(remote.rows.get(target.id)?.quantity).toBe(5);
    expect(await cards.getTombstones()).toEqual([]);
  });

  it('an edit made on two copies resolves to the later updatedAt, addedAt unchanged', async () => {
    const card = add({ locationId: 'c1', condition: 'NM' });
    await step.run(ctx);

    // This copy edits first; the other copy edits later and syncs first.
    cards.update(card.id, { condition: 'LP' });
    await tick();
    const later = new Date().toISOString();
    remote.rows.set(card.id, { ...remote.rows.get(card.id)!, condition: 'HP', updated_at: later });
    await step.run(ctx);

    const local = cards.cards().find((c) => c.id === card.id)!;
    expect(local.condition).toBe('HP');
    expect(local.updatedAt).toBe(later);
    expect(local.addedAt).toBe(card.addedAt);
    expect(remote.rows.get(card.id)?.added_at).toBe(card.addedAt);
  });
});
