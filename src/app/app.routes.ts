import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { About } from './views/about/about';
import { Decks } from './views/decks/decks';
import { DeckDetail } from './views/deck-detail/deck-detail';
import { Collection } from './views/collection/collection';
import { CollectionDetail } from './views/collection-detail/collection-detail';
import { CollectionImport } from './views/collection-import/collection-import';
import { Home } from './views/home/home';
import { Profile } from './views/profile/profile';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'collection', component: Collection },
  { path: 'collection/import', component: CollectionImport },
  { path: 'collection/:id', component: CollectionDetail, data: { showCollectionFilters: true } },
  { path: 'decks', component: Decks },
  { path: 'decks/:id', component: DeckDetail },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: 'about', component: About },
];
