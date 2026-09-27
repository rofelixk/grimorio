import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Color } from '@models/profile.model';
import { IdentityWheel } from './identity-wheel';

@Component({
  imports: [IdentityWheel],
  template: `<app-identity-wheel mode="picker" [(picks)]="picks" [announce]="true" />`,
})
class Host {
  readonly picks = signal<Color[]>(['U']);
}

function matchMediaStub(reduced: boolean) {
  return (query: string) =>
    ({
      matches: reduced && query.includes('reduced-motion'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList;
}

function render(picks: Color[]) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.picks.set(picks);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const swatch = (name: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
  return { fixture, el, swatch };
}

describe('IdentityWheel', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('adds picks in tap order and removes a picked color', async () => {
    const { fixture, swatch } = render(['U']);
    swatch('Vermelho').click();
    swatch('Verde').click();
    expect(fixture.componentInstance.picks()).toEqual(['U', 'R', 'G']);

    swatch('Vermelho').click();
    expect(fixture.componentInstance.picks()).toEqual(['U', 'G']);
  });

  it('never removes the last pick', () => {
    const { fixture, swatch } = render(['U']);
    swatch('Azul').click();
    expect(fixture.componentInstance.picks()).toEqual(['U']);
  });

  it('locks unpicked colors at 3 picks, keeping aria-pressed', async () => {
    const { fixture, swatch } = render(['U', 'R', 'G']);
    const branco = swatch('Branco');
    expect(branco.getAttribute('aria-disabled')).toBe('true');
    expect(branco.getAttribute('aria-pressed')).toBe('false');
    expect(branco.classList).toContain('locked');
    expect(swatch('Azul').getAttribute('aria-disabled')).toBeNull();

    branco.click();
    expect(fixture.componentInstance.picks()).toEqual(['U', 'R', 'G']);
  });

  it('gives every swatch the disc, rim and dot', () => {
    const { swatch } = render(['U']);
    const azul = swatch('Azul');
    expect([...azul.children].map((c) => c.className)).toEqual(['disc', 'rim', 'dot']);
    expect(azul.classList).toContain('on');
    expect(swatch('Preto').classList).toContain('off');
  });

  it('announces the center name politely when asked', () => {
    const { el } = render(['U']);
    expect(el.querySelector('.center')!.getAttribute('aria-live')).toBe('polite');
  });

  it('sheds motes from picked colors', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const { fixture, el } = render(['U', 'R']);
    await fixture.whenStable();
    vi.advanceTimersByTime(700);
    fixture.detectChanges();
    expect(el.querySelectorAll('.mote').length).toBe(2);
  });

  it('bursts on a newly lit color', async () => {
    const { fixture, el, swatch } = render(['U']);
    await fixture.whenStable();
    swatch('Vermelho').click();
    fixture.detectChanges();
    expect(el.querySelectorAll('.ripple').length).toBe(1);
  });

  it('sheds no motes under reduced motion', async () => {
    vi.stubGlobal('matchMedia', matchMediaStub(true));
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const { fixture, el } = render(['U', 'R']);
    await fixture.whenStable();
    vi.advanceTimersByTime(2_100);
    fixture.detectChanges();
    expect(el.querySelectorAll('.mote').length).toBe(0);
  });
});
