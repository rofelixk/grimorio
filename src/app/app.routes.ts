import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Decks } from './decks/decks';
import { Collection } from './collection/collection';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'decks', component: Decks },
  { path: 'collection', component: Collection },
];
