import type { SyncState } from '../services/sync.service';
import { SYNC_AREA } from './entry-copy';

export type SyncDisplayKind = 'syncing' | 'synced' | 'last' | 'never' | 'local' | 'offline' | 'expired' | 'error';
export type SyncAction = 'sync' | 'retry' | 'reauth' | 'link' | null;

/** What the shell shows for the active profile's sync status (FR-007). */
export interface SyncDisplay {
  kind: SyncDisplayKind;
  label: string;
  /** null only while syncing. */
  action: SyncAction;
  actionLabel: string | null;
  /** offline | expired | error: shown in the danger color (FR-007a). */
  failure: boolean;
  /** reauth | link open the entry modal, so the drawer closes first (FR-020a). */
  opensModal: boolean;
}

/** "Sincronizado" lasts this long after a successful sync, then turns into "há N min". */
export const SYNCED_WINDOW_MS = 5 * 60_000;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const ACTION_LABEL: Record<Exclude<SyncAction, null>, string> = {
  sync: SYNC_AREA.actSync,
  retry: SYNC_AREA.actRetry,
  reauth: SYNC_AREA.actReauth,
  link: SYNC_AREA.actLink,
};

/** "há N min" (at least 1) under an hour, "há N h" under a day, else "há N d". */
export function relativeSince(fromIso: string, now: number): string {
  const elapsed = Math.max(0, now - Date.parse(fromIso));
  if (elapsed < HOUR_MS) {
    return `há ${Math.max(1, Math.floor(elapsed / MINUTE_MS))} min`;
  }
  if (elapsed < DAY_MS) {
    return `há ${Math.floor(elapsed / HOUR_MS)} h`;
  }
  return `há ${Math.floor(elapsed / DAY_MS)} d`;
}

function display(kind: SyncDisplayKind, label: string, action: SyncAction): SyncDisplay {
  return {
    kind,
    label,
    action,
    actionLabel: action ? ACTION_LABEL[action] : null,
    failure: kind === 'offline' || kind === 'expired' || kind === 'error',
    opensModal: action === 'reauth' || action === 'link',
  };
}

/** The first matching rule of data-model.md's "Sync display" table wins. */
export function syncDisplay(input: {
  linked: boolean;
  state: SyncState;
  lastSyncedAt: string | null;
  now: number;
}): SyncDisplay {
  const { linked, state, lastSyncedAt, now } = input;
  switch (state) {
    case 'syncing':
      return display('syncing', SYNC_AREA.syncing, null);
    case 'offline':
      return display('offline', SYNC_AREA.offline, 'retry');
    case 'reauth':
      return display('expired', SYNC_AREA.expired, 'reauth');
    case 'error':
      return display('error', SYNC_AREA.error, 'retry');
  }
  if (!linked) {
    return display('local', SYNC_AREA.local, 'link');
  }
  if (lastSyncedAt === null) {
    return display('never', SYNC_AREA.never, 'sync');
  }
  if (now - Date.parse(lastSyncedAt) < SYNCED_WINDOW_MS) {
    return display('synced', SYNC_AREA.synced, 'sync');
  }
  return display('last', SYNC_AREA.last(relativeSince(lastSyncedAt, now)), 'sync');
}
