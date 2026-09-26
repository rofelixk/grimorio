import { describe, expect, it } from 'vitest';
import type { SyncState } from '../services/sync.service';
import { SYNC_AREA } from './entry-copy';
import { SyncDisplayKind, relativeSince, syncDisplay } from './sync-status.util';

const NOW = Date.parse('2026-09-25T12:00:00.000Z');
const MIN = 60_000;
const ago = (ms: number) => new Date(NOW - ms).toISOString();

function show(state: SyncState, linked = true, lastSyncedAt: string | null = ago(MIN)) {
  return syncDisplay({ linked, state, lastSyncedAt, now: NOW });
}

describe('syncDisplay', () => {
  it('shows syncing first, with no action', () => {
    const d = show('syncing');
    expect(d).toMatchObject({ kind: 'syncing', label: SYNC_AREA.syncing, action: null, actionLabel: null });
  });

  it('maps each failure state to its label and action', () => {
    expect(show('offline')).toMatchObject({ kind: 'offline', label: SYNC_AREA.offline, action: 'retry' });
    expect(show('reauth')).toMatchObject({ kind: 'expired', label: SYNC_AREA.expired, action: 'reauth' });
    expect(show('error')).toMatchObject({ kind: 'error', label: SYNC_AREA.error, action: 'retry' });
  });

  it('shows a failure even while unlinked', () => {
    expect(show('error', false).kind).toBe('error');
  });

  it('shows "Sem conta na nuvem" for an unlinked profile', () => {
    for (const state of ['idle', 'done'] as const) {
      expect(show(state, false)).toMatchObject({ kind: 'local', label: SYNC_AREA.local, action: 'link' });
    }
  });

  it('shows "Nunca sincronizado" when a linked profile never synced', () => {
    expect(show('idle', true, null)).toMatchObject({ kind: 'never', label: SYNC_AREA.never, action: 'sync' });
  });

  it('shows "Sincronizado" for 5 minutes, then the relative time', () => {
    expect(show('done', true, ago(4 * MIN + 59_000))).toMatchObject({ kind: 'synced', label: SYNC_AREA.synced });
    expect(show('done', true, ago(5 * MIN))).toMatchObject({ kind: 'last', label: 'Sincronizado há 5 min' });
    expect(show('idle', true, ago(42 * MIN)).action).toBe('sync');
  });

  it('labels each action', () => {
    expect(show('idle').actionLabel).toBe(SYNC_AREA.actSync);
    expect(show('offline').actionLabel).toBe(SYNC_AREA.actRetry);
    expect(show('reauth').actionLabel).toBe(SYNC_AREA.actReauth);
    expect(show('idle', false).actionLabel).toBe(SYNC_AREA.actLink);
  });

  it('flags failures and the actions that open the modal', () => {
    const cases: [SyncDisplayKind, ReturnType<typeof show>][] = [
      ['syncing', show('syncing')],
      ['synced', show('done')],
      ['last', show('done', true, ago(60 * MIN))],
      ['never', show('idle', true, null)],
      ['local', show('idle', false)],
      ['offline', show('offline')],
      ['expired', show('reauth')],
      ['error', show('error')],
    ];
    const failures = new Set<SyncDisplayKind>(['offline', 'expired', 'error']);
    const modal = new Set<SyncDisplayKind>(['local', 'expired']);
    for (const [kind, d] of cases) {
      expect(d.kind).toBe(kind);
      expect(d.failure).toBe(failures.has(kind));
      expect(d.opensModal).toBe(modal.has(kind));
    }
  });
});

describe('relativeSince', () => {
  it.each([
    [30_000, 'há 1 min'],
    [59 * MIN, 'há 59 min'],
    [60 * MIN, 'há 1 h'],
    [23 * 60 * MIN, 'há 23 h'],
    [24 * 60 * MIN, 'há 1 d'],
  ])('%i ms ago → %s', (ms, expected) => {
    expect(relativeSince(ago(ms), NOW)).toBe(expected);
  });
});
