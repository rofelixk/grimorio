// Formatos de dados de coleção. Ver docs/data-model.md para as tabelas
// `collections` e `collection_items` que isso espelha (nomeadas em inglês
// deliberadamente, ver a nota de exceção nesse documento).
export namespace IColecao {
  /** Uma coleção do usuário, como armazenada na tabela `collections`. */
  export interface Detalhes {
    id: string;
    user_id: string;
    name: string;
    color: string;
    created_at: string;
  }

  /** Um item de coleção como armazenado na tabela `collection_items`. */
  export interface Item {
    id: string;
    collection_id: string;
    oracle_id: string;
    set_code: string | null;
    quantity: number;
    date_added: string;
    updated_at: string;
  }

  /** Um item de coleção já resolvido com dados da carta, para exibição. */
  export interface ItemListado {
    id: string;
    oracle_id: string;
    quantity: number;
    date_added: string;
    updated_at: string;
    nome: string;
    mana_cost: string | null;
  }

  /** Um item encontrado ao buscar uma carta em todas as coleções do usuário. */
  export interface ItemEmColecao {
    id: string;
    oracle_id: string;
    updated_at: string;
    nome: string;
    tipo: string;
    imagem_url: string | null;
    colecao_id: string;
    colecao_nome: string;
    colecao_cor: string;
  }
}
