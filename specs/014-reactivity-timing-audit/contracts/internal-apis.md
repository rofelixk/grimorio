# Contracts: internal APIs changed by the audit

**Feature**: [spec.md](spec.md) | **Data model**: [data-model.md](../data-model.md)

Grimorio exposes no external API. These are the in-repo contracts whose shape changes, so callers and specs know what to rely on. Everything not listed keeps its current contract.

## `PageChange<P>` and `injectPageChange` (`shared/effects/page-sweep/page-change.ts`)

```ts
class PageChange<P> {
  constructor(
    rule: PageRule<P>,
    reducedMotion: Signal<boolean>,
    target: () => P | null,          // NEW: the routed place, null while missing
    nav: () => PageNav | null,       // read untracked when the target changes
  );
  readonly shown: Signal<P>;
  readonly leaving: Signal<P | null>;
  readonly run: Signal<SweepRun | null>;
  readonly reducedMotion: Signal<boolean>;
  end(run: SweepRun): void;          // unchanged: ignored unless `run` is current
  // go(to) — REMOVED: moving is setting the target
}

function injectPageChange<P>(options: PageRule<P> & { target: () => P | null }): PageChange<P>;
```

- `injectPageChange` keeps its signature. It no longer subscribes to router events and creates no effect. Its `nav` reads `Router.currentNavigation() ?? Router.lastSuccessfulNavigation()` and returns `{ trigger, info: extras.info }`.
- Guarantee: `shown()`, `leaving()` and `run()` are current on the first read after `target` changes, with no change detection in between.

## `SweepLoop` (`shared/effects/page-sweep/sweep-loop.ts`)

```ts
@Injectable() class SweepLoop {          // provided by PageSweep; injects the host ElementRef
  start(
    dir: SweepDir,
    page: { layer: () => HTMLElement | null; dust: () => HTMLCanvasElement | null },
    onCrossed: () => void,
  ): void;
  settle(): void;
  stop(): void;
  // attach(canvas, host) — REMOVED
}
```

- `onCrossed` runs at most once per `start`, on the drawn frame where the front completes (`elapsed >= SWEEP_MS`). It never runs after `settle()`, `stop()`, another `start()` or destroy.
- `SWEEP_MS` stays exported.

## `@testing/cross-tab` (`core/testing/cross-tab.ts`)

```ts
function delivered(): Promise<void>;                         // replaces settleChannel()
function nextRefresh(service: { refresh(): Promise<void> }): Promise<void>;
function otherCopy(): {
  provider: Provider;
  received: Announcement[];
  announce(kind: ChangeKind, profileId: string | null): Promise<void>;  // resolves on delivery
};
```

- `delivered()` resolves after the fake channel's single microtask delivery hop, so outgoing announcements are in `received`.
- `nextRefresh(service)` must be called before the announcement it waits for. It resolves when the service's next `refresh()` settles, and rejects if that refresh rejects.
- `settleChannel()` is removed. No timer remains in the helper.
