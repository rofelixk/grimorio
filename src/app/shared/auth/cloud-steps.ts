import { DestroyRef, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { CloudAuthService } from '@services/cloud-auth.service';
import { ACTION } from '@utils/entry-copy';
import {
  FieldErrors,
  FormPhase,
  PhaseFields,
  fieldsFor,
  pwAutocomplete,
  pwHelper,
  pwLabel,
} from '@utils/entry-flow.util';
import { CloudFormFields, FlowForm } from '@shared/auth/flow-form';

const RESEND_COOLDOWN_S = 30;
const NO_FIELDS: PhaseFields = { name: false, email: false, pw: false, code: false, plate: false, forgot: false };

export interface CloudStepsHost<F extends CloudFormFields, P extends string> {
  form: FlowForm<F>;
  phase: Signal<P>;
  /** The phases CloudForm and ResetForm render; elsewhere they show no fields. */
  isCloudPhase: (phase: P) => phase is P & FormPhase;
  plateEmail: Signal<string>;
  /** The e-mail a reset started from the current phase is fixed to; null = editable. */
  lockedEmail: Signal<string | null>;
  /** Navigates, invalidating in-flight results. */
  go: (phase: P) => void;
  /** Navigates without invalidating, after a request lands. */
  toPhase: (phase: P) => void;
}

// The cloud steps both auth modals share (research R9): the sign-in/create forms' labels, the
// reset code with its cooldown and resend, "Esqueci minha senha", "Recupere o acesso", "Usar
// outro e-mail" and "Voltar". Each flow store creates its own in a field initializer and its
// modal provides it (`{ provide: CloudSteps, useFactory: … }`) to CloudForm and ResetForm, so
// both modals render the same forms with separate state.
export class CloudSteps<F extends CloudFormFields = CloudFormFields, P extends string = string> {
  private readonly cloudAuth = inject(CloudAuthService);
  private readonly form: FlowForm<F>;

  // What CloudForm and ResetForm read
  readonly phase: Signal<P>;
  readonly fields: Signal<F>;
  readonly fieldErrors: Signal<FieldErrors>;
  readonly plateEmail: Signal<string>;
  readonly emailInUse: Signal<boolean>;
  /** Reset for the linked account (from reauth/recover): the e-mail is fixed. */
  readonly emailLocked = signal(false);
  readonly shown: Signal<PhaseFields>;
  readonly pwLabel: Signal<string>;
  readonly pwAutocomplete: Signal<string>;
  readonly pwHelper: Signal<string>;

  // Reset code
  /** Where the reset flow returns to ("Voltar") and continues after the code. */
  readonly backTarget: WritableSignal<P | null> = signal(null);
  private readonly cooldownLeft = signal(0);
  readonly cooldown = this.cooldownLeft.asReadonly();
  private readonly resendingState = signal(false);
  readonly resending = this.resendingState.asReadonly();
  readonly isCloudBusy: Signal<boolean>;
  readonly resendLabel = computed(() => (this.cooldown() > 0 ? ACTION.resendIn(this.cooldown()) : ACTION.resendCode));

  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly host: CloudStepsHost<F, P>) {
    const { form, phase, isCloudPhase } = host;
    this.form = form;
    this.phase = phase;
    this.fields = form.fields;
    this.fieldErrors = form.fieldErrors;
    this.plateEmail = host.plateEmail;
    this.emailInUse = form.emailInUse;
    this.isCloudBusy = computed(() => form.loading() || this.resending());
    this.shown = computed(() => {
      const p = phase();
      return isCloudPhase(p) ? fieldsFor(p) : NO_FIELDS;
    });
    this.pwLabel = computed(() => {
      const p = phase();
      return isCloudPhase(p) ? pwLabel(p) : '';
    });
    this.pwAutocomplete = computed(() => {
      const p = phase();
      return isCloudPhase(p) ? pwAutocomplete(p) : 'current-password';
    });
    this.pwHelper = computed(() => {
      const p = phase();
      return isCloudPhase(p) ? pwHelper(p) : '';
    });
    inject(DestroyRef).onDestroy(() => this.stopCooldown());
  }

  editField(key: keyof CloudFormFields, value: string): void {
    this.form.edit(key, value);
  }

  /** "Esqueci minha senha": a reset that returns here, fixed to `lockedEmail` when it has one. */
  forgot(): void {
    this.backTarget.set(this.phase());
    const locked = this.host.lockedEmail();
    if (locked !== null) {
      this.form.fields.update((f) => ({ ...f, email: locked }));
      this.emailLocked.set(true);
    }
    this.host.go('reset-email' as P);
  }

  /** "É seu? Recupere o acesso" under an e-mail already in use (only account creation reports one). */
  recoverAccess(): void {
    this.backTarget.set(this.phase());
    this.host.go('reset-email' as P);
  }

  /** "Usar outro e-mail" — back to the e-mail step, keeping the flow's origin. */
  otherEmail(): void {
    this.host.go('reset-email' as P);
  }

  /** "Voltar" out of the reset flow. */
  back(): void {
    const back = this.backTarget() ?? ('in' as P);
    this.backTarget.set(null);
    this.emailLocked.set(false);
    this.host.go(back);
  }

  /** The `reset-email` step's request: on to the code, with the resend cooldown running. */
  async requestCode(token: number): Promise<void> {
    await this.cloudAuth.requestResetCode(this.form.fields().email);
    if (!this.form.stale(token)) {
      this.host.toPhase('reset-code' as P);
      this.startCooldown();
    }
  }

  /** "Enviar novo código": blocked for 30 s after each send (FR-024). */
  async resend(): Promise<void> {
    if (this.cooldown() > 0 || this.resending() || this.form.loading()) {
      return;
    }
    this.resendingState.set(true);
    this.form.formError.set('');
    const token = this.form.token();
    try {
      await this.cloudAuth.requestResetCode(this.form.fields().email);
      if (!this.form.stale(token)) {
        this.form.fields.update((f) => ({ ...f, code: '' }));
        this.form.fieldErrors.set({});
        this.startCooldown();
      }
    } catch (error) {
      if (!this.form.stale(token)) {
        this.form.fail(error);
      }
    } finally {
      if (!this.form.stale(token)) {
        this.resendingState.set(false);
      }
    }
  }

  reset(): void {
    this.stopCooldown();
    this.backTarget.set(null);
    this.emailLocked.set(false);
    this.resendingState.set(false);
    void this.cloudAuth.discardPending();
  }

  private startCooldown(): void {
    this.stopCooldown();
    this.cooldownLeft.set(RESEND_COOLDOWN_S);
    this.cooldownTimer = setInterval(() => {
      this.cooldownLeft.update((n) => Math.max(0, n - 1));
      if (this.cooldown() === 0) {
        this.stopCooldown();
      }
    }, 1000);
  }

  private stopCooldown(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this.cooldownLeft.set(0);
  }
}
