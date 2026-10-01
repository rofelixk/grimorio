import { DestroyRef, Injectable, InjectionToken, inject } from '@angular/core';
import { boundProfileId } from '@db/entity-store';

export type ChangeKind = 'cards' | 'collections' | 'decks' | 'planarSelection' | 'planechaseGame' | 'profiles';

const KINDS: ReadonlySet<string> = new Set<ChangeKind>([
  'cards',
  'collections',
  'decks',
  'planarSelection',
  'planechaseGame',
  'profiles',
]);

/** Kinds delivered whatever profile the receiving copy has open (FR-012). */
const DEVICE_KINDS: ReadonlySet<ChangeKind> = new Set<ChangeKind>(['planechaseGame', 'profiles']);

interface ChangeMessage {
  source: string;
  kind: ChangeKind;
  profileId: string | null;
}

export interface CrossTabChannel {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  close(): void;
}

/** Defaults to new BroadcastChannel('grimorio-data'), or null when unsupported (FR-015). */
export const CROSS_TAB_CHANNEL = new InjectionToken<CrossTabChannel | null>('CROSS_TAB_CHANNEL', {
  providedIn: 'root',
  factory: () => (typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('grimorio-data')),
});

// Tells other open copies of the app that this one saved something (research R5). A message
// carries the kind and the profile the write targeted, never data: receivers re-read IndexedDB.
// Profile-scoped kinds reach only copies with that profile bound (FR-013).
@Injectable({ providedIn: 'root' })
export class CrossTabService {
  private readonly channel = inject(CROSS_TAB_CHANNEL);
  private readonly source = crypto.randomUUID();
  private readonly handlers = new Map<ChangeKind, Set<() => void | Promise<void>>>();

  constructor() {
    const channel = this.channel;
    if (!channel) {
      return;
    }
    channel.addEventListener('message', (event) => this.receive(event.data));
    inject(DestroyRef).onDestroy(() => channel.close());
  }

  announce(kind: ChangeKind, profileId: string | null): void {
    const message: ChangeMessage = { source: this.source, kind, profileId };
    this.channel?.postMessage(message);
  }

  /**
   * Profile-scoped kinds fire only when profileId === boundProfileId(); device kinds always. A
   * handler's rejection (a refresh that failed to read) is logged here.
   */
  on(kind: ChangeKind, handler: () => void | Promise<void>): () => void {
    if (!this.channel) {
      return () => undefined;
    }
    let set = this.handlers.get(kind);
    if (!set) {
      set = new Set();
      this.handlers.set(kind, set);
    }
    set.add(handler);
    return () => set.delete(handler);
  }

  private receive(data: unknown): void {
    const message = data as Partial<ChangeMessage> | null;
    if (!message || message.source === this.source || !KINDS.has(message.kind as string)) {
      return;
    }
    const kind = message.kind as ChangeKind;
    if (!DEVICE_KINDS.has(kind) && (message.profileId ?? null) !== boundProfileId()) {
      return;
    }
    for (const handler of this.handlers.get(kind) ?? []) {
      Promise.resolve(handler()).catch((error: unknown) =>
        console.error(`Grimorio: failed to refresh ${kind} after another window saved.`, error),
      );
    }
  }
}
