import { Inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { TOKEN_CLIENTE_SUPABASE } from '@shared/config';
import { ICarta } from '@shared/interfaces';

export type CampoDeBusca = 'name' | 'type_line';

@Injectable({ providedIn: 'root' })
export class CartasService {
  constructor(
    @Inject(TOKEN_CLIENTE_SUPABASE) private readonly clienteSupabase: SupabaseClient,
  ) {}

  async buscarCartas(termo: string, campo: CampoDeBusca): Promise<ICarta.Detalhes[]> {
    const { data, error } = await this.clienteSupabase
      .from('cards')
      .select('*')
      .ilike(campo, `%${termo}%`);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as ICarta.Detalhes[];
  }
}
