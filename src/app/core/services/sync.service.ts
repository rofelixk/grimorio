import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { CardEntry, CardFace } from '@models/card.model';
import { Collection, CollectionColorHex } from '@models/collection.model';
import { type Deck, formatOf } from '@models/deck.model';
import type { PlanarSelection } from '@models/planar-selection.model';
import { currentDbHandle, getMeta, setMeta } from '../db/entity-store';
import { isAuthSessionError, isNetworkError } from '../utils/cloud-error.util';
import { repairCollectionTree } from '../utils/collection-tree.util';
import { repairDeckNames } from '../utils/deck.util';
import { reconcileEntities } from '../utils/sync-reconcile.util';
import { reconcileIdentity } from '../utils/identity-sync.util';
import { CardService } from './card.service';
import { CloudAuthService, identityOf } from './cloud-auth.service';
import { CloudSessionService } from './cloud-session.service';
import { CollectionService } from './collection.service';
import { ConnectivityService } from './connectivity.service';
import { DeckService } from './deck.service';
import { PlanarSelectionService } from './planar-selection.service';
import { ProfileSessionService } from './profile-session.service';
import { ProfileStore } from './profile-store.service';
import { AuthExpired, Offline, type Run, Superseded } from './sync/sync-run';

interface CardEntryRow {
  id: string;
  user_id: string;
  scryfall_id: string;
  oracle_id: string;
  name: string;
  set_code: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  commander_legality: string;
  color_identity: string[];
  type_line: string;
  can_be_commander: boolean;
  finish: string;
  language: string;
  condition: string;
  quantity: number;
  location_id: string;
  for_sale: boolean;
  image_url: string;
  faces: CardFace[] | null;
  notes: string | null;
  updated_at: string;
}

interface CollectionRow {
  id: string;
  user_id: string;
  name: string;
  color: CollectionColorHex;
  parent_id: string | null;
  updated_at: string;
}

interface DeckRow {
  id: string;
  user_id: string;
  name: string;
  format: string;
  updated_at: string;
}

interface PlanarSelectionRow {
  user_id: string;
  disabled_ids: string[];
  updated_at: string;
}

/** The one selection a profile has, as the single entity the reconciler compares. */
const PLANAR_SELECTION_ID = 'planar-selection';

export type SyncState = 'idle' | 'syncing' | 'done' | 'offline' | 'reauth' | 'error';
/**
 * How a syncNow() call ended; 'skipped' = nothing to sync (unlinked, or the profile changed);
 * 'gone' = the account no longer exists, so the profile turned local-only (FR-019b).
 */
export type SyncOutcome = 'done' | 'offline' | 'reauth' | 'error' | 'skipped' | 'gone';
/** A sync run always settles within this bound (FR-005a); a hung request ends as a failure. */
export const SYNC_TIMEOUT_MS = 60_000;

const LAST_SYNCED_KEY = 'lastSyncedAt';

