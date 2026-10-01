// Every Planechase UI string (spec 006, R17): the design handoff's copy verbatim, plus ui.md §3/§7.
// Card names, set names and the English fallback text come from the card data, never from here.
// `{0}`, `{N}` and `{CAOS}` are rendered as text: no Magic symbols (DESIGN.md).

import type { PlanechaseGame } from '@models/planechase-game.model';

/** A cost as the table reads it: `{0}`, `{1}`, … */
export const costText = (cost: number) => `{${cost}}`;

export const MODES = {
  title: 'Modos de jogo',
  planechase: 'Planechase',
  planechaseMeta: 'Um baralho de planos compartilhado pela mesa.',
  open: 'Abrir',
  resume: 'Continuar',
} as const;

export const PLANECHASE = {
  title: 'Planechase',
  idleEyebrow: 'Nenhuma partida',
  idleIntro: 'Planos mudam as regras da mesa. Um baralho só, compartilhado por todos — funciona sem internet.',
  start: 'Iniciar partida',
  rules: 'Como jogar',
  deck: 'Baralho',
  deckSummary: (n: number) => `Baralho: ${n} cartas ativas`,
  // review: not in the handoff (R17, approved 2026-09-27).
  refusedTooFew: (n: number) => `Seu baralho salvo tem ${n} cartas ativas; são necessárias pelo menos 10.`,
  refusedNoPlane: 'Seu baralho salvo não tem nenhum plano ativo.',
  adjustDeck: 'Ajustar baralho',

  // Console and dock.
  eyebrow: (cost: number) => `Dado planar · próxima rolagem ${costText(cost)}`,
  costShort: (cost: number) => `Próxima: ${costText(cost)}`,
  phenomenonEyebrow: 'Fenômeno',
  allUsedEyebrow: 'Planeswalk pendente',
  roll: 'Rolar dado planar',
  planeswalk: 'Planeswalk',
  chaos: 'Caos',
  resetCost: 'Zerar custo',
  undo: 'Desfazer',
  confirmPhenomenon: 'Concluir encontro',
  reshuffle: 'Reiniciar planos',
  end: 'Encerrar partida',
  cancel: 'Cancelar',

  confirmReset: {
    title: 'Reiniciar planos?',
    // review: the handoff's count is dropped (FR-012, R17, approved 2026-09-27).
    body: 'Os planos usados voltam ao baralho. O plano atual continua na mesa.',
    verb: 'Reiniciar planos',
  },
  confirmEnd: {
    title: 'Encerrar partida?',
    body: 'A partida some deste aparelho. Seu baralho continua salvo.',
    verb: 'Encerrar partida',
  },
} as const;

/** Result title and detail per result kind (ui.md §3); names are the cards' English names. */
export const RESULT = {
  start: (name: string) => ['Plano inicial', `${name} abre a partida. Role o dado na fase principal do seu turno.`],
  blank: ['Nada acontece', 'O plano continua o mesmo.'],
  chaos: ['Caos', 'Resolva a habilidade de caos destacada abaixo.'],
  // Not in the handoff — the Caos button for a physical die (approved 2026-09-27).
  chaosManual: ['Caos', 'Resolva a habilidade de caos destacada abaixo. O custo do dado não muda.'],
  // review: not in the handoff (R2, R17, approved 2026-09-27).
  chaosNone: ['Caos', 'Este plano não tem habilidade de caos.'],
  planeswalk: (from: string) => ['Planeswalk', `${from} foi para os usados.`],
  manual: (from: string) => ['Planeswalk', `${from} foi para os usados. O custo do dado não muda.`],
  cost: ['Custo zerado', `A próxima rolagem custa ${costText(0)}.`],
  phenomenon: ['Fenômeno encontrado', 'Resolva o efeito na mesa e conclua para seguir ao próximo plano.'],
  // Interplanar Tunnel: the app holds the planar deck, so it reveals the cards and the table picks.
  tunnel: ['Escolha o próximo plano', 'Escolha um dos planos revelados e conclua. Os outros vão para o fundo do baralho, em ordem aleatória.'],
  resolved: (from: string) => ['Encontro resolvido', `${from} foi para os usados.`],
  // review: not in the handoff (R17, approved 2026-09-27).
  reset: ['Planos reiniciados', 'Os planos usados voltaram ao baralho.'],
  resetWalk: (from: string) => ['Planos reiniciados', `Todos voltaram ao baralho e ${from} foi para os usados.`],
  allUsed: ['Todos os planos foram usados', 'Reiniciar devolve os planos usados ao baralho e conclui o planeswalk.'],
} as const;

