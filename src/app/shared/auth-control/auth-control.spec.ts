import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@services/auth.service';
import { AuthControl } from './auth-control';

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

describe('AuthControl', () => {
  let component: AuthControl;
  let fixture: ComponentFixture<AuthControl>;
  let authService: Pick<AuthService, 'user' | 'signOut'>;
  let user: ReturnType<typeof signal<User | null>>;

  beforeEach(async () => {
    user = signal<User | null>(null);
    authService = { user, signOut: vi.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [AuthControl],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthControl);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('reflects AuthService.user', () => {
    expect(component.user()).toBeNull();

    user.set(mockUser('a@b.com'));
    expect(component.user()?.email).toBe('a@b.com');
  });

  it('signOut delegates to AuthService', async () => {
    await component.signOut();
    expect(authService.signOut).toHaveBeenCalled();
  });

  it('showModal toggles independently of auth state', () => {
    expect(component.showModal()).toBe(false);
    component.showModal.set(true);
    expect(component.showModal()).toBe(true);
  });
});
