interface FakeObserver {
  callback: ResizeObserverCallback;
  targets: Set<Element>;
  self: ResizeObserver;
}

let instances: FakeObserver[] = [];
let original: { value: typeof ResizeObserver | undefined; present: boolean } | null = null;

/**
 * jsdom has no `ResizeObserver`: installs a fake that records each instance's callback and
 * observed elements, delivered only by `notifyResize()`. jsdom has no layout either, so specs set
 * `offsetHeight` with `Object.defineProperty`. Call `restoreResizeObserver()` after destroying the
 * components under test.
 */
export function installResizeObserver(): void {
  original = { value: globalThis.ResizeObserver, present: 'ResizeObserver' in globalThis };
  instances = [];
  class FakeResizeObserver {
    private readonly entry: FakeObserver;

    constructor(callback: ResizeObserverCallback) {
      this.entry = { callback, targets: new Set(), self: this as unknown as ResizeObserver };
      instances.push(this.entry);
    }

    observe(target: Element): void {
      this.entry.targets.add(target);
    }

    unobserve(target: Element): void {
      this.entry.targets.delete(target);
    }

    disconnect(): void {
      this.entry.targets.clear();
    }
  }
  Object.defineProperty(globalThis, 'ResizeObserver', { value: FakeResizeObserver, configurable: true, writable: true });
}

/** Puts the original `ResizeObserver` back (or removes it when there was none). */
export function restoreResizeObserver(): void {
  if (original?.present) {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: original.value, configurable: true, writable: true });
  } else {
    delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
  }
  original = null;
  instances = [];
}

/**
 * Delivers one observation to every instance observing `target`, or to every instance with any
 * observed element when omitted.
 */
export function notifyResize(target?: Element): void {
  for (const { callback, targets, self } of instances) {
    const hit = target ? (targets.has(target) ? [target] : []) : [...targets];
    if (hit.length) {
      callback(
        hit.map((element) => ({ target: element }) as ResizeObserverEntry),
        self,
      );
    }
  }
}
