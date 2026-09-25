import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';
import { profileGuard } from './core/guards/profile.guard';

const route = (path: string) => routes.find((r) => r.path === path);

describe('app routes', () => {
  it.each(['', 'about'])('leaves "%s" open with no profile (FR-011, FR-011a)', (path) => {
    expect(route(path)).toBeDefined();
    expect(route(path)?.canActivate).toBeUndefined();
  });

  it.each(['collection', 'collection/import', 'collection/:id', 'decks', 'decks/:id'])(
    'gates "%s" behind an active profile (FR-001)',
    (path) => {
      expect(route(path)?.canActivate).toEqual([profileGuard]);
      expect(route(path)?.runGuardsAndResolvers).toBe('always');
    },
  );

  it('sends the old account page to Home (FR-030)', () => {
    expect(route('profile')).toEqual({ path: 'profile', redirectTo: '' });
  });
});
