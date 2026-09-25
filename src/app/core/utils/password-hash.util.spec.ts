import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password-hash.util';

const ITERATIONS = 10;

describe('password-hash.util', () => {
  it('verifies the password it hashed', async () => {
    const stored = await hashPassword('grimorio123', ITERATIONS);

    expect(stored.algo).toBe('PBKDF2-SHA256');
    expect(await verifyPassword('grimorio123', stored)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await hashPassword('grimorio123', ITERATIONS);

    expect(await verifyPassword('grimorio124', stored)).toBe(false);
    expect(await verifyPassword('', stored)).toBe(false);
  });

  it('never stores the password itself and salts every hash differently', async () => {
    const a = await hashPassword('grimorio123', ITERATIONS);
    const b = await hashPassword('grimorio123', ITERATIONS);

    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
    expect(JSON.stringify(a)).not.toContain('grimorio123');
  });

  it('honors the stored iteration count', async () => {
    const stored = await hashPassword('grimorio123', 7);

    expect(stored.iterations).toBe(7);
    expect(await verifyPassword('grimorio123', stored)).toBe(true);
    expect(await verifyPassword('grimorio123', { ...stored, iterations: 8 })).toBe(false);
  });
});
