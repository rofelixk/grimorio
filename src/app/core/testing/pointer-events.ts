export interface PointerInit {
  pointerType?: string;
  clientX?: number;
  clientY?: number;
  button?: number;
}

/**
 * A synthetic pointer event for specs (spec 007 R10). jsdom may lack `PointerEvent`; then it's a
 * `MouseEvent` carrying a `pointerType` property, which is all the handlers read.
 */
export function pointerEvent(type: string, { pointerType = 'mouse', clientX = 0, clientY = 0, button = 0 }: PointerInit = {}): Event {
  const init = { bubbles: !type.endsWith('enter') && !type.endsWith('leave'), cancelable: true, clientX, clientY, button };
  if (typeof PointerEvent === 'function') {
    return new PointerEvent(type, { ...init, pointerType });
  }
  const event = new MouseEvent(type, init);
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  return event;
}
