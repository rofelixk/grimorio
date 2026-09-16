import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@services/auth.service';
import { DEFAULT_THEME_COLORS, THEME_COLOR_PALETTE, ThemeService } from './theme.service';

function mockUser(): User {
  return { id: 'user-1', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' } as User;
}

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  it('seeds the default colors when nothing is persisted', () => {
    expect(service.colors()).toEqual(DEFAULT_THEME_COLORS);
    expect(service.roles().primary).toBe(THEME_COLOR_PALETTE['R'].base);
    expect(service.roles().accent).toBe(THEME_COLOR_PALETTE['U'].base);
    expect(service.roles().tertiary).toBeUndefined();
  });

  it('adds a color and persists it to localStorage', () => {
    service.toggle('G');

    expect(service.colors()).toEqual(['R', 'U', 'G']);
    expect(JSON.parse(localStorage.getItem('grimorio.themeColors')!)).toEqual(['R', 'U', 'G']);
  });

  it('does not add a 4th color once 3 are picked', () => {
    service.toggle('G');
    service.toggle('W');

    expect(service.colors()).toEqual(['R', 'U', 'G']);
  });

  it('removes an already-picked color', () => {
    service.toggle('U');

    expect(service.colors()).toEqual(['R']);
  });

  it('refuses to remove the last remaining color', () => {
    service.toggle('U');
    service.toggle('R');

    expect(service.colors()).toEqual(['R']);
  });

  it('re-derives roles positionally after a removal', () => {
    service.toggle('G');
    service.toggle('U');

    expect(service.colors()).toEqual(['R', 'G']);
    expect(service.roles().primary).toBe(THEME_COLOR_PALETTE['R'].base);
    expect(service.roles().accent).toBe(THEME_COLOR_PALETTE['G'].base);
  });
});

describe('ThemeService cross-device sync', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adopts the account theme when signing in on a device with no remote preference set yet', async () => {
    const authService: Pick<AuthService, 'user' | 'themeColors' | 'updateThemeColors'> = {
      user: signal(mockUser()),
      themeColors: signal(['W', 'B', 'G']),
      updateThemeColors: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: authService }] });
    const service = TestBed.inject(ThemeService);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(service.colors()).toEqual(['W', 'B', 'G']);
    expect(JSON.parse(localStorage.getItem('grimorio.themeColors')!)).toEqual(['W', 'B', 'G']);
    expect(authService.updateThemeColors).not.toHaveBeenCalled();
  });

  it('claims the account for this device when it has never saved a theme preference', async () => {
    const authService: Pick<AuthService, 'user' | 'themeColors' | 'updateThemeColors'> = {
      user: signal(mockUser()),
      themeColors: signal(undefined),
      updateThemeColors: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: authService }] });
    TestBed.inject(ThemeService);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(authService.updateThemeColors).toHaveBeenCalledWith(DEFAULT_THEME_COLORS);
  });

  it('toggle stays local-only and does not push to the account by itself', async () => {
    const authService: Pick<AuthService, 'user' | 'themeColors' | 'updateThemeColors'> = {
      user: signal(mockUser()),
      themeColors: signal(DEFAULT_THEME_COLORS),
      updateThemeColors: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: authService }] });
    const service = TestBed.inject(ThemeService);
    await TestBed.inject(ApplicationRef).whenStable();
    vi.mocked(authService.updateThemeColors).mockClear();

    service.toggle('G');

    expect(service.colors()).toEqual(['R', 'U', 'G']);
    expect(authService.updateThemeColors).not.toHaveBeenCalled();
  });

  it('saveToAccount explicitly pushes the current local colors', async () => {
    const authService: Pick<AuthService, 'user' | 'themeColors' | 'updateThemeColors'> = {
      user: signal(mockUser()),
      themeColors: signal(DEFAULT_THEME_COLORS),
      updateThemeColors: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: authService }] });
    const service = TestBed.inject(ThemeService);
    await TestBed.inject(ApplicationRef).whenStable();
    vi.mocked(authService.updateThemeColors).mockClear();
    service.toggle('G');

    await service.saveToAccount();

    expect(authService.updateThemeColors).toHaveBeenCalledWith(['R', 'U', 'G']);
  });

  it('saveToAccount rejects when the push fails', async () => {
    const authService: Pick<AuthService, 'user' | 'themeColors' | 'updateThemeColors'> = {
      user: signal(mockUser()),
      themeColors: signal(DEFAULT_THEME_COLORS),
      updateThemeColors: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: authService }] });
    const service = TestBed.inject(ThemeService);
    await TestBed.inject(ApplicationRef).whenStable();
    vi.mocked(authService.updateThemeColors).mockRejectedValueOnce(new Error('boom'));

    await expect(service.saveToAccount()).rejects.toThrow('boom');
  });
});
