import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { stubDialog } from '@testing/dialog';
import { rolesFor } from '@utils/identity.util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CompactModal } from './compact-modal';

@Component({
  imports: [CompactModal],
  template: `
    @if (open()) {
      <app-compact-modal [roles]="roles" labelledBy="t" [locked]="locked()" (closed)="closes = closes + 1">
        <h2 id="t">Título</h2>
        <input class="first" data-autofocus />
      </app-compact-modal>
    }
  `,
})
class Host {
  readonly roles = rolesFor(['R', 'U']);
  readonly open = signal(true);
  readonly locked = signal(false);
  closes = 0;
}

describe('CompactModal', () => {
  let restore: () => void;
  let opener: HTMLButtonElement;

  beforeEach(() => {
    restore = stubDialog();
    opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    opener.remove();
    restore();
  });

  async function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    return { fixture, dialog, host: fixture.componentInstance };
  }

  it('opens on mount, labelled by the given id', async () => {
    const { dialog } = await render();
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBe('t');
    expect(dialog.querySelector('.body h2')?.textContent).toBe('Título');
    expect(document.activeElement).toBe(dialog.querySelector('.first'));
  });

  it('emits closed on Esc, the backdrop and ✕', async () => {
    const { dialog, host } = await render();
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    dialog.querySelector<HTMLButtonElement>('.close')!.click();
    expect(host.closes).toBe(3);
  });

  it('ignores a click inside the face', async () => {
    const { dialog, host } = await render();
    dialog.querySelector<HTMLElement>('h2')!.click();
    expect(host.closes).toBe(0);
  });

  it('ignores all three while locked', async () => {
    const { fixture, dialog, host } = await render();
    host.locked.set(true);
    fixture.detectChanges();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const close = dialog.querySelector<HTMLButtonElement>('.close')!;
    close.click();
    expect(host.closes).toBe(0);
    expect(close.getAttribute('aria-disabled')).toBe('true');
  });

  it('closes and restores focus to the opener on destroy', async () => {
    const { fixture, dialog, host } = await render();
    host.open.set(false);
    fixture.detectChanges();
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(opener);
  });
});
