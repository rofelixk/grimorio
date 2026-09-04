// Divide um texto em torno da primeira ocorrência (case-insensitive) de um
// termo de busca, para destacar por que um resultado bateu com a busca.
export interface TextoDestacado {
  antes: string;
  trecho: string;
  depois: string;
}

export function destacarTermo(texto: string, termo: string): TextoDestacado {
  const termoLimpo = termo.trim();
  if (!termoLimpo) {
    return { antes: texto, trecho: '', depois: '' };
  }

  const indice = texto.toLowerCase().indexOf(termoLimpo.toLowerCase());
  if (indice === -1) {
    return { antes: texto, trecho: '', depois: '' };
  }

  return {
    antes: texto.slice(0, indice),
    trecho: texto.slice(indice, indice + termoLimpo.length),
    depois: texto.slice(indice + termoLimpo.length),
  };
}
