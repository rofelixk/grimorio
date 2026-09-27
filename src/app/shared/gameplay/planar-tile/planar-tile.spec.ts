import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanarImageService } from '@services/planar-image.service';
import { planarCard } from '@testing/planechase-fixtures';
import { PlanarTile } from './planar-tile';

describe('PlanarTile', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlanarTile],
      providers: [{ provide: PlanarImageService, useValue: { url: vi.fn().mockResolvedValue(null) } }],
    });
  });

  async function render(id: string, on: boolean) {
    const fixture = TestBed.createComponent(PlanarTile);
    fixture.componentRef.setInput('card', planarCard(id));
    fixture.componentRef.setInput('on', on);
    await fixture.whenStable();
    return { fixture, button: (fixture.nativeElement as HTMLElement).querySelector('button')! };
  }

  it('names a plane and reports it on', async () => {
    const { button } = await render('p01', true);
    expect(button.getAttribute('aria-label')).toBe('Card P01, plano');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.classList).not.toContain('is-off');
  });

  it('names a phenomenon and reports it off', async () => {
    const { button } = await render('f01', false);
    expect(button.getAttribute('aria-label')).toBe('Card F01, fenômeno');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.classList).toContain('is-off');
  });

  it('shows the name while there is no image, and emits toggle on click', async () => {
    const { fixture, button } = await render('p02', true);
    expect(button.querySelector('.name')!.textContent).toBe('Card P02');
    const toggle = vi.fn();
    fixture.componentInstance.toggled.subscribe(toggle);
    button.click();
    expect(toggle).toHaveBeenCalledTimes(1);
  });
});
