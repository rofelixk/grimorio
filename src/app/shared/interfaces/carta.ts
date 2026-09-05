// Formatos de dados de carta compartilhados entre o script de importação do
// Scryfall e o app. Ver docs/data-model.md para a tabela `cards` que isso espelha.
//
// Convenção: o nome simples é sempre a forma canônica (o que está armazenado).
// Qualquer forma que se desvie disso leva um sufixo nomeando o desvio (Raw =
// forma bruta, sem tratamento, vinda da API do Scryfall).
export namespace ICarta {
  /** Uma face bruta de uma carta multiface do Scryfall, antes do corte. */
  export interface FaceRaw {
    name: string;
    mana_cost: string;
    type_line?: string;
    oracle_text?: string;
    colors?: string[];
    power?: string;
    toughness?: string;
    image_uris?: { normal: string };
  }

  /**
   * Objeto de carta como retornado pela API do Scryfall, sem corte. Usado
   * tanto para o bulk file Oracle Cards (um objeto por `oracle_id`) quanto
   * para Default Cards (um objeto por impressão) — mesmo formato de objeto
   * em ambos, Default Cards só repete `oracle_id` entre impressões e carrega
   * os campos de impressão abaixo (`id`, `set`, `collector_number`, `lang`).
   */
  export interface DetalhesRaw {
    id: string;
    oracle_id: string;
    name: string;
    games: string[];
    layout: string;
    set: string;
    set_type: string;
    collector_number: string;
    lang: string;
    mana_cost?: string;
    cmc: number;
    type_line: string;
    oracle_text?: string;
    color_identity: string[];
    power?: string;
    toughness?: string;
    loyalty?: string;
    legalities: { commander: string };
    image_uris?: { normal: string };
    card_faces?: FaceRaw[];
    [key: string]: unknown;
  }

  /** Uma face de uma carta multiface, como armazenada em `cards.card_faces`. */
  export interface Face {
    name: string;
    mana_cost: string;
    type_line: string | null;
    oracle_text: string | null;
    colors: string[];
    power: string | null;
    toughness: string | null;
    image_url: string | null;
  }

  /** Os dados de uma carta como armazenados na tabela `cards`. */
  export interface Detalhes {
    oracle_id: string;
    name: string;
    mana_cost: string | null;
    mana_value: number;
    type_line: string;
    oracle_text: string | null;
    color_identity: string[];
    power: string | null;
    toughness: string | null;
    loyalty: string | null;
    layout: string;
    commander_legality: string;
    image_url: string | null;
    card_faces: Face[] | null;
  }
}
