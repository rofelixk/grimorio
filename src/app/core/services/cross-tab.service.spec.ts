import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setActiveProfileDb } from '@db/entity-store';
import { createFakeChannelPair, provideCrossTabChannel } from '@testing/cross-tab';
import type { CrossTabChannel } from './cross-tab.service';
import { CrossTabService } from './cross-tab.service';

/** Lets the fake channel's microtask delivery run. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('CrossTabService', () => {
  let service: CrossTabService;
  let other: CrossTabChannel;

  beforeEach(() => {
    const [mine, theirs] = createFakeChannelPair();
    other = theirs;
    TestBed.configureTestingModule({ providers: [provideCrossTabChannel(mine)] });
    service = TestBed.inject(CrossTabService);
  });

  function send(message: unknown): Promise<void> {
    other.postMessage(message);
    return settle();
  }

  it('announces the kind and profile, with its own source id', async () => {
    const received: unknown[] = [];
    other.addEventListener('message', (event) => received.push(event.data));

    service.announce('cards', 'p1');
    await settle();

    expect(received).toEqual([{ source: expect.any(String), kind: 'cards', profileId: 'p1' }]);
  });

  it('delivers a profile kind only when its profile is the bound one', async () => {
    await setActiveProfileDb('p1');
    const handler = vi.fn();
    service.on('cards', handler);

    await send({ source: 'x', kind: 'cards', profileId: 'p2' });
    expect(handler).not.toHaveBeenCalled();

    await send({ source: 'x', kind: 'cards', profileId: 'p1' });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('matches a device planar selection only with no profile bound', async () => {
    const handler = vi.fn();
    service.on('planarSelection', handler);

    await send({ source: 'x', kind: 'planarSelection', profileId: null });
    await setActiveProfileDb('p1');
    await send({ source: 'x', kind: 'planarSelection', profileId: null });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('always delivers the device kinds', async () => {
    await setActiveProfileDb('p1');
    const game = vi.fn();
    const profiles = vi.fn();
    service.on('planechaseGame', game);
    service.on('profiles', profiles);

    await send({ source: 'x', kind: 'planechaseGame', profileId: null });
    await send({ source: 'x', kind: 'profiles', profileId: null });

    expect(game).toHaveBeenCalledOnce();
    expect(profiles).toHaveBeenCalledOnce();
  });

  it('drops its own source, an unknown kind, and handlers that unsubscribed', async () => {
    const received: { source: string }[] = [];
    other.addEventListener('message', (event) => received.push(event.data as { source: string }));
    service.announce('profiles', null);
    await settle();
    const handler = vi.fn();
    const off = service.on('profiles', handler);

    await send({ source: received[0].source, kind: 'profiles', profileId: null });
    await send({ source: 'x', kind: 'nonsense', profileId: null });
    off();
    await send({ source: 'x', kind: 'profiles', profileId: null });

    expect(handler).not.toHaveBeenCalled();
  });

  it('does nothing without a channel (FR-015)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideCrossTabChannel(null)] });
    const bare = TestBed.inject(CrossTabService);

    expect(() => bare.announce('cards', 'p1')).not.toThrow();
    const off = bare.on('cards', () => undefined);
    expect(() => off()).not.toThrow();
  });
});
