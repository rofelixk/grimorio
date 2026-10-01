import { FieldKey } from '@utils/cloud-error.util';
import { MSG } from '@utils/entry-copy';
import { describe, expect, it, vi } from 'vitest';
import { CloudFormFields, FlowForm } from './flow-form';

interface Fields extends CloudFormFields {
  pwNew: string;
}

const BLANK: Fields = { name: '', email: '', pw: '', code: '', pwNew: '' };
const ERROR_KEYS: Record<keyof Fields, FieldKey> = { name: 'user', email: 'email', pw: 'pw', code: 'code', pwNew: 'pwNew' };

const make = () => new FlowForm<Fields>({ blank: BLANK, errorKeys: ERROR_KEYS });

describe('FlowForm', () => {
  it('keeps only digits in the code, at most 6', () => {
    const form = make();
    form.edit('code', 'a1b2c3d4e5');
    expect(form.fields().code).toBe('12345');
    form.edit('code', '1234567');
    expect(form.fields().code).toBe('123456');
    form.edit('name', 'a1 b');
    expect(form.fields().name).toBe('a1 b');
  });

  it("clears the edited field's error, through its error key", () => {
    const form = make();
    form.fieldErrors.set({ user: 'x', pw: 'y' });
    form.edit('name', 'Ana');
    expect(form.fieldErrors()).toEqual({ pw: 'y' });
  });

  it('clears the e-mail-in-use state when the e-mail is edited', () => {
    const form = make();
    form.emailInUse.set(true);
    form.edit('pw', 'x');
    expect(form.emailInUse()).toBe(true);
    form.edit('email', 'a@b.co');
    expect(form.emailInUse()).toBe(false);
  });

  it('blanks only the listed keys on a phase switch, and clears every error', () => {
    const form = make();
    form.fields.set({ name: 'Ana', email: 'a@b.co', pw: 'secret', code: '123456', pwNew: 'novo' });
    form.fieldErrors.set({ pw: 'x' });
    form.formError.set('erro');
    form.emailInUse.set(true);
    form.clearForPhase(['pw', 'code']);
    expect(form.fields()).toEqual({ name: 'Ana', email: 'a@b.co', pw: '', code: '', pwNew: 'novo' });
    expect(form.fieldErrors()).toEqual({});
    expect(form.formError()).toBe('');
    expect(form.emailInUse()).toBe(false);
  });

  it('routes a field failure to its field and a form failure to the form', () => {
    const form = make();
    const field = form.fail({ kind: 'field', field: 'email', message: MSG.emailInUse, emailInUse: true });
    expect(field.kind).toBe('field');
    expect(form.fieldErrors()).toEqual({ email: MSG.emailInUse });
    expect(form.emailInUse()).toBe(true);

    form.fail({ kind: 'form', message: MSG.generic });
    expect(form.formError()).toBe(MSG.generic);

    form.fail(new Error('raw supabase text'));
    expect(form.formError()).toBe(MSG.generic);
  });

  it('renames a failed field through remap', () => {
    const form = make();
    form.fail({ kind: 'field', field: 'pw', message: MSG.pwMin }, () => 'pwNew');
    expect(form.fieldErrors()).toEqual({ pwNew: MSG.pwMin });
  });

  it('sets validation errors and runs nothing when validation fails', async () => {
    const form = make();
    form.formError.set('antigo');
    const run = vi.fn().mockResolvedValue(undefined);
    await form.submit(() => ({ pw: 'Obrigatório' }), run, vi.fn());
    expect(run).not.toHaveBeenCalled();
    expect(form.fieldErrors()).toEqual({ pw: 'Obrigatório' });
    expect(form.formError()).toBe('');
    expect(form.loading()).toBe(false);
  });

  it('locks loading while running, with the current token, and skips while loading', async () => {
    const form = make();
    form.emailInUse.set(true);
    let finish!: () => void;
    const run = vi.fn((token: number) => {
      expect(token).toBe(form.token());
      return new Promise<void>((resolve) => (finish = resolve));
    });
    const first = form.submit(() => ({}), run, vi.fn());
    expect(form.loading()).toBe(true);
    expect(form.emailInUse()).toBe(false);
    await form.submit(() => ({}), run, vi.fn());
    expect(run).toHaveBeenCalledTimes(1);
    finish();
    await first;
    expect(form.loading()).toBe(false);
  });

  it('maps a fresh failure through onError and ignores a stale one', async () => {
    const form = make();
    const onError = vi.fn();
    await form.submit(() => ({}), () => Promise.reject(new Error('x')), onError);
    expect(onError).toHaveBeenCalledTimes(1);

    let fail!: (error: unknown) => void;
    const pending = form.submit(() => ({}), () => new Promise<void>((_, reject) => (fail = reject)), onError);
    form.bump();
    expect(form.stale(form.token() - 1)).toBe(true);
    fail(new Error('late'));
    await pending;
    expect(onError).toHaveBeenCalledTimes(1);
    // A stale settle leaves loading to whoever moved on.
    expect(form.loading()).toBe(true);
  });

  it('returns everything to blank on reset and invalidates the token', () => {
    const form = make();
    const token = form.token();
    form.fields.set({ name: 'Ana', email: 'a@b.co', pw: 'x', code: '1', pwNew: 'y' });
    form.fieldErrors.set({ pw: 'x' });
    form.formError.set('erro');
    form.emailInUse.set(true);
    form.loading.set(true);
    form.reset();
    expect(form.fields()).toEqual(BLANK);
    expect(form.fieldErrors()).toEqual({});
    expect(form.formError()).toBe('');
    expect(form.emailInUse()).toBe(false);
    expect(form.loading()).toBe(false);
    expect(form.stale(token)).toBe(true);
  });
});
