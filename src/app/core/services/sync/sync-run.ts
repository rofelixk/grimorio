import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProfileSummary } from '@models/profile.model';

/** One sync attempt: its generation disowns it once it times out or another run starts. */
export interface Run {
  profile: ProfileSummary;
  generation: number;
  abort: AbortController;
}

export class AuthExpired extends Error {}
export class Offline extends Error {}
/** The run no longer owns the outcome: the profile changed, or the run timed out. */
export class Superseded extends Error {}

/** What a sync step needs from its run. */
export interface SyncStepContext {
  client: SupabaseClient;
  userId: string;
  signal: AbortSignal;
  /** Throws Superseded once the run is disowned (switch, timeout). */
  ensureCurrent(): void;
}
