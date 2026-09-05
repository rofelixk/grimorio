import { Inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { TOKEN_CLIENTE_SUPABASE } from '@shared/config';
import { ICarta } from '@shared/interfaces';

export type CampoDeBusca = 'name' | 'type_line';

export interface PaginaDeCartas {
  cartas: ICarta.Detalhes[];
  total: number;
}

export interface ImpressaoEncontrada {
  carta: ICarta.Detalhes;
  // scryfall_id da impressão — identifica exatamente qual arte/edição foi
  // escaneada, para diferenciar de `carta.image_url` (a impressão
  // "representante" escolhida arbitrariamente pelo script de importação
  // para a linha em `cards`, ver docs/data-model.md). Quem chama repassa
  // isso na rota /carta pra mostrar a arte certa.
  printingId: string;
}

// Tamanho de página padrão (usado quando quem chama não sabe quantas colunas
// a grade de resultados tem) — ver calcularTamanhoPagina abaixo para o
// tamanho por número de colunas.
export const TAMANHO_PAGINA_BUSCA = 25;

// Linhas completas por página para cada número de colunas já usado no app
// (início: 5 no desktop/2 no mobile; detalhe de coleção: 4 no desktop/2 no
// mobile) — escolhidas para ficar perto de TAMANHO_PAGINA_BUSCA sem deixar a
// última linha da grade incompleta. Um número de colunas fora dessa lista cai
// no fallback: a linha mais próxima de TAMANHO_PAGINA_BUSCA.
const LINHAS_POR_COLUNA: Record<number, number> = { 2: 10, 4: 6, 5: 5 };

export function calcularTamanhoPagina(colunas: number): number {
  const linhas = LINHAS_POR_COLUNA[colunas] ?? Math.max(1, Math.round(TAMANHO_PAGINA_BUSCA / colunas));
  return colunas * linhas;
}

@Injectable({ providedIn: 'root' })
export class CartasService {
  constructor(
    @Inject(TOKEN_CLIENTE_SUPABASE) private readonly clienteSupabase: SupabaseClient,
  ) {}

  async buscarCartas(
    termo: string,
    campo: CampoDeBusca,
    pagina = 1,
    tamanhoPagina = TAMANHO_PAGINA_BUSCA,
  ): Promise<PaginaDeCartas> {
    const inicio = (pagina - 1) * tamanhoPagina;
    const fim = inicio + tamanhoPagina - 1;

    const { data, error, count } = await this.clienteSupabase
      .from('cards')
      .select('*', { count: 'exact' })
      .ilike(campo, `%${termo}%`)
      .range(inicio, fim);

    if (error) {
      throw new Error(error.message);
    }

    return { cartas: (data ?? []) as ICarta.Detalhes[], total: count ?? 0 };
  }

  async buscarCartaPorId(oracleId: string): Promise<ICarta.Detalhes | null> {
    const { data, error } = await this.clienteSupabase
      .from('cards')
      .select('*')
      .eq('oracle_id', oracleId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data as ICarta.Detalhes | null;
  }

  // Resolve "código do set + número do coletor" (o que o scanner de câmera lê
  // numa impressão física) até a carta correspondente. Tenta o número lido
  // como veio e, se não achar, sem zeros à esquerda — o OCR e a formatação
  // impressa nem sempre concordam em quantos zeros usar (ex.: "007" vs "7").
  // Restrito a `lang eq 'en'`: mesma limitação "English only" do resto do
  // app (ver docs/data-model.md) — sem isso, uma impressão com o mesmo
  // set_code/collector_number em outro idioma tornaria o resultado ambíguo.
  async buscarCartaPorImpressao(setCode: string, collectorNumber: string): Promise<ImpressaoEncontrada | null> {
    const semZerosEsquerda = collectorNumber.replace(/^0+(?=\d)/, '');
    const candidatos = Array.from(new Set([collectorNumber, semZerosEsquerda]));

    for (const numero of candidatos) {
      const { data, error } = await this.clienteSupabase
        .from('printings')
        .select('scryfall_id, cards(*)')
        .ilike('set_code', setCode)
        .eq('collector_number', numero)
        .eq('lang', 'en')
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (data?.cards) {
        return { carta: data.cards as unknown as ICarta.Detalhes, printingId: data.scryfall_id };
      }
    }

    return null;
  }

  // Busca só a arte da impressão específica (não a "representante" de
  // `cards`) — usado na página de detalhe quando se chega lá via scan, pra
  // mostrar a edição/arte certa em vez da escolhida arbitrariamente na
  // importação (ver docs/data-model.md).
  async buscarImagemDaImpressao(printingId: string): Promise<string | null> {
    const { data, error } = await this.clienteSupabase
      .from('printings')
      .select('image_url')
      .eq('scryfall_id', printingId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data?.image_url ?? null;
  }
}
