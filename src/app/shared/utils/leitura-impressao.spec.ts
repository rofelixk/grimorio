import { lerCandidatosDeImpressao } from './leitura-impressao';

describe('lerCandidatosDeImpressao', () => {
  it('finds the collector number and set code on a clean adjacent line', () => {
    expect(lerCandidatosDeImpressao('042/264 SLX')).toEqual({
      numeros: ['042', '264'],
      codigos: ['SLX'],
    });
  });

  it('is case-insensitive on the set code', () => {
    expect(lerCandidatosDeImpressao('7/281 znr')).toEqual({
      numeros: ['281'],
      codigos: ['ZNR'],
    });
  });

  it('finds candidates scattered across multiple noisy OCR lines, not just adjacent text', () => {
    const textoOcr = `£ ¢ Crys LAL.

E I hraden
id

: R 0423 FFXIV

4 FIC «EN & DaviD
i al Scie RIS iia hice £ a SRG`;

    const candidatos = lerCandidatosDeImpressao(textoOcr);

    expect(candidatos.numeros).toContain('0423');
    expect(candidatos.codigos).toContain('FIC');
  });

  it('excludes 1-2 character noise (rarity letters, language codes) from set code candidates', () => {
    const candidatos = lerCandidatosDeImpressao('R 042 EN SLX');
    expect(candidatos.codigos).not.toContain('EN');
    expect(candidatos.codigos).not.toContain('R');
    expect(candidatos.codigos).toContain('SLX');
  });

  it('returns an empty numeros array when there are no digits (the card name is not treated as a set code match on its own)', () => {
    // "Bolt" (4 letras) ainda vira candidato a código — o corte de ruído
    // aqui é o lookup no banco, não a extração; ver lerCandidatosDeImpressao.
    expect(lerCandidatosDeImpressao('Lightning').numeros).toEqual([]);
  });
});
