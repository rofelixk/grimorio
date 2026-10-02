interface FakeObserver {
  callback: IntersectionObserverCallback;
  targets: Set<Element>;
  root: Element | Document | null;
  self: IntersectionObserver;
}

let instances: FakeObserver[] = [];
let original: { value: typeof IntersectionObserver | undefined; present: boolean } | null = null;

/**
 * jsdom has no `IntersectionObserver`: installs a fake that records each instance's callback,
 * root and observed elements, delivered only by `intersect()`. Call `restoreIntersectionObserver()`
 * after destroying the components under test.
 */
export function installIntersectionObserver(): void {
  original = { value: globalThis.IntersectionObserver, present: 'IntersectionObserver' in globalThis };
  instances = [];
  class FakeIntersectionObserver {
    private readonly entry: FakeObserver;

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.entry = {
        callback,
        targets: new Set(),
        root: options?.root ?? null,
        self: this as unknown as IntersectionObserver,
      };
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

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    value: FakeIntersectionObserver,
    configurable: true,
    writable: true,
  });
}

/** Puts the original `IntersectionObserver` back (or removes it when there was none). */
export function restoreIntersectionObserver(): void {
  if (original?.present) {
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      value: original.value,
      configurable: true,
      writable: true,
    });
  } else {
    delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
  }
  original = null;
  instances = [];
}

/** The roots the live observers were created with (null = the viewport), one per observer that watches `target`. */
export function observerRoots(target: Element): (Element | Document | null)[] {
  return instances.filter(({ targets }) => targets.has(target)).map(({ root }) => root);
}

/** Delivers one entry to every observer currently watching `target`. */
export function intersect(target: Element, isIntersecting = true): void {
  for (const { callback, targets, self } of instances) {
    if (targets.has(target)) {
      callback([{ target, isIntersecting } as IntersectionObserverEntry], self);
    }
  }
}
