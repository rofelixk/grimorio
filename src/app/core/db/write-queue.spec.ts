import { describe, expect, it, vi } from 'vitest';
import { WriteQueue } from './write-queue';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe('WriteQueue', () => {
  it('runs tasks in order, one at a time', async () => {
    const queue = new WriteQueue();
    const log: string[] = [];
    const gate = deferred();
    queue.enqueue(async () => {
      log.push('a:start');
      await gate.promise;
      log.push('a:end');
    });
    queue.enqueue(async () => {
      log.push('b');
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(log).toEqual(['a:start']);
    gate.resolve();
    await queue.flush();
    expect(log).toEqual(['a:start', 'a:end', 'b']);
  });

  it('reports a failed enqueue task once and keeps running later tasks', async () => {
    const onError = vi.fn();
    const queue = new WriteQueue({ onError });
    const failure = new Error('boom');
    const next = vi.fn(() => Promise.resolve());
    queue.enqueue(() => Promise.reject(failure));
    queue.enqueue(next);
    await queue.flush();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(failure);
    expect(next).toHaveBeenCalledOnce();
  });

  it('flush resolves after a failure', async () => {
    const queue = new WriteQueue();
    queue.enqueue(() => Promise.reject(new Error('boom')));
    await expect(queue.flush()).resolves.toBeUndefined();
  });

  it('run rejects to its caller without onError, and later tasks still run', async () => {
    const onError = vi.fn();
    const queue = new WriteQueue({ onError });
    const failure = new Error('boom');
    const failed = queue.run(() => Promise.reject(failure));
    const next = queue.run(() => Promise.resolve(42));
    await expect(failed).rejects.toBe(failure);
    await expect(next).resolves.toBe(42);
    await queue.flush();
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onLanded after success only', async () => {
    const queue = new WriteQueue({ onError: () => undefined });
    const landedOk = vi.fn();
    const landedFail = vi.fn();
    queue.enqueue(() => Promise.resolve(), landedOk);
    queue.enqueue(() => Promise.reject(new Error('boom')), landedFail);
    await queue.flush();
    expect(landedOk).toHaveBeenCalledOnce();
    expect(landedFail).not.toHaveBeenCalled();
  });

  it('awaits before ahead of every task, enqueue and run alike', async () => {
    const log: string[] = [];
    const queue = new WriteQueue({
      before: async () => {
        log.push('before');
      },
    });
    queue.enqueue(async () => {
      log.push('enqueue');
    });
    await queue.run(async () => {
      log.push('run');
    });
    expect(log).toEqual(['before', 'enqueue', 'before', 'run']);
  });
});