/** What the console and the dock show for a game (ui.md §3). */
export interface PlanarDisplay {
  mode: 'normal' | 'phenomenon' | 'allUsed';
  eyebrow: string;
  costShort: string;
  title: string;
  detail: string;
}

/**
 * The console/dock lines for a game. `nameOf` gives a card's English name; `noChaos` is true when
 * the face-up plane has no chaos ability (R2); `tunnel` is true while Interplanar Tunnel waits for
 * the table to pick a revealed plane.
 */
export function planarDisplay(
  game: PlanechaseGame,
  nameOf: (id: string) => string,
  noChaos: boolean,
  tunnel = false,
): PlanarDisplay {
  const lines = (): readonly string[] => {
    const result = game.result;
    switch (result.kind) {
      case 'start':
        return RESULT.start(nameOf(game.current));
      case 'blank':
        return RESULT.blank;
      case 'chaos':
        return noChaos ? RESULT.chaosNone : result.manual ? RESULT.chaosManual : RESULT.chaos;
      case 'planeswalk':
        return RESULT.planeswalk(nameOf(result.from));
      case 'manual':
        return RESULT.manual(nameOf(result.from));
      case 'cost':
        return RESULT.cost;
      case 'phenomenon':
        return RESULT.phenomenon;
      case 'resolved':
        return RESULT.resolved(nameOf(result.from));
      case 'reset':
        return result.from ? RESULT.resetWalk(nameOf(result.from)) : RESULT.reset;
      case 'allUsed':
        return RESULT.allUsed;
    }
  };
  const encounter = tunnel ? RESULT.tunnel : RESULT.phenomenon;
  const [title, detail] = game.pending === 'phenomenon' ? encounter : lines();
  switch (game.pending) {
    case 'phenomenon':
      return { mode: 'phenomenon', eyebrow: PLANECHASE.phenomenonEyebrow, costShort: PLANECHASE.phenomenonEyebrow, title, detail };
    case 'reset':
      return { mode: 'allUsed', eyebrow: PLANECHASE.allUsedEyebrow, costShort: PLANECHASE.costShort(game.cost), title, detail };
    case null:
      return { mode: 'normal', eyebrow: PLANECHASE.eyebrow(game.cost), costShort: PLANECHASE.costShort(game.cost), title, detail };
  }
}

export const PLANAR_CARD = {
  chaos: 'Caos',
  encounter: 'Ao encontrar',
  imageMissing: 'Imagem indisponível sem conexão',
  plane: 'plano',
  phenomenon: 'fenômeno',
} as const;

/** Interplanar Tunnel's choice of the next plane. */
export const TUNNEL = {
  label: (n: number) => (n === 1 ? 'Plano revelado' : `${n} planos revelados`),
} as const;

export const DECK = {
  title: 'Baralho planar',
  back: 'Voltar',
  count: (n: number, total: number, phenomena: number) => `${n} de ${total} cartas · ${phenomena} fenômenos`,
  hintPointer:
    'Clique numa carta para ativar ou desativar. Pare o ponteiro sobre ela para ler o texto, ou use o botão direito para abri-la. Nada muda até você salvar.',
  hintTouch: 'Toque numa carta para ativar ou desativar. Toque e segure para ler o texto. Nada muda até você salvar.',
  tileKeys: 'Menu ou Shift+F10 abre a carta.',
  previewOn: 'Ativada no baralho',
  previewOff: 'Desativada no baralho',
  previewPosition: (i: number, n: number) => `${i} de ${n}`,
  previous: 'Anterior',
  previousLabel: 'Carta anterior',
  next: 'Próxima',
  nextLabel: 'Próxima carta',
  disable: 'Desativar carta',
  enable: 'Ativar carta',
  close: 'Fechar',
  notice:
    'Menos de 40 cartas ou mais de 2 fenômenos: a regra pede ao menos 10 × o número de jogadores e no máximo 2 fenômenos por jogador. Dá para salvar mesmo assim.',
  setHeader: (name: string, on: number, total: number) => `${name} · ${on} de ${total}`,
  enableAll: 'Ativar todos',
  disableAll: 'Desativar todos',
  cancel: 'Cancelar',
  save: 'Salvar',
  errorTooFew: (n: number) => `Ative pelo menos 10 cartas para salvar — agora são ${n}.`,
  errorNoPlane: 'Ative pelo menos um plano para salvar.',
  confirmTitle: 'Salvar reinicia a partida em andamento.',
  confirmBody: 'Um novo plano inicial é sorteado com o baralho novo.',
  keep: 'Manter partida',
  restart: 'Salvar e reiniciar',
} as const;

