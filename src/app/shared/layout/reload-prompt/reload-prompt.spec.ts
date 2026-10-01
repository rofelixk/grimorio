import { TestBed } from '@angular/core/testing';
import { stubDialog } from '@testing/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAGE_RELOAD, ReloadPrompt } from './reload-prompt';

describe('ReloadPrompt', () => {
  let restore: () => void;
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    restore = stubDialog();
    reload = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: PAGE_RELOAD, useValue: reload }] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    restore();
  });

  async function render() {
    const fixture = TestBed.createComponent(ReloadPrompt);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return { el, dialog: el.querySelector('dialog')!, action: el.querySelector<HTMLButtonElement>('.btn--primary')! };
  }

  it('renders the copy, labelled by its title, with focus on Recarregar', async () => {
    const { el, dialog, action } = await render();

    const title = el.querySelector('h2')!;
    expect(title.textContent).toBe('O Grimorio foi atualizado');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(el.querySelector('.subtitle')?.textContent).toBe(
      'Uma versão mais nova foi aberta em outra janela. Recarregue esta para continuar.',
    );
    expect(action.textContent?.trim()).toBe('Recarregar');
    expect(document.activeElement).toBe(action);
  });

  it('stays open on Esc and ✕', async () => {
    const { el, dialog } = await render();

    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    const close = el.querySelector<HTMLButtonElement>('.close')!;
    close.click();

    expect(cancel.defaultPrevented).toBe(true);
    expect(close.getAttribute('aria-disabled')).toBe('true');
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads the page on Recarregar', async () => {
    const { action } = await render();

    action.click();

    expect(reload).toHaveBeenCalledOnce();
  });
});
