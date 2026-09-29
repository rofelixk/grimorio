// Every PT-BR string of the entry modal, the profile modal, toasts and the app shell (top bar, side
// nav, drawer, sync status, legal notice), from specs 003–005's ui.md §7 and DESIGN.md
// (Principle II, SC-006). Nothing user-visible in those surfaces is written anywhere else.

export const MSG = {
  emailEmpty: 'Digite seu e-mail.',
  emailBad: 'Esse e-mail não parece válido.',
  pwEmpty: 'Digite sua senha.',
  pwMin: 'Use pelo menos 8 caracteres.',
  userLen: 'Use de 3 a 16 caracteres.',
  userChars: 'Use só letras, números, _ . ou -.',
  userTaken: 'Esse nome já está em uso neste aparelho.',
  codeFmt: 'Digite os 6 dígitos do código.',
  codeWrong: 'Código incorreto ou expirado. Peça um novo código.',
  wrongLocal: 'Senha incorreta.',
  wrongCloud: 'E-mail ou senha incorretos.',
  emailInUse: 'Esse e-mail já está em uso.',
  linkedElsewhere: (nome: string) => `Essa conta já está vinculada ao perfil ${nome} neste aparelho.`,
  offline: 'Sem conexão. A conta na nuvem precisa de internet — o resto do app continua funcionando.',
  generic: 'Algo deu errado. Tente de novo em instantes.',
  pwMismatch: 'As senhas não são iguais.',
  // review: not in the handoff (spec 005 R8).
  samePassword: 'A nova senha precisa ser diferente da atual.',
  // review: not in the handoff (spec 005 R12).
  goneHint: (nome: string) => `Se a conta não existe mais, Desvincular conta mantém ${nome} e os dados neste aparelho.`,
} as const;

export const TITLE = {
  list: 'Escolha um perfil',
  listActive: 'Trocar de perfil',
  localresetWarn: 'Redefinir senha',
  localresetNewpw: 'Nova senha do perfil',
  profile: 'Criar perfil',
  in: 'Entrar na conta',
  resetEmail: 'Recuperar senha',
  resetCode: 'Digite o código',
  setup: 'Configurar perfil',
  recoverForm: 'Redefinir senha do perfil',
  recoverNewpw: 'Nova senha do perfil',
} as const;

export const SUBTITLE = {
  list: 'Perfis neste aparelho. Toque em um e digite a senha.',
  listActive: (p: string) => `Você está usando ${p}. Escolha outro perfil e digite a senha.`,
  unlock: (tribe: string, linked: boolean) => `${tribe} · ${linked ? LINK_STATE.linked : LINK_STATE.local}`,
  localresetWarn: (p: string) =>
    `${p} não tem conta na nuvem, então qualquer pessoa que use este aparelho pode redefinir a senha dele. Os dados continuam intactos.`,
  localresetNewpw: (p: string) => `Crie uma nova senha para ${p}.`,
  profile: 'Seu perfil fica neste aparelho e funciona sem internet — sem e-mail.',
  inDevice: 'Traga sua coleção da nuvem para este aparelho.',
  resetEmail: 'Digite o e-mail da conta. Um código de 6 dígitos chega em alguns minutos.',
  resetCode: (email: string) => `Se houver uma conta para ${email}, um código foi enviado. Confira também o spam.`,
  setup: 'Esta conta ainda não tem perfil neste aparelho. Confirme o nome e crie uma senha local.',
  recoverForm: (p: string) =>
    `${p} está vinculado à nuvem. Confirme a senha da conta para criar uma nova senha do perfil neste aparelho.`,
  recoverNewpw: (p: string) => `Crie uma nova senha para ${p} neste aparelho. Os dados continuam intactos.`,
} as const;

export const FIELD = {
  name: 'Nome do perfil',
  email: 'E-mail',
  emailPlaceholder: 'voce@exemplo.com',
  pw: 'Senha',
  pwLocalNew: 'Nova senha do perfil',
  pwAccount: 'Senha da conta',
  pwAccountNew: 'Nova senha da conta',
  pwDevice: 'Senha deste aparelho',
  code: 'Código',
  codePlaceholder: '000000',
} as const;

