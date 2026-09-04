import { Inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { TOKEN_CLIENTE_SUPABASE } from '@shared/config';
import { IColecao } from '@shared/interfaces';
import { CampoDeBusca } from './cartas.service';

interface ItemComCartaRaw {
  id: string;
  oracle_id: string;
  quantity: number;
  date_added: string;
  updated_at: string;
  cards: { name: string; mana_cost: string | null; card_faces: { mana_cost: string }[] | null } | null;
}

interface ItemEmColecaoRaw {
  id: string;
  oracle_id: string;
  updated_at: string;
  cards: { name: string; image_url: string | null; type_line: string } | null;
  collections: { id: string; name: string; color: string } | null;
}

@Injectable({ providedIn: 'root' })
export class ColecoesService {
  constructor(
    @Inject(TOKEN_CLIENTE_SUPABASE) private readonly clienteSupabase: SupabaseClient,
  ) {}

  async listarColecoes(): Promise<IColecao.Detalhes[]> {
    const { data, error } = await this.clienteSupabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as IColecao.Detalhes[];
  }

  async buscarColecaoPorId(id: string): Promise<IColecao.Detalhes | null> {
    const { data, error } = await this.clienteSupabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data as IColecao.Detalhes | null;
  }

  async criarColecao(nome: string, cor: string): Promise<IColecao.Detalhes> {
    const {
      data: { user },
    } = await this.clienteSupabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated.');
    }

    const { data, error } = await this.clienteSupabase
      .from('collections')
      .insert({ name: nome, color: cor, user_id: user.id })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as IColecao.Detalhes;
  }

  async atualizarColecao(id: string, nome: string, cor: string): Promise<IColecao.Detalhes> {
    const { data, error } = await this.clienteSupabase
      .from('collections')
      .update({ name: nome, color: cor })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as IColecao.Detalhes;
  }

  async excluirColecao(id: string): Promise<void> {
    const { error } = await this.clienteSupabase.from('collections').delete().eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async listarItens(colecaoId: string): Promise<IColecao.ItemListado[]> {
    const { data, error } = await this.clienteSupabase
      .from('collection_items')
      .select('id, oracle_id, quantity, date_added, updated_at, cards(name, mana_cost, card_faces)')
      .eq('collection_id', colecaoId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as unknown as ItemComCartaRaw[]).map((item) => ({
      id: item.id,
      oracle_id: item.oracle_id,
      quantity: item.quantity,
      date_added: item.date_added,
      updated_at: item.updated_at,
      nome: item.cards?.name ?? '',
      mana_cost: item.cards?.mana_cost ?? item.cards?.card_faces?.[0]?.mana_cost ?? null,
    }));
  }

  // Busca uma carta pelo nome ou tipo em todas as coleções do usuário (RLS já
  // restringe a `collection_items` às coleções dele). Usado pela busca no
  // topo da página de lista de coleções.
  async buscarCartasEmColecoes(
    termo: string,
    campo: CampoDeBusca = 'name',
  ): Promise<IColecao.ItemEmColecao[]> {
    const { data, error } = await this.clienteSupabase
      .from('collection_items')
      .select(
        'id, oracle_id, updated_at, cards!inner(name, image_url, type_line), collections!inner(id, name, color)',
      )
      .ilike(`cards.${campo}`, `%${termo}%`)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as unknown as ItemEmColecaoRaw[]).map((item) => ({
      id: item.id,
      oracle_id: item.oracle_id,
      updated_at: item.updated_at,
      nome: item.cards?.name ?? '',
      tipo: item.cards?.type_line ?? '',
      imagem_url: item.cards?.image_url ?? null,
      colecao_id: item.collections?.id ?? '',
      colecao_nome: item.collections?.name ?? '',
      colecao_cor: item.collections?.color ?? '',
    }));
  }

  // Card já presente na coleção (mesmo oracle_id, sem set_code ainda — ver
  // docs/data-model.md) tem a quantidade incrementada; senão cria o item.
  async adicionarCarta(colecaoId: string, oracleId: string): Promise<void> {
    const { data: existente, error: erroBusca } = await this.clienteSupabase
      .from('collection_items')
      .select('id, quantity')
      .eq('collection_id', colecaoId)
      .eq('oracle_id', oracleId)
      .is('set_code', null)
      .maybeSingle();

    if (erroBusca) {
      throw new Error(erroBusca.message);
    }

    if (existente) {
      const { error } = await this.clienteSupabase
        .from('collection_items')
        .update({ quantity: existente.quantity + 1 })
        .eq('id', existente.id);

      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    const { error } = await this.clienteSupabase
      .from('collection_items')
      .insert({ collection_id: colecaoId, oracle_id: oracleId, quantity: 1 });

    if (error) {
      throw new Error(error.message);
    }
  }

  // Remove uma cópia; exclui o item quando a quantidade chega a zero.
  async removerUmaCopia(itemId: string): Promise<void> {
    const { data: existente, error: erroBusca } = await this.clienteSupabase
      .from('collection_items')
      .select('quantity')
      .eq('id', itemId)
      .maybeSingle();

    if (erroBusca) {
      throw new Error(erroBusca.message);
    }

    if (!existente) {
      return;
    }

    if (existente.quantity <= 1) {
      const { error } = await this.clienteSupabase
        .from('collection_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    const { error } = await this.clienteSupabase
      .from('collection_items')
      .update({ quantity: existente.quantity - 1 })
      .eq('id', itemId);

    if (error) {
      throw new Error(error.message);
    }
  }
}
