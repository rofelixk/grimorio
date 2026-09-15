import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@services/auth.service';
import { AuthModal } from './auth-modal';

describe('AuthModal', () => {
  let component: AuthModal;
  let fixture: ComponentFixture<AuthModal>;
  let authService: Pick<AuthService, 'signIn' | 'signUp'>;

  beforeEach(async () => {
    authService = { signIn: vi.fn().mockResolvedValue(undefined), signUp: vi.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [AuthModal],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults to sign-in mode', () => {
    expect(component.mode()).toBe('signIn');
  });

  it('toggleMode switches between signIn and signUp and clears any error', () => {
    component.error.set('some error');
    component.toggleMode();

    expect(component.mode()).toBe('signUp');
    expect(component.error()).toBeNull();

    component.toggleMode();
    expect(component.mode()).toBe('signIn');
  });

  it('requires an identifier and password before submitting', async () => {
    await component.submit();

    expect(component.error()).toBe('Informe um email ou nome de usuário e uma senha.');
    expect(authService.signIn).not.toHaveBeenCalled();
  });

  it('requires an email and password before submitting in sign-up mode', async () => {
    component.toggleMode();
    await component.submit();

    expect(component.error()).toBe('Informe um email e uma senha.');
    expect(authService.signUp).not.toHaveBeenCalled();
  });

  it('calls signIn in sign-in mode with a trimmed identifier, which may be an email or username', async () => {
    component.identifier.set('  rodrigo_gm  ');
    component.password.set('secret');

    await component.submit();

    expect(authService.signIn).toHaveBeenCalledWith('rodrigo_gm', 'secret');
    expect(authService.signUp).not.toHaveBeenCalled();
  });

  it('calls signUp in sign-up mode, passing along the optional username', async () => {
    component.toggleMode();
    component.identifier.set('a@b.com');
    component.password.set('secret');
    component.username.set('rodrigo_gm');

    await component.submit();

    expect(authService.signUp).toHaveBeenCalledWith('a@b.com', 'secret', 'rodrigo_gm');
  });

  it('calls signUp with an empty username when none was given', async () => {
    component.toggleMode();
    component.identifier.set('a@b.com');
    component.password.set('secret');

    await component.submit();

    expect(authService.signUp).toHaveBeenCalledWith('a@b.com', 'secret', '');
  });

  it('surfaces the error and keeps submitting false on failure', async () => {
    vi.mocked(authService.signIn).mockRejectedValueOnce(new Error('Invalid login credentials'));
    component.identifier.set('a@b.com');
    component.password.set('wrong');

    await component.submit();

    expect(component.error()).toBe('Invalid login credentials');
    expect(component.submitting()).toBe(false);
  });

  it('onDialogClosed resets form state and emits closed', () => {
    component.identifier.set('a@b.com');
    component.username.set('rodrigo_gm');
    component.password.set('secret');
    component.error.set('oops');
    component.toggleMode();

    let emitted = false;
    component.closed.subscribe(() => (emitted = true));
    component.onDialogClosed();

    expect(emitted).toBe(true);
    expect(component.identifier()).toBe('');
    expect(component.username()).toBe('');
    expect(component.password()).toBe('');
    expect(component.error()).toBeNull();
    expect(component.mode()).toBe('signIn');
  });
});
