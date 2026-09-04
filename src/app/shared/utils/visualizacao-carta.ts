import { ICarta } from '@shared/interfaces';
import { dividirEmSegmentos, SegmentoDeTexto } from './simbolos-mana';

// Campos derivados para exibir uma carta (ou uma de suas faces, se multiface).
// Compartilhado entre o tile da lista de busca e a página de detalhe da carta.
export interface VisualizacaoDeCarta {
  nomeExibido: string;
  custoDeManaExibido: string;
  segmentosCustoDeMana: SegmentoDeTexto[];
  manaValue: number;
  tipoExibido: string;
  textoOracleExibido: string | null;
  segmentosTextoOracle: SegmentoDeTexto[];
  imagemExibida: string | null;
}

export function ehCartaMultiface(carta: ICarta.Detalhes): boolean {
  return (carta.card_faces?.length ?? 0) > 1;
}

export function criarVisualizacaoDeCarta(
  carta: ICarta.Detalhes,
  indiceFace = 0,
): VisualizacaoDeCarta {
  const face = carta.card_faces?.[indiceFace] ?? null;
  const custoDeManaExibido = face?.mana_cost ?? carta.mana_cost ?? '';
  const textoOracleExibido = face?.oracle_text ?? carta.oracle_text ?? null;

  return {
    nomeExibido: face?.name ?? carta.name,
    custoDeManaExibido,
    segmentosCustoDeMana: dividirEmSegmentos(custoDeManaExibido),
    manaValue: carta.mana_value,
    tipoExibido: face?.type_line ?? carta.type_line,
    textoOracleExibido,
    segmentosTextoOracle: textoOracleExibido ? dividirEmSegmentos(textoOracleExibido) : [],
    imagemExibida: face?.image_url ?? carta.image_url,
  };
}
