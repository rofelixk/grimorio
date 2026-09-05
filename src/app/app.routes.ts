import { Routes } from '@angular/router';
import { Inicio } from './inicio/inicio';
import { Baralhos } from './baralhos/baralhos';
import { BaralhoDetalhe } from './baralho-detalhe/baralho-detalhe';
import { Colecao } from './colecao/colecao';
import { ColecaoDetalhe } from './colecao-detalhe/colecao-detalhe';
import { Cadastro } from './cadastro/cadastro';
import { Creditos } from './creditos/creditos';
import { Carta } from './carta/carta';
import { exigeAutenticacaoGuard } from '@shared/guards';

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'baralhos', component: Baralhos, canActivate: [exigeAutenticacaoGuard] },
  { path: 'baralhos/:id', component: BaralhoDetalhe, canActivate: [exigeAutenticacaoGuard] },
  { path: 'colecao', component: Colecao, canActivate: [exigeAutenticacaoGuard] },
  { path: 'colecao/:id', component: ColecaoDetalhe, canActivate: [exigeAutenticacaoGuard] },
  { path: 'cadastro', component: Cadastro },
  { path: 'creditos', component: Creditos },
  { path: 'carta/:oracleId', component: Carta },
  // printingId (scryfall_id) é opcional: repassado quando se chega aqui via
  // scan, pra mostrar a arte da impressão exata em vez da "representante" de
  // `cards` — ver ImpressaoEncontrada em cartas.service.ts.
  { path: 'carta/:oracleId/:printingId', component: Carta },
];
