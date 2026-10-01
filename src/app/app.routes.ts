import { Routes, UrlMatchResult, UrlSegment } from '@angular/router';
import { profileGuard } from './core/guards/profile.guard';
import { About } from './views/about/about';
import { CollectionArea } from './views/collection-area/collection-area';
import { DeckArea } from './views/deck-area/deck-area';
import { Home } from './views/home/home';
import { GameModes } from './views/game-modes/game-modes';
import { Planechase } from './views/planechase/planechase';
import { PlanechaseRules } from './views/planechase-rules/planechase-rules';
import { PlanechaseDeck } from './views/planechase-deck/planechase-deck';
import { planechaseCatalogResolver } from '@services/planechase-catalog.service';

// Owned-card routes need an active local profile (FR-001). `runGuardsAndResolvers: 'always'`
// lets a sign-out or switch re-run the guard on the page the person is on (R12).
const gated = { canActivate: [profileGuard], runGuardsAndResolvers: 'always' as const };
// Gameplay needs no profile (FR-002); the Planechase pages wait for the lazy card data (R4).
const planechaseData = { resolve: { catalog: planechaseCatalogResolver } };

// One route matches the list, a collection page and the holding box, so Angular reuses the same
// `CollectionArea` instance across them (research R8) — a plain `path`/`:ref` pair would create
// and destroy the component on every navigation between those places.
export const collectionMatcher = (segments: UrlSegment[]): UrlMatchResult | null => {
  if (segments.length === 1 && segments[0].path === 'collection') {
    return { consumed: segments };
  }
  if (segments.length === 2 && segments[0].path === 'collection') {
    return { consumed: segments, posParams: { ref: segments[1] } };
  }
  return null;
};

// Same reason for decks (spec 009, research R7): the list and a deck page share one `DeckArea`
// instance, so the page change can keep both in the DOM while it runs.
export const deckMatcher = (segments: UrlSegment[]): UrlMatchResult | null => {
  if (segments.length === 1 && segments[0].path === 'decks') {
    return { consumed: segments };
  }
  if (segments.length === 2 && segments[0].path === 'decks') {
    return { consumed: segments, posParams: { ref: segments[1] } };
  }
  return null;
};

export const routes: Routes = [
  { path: '', component: Home },
  { matcher: collectionMatcher, component: CollectionArea, ...gated },
  { matcher: deckMatcher, component: DeckArea, ...gated },
  // The old account page is hidden until a follow-up spec rebuilds it (FR-030).
  { path: 'profile', redirectTo: '' },
  { path: 'modes', component: GameModes },
  { path: 'modes/planechase', component: Planechase, ...planechaseData },
  { path: 'modes/planechase/rules', component: PlanechaseRules, ...planechaseData },
  { path: 'modes/planechase/deck', component: PlanechaseDeck, ...planechaseData },
  { path: 'about', component: About },
];
