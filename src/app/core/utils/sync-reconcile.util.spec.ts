import { describe, expect, it } from 'vitest';
import { Tombstone } from '@models/tombstone.model';
import { reconcileEntities } from './sync-reconcile.util';

interface TestEntity {
  id: string;
  updatedAt: string;
  value: string;
}

function entity(id: string, updatedAt: string, value = 'v'): TestEntity {
  return { id, updatedAt, value };
}

function tombstone(id: string, deletedAt: string): Tombstone {
  return { id, deletedAt };
}

describe('reconcileEntities', () => {
  it('pushes a local-only row as an insert', () => {
    const result = reconcileEntities([entity('a', '2026-01-01T00:00:00.000Z')], [], []);

    expect(result.merged).toEqual([entity('a', '2026-01-01T00:00:00.000Z')]);
    expect(result.toUpsertRemote).toEqual([entity('a', '2026-01-01T00:00:00.000Z')]);
    expect(result.toDeleteRemoteIds).toEqual([]);
    expect(result.tombstonesToClear).toEqual([]);
  });

  it('pulls a remote-only row with no tombstone', () => {
    const result = reconcileEntities([], [entity('a', '2026-01-01T00:00:00.000Z')], []);

    expect(result.merged).toEqual([entity('a', '2026-01-01T00:00:00.000Z')]);
    expect(result.toUpsertRemote).toEqual([]);
  });

  it('lets the newer local edit win and pushes it', () => {
    const local = entity('a', '2026-01-02T00:00:00.000Z', 'newer');
    const remote = entity('a', '2026-01-01T00:00:00.000Z', 'older');

    const result = reconcileEntities([local], [remote], []);

    expect(result.merged).toEqual([local]);
    expect(result.toUpsertRemote).toEqual([local]);
  });

  it('lets the newer remote edit win over a stale local row without pushing', () => {
    const local = entity('a', '2026-01-01T00:00:00.000Z', 'older');
    const remote = entity('a', '2026-01-02T00:00:00.000Z', 'newer');

    const result = reconcileEntities([local], [remote], []);

    expect(result.merged).toEqual([remote]);
    expect(result.toUpsertRemote).toEqual([]);
  });

  it('treats equal timestamps as remote-authoritative to avoid a pointless push', () => {
    const local = entity('a', '2026-01-01T00:00:00.000Z', 'local');
    const remote = entity('a', '2026-01-01T00:00:00.000Z', 'remote');

    const result = reconcileEntities([local], [remote], []);

    expect(result.merged).toEqual([remote]);
    expect(result.toUpsertRemote).toEqual([]);
  });

  it('deletes remotely when the local delete is newer than the remote row', () => {
    const remote = entity('a', '2026-01-01T00:00:00.000Z');
    const result = reconcileEntities([], [remote], [tombstone('a', '2026-01-02T00:00:00.000Z')]);

    expect(result.merged).toEqual([]);
    expect(result.toDeleteRemoteIds).toEqual(['a']);
    expect(result.tombstonesToClear).toEqual(['a']);
  });

  it('resurrects a row locally when a remote edit is newer than the local delete', () => {
    const remote = entity('a', '2026-01-02T00:00:00.000Z');
    const result = reconcileEntities([], [remote], [tombstone('a', '2026-01-01T00:00:00.000Z')]);

    expect(result.merged).toEqual([remote]);
    expect(result.toDeleteRemoteIds).toEqual([]);
    expect(result.tombstonesToClear).toEqual(['a']);
  });

  it('clears a tombstone once neither side has the row anymore', () => {
    const result = reconcileEntities([], [], [tombstone('a', '2026-01-01T00:00:00.000Z')]);

    expect(result.merged).toEqual([]);
    expect(result.toDeleteRemoteIds).toEqual([]);
    expect(result.tombstonesToClear).toEqual(['a']);
  });

  it('clears a stale tombstone when the row exists locally again', () => {
    const local = entity('a', '2026-01-02T00:00:00.000Z');
    const result = reconcileEntities([local], [], [tombstone('a', '2026-01-01T00:00:00.000Z')]);

    expect(result.merged).toEqual([local]);
    expect(result.toUpsertRemote).toEqual([local]);
    expect(result.tombstonesToClear).toEqual(['a']);
  });
});
