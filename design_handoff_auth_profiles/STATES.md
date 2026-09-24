# State matrix — auth & profile modal

Every screen the modal can show. **Context** is where the modal was opened from:
- `gate` — the profile gate: no profile active, or a profile active and the person wants to switch or sign out.
- `device` — a device with no local profiles at all.
- `link` — an active profile opening the cloud-account flows.

**Phase** is the internal step. Copy is final PT-BR. `{P}` = profile name, `{email}` = typed e-mail.

Colors column: **profile** = the active or selected profile's identity; **picks** = live wheel picks; **cloud** = the account's saved identity; **default** = Vermelho → Azul → Verde.

## Local profile flows

| Phase | Context | Title / subtitle | Fields | Primary (busy label) | Bottom prompt | Colors | Spec |
|---|---|---|---|---|---|---|---|
| `list` (signed out) | gate | Escolha um perfil / Perfis neste aparelho. Toque em um e digite a senha. | — (profile rows + "+ Criar novo perfil") | — | Perfil em outro aparelho? **Entrar com conta na nuvem** → `in` | hovered or focused row, else default (wheel neutral) | FR-007, FR-008, FR-012 |
| `list` (active profile) | gate | Trocar de perfil / Você está usando {P}. Escolha outro perfil e digite a senha. | Rows; the active row comes first, marked "Em uso" and can't be picked; **Sair de {P}** (secondary) below the list | — | same as above | active profile, hover previews others | US2-1, US2-3, FR-029 |
| after sign-out | gate | list (signed out) + notice "Você saiu de {P}. Os dados desse perfil ficaram ocultos." | — | Sair de {P} → "Saindo…" (700 ms) | — | default | FR-008 |
| `unlock` | gate | {P} / "{Tribe} · Vinculado à nuvem" or "· Só neste aparelho" | Senha (`current-password`), "Esqueci minha senha" | Desbloquear (Desbloqueando…) | Não é você? **Trocar de perfil** → `list` | selected profile | US2-1/2 |
| `localreset-warn` | gate | Redefinir senha / {P} não tem conta na nuvem, então qualquer pessoa que use este aparelho pode redefinir a senha dele. Os dados continuam intactos. | — | **Entendi, redefinir** + Cancelar (ghost → `unlock`) | — | selected | US6-2, FR-025 |
| `localreset-newpw` | gate | Nova senha do perfil / Crie uma nova senha para {P}. | Nova senha do perfil (`new-password`, ≥8) | Salvar e desbloquear (Salvando…) | — | selected | FR-025 |
| `profile` | device / gate | Criar perfil / Seu perfil fica neste aparelho e funciona sem internet — sem e-mail. | Nome do perfil, Senha (≥8), **identity wheel picker** | Criar perfil (Criando perfil…) | device: Já tem conta na nuvem? **Entrar** → `in` · gate: Já tem um perfil aqui? **Ver perfis** → `list` | picks (live) | US1, FR-002/3/5, FR-026 |

## Cloud account flows (optional)

| Phase | Context | Title / subtitle | Fields | Primary (busy) | Bottom prompt | Colors | Spec |
|---|---|---|---|---|---|---|---|
| `in` | link | Entrar na conta / Vincule {P} a uma conta na nuvem para sincronizar entre aparelhos. | E-mail, Senha, "Esqueci minha senha" | Entrar (Entrando…) | Ainda não tem conta na nuvem? **Criar conta** → `up` | profile → **cloud** on success | US4-2/3, FR-014/17/20/26 |
| `in` | device / gate | Entrar na conta / Traga sua coleção da nuvem para este aparelho. | same | same → `setup` | device: Ainda não tem perfil? **Criar perfil** · gate: **Ver perfis** | default → cloud | US4-5, FR-018 |
| `up` | link | Criar conta na nuvem / {P} passa a sincronizar automaticamente entre aparelhos. | E-mail, Senha (≥8) | Criar conta (Criando conta…) | Já tem conta? **Entrar** | profile (saved to the account) | US4-1/4 |
| `reset-email` | any | Recuperar senha / Digite o e-mail da conta. Um código de 6 dígitos chega em alguns minutos. | E-mail | Enviar código (Enviando…) | Lembrou a senha? **Voltar** → the flow it came from | unchanged | US5, FR-022 |
| `reset-code` | any | Digite o código / Se houver uma conta para {email}, um código foi enviado. Confira também o spam. | Código (numeric, 6, `one-time-code`), Nova senha da conta (≥8) | Salvar e entrar (Salvando…) + "Enviar novo código" (30 s cooldown: "Reenviar em Ns") + "Usar outro e-mail" | Lembrou a senha? **Voltar** | unchanged | FR-023/24 |
| `setup` | device / gate | Configurar perfil / Esta conta ainda não tem perfil neste aparelho. Confirme o nome e crie uma senha local. | "Conta na nuvem" plate with {email}, Nome do perfil (pre-filled from the account label), Senha deste aparelho (≥8) | Criar perfil (Criando perfil…) | — | cloud | FR-018 |
| `reauth` | link | Entre de novo / A sessão da conta expirou. Entre para voltar a sincronizar {P} — as alterações pendentes serão enviadas. | Account plate, Senha, "Esqueci minha senha" | Entrar (Entrando…) | — | profile | FR-016 |
| `recover-form` | link / gate | Recuperar perfil / Entre na conta vinculada a {P} para criar uma nova senha local. | Account plate, Senha da conta, "Esqueci minha senha" | Continuar (Verificando…) | — | profile | US6-1 |
| `recover-newpw` | link / gate | Nova senha do perfil / Crie uma nova senha para {P} neste aparelho. Os dados continuam intactos. | Nova senha do perfil (≥8) | Salvar e desbloquear (Salvando…) | — | profile | FR-025 |
| `unlink` | link | Desvincular conta / {P} continua neste aparelho com todos os dados e para de sincronizar. A conta {email} e os dados dela na nuvem não são apagados. | — | **Desvincular** (danger, Desvinculando…) + Cancelar (ghost) | — | profile | US4-6, FR-019 |

