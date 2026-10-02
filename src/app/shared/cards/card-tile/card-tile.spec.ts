import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CardTile, TileCard, TileDetails } from './card-tile';

const DETAILS: TileDetails = {
  set: 'CMR',
  number: '472',
  finish: 'Foil',
  language: 'EN',
  condition: 'NM',
  quantity: 3,
  forSale: true,
};

@Component({
  imports: [CardTile],
  template: `
    <app-card-tile
      [card]="card()"
      [details]="details()"
      [detailsMode]="mode()"
      [interactive]="interactive()"
      label="Sol Ring, CMR 472"
      (activate)="activations = activations + 1"
    />
  `,
})
class Host {
  readonly card = signal<TileCard>({
    name: 'Sol Ring',
    imageUrl: 'https://img.test/sol.jpg',
    colorIdentity: [],
  });
  readonly details = signal<TileDetails | null>(DETAILS);
  readonly mode = signal<'shown' | 'hover'>('shown');
  readonly interactive = signal(true);
  activations = 0;
}

function matchMediaStub(reduced: boolean) {
  return (query: string) =>
    ({
      matches: reduced && query.includes('reduced-motion'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList;
}

describe('CardTile', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, host: fixture.componentInstance, tile: el.querySelector('app-card-tile')! };
  }

  it('is a labelled button when interactive and emits activate', () => {
    const { el, host } = render();
    const button = el.querySelector<HTMLButtonElement>('button.tile')!;
    expect(button.getAttribute('aria-label')).toBe('Sol Ring, CMR 472');
    button.click();
    expect(host.activations).toBe(1);
  });

  it('is a labelled image div and never activates when not interactive', () => {
    const { fixture, el, host } = render();
    host.interactive.set(false);
    fixture.detectChanges();
    expect(el.querySelector('button')).toBeNull();
    const div = el.querySelector<HTMLElement>('div.tile')!;
    expect(div.getAttribute('role')).toBe('img');
    expect(div.getAttribute('aria-label')).toBe('Sol Ring, CMR 472');
    div.click();
    expect(host.activations).toBe(0);
  });

  it('shows the image with an empty alt, lazy and async', () => {
    const { el } = render();
    const img = el.querySelector<HTMLImageElement>('img.image')!;
    expect(img.getAttribute('src')).toBe('https://img.test/sol.jpg');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
  });

  it('shows a placeholder with the name when there is no image', () => {
    const { fixture, el, host } = render();
    host.card.set({ name: 'Sol Ring', imageUrl: null, colorIdentity: [] });
    fixture.detectChanges();
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.placeholder')?.textContent?.trim()).toBe('Sol Ring');
  });

  it('writes the plate lines', () => {
    const { el } = render();
    const plate = el.querySelector('.plate-wrap .details-plate')!;
    expect(plate.querySelector('.set')?.textContent).toBe('CMR · 472');
    expect(plate.querySelector('.meta')?.textContent).toBe('Foil · EN · NM');
    expect(plate.querySelector('.micro-label')?.textContent).toBe('À venda');
    expect(plate.querySelector('.qty')?.textContent).toBe('×3');
  });

  it('omits the À venda label when not for sale', () => {
    const { fixture, el, host } = render();
    host.details.set({ ...DETAILS, forSale: false });
    fixture.detectChanges();
    expect(el.querySelector('.micro-label')).toBeNull();
  });

  it('keeps the plate in flow for "shown" and as an overlay for "hover"', () => {
    const { fixture, el, host } = render();
    expect(el.querySelector('.plate-wrap')!.classList.contains('is-open')).toBe(true);
    expect(el.querySelector('.overlay')).toBeNull();

    host.mode.set('hover');
    fixture.detectChanges();
    expect(el.querySelector('.plate-wrap')!.classList.contains('is-open')).toBe(false);
    expect(el.querySelector('.overlay')).not.toBeNull();
  });

  it('has no plate without details', () => {
    const { fixture, el, host } = render();
    host.details.set(null);
    fixture.detectChanges();
    expect(el.querySelector('.details-plate')).toBeNull();
  });

  it('bursts 10 specks once per pointer entry, none on focus', () => {
    const { fixture, el, tile } = render();
    el.querySelector('button')!.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(el.querySelectorAll('.speck')).toHaveLength(0);

    tile.dispatchEvent(new MouseEvent('pointerenter'));
    fixture.detectChanges();
    expect(el.querySelectorAll('.speck')).toHaveLength(10);
    expect(tile.classList.contains('live')).toBe(true);

    el.querySelectorAll('.speck').forEach((s) => s.dispatchEvent(new Event('animationend')));
    fixture.detectChanges();
    expect(el.querySelectorAll('.speck')).toHaveLength(0);
    expect(tile.classList.contains('live')).toBe(false);
  });

  it('adds no dust under reduced motion', () => {
    vi.stubGlobal('matchMedia', matchMediaStub(true));
    const { fixture, el, tile } = render();
    tile.dispatchEvent(new MouseEvent('pointerenter'));
    fixture.detectChanges();
    expect(el.querySelectorAll('.speck')).toHaveLength(0);
  });

  it('colors the border from the card identity', () => {
    const { fixture, tile, host } = render();
    host.card.set({ name: 'x', imageUrl: null, colorIdentity: ['R'] });
    fixture.detectChanges();
    expect((tile as HTMLElement).style.getPropertyValue('--tile-border')).toContain('#a8402c');
  });
});
