import { afterEach, describe, expect, it, vi } from 'vitest';
import { MSG } from './entry-copy';
import { mapCloudError } from './cloud-error.util';

const RAW = 'raw backend text that must never reach the UI';

function authError(code: string) {
  return { name: 'AuthApiError', code, status: 400, message: RAW };
}

describe('mapCloudError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps wrong credentials to the one generic form message', () => {
    expect(mapCloudError(authError('invalid_credentials'))).toEqual({ kind: 'form', message: MSG.wrongCloud });
  });

  it.each(['user_already_exists', 'email_exists'])('maps %s to the e-mail field with the in-use flag', (code) => {
    expect(mapCloudError(authError(code))).toEqual({
      kind: 'field',
      field: 'email',
      message: MSG.emailInUse,
      emailInUse: true,
    });
  });

  it.each(['otp_expired', 'invalid_otp', 'otp_disabled'])('maps %s to the code field', (code) => {
    expect(mapCloudError(authError(code))).toEqual({ kind: 'field', field: 'code', message: MSG.codeWrong });
  });

  it('maps a weak password to the password field', () => {
    expect(mapCloudError(authError('weak_password'))).toEqual({ kind: 'field', field: 'pw', message: MSG.pwMin });
  });

  it('maps a retryable fetch error to the offline message', () => {
    expect(mapCloudError({ name: 'AuthRetryableFetchError', message: RAW })).toEqual({
      kind: 'form',
      message: MSG.offline,
    });
  });

  it('maps a failed fetch to the offline message', () => {
    expect(mapCloudError(new TypeError('Failed to fetch'))).toEqual({ kind: 'form', message: MSG.offline });
  });

  it('maps anything while the browser is offline to the offline message', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    expect(mapCloudError(authError('invalid_credentials'))).toEqual({ kind: 'form', message: MSG.offline });
  });

  it.each([authError('over_email_send_rate_limit'), authError('unexpected_failure'), new Error(RAW), null, 'x'])(
    'falls back to the generic message for %o',
    (error) => {
      expect(mapCloudError(error)).toEqual({ kind: 'form', message: MSG.generic });
    },
  );

  it('never returns the raw backend message', () => {
    const codes = ['invalid_credentials', 'email_exists', 'otp_expired', 'weak_password', 'anything'];
    for (const code of codes) {
      expect(JSON.stringify(mapCloudError(authError(code)))).not.toContain(RAW);
    }
  });

  it('passes an already-mapped failure through', () => {
    const failure = { kind: 'form' as const, message: MSG.linkedElsewhere('bia') };
    expect(mapCloudError(failure)).toBe(failure);
  });
});
