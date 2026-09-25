import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileSummary } from '@models/profile.model';
import { EntryModalService } from '@services/entry-modal.service';
import { ProfileSessionService } from '@services/profile-session.service';
import { profileGuard } from './profile.guard';

const rafa: ProfileSummary = { id: 'p1', name: 'rafa', colors: ['U', 'R'], cloud: null, createdAt: '' };

describe('profileGuard', () => {
  const active = signal<ProfileSummary | null>(null);
  const currentNavigation = signal<{ extras: { info?: unknown } } | null>(null);
  let navigated: boolean;
  let open: ReturnType<typeof vi.fn>;

  const run = () =>
    TestBed.runInInjectionContext(() =>
      profileGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Promise<boolean | UrlTree>;

  beforeEach(() => {
    active.set(null);
    currentNavigation.set(null);
    navigated = true;
    open = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ProfileSessionService, useValue: { active } },
        { provide: EntryModalService, useValue: { open } },
        {
          provide: Router,
          useValue: {
            currentNavigation,
            get navigated() {
              return navigated;
            },
            parseUrl: (url: string) => ({ url }) as unknown as UrlTree,
          },
        },
      ],
    });
  });

  it('lets the navigation through when a profile is active', async () => {
    active.set(rafa);

    expect(await run()).toBe(true);
    expect(open).not.toHaveBeenCalled();
  });

  it('continues once a profile becomes active in the modal', async () => {
    open.mockResolvedValue({ activeProfileId: 'p1' });

    expect(await run()).toBe(true);
    expect(open).toHaveBeenCalledOnce();
  });

  it('keeps the person where they were when the modal closes without a profile', async () => {
    open.mockResolvedValue({ activeProfileId: null });

    expect(await run()).toBe(false);
  });

  it('lands a direct visit on Home when the modal closes without a profile', async () => {
    navigated = false;
    open.mockResolvedValue({ activeProfileId: null });

    expect(await run()).toEqual({ url: '/' });
  });

  it('sends a session-change reload to Home without opening the modal', async () => {
    currentNavigation.set({ extras: { info: { sessionChange: true } } });

    expect(await run()).toEqual({ url: '/' });
    expect(open).not.toHaveBeenCalled();
  });
});
