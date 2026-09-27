import { Injectable, inject, signal } from '@angular/core';
import { EntryModalService } from './entry-modal.service';
import { ProfileSessionService } from './profile-session.service';

export type ProfileStart = 'hub' | 'in' | 'up' | 'reauth';

export interface ProfileRequest {
  start?: ProfileStart;
}

/** A request with its default resolved; `id` distinguishes consecutive opens. */
export interface ResolvedProfileRequest {
  id: number;
  start: ProfileStart;
}

// Opens the single profile modal (rendered once in app.html), which manages the active profile
// (spec 005 R1). Only one modal is ever open: this is a no-op with no active profile or while
// the entry modal is open.
@Injectable({ providedIn: 'root' })
export class ProfileModalService {
  private readonly session = inject(ProfileSessionService);
  private readonly entryModal = inject(EntryModalService);

  private readonly requestSignal = signal<ResolvedProfileRequest | null>(null);
  /** The open request, or null when closed. */
  readonly request = this.requestSignal.asReadonly();
  private readonly isOpenSignal = signal(false);
  readonly isOpen = this.isOpenSignal.asReadonly();

  private nextId = 0;

  open(request: ProfileRequest = {}): void {
    if (!this.session.active() || this.entryModal.isOpen()) {
      return;
    }
    this.requestSignal.set({ id: this.nextId++, start: request.start ?? 'hub' });
    this.isOpenSignal.set(true);
  }

  close(): void {
    this.isOpenSignal.set(false);
    this.requestSignal.set(null);
  }
}