## Success screens

All end with a **Concluir** primary button (closes and resets). "Sync line" = a spinner + label while syncing (~2.2 s in the prototype), then a dot + a done label.

| Kind | Title | Body | Extra |
|---|---|---|---|
| unlocked | Perfil desbloqueado — or **Perfil trocado** if switching | {P} está ativo neste aparelho. / {P} está ativo. Os dados de {previous} ficaram ocultos. | Sync line if the profile is linked |
| profiled | Perfil criado | {P} está ativo neste aparelho. Se quiser, vincule uma conta na nuvem para sincronizar — é opcional. | Secondary **Vincular conta na nuvem** → `up` for the new profile |
| linked | Conta vinculada | {P} agora sincroniza com {email}. [+ As cores da conta ({Tribe}) passaram a valer para este perfil.] | Sync line; the wheel ripples in the new colors |
| created | Conta criada | {P} agora sincroniza com {email}. Suas cores foram salvas na conta. | Sync line |
| setup | Perfil pronto | {P} foi criado neste aparelho e está ativo. | "Baixando sua coleção…" → "Coleção baixada" |
| reauthed | Sincronização retomada | A conta voltou a sincronizar {P}. | Sync line |
| recovered | Perfil desbloqueado | {P} está ativo com todos os dados intactos. | — |
| unlinked | Conta desvinculada | {P} continua neste aparelho com todos os dados e parou de sincronizar. | — |

## Errors

**Field errors** go under the field; **form errors** go above the primary button with `role="alert"`.

| Condition | Message | Where | Spec |
|---|---|---|---|
| E-mail empty / malformed | Digite seu e-mail. / Esse e-mail não parece válido. | field | FR-005 |
| Password empty | Digite sua senha. | field | FR-005 |
| New password < 8 | Use pelo menos 8 caracteres. | field | FR-004 |
| Username length / characters | Use de 3 a 20 caracteres. / Use só letras, números, _ . ou -. | field | FR-003 |
| Username taken on this device (case-insensitive) | Esse nome já está em uso neste aparelho. | field | FR-003 |
| Wrong local password | Senha incorreta. | field | US2-2 |
| Wrong cloud credentials (never reveals whether the account exists) | E-mail ou senha incorretos. | form | FR-020 |
| E-mail already registered | Esse e-mail já está em uso. + "É seu? **Recupere o acesso**" → `reset-email` | field + link | FR-020, edge case |
| Account linked to another profile on this device | Essa conta já está vinculada ao perfil {nome} neste aparelho. | form | edge case |
| Code malformed / wrong or expired | Digite os 6 dígitos do código. / Código incorreto ou expirado. Peça um novo código. | field | FR-024 |
| Offline (any cloud action) | Sem conexão. A conta na nuvem precisa de internet — o resto do app continua funcionando. | form | FR-021 |
| Unrecognized backend error | Algo deu errado. Tente de novo em instantes. | form; the form stays usable | FR-027 |

Local actions (create profile, unlock, local reset, setup, unlink, sign out) never need a connection.
