// Regras do filtro de importação — ver docs/data-model.md "Import filter".
export const LAYOUTS_EXCLUIDOS = new Set([
  'art_series',
  'token',
  'double_faced_token',
  'emblem',
  'scheme',
  'planar',
  'vanguard',
  'augment',
  'host',
  // Sem oracle_id/mana_cost/etc. no nível do objeto — cada face é, na
  // prática, uma carta oracle-distinta impressa dos dois lados da mesma
  // cópia física, não uma carta multiface de verdade. Tentar tratar como
  // multiface (como antes) grava oracle_id null em `cards`/`printings`.
  'reversible_card',
]);

export const TIPOS_DE_EDICAO_EXCLUIDOS = new Set(['memorabilia', 'token', 'minigame']);

// Layouts que carregam um array `card_faces` — ver data-model.md "card_faces JSONB shape".
export const LAYOUTS_MULTIFACE = new Set([
  'transform',
  'modal_dfc',
  'adventure',
  'split',
  'flip',
  'battle',
  'meld',
  'prepare',
]);
