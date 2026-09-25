import { MSG } from './entry-copy';

export type FieldKey = 'email' | 'pw' | 'code' | 'user';

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

function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (name === 'AuthRetryableFetchError') {
    return true;
  }
  // fetch() rejects with a TypeError ("Failed to fetch", "NetworkError…", "Load failed").
  return error instanceof TypeError && typeof message === 'string' && /fetch|network|load failed/i.test(message);
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
    default:
      return GENERIC_FAILURE;
  }
}
