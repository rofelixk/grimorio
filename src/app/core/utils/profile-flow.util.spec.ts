import { describe, expect, it } from 'vitest';
import { CloudLink } from '@models/profile.model';
import { ACTION, CAPTION, MSG, PROFILE } from './entry-copy';
import {
  ProfileCopyVars,
  ProfileFields,
  busyLabel,
  captionFor,
  doneCopy,
  hubCloudMeta,
  linkState,
  primaryLabel,
  promptFor,
  subtitleFor,
  titleFor,
  validateStep,
} from './profile-flow.util';

const LINKED: CloudLink = { userId: 'u1', email: 'rafa@exemplo.com', needsReauth: false };
const EXPIRED: CloudLink = { ...LINKED, needsReauth: true };

const vars = (patch: Partial<ProfileCopyVars> = {}): ProfileCopyVars => ({
  name: 'rafa',
  linkedEmail: 'rafa@exemplo.com',
  email: '',
  link: 'linked',
  ...patch,
});

const fields = (patch: Partial<ProfileFields> = {}): ProfileFields => ({
  name: '',
  email: '',
  pw: 'atual1234',
  pwNew: 'novasenha1',
  pwConfirm: 'novasenha1',
  code: '',
  ...patch,
});

describe('linkState', () => {
  it('is local without a cloud link, expired when it needs reauth, else linked', () => {
    expect(linkState({ cloud: null })).toBe('local');
    expect(linkState({ cloud: EXPIRED })).toBe('expired');
    expect(linkState({ cloud: LINKED })).toBe('linked');
  });
});

describe('hubCloudMeta', () => {
  it('shows the e-mail, the expired e-mail, or the link invitation', () => {
    expect(hubCloudMeta({ cloud: LINKED })).toBe('rafa@exemplo.com');
    expect(hubCloudMeta({ cloud: EXPIRED })).toBe('Sessão expirada · rafa@exemplo.com');
    expect(hubCloudMeta({ cloud: null })).toBe('Vincular para sincronizar entre aparelhos');
  });
});

describe('copy per phase', () => {
  it('titles the hub with the profile name and no subtitle', () => {
    expect(titleFor('hub', vars())).toBe('rafa');
    expect(subtitleFor('hub', vars())).toBe('');
  });

  it('words the local screen by link state', () => {
    expect(subtitleFor('local', vars({ link: 'local' }))).toBe(PROFILE.local.subtitleLocal);
    expect(subtitleFor('local', vars({ link: 'expired' }))).toBe(PROFILE.local.subtitleLinked);
  });

  it('words the cloud screen by link state', () => {
    expect(subtitleFor('cloud', vars())).toBe('rafa sincroniza com rafa@exemplo.com.');
    expect(subtitleFor('cloud', vars({ link: 'expired' }))).toBe(
      'A sessão expirou. rafa continua funcionando neste aparelho.',
    );
    expect(subtitleFor('cloud', vars({ link: 'local' }))).toBe(
      'Opcional — vincule para sincronizar rafa entre aparelhos.',
    );
  });

  it('uses the link-context copy for the cloud steps', () => {
    expect(titleFor('in', vars())).toBe('Entrar na conta');
    expect(subtitleFor('in', vars())).toBe('Vincule rafa a uma conta na nuvem para sincronizar entre aparelhos.');
    expect(titleFor('reauth', vars())).toBe('Entre de novo');
    expect(captionFor('reauth')).toBe(PROFILE.steps.reauth.caption);
    expect(captionFor('unlink')).toBe(PROFILE.steps.unlink.caption);
    expect(subtitleFor('reset-code', vars({ email: 'a@b.co' }))).toContain('a@b.co');
  });

  it('words the pw step by link state', () => {
    expect(subtitleFor('pw', vars())).toContain('A senha da conta na nuvem não muda.');
    expect(subtitleFor('pw', vars({ link: 'local' }))).toBe('A nova senha passa a desbloquear rafa neste aparelho.');
  });

  it('names the account on delcloud', () => {
    expect(subtitleFor('delcloud', vars())).toContain('A conta rafa@exemplo.com e todos os dados dela');
  });

  it('captions the linked done screen when the account colors replaced the profile’s', () => {
    expect(captionFor('in', { done: 'linked', colorsReplaced: true })).toBe(CAPTION.colorsReplaced);
    expect(captionFor('hub')).toBe(PROFILE.hub.caption);
  });
});