export const HELPER = {
  name: '3 a 16 caracteres: letras, números, _ . ou -',
  pwNew: 'Pelo menos 8 caracteres.',
  pwLocal: 'Pelo menos 8 caracteres. Funciona sem internet.',
  picker: 'Escolha até 3 cores. A primeira tinge o app inteiro — dá para mudar depois.',
} as const;

export const ACTION = {
  in: 'Entrar',
  inBusy: 'Entrando…',
  up: 'Criar conta',
  upBusy: 'Criando conta…',
  sendCode: 'Enviar código',
  sendCodeBusy: 'Enviando…',
  saveAndEnter: 'Salvar e entrar',
  saveBusy: 'Salvando…',
  createProfile: 'Criar perfil',
  createProfileBusy: 'Criando perfil…',
  unlock: 'Desbloquear',
  unlockBusy: 'Desbloqueando…',
  saveAndUnlock: 'Salvar e desbloquear',
  continue: 'Continuar',
  confirmBusy: 'Confirmando…',
  confirmReset: 'Entendi, redefinir',
  cancel: 'Cancelar',
  signOut: (p: string) => `Sair de ${p}`,
  signOutBusy: 'Saindo…',
  done: 'Concluir',
  linkCloud: 'Vincular conta na nuvem',
  forgot: 'Esqueci minha senha',
  forgotAccount: 'Esqueci a senha da conta',
  resendCode: 'Enviar novo código',
  resendIn: (n: number) => `Reenviar em ${n}s`,
  otherEmail: 'Usar outro e-mail',
  close: 'Fechar',
  createRow: 'Criar novo perfil',
} as const;

export const PROMPT = {
  haveProfileHere: { ask: 'Já tem um perfil aqui?', cta: 'Ver perfis' },
  otherDevice: { ask: 'Perfil em outro aparelho?', cta: 'Entrar com conta na nuvem' },
  notYou: { ask: 'Não é você?', cta: 'Trocar de perfil' },
  haveCloud: { ask: 'Já tem conta na nuvem?', cta: 'Entrar' },
  noProfile: { ask: 'Ainda não tem perfil?', cta: 'Criar perfil' },
  noCloud: { ask: 'Ainda não tem conta na nuvem?', cta: 'Criar conta' },
  haveAccount: { ask: 'Já tem conta?', cta: 'Entrar' },
  remembered: { ask: 'Lembrou a senha?', cta: 'Voltar' },
  emailInUse: { ask: 'É seu?', cta: 'Recupere o acesso' },
} as const;

export const DONE = {
  unlocked: { title: 'Perfil desbloqueado', body: (p: string) => `${p} está ativo neste aparelho.` },
  switched: {
    title: 'Perfil trocado',
    body: (p: string, previous: string) => `${p} está ativo. Os dados de ${previous} ficaram ocultos.`,
  },
  profiled: {
    title: 'Perfil criado',
    body: (p: string) =>
      `${p} está ativo neste aparelho. Se quiser, vincule uma conta na nuvem para sincronizar — é opcional.`,
  },
  setup: { title: 'Perfil pronto', body: (p: string) => `${p} foi criado neste aparelho e está ativo.` },
  recovered: { title: 'Perfil desbloqueado', body: (p: string) => `${p} está ativo com todos os dados intactos.` },
} as const;

export const LINK_STATE = {
  linked: 'Vinculado à nuvem',
  local: 'Só neste aparelho',
} as const;

export const MISC = {
  wordmark: 'Grimorio',
  inUse: 'Em uso',
  cloudAccount: 'Conta na nuvem',
  yourIdentity: 'Sua identidade',
  signedOutNotice: (p: string) => `Você saiu de ${p}. Os dados desse perfil ficaram ocultos.`,
} as const;

