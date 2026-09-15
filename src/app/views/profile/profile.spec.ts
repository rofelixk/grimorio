import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@services/auth.service';
import { Profile } from './profile';

function mockUser(email: string): User {
  return {
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
    email,
  } as User;
}

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let authService: Pick<AuthService, 'user' | 'username' | 'updateUsername' | 'updatePassword' | 'deleteAccount'>;
  let router: Router;

  beforeEach(async () => {
    authService = {
      user: signal(mockUser('rodrigo@exemplo.com')),
      username: signal('rodrigo_gm'),
      updateUsername: vi.fn().mockResolvedValue(undefined),
      updatePassword: vi.fn().mockResolvedValue(undefined),
      deleteAccount: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reads the email from AuthService and seeds the username field', () => {
    expect(component.email()).toBe('rodrigo@exemplo.com');
    expect(component.username()).toBe('rodrigo_gm');
  });

  it('saveUsername requires a non-empty value', async () => {
    component.username.set('   ');
    await component.saveUsername();

    expect(component.usernameError()).toBe('Informe um nome de usuário.');
    expect(authService.updateUsername).not.toHaveBeenCalled();
  });

  it('saveUsername delegates to AuthService and marks it saved', async () => {
    component.username.set('novo_nome');
    await component.saveUsername();

    expect(authService.updateUsername).toHaveBeenCalledWith('novo_nome');
    expect(component.usernameSaved()).toBe(true);
  });

  it('changePassword rejects a password shorter than the minimum', async () => {
    component.newPassword.set('abc');
    component.confirmPassword.set('abc');

    await component.changePassword();

    expect(component.passwordError()).toBe(
      `A nova senha precisa ter pelo menos ${component.minPasswordLength} caracteres.`,
    );
    expect(authService.updatePassword).not.toHaveBeenCalled();
  });

  it('changePassword rejects mismatched confirmation', async () => {
    component.newPassword.set('abcdef');
    component.confirmPassword.set('abcxyz');

    await component.changePassword();

    expect(component.passwordError()).toBe('As senhas não coincidem.');
    expect(authService.updatePassword).not.toHaveBeenCalled();
  });

  it('changePassword delegates to AuthService and clears the fields on success', async () => {
    component.currentPassword.set('oldpass');
    component.newPassword.set('newpass');
    component.confirmPassword.set('newpass');

    await component.changePassword();

    expect(authService.updatePassword).toHaveBeenCalledWith('oldpass', 'newpass');
    expect(component.passwordSaved()).toBe(true);
    expect(component.currentPassword()).toBe('');
    expect(component.newPassword()).toBe('');
    expect(component.confirmPassword()).toBe('');
  });

  it('canConfirmDelete is only true once the typed text matches the account email', () => {
    expect(component.canConfirmDelete()).toBe(false);

    component.deleteConfirmText.set('wrong@example.com');
    expect(component.canConfirmDelete()).toBe(false);

    component.deleteConfirmText.set('rodrigo@exemplo.com');
    expect(component.canConfirmDelete()).toBe(true);
  });

  it('confirmDelete does nothing until the confirmation text matches', async () => {
    await component.confirmDelete();

    expect(authService.deleteAccount).not.toHaveBeenCalled();
  });

  it('confirmDelete calls AuthService.deleteAccount and navigates home on success', async () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.deleteConfirmText.set('rodrigo@exemplo.com');

    await component.confirmDelete();

    expect(authService.deleteAccount).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('confirmDelete surfaces the error and does not navigate on failure', async () => {
    vi.mocked(authService.deleteAccount).mockRejectedValueOnce(new Error('boom'));
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.deleteConfirmText.set('rodrigo@exemplo.com');

    await component.confirmDelete();

    expect(component.deleteError()).toBe('boom');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('onDeleteDialogClosed resets the confirmation text and error', () => {
    component.deleteConfirmText.set('something');
    component.deleteError.set('oops');

    component.onDeleteDialogClosed();

    expect(component.deleteConfirmText()).toBe('');
    expect(component.deleteError()).toBeNull();
  });
});
