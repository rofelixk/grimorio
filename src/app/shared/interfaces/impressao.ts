// Formato de dados de impressão (printing) compartilhado entre o script de
// importação do Scryfall e o app. Ver docs/data-model.md para a tabela
// `printings` que isso espelha (nomeada em inglês deliberadamente, mesma
// nota de exceção usada em `colecao.ts`).
export namespace IImpressao {
  /** Uma impressão de carta como armazenada na tabela `printings`. */
  export interface Detalhes {
    scryfall_id: string;
    oracle_id: string;
    set_code: string;
    collector_number: string;
    lang: string;
    image_url: string | null;
  }
}
