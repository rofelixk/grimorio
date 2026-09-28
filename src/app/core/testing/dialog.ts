import { vi } from 'vitest';

/**
 * jsdom has no `showModal()`/`close()`: stubs them to toggle `open`, and returns a restore
 * function. Destroy any component that closes a dialog before restoring.
 */
export function stubDialog(): () => void {
  const originals = {
    showModal: HTMLDialogElement.prototype.showModal,
    close: HTMLDialogElement.prototype.close,
  };
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
  return () => {
    HTMLDialogElement.prototype.showModal = originals.showModal;
    HTMLDialogElement.prototype.close = originals.close;
  };
}
