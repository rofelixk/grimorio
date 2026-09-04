import { Routes } from '@angular/router';
import { Inicio } from './inicio/inicio';
import { Baralhos } from './baralhos/baralhos';
import { Colecao } from './colecao/colecao';
import { Cadastro } from './cadastro/cadastro';
import { exigeAutenticacaoGuard } from '@shared/guards';

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'baralhos', component: Baralhos, canActivate: [exigeAutenticacaoGuard] },
  { path: 'colecao', component: Colecao, canActivate: [exigeAutenticacaoGuard] },
  { path: 'cadastro', component: Cadastro },
];
