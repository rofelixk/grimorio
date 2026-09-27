import { MSG } from './entry-copy';

export type FieldKey = 'email' | 'pw' | 'pwNew' | 'pwConfirm' | 'code' | 'user';

export type Failure =
  | { kind: 'field'; field: FieldKey; message: string; emailInUse?: true }
  | { kind: 'form'; message: string };

export const OFFLINE_FAILURE: Failure = { kind: 'form', message: MSG.offline };
export const GENERIC_FAILURE: Failure = { kind: 'form', message: MSG.generic };

export function isFailure(value: unknown): value is Failure {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const v = value as { kind?: unknown; message?: unknown };
  return (v.kind === 'form' || v.kind === 'field') && typeof v.message === 'string';
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** Codes (and 401/403) meaning the stored cloud session is dead: the profile needs "Entrar de novo". */
const AUTH_SESSION_CODES = new Set([
  'session_not_found',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'bad_jwt',
  'PGRST301',
  'PGRST302',
  'PGRST303',
]);

export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const { code, status, name } = error as { code?: unknown; status?: unknown; name?: unknown };
  return (
    (typeof code === 'string' && AUTH_SESSION_CODES.has(code)) ||
    status === 401 ||
    status === 403 ||
    name === 'AuthSessionMissingError'
  );
}

export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (name === 'AuthRetryableFetchError') {
    return true;
  }
  if (typeof message !== 'string') {
    return false;
  }
  // fetch() rejects with a TypeError ("Failed to fetch", "NetworkError…", "Load failed");
  // PostgREST wraps the same failure in a plain error object.
  return (
    (error instanceof TypeError && /fetch|network|load failed/i.test(message)) ||
    /failed to fetch|networkerror|load failed/i.test(message)
  );
}

// Maps any Supabase/network error to PT-BR copy (R8, Principle II). Keys on AuthError.code;
// raw `error.message` is never returned.
export function mapCloudError(error: unknown): Failure {
  if (isFailure(error)) {
    return error;
  }
  if (isOffline() || isNetworkError(error)) {
    return OFFLINE_FAILURE;
  }
  const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : undefined;
  switch (code) {
    case 'invalid_credentials':
      return { kind: 'form', message: MSG.wrongCloud };
    case 'user_already_exists':
    case 'email_exists':
      return { kind: 'field', field: 'email', message: MSG.emailInUse, emailInUse: true };
    case 'otp_expired':
    case 'invalid_otp':
    case 'otp_disabled':
      return { kind: 'field', field: 'code', message: MSG.codeWrong };
    case 'weak_password':
      return { kind: 'field', field: 'pw', message: MSG.pwMin };
    case 'same_password':
      return { kind: 'field', field: 'pwNew', message: MSG.samePassword };
    default:
      return GENERIC_FAILURE;
  }
}
