import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { RovingRadios } from './roving-radios';

@Component({
  imports: [RovingRadios],
  template: `
    <div role="radiogroup" [appRovingRadios]="sel()" (radioMove)="moves.push($event); sel.set($event)">
      @for (n of options; track n) {
        <button type="button" role="radio" [attr.aria-checked]="n === sel()" [attr.tabindex]="n === sel() ? 0 : -1">
          {{ n }}
        </button>
      }
      <input class="other" />
    </div>
  `,
})
class Host {
  readonly options = [0, 1, 2];
  readonly sel = signal(0);
  readonly moves: number[] = [];
}

describe('RovingRadios', () => {
  let fixture: ComponentFixture<Host>;

  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.innerHTML = '';
  });

  async function render(selected: number) {
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    fixture.componentInstance.sel.set(selected);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const radios = () => Array.from(el.querySelectorAll<HTMLElement>('[role="radio"]'));
    return { el, radios, host: fixture.componentInstance };
  }

  function press(target: HTMLElement, key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  }

  it('moves to the next radio on an arrow key, focusing it', async () => {
    const { radios, host } = await render(0);
    const event = press(radios()[0], 'ArrowRight');
    expect(event.defaultPrevented).toBe(true);
    expect(host.moves).toEqual([1]);
    expect(document.activeElement).toBe(radios()[1]);
  });

  it('wraps both ways', async () => {
    const { radios, host } = await render(2);
    press(radios()[2], 'ArrowDown');
    expect(host.moves).toEqual([0]);
    await fixture.whenStable();
    press(radios()[0], 'ArrowUp');
    await fixture.whenStable();
    press(radios()[2], 'ArrowLeft');
    expect(host.moves).toEqual([0, 2, 1]);
  });

  it('jumps to the ends with Home and End', async () => {
    const { radios, host } = await render(1);
    press(radios()[1], 'End');
    expect(document.activeElement).toBe(radios()[2]);
    await fixture.whenStable();
    press(radios()[2], 'Home');
    expect(host.moves).toEqual([2, 0]);
    expect(document.activeElement).toBe(radios()[0]);
  });

  it('selects the focused radio on an arrow key while nothing is selected', async () => {
    const { radios, host } = await render(-1);
    radios()[1].focus();
    press(radios()[1], 'ArrowDown');
    expect(host.moves).toEqual([1]);
    expect(document.activeElement).toBe(radios()[1]);
  });

  it('still goes to the ends with Home and End while nothing is selected', async () => {
    const { radios, host } = await render(-1);
    press(radios()[1], 'End');
    expect(host.moves).toEqual([2]);
  });

  it('ignores keys from elements that are not radios, and unrelated keys', async () => {
    const { el, radios, host } = await render(0);
    const fromInput = press(el.querySelector<HTMLElement>('.other')!, 'ArrowRight');
    const tab = press(radios()[0], 'Tab');
    const letter = press(radios()[0], 'a');
    expect(host.moves).toEqual([]);
    expect(fromInput.defaultPrevented).toBe(false);
    expect(tab.defaultPrevented).toBe(false);
    expect(letter.defaultPrevented).toBe(false);
  });
});
