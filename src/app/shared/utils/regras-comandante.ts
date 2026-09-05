import { ICarta } from '@shared/interfaces';

// Cartas multiface (transform, modal_dfc, ...) têm type_line/oracle_text
// nulos no nível da carta — a face 0 é a fonte de verdade, mesmo fallback
// usado em criarVisualizacaoDeCarta (ver visualizacao-carta.ts).
function tipoEfetivo(carta: ICarta.Detalhes): string {
  return carta.card_faces?.[0]?.type_line ?? carta.type_line ?? '';
}

function textoOracleEfetivo(carta: ICarta.Detalhes): string {
  return carta.card_faces?.[0]?.oracle_text ?? carta.oracle_text ?? '';
}

// Legendary Creature, ou qualquer carta cujo oracle text diga explicitamente
// que pode ser comandante (backgrounds, planeswalkers específicos, etc. —
// texto padrão da Scryfall/regras: "can be your commander").
export function elegivelComoComandante(carta: ICarta.Detalhes): boolean {
  const tipo = tipoEfetivo(carta);
  const ehLendariaCriatura = tipo.includes('Legendary') && tipo.includes('Creature');
  const permiteComandantePorTexto = textoOracleEfetivo(carta).includes('can be your commander');
  return ehLendariaCriatura || permiteComandantePorTexto;
}

export function ehTerraBasica(carta: ICarta.Detalhes): boolean {
  return tipoEfetivo(carta).includes('Basic Land');
}

// Cartas como Relentless Rats / Persistent Petitioners, cujo oracle text
// permite qualquer quantidade de cópias no baralho (texto padrão da
// Scryfall: "A deck can have any number of cards named ...").
export function permiteCopiasIlimitadas(carta: ICarta.Detalhes): boolean {
  return textoOracleEfetivo(carta).includes('A deck can have any number of cards named');
}

// A identidade de cor de uma carta precisa estar contida na do comandante
// (regra de identidade de cor do Commander) — todo elemento de
// identidadeCarta precisa estar em identidadeComandante.
export function dentroDaIdentidade(identidadeCarta: string[], identidadeComandante: string[]): boolean {
  return identidadeCarta.every((cor) => identidadeComandante.includes(cor));
}
