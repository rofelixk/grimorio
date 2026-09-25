import { Injectable, inject } from '@angular/core';
import { SupabaseClient, SupportedStorage, createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../supabase-client';
import { ProfileStore } from './profile-store.service';

export function cloudStorageKey(profileId: string): string {
  return `grm-cloud:${profileId}`;
}

function memoryStorage(): SupportedStorage {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

let transientCount = 0;

// One Supabase auth session per linked profile (R4). Each profile gets its own client with its
// own storage key, so switching or signing out of a profile never ends another profile's cloud
// sign-in (FR-016). Only the active profile's client keeps its tokens refreshed.
@Injectable({ providedIn: 'root' })
export class CloudSessionService {
  private readonly profiles = inject(ProfileStore);

  private readonly clients = new Map<string, SupabaseClient>();
  private readonly unlinking = new Set<string>();

  /** The profile's own client, created lazily. Sessions persist under `grm-cloud:{id}`. */
  client(profileId: string): SupabaseClient {
    let client = this.clients.get(profileId);
    if (!client) {
      client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storageKey: cloudStorageKey(profileId),
          persistSession: true,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      // A session that ends without an unlink (refresh token revoked, password changed
      // elsewhere) pauses sync until the person signs in again (R5, FR-032).
      client.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT' && !this.unlinking.has(profileId)) {
          void this.markNeedsReauth(profileId);
        }
      });
      this.clients.set(profileId, client);
    }
    return client;
  }

  /**
   * A throwaway client with in-memory storage, for a cloud sign-in that isn't bound to a
   * profile yet (device/gate context, reset codes). Its session is moved onto a profile's
   * client with `setSession` once the profile is known.
   */
  transient(): SupabaseClient {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: memoryStorage(),
        storageKey: `grm-pending-${transientCount++}`,
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  startAutoRefresh(profileId: string): void {
    void this.client(profileId).auth.startAutoRefresh();
  }

  stopAutoRefresh(profileId: string): void {
    void this.clients.get(profileId)?.auth.stopAutoRefresh();
  }

  async markNeedsReauth(profileId: string): Promise<void> {
    const profile = this.profiles.byId(profileId);
    if (profile?.cloud && !profile.cloud.needsReauth) {
      this.stopAutoRefresh(profileId);
      await this.profiles.setCloud(profileId, { ...profile.cloud, needsReauth: true });
    }
  }

  /** Runs `fn` while SIGNED_OUT events for this profile mean "unlinking", not "expired". */
  async whileUnlinking<T>(profileId: string, fn: () => Promise<T>): Promise<T> {
    this.unlinking.add(profileId);
    try {
      return await fn();
    } finally {
      this.unlinking.delete(profileId);
    }
  }

  /** Forgets the profile's client and clears its stored session. */
  removeSession(profileId: string): void {
    this.stopAutoRefresh(profileId);
    this.clients.delete(profileId);
    const prefix = cloudStorageKey(profileId);
    try {
      for (const key of Object.keys(localStorage)) {
        if (key === prefix || key.startsWith(`${prefix}-`)) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Storage unavailable — nothing persisted to clear.
    }
  }
}
