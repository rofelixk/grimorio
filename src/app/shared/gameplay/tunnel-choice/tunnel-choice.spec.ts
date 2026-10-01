import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanarImageService } from '@services/planar-image.service';
import { PLANAR_CARDS } from '@testing/planechase-fixtures';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TunnelChoice } from './tunnel-choice';

const PLANES = PLANAR_CARDS.filter((card) => card.kind === 'plane').slice(0, 3);

@Component({
  imports: [TunnelChoice],
  template: `<app-tunnel-choice [planes]="planes" [selected]="selected()" (picked)="selected.set($event)" />`,
})
class Host {
  readonly planes = PLANES;
  readonly selected = signal<string | null>(null);
}

describe('TunnelChoice', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: PlanarImageService, useValue: { url: vi.fn().mockResolvedValue(null) } }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.innerHTML = '';
  });

  async function render(selected: string | null) {
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    fixture.componentInstance.selected.set(selected);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const radios = () => Array.from(el.querySelectorAll<HTMLElement>('[role="radio"]'));
    return { radios, host: fixture.componentInstance };
  }

  async function press(target: HTMLElement, key: string) {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }

  it('moves the choice and focus with the arrow keys, wrapping both ways', async () => {
    const { radios, host } = await render(PLANES[0].id);
    await press(radios()[0], 'ArrowRight');
    expect(host.selected()).toBe(PLANES[1].id);
    expect(radios()[1].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(radios()[1]);

    await press(radios()[1], 'ArrowLeft');
    await press(radios()[0], 'ArrowUp');
    expect(host.selected()).toBe(PLANES[2].id);
    expect(document.activeElement).toBe(radios()[2]);

    await press(radios()[2], 'ArrowDown');
    expect(host.selected()).toBe(PLANES[0].id);
  });

  it('jumps to the first and last plane with Home and End', async () => {
    const { radios, host } = await render(PLANES[1].id);
    await press(radios()[1], 'End');
    expect(host.selected()).toBe(PLANES[2].id);
    expect(document.activeElement).toBe(radios()[2]);
    await press(radios()[2], 'Home');
    expect(host.selected()).toBe(PLANES[0].id);
    expect(document.activeElement).toBe(radios()[0]);
  });

  it('selects the focused plane on the first arrow key while nothing is chosen', async () => {
    const { radios, host } = await render(null);
    radios()[0].focus();
    await press(radios()[0], 'ArrowDown');
    expect(host.selected()).toBe(PLANES[0].id);
    expect(document.activeElement).toBe(radios()[0]);
  });
});
