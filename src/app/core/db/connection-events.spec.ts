import { describe, expect, it, vi } from 'vitest';
import {
  emitTakeover,
  isClosedConnectionError,
  onTakeover,
  resetConnectionEventsForTests,
} from './connection-events';

describe('connection-events', () => {
  it('emits to every listener until it unsubscribes', () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = onTakeover(a);
    onTakeover(b);
    emitTakeover({ kind: 'upgrade' });
    offA();
    emitTakeover({ kind: 'deleted', profileId: 'p1' });
    expect(a).toHaveBeenCalledExactlyOnceWith({ kind: 'upgrade' });
    expect(b).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenLastCalledWith({ kind: 'deleted', profileId: 'p1' });
  });

  it('matches only an InvalidStateError DOMException as a closed connection', () => {
    expect(isClosedConnectionError(new DOMException('closing', 'InvalidStateError'))).toBe(true);
    expect(isClosedConnectionError(new DOMException('quota', 'QuotaExceededError'))).toBe(false);
    expect(isClosedConnectionError(new Error('InvalidStateError'))).toBe(false);
    expect(isClosedConnectionError(null)).toBe(false);
  });

  it('the reset drops every listener', () => {
    const listener = vi.fn();
    onTakeover(listener);
    resetConnectionEventsForTests();
    emitTakeover({ kind: 'upgrade' });
    expect(listener).not.toHaveBeenCalled();
  });
});
