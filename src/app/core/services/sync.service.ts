import { Injectable, computed, inject, signal } from '@angular/core';
import { CardEntry, CardFace } from '@models/card.model';
import { StorageLocation } from '@models/storage-location.model';
import { AuthService } from '@services/auth.service';
import { CardService } from '@services/card.service';
import { StorageLocationService } from '@services/storage-location.service';
import { reconcileEntities } from '../utils/sync-reconcile.util';
import { SUPABASE_CLIENT } from '../supabase-client';

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

export interface SyncResult {
  locationsPushed: number;
  locationsPulled: number;
  locationsDeletedRemote: number;
  cardsPushed: number;
  cardsPulled: number;
  cardsDeletedRemote: number;
}

export type SyncStatus = 'fresh' | 'stale' | 'syncing' | 'error';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);
  private readonly cardService = inject(CardService);
  private readonly locationService = inject(StorageLocationService);

  private readonly storageKey = 'grimorio.lastSyncedAt';
  private readonly lastSyncedAtSignal = signal<string | null>(localStorage.getItem(this.storageKey));
  readonly lastSyncedAt = this.lastSyncedAtSignal.asReadonly();

  private readonly phaseSignal = signal<'idle' | 'syncing' | 'error'>('idle');
  // Ticks hourly so `status`/`staleLabel` recompute in a tab left open across
  // a day boundary, instead of only re-deriving on the next sync/reload.
  private readonly nowSignal = signal(Date.now());

  readonly status = computed<SyncStatus>(() => {
    const phase = this.phaseSignal();
    if (phase === 'syncing' || phase === 'error') {
      return phase;
    }
    const last = this.lastSyncedAtSignal();
    if (!last) {
      return 'stale';
    }
    const age = this.nowSignal() - new Date(last).getTime();
    return age < STALE_THRESHOLD_MS ? 'fresh' : 'stale';
  });

  readonly staleLabel = computed<string>(() => {
    const last = this.lastSyncedAtSignal();
    if (!last) {
      return 'Nunca sincronizado · Sincronizar';
    }
    const ageDays = Math.floor((this.nowSignal() - new Date(last).getTime()) / DAY_MS);
    if (ageDays <= 1) {
      return 'Há 1 dia · Sincronizar';
    }
    if (ageDays <= 6) {
      return `Há ${ageDays} dias · Sincronizar`;
    }
    return 'Há semanas · Sincronizar';
  });

  constructor() {
    setInterval(() => this.nowSignal.set(Date.now()), HOUR_MS);
  }

  // Manually triggered only — no automatic/background sync. Locations are
  // reconciled and pushed before cards since card_entries.location_id has a
  // foreign key into storage_locations.
  async sync(): Promise<SyncResult> {
    this.phaseSignal.set('syncing');
    try {
      const result = await this.performSync();
      const syncedAt = new Date().toISOString();
      this.lastSyncedAtSignal.set(syncedAt);
      localStorage.setItem(this.storageKey, syncedAt);
      this.phaseSignal.set('idle');
      return result;
    } catch (e) {
      this.phaseSignal.set('error');
      throw e;
    }
  }

  private async performSync(): Promise<SyncResult> {
    const userId = this.auth.user()?.id;
    if (!userId) {
      throw new Error('Sync requires a signed-in account.');
    }

    const { locationsPushed, locationsPulled, locationsDeletedRemote } = await this.syncLocations(userId);
    const { cardsPushed, cardsPulled, cardsDeletedRemote } = await this.syncCards(userId);

    return {
      locationsPushed,
      locationsPulled,
      locationsDeletedRemote,
      cardsPushed,
      cardsPulled,
      cardsDeletedRemote,
    };
  }

  private async syncLocations(
    userId: string,
  ): Promise<{ locationsPushed: number; locationsPulled: number; locationsDeletedRemote: number }> {
    const { data, error } = await this.supabase
      .from('storage_locations')
      .select('id, user_id, name, parent_id, color, updated_at')
      .eq('user_id', userId);
    if (error) {
      throw new Error(error.message);
    }

    const remote = (data as StorageLocationRow[]).map(locationFromRow);
    const local = this.locationService.locations();
    const tombstones = this.locationService.getTombstones();

    const { merged, toUpsertRemote, toDeleteRemoteIds, tombstonesToClear } = reconcileEntities(
      local,
      remote,
      tombstones,
    );

    if (toUpsertRemote.length > 0) {
      const { error: upsertError } = await this.supabase
        .from('storage_locations')
        .upsert(toUpsertRemote.map((location) => locationToRow(location, userId)));
      if (upsertError) {
        throw new Error(upsertError.message);
      }
    }

    if (toDeleteRemoteIds.length > 0) {
      const { error: deleteError } = await this.supabase
        .from('storage_locations')
        .delete()
        .in('id', toDeleteRemoteIds);
      if (deleteError) {
        throw new Error(deleteError.message);
      }
    }

    this.locationService.applySyncResult(merged);
    this.locationService.clearTombstones(tombstonesToClear);

    const localIds = new Set(local.map((location) => location.id));
    return {
      locationsPushed: toUpsertRemote.length,
      locationsPulled: merged.filter((location) => !localIds.has(location.id)).length,
      locationsDeletedRemote: toDeleteRemoteIds.length,
    };
  }

  private async syncCards(
    userId: string,
  ): Promise<{ cardsPushed: number; cardsPulled: number; cardsDeletedRemote: number }> {
    const { data, error } = await this.supabase.from('card_entries').select('*').eq('user_id', userId);
    if (error) {
      throw new Error(error.message);
    }

    const remote = (data as CardEntryRow[]).map(cardFromRow);
    const local = this.cardService.cards();
    const tombstones = this.cardService.getTombstones();

    const { merged, toUpsertRemote, toDeleteRemoteIds, tombstonesToClear } = reconcileEntities(
      local,
      remote,
      tombstones,
    );

    if (toUpsertRemote.length > 0) {
      const { error: upsertError } = await this.supabase
        .from('card_entries')
        .upsert(toUpsertRemote.map((card) => cardToRow(card, userId)));
      if (upsertError) {
        throw new Error(upsertError.message);
      }
    }

    if (toDeleteRemoteIds.length > 0) {
      const { error: deleteError } = await this.supabase.from('card_entries').delete().in('id', toDeleteRemoteIds);
      if (deleteError) {
        throw new Error(deleteError.message);
      }
    }

    this.cardService.applySyncResult(merged);
    this.cardService.clearTombstones(tombstonesToClear);

    const localIds = new Set(local.map((card) => card.id));
    return {
      cardsPushed: toUpsertRemote.length,
      cardsPulled: merged.filter((card) => !localIds.has(card.id)).length,
      cardsDeletedRemote: toDeleteRemoteIds.length,
    };
  }
}
