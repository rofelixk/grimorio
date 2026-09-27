import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ToastService } from '@services/toast.service';
import { ToastOutlet } from './toast-outlet';

@Component({
  imports: [ToastOutlet],
  template: `
    <app-toast-outlet class="base" />
    <app-toast-outlet class="modal" [active]="modalOpen()" />
  `,
})
class Host {
  readonly modalOpen = signal(false);
}

describe('ToastOutlet', () => {
  let toasts: ToastService;

  beforeEach(() => {
    toasts = TestBed.inject(ToastService);
  });

  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const text = (selector: string) =>
      (fixture.nativeElement as HTMLElement).querySelector(`${selector} .toast`)?.textContent?.trim() ?? '';
    return { fixture, text };
  }

  it('renders only in the top host', async () => {
    const { fixture, text } = render();
    toasts.show('Perfil', 'Alterações salvas.');
    await fixture.whenStable();
    expect(text('.base')).toContain('Alterações salvas.');
    expect(text('.modal')).toBe('');

    fixture.componentInstance.modalOpen.set(true);
    await fixture.whenStable();
    expect(text('.base')).toBe('');
    expect(text('.modal')).toContain('Alterações salvas.');

    fixture.componentInstance.modalOpen.set(false);
    await fixture.whenStable();
    expect(text('.base')).toContain('Alterações salvas.');
  });

  it('announces through a persistent live region', async () => {
    const { fixture } = render();
    const live = (fixture.nativeElement as HTMLElement).querySelector('.base [role="status"]')!;
    expect(live.getAttribute('aria-live')).toBe('polite');

    toasts.show('Perfil', 'Alterações salvas.');
    await fixture.whenStable();
    expect(live.textContent).toContain('Alterações salvas.');
  });

  it('dismisses on ✕', async () => {
    const { fixture } = render();
    toasts.show('Perfil', 'Alterações salvas.');
    await fixture.whenStable();

    const close = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.base .close')!;
    expect(close.getAttribute('aria-label')).toBe('Fechar aviso');
    close.click();
    expect(toasts.toast()).toBeNull();
  });
});