export const CAPTION = {
  profiles: 'Cada perfil tem sua coleção, seus decks e suas cores.',
  localReset: 'Redefinir a senha não apaga nada.',
  picker: HELPER.picker,
  colorsReplaced: 'As cores salvas na conta agora valem para este perfil.',
  cloudColors: 'Cores salvas na sua conta.',
  bringCollection: 'Traga sua coleção da nuvem para este aparelho.',
} as const;

// The profile modal (spec 005 ui.md §7).
export const PROFILE = {
  hub: {
    caption: 'Cada perfil tem sua coleção, seus decks e suas cores.',
    localRow: { title: 'Perfil neste aparelho', meta: 'Cores, nome e senha' },
    cloudRow: 'Conta na nuvem',
    cloudMetaExpired: (email: string) => `Sessão expirada · ${email}`,
    cloudMetaLocal: 'Vincular para sincronizar entre aparelhos',
    verb: 'Abrir',
    prompt: { ask: 'Não é você?', cta: 'Trocar de perfil' },
  },
  syncPlate: {
    localMeta: 'Sem conta na nuvem — funciona sem internet.',
  },
  local: {
    title: 'Perfil neste aparelho',
    subtitleLinked: 'Cores e nome também seguem para a conta na nuvem na próxima sincronização.',
    subtitleLocal: 'Tudo aqui funciona sem internet.',
    caption: 'Toque nas cores da roda para mudar. A primeira tinge o app inteiro.',
    pwRow: { title: 'Senha do perfil', meta: 'Desbloqueia o perfil neste aparelho', verb: 'Mudar' },
    deleteRow: {
      title: 'Excluir perfil',
      meta: (nome: string) => `Apaga ${nome} e os dados dele deste aparelho`,
      verb: 'Excluir',
    },
    save: 'Salvar',
    saveBusy: 'Salvando…',
  },
  cloud: {
    title: 'Conta na nuvem',
    caption: 'Opcional — a conta na nuvem sincroniza este perfil entre aparelhos. O app funciona sem ela.',
    subtitleLinked: (nome: string, email: string) => `${nome} sincroniza com ${email}.`,
    subtitleExpired: (nome: string) => `A sessão expirou. ${nome} continua funcionando neste aparelho.`,
    subtitleLocal: (nome: string) => `Opcional — vincule para sincronizar ${nome} entre aparelhos.`,
    plateLinked: 'Vinculado à nuvem',
    plateExpired: 'Sessão expirada',
    plateExpiredNote: 'O perfil continua funcionando neste aparelho. Entre de novo para voltar a sincronizar.',
    plateLocal: 'Só neste aparelho',
    plateLocalNote: (nome: string) => `A conta na nuvem sincroniza ${nome} entre aparelhos. O app funciona sem ela.`,
    pwRow: { title: 'Senha da conta', meta: 'Usada para entrar na conta em outros aparelhos', verb: 'Mudar' },
    unlinkRow: { title: 'Desvincular conta', meta: 'Os dados continuam aqui e na nuvem', verb: 'Desvincular' },
    deleteRow: {
      title: 'Excluir conta na nuvem',
      meta: (email: string) => `Apaga ${email} e os dados na nuvem`,
      verb: 'Excluir',
    },
    reauth: 'Entrar de novo',
  },
  back: 'Voltar',
  syncBusyHint: 'Aguarde a sincronização terminar',
  // Action steps (title · subtitle · caption · verb/busy). `in`/`up`/reset/`reauth`/`unlink` are
  // spec 003's link-context copy, moved here.
  steps: {
    pw: {
      title: 'Mudar senha do perfil',
      subtitleLinked: (nome: string) =>
        `Vale só para desbloquear ${nome} neste aparelho. A senha da conta na nuvem não muda.`,
      subtitleLocal: (nome: string) => `A nova senha passa a desbloquear ${nome} neste aparelho.`,
      caption: 'Mudar a senha não apaga nada.',
      verb: 'Salvar senha',
      busy: 'Salvando…',
    },
    cloudpw: {
      title: 'Mudar senha da conta',
      subtitle:
        'A senha do perfil neste aparelho não muda. Os outros aparelhos vinculados vão pedir a nova senha.',
      verb: 'Salvar senha da conta',
      busy: 'Salvando…',
    },
    in: {
      title: 'Entrar na conta',
      subtitle: (nome: string) => `Vincule ${nome} a uma conta na nuvem para sincronizar entre aparelhos.`,
    },
    up: {
      title: 'Criar conta na nuvem',
      subtitle: (nome: string) => `${nome} pode sincronizar entre aparelhos quando você quiser.`,
    },
    reauth: {
      title: 'Entre de novo',
      subtitle: (nome: string) => `A sessão da conta expirou. Entre para voltar a sincronizar ${nome}.`,
      caption: 'A sessão da conta expirou. O perfil continua funcionando neste aparelho.',
    },
    unlink: {
      title: 'Desvincular conta',
      subtitle: (nome: string, email: string) =>
        `${nome} continua neste aparelho com todos os dados e para de sincronizar. A conta ${email} e os dados dela na nuvem não são apagados.`,
      caption: 'Desvincular não apaga nada — nem aqui, nem na nuvem.',
      verb: 'Desvincular',
      busy: 'Desvinculando…',
    },
    delprofile: {
      title: 'Excluir perfil',
      subtitle: (nome: string) => `${nome} e tudo o que é dele saem deste aparelho. Não dá para desfazer.`,
      caption: 'Os outros perfis deste aparelho não mudam.',
      verb: 'Excluir perfil',
      busy: 'Excluindo…',
    },
    delcloud: {
      title: 'Excluir conta na nuvem',
      subtitle: (email: string) =>
        `A conta ${email} e todos os dados dela na nuvem serão apagados para sempre. Não dá para desfazer.`,
      caption: 'Excluir a conta não apaga nada deste aparelho.',
      verb: 'Excluir conta',
      busy: 'Excluindo…',
    },
  },
  field: {
    pwCurrent: 'Senha atual do perfil',
    pwNew: 'Nova senha do perfil',
    pwNewHelper: 'Pelo menos 8 caracteres. Funciona sem internet.',
    pwConfirm: 'Confirmar nova senha',
    cloudPwCurrent: 'Senha atual da conta',
    cloudPwNew: 'Nova senha da conta',
    cloudPwNewHelper: 'Pelo menos 8 caracteres.',
    pwProfile: 'Senha do perfil',
    pwAccount: 'Senha da conta',
  },
  delprofile: {
    plate: 'Sai deste aparelho',
    items: (nome: string) => `Cartas · Locais de armazenamento · Decks · Cores · O perfil ${nome}`,
    linkedNote: (email: string) =>
      `A conta ${email} e os dados dela na nuvem não são apagados. Dá para configurá-la de novo neste ou em outro aparelho.`,
    unsynced: 'Há mudanças que ainda não foram sincronizadas. Se excluir agora, elas se perdem.',
    syncNow: 'Sincronizar agora',
    retry: 'Tentar de novo',
    syncing: 'Sincronizando…',
    synced: 'Sincronizado agora — nada se perde na nuvem.',
  },
  delcloud: {
    plate: 'Sai da nuvem para sempre',
    items: 'Cartas · Locais de armazenamento · Decks · Cores e nome salvos na conta',
    note: (nome: string) =>
      `Os outros aparelhos vinculados param de sincronizar. ${nome} continua neste aparelho com todos os dados.`,
  },
  done: {
    linked: { title: 'Conta vinculada', body: (nome: string, email: string) => `${nome} agora sincroniza com ${email}.` },
    colorsReplaced: (tribe: string) => `As cores da conta (${tribe}) passaram a valer para este perfil.`,
    created: {
      title: 'Conta criada',
      body: (nome: string, email: string) => `${nome} agora sincroniza com ${email}. Suas cores foram salvas na conta.`,
    },
    reauthed: { title: 'Sincronização retomada', body: (nome: string) => `A conta voltou a sincronizar ${nome}.` },
    unlinked: {
      title: 'Conta desvinculada',
      body: (nome: string) => `${nome} continua neste aparelho com todos os dados e parou de sincronizar.`,
    },
    pwChanged: {
      title: 'Senha alterada',
      body: (nome: string, linked: boolean) =>
        `A nova senha já desbloqueia ${nome} neste aparelho.` +
        (linked ? ' A senha da conta na nuvem continua a mesma.' : ''),
    },
    cloudPwChanged: {
      title: 'Senha da conta alterada',
      body: (email: string) =>
        `Este aparelho continua conectado. Os outros aparelhos vinculados a ${email} vão pedir para entrar de novo com a nova senha.`,
    },
    cloudDeleted: {
      title: 'Conta excluída',
      body: (nome: string, email: string) =>
        `A conta ${email} e os dados dela na nuvem foram apagados. ${nome} continua neste aparelho com todos os dados, agora só neste aparelho.`,
    },
  },
  emptyDevice: {
    eyebrow: 'Nenhum perfil neste aparelho',
    line: 'Crie um perfil para começar — funciona sem internet, sem e-mail.',
    cta: 'Criar perfil',
  },
} as const;

