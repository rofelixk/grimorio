import { Routes } from '@angular/router';
import { Home } from './views/home/home';
import { LocationDetail } from './views/location-detail/location-detail';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'locations/:id', component: LocationDetail },
];