export const RULES = {
  title: 'Como jogar',
  backToGame: 'Voltar à partida',
  back: 'Voltar',
  intro: 'Planechase compartilhado: uma variante casual em que a mesa inteira usa um só baralho de planos.',
  toc: 'Nesta página',
} as const;

export interface RulesSection {
  id: string;
  title: string;
  paragraphs: string[];
}

/**
 * "Como jogar" (FR-016): the handoff's seven sections, checked against the spec's "Rules research"
 * (901.15 shared deck, 901.5 start, 901.6 controller, 901.9 cost, die faces, 701.31b, 312.5/312.7).
 */
export const RULES_SECTIONS: readonly RulesSection[] = [
  {
    id: 'o-que-e',
    title: 'O que é',
    paragraphs: [
      'Uma variante casual sobre uma partida normal de Magic, geralmente multiplayer. Um plano aberto na mesa adiciona regras que valem para todos. Fenômenos são eventos que acontecem uma vez.',
    ],
  },
  {
    id: 'baralho',
    title: 'Baralho compartilhado',
    paragraphs: [
      'A mesa usa um baralho planar só. Ele precisa de pelo menos 40 cartas, ou 10 × o número de jogadores, o que for menor. No máximo 2 × o número de jogadores podem ser fenômenos, e não pode haver dois cards com o mesmo nome. O controlador planar do momento é o dono de todos os cards dele.',
    ],
  },
  {
    id: 'inicio',
    title: 'Início',
    paragraphs: [
      'Depois dos mulligans, o primeiro jogador revela o card do topo. Se for um fenômeno, ele vai para o fundo e a revelação se repete até aparecer um plano — nada dispara enquanto isso. Esse é o plano inicial.',
    ],
  },
  {
    id: 'controlador',
    title: 'Controlador planar',
    paragraphs: ['Normalmente, o jogador ativo controla o plano aberto e as habilidades dele.'],
  },
  {
    id: 'dado',
    title: 'Dado planar',
    paragraphs: [
      'Na fase principal do seu turno, com prioridade e a pilha vazia, você pode rolar o dado planar. A primeira rolagem do turno custa {0}; cada uma depois custa {1} a mais que a anterior. O dado tem uma face de planeswalk, uma de caos e quatro em branco. O app não controla o momento — a mesa é responsável.',
    ],
  },
  {
    id: 'planeswalk',
    title: 'Planeswalk',
    paragraphs: [
      'O card aberto vai para o fundo do baralho e o próximo é revelado. Efeitos que duram “até um jogador fazer planeswalk” terminam.',
      // Approved by the maintainer on 2026-09-27 (ui.md §2).
      'O botão Planeswalk troca de plano sem rolar o dado. Use quando uma carta mandar fazer planeswalk ou quando a mesa usar um dado físico. Se uma carta mudar o que o dado faz, vale o texto da carta.',
      // Added with the Caos button; approved by the maintainer on 2026-09-27.
      'Com um dado físico, o botão Caos marca o resultado de caos: a habilidade do plano acende e o custo do dado não muda.',
    ],
  },
  {
    id: 'caos',
    title: 'Caos e fenômenos',
    paragraphs: [
      'Com caos, a habilidade de caos do plano atual dispara. Ao revelar um fenômeno, o efeito “ao encontrar” acontece; depois de resolvido, o controlador planar faz planeswalk de novo.',
    ],
  },
];
