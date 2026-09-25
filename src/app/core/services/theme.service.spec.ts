import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PBKDF2_ITERATIONS, ProfileStore } from './profile-store.service';
import { ProfileSessionService } from './profile-session.service';
import { DEFAULT_THEME_COLORS, THEME_COLOR_PALETTE, ThemeService } from './theme.service';

describe('ThemeService (legacy adapter)', () => {
  let service: ThemeService;
  let store: ProfileStore;
  let session: ProfileSessionService;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: PBKDF2_ITERATIONS, useValue: 5 }] });
    service = TestBed.inject(ThemeService);
    store = TestBed.inject(ProfileStore);
    session = TestBed.inject(ProfileSessionService);
    await session.whenReady();
  });

  it('uses the default identity Vermelho → Azul → Verde with no active profile', () => {
    expect(service.colors()).toEqual(DEFAULT_THEME_COLORS);
    expect(DEFAULT_THEME_COLORS).toEqual(['R', 'U', 'G']);
    expect(service.roles().primary).toBe(THEME_COLOR_PALETTE.R.base);
    expect(service.roles().accent).toBe(THEME_COLOR_PALETTE.U.base);
    expect(service.roles().tertiary).toBe(THEME_COLOR_PALETTE.G.base);
  });

  it("follows the active profile's colors, leaving unset roles undefined", async () => {
    const bia = await store.create({ name: 'bia', password: 'grimorio123', colors: ['G', 'W'] });
    await session.activate(bia.id);

    expect(service.colors()).toEqual(['G', 'W']);
    expect(service.roles().primary).toBe(THEME_COLOR_PALETTE.G.base);
    expect(service.roles().accent).toBe(THEME_COLOR_PALETTE.W.base);
    expect(service.roles().tertiary).toBeUndefined();
  });

  it('drops the signed-out profile colors immediately on sign-out', async () => {
    const bia = await store.create({ name: 'bia', password: 'grimorio123', colors: ['B'] });
    await session.activate(bia.id);
    expect(service.colors()).toEqual(['B']);

    await session.signOut();

    expect(service.colors()).toEqual(DEFAULT_THEME_COLORS);
    expect(service.roles().primary).toBe(THEME_COLOR_PALETTE.R.base);
  });

  it('names black Preto', () => {
    expect(THEME_COLOR_PALETTE.B.label).toBe('Preto');
  });
});
