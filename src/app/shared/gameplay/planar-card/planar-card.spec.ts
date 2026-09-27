import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanarCard as Card } from '../../../core/data/planechase/planar-card.model';
import { PlanarImageService } from '@services/planar-image.service';
import { planarCard } from '@testing/planechase-fixtures';
import { PlanarCard } from './planar-card';

describe('PlanarCard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlanarCard],
      providers: [{ provide: PlanarImageService, useValue: { url: vi.fn().mockResolvedValue(null) } }],
    });
  });

  async function render(card: Card, lit = false) {
    const fixture = TestBed.createComponent(PlanarCard);
    fixture.componentRef.setInput('card', card);
    fixture.componentRef.setInput('lit', lit);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows a translated plane: English name, PT-BR type, text lines and the Caos plate', async () => {
    const el = await render(planarCard('p01'));
    const name = el.querySelector('h2')!;
    expect(name.textContent).toBe('Card P01');
    expect(name.getAttribute('lang')).toBe('en');
    expect(el.querySelector('.type')!.textContent).toBe('Plano — Mundo p01');
    expect(el.querySelector('.type')!.hasAttribute('lang')).toBe(false);
    expect([...el.querySelectorAll('.text > .line')].map((p) => p.textContent)).toEqual([
      'Texto de p01.',
      'Segunda linha de p01.',
    ]);
    const plate = el.querySelector('.ability')!;
    expect(plate.querySelector('.eyebrow')!.textContent).toBe('Caos');
    expect(plate.classList.contains('is-lit')).toBe(false);
  });

  it('shows a phenomenon with the "Ao encontrar" plate and no static text', async () => {
    const el = await render(planarCard('f01'));
    expect(el.querySelectorAll('.text > .line')).toHaveLength(0);
    expect(el.querySelector('.ability .eyebrow')!.textContent).toBe('Ao encontrar');
  });

  it('shows no plate for a plane with no chaos ability', async () => {
    const el = await render(planarCard('p11'));
    expect(el.querySelector('.ability')).toBeNull();
  });

  it('lights the plate', async () => {
    const el = await render(planarCard('p01'), true);
    expect(el.querySelector('.ability')!.classList.contains('is-lit')).toBe(true);
  });

  it('marks English fallback text lang="en", with the plate still split out', async () => {
    for (const id of ['p09', 'p10']) {
      const el = await render(planarCard(id), true);
      expect(el.querySelector('.type')!.getAttribute('lang')).toBe('en');
      expect(el.querySelector('.type')!.textContent).toBe(`Plane — World ${id}`);
      const plate = el.querySelector('.ability')!;
      expect(plate.classList.contains('is-lit')).toBe(true);
      expect(plate.querySelector('.line')!.getAttribute('lang')).toBe('en');
      expect(plate.querySelector('.line')!.textContent).toBe(`Whenever chaos ensues, ${id} does a thing.`);
    }
  });
});
