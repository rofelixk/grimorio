import { DestroyRef, Injectable, inject, signal } from '@angular/core';

// `navigator.onLine` as a signal, kept live by the window's online/offline events. Checked
// before every cloud action (R8) so an offline attempt fails fast with the offline copy.
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly onlineSignal = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly online = this.onlineSignal.asReadonly();

  constructor() {
    const update = () => this.onlineSignal.set(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    });
  }
}
