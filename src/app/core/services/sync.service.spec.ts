import { TestBed } from '@angular/core/testing';
import { Injector, signal } from '@angular/core';
import { setActiveProfileDb } from '@db/entity-store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileSummary } from '@models/profile.model';
import type { CardEntry } from '@models/card.model';
import type { Collection } from '@models/collection.model';
import type { Deck } from '@models/deck.model';
import { mockCardEntry } from '@testing/card.mocks';
import { hasUnsyncedChanges } from '../utils/sync-status.util';
import { CardService } from './card.service';
import { CloudAuthService } from './cloud-auth.service';
import { CloudSessionService } from './cloud-session.service';
import { CollectionService } from './collection.service';
import { ConnectivityService } from './connectivity.service';
import { DeckService } from './deck.service';
import type { PlanarSelection } from '@models/planar-selection.model';
import { PlanarSelectionService } from './planar-selection.service';
import { ProfileSessionService, SessionHooks } from './profile-session.service';
import { ProfileStore } from './profile-store.service';
import { SYNC_TIMEOUT_MS, SyncService } from './sync.service';
import { SYNC_LOCK, type SyncLock } from './sync/sync-lock';

const LINKED: ProfileSummary = {
  id: 'p1',
  name: 'rafa',
  colors: ['R'],
  cloud: { userId: 'u1', email: 'rafa@exemplo.com', needsReauth: false },
  createdAt: '2026-01-01T00:00:00.000Z',
  nameUpdatedAt: '2026-01-01T00:00:00.000Z',
  colorsUpdatedAt: '2026-01-01T00:00:00.000Z',
};

/** The `card_entries` row a card round-trips through. */
function cardRow(card: CardEntry) {
  return {
    id: card.id,
    user_id: 'u1',
    scryfall_id: card.scryfallId,
    oracle_id: card.oracleId,
    name: card.name,
    set_code: card.setCode,
    set_name: card.setName,
    collector_number: card.collectorNumber,
    rarity: card.rarity,
    commander_legality: card.commanderLegality,
    color_identity: card.colorIdentity,
    type_line: card.typeLine,
    can_be_commander: card.canBeCommander,
    finish: card.finish,
    language: card.language,
    condition: card.condition,
    quantity: card.quantity,
    location_id: card.locationId,
    for_sale: card.forSale,
    image_url: card.imageUrl,
    faces: card.faces ?? null,
    notes: card.notes ?? null,
    updated_at: card.updatedAt,
  };
}

/** The Web Locks API in memory: one holder at a time, and `fn` runs at once when the lock is free. */
function serialLock(): SyncLock {
  let held: Promise<unknown> | null = null;
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    while (held) {
      await held.catch(() => undefined);
    }
    const run = fn();
    held = run;
    try {
      return await run;
    } finally {
      if (held === run) {
        held = null;
      }
    }
  };
}

/** A PostgREST-like query whose result resolves only when `release()` is called. */
function stalledQuery() {
  let release!: (value: { data: unknown[]; error: null }) => void;
  const result = new Promise<{ data: unknown[]; error: null }>((resolve) => (release = resolve));
  const query = {
    select: () => query,
    eq: () => query,
    in: () => query,
    upsert: () => query,
    delete: () => query,
    abortSignal: () => query,
    then: result.then.bind(result),
  };
  return { query, release: () => release({ data: [], error: null }) };
}

/** A PostgREST-like query that resolves at once with `rows`, recording its upserts. */
function settledQuery(rows: unknown[], upserts: unknown[][]) {
  const result = Promise.resolve({ data: rows, error: null });
  const query = {
    select: () => query,
    eq: () => query,
    in: () => query,
    upsert: (...args: unknown[]) => (upserts.push(args), query),
    delete: () => query,
    abortSignal: () => query,
    then: result.then.bind(result),
  };
  return query;
}

