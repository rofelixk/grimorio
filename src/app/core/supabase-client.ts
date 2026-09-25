import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Public URL + anon/publishable key — safe to ship client-side. RLS restricts
// every table to read-only reference data (cards/printings) or auth.uid()-scoped
// rows (storage_locations/card_entries, reached only through a profile's own client).
export const SUPABASE_URL = 'https://hyzbkxraanzhdyhtnadf.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5emJreHJhYW56aGR5aHRuYWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0OTE0MjUsImV4cCI6MjEwNDA2NzQyNX0.L1kt6F5SxaYtlKaMpywfNRkrms3FlNkP1Tqdpblz2hA';

// The shared catalog client (CardLookupService) is anonymous-only (R4): it never holds or
// refreshes a session, and its distinct storage key keeps it apart from the per-profile
// cloud clients (CloudSessionService).
export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('SUPABASE_CLIENT', {
  providedIn: 'root',
  factory: () =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'grm-catalog' },
    }),
});
