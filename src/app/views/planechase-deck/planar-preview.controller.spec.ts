import { Component, ElementRef, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanarSet } from '../../core/data/planechase/planar-card.model';
import { PLANAR_CARDS } from '@testing/planechase-fixtures';
import { PlanarPreviewController } from './planar-preview.controller';

// Three sets of three: a (p01–p03), b (p04–p06), c (f01, p07, p08).
const SETS: PlanarSet[] = [
  { code: 'a', name: 'Set A', cards: PLANAR_CARDS.slice(0, 3) },
  { code: 'b', name: 'Set B', cards: PLANAR_CARDS.slice(3, 6) },
  { code: 'c', name: 'Set C', cards: PLANAR_CARDS.slice(6, 9) },
];

@Component({
  template: `
    <main>
      @for (card of cards; track card.id) {
        <div [attr.data-card-id]="card.id"><button type="button">{{ card.name }}</button></div>
      }
    </main>
  `,
  providers: [PlanarPreviewController],
})
class Host {
  readonly controller = inject(PlanarPreviewController);
  readonly sets = signal<readonly PlanarSet[]>(SETS);
  readonly collapsed = signal<ReadonlySet<string>>(new Set());
  readonly confirming = signal(false);
  protected readonly cards = SETS.flatMap((set) => set.cards);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    this.controller.connect({
      sets: this.sets,
      collapsed: this.collapsed,
      confirming: this.confirming,
      tileFor: (id) => this.el.querySelector<HTMLElement>(`[data-card-id="${id}"] button`) ?? undefined,
    });
  }
}