describe('promptFor', () => {
  it('pins a prompt only on the hub, in, up and the reset steps', () => {
    expect(promptFor('hub')).toMatchObject({ ask: 'Não é você?', cta: 'Trocar de perfil', target: 'switch' });
    expect(promptFor('in')?.target).toBe('up');
    expect(promptFor('up')?.target).toBe('in');
    expect(promptFor('reset-code')?.target).toBe('back');
    for (const phase of ['local', 'cloud', 'pw', 'cloudpw', 'unlink', 'delprofile', 'delcloud', 'reauth'] as const) {
      expect(promptFor(phase)).toBeNull();
    }
  });
});

describe('labels', () => {
  it('uses the step verbs and the shared cloud labels', () => {
    expect(primaryLabel('local')).toBe('Salvar');
    expect(busyLabel('local')).toBe('Salvando…');
    expect(primaryLabel('delprofile')).toBe('Excluir perfil');
    expect(busyLabel('delcloud')).toBe('Excluindo…');
    expect(primaryLabel('reauth')).toBe(ACTION.in);
    expect(primaryLabel('hub')).toBe('');
  });
});

describe('validateStep', () => {
  it('checks pw in order: current, new length, confirmation', () => {
    expect(validateStep('pw', fields({ pw: '', pwNew: 'x' }))).toEqual({ pw: MSG.pwEmpty });
    expect(validateStep('pw', fields({ pwNew: 'curta', pwConfirm: 'outra' }))).toEqual({ pwNew: MSG.pwMin });
    expect(validateStep('pw', fields({ pwConfirm: 'diferente1' }))).toEqual({ pwConfirm: MSG.pwMismatch });
    expect(validateStep('pw', fields())).toEqual({});
  });

  it('checks cloudpw: current, then new length', () => {
    expect(validateStep('cloudpw', fields({ pw: '' }))).toEqual({ pw: MSG.pwEmpty });
    expect(validateStep('cloudpw', fields({ pwNew: 'curta' }))).toEqual({ pwNew: MSG.pwMin });
    expect(validateStep('cloudpw', fields({ pwConfirm: '' }))).toEqual({});
  });

  it('asks for the password on both deletions', () => {
    expect(validateStep('delprofile', fields({ pw: '' }))).toEqual({ pw: MSG.pwEmpty });
    expect(validateStep('delcloud', fields())).toEqual({});
  });

  it('delegates the shared cloud phases to the entry rules', () => {
    expect(validateStep('in', fields({ email: '' }))).toEqual({ email: MSG.emailEmpty });
    expect(validateStep('reauth', fields({ pw: '' }))).toEqual({ pw: MSG.pwEmpty });
    expect(validateStep('unlink', fields({ pw: '' }))).toEqual({});
  });
});

describe('doneCopy', () => {
  const base = { name: 'rafa', email: 'rafa@exemplo.com', linked: true, replacedTribe: null };

  it('adds the cloud sentence to pwChanged only when linked', () => {
    expect(doneCopy('pwChanged', base).body).toBe(
      'A nova senha já desbloqueia rafa neste aparelho. A senha da conta na nuvem continua a mesma.',
    );
    expect(doneCopy('pwChanged', { ...base, linked: false }).body).toBe(
      'A nova senha já desbloqueia rafa neste aparelho.',
    );
  });

  it('names the tribe when a link replaced the colors', () => {
    expect(doneCopy('linked', { ...base, replacedTribe: 'Izzet' }).body).toContain('(Izzet)');
  });

  it('covers every cloud done kind', () => {
    expect(doneCopy('cloudPwChanged', base).title).toBe('Senha da conta alterada');
    expect(doneCopy('cloudDeleted', base).title).toBe('Conta excluída');
    expect(doneCopy('unlinked', base).title).toBe('Conta desvinculada');
    expect(doneCopy('reauthed', base).title).toBe('Sincronização retomada');
    expect(doneCopy('created', base).title).toBe('Conta criada');
  });
});
