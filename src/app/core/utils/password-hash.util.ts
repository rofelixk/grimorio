import { PasswordHash } from '@models/profile.model';

const SALT_BYTES = 16;
const HASH_BITS = 256;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, HASH_BITS);
  return new Uint8Array(bits);
}

// PBKDF2-HMAC-SHA-256 with a random 16-byte salt (R3). Profile locking is a privacy
// convenience between people sharing a device, so a standard KDF is enough.
export async function hashPassword(password: string, iterations: number): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, iterations);
  return { algo: 'PBKDF2-SHA256', iterations, salt: toBase64(salt), hash: toBase64(hash) };
}

// Re-derives with the stored salt and iteration count, then compares every byte so the
// comparison time doesn't depend on where the first mismatch is.
export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const expected = fromBase64(stored.hash);
  const actual = await derive(password, fromBase64(stored.salt), stored.iterations);
  if (actual.length !== expected.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual[i] ^ expected[i];
  }
  return diff === 0;
}
