import { UrlSegment } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { collectionMatcher, deckMatcher, routes } from './app.routes';
import { profileGuard } from './core/guards/profile.guard';

const route = (path: string) => routes.find((r) => r.path === path);
const collectionRoute = () => routes.find((r) => 'matcher' in r && r.matcher === collectionMatcher);
const deckRoute = () => routes.find((r) => 'matcher' in r && r.matcher === deckMatcher);
const segments =(...paths: string[]) => paths.map((p) => new UrlSegment(p, {}));

describe('app routes', () => {
  it.each(['', 'about'])('leaves "%s" open with no profile (FR-011, FR-011a)', (path) => {
    expect(route(path)).toBeDefined();
    expect(route(path)?.canActivate).toBeUndefined();
  });

  it('gates the deck route behind an active profile (FR-001)', () => {
    expect(deckRoute()?.canActivate).toEqual([profileGuard]);
    expect(deckRoute()?.runGuardsAndResolvers).toBe('always');
  });

  describe('deckMatcher (spec 009 R7)', () => {
    it('matches "/decks"', () => {
      expect(deckMatcher(segments('decks'))).toEqual({ consumed: segments('decks') });
    });

    it('matches "/decks/{id}" with a posParam', () => {
      const result = deckMatcher(segments('decks', 'x'));
      expect(result?.consumed).toHaveLength(2);
      expect(result?.posParams?.['ref'].path).toBe('x');
    });

    it('rejects "/decks/x/y"', () => {
      expect(deckMatcher(segments('decks', 'x', 'y'))).toBeNull();
    });
  });

  it('gates the collection route behind an active profile (FR-001)', () => {
    expect(collectionRoute()?.canActivate).toEqual([profileGuard]);
    expect(collectionRoute()?.runGuardsAndResolvers).toBe('always');
  });

  it('sends the old account page to Home (FR-030)', () => {
    expect(route('profile')).toEqual({ path: 'profile', redirectTo: '' });
  });

  describe('collectionMatcher (R8)', () => {
    it('matches "/collection"', () => {
      const result = collectionMatcher(segments('collection'));
      expect(result).toEqual({ consumed: segments('collection') });
    });

    it('matches "/collection/{uuid}" with a posParam', () => {
      const uuid = '9c1f3e0a-1111-2222-3333-444455556666';
      const result = collectionMatcher(segments('collection', uuid));
      expect(result?.consumed).toHaveLength(2);
      expect(result?.posParams?.['ref'].path).toBe(uuid);
    });

    it('matches "/collection/caixa" with a posParam', () => {
      const result = collectionMatcher(segments('collection', 'caixa'));
      expect(result?.posParams?.['ref'].path).toBe('caixa');
    });

    it('rejects "/collection/a/b"', () => {
      expect(collectionMatcher(segments('collection', 'a', 'b'))).toBeNull();
    });

    it('rejects an unrelated path', () => {
      expect(collectionMatcher(segments('decks'))).toBeNull();
    });
  });
});
