/**
 * Another copy of the app took over a database this copy holds (research R4): `upgrade` = it opened
 * a newer version; `deleted` = it deleted this copy's open profile database.
 */
export type TakeoverEvent = { kind: 'upgrade' } | { kind: 'deleted'; profileId: string };

const listeners = new Set<(event: TakeoverEvent) => void>();

export function onTakeover(listener: (event: TakeoverEvent) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitTakeover(event: TakeoverEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}

/** A write on a connection closed by a takeover (research R2): logged, never toasted. */
export function isClosedConnectionError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'InvalidStateError';
}

export function resetConnectionEventsForTests(): void {
  listeners.clear();
}
