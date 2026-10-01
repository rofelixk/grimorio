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
import { Color } from '@models/profile.model';
import { IdentityService } from '@services/identity.service';
import { ProfileModalService } from '@services/profile-modal.service';
import { ACTION, MISC } from '@utils/entry-copy';
import { tribeName } from '@utils/identity.util';
import { CloudSteps } from '@shared/auth/cloud-steps';
import { CloudForm } from '@shared/auth/entry-modal/cloud-form/cloud-form';
import { ResetForm } from '@shared/auth/entry-modal/reset-form/reset-form';
import { IdentityChip } from '@shared/ds/identity-chip/identity-chip';
import { IdentityWheel } from '@shared/ds/identity-wheel/identity-wheel';
import { MOBILE_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { SparkField } from '@shared/ds/spark-field/spark-field';
import { FluidFace } from '@shared/ds/themed-modal/fluid-face';
import { ThemedModal } from '@shared/ds/themed-modal/themed-modal';
import { CloudScreen } from './cloud-screen/cloud-screen';
import { DeleteCloudStep } from './delete-cloud-step/delete-cloud-step';
import { DeleteProfileStep } from './delete-profile-step/delete-profile-step';
import { ProfileDonePanel } from './done-panel/profile-done-panel';
import { ProfileHub } from './hub/profile-hub';
import { LocalScreen } from './local-screen/local-screen';
import { PasswordStep } from './password-step/password-step';
import { PROFILE_TITLE_ID, ProfileFlowStore } from './profile-flow.store';
import { UnlinkStep } from './unlink-step/unlink-step';

/** Steps with a ghost Cancelar + verb row (the verb is the form's submit). */
const STEP_ACTIONS = new Set(['pw', 'cloudpw', 'unlink', 'delprofile', 'delcloud', 'in', 'up', 'reauth']);

// The profile modal (spec 005): manages the active profile — hub, "Perfil neste aparelho",
// "Conta na nuvem", their action steps and done screens. Rendered once in app.html and opened
// through ProfileModalService. Tinted by the active profile's live colors: a wheel tap retints
// it and the whole app at once (FR-008).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-profile-modal',
  imports: [
    ThemedModal,
    SparkField,
    IdentityWheel,
    IdentityChip,
    ProfileHub,
    LocalScreen,
    CloudScreen,
    CloudForm,
    ResetForm,
    PasswordStep,
    UnlinkStep,
    DeleteProfileStep,
    DeleteCloudStep,
    ProfileDonePanel,
  ],
  providers: [ProfileFlowStore, { provide: CloudSteps, useFactory: () => inject(ProfileFlowStore).cloud }],
  templateUrl: './profile-modal.html',
  styleUrl: './profile-modal.scss',
})
export class ProfileModal {
  protected readonly store = inject(ProfileFlowStore);
  protected readonly modal = inject(ProfileModalService);
  protected readonly identity = inject(IdentityService);
  protected readonly mobile = mediaQuerySignal(MOBILE_QUERY);

  protected readonly titleId = PROFILE_TITLE_ID;
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

  protected readonly colors = computed<Color[]>(() => this.store.active()?.colors ?? []);
  protected readonly chipLabel = computed(() => `${this.store.active()?.name ?? ''} · ${tribeName(this.colors())}`);
  /** Mobile shows the wheel only on the hub and "Perfil neste aparelho". */
  protected readonly mobileWheel = computed(
    () => !this.store.done() && (this.store.phase() === 'hub' || this.store.phase() === 'local'),
  );
  protected readonly stepActions = computed(() => STEP_ACTIONS.has(this.store.phase()));
  protected readonly verbLocked = computed(
    () => this.store.loading() || (this.store.phase() === 'delprofile' && this.store.deleteLocked()),
  );

  constructor() {
    // A new open() starts the flow at its requested step.
    effect(() => {
      const request = this.modal.request();
      if (request) {
        untracked(() => this.store.open(request.start));
      }
    });
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void this.store.submit();
  }
}
