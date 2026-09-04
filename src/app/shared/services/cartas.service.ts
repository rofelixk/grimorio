import { Inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { TOKEN_CLIENTE_SUPABASE } from '@shared/config';
import { ICarta } from '@shared/interfaces';

export type CampoDeBusca = 'name' | 'type_line';

export interface PaginaDeCartas {
  cartas: ICarta.Detalhes[];
  total: number;
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
}
