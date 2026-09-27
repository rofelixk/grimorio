import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanarImageService } from '@services/planar-image.service';
import { PlanarImage } from './planar-image';

describe('PlanarImage', () => {
  let url: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    url = vi.fn();
    TestBed.configureTestingModule({
      imports: [PlanarImage],
      providers: [{ provide: PlanarImageService, useValue: { url } }],
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  async function render(lazy = false) {
    const fixture = TestBed.createComponent(PlanarImage);
    fixture.componentRef.setInput('address', 'https://img.test/a.jpg');
    fixture.componentRef.setInput('name', 'Tazeem');
    fixture.componentRef.setInput('lazy', lazy);
    await fixture.whenStable();
    return fixture;
  }

  it('shows the name while loading, then the image', async () => {
    let resolve!: (value: string) => void;
    url.mockReturnValue(new Promise((r) => (resolve = r)));
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.name')?.textContent).toBe('Tazeem');
    expect(el.textContent).not.toContain('Imagem indisponível');

    resolve('blob:1');
    await Promise.resolve();
    await fixture.whenStable();
    const img = el.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('blob:1');
    expect(img.alt).toBe('Tazeem');
  });

  it('says the image is unavailable once it cannot load', async () => {
    url.mockResolvedValue(null);
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.name')?.textContent).toBe('Tazeem');
    expect(el.textContent).toContain('Imagem indisponível sem conexão');
  });

  it('waits until a lazy image is near the viewport', async () => {
    let notify!: (entries: Partial<IntersectionObserverEntry>[]) => void;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
          notify = callback;
        }
        observe = () => undefined;
        disconnect = () => undefined;
      },
    );
    url.mockResolvedValue('blob:2');
    const fixture = await render(true);
    expect(url).not.toHaveBeenCalled();

    notify([{ isIntersecting: true }]);
    await fixture.whenStable();
    expect(url).toHaveBeenCalledWith('https://img.test/a.jpg');
    expect((fixture.nativeElement as HTMLElement).querySelector('img')?.getAttribute('src')).toBe('blob:2');
  });
});
