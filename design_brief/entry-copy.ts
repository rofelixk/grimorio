// Every PT-BR string of the entry modal and the top bar, verbatim from
// design_handoff_auth_profiles/STATES.md and DESIGN.md (Principle II, SC-006). Wheel captions
// follow the prototype's `leftCaption` rules; the top-bar placeholder strings are spec 003's
// ui.md §7 (FR-029). Nothing user-visible in those surfaces is written anywhere else.

export const MSG = {
  emailEmpty: 'Digite seu e-mail.',
  emailBad: 'Esse e-mail não parece válido.',
  pwEmpty: 'Digite sua senha.',
  pwMin: 'Use pelo menos 8 caracteres.',
  userLen: 'Use de 3 a 20 caracteres.',
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
} as const;

export const TITLE = {
  list: 'Escolha um perfil',
  listActive: 'Trocar de perfil',
  localresetWarn: 'Redefinir senha',
  localresetNewpw: 'Nova senha do perfil',
  profile: 'Criar perfil',
  in: 'Entrar na conta',
  up: 'Criar conta na nuvem',
  resetEmail: 'Recuperar senha',
  resetCode: 'Digite o código',
  setup: 'Configurar perfil',
  reauth: 'Entre de novo',
  recoverForm: 'Recuperar perfil',
  recoverNewpw: 'Nova senha do perfil',
  unlink: 'Desvincular conta',
} as const;

export const SUBTITLE = {
  list: 'Perfis neste aparelho. Toque em um e digite a senha.',
  listActive: (p: string) => `Você está usando ${p}. Escolha outro perfil e digite a senha.`,
  unlock: (tribe: string, linked: boolean) => `${tribe} · ${linked ? LINK_STATE.linked : LINK_STATE.local}`,
  localresetWarn: (p: string) =>
    `${p} não tem conta na nuvem, então qualquer pessoa que use este aparelho pode redefinir a senha dele. Os dados continuam intactos.`,
  localresetNewpw: (p: string) => `Crie uma nova senha para ${p}.`,
  profile: 'Seu perfil fica neste aparelho e funciona sem internet — sem e-mail.',
  inLink: (p: string) => `Vincule ${p} a uma conta na nuvem para sincronizar entre aparelhos.`,
  inDevice: 'Traga sua coleção da nuvem para este aparelho.',
  up: (p: string) => `${p} passa a sincronizar automaticamente entre aparelhos.`,
  resetEmail: 'Digite o e-mail da conta. Um código de 6 dígitos chega em alguns minutos.',
  resetCode: (email: string) => `Se houver uma conta para ${email}, um código foi enviado. Confira também o spam.`,
  setup: 'Esta conta ainda não tem perfil neste aparelho. Confirme o nome e crie uma senha local.',
  reauth: (p: string) =>
    `A sessão da conta expirou. Entre para voltar a sincronizar ${p} — as alterações pendentes serão enviadas.`,
  recoverForm: (p: string) => `Entre na conta vinculada a ${p} para criar uma nova senha local.`,
  recoverNewpw: (p: string) => `Crie uma nova senha para ${p} neste aparelho. Os dados continuam intactos.`,
  unlink: (p: string, email: string) =>
    `${p} continua neste aparelho com todos os dados e para de sincronizar. A conta ${email} e os dados dela na nuvem não são apagados.`,
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
  name: '3 a 20 caracteres: letras, números, _ . ou -',
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
  verifyBusy: 'Verificando…',
  unlink: 'Desvincular',
  unlinkBusy: 'Desvinculando…',
  confirmReset: 'Entendi, redefinir',
  cancel: 'Cancelar',
  signOut: (p: string) => `Sair de ${p}`,
  signOutBusy: 'Saindo…',
  done: 'Concluir',
  linkCloud: 'Vincular conta na nuvem',
  forgot: 'Esqueci minha senha',
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
  linked: { title: 'Conta vinculada', body: (p: string, email: string) => `${p} agora sincroniza com ${email}.` },
  colorsReplaced: (tribe: string) => `As cores da conta (${tribe}) passaram a valer para este perfil.`,
  created: {
    title: 'Conta criada',
    body: (p: string, email: string) => `${p} agora sincroniza com ${email}. Suas cores foram salvas na conta.`,
  },
  setup: { title: 'Perfil pronto', body: (p: string) => `${p} foi criado neste aparelho e está ativo.` },
  reauthed: { title: 'Sincronização retomada', body: (p: string) => `A conta voltou a sincronizar ${p}.` },
  recovered: { title: 'Perfil desbloqueado', body: (p: string) => `${p} está ativo com todos os dados intactos.` },
  unlinked: {
    title: 'Conta desvinculada',
    body: (p: string) => `${p} continua neste aparelho com todos os dados e parou de sincronizar.`,
  },
} as const;

export const SYNC = {
  syncing: 'Sincronizando…',
  synced: 'Sincronizado agora',
  downloading: 'Baixando sua coleção…',
  downloaded: 'Coleção baixada',
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
  reauth: 'A sessão da conta expirou. O perfil continua funcionando neste aparelho.',
  recover: 'Use a conta vinculada para criar uma nova senha local.',
  unlink: 'Desvincular não apaga nada — nem aqui, nem na nuvem.',
  optional: 'Opcional — a conta na nuvem sincroniza este perfil entre aparelhos. O app funciona sem ela.',
} as const;

// Temporary top-bar button and menu (FR-029) — not in STATES.md; see ui.md §7.
export const TOP_BAR = {
  noProfile: 'Nenhum perfil ativo',
  profileLabel: (p: string, linked: boolean) => `${p} · ${linked ? LINK_STATE.linked : LINK_STATE.local}`,
  switchProfile: 'Trocar perfil',
  cloudAccount: 'Conta na nuvem',
  syncNow: 'Sincronizar agora',
} as const;
