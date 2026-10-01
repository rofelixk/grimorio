import type { Provider } from '@angular/core';
import { type ChangeKind, CROSS_TAB_CHANNEL, type CrossTabChannel } from '@services/cross-tab.service';

class FakeChannel implements CrossTabChannel {
  peer: FakeChannel | null = null;
  private readonly listeners = new Set<(event: MessageEvent) => void>();
  private closed = false;

  postMessage(message: unknown): void {
    const peer = this.peer;
    if (this.closed || !peer) {
      return;
    }
    // Like BroadcastChannel: delivered asynchronously, to the other end only.
    queueMicrotask(() => peer.deliver(message));
  }

  addEventListener(_type: 'message', listener: (event: MessageEvent) => void): void {
    this.listeners.add(listener);
  }

  close(): void {
    this.closed = true;
  }

  private deliver(message: unknown): void {
    if (this.closed) {
      return;
    }
    for (const listener of this.listeners) {
      listener(new MessageEvent('message', { data: message }));
    }
  }
}

/** Two in-memory ends of one channel: a post on one reaches the other's listeners (research R10). */
export function createFakeChannelPair(): [CrossTabChannel, CrossTabChannel] {
  const a = new FakeChannel();
  const b = new FakeChannel();
  a.peer = b;
  b.peer = a;
  return [a, b];
}

export function provideCrossTabChannel(channel: CrossTabChannel | null): Provider {
  return { provide: CROSS_TAB_CHANNEL, useValue: channel };
}

/** What a copy announced: the message without its source id. */
export interface Announcement {
  kind: ChangeKind;
  profileId: string | null;
}

/** Lets a fake channel's delivery, and anything it set off, run. */
export function settleChannel(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

/**
 * Another open copy of the app, held by a spec: `provider` gives this copy its end of the channel,
 * `received` lists what this copy announced, and `announce` posts as the other copy.
 */
export function otherCopy(): {
  provider: Provider;
  received: Announcement[];
  announce(kind: ChangeKind, profileId: string | null): Promise<void>;
} {
  const [mine, theirs] = createFakeChannelPair();
  const received: Announcement[] = [];
  theirs.addEventListener('message', (event) => {
    const { kind, profileId } = event.data as Announcement;
    received.push({ kind, profileId });
  });
  return {
    provider: provideCrossTabChannel(mine),
    received,
    announce: (kind, profileId) => {
      theirs.postMessage({ source: 'other-copy', kind, profileId });
      return settleChannel();
    },
  };
}
