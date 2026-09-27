import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOAST_MS, ToastService } from './toast.service';

describe('ToastService', () => {
  let toasts: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    toasts = TestBed.inject(ToastService);
  });

  afterEach(() => vi.useRealTimers());

  it('clears a toast at exactly TOAST_MS', () => {
    toasts.show('Perfil', 'Alterações salvas.');
    expect(toasts.toast()).toMatchObject({ label: 'Perfil', text: 'Alterações salvas.' });

    vi.advanceTimersByTime(TOAST_MS - 1);
    expect(toasts.toast()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(toasts.toast()).toBeNull();
  });

  it('replaces the current toast and restarts the window', () => {
    toasts.show('A', 'um');
    const first = toasts.toast()!.id;
    vi.advanceTimersByTime(4_000);
    toasts.show('B', 'dois');

    expect(toasts.toast()).toMatchObject({ label: 'B', text: 'dois' });
    expect(toasts.toast()!.id).not.toBe(first);
    vi.advanceTimersByTime(4_000);
    expect(toasts.toast()).not.toBeNull();
    vi.advanceTimersByTime(1_000);
    expect(toasts.toast()).toBeNull();
  });

  it('dismisses on demand', () => {
    toasts.show('A', 'um');
    toasts.dismiss();
    expect(toasts.toast()).toBeNull();
  });

  it('keeps a stack of hosts, the newest on top', () => {
    expect(toasts.topHost()).toBe(0);
    const base = toasts.pushHost();
    const modal = toasts.pushHost();
    expect(toasts.topHost()).toBe(modal);

    const drawer = toasts.pushHost();
    toasts.popHost(modal);
    expect(toasts.topHost()).toBe(drawer);
    toasts.popHost(drawer);
    expect(toasts.topHost()).toBe(base);
  });
});