// Toasts (FR-022).
export const TOAST = {
  saved: { label: 'Perfil', text: 'Alterações salvas.' },
  gone: (email: string, nome: string) => ({
    label: 'Conta na nuvem',
    text: `A conta ${email} não existe mais. ${nome} continua neste aparelho com todos os dados.`,
  }),
  close: 'Fechar aviso',
} as const;

// App shell (spec 004 ui.md §7).
export const SHELL = {
  menu: 'Menu',
  close: ACTION.close,
  navLabel: 'Navegação principal',
  collection: 'Coleção',
  decks: 'Decks',
  modes: 'Modos de jogo',
  pin: 'Fixar menu',
  unpin: 'Recolher menu',
  home: 'Grimorio — Início',
  signIn: ACTION.in,
  noProfile: 'Nenhum perfil ativo',
  // review: not in the handoff (spec 005 R16).
  profileBusy: 'Aguarde a sincronização terminar',
  notice: 'Aviso legal',
  profileLabel: (name: string, tribe: string, colors: string) =>
    `Perfil ${name} — ${tribe} · ${colors}. Gerenciar perfil.`,
} as const;

// The sync area, sync mark and drawer sync line (FR-007).
export const SYNC_AREA = {
  syncing: 'Sincronizando…',
  synced: 'Sincronizado',
  last: (rel: string) => `Sincronizado ${rel}`,
  never: 'Nunca sincronizado',
  local: 'Sem conta na nuvem',
  offline: 'Sem conexão',
  expired: 'Sessão expirada',
  error: 'Falha ao sincronizar',
  actSync: 'Sincronizar agora',
  actRetry: 'Tentar de novo',
  actReauth: 'Entrar de novo',
  actLink: ACTION.linkCloud,
  areaLabel: (label: string, action: string) => `${label}. ${action}.`,
} as const;

/** A run of notice text: plain, or a link opened in a new tab. */
export type NoticeRun = string | { text: string; href: string };

// The legal notice (FR-027), shared by the shell's LegalNotice and the About view (FR-029).
export const NOTICE: { wotc: readonly NoticeRun[]; scryfall: readonly NoticeRun[]; ai: string } = {
  wotc: [
    'Grimorio é Fan Content não-oficial, permitido segundo a ',
    { text: 'Fan Content Policy', href: 'https://company.wizards.com/en/legal/fancontentpolicy' },
    ' da Wizards of the Coast. Não é aprovado nem endossado pela Wizards. Partes dos materiais usados são ' +
      'propriedade da Wizards of the Coast. ©Wizards of the Coast LLC.',
  ],
  scryfall: [
    'Os dados e imagens de cartas exibidos no Grimorio são fornecidos por ',
    { text: 'Scryfall', href: 'https://scryfall.com' },
    '.',
  ],
  ai: 'Parte do desenvolvimento deste app contou com ferramentas de inteligência artificial.',
};
