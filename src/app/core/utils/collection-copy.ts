// Every Collections UI string (spec 008, ui.md §7): verbatim from the design handoff.
// `{…}` interpolations become functions; counts use pt-BR grouping with singular forms
// ("1 carta", "1 subcoleção") where the handoff calls for them.

import type { CollectionTotals } from '@models/collection.model';

const nf = new Intl.NumberFormat('pt-BR');

/** A count formatted with pt-BR grouping ("1.240"). */
export function formatCount(n: number): string {
  return nf.format(n);
}

/** The formatted count followed by the singular or plural word ("1 carta", "1.240 cartas"). */
export function plural(n: number, one: string, many: string): string {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}

export const COLLECTION = {
  title: 'Coleção',
  newCollection: 'Nova coleção',
  newSubcollection: 'Nova subcoleção',
  holdingName: 'Caixa temporária',
  /** The holding tag's visible count ("37 cartas", "1 carta"). */
  cardCount: (n: number) => plural(n, 'carta', 'cartas'),
  holdingLabel: (n: number, s: number) =>
    `Caixa temporária. ${formatCount(n)} cartas sem coleção, ${formatCount(s)} à venda.`,
  holdingCopy:
    'Cartas que ficaram sem coleção quando uma coleção foi excluída. Elas guardam todos os dados. Quando a última sair daqui, esta caixa some sozinha.',
  searchPlaceholder: 'Buscar coleções — em breve',
  searchLabel: 'Buscar coleções (em breve)',
  filters: 'Filtros',
  filtersSoon: 'Busca e filtros chegam em breve.',

  /** "Vazia" when there are no cards anywhere in the subtree, otherwise the counted parts joined by "·". */
  meta: (t: Pick<CollectionTotals, 'cards' | 'sale' | 'subs'>): string => {
    if (t.cards === 0 && t.subs === 0) return 'Vazia';
    const base = `${plural(t.cards, 'carta', 'cartas')} · ${formatCount(t.sale)} à venda`;
    return t.subs === 0 ? base : `${base} · ${plural(t.subs, 'subcoleção', 'subcoleções')}`;
  },

  rowLabel: (nome: string, cor: string, meta: string) => `${nome}, cor ${cor}. ${meta}.`,
  open: 'Abrir',

  emptyEyebrow: 'Nenhuma coleção ainda',
  emptyTitle: 'Onde suas cartas moram',
  emptyCopy:
    'Uma coleção é um lugar físico — uma caixa, um fichário, uma pasta. Crie uma para cada um e divida em subcoleções quando precisar.',
  emptyCta: 'Criar coleção',

  path: 'Caminho',
  edit: 'Editar',
  delete: 'Excluir',

  statCards: 'Cartas',
  statSale: 'À venda',
  statSubs: 'Subcoleções',
  colorLevel: (cor: string, n: number) => `Cor: ${cor} · Nível ${n} de 3`,

  subsEyebrow: 'Subcoleções',
  cardsEyebrow: 'Cartas',
  cardsSoon:
    'A lista das cartas desta coleção chega em breve. Por enquanto, os números acima mostram o que está guardado aqui.',
  split: 'Dividir em subcoleções',
  splitSub: (n: number) => `As ${formatCount(n)} cartas vão para a primeira subcoleção.`,
  lastLevel: 'Último nível — guarda só cartas.',

  keepCards: 'Guardar cartas',
  keepCardsCopy: 'As cartas ficam direto nesta coleção.',
  addCardsSoon: 'Adicionar cartas — em breve',
  divide: 'Dividir',
  divideCopy: 'Crie subcoleções — divisórias, páginas, seções.',
  eitherOr: 'Uma coleção guarda cartas ou subcoleções — o que entrar primeiro define qual.',

  formTitles: {
    newCollection: 'Nova coleção',
    newSubcollection: 'Nova subcoleção',
    editCollection: 'Editar coleção',
    editSubcollection: 'Editar subcoleção',
  },
  inside: (pai: string) => `Dentro de ${pai}.`,
  movePlate: (pai: string, n: number) =>
    `${pai} tem ${formatCount(n)} cartas. Uma coleção guarda cartas ou subcoleções — elas vão para esta nova subcoleção.`,

  nameLabel: 'Nome',
  nameHelper: 'Uma caixa, um fichário, uma divisória.',
  errEmpty: 'Dê um nome à coleção.',
  errLong: 'Use no máximo 40 caracteres.',
  errTaken: 'Já existe uma coleção com esse nome aqui.',
  /** The picker's label is "Cor · {Nome da cor}", with the color name muted. */
  colorWord: 'Cor',
  cancel: 'Cancelar',
  close: 'Fechar',

  verbs: {
    createCollection: 'Criar coleção',
    createSubcollection: 'Criar subcoleção',
    save: 'Salvar',
    createAndMove: 'Criar e mover cartas',
  },

  deleteTitle: (nome: string) => `Excluir ${nome}?`,
  /** "A subcoleção vai junto." for 1, "As {N} subcoleções vão junto." otherwise. */
  deleteSubsGo: (n: number) =>
    n === 1 ? 'A subcoleção vai junto.' : `As ${formatCount(n)} subcoleções vão junto.`,
  deleteWithCards: (n: number) => `Há ${formatCount(n)} cartas guardadas aqui — escolha o que fazer com elas.`,
  moveOption: 'Mover para a caixa temporária',
  moveOptionSub: (n: number) =>
    `As ${formatCount(n)} cartas ficam guardadas, com todos os dados, até você colocá-las em outra coleção.`,
  deleteOption: 'Excluir as cartas',
  deleteOptionSub: (n: number) => `As ${formatCount(n)} cartas saem do app. Não dá para desfazer.`,
  deleteNoCards: 'Não há cartas aqui.',
  nothingElse: 'Nada mais é afetado.',
  deleteVerbs: {
    deleteCollection: 'Excluir coleção',
    deleteSubcollection: 'Excluir subcoleção',
  },
  deleting: 'Excluindo…',

  toastLabel: 'Coleção',
  /** Singular: "{nome} foi excluída. 1 carta foi para a caixa temporária." */
  toastMoved: (nome: string, n: number) => {
    const countPart =
      n === 1
        ? '1 carta foi para a caixa temporária.'
        : `${formatCount(n)} cartas foram para a caixa temporária.`;
    return `${nome} foi excluída. ${countPart}`;
  },
  /** Singular: "{nome} e 1 carta foram excluídas." (keeps "foram"). */
  toastDeleted: (nome: string, n: number) => `${nome} e ${plural(n, 'carta', 'cartas')} foram excluídas.`,
  toastEmpty: (nome: string) => `${nome} foi excluída.`,
} as const;
