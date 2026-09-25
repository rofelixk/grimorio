import { describe, expect, it } from 'vitest';
import { ACTION, MSG, PROMPT } from './entry-copy';
import {
  CopyVars,
  EntryFields,
  EntryPhase,
  busyLabel,
  colorSourceFor,
  doneCopy,
  fieldsFor,
  primaryLabel,
  promptFor,
  pwAutocomplete,
  subtitleFor,
  titleFor,
  validate,
} from './entry-flow.util';

const fields = (patch: Partial<EntryFields> = {}): EntryFields => ({
  name: 'rafa',
  email: 'rafa@exemplo.com',
  pw: 'grimorio123',
  code: '123456',
  ...patch,
});

const free = { isNameTaken: () => false };

const vars: CopyVars = {
  profile: 'rafa',
  email: 'rafa@exemplo.com',
  linkedEmail: 'rafa@exemplo.com',
  tribe: 'Izzet',
  linked: true,
  activeName: null,
};

describe('entry-flow.util validate', () => {
  it.each<EntryPhase>(['in', 'up', 'reset-email'])('requires a well-formed e-mail on %s', (phase) => {
    expect(validate(phase, fields({ email: '  ' }), free).email).toBe(MSG.emailEmpty);
    expect(validate(phase, fields({ email: 'rafa@' }), free).email).toBe(MSG.emailBad);
    expect(validate(phase, fields({ email: ' Rafa@Exemplo.com ' }), free).email).toBeUndefined();
  });

  it('does not check the e-mail where there is no e-mail field', () => {
    expect(validate('reauth', fields({ email: '' }), free).email).toBeUndefined();
  });

  it.each<EntryPhase>(['in', 'unlock', 'reauth', 'recover-form'])('requires a password on %s', (phase) => {
    expect(validate(phase, fields({ pw: '' }), free).pw).toBe(MSG.pwEmpty);
    expect(validate(phase, fields({ pw: '1234' }), free).pw).toBeUndefined();
  });

  it.each<EntryPhase>(['up', 'reset-code', 'setup', 'recover-newpw', 'profile', 'localreset-newpw'])(
    'requires at least 8 characters for a new password on %s',
    (phase) => {
      expect(validate(phase, fields({ pw: '' }), free).pw).toBe(MSG.pwEmpty);
      expect(validate(phase, fields({ pw: '1234567' }), free).pw).toBe(MSG.pwMin);
      expect(validate(phase, fields({ pw: '12345678' }), free).pw).toBeUndefined();
    },
  );

  it.each<EntryPhase>(['reset-email', 'unlink', 'list', 'localreset-warn'])('has no password on %s', (phase) => {
    expect(validate(phase, fields({ pw: '' }), free).pw).toBeUndefined();
  });

  it.each<EntryPhase>(['profile', 'setup'])('checks the profile name on %s', (phase) => {
    expect(validate(phase, fields({ name: 'jo' }), free).user).toBe(MSG.userLen);
    expect(validate(phase, fields({ name: 'a'.repeat(21) }), free).user).toBe(MSG.userLen);
    expect(validate(phase, fields({ name: 'a b' }), free).user).toBe(MSG.userChars);
    expect(validate(phase, fields({ name: 'rafa!' }), free).user).toBe(MSG.userChars);
    expect(validate(phase, fields({ name: 'RAFA' }), { isNameTaken: (n) => n.toLowerCase() === 'rafa' }).user).toBe(
      MSG.userTaken,
    );
    expect(validate(phase, fields({ name: ' r_a.f-9 ' }), free).user).toBeUndefined();
  });

  it('requires a 6-digit code on reset-code', () => {
    expect(validate('reset-code', fields({ code: '12345' }), free).code).toBe(MSG.codeFmt);
    expect(validate('reset-code', fields({ code: '12a456' }), free).code).toBe(MSG.codeFmt);
    expect(validate('reset-code', fields({ code: '123456' }), free).code).toBeUndefined();
  });

  it('returns nothing for a valid profile form', () => {
    expect(validate('profile', fields(), free)).toEqual({});
  });
});

