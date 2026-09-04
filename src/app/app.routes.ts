import { Routes } from '@angular/router';
import { Inicio } from './inicio/inicio';
import { Baralhos } from './baralhos/baralhos';
import { Colecao } from './colecao/colecao';
import { ColecaoDetalhe } from './colecao-detalhe/colecao-detalhe';
import { Cadastro } from './cadastro/cadastro';
import { Creditos } from './creditos/creditos';
import { Carta } from './carta/carta';
import { exigeAutenticacaoGuard } from '@shared/guards';

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'baralhos', component: Baralhos, canActivate: [exigeAutenticacaoGuard] },
  { path: 'colecao', component: Colecao, canActivate: [exigeAutenticacaoGuard] },
  { path: 'colecao/:id', component: ColecaoDetalhe, canActivate: [exigeAutenticacaoGuard] },
  { path: 'cadastro', component: Cadastro },
  { path: 'creditos', component: Creditos },
  { path: 'carta/:oracleId', component: Carta },
];
