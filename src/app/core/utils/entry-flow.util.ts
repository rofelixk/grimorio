import { FieldKey } from './cloud-error.util';
import { ACTION, CAPTION, DONE, FIELD, HELPER, MSG, PROMPT, SUBTITLE, TITLE } from './entry-copy';

// Pure pieces of the entry modal's state machine (R15): which phase shows what, the
// validation rules and the copy per phase. Everything here maps 1:1 to STATES.md rows.

/** Where the modal was opened from (STATES.md "Context"). */
export type EntryContext = 'device' | 'gate' | 'link';

export type EntryPhase =
  | 'list'
  | 'unlock'
  | 'localreset-warn'
  | 'localreset-newpw'
  | 'profile'
  | 'in'
  | 'up'
  | 'reset-email'
  | 'reset-code'
  | 'setup'
  | 'reauth'
  | 'recover-form'
  | 'recover-newpw'
  | 'unlink';

export type DoneKind = 'unlocked' | 'profiled' | 'linked' | 'created' | 'setup' | 'reauthed' | 'recovered' | 'unlinked';

/** STATES.md "Colors" column: preview = hovered/focused row, else active profile, else default. */
export type ColorSource = 'preview' | 'profile' | 'picks' | 'cloud' | 'default';

export interface EntryFields {
  name: string;
  email: string;
  pw: string;
  code: string;
}

export type FieldErrors = Partial<Record<FieldKey, string>>;

/** Values the copy interpolates. `profile` is the profile in view ({P}). */
export interface CopyVars {
  profile: string;
  email: string;
  linkedEmail: string;
  tribe: string;
  linked: boolean;
  activeName: string | null;
}

const CLOUD_PHASES: readonly EntryPhase[] = ['in', 'up', 'reset-email', 'reset-code', 'reauth', 'recover-form'];
const NEW_PASSWORD_PHASES: readonly EntryPhase[] = [
  'up',
  'reset-code',
  'setup',
  'recover-newpw',
  'profile',
  'localreset-newpw',
];
const LOCAL_PASSWORD_PHASES: readonly EntryPhase[] = ['setup', 'recover-newpw', 'profile', 'localreset-newpw'];
const NO_PASSWORD_PHASES: readonly EntryPhase[] = ['reset-email', 'unlink', 'list', 'localreset-warn'];
const EMAIL_PHASES: readonly EntryPhase[] = ['in', 'up', 'reset-email'];
const NAME_PHASES: readonly EntryPhase[] = ['profile', 'setup'];
const PLATE_PHASES: readonly EntryPhase[] = ['setup', 'reauth', 'recover-form'];
const FORGOT_PHASES: readonly EntryPhase[] = ['in', 'reauth', 'recover-form', 'unlock'];

export const NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const CODE_PATTERN = /^\d{6}$/;

