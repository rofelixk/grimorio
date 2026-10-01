import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DATA } from '@utils/entry-copy';
import { SaveQueueService } from './save-queue.service';
import { ToastService } from './toast.service';

describe('SaveQueueService', () => {
  let show: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;
  let service: SaveQueueService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SaveQueueService);
    show = vi.spyOn(TestBed.inject(ToastService), 'show');
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    error.mockRestore();
    TestBed.inject(ToastService).dismiss();
  });

  it('logs and toasts a failed task once', async () => {
    const queue = service.create('cards');
    const failure = new Error('boom');
    queue.enqueue(() => Promise.reject(failure));
    await queue.flush();
    expect(error).toHaveBeenCalledExactlyOnceWith('Grimorio: failed to persist cards.', failure);
    expect(show).toHaveBeenCalledExactlyOnceWith(DATA.saveFailed.label, DATA.saveFailed.text);
  });

  it('only logs a failure on a connection a takeover closed', async () => {
    const queue = service.create('cards');
    queue.enqueue(() => Promise.reject(new DOMException('closing', 'InvalidStateError')));
    await queue.flush();
    expect(error).toHaveBeenCalledOnce();
    expect(show).not.toHaveBeenCalled();
  });

  it('does neither for a successful task', async () => {
    const queue = service.create('cards');
    queue.enqueue(() => Promise.resolve());
    await queue.flush();
    expect(error).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });

  it('toasts each failure in a row (ToastService keeps one on screen)', async () => {
    const queue = service.create('decks');
    queue.enqueue(() => Promise.reject(new Error('a')));
    queue.enqueue(() => Promise.reject(new Error('b')));
    await queue.flush();
    expect(show).toHaveBeenCalledTimes(2);
  });
});
