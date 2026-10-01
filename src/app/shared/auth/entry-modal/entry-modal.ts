import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { EntryModalService } from '@services/entry-modal.service';
import { ACTION, MISC } from '@utils/entry-copy';
import { IdentityChip } from '@shared/ds/identity-chip/identity-chip';
import { IdentityWheel } from '@shared/ds/identity-wheel/identity-wheel';
import { MOBILE_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { SparkField } from '@shared/ds/spark-field/spark-field';
import { CloudFlowHost } from '@shared/auth/cloud-flow-host';
import { FluidFace } from '@shared/ds/themed-modal/fluid-face';
import { ThemedModal } from '@shared/ds/themed-modal/themed-modal';
import { CloudForm } from './cloud-form/cloud-form';
import { DonePanel } from './done-panel/done-panel';
import { ENTRY_TITLE_ID, EntryFlowStore } from './entry-flow.store';
import { ProfileForm } from './profile-form/profile-form';
import { ProfileList } from './profile-list/profile-list';
import { ResetForm } from './reset-form/reset-form';

type Body = 'list' | 'local' | 'cloud' | 'reset';

// The entry modal — who is at the device: pick, unlock, create or sign out of a profile, and
// new-device cloud sign-in and setup. Managing the active profile is the profile modal's
// (spec 005). Rendered once in app.html and opened through EntryModalService.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-entry-modal',
  imports: [ThemedModal, SparkField, IdentityWheel, IdentityChip, ProfileList, ProfileForm, CloudForm, ResetForm, DonePanel],
  providers: [EntryFlowStore, { provide: CloudFlowHost, useExisting: EntryFlowStore }],
  templateUrl: './entry-modal.html',
  styleUrl: './entry-modal.scss',
})
export class EntryModal {
  protected readonly store = inject(EntryFlowStore);
  protected readonly modal = inject(EntryModalService);
  protected readonly mobile = mediaQuerySignal(MOBILE_QUERY);

  protected readonly titleId = ENTRY_TITLE_ID;
  protected readonly action = ACTION;
  protected readonly wordmark = MISC.wordmark;

  private readonly themed = viewChild(ThemedModal);
  private readonly pane = viewChild<ElementRef<HTMLElement>>('pane');
  private readonly content = viewChild<ElementRef<HTMLElement>>('content');
  private readonly promptEl = viewChild<ElementRef<HTMLElement>>('prompt');
  protected readonly fluid = new FluidFace({
    face: computed(() => this.themed()?.face()),
    pane: this.pane,
    content: this.content,
    prompt: this.promptEl,
    screenKey: computed(() => `${this.store.phase()}|${this.store.done()}|${this.modal.request()?.id}`),
  });

  protected readonly body = computed<Body | null>(() => {
    switch (this.store.phase()) {
      case 'list':
        return 'list';
      case 'unlock':
      case 'profile':
      case 'localreset-newpw':
      case 'recover-newpw':
        return 'local';
      case 'in':
      case 'setup':
      case 'recover-form':
        return 'cloud';
      case 'reset-email':
      case 'reset-code':
        return 'reset';
      default:
        return null;
    }
  });

  protected readonly picking = computed(() => this.store.phase() === 'profile' && !this.store.done());
  /** The full-width primary; `recover-form` puts its submit in a Cancelar + Continuar row. */
  protected readonly hasSubmit = computed(() => !!this.store.primary() && this.store.phase() !== 'recover-form');

  constructor() {
    // A new open() starts the flow from its requested context and phase.
    effect(() => {
      const request = this.modal.request();
      if (request) {
        untracked(() => this.store.start(request));
      }
    });
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void this.store.submit();
  }
}
