// Convenção de símbolos de mana/custo do Scryfall — ver https://scryfall.com/docs/api/colors.
// Os SVGs em public/assets/mana-symbols usam o código do símbolo sem chaves nem barras
// (ex.: "{W/U}" -> "WU.svg", "{U/P}" -> "UP.svg").

export type SegmentoDeTexto =
  | { tipo: 'texto'; valor: string }
  | { tipo: 'simbolo'; codigo: string; caminhoSvg: string };

const REGEX_SIMBOLO = /\{([^}]+)\}/g;

export function dividirEmSegmentos(texto: string): SegmentoDeTexto[] {
  const segmentos: SegmentoDeTexto[] = [];
  let ultimoIndice = 0;
  let correspondencia: RegExpExecArray | null;

  REGEX_SIMBOLO.lastIndex = 0;
  while ((correspondencia = REGEX_SIMBOLO.exec(texto)) !== null) {
    if (correspondencia.index > ultimoIndice) {
      segmentos.push({ tipo: 'texto', valor: texto.slice(ultimoIndice, correspondencia.index) });
    }

    const codigo = correspondencia[1].replace(/\//g, '');
    segmentos.push({ tipo: 'simbolo', codigo, caminhoSvg: `/assets/mana-symbols/${codigo}.svg` });

    ultimoIndice = REGEX_SIMBOLO.lastIndex;
  }

  if (ultimoIndice < texto.length) {
    segmentos.push({ tipo: 'texto', valor: texto.slice(ultimoIndice) });
  }

  return segmentos;
}
