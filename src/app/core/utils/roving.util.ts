/**
 * The radio-group key rule (research R8): arrows step to the next or previous option, wrapping;
 * Home and End go to the ends; null for any other key.
 */
export function rovingIndex(key: string, from: number, count: number): number | null {
  const last = count - 1;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return from >= last ? 0 : from + 1;
    case 'ArrowLeft':
    case 'ArrowUp':
      return from <= 0 ? last : from - 1;
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return null;
  }
}