describe('SyncService', () => {
  const active = signal<ProfileSummary | null>(LINKED);
  const online = signal(true);
  let hooks: SessionHooks[];
  let pending: ReturnType<typeof stalledQuery>;
  let cloud: {
    client: ReturnType<typeof vi.fn>;
    startAutoRefresh: ReturnType<typeof vi.fn>;
    stopAutoRefresh: ReturnType<typeof vi.fn>;
    markNeedsReauth: ReturnType<typeof vi.fn>;
  };
  let auth: { lookupAccount: ReturnType<typeof vi.fn>; forgetGoneAccount: ReturnType<typeof vi.fn> };
  let profiles: { byId: ReturnType<typeof vi.fn>; setColors: ReturnType<typeof vi.fn> };
  let updateUser: ReturnType<typeof vi.fn>;
  let from: ReturnType<typeof vi.fn>;
  let calls: string[];
  let sync: SyncService;
  const planarSelection = signal<PlanarSelection | null>(null);
  let applyPlanarSelection: ReturnType<typeof vi.fn>;
  const localCards = signal<CardEntry[]>([]);
  let cardsService: {
    cards: typeof localCards;
    flush: ReturnType<typeof vi.fn>;
    getTombstones: ReturnType<typeof vi.fn>;
    applySyncResult: ReturnType<typeof vi.fn>;
    clearTombstones: ReturnType<typeof vi.fn>;
  };
  const localCollections = signal<Collection[]>([]);
  let collectionsService: {
    collections: typeof localCollections;
    flush: ReturnType<typeof vi.fn>;
    getTombstones: ReturnType<typeof vi.fn>;
    applySyncResult: ReturnType<typeof vi.fn>;
    clearTombstones: ReturnType<typeof vi.fn>;
    resolveMixedCollections: ReturnType<typeof vi.fn>;
  };

  const localDecks = signal<Deck[]>([]);
  let decksService: {
    decks: typeof localDecks;
    flush: ReturnType<typeof vi.fn>;
    getTombstones: ReturnType<typeof vi.fn>;
    applySyncResult: ReturnType<typeof vi.fn>;
    clearTombstones: ReturnType<typeof vi.fn>;
  };

  /** The account's user, with metadata matching LINKED unless patched. */
  const user = (meta: Record<string, unknown> = {}) => ({
    id: 'u1',
    email: 'rafa@exemplo.com',
    user_metadata: {
      grm_colors: ['R'],
      grm_colors_at: LINKED.colorsUpdatedAt,
      grm_label: 'rafa',
      grm_label_at: LINKED.nameUpdatedAt,
      ...meta,
    },
  });

  beforeEach(() => {
    vi.useFakeTimers();
    active.set(LINKED);
    online.set(true);
    hooks = [];
    pending = stalledQuery();
    calls = [];
    updateUser = vi.fn(async () => (calls.push('updateUser'), { data: {}, error: null }));
    from = vi.fn(() => (calls.push('from'), pending.query));
    cloud = {
      client: vi.fn(() => ({ auth: { updateUser }, from })),
      startAutoRefresh: vi.fn(),
      stopAutoRefresh: vi.fn(),
      markNeedsReauth: vi.fn(async () => {
        const profile = active();
        active.set(profile?.cloud ? { ...profile, cloud: { ...profile.cloud, needsReauth: true } } : profile);
      }),
    };
    auth = {
      lookupAccount: vi.fn().mockResolvedValue({ status: 'ok', user: user() }),
      forgetGoneAccount: vi.fn().mockResolvedValue(undefined),
    };
    profiles = {
      byId: vi.fn(() => active()),
      setColors: vi.fn(async () => void calls.push('setColors')),
    };
    planarSelection.set(null);
    applyPlanarSelection = vi.fn();
    localCards.set([]);
    cardsService = {
      cards: localCards,
      flush: vi.fn(async () => undefined),
      getTombstones: vi.fn(async () => []),
      applySyncResult: vi.fn(),
      clearTombstones: vi.fn(async () => undefined),
    };
    localCollections.set([]);
    collectionsService = {
      collections: localCollections,
      flush: vi.fn(async () => undefined),
      getTombstones: vi.fn(async () => []),
      applySyncResult: vi.fn(),
      clearTombstones: vi.fn(async () => undefined),
      resolveMixedCollections: vi.fn(),
    };
    localDecks.set([]);
    decksService = {
      decks: localDecks,
      flush: vi.fn(async () => undefined),
      getTombstones: vi.fn(async () => []),
      applySyncResult: vi.fn(),
      clearTombstones: vi.fn(async () => undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: SYNC_LOCK, useValue: serialLock() },
        { provide: DeckService, useValue: decksService },
        {
          provide: PlanarSelectionService,
          useValue: { selection: planarSelection, flush: async () => undefined, applySyncResult: applyPlanarSelection },
        },
        { provide: CollectionService, useValue: collectionsService },
        { provide: CardService, useValue: cardsService },
        { provide: CloudSessionService, useValue: cloud },
        { provide: CloudAuthService, useValue: auth },
        { provide: ProfileStore, useValue: profiles },
        { provide: ConnectivityService, useValue: { online } },
        {
          provide: ProfileSessionService,
          useValue: { active, registerHooks: (h: SessionHooks) => hooks.push(h) },
        },
      ],
    });
    sync = TestBed.inject(SyncService);
  });

  afterEach(() => vi.useRealTimers());

  it('runs once while a sync is in flight', () => {
    const first = sync.syncNow();
    const second = sync.syncNow();
    expect(second).toBe(first);
    expect(auth.lookupAccount).toHaveBeenCalledTimes(1);
    expect(sync.state()).toBe('syncing');
  });

  it('ends a stalled sync as an error within the bound, and allows a new run', async () => {
    const outcome = sync.syncNow();
    await vi.advanceTimersByTimeAsync(SYNC_TIMEOUT_MS);
    expect(await outcome).toBe('error');
    expect(sync.state()).toBe('error');

    pending = stalledQuery();
    void sync.syncNow();
    expect(auth.lookupAccount).toHaveBeenCalledTimes(2);
  });

  it('ends a stalled sync as offline when the device went offline', async () => {
    const outcome = sync.syncNow();
    online.set(false);
    await vi.advanceTimersByTimeAsync(SYNC_TIMEOUT_MS);
    expect(await outcome).toBe('offline');
    expect(sync.state()).toBe('offline');
  });

  it('ignores a run that settles after its timeout', async () => {
    const stale = pending;
    void sync.syncNow();
    await vi.advanceTimersByTimeAsync(SYNC_TIMEOUT_MS);
    expect(sync.state()).toBe('error');

    stale.release();
    await vi.advanceTimersByTimeAsync(0);
    expect(sync.state()).toBe('error');
    expect(sync.lastSyncedAt()).toBeNull();
  });

  it('registers session hooks once that never start a sync', () => {
    sync.start();
    sync.start();
    expect(hooks).toHaveLength(1);

    hooks[0].beforeSwitch(LINKED);
    hooks[0].afterActivate(LINKED);
    expect(cloud.stopAutoRefresh).toHaveBeenCalledWith('p1');
    expect(cloud.startAutoRefresh).toHaveBeenCalledWith('p1');
    expect(cloud.client).not.toHaveBeenCalled();
    expect(sync.state()).toBe('idle');
  });

  it('does not keep a profile that needs reauth refreshing', () => {
    sync.start();
    hooks[0].afterActivate({ ...LINKED, cloud: { ...LINKED.cloud!, needsReauth: true } });
    expect(cloud.startAutoRefresh).not.toHaveBeenCalled();
  });

  it('resets a failure to idle when the profile changes', async () => {
    void sync.syncNow();
    await vi.advanceTimersByTimeAsync(SYNC_TIMEOUT_MS);
    expect(sync.state()).toBe('error');

    await sync.profileChanged();
    expect(sync.state()).toBe('idle');
  });

  it('checks the account first, then leaves the identity alone when nothing changed', async () => {
    void sync.syncNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(auth.lookupAccount).toHaveBeenCalledWith('p1');
    expect(calls).toEqual(['from']);
  });

  it('adopts newer account colors silently, before locations', async () => {
    auth.lookupAccount.mockResolvedValue({
      status: 'ok',
      user: user({ grm_colors: ['G', 'W'], grm_colors_at: '2026-06-01T00:00:00.000Z' }),
    });
    void sync.syncNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(profiles.setColors).toHaveBeenCalledWith('p1', ['G', 'W'], '2026-06-01T00:00:00.000Z');
    expect(updateUser).not.toHaveBeenCalled();
    expect(calls).toEqual(['setColors', 'from']);
  });

  it('writes newer local colors and label in one updateUser, before locations', async () => {
    active.set({ ...LINKED, colors: ['U'], colorsUpdatedAt: '2026-06-01T00:00:00.000Z', nameUpdatedAt: '2026-06-02T00:00:00.000Z' });
    void sync.syncNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith({
      data: {
        grm_colors: ['U'],
        grm_colors_at: '2026-06-01T00:00:00.000Z',
        grm_label: 'rafa',
        grm_label_at: '2026-06-02T00:00:00.000Z',
      },
    });
    expect(calls).toEqual(['updateUser', 'from']);
  });

  it('fails the sync when the identity write fails', async () => {
    active.set({ ...LINKED, nameUpdatedAt: '2026-06-02T00:00:00.000Z' });
    updateUser.mockResolvedValue({ data: {}, error: { code: 'unexpected_failure' } });
    expect(await sync.syncNow()).toBe('error');
    expect(from).not.toHaveBeenCalled();
  });

  it('turns a gone account local and settles to idle', async () => {
    auth.lookupAccount.mockResolvedValue({ status: 'gone' });
    expect(await sync.syncNow()).toBe('gone');
    expect(auth.forgetGoneAccount).toHaveBeenCalledWith('p1');
    expect(sync.state()).toBe('idle');
    expect(from).not.toHaveBeenCalled();
  });

  it('asks for reauth when the session is dead', async () => {
    auth.lookupAccount.mockResolvedValue({ status: 'expired' });
    expect(await sync.syncNow()).toBe('reauth');
    expect(cloud.markNeedsReauth).toHaveBeenCalledWith('p1');
    expect(sync.state()).toBe('reauth');
  });

  it('shows expired as soon as the profile needs reauth, without a sync', () => {
    active.set({ ...LINKED, cloud: { ...LINKED.cloud!, needsReauth: true } });
    expect(sync.state()).toBe('reauth');
  });

  it('leaves expired once the profile signs in again, without a sync', async () => {
    auth.lookupAccount.mockResolvedValue({ status: 'expired' });
    await sync.syncNow();
    expect(sync.state()).toBe('reauth');

    active.set(LINKED);
    expect(sync.state()).toBe('idle');
  });

  it('reports offline when the account check can\u2019t reach the server', async () => {
    auth.lookupAccount.mockResolvedValue({ status: 'offline' });
    expect(await sync.syncNow()).toBe('offline');
    expect(sync.state()).toBe('offline');
  });

  it('makes a second copy wait, syncing, until the first copy\u2019s sync ends (FR-014a)', async () => {
    vi.useRealTimers();
    await setActiveProfileDb('p1');
    const other = Injector.create({ providers: [SyncService], parent: TestBed.inject(Injector) }).get(SyncService);
    const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

    const first = sync.syncNow();
    const second = other.syncNow();
    await settle();
    expect(sync.state()).toBe('syncing');
    expect(other.state()).toBe('syncing');
    expect(auth.lookupAccount).toHaveBeenCalledOnce();

    pending.release();
    expect(await first).toBe('done');
    expect(await second).toBe('done');
    expect(auth.lookupAccount).toHaveBeenCalledTimes(2);
  });

  describe('collections', () => {
    const OLD = '2026-06-01T00:00:00.000Z';
    const NEW = '2026-06-02T00:00:00.000Z';
    let upserts: unknown[][];
    let deletes: unknown[][];

    /** Every table answers at once; collections with `remote`, recording upserts/deletes. */
    const answer = (remote: unknown[]) => {
      upserts = [];
      deletes = [];
      const result = Promise.resolve({ data: remote, error: null });
      const query = {
        select: () => query,
        eq: () => query,
        in: (...args: unknown[]) => (deletes.push(args[1] as unknown[]), query),
        upsert: (...args: unknown[]) => (upserts.push(args), query),
        delete: () => query,
        abortSignal: () => query,
        then: result.then.bind(result),
      };
      from.mockImplementation((table: string) => (table === 'collections' ? query : settledQuery([], [])));
    };

    it('upserts a local collection newer than the remote row, and applies the merge', async () => {
      const local: Collection = { id: 'c1', name: 'Caixa 1', color: '#d8cdb0', parentId: null, updatedAt: NEW };
      localCollections.set([local]);
      answer([{ id: 'c1', user_id: 'u1', name: 'Antiga', color: '#3d6b85', parent_id: null, updated_at: OLD }]);
      await sync.syncNow();
      expect(upserts).toEqual([
        [
          [{ id: 'c1', user_id: 'u1', name: 'Caixa 1', color: '#d8cdb0', parent_id: null, updated_at: NEW }],
          { onConflict: 'user_id,id' },
        ],
      ]);
      expect(collectionsService.applySyncResult).toHaveBeenCalledWith([local]);
    });

    it('adopts a remote collection newer than the local row', async () => {
      const local: Collection = { id: 'c1', name: 'Antiga', color: '#3d6b85', parentId: null, updatedAt: OLD };
      localCollections.set([local]);
      const remoteRow = { id: 'c1', user_id: 'u1', name: 'Caixa 1', color: '#d8cdb0', parent_id: null, updated_at: NEW };
      answer([remoteRow]);
      await sync.syncNow();
      expect(upserts).toEqual([]);
      expect(collectionsService.applySyncResult).toHaveBeenCalledWith([
        { id: 'c1', name: 'Caixa 1', color: '#d8cdb0', parentId: null, updatedAt: NEW },
      ]);
    });

    describe('tree repair and cards', () => {
      let cardUpserts: unknown[][];
      let cardDeletes: unknown[][];
      let tables: string[];

      /** Collections answer with `remote`, card_entries with `remoteCards`; both record writes. */
      const answerAll = (remote: unknown[], remoteCards: unknown[] = []) => {
        answer(remote);
        const collectionsFrom = from.getMockImplementation() as (table: string) => unknown;
        cardUpserts = [];
        cardDeletes = [];
        tables = [];
        const result = Promise.resolve({ data: remoteCards, error: null });
        const cardQuery = {
          select: () => cardQuery,
          eq: () => cardQuery,
          in: (...args: unknown[]) => (cardDeletes.push(args[1] as unknown[]), cardQuery),
          upsert: (...args: unknown[]) => (cardUpserts.push(args), cardQuery),
          delete: () => cardQuery,
          abortSignal: () => cardQuery,
          then: result.then.bind(result),
        };
        from.mockImplementation((table: string) => {
          tables.push(table);
          return table === 'card_entries' ? cardQuery : collectionsFrom(table);
        });
      };
      const col = (id: string, name: string, parentId: string | null, updatedAt: string): Collection => ({
        id,
        name,
        color: '#d8cdb0',
        parentId,
        updatedAt,
      });
      const row = (c: Collection) => ({
        id: c.id,
        user_id: 'u1',
        name: c.name,
        color: c.color,
        parent_id: c.parentId,
        updated_at: c.updatedAt,
      });

      it('drops a child whose parent was deleted remotely, and deletes it remotely too', async () => {
        const child = col('c', 'Azuis', 'gone', OLD);
        localCollections.set([child, col('g', 'Lote', 'c', NEW)]);
        answerAll([row(child)]);
        await sync.syncNow();
        expect(deletes).toEqual([['c']]);
        expect(upserts).toEqual([]);
        expect(collectionsService.applySyncResult).toHaveBeenCalledWith([]);
      });

      it('renames a same-named sibling from this device "(2)", keeping the remote one', async () => {
        localCollections.set([col('b', 'Fichário', null, NEW)]);
        answerAll([row(col('a', 'fichário ', null, OLD))]);
        await sync.syncNow();
        expect(upserts).toHaveLength(1);
        const [[sent]] = upserts[0] as [unknown[]];
        expect(sent).toMatchObject({ id: 'b', name: 'Fichário (2)' });
        expect(upserts[0][0]).toHaveLength(1);
        const applied = collectionsService.applySyncResult.mock.calls[0][0] as Collection[];
        expect(applied.map((c) => [c.id, c.name]).sort()).toEqual([
          ['a', 'fichário '],
          ['b', 'Fichário (2)'],
        ]);
      });

      it('sends no card write for a "move" delete', async () => {
        const card = mockCardEntry({ id: 'k', locationId: 'c1', updatedAt: OLD });
        localCards.set([card]);
        collectionsService.getTombstones.mockResolvedValue([{ id: 'c1', deletedAt: NEW }]);
        answerAll([row(col('c1', 'Caixa', null, OLD))], [cardRow(card)]);
        await sync.syncNow();
        expect(deletes).toEqual([['c1']]);
        expect(cardUpserts).toEqual([]);
        expect(cardDeletes).toEqual([]);
      });

      it('sends the card deletions of a "delete" delete', async () => {
        const card = mockCardEntry({ id: 'k', locationId: 'c1', updatedAt: OLD });
        collectionsService.getTombstones.mockResolvedValue([{ id: 'c1', deletedAt: NEW }]);
        cardsService.getTombstones.mockResolvedValue([{ id: 'k', deletedAt: NEW }]);
        answerAll([row(col('c1', 'Caixa', null, OLD))], [cardRow(card)]);
        await sync.syncNow();
        expect(cardDeletes).toEqual([['k']]);
        expect(cardUpserts).toEqual([]);
      });

      it('sends one collection row and no card for a rename of a collection holding cards', async () => {
        const card = mockCardEntry({ id: 'k', locationId: 'c1', updatedAt: OLD });
        localCards.set([card]);
        localCollections.set([col('c1', 'Novo nome', null, NEW)]);
        answerAll([row(col('c1', 'Caixa', null, OLD))], [cardRow(card)]);
        await sync.syncNow();
        expect(upserts).toHaveLength(1);
        expect(upserts[0][0]).toHaveLength(1);
        expect(cardUpserts).toEqual([]);
      });

      it('fixes a mixed collection after the card sync, flagged unsynced and uploaded next run', async () => {
        const card = mockCardEntry({ id: 'k', locationId: 'p', updatedAt: OLD });
        localCards.set([card]);
        let syncedAt = '';
        collectionsService.resolveMixedCollections.mockImplementation((at: string) => {
          syncedAt = at;
          tables.push('resolve');
          const stamp = new Date(Math.max(Date.now(), Date.parse(at) + 1)).toISOString();
          localCards.update((cards) => cards.map((c) => ({ ...c, locationId: 'child', updatedAt: stamp })));
        });
        answerAll([], [cardRow(card)]);
        await sync.syncNow();

        expect(tables.indexOf('card_entries')).toBeLessThan(tables.indexOf('resolve'));
        expect(tables.indexOf('resolve')).toBeLessThan(tables.indexOf('planechase_selections'));
        expect(
          hasUnsyncedChanges({
            linked: true,
            lastSyncedAt: syncedAt,
            cards: localCards(),
            collections: [],
            decks: [],
            tombstoneCount: 0,
            colorsUpdatedAt: OLD,
            nameUpdatedAt: OLD,
            planarSelectionUpdatedAt: null,
          }),
        ).toBe(true);

        collectionsService.resolveMixedCollections.mockImplementation(() => undefined);
        answerAll([], [cardRow(card)]);
        await sync.syncNow();
        expect(cardUpserts).toHaveLength(1);
        expect(cardUpserts[0][0]).toEqual([expect.objectContaining({ id: 'k', location_id: 'child' })]);
      });

      it('never calls the client for an unlinked profile', async () => {
        active.set({ ...LINKED, cloud: null });
        await sync.syncNow();
        expect(cloud.client).not.toHaveBeenCalled();
        expect(from).not.toHaveBeenCalled();
      });
    });

    it('deletes a tombstoned collection from the remote and clears its tombstone', async () => {
      localCollections.set([]);
      collectionsService.getTombstones.mockResolvedValue([{ id: 'c1', deletedAt: NEW }]);
      answer([{ id: 'c1', user_id: 'u1', name: 'Caixa 1', color: '#d8cdb0', parent_id: null, updated_at: OLD }]);
      await sync.syncNow();
      expect(deletes).toEqual([['c1']]);
      expect(collectionsService.applySyncResult).toHaveBeenCalledWith([]);
      expect(collectionsService.clearTombstones).toHaveBeenCalledWith(['c1']);
    });
  });

  describe('decks', () => {
    const OLD = '2026-06-01T00:00:00.000Z';
    const NEW = '2026-06-02T00:00:00.000Z';
    let upserts: unknown[][];
    let deletes: unknown[][];
    let tables: string[];

    const deck = (id: string, name: string, updatedAt: string, format: Deck['format'] = 'commander'): Deck => ({
      id,
      name,
      format,
      updatedAt,
    });
    const row = (d: Deck) => ({ id: d.id, user_id: 'u1', name: d.name, format: d.format, updated_at: d.updatedAt });

    /** Every table answers at once; decks with `remote` (or `error`), recording writes and table order. */
    const answer = (remote: unknown[], upsertError: unknown = null) => {
      upserts = [];
      deletes = [];
      tables = [];
      const result = Promise.resolve({ data: remote, error: null });
      const failed = Promise.resolve({ data: null, error: upsertError });
      let failing = false;
      const query = {
        select: () => query,
        eq: () => query,
        in: (...args: unknown[]) => (deletes.push(args[1] as unknown[]), query),
        upsert: (...args: unknown[]) => (upserts.push(args), (failing = !!upsertError), query),
        delete: () => query,
        abortSignal: () => query,
        then: (...args: Parameters<Promise<unknown>['then']>) => (failing ? failed : result).then(...args),
      };
      from.mockImplementation((table: string) => {
        tables.push(table);
        return table === 'decks' ? query : settledQuery([], []);
      });
    };

    it('upserts a local deck and applies the merge', async () => {
      const local = deck('d1', 'Elfos', NEW, 'pauper');
      localDecks.set([local]);
      answer([]);
      await sync.syncNow();

      expect(upserts).toEqual([
        [[{ id: 'd1', user_id: 'u1', name: 'Elfos', format: 'pauper', updated_at: NEW }], { onConflict: 'user_id,id' }],
      ]);
      expect(decksService.applySyncResult).toHaveBeenCalledWith([local]);
    });

    it('applies a remote deck, mapping an unknown format to Casual', async () => {
      answer([{ ...row(deck('d1', 'Elfos', NEW)), format: 'oathbreaker' }]);
      await sync.syncNow();

      expect(upserts).toEqual([]);
      expect(decksService.applySyncResult).toHaveBeenCalledWith([deck('d1', 'Elfos', NEW, 'casual')]);
    });

    it('lets a remote edit newer than the local one win', async () => {
      localDecks.set([deck('d1', 'Elfos', OLD)]);
      answer([row(deck('d1', 'Elfos do Legacy', NEW, 'legacy'))]);
      await sync.syncNow();

      expect(upserts).toEqual([]);
      expect(decksService.applySyncResult).toHaveBeenCalledWith([deck('d1', 'Elfos do Legacy', NEW, 'legacy')]);
    });

    it('deletes a tombstoned deck remotely and clears its tombstone', async () => {
      decksService.getTombstones.mockResolvedValue([{ id: 'd1', deletedAt: NEW }]);
      answer([row(deck('d1', 'Elfos', OLD))]);
      await sync.syncNow();

      expect(deletes).toEqual([['d1']]);
      expect(decksService.applySyncResult).toHaveBeenCalledWith([]);
      expect(decksService.clearTombstones).toHaveBeenCalledWith(['d1']);
    });

    it('keeps a deck whose remote edit is newer than the local deletion', async () => {
      decksService.getTombstones.mockResolvedValue([{ id: 'd1', deletedAt: OLD }]);
      answer([row(deck('d1', 'Elfos', NEW))]);
      await sync.syncNow();

      expect(deletes).toEqual([]);
      expect(decksService.applySyncResult).toHaveBeenCalledWith([deck('d1', 'Elfos', NEW)]);
      expect(decksService.clearTombstones).toHaveBeenCalledWith(['d1']);
    });

    it('renames a same-named deck from this device "(2)" and uploads it', async () => {
      localDecks.set([deck('b', 'Krenko', NEW)]);
      answer([row(deck('a', 'krênko', OLD))]);
      await sync.syncNow();

      expect(upserts).toHaveLength(1);
      expect(upserts[0][0]).toEqual([expect.objectContaining({ id: 'b', name: 'Krenko (2)' })]);
      const applied = decksService.applySyncResult.mock.calls[0][0] as Deck[];
      expect(applied.map((d) => [d.id, d.name]).sort()).toEqual([
        ['a', 'krênko'],
        ['b', 'Krenko (2)'],
      ]);
    });

    it('ends in the error state on a decks upsert error, applying nothing', async () => {
      localDecks.set([deck('d1', 'Elfos', NEW)]);
      answer([], { message: 'permission denied for table decks', code: '42501' });

      expect(await sync.syncNow()).toBe('error');
      expect(sync.state()).toBe('error');
      expect(decksService.applySyncResult).not.toHaveBeenCalled();
    });

    it('syncs collections, then decks, then cards, after flushing decks', async () => {
      answer([]);
      await sync.syncNow();

      expect(decksService.flush).toHaveBeenCalled();
      expect(tables.indexOf('collections')).toBeLessThan(tables.indexOf('decks'));
      expect(tables.indexOf('decks')).toBeLessThan(tables.indexOf('card_entries'));
    });
  });

  describe('planar deck selection', () => {
    const OLD = '2026-06-01T00:00:00.000Z';
    const NEW = '2026-06-02T00:00:00.000Z';
    let upserts: unknown[][];

    /** Every table answers at once; planechase_selections with `remote`. */
    const answer = (remote: unknown[]) => {
      upserts = [];
      from.mockImplementation((table: string) =>
        settledQuery(table === 'planechase_selections' ? remote : [], table === 'planechase_selections' ? upserts : []),
      );
    };

    it('upserts a local selection newer than the account’s', async () => {
      planarSelection.set({ disabledIds: ['a', 'b'], updatedAt: NEW });
      answer([{ user_id: 'u1', disabled_ids: ['c'], updated_at: '2026-06-01T00:00:00+00:00' }]);
      await sync.syncNow();
      expect(upserts).toEqual([
        [{ user_id: 'u1', disabled_ids: ['a', 'b'], updated_at: NEW }, { onConflict: 'user_id' }],
      ]);
      expect(applyPlanarSelection).not.toHaveBeenCalled();
    });

    it('applies an account selection newer than the local one, with its own stamp', async () => {
      planarSelection.set({ disabledIds: ['a'], updatedAt: OLD });
      answer([{ user_id: 'u1', disabled_ids: ['c'], updated_at: '2026-06-02T00:00:00+00:00' }]);
      await sync.syncNow();
      expect(applyPlanarSelection).toHaveBeenCalledWith({ disabledIds: ['c'], updatedAt: NEW });
      expect(upserts).toEqual([]);
    });

    it('does nothing when neither side has a selection', async () => {
      answer([]);
      await sync.syncNow();
      expect(from).toHaveBeenCalledWith('planechase_selections');
      expect(upserts).toEqual([]);
      expect(applyPlanarSelection).not.toHaveBeenCalled();
    });
  });
});
