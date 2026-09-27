import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ActionRow } from './action-row';

@Component({
  imports: [ActionRow],
  template: `
    <app-action-row
      title="Excluir perfil"
      meta="Apaga rafa e os dados dele deste aparelho"
      verb="Excluir"
      [danger]="true"
      [disabled]="disabled()"
      [hint]="hint()"
      (activate)="clicks = clicks + 1"
    >
      <span class="lead-content">•</span>
    </app-action-row>
  `,
})
class Host {
  readonly disabled = signal(false);
  readonly hint = signal('');
  clicks = 0;
}

describe('ActionRow', () => {
  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    return { fixture, button };
  }

  it('is one button named "{title}. {meta}." that emits activate', () => {
    const { fixture, button } = render();
    expect(button.getAttribute('aria-label')).toBe('Excluir perfil. Apaga rafa e os dados dele deste aparelho.');
    expect(button.querySelector('.lead-content')).not.toBeNull();
    expect(button.querySelector('.verb')?.textContent).toBe('Excluir');
    expect(button.classList).toContain('danger');

    button.click();
    expect(fixture.componentInstance.clicks).toBe(1);
  });

  it('describes a disabled row with its hint', async () => {
    const { fixture, button } = render();
    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.hint.set('Aguarde a sincronização terminar');
    await fixture.whenStable();

    expect(button.disabled).toBe(true);
    const hint = document.getElementById(button.getAttribute('aria-describedby')!);
    expect(hint?.textContent).toBe('Aguarde a sincronização terminar');
  });
});
