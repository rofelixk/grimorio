import { Injectable, inject, signal } from '@angular/core';
import { EntryContext, EntryPhase } from '../utils/entry-flow.util';
import { ProfileSessionService } from './profile-session.service';
import { ProfileStore } from './profile-store.service';

export type { EntryContext };
export type EntryStart = Extract<EntryPhase, 'list' | 'profile' | 'in' | 'up' | 'unlink' | 'reauth'>;

export interface EntryRequest {
  /** Defaults to `device` when the device has no profiles, else `gate`. */
  context?: EntryContext;
  start?: EntryStart;
}

export interface EntryResult {
  activeProfileId: string | null;
}

/** A request with its defaults resolved; `id` distinguishes consecutive opens. */
export interface ResolvedEntryRequest {
  id: number;
  context: EntryContext;
  start: EntryStart;
}

const DEFAULT_START: Record<EntryContext, EntryStart> = { device: 'profile', gate: 'list', link: 'in' };

// Opens the single entry modal (rendered once in app.html) and resolves when it closes — by ✕,
// Esc, a backdrop click or Concluir — with whichever profile is then active.
@Injectable({ providedIn: 'root' })
export class EntryModalService {
  private readonly profiles = inject(ProfileStore);
  private readonly session = inject(ProfileSessionService);

  private readonly requestSignal = signal<ResolvedEntryRequest | null>(null);
  /** The open request, or null when closed. */
  readonly request = this.requestSignal.asReadonly();
  private readonly isOpenSignal = signal(false);
  readonly isOpen = this.isOpenSignal.asReadonly();

  private pending: Promise<EntryResult> | null = null;
  private resolvePending: ((result: EntryResult) => void) | null = null;
  private nextId = 0;

  /** A second open() while the modal is open returns the pending promise. */
  open(request: EntryRequest = {}): Promise<EntryResult> {
    if (this.pending) {
      return this.pending;
    }
    const context = request.context ?? (this.profiles.profiles().length ? 'gate' : 'device');
    this.requestSignal.set({ id: this.nextId++, context, start: request.start ?? DEFAULT_START[context] });
    this.isOpenSignal.set(true);
    this.pending = new Promise<EntryResult>((resolve) => (this.resolvePending = resolve));
    return this.pending;
  }

  close(): void {
    const resolve = this.resolvePending;
    this.pending = null;
    this.resolvePending = null;
    this.isOpenSignal.set(false);
    this.requestSignal.set(null);
    resolve?.({ activeProfileId: this.session.active()?.id ?? null });
  }
}
