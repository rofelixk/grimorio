export interface CandidatosImpressao {
  numeros: string[];
  codigos: string[];
}

// Extrai candidatos a "número do coletor" e "código do set" do texto bruto
// devolvido pelo OCR de uma foto tirada de perto da carta — sem assumir que
// os dois apareçam juntos/adjacentes: produtos diferentes (ex.: crossovers
// tipo Final Fantasy) imprimem essa informação em posições variadas, e o OCR
// de uma foto de celular é ruidoso o bastante pra embaralhar a ordem mesmo
// quando estão próximos. Quem chama tenta cada combinação contra a tabela
// `printings` até achar uma que bata — mais barato deixar o banco decidir o
// que é ruído do que tentar acertar via regex sozinho.
export function lerCandidatosDeImpressao(textoOcr: string): CandidatosImpressao {
  const texto = textoOcr.toUpperCase();

  const numeros = Array.from(new Set(texto.match(/\b\d{2,4}\b/g) ?? []));

  // Mínimo de 3 caracteres corta bastante ruído de OCR (letra de raridade
  // solta, código de idioma "EN"/"PT", fragmentos de 1-2 letras) sem
  // descartar nenhum código de set real do Scryfall, que não usa códigos de
  // 2 caracteres.
  const codigos = Array.from(new Set(texto.match(/\b[A-Z0-9]{3,5}\b/g) ?? [])).filter(
    (token) => !/^\d+$/.test(token),
  );

  return { numeros, codigos };
}