function setUp() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const host = fixture.componentInstance;
  const tile = (id: string) => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-card-id="${id}"] button`)!;
  return { fixture, host, controller: host.controller, tile };
}

const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

describe('PlanarPreviewController', () => {
  let back: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Host] });
    history.replaceState(null, '');
    back = vi.spyOn(history, 'back').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('position', () => {
    it('counts the visible tiles across sets, skipping a collapsed one', () => {
      const { host, controller } = setUp();
      host.collapsed.set(new Set(['b']));
      controller.openDialog('p03');
      expect(controller.position()).toEqual({ index: 3, total: 6 });
      expect(controller.hasPrevious()).toBe(true);
      expect(controller.hasNext()).toBe(true);

      controller.next();
      expect(controller.current()!.id).toBe('f01');
      expect(controller.position()).toEqual({ index: 4, total: 6 });
    });

    it('stops at both ends', () => {
      const { controller } = setUp();
      controller.openDialog('p01');
      expect(controller.hasPrevious()).toBe(false);
      controller.previous();
      expect(controller.current()!.id).toBe('p01');

      controller.openDialog('p08');
      expect(controller.hasNext()).toBe(false);
      controller.next();
      expect(controller.current()!.id).toBe('p08');
      controller.previous();
      expect(controller.preview()).toEqual({ id: 'p07', mode: 'dialog' });
    });
  });

  describe('guards (FR-013)', () => {
    it('closes when the restart confirm shows, and opens nothing while it does', () => {
      vi.useFakeTimers();
      const { host, controller, tile } = setUp();
      controller.openDialog('p01');
      host.confirming.set(true);
      TestBed.tick();
      expect(controller.preview()).toBeNull();

      controller.openDialog('p02');
      controller.hoverTile('p02', tile('p02'));
      vi.advanceTimersByTime(1000);
      expect(controller.preview()).toBeNull();
    });

    it('closes when the card’s set collapses', () => {
      const { host, controller } = setUp();
      controller.openDialog('p04');
      host.collapsed.set(new Set(['a']));
      TestBed.tick();
      expect(controller.preview()).not.toBeNull();
      host.collapsed.set(new Set(['b']));
      TestBed.tick();
      expect(controller.preview()).toBeNull();
    });
  });

  describe('hover', () => {
    beforeEach(() => vi.useFakeTimers());

    it('opens only after the pointer rests for 300 ms', () => {
      const { controller, tile } = setUp();
      controller.hoverTile('p01', tile('p01'));
      vi.advanceTimersByTime(299);
      expect(controller.preview()).toBeNull();
      vi.advanceTimersByTime(1);
      expect(controller.preview()).toEqual({ id: 'p01', mode: 'popover' });
      expect(controller.anchor()).toBe(tile('p01'));
    });

    it('opens nothing when the pointer leaves first', () => {
      const { controller, tile } = setUp();
      controller.hoverTile('p01', tile('p01'));
      vi.advanceTimersByTime(200);
      controller.leaveTile();
      vi.advanceTimersByTime(500);
      expect(controller.preview()).toBeNull();
    });

    it('switches at once to another tile while open', () => {
      const { controller, tile } = setUp();
      controller.hoverTile('p01', tile('p01'));
      vi.advanceTimersByTime(300);
      controller.leaveTile();
      controller.hoverTile('p02', tile('p02'));
      expect(controller.preview()).toEqual({ id: 'p02', mode: 'popover' });
      expect(controller.anchor()).toBe(tile('p02'));
      vi.advanceTimersByTime(500);
      expect(controller.preview()!.id).toBe('p02');
    });

    it('closes 150 ms after leaving, unless the pointer reaches the popover', () => {
      const { controller, tile } = setUp();
      controller.hoverTile('p01', tile('p01'));
      vi.advanceTimersByTime(300);
      controller.leaveTile();
      vi.advanceTimersByTime(100);
      controller.enterPopover();
      vi.advanceTimersByTime(500);
      expect(controller.preview()).not.toBeNull();

      controller.leavePopover();
      vi.advanceTimersByTime(149);
      expect(controller.preview()).not.toBeNull();
      vi.advanceTimersByTime(1);
      expect(controller.preview()).toBeNull();
      expect(controller.anchor()).toBeNull();
    });

    it('closes on Esc', () => {
      const { controller, tile } = setUp();
      controller.hoverTile('p01', tile('p01'));
      vi.advanceTimersByTime(300);
      escape();
      expect(controller.preview()).toBeNull();
    });

    it('never touches an open dialog', () => {
      const { controller, tile } = setUp();
      controller.openDialog('p01');
      controller.hoverTile('p02', tile('p02'));
      vi.advanceTimersByTime(500);
      expect(controller.preview()).toEqual({ id: 'p01', mode: 'dialog' });
    });
  });

  describe('dialog', () => {
    it('pushes one history entry; a popstate closes without going back again', () => {
      const { controller } = setUp();
      const push = vi.spyOn(history, 'pushState');
      controller.openDialog('p01');
      controller.next();
      expect(push).toHaveBeenCalledTimes(1);
      expect(history.state.planarPreview).toBe(true);

      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(controller.preview()).toBeNull();
      expect(back).not.toHaveBeenCalled();
    });

    it('any other close pops the entry once', () => {
      const { controller } = setUp();
      controller.openDialog('p01');
      controller.close();
      controller.close();
      expect(back).toHaveBeenCalledTimes(1);
    });

    it('keeps the variant it opened with', () => {
      const matches = { matches: true };
      vi.stubGlobal('matchMedia', () => matches);
      const { controller } = setUp();
      controller.openDialog('p01');
      expect(controller.variant()).toBe('narrow');
      matches.matches = false;
      controller.next();
      expect(controller.variant()).toBe('narrow');
      controller.close();
      controller.openDialog('p01');
      expect(controller.variant()).toBe('wide');
    });

    it('returns focus to the tile of the card on screen', () => {
      const { fixture, controller, tile } = setUp();
      controller.openDialog('p02');
      controller.next();
      controller.next();
      controller.close();
      fixture.detectChanges();
      TestBed.tick();
      expect(document.activeElement).toBe(tile('p04'));
    });

    it('replaces an open popover and leaves no popover Esc listener behind', () => {
      vi.useFakeTimers();
      const { controller, tile } = setUp();
      controller.hoverTile('p01', tile('p01'));
      vi.advanceTimersByTime(300);
      controller.openDialog('p01');
      expect(controller.preview()).toEqual({ id: 'p01', mode: 'dialog' });
      expect(controller.anchor()).toBeNull();

      const close = vi.spyOn(controller, 'close');
      escape();
      expect(close).not.toHaveBeenCalled();
      expect(controller.preview()!.mode).toBe('dialog');
    });
  });
});
