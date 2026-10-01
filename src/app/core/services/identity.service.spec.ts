import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ProfileSummary } from '@models/profile.model';
import { DEFAULT_IDENTITY, rolesFor } from '../utils/identity.util';
import { IdentityService } from './identity.service';
import { ProfileSessionService } from './profile-session.service';

const profile = (colors: ProfileSummary['colors']): ProfileSummary => ({
  id: 'p1',
  name: 'rafa',
  nameUpdatedAt: '2026-01-01T00:00:00.000Z',
  colors,
  colorsUpdatedAt: '2026-01-01T00:00:00.000Z',
  cloud: null,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('IdentityService', () => {
  const active = signal<ProfileSummary | null>(null);
  let identity: IdentityService;

  beforeEach(() => {
    active.set(null);
    TestBed.configureTestingModule({
      providers: [{ provide: ProfileSessionService, useValue: { active } }],
    });
    identity = TestBed.inject(IdentityService);
  });

  it('shows the default identity with no active profile', () => {
    expect(identity.colors()).toEqual(DEFAULT_IDENTITY);
    expect(identity.roles()).toEqual(rolesFor(DEFAULT_IDENTITY));
  });

  it("shows the active profile's colors", () => {
    active.set(profile(['W', 'B']));

    expect(identity.colors()).toEqual(['W', 'B']);
    expect(identity.roles()).toEqual(rolesFor(['W', 'B']));
  });

  it('follows a profile switch and falls back to the default once no profile is active', () => {
    active.set(profile(['G']));
    expect(identity.colors()).toEqual(['G']);

    active.set(profile(['U', 'B', 'R']));
    expect(identity.roles()).toEqual(rolesFor(['U', 'B', 'R']));

    active.set(null);
    expect(identity.colors()).toEqual(DEFAULT_IDENTITY);
    expect(identity.roles()).toEqual(rolesFor(DEFAULT_IDENTITY));
  });
});
