import { vi } from 'vitest';

/**
 * Makes the next IndexedDB `put` throw (a full disk) and silences the failure's console.error.
 * Later puts run normally. Returns a restore.
 */
export function failNextPut(): () => void {
  const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
    throw new DOMException('The disk is full.', 'QuotaExceededError');
  });
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  return () => {
    put.mockRestore();
    log.mockRestore();
  };
}
