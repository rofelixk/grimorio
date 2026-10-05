import { CloudLink } from '@models/profile.model';
import { CAPTION, MSG, PROFILE, PROMPT, SUBTITLE, TITLE } from './entry-copy';
import {
  FieldErrors,
  FormPhase,
  busyLabel as entryBusyLabel,
  primaryLabel as entryPrimaryLabel,
  validate as validateEntry,
} from './entry-flow.util';

// Pure pieces of the profile modal's state machine (spec 005 data-model §6): which phase shows
// what, the copy per phase and the step validation. The shared cloud phases (`in`, `up`,
// `reauth`, the reset steps) reuse entry-flow.util's field rules and labels unchanged (R2).

export type ProfilePhase =
  | 'hub'
  | 'local'
  | 'cloud'
  | 'pw'
  | 'delprofile'
  | 'cloudpw'
  | 'unlink'
  | 'delcloud'
  | 'in'
  | 'up'
  | 'reauth'
  | 'reset-email'
  | 'reset-code';

/** The screen an action step returns to on Cancelar / Concluir (R18). */
export type ProfileOrigin = 'hub' | 'local' | 'cloud';

export type LinkState = 'local' | 'expired' | 'linked';

export type ProfileDoneKind =
  | 'pwChanged'
  | 'cloudPwChanged'
  | 'linked'
  | 'created'
  | 'reauthed'
  | 'unlinked'
  | 'cloudDeleted';

export interface ProfileFields {
  name: string;
  email: string;
  pw: string;
  pwNew: string;
  pwConfirm: string;
  code: string;
}

/** Values the copy interpolates: the active profile ({nome}), its link and the typed e-mail. */
export interface ProfileCopyVars {
  name: string;
  /** The linked account's e-mail ('' when local). */
  linkedEmail: string;
  /** The e-mail typed in the form (reset-code copy). */
  email: string;
  link: LinkState;
}

const SCREENS: readonly ProfilePhase[] = ['hub', 'local', 'cloud'];
const SHARED_CLOUD: readonly ProfilePhase[] = ['in', 'up', 'reauth', 'reset-email', 'reset-code'];

export function isScreen(phase: ProfilePhase): phase is ProfileOrigin {
  return SCREENS.includes(phase);
}

/** `in`, `up`, `reauth` and the reset steps: rendered by the shared CloudForm/ResetForm. */
export function isSharedCloudPhase(phase: ProfilePhase): phase is ProfilePhase & FormPhase {
  return SHARED_CLOUD.includes(phase);
}

export function linkState(profile: { cloud: CloudLink | null }): LinkState {
  if (!profile.cloud) {
    return 'local';
  }
  return profile.cloud.needsReauth ? 'expired' : 'linked';
}

/** The hub's "Conta na nuvem" row meta. */
export function hubCloudMeta(profile: { cloud: CloudLink | null }): string {
  switch (linkState(profile)) {
    case 'linked':
      return profile.cloud!.email;
    case 'expired':
      return PROFILE.hub.cloudMetaExpired(profile.cloud!.email);
    case 'local':
      return PROFILE.hub.cloudMetaLocal;
  }
}

export function titleFor(phase: ProfilePhase, vars: ProfileCopyVars): string {
  switch (phase) {
    case 'hub':
      return vars.name;
    case 'local':
      return PROFILE.local.title;
    case 'cloud':
      return PROFILE.cloud.title;
    case 'pw':
      return PROFILE.steps.pw.title;
    case 'cloudpw':
      return PROFILE.steps.cloudpw.title;
    case 'delprofile':
      return PROFILE.steps.delprofile.title;
    case 'delcloud':
      return PROFILE.steps.delcloud.title;
    case 'unlink':
      return PROFILE.steps.unlink.title;
    case 'in':
      return PROFILE.steps.in.title;
    case 'up':
      return PROFILE.steps.up.title;
    case 'reauth':
      return PROFILE.steps.reauth.title;
    case 'reset-email':
      return TITLE.resetEmail;
    case 'reset-code':
      return TITLE.resetCode;
  }
}

/** '' = no subtitle (the hub). */
export function subtitleFor(phase: ProfilePhase, vars: ProfileCopyVars): string {
  const { name, linkedEmail, link } = vars;
  switch (phase) {
    case 'hub':
      return '';
    case 'local':
      return link === 'local' ? PROFILE.local.subtitleLocal : PROFILE.local.subtitleLinked;
    case 'cloud':
      switch (link) {
        case 'linked':
          return PROFILE.cloud.subtitleLinked(name, linkedEmail);
        case 'expired':
          return PROFILE.cloud.subtitleExpired(name);
        case 'local':
          return PROFILE.cloud.subtitleLocal(name);
      }
      break;
    case 'pw':
      return link === 'local' ? PROFILE.steps.pw.subtitleLocal(name) : PROFILE.steps.pw.subtitleLinked(name);
    case 'cloudpw':
      return PROFILE.steps.cloudpw.subtitle;
    case 'delprofile':
      return PROFILE.steps.delprofile.subtitle(name);
    case 'delcloud':
      return PROFILE.steps.delcloud.subtitle(linkedEmail);
    case 'unlink':
      return PROFILE.steps.unlink.subtitle(name, linkedEmail);
    case 'in':
      return PROFILE.steps.in.subtitle(name);
    case 'up':
      return PROFILE.steps.up.subtitle(name);
    case 'reauth':
      return PROFILE.steps.reauth.subtitle(name);
    case 'reset-email':
      return SUBTITLE.resetEmail;
    case 'reset-code':
      return SUBTITLE.resetCode(vars.email);
  }
  return '';
}