describe('entry-flow.util copy', () => {
  it('uses the busy label per phase', () => {
    expect([primaryLabel('in'), busyLabel('in')]).toEqual([ACTION.in, ACTION.inBusy]);
    expect([primaryLabel('profile'), busyLabel('profile')]).toEqual(['Criar perfil', 'Criando perfil…']);
    expect([primaryLabel('recover-form'), busyLabel('recover-form')]).toEqual(['Continuar', 'Verificando…']);
    expect([primaryLabel('unlink'), busyLabel('unlink')]).toEqual(['Desvincular', 'Desvinculando…']);
    expect(primaryLabel('list')).toBe('');
  });

  it('titles the list by whether a profile is active', () => {
    expect(titleFor('list', vars)).toBe('Escolha um perfil');
    expect(titleFor('list', { ...vars, activeName: 'rafa' })).toBe('Trocar de perfil');
    expect(subtitleFor('list', 'gate', { ...vars, activeName: 'rafa' })).toBe(
      'Você está usando rafa. Escolha outro perfil e digite a senha.',
    );
  });

  it('subtitles sign-in by context', () => {
    expect(subtitleFor('in', 'link', vars)).toBe('Vincule rafa a uma conta na nuvem para sincronizar entre aparelhos.');
    expect(subtitleFor('in', 'device', vars)).toBe('Traga sua coleção da nuvem para este aparelho.');
    expect(subtitleFor('in', 'gate', vars)).toBe('Traga sua coleção da nuvem para este aparelho.');
  });

  it('names the unlock screen after the profile', () => {
    expect(titleFor('unlock', vars)).toBe('rafa');
    expect(subtitleFor('unlock', 'gate', vars)).toBe('Izzet · Vinculado à nuvem');
    expect(subtitleFor('unlock', 'gate', { ...vars, linked: false })).toBe('Izzet · Só neste aparelho');
  });

  it('uses new-password autocomplete where a password is created', () => {
    expect(pwAutocomplete('profile')).toBe('new-password');
    expect(pwAutocomplete('unlock')).toBe('current-password');
    expect(pwAutocomplete('recover-form')).toBe('current-password');
  });

  it('shows the account plate and forgot link per phase', () => {
    expect(fieldsFor('setup')).toMatchObject({ plate: true, name: true, pw: true, forgot: false });
    expect(fieldsFor('reauth')).toMatchObject({ plate: true, forgot: true });
    expect(fieldsFor('reset-email')).toMatchObject({ email: true, pw: false });
  });

  it('reads switch vs unlock on success', () => {
    expect(doneCopy('unlocked', { profile: 'bia', email: '', previous: 'rafa', replacedTribe: null })).toEqual({
      title: 'Perfil trocado',
      body: 'bia está ativo. Os dados de rafa ficaram ocultos.',
    });
    expect(doneCopy('unlocked', { profile: 'bia', email: '', previous: null, replacedTribe: null }).title).toBe(
      'Perfil desbloqueado',
    );
    expect(doneCopy('linked', { profile: 'bia', email: 'b@x.co', previous: null, replacedTribe: 'Mono-branco' }).body).toBe(
      'bia agora sincroniza com b@x.co. As cores da conta (Mono-branco) passaram a valer para este perfil.',
    );
  });
});

describe('entry-flow.util promptFor', () => {
  const cases: [EntryPhase, 'device' | 'gate' | 'link', { ask: string; cta: string } | null, string | null][] = [
    ['list', 'gate', PROMPT.otherDevice, 'in'],
    ['unlock', 'gate', PROMPT.notYou, 'list'],
    ['profile', 'device', PROMPT.haveCloud, 'in'],
    ['profile', 'gate', PROMPT.haveProfileHere, 'list'],
    ['in', 'device', PROMPT.noProfile, 'profile'],
    ['in', 'gate', PROMPT.haveProfileHere, 'list'],
    ['in', 'link', PROMPT.noCloud, 'up'],
    ['up', 'link', PROMPT.haveAccount, 'in'],
    ['reset-email', 'link', PROMPT.remembered, 'back'],
    ['reset-code', 'gate', PROMPT.remembered, 'back'],
    ['setup', 'device', null, null],
    ['reauth', 'link', null, null],
    ['unlink', 'link', null, null],
    ['localreset-warn', 'gate', null, null],
  ];

  it.each(cases)('%s in %s context', (phase, context, copy, target) => {
    const prompt = promptFor(phase, context);
    if (!copy) {
      expect(prompt).toBeNull();
      return;
    }
    expect(prompt).toEqual({ ...copy, target });
  });
});

describe('entry-flow.util colorSourceFor', () => {
  it('follows STATES.md "Colors" per phase', () => {
    expect(colorSourceFor('list', 'gate')).toBe('preview');
    expect(colorSourceFor('unlock', 'gate')).toBe('profile');
    expect(colorSourceFor('localreset-newpw', 'gate')).toBe('profile');
    expect(colorSourceFor('profile', 'device')).toBe('picks');
    expect(colorSourceFor('in', 'link')).toBe('profile');
    expect(colorSourceFor('in', 'device')).toBe('default');
    expect(colorSourceFor('in', 'gate')).toBe('default');
    expect(colorSourceFor('up', 'link')).toBe('profile');
    expect(colorSourceFor('setup', 'device')).toBe('cloud');
    expect(colorSourceFor('reauth', 'link')).toBe('profile');
    expect(colorSourceFor('unlink', 'link')).toBe('profile');
  });

  it('keeps colors unchanged through the reset flow', () => {
    expect(colorSourceFor('reset-email', 'device', { origin: 'in' })).toBe('default');
    expect(colorSourceFor('reset-code', 'link', { origin: 'in' })).toBe('profile');
  });

  it('switches to the account colors after a link or setup', () => {
    expect(colorSourceFor('in', 'link', { done: 'linked', hasCloudColors: true })).toBe('cloud');
    expect(colorSourceFor('in', 'link', { done: 'linked', hasCloudColors: false })).toBe('profile');
    expect(colorSourceFor('setup', 'device', { done: 'setup', hasCloudColors: true })).toBe('cloud');
    expect(colorSourceFor('profile', 'device', { done: 'profiled' })).toBe('picks');
  });
});
