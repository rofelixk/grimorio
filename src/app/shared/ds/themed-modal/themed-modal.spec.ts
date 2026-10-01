import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { stubDialog } from '@testing/dialog';
import { rolesFor } from '@utils/identity.util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemedModal } from './themed-modal';

@Component({
  imports: [ThemedModal],
  template: `
    @if (open()) {
      <app-themed-modal [roles]="roles">
        <button class="inside">Entrar</button>
      </app-themed-modal>
    }
  `,
})
class Host {
  readonly roles = rolesFor(['R', 'U']);
  readonly open = signal(true);
}

describe('ThemedModal', () => {
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
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLElement>('.inside')!.focus();
    return { fixture, el, host: fixture.componentInstance };
  }

  it('returns focus to the opener on destroy', async () => {
    const { fixture, el, host } = await render();
    expect(document.activeElement).toBe(el.querySelector('.inside'));
    host.open.set(false);
    fixture.detectChanges();
    expect(document.activeElement).toBe(opener);
  });

  it('does not throw when the opener was removed', async () => {
    const { fixture, host } = await render();
    opener.remove();
    host.open.set(false);
    expect(() => fixture.detectChanges()).not.toThrow();
  });
});
