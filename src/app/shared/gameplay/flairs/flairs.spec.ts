import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChaosFlair } from './chaos-flair';
import { PlaneswalkFlair } from './planeswalk-flair';

function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduced && query.includes('reduce') }));
}

/** Runs rAF callbacks on a fake clock, 16ms apart, until none are queued. */
function driveFrames() {
  let now = 0;
  let queued: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => queued.push(callback));
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  return () => {
    while (queued.length) {
      const batch = queued;
      queued = [];
      now += 16;
      batch.forEach((callback) => callback(now));
    }
  };
}

function block(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = '<div class="frame"><div data-flair-shake>image</div></div><h2>Old plane</h2>';
  document.body.appendChild(el);
  return el;
}

describe('flairs', () => {
  let target: HTMLElement;

  beforeEach(() => (target = block()));
  afterEach(() => {
    target.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('under reduced motion', () => {
    beforeEach(() => stubReducedMotion(true));

    it('the planeswalk flair resolves at once and adds nothing', async () => {
      const play = new PlaneswalkFlair().capture(target);
      await play();
      expect(target.querySelector('.grm-flair')).toBeNull();
    });

    it('the chaos flair resolves at once and adds nothing', async () => {
      await new ChaosFlair().play(target.querySelector('.frame')!);
      expect(target.querySelector('.grm-flair')).toBeNull();
    });
  });

  describe('with motion', () => {
    beforeEach(() => stubReducedMotion(false));

    it('the planeswalk flair overlays the captured card, then removes every node', async () => {
      const drive = driveFrames();
      const play = new PlaneswalkFlair().capture(target);
      target.querySelector('h2')!.textContent = 'New plane';
      const done = play();

      const layer = target.querySelector('.grm-flair')!;
      expect(layer.getAttribute('aria-hidden')).toBe('true');
      expect(layer.textContent).toContain('Old plane');

      drive();
      await done;
      expect(target.querySelector('.grm-flair')).toBeNull();
      expect(target.textContent).toContain('New plane');
    });

    it('the chaos flair plays behind the image, shakes it, then cleans up', async () => {
      const drive = driveFrames();
      const frame = target.querySelector<HTMLElement>('.frame')!;
      const done = new ChaosFlair().play(frame);
      expect(frame.firstElementChild!.classList).toContain('grm-flair');

      drive();
      await done;
      expect(target.querySelector('.grm-flair')).toBeNull();
      expect(frame.querySelector<HTMLElement>('[data-flair-shake]')!.style.transform).toBe('');
    });
  });
});
