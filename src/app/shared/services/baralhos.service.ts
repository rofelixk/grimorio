import { Inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { TOKEN_CLIENTE_SUPABASE } from '@shared/config';
import { ICarta, IBaralho } from '@shared/interfaces';
import { dentroDaIdentidade, ehTerraBasica, elegivelComoComandante, permiteCopiasIlimitadas } from '@shared/utils';

const LIMITE_DE_CARTAS_NO_BARALHO = 99;

interface ItemComCartaRaw {
  id: string;
  oracle_id: string;
  printing_id: string | null;
  quantity: number;
  is_commander: boolean;
  updated_at: string;
  cards: {
    name: string;
    mana_cost: string | null;
    card_faces: { mana_cost: string; image_url: string | null }[] | null;
    type_line: string;
    color_identity: string[];
    image_url: string | null;
  } | null;
  printings: { set_code: string; image_url: string | null } | null;
}

@Injectable({ providedIn: 'root' })
export class BaralhosService {
  constructor(
    @Inject(TOKEN_CLIENTE_SUPABASE) private readonly clienteSupabase: SupabaseClient,
  ) {}

  async listarBaralhos(): Promise<IBaralho.Detalhes[]> {
    const { data, error } = await this.clienteSupabase
      .from('decks')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as IBaralho.Detalhes[];
  }

  async buscarBaralhoPorId(id: string): Promise<IBaralho.Detalhes | null> {
    const { data, error } = await this.clienteSupabase
      .from('decks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data as IBaralho.Detalhes | null;
  }

  async criarBaralho(nome: string): Promise<IBaralho.Detalhes> {
    const {
      data: { user },
    } = await this.clienteSupabase.auth.getUser();

    if (!user) {
      throw new Error('Não autenticado.');
    }

    const { data, error } = await this.clienteSupabase
      .from('decks')
      .insert({ name: nome, user_id: user.id })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as IBaralho.Detalhes;
  }

  async atualizarBaralho(id: string, nome: string): Promise<IBaralho.Detalhes> {
    const { data, error } = await this.clienteSupabase
      .from('decks')
      .update({ name: nome })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as IBaralho.Detalhes;
  }

  async excluirBaralho(id: string): Promise<void> {
    const { error } = await this.clienteSupabase.from('decks').delete().eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async listarCartas(deckId: string): Promise<IBaralho.ItemListado[]> {
    const { data, error } = await this.clienteSupabase
      .from('deck_cards')
      .select(
        'id, oracle_id, printing_id, quantity, is_commander, updated_at, cards(name, mana_cost, card_faces, type_line, color_identity, image_url), printings(set_code, image_url)',
      )
      .eq('deck_id', deckId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as unknown as ItemComCartaRaw[]).map((item) => ({
      id: item.id,
      oracle_id: item.oracle_id,
      printing_id: item.printing_id,
      quantity: item.quantity,
      is_commander: item.is_commander,
      updated_at: item.updated_at,
      nome: item.cards?.name ?? '',
      mana_cost: item.cards?.mana_cost ?? item.cards?.card_faces?.[0]?.mana_cost ?? null,
      type_line: item.cards?.type_line ?? '',
      color_identity: item.cards?.color_identity ?? [],
      set_code: item.printings?.set_code ?? null,
      image_url:
        item.printings?.image_url ??
        item.cards?.image_url ??
        item.cards?.card_faces?.[0]?.image_url ??
        null,
    }));
  }

  // Substitui o comandante atual (se houver) pela carta informada. Valida
  // elegibilidade (Legendary Creature ou "can be your commander" — ver
  // regras-comandante.ts) antes de qualquer escrita.
  async definirComandante(deckId: string, carta: ICarta.Detalhes, printingId: string | null): Promise<void> {
    if (!elegivelComoComandante(carta)) {
      throw new Error('Esta carta não pode ser comandante.');
    }

    const { error: erroRemocao } = await this.clienteSupabase
      .from('deck_cards')
      .delete()
      .eq('deck_id', deckId)
      .eq('is_commander', true);

    if (erroRemocao) {
      throw new Error(erroRemocao.message);
    }

    const { error: erroInsercao } = await this.clienteSupabase.from('deck_cards').insert({
      deck_id: deckId,
      oracle_id: carta.oracle_id,
      printing_id: printingId,
      quantity: 1,
      is_commander: true,
    });

    if (erroInsercao) {
      throw new Error(erroInsercao.message);
    }

    const { error: erroAtualizacao } = await this.clienteSupabase
      .from('decks')
      .update({ commander_oracle_id: carta.oracle_id })
      .eq('id', deckId);

    if (erroAtualizacao) {
      throw new Error(erroAtualizacao.message);
    }
  }

  async removerComandante(deckId: string): Promise<void> {
    const { error: erroRemocao } = await this.clienteSupabase
      .from('deck_cards')
      .delete()
      .eq('deck_id', deckId)
      .eq('is_commander', true);

    if (erroRemocao) {
      throw new Error(erroRemocao.message);
    }

    const { error: erroAtualizacao } = await this.clienteSupabase
      .from('decks')
      .update({ commander_oracle_id: null })
      .eq('id', deckId);

    if (erroAtualizacao) {
      throw new Error(erroAtualizacao.message);
    }
  }

  async adicionarCarta(
    deckId: string,
    carta: ICarta.Detalhes,
    printingId: string | null,
    identidadeComandante: string[] | null,
  ): Promise<void> {
    if (identidadeComandante && !dentroDaIdentidade(carta.color_identity, identidadeComandante)) {
      throw new Error('Esta carta está fora da identidade de cor do comandante.');
    }

    const { data: linhasExistentes, error: erroBusca } = await this.clienteSupabase
      .from('deck_cards')
      .select('id, printing_id, quantity, is_commander')
      .eq('deck_id', deckId)
      .eq('oracle_id', carta.oracle_id);

    if (erroBusca) {
      throw new Error(erroBusca.message);
    }

    const linhas = (linhasExistentes ?? []) as {
      id: string;
      printing_id: string | null;
      quantity: number;
      is_commander: boolean;
    }[];

    if (linhas.some((linha) => linha.is_commander)) {
      throw new Error('Esta carta já é o comandante do baralho.');
    }

    if (linhas.length > 0 && !ehTerraBasica(carta) && !permiteCopiasIlimitadas(carta)) {
      throw new Error(
        'Baralhos Commander permitem apenas 1 cópia de cada carta (exceto terrenos básicos ou cartas que permitem cópias ilimitadas).',
      );
    }

    const linhaMesmaImpressao = linhas.find((linha) => (linha.printing_id ?? null) === (printingId ?? null));

    if (linhaMesmaImpressao) {
      const { error } = await this.clienteSupabase
        .from('deck_cards')
        .update({ quantity: linhaMesmaImpressao.quantity + 1 })
        .eq('id', linhaMesmaImpressao.id);

      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    const { data: quantidades, error: erroQuantidades } = await this.clienteSupabase
      .from('deck_cards')
      .select('quantity')
      .eq('deck_id', deckId)
      .eq('is_commander', false);

    if (erroQuantidades) {
      throw new Error(erroQuantidades.message);
    }

    const totalAtual = ((quantidades ?? []) as { quantity: number }[]).reduce(
      (soma, linha) => soma + linha.quantity,
      0,
    );

    if (totalAtual >= LIMITE_DE_CARTAS_NO_BARALHO) {
      throw new Error(`O baralho já tem ${LIMITE_DE_CARTAS_NO_BARALHO} cartas além do comandante.`);
    }

    const { error: erroInsercao } = await this.clienteSupabase.from('deck_cards').insert({
      deck_id: deckId,
      oracle_id: carta.oracle_id,
      printing_id: printingId,
      quantity: 1,
      is_commander: false,
    });

    if (erroInsercao) {
      throw new Error(erroInsercao.message);
    }
  }

  async removerUmaCopia(itemId: string): Promise<void> {
    const { data: existente, error: erroBusca } = await this.clienteSupabase
      .from('deck_cards')
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
      const { error } = await this.clienteSupabase.from('deck_cards').delete().eq('id', itemId);

      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    const { error } = await this.clienteSupabase
      .from('deck_cards')
      .update({ quantity: existente.quantity - 1 })
      .eq('id', itemId);

    if (error) {
      throw new Error(error.message);
    }
  }
}