export function isCloudPhase(phase: EntryPhase): boolean {
  return CLOUD_PHASES.includes(phase);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface PhaseFields {
  name: boolean;
  email: boolean;
  pw: boolean;
  code: boolean;
  plate: boolean;
  forgot: boolean;
}

export function fieldsFor(phase: EntryPhase): PhaseFields {
  return {
    name: NAME_PHASES.includes(phase),
    email: EMAIL_PHASES.includes(phase),
    pw: !NO_PASSWORD_PHASES.includes(phase),
    code: phase === 'reset-code',
    plate: PLATE_PHASES.includes(phase),
    forgot: FORGOT_PHASES.includes(phase),
  };
}

export function pwLabel(phase: EntryPhase): string {
  switch (phase) {
    case 'localreset-newpw':
    case 'recover-newpw':
      return FIELD.pwLocalNew;
    case 'recover-form':
      return FIELD.pwAccount;
    case 'reset-code':
      return FIELD.pwAccountNew;
    case 'setup':
      return FIELD.pwDevice;
    default:
      return FIELD.pw;
  }
}

export function pwAutocomplete(phase: EntryPhase): 'new-password' | 'current-password' {
  return NEW_PASSWORD_PHASES.includes(phase) ? 'new-password' : 'current-password';
}

/** The helper under the password field, or '' (it is also hidden while an error shows). */
export function pwHelper(phase: EntryPhase): string {
  if (!NEW_PASSWORD_PHASES.includes(phase)) {
    return '';
  }
  return LOCAL_PASSWORD_PHASES.includes(phase) ? HELPER.pwLocal : HELPER.pwNew;
}

export function titleFor(phase: EntryPhase, vars: CopyVars): string {
  switch (phase) {
    case 'list':
      return vars.activeName ? TITLE.listActive : TITLE.list;
    case 'unlock':
      return vars.profile;
    case 'localreset-warn':
      return TITLE.localresetWarn;
    case 'localreset-newpw':
      return TITLE.localresetNewpw;
    case 'profile':
      return TITLE.profile;
    case 'in':
      return TITLE.in;
    case 'up':
      return TITLE.up;
    case 'reset-email':
      return TITLE.resetEmail;
    case 'reset-code':
      return TITLE.resetCode;
    case 'setup':
      return TITLE.setup;
    case 'reauth':
      return TITLE.reauth;
    case 'recover-form':
      return TITLE.recoverForm;
    case 'recover-newpw':
      return TITLE.recoverNewpw;
    case 'unlink':
      return TITLE.unlink;
  }
}

export function subtitleFor(phase: EntryPhase, context: EntryContext, vars: CopyVars): string {
  switch (phase) {
    case 'list':
      return vars.activeName ? SUBTITLE.listActive(vars.activeName) : SUBTITLE.list;
    case 'unlock':
      return SUBTITLE.unlock(vars.tribe, vars.linked);
    case 'localreset-warn':
      return SUBTITLE.localresetWarn(vars.profile);
    case 'localreset-newpw':
      return SUBTITLE.localresetNewpw(vars.profile);
    case 'profile':
      return SUBTITLE.profile;
    case 'in':
      return context === 'link' ? SUBTITLE.inLink(vars.profile) : SUBTITLE.inDevice;
    case 'up':
      return SUBTITLE.up(vars.profile);
    case 'reset-email':
      return SUBTITLE.resetEmail;
    case 'reset-code':
      return SUBTITLE.resetCode(vars.email);
    case 'setup':
      return SUBTITLE.setup;
    case 'reauth':
      return SUBTITLE.reauth(vars.profile);
    case 'recover-form':
      return SUBTITLE.recoverForm(vars.profile);
    case 'recover-newpw':
      return SUBTITLE.recoverNewpw(vars.profile);
    case 'unlink':
      return SUBTITLE.unlink(vars.profile, vars.linkedEmail);
  }
}

const LABELS: Record<EntryPhase, readonly [string, string] | null> = {
  list: null,
  'localreset-warn': null,
  unlock: [ACTION.unlock, ACTION.unlockBusy],
  'localreset-newpw': [ACTION.saveAndUnlock, ACTION.saveBusy],
  profile: [ACTION.createProfile, ACTION.createProfileBusy],
  in: [ACTION.in, ACTION.inBusy],
  up: [ACTION.up, ACTION.upBusy],
  'reset-email': [ACTION.sendCode, ACTION.sendCodeBusy],
  'reset-code': [ACTION.saveAndEnter, ACTION.saveBusy],
  setup: [ACTION.createProfile, ACTION.createProfileBusy],
  reauth: [ACTION.in, ACTION.inBusy],
  'recover-form': [ACTION.continue, ACTION.verifyBusy],
  'recover-newpw': [ACTION.saveAndUnlock, ACTION.saveBusy],
  unlink: [ACTION.unlink, ACTION.unlinkBusy],
};

/** The primary action's label, or '' for phases without a submit (list, localreset-warn). */
export function primaryLabel(phase: EntryPhase): string {
  return LABELS[phase]?.[0] ?? '';
}

export function busyLabel(phase: EntryPhase): string {
  return LABELS[phase]?.[1] ?? '';
}

/** Where a bottom-prompt link goes: a phase, or back to the reset flow's origin. */
export type PromptTarget = EntryPhase | 'back';

export interface Prompt {
  ask: string;
  cta: string;
  target: PromptTarget;
}

export function promptFor(phase: EntryPhase, context: EntryContext): Prompt | null {
  if (context === 'gate' && (phase === 'profile' || phase === 'in')) {
    return { ...PROMPT.haveProfileHere, target: 'list' };
  }
  switch (phase) {
    case 'list':
      return { ...PROMPT.otherDevice, target: 'in' };
    case 'unlock':
      return { ...PROMPT.notYou, target: 'list' };
    case 'profile':
      return { ...PROMPT.haveCloud, target: 'in' };
    case 'in':
      return context === 'device' ? { ...PROMPT.noProfile, target: 'profile' } : { ...PROMPT.noCloud, target: 'up' };
    case 'up':
      return { ...PROMPT.haveAccount, target: 'in' };
    case 'reset-email':
    case 'reset-code':
      return { ...PROMPT.remembered, target: 'back' };
    default:
      return null;
  }
}

/**
 * STATES.md "Colors" column. `origin` is where a reset flow started, since reset screens keep
 * the colors unchanged. `done` is the success screen's kind, if one is showing.
 */
export function colorSourceFor(
  phase: EntryPhase,
  context: EntryContext,
  opts: { done?: DoneKind | null; origin?: EntryPhase | null; hasCloudColors?: boolean } = {},
): ColorSource {
  if (opts.done) {
    switch (opts.done) {
      case 'profiled':
        return 'picks';
      case 'linked':
      case 'setup':
        return opts.hasCloudColors ? 'cloud' : 'profile';
      default:
        return 'profile';
    }
  }
  switch (phase) {
    case 'list':
      return 'preview';
    case 'profile':
      return 'picks';
    case 'setup':
      return 'cloud';
    case 'in':
      return context === 'link' ? 'profile' : 'default';
    case 'reset-email':
    case 'reset-code':
      return opts.origin && opts.origin !== phase ? colorSourceFor(opts.origin, context) : 'profile';
    default:
      return 'profile';
  }
}

/** The 2-line caption under the desktop wheel (the prototype's `leftCaption` rules). */
export function captionFor(
  phase: EntryPhase,
  context: EntryContext,
  opts: { done?: DoneKind | null; focusMeta?: string | null; colorsReplaced?: boolean; hasCloudColors?: boolean },
): string {
  if (context === 'gate' && (phase === 'list' || phase === 'unlock') && !opts.done) {
    return phase === 'list' && opts.focusMeta ? opts.focusMeta : CAPTION.profiles;
  }
  if (phase.startsWith('localreset')) {
    return CAPTION.localReset;
  }
  if ((phase === 'profile' && !opts.done) || opts.done === 'profiled') {
    return CAPTION.picker;
  }
  if (opts.done === 'linked' && opts.colorsReplaced) {
    return CAPTION.colorsReplaced;
  }
  switch (phase) {
    case 'reauth':
      return CAPTION.reauth;
    case 'recover-form':
    case 'recover-newpw':
      return CAPTION.recover;
    case 'unlink':
      return CAPTION.unlink;
  }
  if (context !== 'link') {
    return opts.hasCloudColors ? CAPTION.cloudColors : CAPTION.bringCollection;
  }
  return CAPTION.optional;
}

export interface DoneCopy {
  title: string;
  body: string;
}

export function doneCopy(
  kind: DoneKind,
  vars: { profile: string; email: string; previous: string | null; replacedTribe: string | null },
): DoneCopy {
  const p = vars.profile;
  switch (kind) {
    case 'unlocked':
      return vars.previous && vars.previous !== p
        ? { title: DONE.switched.title, body: DONE.switched.body(p, vars.previous) }
        : { title: DONE.unlocked.title, body: DONE.unlocked.body(p) };
    case 'profiled':
      return { title: DONE.profiled.title, body: DONE.profiled.body(p) };
    case 'linked':
      return {
        title: DONE.linked.title,
        body:
          DONE.linked.body(p, vars.email) + (vars.replacedTribe ? ' ' + DONE.colorsReplaced(vars.replacedTribe) : ''),
      };
    case 'created':
      return { title: DONE.created.title, body: DONE.created.body(p, vars.email) };
    case 'setup':
      return { title: DONE.setup.title, body: DONE.setup.body(p) };
    case 'reauthed':
      return { title: DONE.reauthed.title, body: DONE.reauthed.body(p) };
    case 'recovered':
      return { title: DONE.recovered.title, body: DONE.recovered.body(p) };
    case 'unlinked':
      return { title: DONE.unlinked.title, body: DONE.unlinked.body(p) };
  }
}

/** Validates on submit, before any request (FR-005). Returns only the failing fields. */
export function validate(
  phase: EntryPhase,
  fields: EntryFields,
  deps: { isNameTaken: (name: string) => boolean },
): FieldErrors {
  const errors: FieldErrors = {};
  const shown = fieldsFor(phase);

  if (shown.email) {
    const email = normalizeEmail(fields.email);
    if (!email) {
      errors.email = MSG.emailEmpty;
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email = MSG.emailBad;
    }
  }

  if (shown.pw) {
    if (!fields.pw) {
      errors.pw = MSG.pwEmpty;
    } else if (NEW_PASSWORD_PHASES.includes(phase) && fields.pw.length < 8) {
      errors.pw = MSG.pwMin;
    }
  }

  if (shown.code && !CODE_PATTERN.test(fields.code)) {
    errors.code = MSG.codeFmt;
  }

  if (shown.name) {
    const name = fields.name.trim();
    if (name.length < 3 || name.length > 20) {
      errors.user = MSG.userLen;
    } else if (!NAME_PATTERN.test(name)) {
      errors.user = MSG.userChars;
    } else if (deps.isNameTaken(name)) {
      errors.user = MSG.userTaken;
    }
  }

  return errors;
}
