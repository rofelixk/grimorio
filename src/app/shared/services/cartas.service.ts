import { Inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { TOKEN_CLIENTE_SUPABASE } from '@shared/config';
import { ICarta } from '@shared/interfaces';

export type CampoDeBusca = 'name' | 'type_line';

export interface PaginaDeCartas {
  cartas: ICarta.Detalhes[];
  total: number;
}

// Limita quantas imagens de carta são carregadas de uma vez pela busca.
export const TAMANHO_PAGINA_BUSCA = 25;

@Injectable({ providedIn: 'root' })
export class CartasService {
  constructor(
    @Inject(TOKEN_CLIENTE_SUPABASE) private readonly clienteSupabase: SupabaseClient,
  ) {}

  async buscarCartas(
    termo: string,
    campo: CampoDeBusca,
    pagina = 1,
  ): Promise<PaginaDeCartas> {
    const inicio = (pagina - 1) * TAMANHO_PAGINA_BUSCA;
    const fim = inicio + TAMANHO_PAGINA_BUSCA - 1;

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
