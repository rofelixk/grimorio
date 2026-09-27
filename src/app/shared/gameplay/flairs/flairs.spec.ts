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
  el.innerHTML = '<div class="frame"><div data-flair-shake data-flair-image>image</div></div><h2>Old plane</h2>';
  document.body.appendChild(el);
  return el;
}

describe('flairs', () => {
  let stage: HTMLElement;
  let target: HTMLElement;

  beforeEach(() => {
    stage = document.createElement('section');
    document.body.appendChild(stage);
    target = block();
    stage.appendChild(target);
  });
  afterEach(() => {
    stage.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('under reduced motion', () => {
    beforeEach(() => stubReducedMotion(true));

    it('the planeswalk flair resolves at once and adds nothing', async () => {
      const play = new PlaneswalkFlair().capture(target, stage);
      await play();
      expect(stage.querySelector('.grm-flair')).toBeNull();
    });

    it('the chaos flair resolves at once and adds nothing', async () => {
      await new ChaosFlair().play(target.querySelector('.frame')!, stage);
      expect(stage.querySelector('.grm-flair')).toBeNull();
    });
  });

  describe('with motion', () => {
    beforeEach(() => stubReducedMotion(false));

    it('the planeswalk flair covers the new card with the snapshot, lights the stage, then removes every node', async () => {
      const drive = driveFrames();
      const play = new PlaneswalkFlair().capture(target, stage);
      target.querySelector('h2')!.textContent = 'New plane';
      const done = play();

      // The old block sits under the light; only its image shows above the new image (z 20).
      const [block, cover] = target.querySelectorAll<HTMLElement>(':scope > .grm-flair');
      expect(block.getAttribute('aria-hidden')).toBe('true');
      expect(block.textContent).toContain('Old plane');
      expect(block.style.zIndex).toBe('5');
      expect(cover.style.zIndex).toBe('21');
      const copy = cover.firstElementChild as HTMLElement;
      expect(copy.style.visibility).toBe('hidden');
      expect(copy.querySelector<HTMLElement>('[data-flair-image]')!.style.visibility).toBe('visible');
      const lights = [...stage.querySelectorAll<HTMLElement>(':scope > .grm-flair')];
      expect(lights.map((l) => l.style.zIndex)).toEqual(['10', '10']);

      drive();
      await done;
      expect(stage.querySelector('.grm-flair')).toBeNull();
      expect(target.textContent).toContain('New plane');
    });

    it('the chaos flair plays on the stage below the image, shakes it, then cleans up', async () => {
      const drive = driveFrames();
      const frame = target.querySelector<HTMLElement>('.frame')!;
      const done = new ChaosFlair().play(frame, stage);
      const light = stage.querySelector<HTMLElement>(':scope > .grm-flair')!;
      expect(light.style.zIndex).toBe('10');
      expect(frame.querySelector('.grm-flair')).toBeNull();

      drive();
      await done;
      expect(stage.querySelector('.grm-flair')).toBeNull();
      expect(frame.querySelector<HTMLElement>('[data-flair-shake]')!.style.transform).toBe('');
    });
  });
});
