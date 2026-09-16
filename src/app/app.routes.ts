import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { Decks } from './views/decks/decks';
import { DeckDetail } from './views/deck-detail/deck-detail';
import { Home } from './views/home/home';
import { LocationDetail } from './views/location-detail/location-detail';
import { Locations } from './views/locations/locations';
import { Profile } from './views/profile/profile';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'locations', component: Locations },
  { path: 'locations/:id', component: LocationDetail },
  { path: 'decks', component: Decks },
  { path: 'decks/:id', component: DeckDetail },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
];
