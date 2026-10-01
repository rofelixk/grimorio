import { describe, expect, it } from 'vitest';
import { rovingIndex } from './roving.util';

describe('rovingIndex', () => {
  it('steps to the next option, wrapping at the end', () => {
    expect(rovingIndex('ArrowRight', 0, 3)).toBe(1);
    expect(rovingIndex('ArrowDown', 1, 3)).toBe(2);
    expect(rovingIndex('ArrowRight', 2, 3)).toBe(0);
    expect(rovingIndex('ArrowDown', 2, 3)).toBe(0);
  });

  it('steps to the previous option, wrapping at the start', () => {
    expect(rovingIndex('ArrowLeft', 2, 3)).toBe(1);
    expect(rovingIndex('ArrowUp', 1, 3)).toBe(0);
    expect(rovingIndex('ArrowLeft', 0, 3)).toBe(2);
    expect(rovingIndex('ArrowUp', 0, 3)).toBe(2);
  });

  it('jumps to the ends with Home and End', () => {
    expect(rovingIndex('Home', 2, 3)).toBe(0);
    expect(rovingIndex('End', 0, 3)).toBe(2);
  });

  it('returns null for any other key', () => {
    expect(rovingIndex('Tab', 0, 3)).toBeNull();
    expect(rovingIndex('a', 0, 3)).toBeNull();
    expect(rovingIndex('Enter', 0, 3)).toBeNull();
  });
});
