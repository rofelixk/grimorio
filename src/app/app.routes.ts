import { Routes } from '@angular/router';
import { Inicio } from './inicio/inicio';
import { Baralhos } from './baralhos/baralhos';
import { Colecao } from './colecao/colecao';

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'baralhos', component: Baralhos },
  { path: 'colecao', component: Colecao },
];
