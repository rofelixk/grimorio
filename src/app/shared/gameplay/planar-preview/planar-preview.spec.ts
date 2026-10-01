import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanarCard } from '@data/planechase/planar-card.model';
import { PlanarImageService } from '@services/planar-image.service';
import { planarCard } from '@testing/planechase-fixtures';
import { PlanarPreviewContent } from './planar-preview';

describe('PlanarPreviewContent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlanarPreviewContent],
      providers: [{ provide: PlanarImageService, useValue: { url: vi.fn().mockResolvedValue('blob:x') } }],
    });
  });

  async function render(card: PlanarCard, on = true, headingId: string | null = null) {
    const fixture = TestBed.createComponent(PlanarPreviewContent);
    fixture.componentRef.setInput('card', card);
    fixture.componentRef.setInput('on', on);
    fixture.componentRef.setInput('headingId', headingId);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows a translated plane on, with the Caos plate unlit', async () => {
    const el = await render(planarCard('p01'), true, 'h-1');
    expect(el.querySelector('.status')!.textContent!.trim()).toBe('Ativada no baralho');
    const name = el.querySelector('h2')!;
    expect(name.textContent).toBe('Card P01');
    expect(name.getAttribute('lang')).toBe('en');
    expect(name.id).toBe('h-1');
    expect(el.querySelector('.type')!.hasAttribute('lang')).toBe(false);
    expect(el.querySelectorAll('.text > .line')).toHaveLength(2);
    const plate = el.querySelector('.plate')!;
    expect(plate.querySelector('.eyebrow')!.textContent).toBe('Caos');
    expect(plate.classList).not.toContain('is-lit');
  });

  it('shows an off card as off, with its image at full strength', async () => {
    const el = await render(planarCard('p02'), false);
    expect(el.querySelector('.status')!.textContent!.trim()).toBe('Desativada no baralho');
    expect(el.querySelector('.status')!.classList).toContain('is-off');
    const image = el.querySelector('app-planar-image')!;
    expect(image.classList).not.toContain('is-off');
    expect(image.querySelector('img')!.getAttribute('src')).toBe('blob:x');
  });

  it('marks untranslated text as English', async () => {
    const el = await render(planarCard('p09'));
    expect(el.querySelector('.type')!.getAttribute('lang')).toBe('en');
    expect(el.querySelector('.line')!.getAttribute('lang')).toBe('en');
  });

  it('gives a phenomenon no static text and the encounter plate', async () => {
    const el = await render(planarCard('f01'));
    expect(el.querySelectorAll('.text > .line')).toHaveLength(0);
    expect(el.querySelector('.plate .eyebrow')!.textContent).toBe('Ao encontrar');
  });

  it('has no plate for a plane without chaos, and nothing focusable', async () => {
    const el = await render(planarCard('p11'));
    expect(el.querySelector('.plate')).toBeNull();
    expect(el.querySelector('button, a, input, [tabindex]')).toBeNull();
  });
});
