import { Signal } from '@angular/core';
import { FieldErrors, PhaseFields } from '@utils/entry-flow.util';

/** The fields CloudForm and ResetForm read and edit. */
export interface CloudFormFields {
  name: string;
  email: string;
  pw: string;
  code: string;
}

// What the shared cloud forms (CloudForm, ResetForm) read and call (research R2). Both modals'
// stores provide it with `{ provide: CloudFlowHost, useExisting: … }`, so the sign-in, create
// and reset forms — and their copy, from entry-flow.util — are the same in both.
export abstract class CloudFlowHost {
  abstract readonly phase: Signal<string>;
  abstract readonly shown: Signal<PhaseFields>;
  abstract readonly fields: Signal<CloudFormFields>;
  abstract readonly fieldErrors: Signal<FieldErrors>;
  abstract readonly pwLabel: Signal<string>;
  abstract readonly pwAutocomplete: Signal<string>;
  abstract readonly pwHelper: Signal<string>;
  abstract readonly plateEmail: Signal<string>;
  abstract readonly emailInUse: Signal<boolean>;
  abstract readonly emailLocked: Signal<boolean>;
  abstract editField(key: keyof CloudFormFields, value: string): void;
  /** "Esqueci minha senha". */
  abstract forgot(): void;
  /** "É seu? Recupere o acesso" under an e-mail already in use. */
  abstract recoverAccess(): void;
}
