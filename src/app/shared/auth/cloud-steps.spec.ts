import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CloudAuthService } from '@services/cloud-auth.service';
import { FieldKey } from '@utils/cloud-error.util';
import { ACTION, MSG } from '@utils/entry-copy';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudSteps } from './cloud-steps';
import { CloudFormFields, FlowForm } from './flow-form';

type Phase = 'in' | 'up' | 'reauth' | 'reset-email' | 'reset-code' | 'hub';

const BLANK: CloudFormFields = { name: '', email: '', pw: '', code: '' };
const ERROR_KEYS: Record<keyof CloudFormFields, FieldKey> = { name: 'user', email: 'email', pw: 'pw', code: 'code' };

describe('CloudSteps', () => {
  let cloudAuth: { requestResetCode: ReturnType<typeof vi.fn>; discardPending: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    cloudAuth = {
      requestResetCode: vi.fn().mockResolvedValue(undefined),
      discardPending: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({ providers: [{ provide: CloudAuthService, useValue: cloudAuth }] });
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  function make(start: Phase = 'in') {
    const form = new FlowForm<CloudFormFields>({ blank: BLANK, errorKeys: ERROR_KEYS });
    const phase = signal<Phase>(start);
    const lockedEmail = signal<string | null>(null);
    const toPhase = vi.fn((next: Phase) => phase.set(next));
    const go = vi.fn((next: Phase) => {
      form.bump();
      toPhase(next);
    });
    const cloud = TestBed.runInInjectionContext(
      () =>
        new CloudSteps<CloudFormFields, Phase>({
          form,
          phase,
          isCloudPhase: (p): p is Exclude<Phase, 'hub'> => p !== 'hub',
          plateEmail: signal('linked@b.co'),
          lockedEmail,
          go,
          toPhase,
        }),
    );
    return { cloud, form, phase, lockedEmail, go, toPhase };
  }

  it('starts a reset from the current phase with "Esqueci minha senha"', () => {
    const { cloud, form, go } = make('in');
    form.fields.update((f) => ({ ...f, email: 'typed@b.co' }));
    cloud.forgot();
    expect(cloud.backTarget()).toBe('in');
    expect(cloud.emailLocked()).toBe(false);
    expect(form.fields().email).toBe('typed@b.co');
    expect(go).toHaveBeenCalledWith('reset-email');
  });

  it('locks the e-mail when the current phase fixes it', () => {
    const { cloud, form, lockedEmail } = make('reauth');
    lockedEmail.set('linked@b.co');
    cloud.forgot();
    expect(cloud.backTarget()).toBe('reauth');
    expect(form.fields().email).toBe('linked@b.co');
    expect(cloud.emailLocked()).toBe(true);
  });

  it('starts a reset without locking from "Recupere o acesso"', () => {
    const { cloud, lockedEmail, go } = make('up');
    lockedEmail.set('linked@b.co');
    cloud.recoverAccess();
    expect(cloud.backTarget()).toBe('up');
    expect(cloud.emailLocked()).toBe(false);
    expect(go).toHaveBeenCalledWith('reset-email');
  });

  it('goes back to the e-mail step with "Usar outro e-mail"', () => {
    const { cloud, go } = make('reset-code');
    cloud.otherEmail();
    expect(go).toHaveBeenCalledWith('reset-email');
  });

  it('goes back to where the reset started, or to `in`, and clears the lock', () => {
    const { cloud, go, lockedEmail } = make('reauth');
    lockedEmail.set('linked@b.co');
    cloud.forgot();
    cloud.back();
    expect(go).toHaveBeenLastCalledWith('reauth');
    expect(cloud.backTarget()).toBeNull();
    expect(cloud.emailLocked()).toBe(false);

    cloud.back();
    expect(go).toHaveBeenLastCalledWith('in');
  });

  it('requests a code, moves to the code step and counts a 30 s cooldown down', async () => {
    vi.useFakeTimers();
    const { cloud, form, phase, toPhase } = make('reset-email');
    form.fields.update((f) => ({ ...f, email: 'a@b.co' }));
    await cloud.requestCode(form.token());
    expect(cloudAuth.requestResetCode).toHaveBeenCalledWith('a@b.co');
    expect(toPhase).toHaveBeenCalledWith('reset-code');
    expect(phase()).toBe('reset-code');
    expect(cloud.cooldown()).toBe(30);
    expect(cloud.resendLabel()).toBe(ACTION.resendIn(30));
    vi.advanceTimersByTime(1000);
    expect(cloud.cooldown()).toBe(29);
    vi.advanceTimersByTime(29_000);
    expect(cloud.cooldown()).toBe(0);
    expect(cloud.resendLabel()).toBe(ACTION.resendCode);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does nothing after a code request whose token went stale', async () => {
    const { cloud, form, toPhase } = make('reset-email');
    const token = form.token();
    form.bump();
    await cloud.requestCode(token);
    expect(toPhase).not.toHaveBeenCalled();
    expect(cloud.cooldown()).toBe(0);
  });

  it('resends, clearing the code and errors and restarting the cooldown', async () => {
    vi.useFakeTimers();
    const { cloud, form } = make('reset-code');
    form.fields.update((f) => ({ ...f, email: 'a@b.co', code: '123' }));
    form.fieldErrors.set({ code: 'x' });
    form.formError.set('antigo');
    await cloud.resend();
    expect(cloudAuth.requestResetCode).toHaveBeenCalledWith('a@b.co');
    expect(form.fields().code).toBe('');
    expect(form.fieldErrors()).toEqual({});
    expect(form.formError()).toBe('');
    expect(cloud.cooldown()).toBe(30);
    expect(cloud.resending()).toBe(false);
  });

  it('maps a resend failure through the form', async () => {
    cloudAuth.requestResetCode.mockRejectedValue({ kind: 'form', message: MSG.generic });
    const { cloud, form } = make('reset-code');
    await cloud.resend();
    expect(form.formError()).toBe(MSG.generic);
    expect(cloud.cooldown()).toBe(0);
    expect(cloud.resending()).toBe(false);
  });

  it('ignores a resend result that lands after the person moved on', async () => {
    let settle!: () => void;
    cloudAuth.requestResetCode.mockReturnValue(new Promise<void>((resolve) => (settle = resolve)));
    const { cloud, form } = make('reset-code');
    form.fields.update((f) => ({ ...f, code: '123' }));
    const pending = cloud.resend();
    expect(cloud.resending()).toBe(true);
    expect(cloud.isCloudBusy()).toBe(true);
    form.bump();
    settle();
    await pending;
    expect(form.fields().code).toBe('123');
    expect(cloud.cooldown()).toBe(0);
  });

  it('blocks a resend during the cooldown, while resending and while loading', async () => {
    const { cloud, form } = make('reset-email');
    await cloud.requestCode(form.token());
    await cloud.resend();
    expect(cloudAuth.requestResetCode).toHaveBeenCalledTimes(1);

    cloud.reset();
    form.loading.set(true);
    await cloud.resend();
    expect(cloudAuth.requestResetCode).toHaveBeenCalledTimes(1);

    form.loading.set(false);
    cloudAuth.requestResetCode.mockReturnValue(new Promise<void>(() => undefined));
    void cloud.resend();
    await cloud.resend();
    expect(cloudAuth.requestResetCode).toHaveBeenCalledTimes(2);
  });

  it('stops the cooldown and clears its state on reset', async () => {
    vi.useFakeTimers();
    const { cloud, form, lockedEmail } = make('reauth');
    lockedEmail.set('linked@b.co');
    cloud.forgot();
    await cloud.requestCode(form.token());
    cloud.reset();
    expect(cloud.cooldown()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(cloud.backTarget()).toBeNull();
    expect(cloud.emailLocked()).toBe(false);
    expect(cloud.resending()).toBe(false);
    expect(cloudAuth.discardPending).toHaveBeenCalled();
  });

  it('shows the cloud fields only on cloud phases', () => {
    const { cloud, phase } = make('in');
    expect(cloud.shown().email).toBe(true);
    expect(cloud.pwAutocomplete()).toBe('current-password');
    phase.set('hub');
    expect(cloud.shown().email).toBe(false);
    expect(cloud.pwLabel()).toBe('');
    expect(cloud.pwHelper()).toBe('');
  });

  it('shares no state between two instances', async () => {
    const one = make('reset-email');
    const two = make('in');
    await one.cloud.requestCode(one.form.token());
    two.cloud.forgot();
    expect(one.cloud.cooldown()).toBe(30);
    expect(two.cloud.cooldown()).toBe(0);
    expect(one.cloud.backTarget()).toBeNull();
    expect(two.cloud.backTarget()).toBe('in');
    one.cloud.reset();
  });
});