/** The two-line caption under the desktop wheel. */
export function captionFor(phase: ProfilePhase, opts: { done?: ProfileDoneKind | null; colorsReplaced?: boolean } = {}): string {
  if (opts.done === 'linked' && opts.colorsReplaced) {
    return CAPTION.colorsReplaced;
  }
  switch (phase) {
    case 'hub':
      return PROFILE.hub.caption;
    case 'local':
      return PROFILE.local.caption;
    case 'pw':
      return PROFILE.steps.pw.caption;
    case 'reauth':
      return PROFILE.steps.reauth.caption;
    case 'unlink':
      return PROFILE.steps.unlink.caption;
    case 'delprofile':
      return PROFILE.steps.delprofile.caption;
    case 'delcloud':
      return PROFILE.steps.delcloud.caption;
    default:
      return PROFILE.cloud.caption;
  }
}

/** Where a bottom-prompt link goes: a phase, the reset flow's origin, or the entry modal's list. */
export type ProfilePromptTarget = ProfilePhase | 'back' | 'switch';

export interface ProfilePrompt {
  ask: string;
  cta: string;
  target: ProfilePromptTarget;
}

/** The pinned bottom prompt: only on the hub, `in`, `up` and the reset steps. */
export function promptFor(phase: ProfilePhase): ProfilePrompt | null {
  switch (phase) {
    case 'hub':
      return { ...PROFILE.hub.prompt, target: 'switch' };
    case 'in':
      return { ...PROMPT.noCloud, target: 'up' };
    case 'up':
      return { ...PROMPT.haveAccount, target: 'in' };
    case 'reset-email':
    case 'reset-code':
      return { ...PROMPT.remembered, target: 'back' };
    default:
      return null;
  }
}

const STEP_LABELS: Partial<Record<ProfilePhase, readonly [string, string]>> = {
  local: [PROFILE.local.save, PROFILE.local.saveBusy],
  pw: [PROFILE.steps.pw.verb, PROFILE.steps.pw.busy],
  cloudpw: [PROFILE.steps.cloudpw.verb, PROFILE.steps.cloudpw.busy],
  unlink: [PROFILE.steps.unlink.verb, PROFILE.steps.unlink.busy],
  delprofile: [PROFILE.steps.delprofile.verb, PROFILE.steps.delprofile.busy],
  delcloud: [PROFILE.steps.delcloud.verb, PROFILE.steps.delcloud.busy],
};

/** The verb of the phase's submit, or '' for the hub and the cloud screen. */
export function primaryLabel(phase: ProfilePhase): string {
  return isSharedCloudPhase(phase) ? entryPrimaryLabel(phase) : (STEP_LABELS[phase]?.[0] ?? '');
}

export function busyLabel(phase: ProfilePhase): string {
  return isSharedCloudPhase(phase) ? entryBusyLabel(phase) : (STEP_LABELS[phase]?.[1] ?? '');
}

/** Destructive steps use the danger verb. */
export function isDangerStep(phase: ProfilePhase): boolean {
  return phase === 'unlink' || phase === 'delprofile' || phase === 'delcloud';
}

export interface ProfileDoneCopy {
  title: string;
  body: string;
}

export function doneCopy(
  kind: ProfileDoneKind,
  vars: { name: string; email: string; linked: boolean; replacedTribe: string | null },
): ProfileDoneCopy {
  const { name, email } = vars;
  switch (kind) {
    case 'pwChanged':
      return { title: PROFILE.done.pwChanged.title, body: PROFILE.done.pwChanged.body(name, vars.linked) };
    case 'cloudPwChanged':
      return { title: PROFILE.done.cloudPwChanged.title, body: PROFILE.done.cloudPwChanged.body(email) };
    case 'linked':
      return {
        title: PROFILE.done.linked.title,
        body:
          PROFILE.done.linked.body(name, email) +
          (vars.replacedTribe ? ' ' + PROFILE.done.colorsReplaced(vars.replacedTribe) : ''),
      };
    case 'created':
      return { title: PROFILE.done.created.title, body: PROFILE.done.created.body(name, email) };
    case 'reauthed':
      return { title: PROFILE.done.reauthed.title, body: PROFILE.done.reauthed.body(name) };
    case 'unlinked':
      return { title: PROFILE.done.unlinked.title, body: PROFILE.done.unlinked.body(name) };
    case 'cloudDeleted':
      return { title: PROFILE.done.cloudDeleted.title, body: PROFILE.done.cloudDeleted.body(name, email) };
  }
}

/**
 * Validates a step on submit, before any request. `pw` checks in order: current, new length,
 * confirmation (R7); `cloudpw`: current, new length. The shared cloud phases use entry-flow's
 * rules. Returns only the failing fields.
 */
export function validateStep(phase: ProfilePhase, fields: ProfileFields): FieldErrors {
  if (isSharedCloudPhase(phase)) {
    return validateEntry(phase, fields, { isNameTaken: () => false });
  }
  switch (phase) {
    case 'pw':
      if (!fields.pw) {
        return { pw: MSG.pwEmpty };
      }
      if (fields.pwNew.length < 8) {
        return { pwNew: MSG.pwMin };
      }
      return fields.pwConfirm !== fields.pwNew ? { pwConfirm: MSG.pwMismatch } : {};
    case 'cloudpw':
      if (!fields.pw) {
        return { pw: MSG.pwEmpty };
      }
      return fields.pwNew.length < 8 ? { pwNew: MSG.pwMin } : {};
    case 'delprofile':
    case 'delcloud':
      return fields.pw ? {} : { pw: MSG.pwEmpty };
    default:
      return {};
  }
}
