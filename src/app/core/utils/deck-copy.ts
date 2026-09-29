// Every Decks UI string (spec 009, ui.md §7). `{…}` interpolations become functions; counts use
// pt-BR grouping with singular forms ("1 carta") where the copy calls for them.

import type { DeckFormatId } from '@models/deck.model';
import { formatCount } from './collection-copy';

const BASE_60 = ['Mínimo de 60 cartas.', 'Sideboard de até 15 cartas.', 'Até 4 cópias de cada carta, exceto terrenos básicos.'];

export const DECK = {
  title: 'Decks',
  newDeck: 'Novo deck',
  createRow: 'Novo deck',

  emptyEyebrow: 'Nenhum deck ainda',
  emptyTitle: 'Sleevados e prontos pra jogar',
  emptyBody:
    'Um deck é um lugar físico, como uma coleção, pronto para jogar. Crie um para cada deck que você tem.',
  emptyCta: 'Criar deck',

  featuredLabel: 'Carta em destaque',
  featuredHint: 'Chega com as cartas do deck.',
  tileLabel: (nome: string, formato: string) => `${nome}, ${formato}`,

  back: 'Voltar para decks',
  edit: 'Editar',
  delete: 'Excluir',

  formTitles: { create: 'Novo deck', edit: 'Editar deck' },
  nameLabel: 'Nome',
  nameHelper: 'Como você reconhece o deck.',
  errEmpty: 'Dê um nome ao deck.',
  errLong: 'Use no máximo 40 caracteres.',
  errTaken: 'Já existe um deck com esse nome.',
  formatLabel: (nome: string) => `Formato · ${nome}`,
  verbs: { cancel: 'Cancelar', create: 'Criar deck', save: 'Salvar' },

  deleteTitle: (nome: string) => `Excluir ${nome}?`,
  /** Singular: "A carta deste deck vai para a caixa temporária, …" */
  deleteWithCards: (n: number) =>
    n === 1
      ? 'A carta deste deck vai para a caixa temporária, com todos os dados, até você guardá-la em outro lugar. Nada mais é afetado.'
      : `As ${formatCount(n)} cartas deste deck vão para a caixa temporária, com todos os dados, até você guardá-las em outro lugar. Nada mais é afetado.`,
  deleteNoCards: 'Não há cartas aqui. Nada mais é afetado.',
  deleteVerb: 'Excluir deck',
  deleting: 'Excluindo…',

  toastLabel: 'Deck',
  toastDeleted: (nome: string) => `${nome} foi excluído.`,
  /** Singular: "{nome} foi excluído. 1 carta foi para a caixa temporária." */
  toastMoved: (nome: string, n: number) => {
    const countPart =
      n === 1
        ? '1 carta foi para a caixa temporária.'
        : `${formatCount(n)} cartas foram para a caixa temporária.`;
    return `${nome} foi excluído. ${countPart}`;
  },

  /** Names as players say them in Brazil; rules one bullet per sentence (FR-016). */
  formats: {
    commander: {
      name: 'Commander',
      rules: [
        'Exatamente 100 cartas, contando o comandante.',
        'Uma cópia de cada carta, exceto terrenos básicos.',
        'O comandante é uma criatura lendária.',
        'Todas as cartas na identidade de cor do comandante.',
        'Sem sideboard.',
      ],
    },
    pauper: { name: 'Pauper', rules: [...BASE_60, 'Só cartas impressas como comuns.'] },
    modern: { name: 'Modern', rules: [...BASE_60, 'Cartas de coleções a partir da Oitava Edição.'] },
    standard: { name: 'Standard', rules: [...BASE_60, 'Só cartas das coleções mais recentes, que rodam com o tempo.'] },
    pioneer: { name: 'Pioneer', rules: [...BASE_60, 'Cartas de coleções a partir de Retorno a Ravnica.'] },
    legacy: { name: 'Legacy', rules: [...BASE_60, 'Cartas de todas as coleções, com lista de banidas própria.'] },
    vintage: {
      name: 'Vintage',
      rules: [...BASE_60, 'Cartas de todas as coleções.', 'Cartas da lista de restritas: só 1 cópia.'],
    },
    casual: { name: 'Casual', rules: ['Sem regras fixas: o deck segue o que o seu grupo de jogo combinar.'] },
  } satisfies Record<DeckFormatId, { name: string; rules: readonly string[] }>,
} as const;
