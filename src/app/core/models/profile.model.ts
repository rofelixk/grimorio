import { Color } from './card.model';

export type { Color };

/** A profile's link to a cloud account (Supabase Auth). The session tokens live under
 * localStorage `grm-cloud:{profileId}`, managed by supabase-js — never in this record. */
export interface CloudLink {
  /** Supabase `auth.users.id`. At most one profile per device holds a given userId (FR-016, FR-033). */
  userId: string;
  /** Shown on the account plate and in success copy — never as the person's name (FR-015). */
  email: string;
  /** Set when the stored session is dead; pauses automatic sync until reauth (FR-032). */
  needsReauth: boolean;
}

/** PBKDF2-HMAC-SHA-256 derivation of a local profile password (FR-009). */
export interface PasswordHash {
  algo: 'PBKDF2-SHA256';
  iterations: number;
  /** base64 */
  salt: string;
  /** base64 */
  hash: string;
}

/** A local profile as stored in the `grimorio-device` registry. */
export interface ProfileRecord {
  /** UUID; also names the profile's database (`grimorio-profile-{id}`) and session key. */
  id: string;
  /** 3–20 chars, `^[A-Za-z0-9_.-]+$`, unique per device compared with `toLowerCase()`
   * (FR-003); trimmed before storing. */
  name: string;
  /** 1–3 distinct values of `W U B R G`, in pick order (FR-026): primary, accent, tertiary. */
  colors: Color[];
  /** Never exposed outside ProfileStore (FR-009). */
  password: PasswordHash;
  /** `null` = "Só neste aparelho". */
  cloud: CloudLink | null;
  /** ISO timestamp; list order. */
  createdAt: string;
}

/** A profile as every consumer outside ProfileStore sees it: the password hash stripped. */
export type ProfileSummary = Omit<ProfileRecord, 'password'>;
