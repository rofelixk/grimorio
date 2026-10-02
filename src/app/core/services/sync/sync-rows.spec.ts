import { describe, expect, it } from 'vitest';
import { mockCardEntry } from '@testing/card.mocks';
import { cardFromRow, cardToRow } from './sync-rows';

describe('card rows', () => {
  it('round-trips artist and addedAt', () => {
    const card = mockCardEntry({ artist: 'Christopher Rush', addedAt: '2026-03-04T05:06:07.000Z' });
    const row = cardToRow(card, 'u1');
    expect(row).toMatchObject({ artist: 'Christopher Rush', added_at: '2026-03-04T05:06:07.000Z' });
    expect(cardFromRow(row)).toEqual(card);
  });

  it('maps a missing artist to null and back to absent', () => {
    const card = mockCardEntry();
    const row = cardToRow(card, 'u1');
    expect(row.artist).toBeNull();
    expect(cardFromRow(row).artist).toBeUndefined();
  });

  it('normalizes the remote added_at to an ISO string', () => {
    const row = { ...cardToRow(mockCardEntry(), 'u1'), added_at: '2026-03-04T05:06:07+00:00' };
    expect(cardFromRow(row).addedAt).toBe('2026-03-04T05:06:07.000Z');
  });
});
