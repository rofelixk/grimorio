import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@services/auth.service';
import { AuthBar } from './auth-bar';

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

describe('AuthBar', () => {
  let component: AuthBar;
  let fixture: ComponentFixture<AuthBar>;
  let authService: Pick<AuthService, 'user' | 'signOut'>;
  let user: ReturnType<typeof signal<User | null>>;

  beforeEach(async () => {
    user = signal<User | null>(null);
    authService = { user, signOut: vi.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [AuthBar],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthBar);
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
