import { WritableSignal, signal } from '@angular/core';
import { Failure, FieldKey, mapCloudError } from '@utils/cloud-error.util';
import { FieldErrors } from '@utils/entry-flow.util';

/** The fields CloudForm and ResetForm read and edit. */
export interface CloudFormFields {
  name: string;
  email: string;
  pw: string;
  code: string;
}

export interface FlowFormConfig<F extends CloudFormFields> {
  blank: F;
  /** Which error each field clears when edited. */
  errorKeys: Record<keyof F, FieldKey>;
}

type FieldFailure = Extract<Failure, { kind: 'field' }>;

// The form state both auth modals run on (research R9), local steps and cloud steps alike:
// fields, errors, loading and the stale-result token. One per flow store, so one per modal mount.
export class FlowForm<F extends CloudFormFields> {
  readonly fields: WritableSignal<F>;
  readonly fieldErrors = signal<FieldErrors>({});
  readonly formError = signal('');
  readonly emailInUse = signal(false);
  readonly loading = signal(false);

  // Bumped on reset and on user navigation, so a request that resolves after the person moved
  // on (or closed the modal) never writes into the new state.
  private generation = 0;

  constructor(private readonly config: FlowFormConfig<F>) {
    this.fields = signal(config.blank);
  }

  token(): number {
    return this.generation;
  }

  stale(token: number): boolean {
    return token !== this.generation;
  }

  /** Invalidates in-flight results (reset, navigation). */
  bump(): void {
    this.generation++;
  }

  edit(key: keyof F, value: string): void {
    const next = key === 'code' ? value.replace(/\D/g, '').slice(0, 6) : value;
    this.fields.update((f) => ({ ...f, [key]: next }));
    const errorKey = this.config.errorKeys[key];
    if (this.fieldErrors()[errorKey]) {
      this.fieldErrors.update((errors) => {
        const rest = { ...errors };
        delete rest[errorKey];
        return rest;
      });
    }
    if (key === 'email') {
      this.emailInUse.set(false);
    }
  }

  /** On a phase switch: blank `keys`, clear errors, form error and e-mail-in-use. */
  clearForPhase(keys: readonly (keyof F)[]): void {
    this.fields.update((f) => {
      const next = { ...f };
      for (const key of keys) {
        next[key] = '' as F[keyof F];
      }
      return next;
    });
    this.fieldErrors.set({});
    this.formError.set('');
    this.emailInUse.set(false);
  }

  /** Maps a failure (mapCloudError) to a field or the form; `remap` renames the field. */
  fail(error: unknown, remap?: (failure: FieldFailure) => FieldKey): Failure {
    const failure = mapCloudError(error);
    if (failure.kind === 'field') {
      this.fieldErrors.set({ [remap ? remap(failure) : failure.field]: failure.message });
      this.emailInUse.set(!!failure.emailInUse);
    } else {
      this.formError.set(failure.message);
    }
    return failure;
  }

  /**
   * Validates on submit before any request; locked while a request runs. Validation errors are set
   * and nothing runs; otherwise clears errors, locks `loading`, runs with the current token and
   * maps a fresh failure through `onError`.
   */
  async submit(
    validate: () => FieldErrors,
    run: (token: number) => Promise<void>,
    onError: (error: unknown) => void,
  ): Promise<void> {
    if (this.loading()) {
      return;
    }
    const errors = validate();
    if (Object.keys(errors).length) {
      this.fieldErrors.set(errors);
      this.formError.set('');
      return;
    }
    this.fieldErrors.set({});
    this.formError.set('');
    this.emailInUse.set(false);
    this.loading.set(true);
    const token = this.generation;
    try {
      await run(token);
    } catch (error) {
      if (!this.stale(token)) {
        onError(error);
      }
    } finally {
      if (!this.stale(token)) {
        this.loading.set(false);
      }
    }
  }

  reset(): void {
    this.bump();
    this.fields.set(this.config.blank);
    this.fieldErrors.set({});
    this.formError.set('');
    this.emailInUse.set(false);
    this.loading.set(false);
  }
}