function cardToRow(card: CardEntry, userId: string): CardEntryRow {
  return {
    id: card.id,
    user_id: userId,
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

function cardFromRow(row: CardEntryRow): CardEntry {
  return {
    id: row.id,
    scryfallId: row.scryfall_id,
    oracleId: row.oracle_id,
    name: row.name,
    setCode: row.set_code,
    setName: row.set_name,
    collectorNumber: row.collector_number,
    rarity: row.rarity as CardEntry['rarity'],
    commanderLegality: row.commander_legality as CardEntry['commanderLegality'],
    colorIdentity: row.color_identity as CardEntry['colorIdentity'],
    typeLine: row.type_line,
    canBeCommander: row.can_be_commander,
    finish: row.finish as CardEntry['finish'],
    language: row.language,
    condition: row.condition as CardEntry['condition'],
    quantity: row.quantity,
    locationId: row.location_id,
    forSale: row.for_sale,
    imageUrl: row.image_url,
    faces: row.faces ?? undefined,
    notes: row.notes ?? undefined,
    updatedAt: row.updated_at,
  };
}

function collectionToRow(collection: Collection, userId: string): CollectionRow {
  return {
    id: collection.id,
    user_id: userId,
    name: collection.name,
    color: collection.color,
    parent_id: collection.parentId,
    updated_at: new Date(collection.updatedAt).toISOString(),
  };
}

function collectionFromRow(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    parentId: row.parent_id,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function deckToRow(deck: Deck, userId: string): DeckRow {
  return {
    id: deck.id,
    user_id: userId,
    name: deck.name,
    format: deck.format,
    updated_at: new Date(deck.updatedAt).toISOString(),
  };
}

function deckFromRow(row: DeckRow): Deck {
  return {
    id: row.id,
    name: row.name,
    format: formatOf(row.format),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

// Syncs the active profile's identity, collections, cards and planar deck selection with its linked account (R11), reusing
// the per-item last-write-wins reconciler. Each run first asks GoTrue about the account (spec 005
// R12): a deleted one turns the profile local-only, a dead session asks for "Entrar de novo", and
// otherwise the identity step reconciles the colors and label (R6). Collections sync reconciles,
// then repairs the tree (repairCollectionTree, R6): orphans are dropped and duplicate sibling
// names are renamed before anything uploads. Decks sync the same way between collections and
// cards, then duplicate deck names are renamed (repairDeckNames). Sync is manual
// only: nothing but syncNow() starts one, and only SyncStatusService calls it (spec 004, SC-011).
// Single-flight and bounded by SYNC_TIMEOUT_MS; a run that was switched away from or timed out
// never writes state or applies its results.
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly session = inject(ProfileSessionService);
  private readonly cloud = inject(CloudSessionService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly cards = inject(CardService);
  private readonly collections = inject(CollectionService);
  private readonly decks = inject(DeckService);
  private readonly planarSelection = inject(PlanarSelectionService);
  private readonly cloudAuth = inject(CloudAuthService);
  private readonly profiles = inject(ProfileStore);

  private readonly stateSignal = signal<SyncState>('idle');
  /**
   * The profile's `needsReauth` flag decides 'reauth': a dead session shows as expired as soon as
   * it's detected, and any re-sign-in (reauth, reset code, recover) clears it without a sync.
   */
  readonly state = computed<SyncState>(() => {
    if (this.session.active()?.cloud?.needsReauth) {
      return 'reauth';
    }
    const state = this.stateSignal();
    return state === 'reauth' ? 'idle' : state;
  });
  private readonly lastSyncedAtSignal = signal<string | null>(null);
  readonly lastSyncedAt = this.lastSyncedAtSignal.asReadonly();

  private inFlight: Promise<SyncOutcome> | null = null;
  private generation = 0;
  private started = false;

  /**
   * Registers the session hooks once (called from App): a switch stops the previous profile's
   * auth auto-refresh; an activation resets the status and keeps the new linked profile's
   * session refreshing. Never syncs.
   */
  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.session.registerHooks({
      beforeSwitch: (previous) => {
        if (previous?.cloud) {
          this.cloud.stopAutoRefresh(previous.id);
        }
      },
      afterActivate: (active) => {
        void this.profileChanged();
        if (active?.cloud && !active.cloud.needsReauth) {
          this.cloud.startAutoRefresh(active.id);
        }
      },
    });
  }

  /** Resets the status for a newly active profile and loads its last sync time. */
  async profileChanged(): Promise<void> {
    this.stateSignal.set('idle');
    this.lastSyncedAtSignal.set(null);
    const profileId = this.session.active()?.id ?? null;
    const lastSyncedAt = profileId ? await getMeta<string>(LAST_SYNCED_KEY) : undefined;
    if (profileId && this.session.active()?.id === profileId) {
      this.lastSyncedAtSignal.set(lastSyncedAt ?? null);
    }
  }

  syncNow(): Promise<SyncOutcome> {
    this.inFlight ??= this.run().finally(() => (this.inFlight = null));
    return this.inFlight;
  }

  private async run(): Promise<SyncOutcome> {
    const profile = this.session.active();
    if (!profile?.cloud) {
      return 'skipped';
    }
    if (profile.cloud.needsReauth) {
      this.stateSignal.set('reauth');
      return 'reauth';
    }
    if (!this.connectivity.online()) {
      this.stateSignal.set('offline');
      return 'offline';
    }

    this.stateSignal.set('syncing');
    const run: Run = { profile, generation: ++this.generation, abort: new AbortController() };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), SYNC_TIMEOUT_MS);
    });
    try {
      const outcome = await Promise.race([this.exchange(run), timedOut]);
      if (outcome !== 'timeout') {
        return outcome;
      }
      // Disown the run and cancel its requests, so nothing it does afterwards lands.
      this.generation++;
      run.abort.abort();
      const state = this.connectivity.online() ? 'error' : 'offline';
      if (this.session.active()?.id === profile.id) {
        this.stateSignal.set(state);
      }
      return state;
    } finally {
      clearTimeout(timer);
    }
  }

  private async exchange(run: Run): Promise<SyncOutcome> {
    const { profile } = run;
    const handle = currentDbHandle();
    try {
      const account = await this.cloudAuth.lookupAccount(profile.id);
      this.ensureCurrent(run);
      switch (account.status) {
        case 'gone':
          await this.cloudAuth.forgetGoneAccount(profile.id);
          this.setStateIfCurrent(run, 'idle');
          return 'gone';
        case 'expired':
          throw new AuthExpired();
        case 'offline':
          throw new Offline();
        case 'error':
          throw account.error;
      }
      const client = this.cloud.client(profile.id);
      await this.syncIdentity(client, account.user, run);
      await Promise.all([this.collections.flush(), this.decks.flush(), this.cards.flush()]);
      await this.syncCollections(client, run);
      await this.syncDecks(client, run);
      await this.syncCards(client, run);

      // Captured here (contracts/services.md): the FR-029 fix-up below stamps its moved cards
      // with a fresh updatedAt, strictly after this, so hasUnsyncedChanges sees them and the next
      // sync uploads them.
      const syncedAt = new Date().toISOString();
      this.ensureCurrent(run);
      this.collections.resolveMixedCollections(syncedAt);
      await this.syncPlanarSelection(client, run);

      this.ensureCurrent(run);
      await setMeta(LAST_SYNCED_KEY, syncedAt, handle);
      this.ensureCurrent(run);
      this.lastSyncedAtSignal.set(syncedAt);
      this.stateSignal.set('done');
      return 'done';
    } catch (error) {
      if (error instanceof Superseded || !this.isCurrent(run)) {
        return 'skipped';
      }
      if (error instanceof AuthExpired || isAuthSessionError(error)) {
        await this.cloud.markNeedsReauth(profile.id);
        this.setStateIfCurrent(run, 'reauth');
        return 'reauth';
      }
      if (error instanceof Offline || !this.connectivity.online() || isNetworkError(error)) {
        this.setStateIfCurrent(run, 'offline');
        return 'offline';
      }
      this.setStateIfCurrent(run, 'error');
      return 'error';
    }
  }

  private isCurrent(run: Run): boolean {
    return run.generation === this.generation && this.session.active()?.id === run.profile.id;
  }

  private ensureCurrent(run: Run): void {
    if (!this.isCurrent(run)) {
      throw new Superseded();
    }
  }

  private setStateIfCurrent(run: Run, state: SyncState): void {
    if (this.isCurrent(run)) {
      this.stateSignal.set(state);
    }
  }

  // Colors are last-write-wins across devices; the label records the latest rename (FR-012a).
  private async syncIdentity(client: SupabaseClient, user: User, run: Run): Promise<void> {
    const local = this.profiles.byId(run.profile.id);
    if (!local) {
      throw new Superseded();
    }
    const remote = identityOf(user);
    const result = reconcileIdentity(local, {
      colors: remote.colors,
      colorsAt: remote.colorsAt,
      labelAt: remote.labelAt,
    });
    if (result.write) {
      const { error } = await client.auth.updateUser({ data: result.write });
      if (error) {
        throw error;
      }
    }
    this.ensureCurrent(run);
    if (result.adoptColors) {
      await this.profiles.setColors(local.id, result.adoptColors.colors, result.adoptColors.at);
    }
  }

  private async syncCollections(client: SupabaseClient, run: Run): Promise<void> {
    const signal = run.abort.signal;
    const userId = run.profile.cloud!.userId;
    const { data, error } = await client
      .from('collections')
      .select('id, user_id, name, color, parent_id, updated_at')
      .eq('user_id', userId)
      .abortSignal(signal);
    if (error) {
      throw error;
    }
    this.ensureCurrent(run);
    const local = this.collections.collections();
    const tombstones = await this.collections.getTombstones();
    const remoteRows = data as CollectionRow[];
    const result = reconcileEntities(local, remoteRows.map(collectionFromRow), tombstones);

    // The repair (research R6) drops orphans and renames duplicate siblings before anything is
    // uploaded, so the cloud never keeps a tree this device can see as broken.
    const remoteIds = new Set(remoteRows.map((row) => row.id));
    const repair = repairCollectionTree(result.merged, remoteIds, new Date().toISOString());
    const removedIds = new Set(repair.removedIds);

    const toUpsertRemote = result.toUpsertRemote.filter((collection) => !removedIds.has(collection.id));
    for (const renamed of repair.renamed) {
      const index = toUpsertRemote.findIndex((collection) => collection.id === renamed.id);
      if (index >= 0) {
        toUpsertRemote[index] = renamed;
      } else {
        toUpsertRemote.push(renamed);
      }
    }
    const toDeleteRemoteIds = [
      ...result.toDeleteRemoteIds,
      ...repair.removedIds.filter((id) => remoteIds.has(id)),
    ];

    if (toUpsertRemote.length > 0) {
      const { error: upsertError } = await client
        .from('collections')
        .upsert(
          toUpsertRemote.map((collection) => collectionToRow(collection, userId)),
          { onConflict: 'user_id,id' },
        )
        .abortSignal(signal);
      if (upsertError) {
        throw upsertError;
      }
    }
    if (toDeleteRemoteIds.length > 0) {
      const { error: deleteError } = await client
        .from('collections')
        .delete()
        .eq('user_id', userId)
        .in('id', toDeleteRemoteIds)
        .abortSignal(signal);
      if (deleteError) {
        throw deleteError;
      }
    }

    this.ensureCurrent(run);
    this.collections.applySyncResult(repair.collections);
    await this.collections.clearTombstones(result.tombstonesToClear);
  }

  // Decks (spec 009): reconcile, then rename duplicate names (research R6) before uploading, so
  // two devices never keep two same-named decks.
  private async syncDecks(client: SupabaseClient, run: Run): Promise<void> {
    const signal = run.abort.signal;
    const userId = run.profile.cloud!.userId;
    const { data, error } = await client
      .from('decks')
      .select('id, user_id, name, format, updated_at')
      .eq('user_id', userId)
      .abortSignal(signal);
    if (error) {
      throw error;
    }
    this.ensureCurrent(run);
    const tombstones = await this.decks.getTombstones();
    const remoteRows = data as DeckRow[];
    const result = reconcileEntities(this.decks.decks(), remoteRows.map(deckFromRow), tombstones);
    const repair = repairDeckNames(result.merged, new Set(remoteRows.map((row) => row.id)), new Date().toISOString());

    const toUpsertRemote = [...result.toUpsertRemote];
    for (const renamed of repair.renamed) {
      const index = toUpsertRemote.findIndex((deck) => deck.id === renamed.id);
      if (index >= 0) {
        toUpsertRemote[index] = renamed;
      } else {
        toUpsertRemote.push(renamed);
      }
    }

    if (toUpsertRemote.length > 0) {
      const { error: upsertError } = await client
        .from('decks')
        .upsert(
          toUpsertRemote.map((deck) => deckToRow(deck, userId)),
          { onConflict: 'user_id,id' },
        )
        .abortSignal(signal);
      if (upsertError) {
        throw upsertError;
      }
    }
    if (result.toDeleteRemoteIds.length > 0) {
      const { error: deleteError } = await client
        .from('decks')
        .delete()
        .eq('user_id', userId)
        .in('id', result.toDeleteRemoteIds)
        .abortSignal(signal);
      if (deleteError) {
        throw deleteError;
      }
    }

    this.ensureCurrent(run);
    this.decks.applySyncResult(repair.decks);
    await this.decks.clearTombstones(result.tombstonesToClear);
  }

  private async syncCards(client: SupabaseClient, run: Run): Promise<void> {
    const signal = run.abort.signal;
    const userId = run.profile.cloud!.userId;
    const { data, error } = await client
      .from('card_entries')
      .select('*')
      .eq('user_id', userId)
      .abortSignal(signal);
    if (error) {
      throw error;
    }
    this.ensureCurrent(run);
    const local = this.cards.cards();
    const tombstones = await this.cards.getTombstones();
    const result = reconcileEntities(local, (data as CardEntryRow[]).map(cardFromRow), tombstones);

    if (result.toUpsertRemote.length > 0) {
      const { error: upsertError } = await client
        .from('card_entries')
        .upsert(
          result.toUpsertRemote.map((card) => cardToRow(card, userId)),
          { onConflict: 'user_id,id' },
        )
        .abortSignal(signal);
      if (upsertError) {
        throw upsertError;
      }
    }
    if (result.toDeleteRemoteIds.length > 0) {
      const { error: deleteError } = await client
        .from('card_entries')
        .delete()
        .eq('user_id', userId)
        .in('id', result.toDeleteRemoteIds)
        .abortSignal(signal);
      if (deleteError) {
        throw deleteError;
      }
    }

    this.ensureCurrent(run);
    this.cards.applySyncResult(result.merged);
    await this.cards.clearTombstones(result.tombstonesToClear);
  }

  // One row per account, last-write-wins on updatedAt; never deleted, so no tombstones (FR-021).
  private async syncPlanarSelection(client: SupabaseClient, run: Run): Promise<void> {
    const signal = run.abort.signal;
    const userId = run.profile.cloud!.userId;
    await this.planarSelection.flush();
    const { data, error } = await client
      .from('planechase_selections')
      .select('user_id, disabled_ids, updated_at')
      .eq('user_id', userId)
      .abortSignal(signal);
    if (error) {
      throw error;
    }
    this.ensureCurrent(run);
    const local = this.planarSelection.selection();
    const row = (data as PlanarSelectionRow[])[0];
    // timestamptz comes back as "…+00:00"; ISO keeps the string comparison with the local stamp exact.
    const remote: PlanarSelection | null = row
      ? { disabledIds: row.disabled_ids, updatedAt: new Date(row.updated_at).toISOString() }
      : null;
    const asEntity = (selection: PlanarSelection | null) =>
      selection ? [{ id: PLANAR_SELECTION_ID, ...selection }] : [];
    const result = reconcileEntities(asEntity(local), asEntity(remote), []);

    if (local && result.toUpsertRemote.length > 0) {
      const { error: upsertError } = await client
        .from('planechase_selections')
        .upsert(
          { user_id: userId, disabled_ids: local.disabledIds, updated_at: local.updatedAt },
          { onConflict: 'user_id' },
        )
        .abortSignal(signal);
      if (upsertError) {
        throw upsertError;
      }
    } else if (remote && (!local || remote.updatedAt > local.updatedAt)) {
      this.ensureCurrent(run);
      this.planarSelection.applySyncResult(remote);
    }
  }
}
