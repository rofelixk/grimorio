import { Routes } from '@angular/router';
import { profileGuard } from './core/guards/profile.guard';
import { About } from './views/about/about';
import { Decks } from './views/decks/decks';
import { DeckDetail } from './views/deck-detail/deck-detail';
import { Collection } from './views/collection/collection';
import { CollectionDetail } from './views/collection-detail/collection-detail';
import { CollectionImport } from './views/collection-import/collection-import';
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

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'collection', component: Collection, ...gated },
  { path: 'collection/import', component: CollectionImport, ...gated },
  { path: 'collection/:id', component: CollectionDetail, ...gated },
  { path: 'decks', component: Decks, ...gated },
  { path: 'decks/:id', component: DeckDetail, ...gated },
  // The old account page is hidden until a follow-up spec rebuilds it (FR-030).
  { path: 'profile', redirectTo: '' },
  { path: 'modes', component: GameModes },
  { path: 'modes/planechase', component: Planechase, ...planechaseData },
  { path: 'modes/planechase/rules', component: PlanechaseRules, ...planechaseData },
  { path: 'modes/planechase/deck', component: PlanechaseDeck, ...planechaseData },
  { path: 'about', component: About },
];
