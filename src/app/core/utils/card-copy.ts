// Every Cards UI string (spec 015, ui.md §7): verbatim from the design handoff.
// `{…}` interpolations become functions; counts use pt-BR grouping with singular forms.

import type { CardCondition, CardFinish } from '@models/card.model';
import { formatCount, plural } from './collection-copy';

export const FINISH_NAMES: Record<CardFinish, string> = {
  nonfoil: 'Normal',
  foil: 'Foil',
  etched: 'Etched',
};

export const CONDITION_NAMES: Record<CardCondition, string> = {
  NM: 'NM — Praticamente nova',
  LP: 'LP — Pouco usada',
  MP: 'MP — Usada',
  HP: 'HP — Muito usada',
  DMG: 'DMG — Danificada',
};

/** The tile description a screen reader gets ("Lightning Bolt, LEA 161, Foil, Inglês, NM, 2 cópias, à venda"). */
export interface TileLabelInput {
  name: string;
  setCode: string;
  collectorNumber: string;
  finish: string;
  language: string;
  condition: string;
  quantity: number;
  forSale: boolean;
}

export const CARD = {
  // List and page
  add: 'Adicionar cartas',
  viewLabel: 'Exibição',
  viewImages: 'Só imagens',
  viewDetails: 'Com detalhes',
  /** The side summary as plain text: "128 cartas · 6 à venda". */
  summary: (n: number, s: number) => `${plural(n, 'carta', 'cartas')} · ${formatCount(s)} à venda`,
  cardWord: (n: number) => (n === 1 ? 'carta' : 'cartas'),
  saleWord: 'à venda',
  searchLabel: 'Buscar cartas',
  searchPlaceholder: 'Buscar cartas',
  searchFilters: 'Buscar e filtrar',
  filtersSoon: 'Filtros em breve.',
  forSale: 'À venda',
  quantity: (q: number) => `×${formatCount(q)}`,
  keepCards: 'Guardar cartas aqui',
  keepCardsCopy: 'Adicione as cartas que estão fisicamente nesta coleção.',
  divide: 'Dividir em subcoleções',
  divideCopy: 'Organize por gaveta, fichário ou pasta. Depois disso, as cartas ficam nas subcoleções.',
  eitherOr: 'Uma coleção guarda cartas ou subcoleções — nunca os dois.',
  lastLevelNote: 'Último nível: esta coleção só guarda cartas.',
  holdingCopy: 'Cartas sem lugar definido. Aqui só dá para ver — sem adicionar nem editar.',
  tileLabel: (c: TileLabelInput) =>
    `${c.name}, ${c.setCode} ${c.collectorNumber}, ${c.finish}, ${c.language}, ${c.condition}, ${plural(c.quantity, 'cópia', 'cópias')}${c.forSale ? ', à venda' : ''}`,
  tileEdit: (description: string) => `${description}. Editar.`,
  resultLabel: (name: string, typeLine: string) => `${name} — ${typeLine}`,

  // Search modal
  searchTitle: 'Adicionar cartas',
  nameLabel: 'Nome da carta',
  namePlaceholder: 'Ex.: sol ring',
  nameHelp: 'Mínimo de 3 caracteres.',
  idle: 'Busque uma carta pelo nome para escolher a impressão que você tem.',
  short: 'Digite pelo menos 3 caracteres para buscar.',
  loading: 'Buscando…',
  loadingMore: 'Carregando mais…',
  empty: (text: string) =>
    `Nenhuma carta encontrada para “${text}”. Confira a grafia — a busca usa o nome em inglês.`,
  offline: 'Sem conexão. O catálogo precisa de internet — o resto do app continua funcionando.',
  failed: 'Não foi possível acessar o catálogo agora. Tente de novo em instantes.',
  moreFailed: 'Não foi possível carregar mais cartas.',
  retry: 'Tentar de novo',
  found: (n: number, more: boolean) =>
    more ? 'Mais de 100 cartas encontradas — role para ver mais.' : `${plural(n, 'carta encontrada', 'cartas encontradas')}`,
  close: 'Fechar',

  // Card modal
  eyebrowAdd: 'Adicionar carta',
  eyebrowEdit: 'Editar carta',
  setFilter: 'Buscar set',
  setFilterPlaceholder: 'Nome ou código do set',
  printing: 'Impressão',
  printingOption: (setName: string, code: string, number: string) => `${setName} · ${code} · ${number}`,
  printingsLoading: 'Carregando impressões…',
  printingsFailed: 'Não foi possível carregar as impressões. Sem conexão, a impressão atual fica como está.',
  setNone: 'Nenhum set encontrado.',
  finish: 'Acabamento',
  language: 'Idioma',
  condition: 'Condição',
  quantityLabel: 'Quantidade',
  quantityError: 'Use um número inteiro de 1 a 9.999.',
  notes: 'Notas',
  notesPlaceholder: 'Opcional',
  cancel: 'Cancelar',
  saveAgain: 'Salvar e adicionar outra',
  save: 'Salvar',

  // Duplicate notice
  dupTitle: 'Você já tem esta carta',
  dupTitleMany: (n: number) => `Você já tem esta carta em ${formatCount(n)} lugares`,
  dupSub: (collection: string) => `Mesma impressão, acabamento, idioma e condição. Está em “${collection}”.`,
  dupSubMany: 'Mesma impressão, acabamento, idioma e condição.',
  dupSubEdit: (collection: string) =>
    `Com essa mudança, a carta fica igual a outra que você já tem em “${collection}”.`,
  dupSubEditMany: 'Com essa mudança, a carta fica igual a outras que você já tem.',
  where: 'Onde ela está',
  merge: 'Somar à quantidade existente',
  mergeSub: (n: number, q: number) =>
    `A linha existente passa de ${formatCount(n)} para ${formatCount(n + q)} cópias e fica onde está.`,
  mergeSubEdit: (n: number, q: number) =>
    `A quantidade desta carta é somada à outra linha (${formatCount(n)} → ${formatCount(n + q)} cópias), e esta linha deixa de existir.`,
  separate: 'Adicionar como linha separada',
  separateSub: (collection: string) => `Cria uma nova linha em “${collection}”.`,
  separateSubMany: (collection: string) => `Cria uma nova linha em “${collection}”, a coleção que você está usando.`,
  keep: 'Manter as duas linhas',
  continue: 'Continuar',

  // Moved notice
  movedTitle: 'Carta adicionada em outra coleção',
  movedCopy: (from: string, to: string) =>
    `Enquanto você adicionava, “${from}” ganhou subcoleções. A carta foi para “${to}”, a primeira em ordem alfabética.`,
  ok: 'Ok',

  // Toasts
  addedLabel: 'Carta adicionada',
  added: (name: string, qty: number, collection: string) => `${name} ×${formatCount(qty)} em “${collection}”.`,
  updatedLabel: 'Carta atualizada',
  updated: (name: string) => `${name} foi atualizada.`,
  nothingSavedLabel: 'Nada foi salvo',
  goneCollection: (name: string) => `A coleção “${name}” não existe mais. Você voltou para as coleções.`,
  goneCard: 'Esta carta não está mais nesta coleção.',
} as const;
