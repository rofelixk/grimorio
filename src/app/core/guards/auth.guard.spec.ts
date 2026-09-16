import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let whenReady: ReturnType<typeof vi.fn>;
  let user: ReturnType<typeof vi.fn>;
  let parseUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    whenReady = vi.fn().mockResolvedValue(undefined);
    user = vi.fn();
    parseUrl = vi.fn().mockReturnValue('parsed-home-url');

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { whenReady, user } },
        { provide: Router, useValue: { parseUrl } },
      ],
    });
  });

  function runGuard() {
    return TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
  }

  it('waits for the initial session before deciding', async () => {
    user.mockReturnValue(null);

    await runGuard();

    expect(whenReady).toHaveBeenCalled();
  });

  it('allows navigation when signed in', async () => {
    user.mockReturnValue({ email: 'a@b.com' });

    await expect(runGuard()).resolves.toBe(true);
  });

  it('redirects to home when signed out', async () => {
    user.mockReturnValue(null);

    await expect(runGuard()).resolves.toBe('parsed-home-url');
    expect(parseUrl).toHaveBeenCalledWith('/');
  });
});
