// Formatos de dados de baralho. Ver docs/data-model.md para as tabelas
// `decks` e `deck_cards` que isso espelha (nomeadas em inglês
// deliberadamente, mesma exceção de `collections`/`collection_items`).
export namespace IBaralho {
  /** Um baralho do usuário, como armazenado na tabela `decks`. */
  export interface Detalhes {
    id: string;
    user_id: string;
    name: string;
    commander_oracle_id: string | null;
    format: string;
    created_at: string;
  }

  /** Um item de baralho como armazenado na tabela `deck_cards`. */
  export interface Item {
    id: string;
    deck_id: string;
    oracle_id: string;
    printing_id: string | null;
    quantity: number;
    is_commander: boolean;
    date_added: string;
    updated_at: string;
  }

  /** Um item de baralho já resolvido com dados da carta, para exibição. */
  export interface ItemListado {
    id: string;
    oracle_id: string;
    printing_id: string | null;
    quantity: number;
    is_commander: boolean;
    updated_at: string;
    nome: string;
    mana_cost: string | null;
    type_line: string;
    color_identity: string[];
    // set_code da impressão escolhida, se houver — null quando printing_id é null.
    set_code: string | null;
    // Imagem a exibir: da impressão escolhida quando houver, senão a
    // "representante" de `cards` (ver docs/data-model.md).
    image_url: string | null;
  }
}
