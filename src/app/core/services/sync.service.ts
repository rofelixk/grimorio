import { Injectable, inject, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { CardEntry, CardFace } from '@models/card.model';
import { ProfileSummary } from '@models/profile.model';
import { StorageLocation } from '@models/storage-location.model';
import { currentDbHandle, getMeta, setMeta } from '../db/entity-store';
import { reconcileEntities } from '../utils/sync-reconcile.util';
import { CardService } from './card.service';
import { CloudSessionService } from './cloud-session.service';
import { ConnectivityService } from './connectivity.service';
import { ProfileSessionService } from './profile-session.service';
import { StorageLocationService } from './storage-location.service';

interface StorageLocationRow {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  color: string | null;
  updated_at: string;
}

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

export type SyncState = 'idle' | 'syncing' | 'done' | 'offline' | 'reauth' | 'error';
/** How a syncNow() call ended; 'skipped' = nothing to sync (unlinked, or the profile changed). */
export type SyncOutcome = 'done' | 'offline' | 'reauth' | 'error' | 'skipped';

const LAST_SYNCED_KEY = 'lastSyncedAt';
const AUTH_ERROR_CODES = new Set([
  'session_not_found',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'bad_jwt',
  'PGRST301',
  'PGRST302',
  'PGRST303',
]);

function locationToRow(location: StorageLocation, userId: string): StorageLocationRow {
  return {
    id: location.id,
    user_id: userId,
    name: location.name,
    parent_id: location.parentId,
    color: location.color ?? null,
    updated_at: location.updatedAt,
  };
}

function locationFromRow(row: StorageLocationRow): StorageLocation {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    color: (row.color as StorageLocation['color']) ?? undefined,
    updatedAt: row.updated_at,
  };
}

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

class AuthExpired extends Error {}
class ProfileChanged extends Error {}

function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const { code, status } = error as { code?: unknown; status?: unknown };
  return (typeof code === 'string' && AUTH_ERROR_CODES.has(code)) || status === 401 || status === 403;
}

function isNetworkError(error: unknown): boolean {
  const { name, message } = (error ?? {}) as { name?: unknown; message?: unknown };
  return (
    name === 'AuthRetryableFetchError' ||
    (typeof message === 'string' && /failed to fetch|networkerror|load failed/i.test(message))
  );
}

// Syncs the active profile's locations and cards with its linked account (R11), reusing the
// per-item last-write-wins reconciler. Decks never sync. Single-flight, and a sync started for
// one profile never applies its results after a switch to another.
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly session = inject(ProfileSessionService);
  private readonly cloud = inject(CloudSessionService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly cards = inject(CardService);
  private readonly locations = inject(StorageLocationService);

  private readonly stateSignal = signal<SyncState>('idle');
  readonly state = this.stateSignal.asReadonly();
  private readonly lastSyncedAtSignal = signal<string | null>(null);
  readonly lastSyncedAt = this.lastSyncedAtSignal.asReadonly();

  private inFlight: Promise<SyncOutcome> | null = null;

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
    const handle = currentDbHandle();
    try {
      const client = this.cloud.client(profile.id);
      const { data, error } = await client.auth.getSession();
      if (error || !data.session) {
        throw new AuthExpired();
      }
      await Promise.all([this.locations.flush(), this.cards.flush()]);
      // Locations first: card_entries.location_id references storage_locations.
      await this.syncLocations(client, profile);
      await this.syncCards(client, profile);

      const syncedAt = new Date().toISOString();
      await setMeta(LAST_SYNCED_KEY, syncedAt, handle);
      this.ensureStillActive(profile);
      this.lastSyncedAtSignal.set(syncedAt);
      this.stateSignal.set('done');
      return 'done';
    } catch (error) {
      if (error instanceof ProfileChanged) {
        return 'skipped';
      }
      if (error instanceof AuthExpired || isAuthError(error)) {
        await this.cloud.markNeedsReauth(profile.id);
        this.setStateIfActive(profile, 'reauth');
        return 'reauth';
      }
      if (!this.connectivity.online() || isNetworkError(error)) {
        this.setStateIfActive(profile, 'offline');
        return 'offline';
      }
      this.setStateIfActive(profile, 'error');
      return 'error';
    }
  }

  private ensureStillActive(profile: ProfileSummary): void {
    if (this.session.active()?.id !== profile.id) {
      throw new ProfileChanged();
    }
  }

  private setStateIfActive(profile: ProfileSummary, state: SyncState): void {
    if (this.session.active()?.id === profile.id) {
      this.stateSignal.set(state);
    }
  }

  private async syncLocations(client: SupabaseClient, profile: ProfileSummary): Promise<void> {
    const userId = profile.cloud!.userId;
    const { data, error } = await client
      .from('storage_locations')
      .select('id, user_id, name, parent_id, color, updated_at')
      .eq('user_id', userId);
    if (error) {
      throw error;
    }
    this.ensureStillActive(profile);
    const local = this.locations.locations();
    const tombstones = await this.locations.getTombstones();
    const result = reconcileEntities(local, (data as StorageLocationRow[]).map(locationFromRow), tombstones);

    if (result.toUpsertRemote.length > 0) {
      const { error: upsertError } = await client
        .from('storage_locations')
        .upsert(
          result.toUpsertRemote.map((location) => locationToRow(location, userId)),
          { onConflict: 'user_id,id' },
        );
      if (upsertError) {
        throw upsertError;
      }
    }
    if (result.toDeleteRemoteIds.length > 0) {
      const { error: deleteError } = await client
        .from('storage_locations')
        .delete()
        .eq('user_id', userId)
        .in('id', result.toDeleteRemoteIds);
      if (deleteError) {
        throw deleteError;
      }
    }

    this.ensureStillActive(profile);
    this.locations.applySyncResult(result.merged);
    await this.locations.clearTombstones(result.tombstonesToClear);
  }

  private async syncCards(client: SupabaseClient, profile: ProfileSummary): Promise<void> {
    const userId = profile.cloud!.userId;
    const { data, error } = await client.from('card_entries').select('*').eq('user_id', userId);
    if (error) {
      throw error;
    }
    this.ensureStillActive(profile);
    const local = this.cards.cards();
    const tombstones = await this.cards.getTombstones();
    const result = reconcileEntities(local, (data as CardEntryRow[]).map(cardFromRow), tombstones);

    if (result.toUpsertRemote.length > 0) {
      const { error: upsertError } = await client
        .from('card_entries')
        .upsert(
          result.toUpsertRemote.map((card) => cardToRow(card, userId)),
          { onConflict: 'user_id,id' },
        );
      if (upsertError) {
        throw upsertError;
      }
    }
    if (result.toDeleteRemoteIds.length > 0) {
      const { error: deleteError } = await client
        .from('card_entries')
        .delete()
        .eq('user_id', userId)
        .in('id', result.toDeleteRemoteIds);
      if (deleteError) {
        throw deleteError;
      }
    }

    this.ensureStillActive(profile);
    this.cards.applySyncResult(result.merged);
    await this.cards.clearTombstones(result.tombstonesToClear);
  }
}
