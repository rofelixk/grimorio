import { describe, expect, it } from 'vitest';
import { ACTION, MSG, PROMPT } from './entry-copy';
import {
  CopyVars,
  EntryFields,
  EntryPhase,
  FormPhase,
  busyLabel,
  captionFor,
  colorSourceFor,
  doneCopy,
  fieldsFor,
  primaryLabel,
  promptFor,
  pwAutocomplete,
  subtitleFor,
  titleFor,
  validate,
  validateName,
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
  tribe: 'Izzet',
  linked: true,
  activeName: null,
};

describe('entry-flow.util validate', () => {
  it.each<FormPhase>(['in', 'up', 'reset-email'])('requires a well-formed e-mail on %s', (phase) => {
    expect(validate(phase, fields({ email: '  ' }), free).email).toBe(MSG.emailEmpty);
    expect(validate(phase, fields({ email: 'rafa@' }), free).email).toBe(MSG.emailBad);
    expect(validate(phase, fields({ email: ' Rafa@Exemplo.com ' }), free).email).toBeUndefined();
  });

  it('does not check the e-mail where there is no e-mail field', () => {
    expect(validate('reauth', fields({ email: '' }), free).email).toBeUndefined();
  });

  it.each<FormPhase>(['in', 'unlock', 'reauth', 'recover-form'])('requires a password on %s', (phase) => {
    expect(validate(phase, fields({ pw: '' }), free).pw).toBe(MSG.pwEmpty);
    expect(validate(phase, fields({ pw: '1234' }), free).pw).toBeUndefined();
  });

  it.each<FormPhase>(['up', 'reset-code', 'setup', 'recover-newpw', 'profile', 'localreset-newpw'])(
    'requires at least 8 characters for a new password on %s',
    (phase) => {
      expect(validate(phase, fields({ pw: '' }), free).pw).toBe(MSG.pwEmpty);
      expect(validate(phase, fields({ pw: '1234567' }), free).pw).toBe(MSG.pwMin);
      expect(validate(phase, fields({ pw: '12345678' }), free).pw).toBeUndefined();
    },
  );

  it.each<EntryPhase>(['reset-email', 'list', 'localreset-warn'])('has no password on %s', (phase) => {
    expect(validate(phase, fields({ pw: '' }), free).pw).toBeUndefined();
  });

  it.each<EntryPhase>(['profile', 'setup'])('checks the profile name on %s', (phase) => {
    expect(validate(phase, fields({ name: 'jo' }), free).user).toBe(MSG.userLen);
    expect(validate(phase, fields({ name: 'a'.repeat(17) }), free).user).toBe(MSG.userLen);
    expect(validate(phase, fields({ name: 'a'.repeat(16) }), free).user).toBeUndefined();
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
    expect([primaryLabel('recover-form'), busyLabel('recover-form')]).toEqual(['Continuar', 'Confirmando…']);
    expect(primaryLabel('list')).toBe('');
  });

  it('titles the list by whether a profile is active', () => {
    expect(titleFor('list', vars)).toBe('Escolha um perfil');
    expect(titleFor('list', { ...vars, activeName: 'rafa' })).toBe('Trocar de perfil');
    expect(subtitleFor('list', { ...vars, activeName: 'rafa' })).toBe(
      'Você está usando rafa. Escolha outro perfil e digite a senha.',
    );
  });

  it('subtitles sign-in as bringing the collection to this device', () => {
    expect(subtitleFor('in', vars)).toBe('Traga sua coleção da nuvem para este aparelho.');
  });

  it('words "Redefinir senha do perfil" for a linked profile (FR-024)', () => {
    expect(titleFor('recover-form', vars)).toBe('Redefinir senha do perfil');
    expect(subtitleFor('recover-form', vars)).toBe(
      'rafa está vinculado à nuvem. Confirme a senha da conta para criar uma nova senha do perfil neste aparelho.',
    );
    expect(captionFor('recover-form', 'gate', {})).toBe('Redefinir a senha não apaga nada.');
  });

  it('names the unlock screen after the profile', () => {
    expect(titleFor('unlock', vars)).toBe('rafa');
    expect(subtitleFor('unlock', vars)).toBe('Izzet · Vinculado à nuvem');
    expect(subtitleFor('unlock', { ...vars, linked: false })).toBe('Izzet · Só neste aparelho');
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
    expect(doneCopy('unlocked', { profile: 'bia', previous: 'rafa' })).toEqual({
      title: 'Perfil trocado',
      body: 'bia está ativo. Os dados de rafa ficaram ocultos.',
    });
    expect(doneCopy('unlocked', { profile: 'bia', previous: null }).title).toBe('Perfil desbloqueado');
  });
});

describe('entry-flow.util promptFor', () => {
  const cases: [EntryPhase, 'device' | 'gate', { ask: string; cta: string } | null, string | null][] = [
    ['list', 'gate', PROMPT.otherDevice, 'in'],
    ['unlock', 'gate', PROMPT.notYou, 'list'],
    ['profile', 'device', PROMPT.haveCloud, 'in'],
    ['profile', 'gate', PROMPT.haveProfileHere, 'list'],
    ['in', 'device', PROMPT.noProfile, 'profile'],
    ['in', 'gate', PROMPT.haveProfileHere, 'list'],
    ['reset-email', 'device', PROMPT.remembered, 'back'],
    ['reset-code', 'gate', PROMPT.remembered, 'back'],
    ['setup', 'device', null, null],
    ['recover-form', 'gate', null, null],
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
    expect(colorSourceFor('in', 'device')).toBe('default');
    expect(colorSourceFor('in', 'gate')).toBe('default');
    expect(colorSourceFor('setup', 'device')).toBe('cloud');
    expect(colorSourceFor('recover-form', 'gate')).toBe('profile');
  });

  it('keeps colors unchanged through the reset flow', () => {
    expect(colorSourceFor('reset-email', 'device', { origin: 'in' })).toBe('default');
    expect(colorSourceFor('reset-code', 'gate', { origin: 'recover-form' })).toBe('profile');
  });

  it('switches to the account colors after setup', () => {
    expect(colorSourceFor('setup', 'device', { done: 'setup', hasCloudColors: false })).toBe('profile');
    expect(colorSourceFor('setup', 'device', { done: 'setup', hasCloudColors: true })).toBe('cloud');
    expect(colorSourceFor('profile', 'device', { done: 'profiled' })).toBe('picks');
  });
});

describe('validateName', () => {
  const none = () => false;

  it('rejects names outside 3–16 characters', () => {
    expect(validateName('ab', none)).toBe(MSG.userLen);
    expect(validateName('a'.repeat(17), none)).toBe(MSG.userLen);
  });

  it('rejects characters outside letters, digits, _ . -', () => {
    expect(validateName('rafa!', none)).toBe(MSG.userChars);
  });

  it('rejects a taken name, checked trimmed', () => {
    const taken: string[] = [];
    expect(validateName(' bia ', (n) => (taken.push(n), n.toLowerCase() === 'bia'))).toBe(MSG.userTaken);
    expect(taken).toEqual(['bia']);
  });

  it('accepts a case-only change of one’s own name when isTaken excludes it', () => {
    expect(validateName('RAFA', none)).toBeNull();
  });
});

