# UI Design: Profile Modal

**Feature**: `005-profile-modal` | **Source of visuals**: `design_handoff_profile_modal/` (final path
only: `ph.hub`, `ph.local`, `ph.cloud` and the action steps). `DESIGN.md` is updated first
(research R20).

## 1. Surfaces

| Surface | New or modified | Component |
|---|---|---|
| Profile modal: hub, "Perfil neste aparelho", "Conta na nuvem", action steps, done screens | **New** | `ProfileModal` (inside `ThemedModal`) |
| Entry modal | Modified: the link/reauth/unlink flows are removed, and `recover-form` becomes "Redefinir senha do perfil" | `EntryModal`, `EntryFlowStore` |
| Identity wheel | Modified: v2 visuals and motion | `IdentityWheel` |
| Toast | **New** | `ToastOutlet` (in `App`, `ThemedModal` and `NavDrawer`) |
| Home: empty-device state | Modified | `Home` |
| Profile control, sync area, drawer | Modified: they open the profile modal | `TopBar`, `NavDrawer`, `SyncStatusService` |
| Action rows, sync plate | **New** DS primitives | `ActionRow`, `SyncPlate` |

## 2. Layout per surface

### Profile modal frame (reuses the entry modal's frame)

**Desktop** (≥ 640px):
- An 880px face with the identity pane (400px) and the form pane.
- The identity pane holds the wheel (300px, `picker`) and the caption (§7), with two lines reserved.
- The form pane has the ✕ row, the scrolling body and the pinned bottom prompt. The prompt appears on
  the hub, `in`, `up` and the reset steps only.
- The face height follows the content, with a 460px minimum (`fluid-face`).

**Mobile** (< 640px):
- Full-bleed. The header row holds the wordmark, the identity chip ("name · tribe") and ✕.
- There is no identity pane. On `hub` and `local`, a 240px `picker` wheel is centered at the top of
  the body. Other screens show no wheel.
- Button rows stack in `column-reverse` at full width.

### Hub (`hub`)

```
Title: {nome}                         (no subtitle)
[Sync plate]  status line (mark + label) / meta (e-mail or local text)   [button]
[Action row]  MiniWheel · Perfil neste aparelho / Cores, nome e senha      ABRIR
[Action row]  (36px spacer) · Conta na nuvem / {cloud meta}                ABRIR
────────────── prompt: Não é você? Trocar de perfil
```

The sync plate is a row on desktop and a column on mobile, where its button is full width.

### Perfil neste aparelho (`local`)

```
Title / subtitle (linked|expired vs local)
(mobile: picker wheel 240px)
TextField "Nome do perfil" (helper; autocomplete=username)
[Action row]  Senha do perfil / Desbloqueia o perfil neste aparelho        MUDAR
[Action row, danger]  Excluir perfil / Apaga {nome} e os dados dele deste aparelho   EXCLUIR
[ghost Voltar]  [primary Salvar]
```

### Conta na nuvem (`cloud`)

**Linked**:

```
Title / subtitle
Plate: VINCULADO À NUVEM / {email}
[Action row] Senha da conta / Usada para entrar na conta em outros aparelhos   MUDAR
[Action row] Desvincular conta / Os dados continuam aqui e na nuvem             DESVINCULAR
(separate list)
[Action row, danger] Excluir conta na nuvem / Apaga {email} e os dados na nuvem  EXCLUIR
[ghost Voltar]
```

**Expired**:
- A plate with "SESSÃO EXPIRADA" (in danger), the e-mail and an xs muted note.
- A primary block button "Entrar de novo".
- An action row "Desvincular conta".
- Ghost "Voltar".

**Local**:
- A plate with "SÓ NESTE APARELHO" and a muted note.
- A secondary block button "Vincular conta na nuvem".
- Ghost "Voltar".

### Action steps

Each step has a title, a subtitle, its fields or plates, a form error (`role="alert"`) and a button
row with ghost "Cancelar" and the verb.

| Step | Body |
|---|---|
| `pw` | Senha atual do perfil · Nova senha do perfil (helper) · Confirmar nova senha |
| `cloudpw` | e-mail plate · Senha atual da conta · Nova senha da conta |
| `in`, `up`, `reauth` | `CloudForm` (the entry modal's form, via `CloudFlowHost`) |
| `reset-email`, `reset-code` | `ResetForm`, plus the resend row |
| `unlink` | no fields. The danger verb |
| `delprofile` | a "Sai deste aparelho" plate listing the items · a cloud note if linked · the unsynced block (§3) · Senha do perfil · the danger verb |
| `delcloud` | a "Sai da nuvem para sempre" plate · a note that other devices stop syncing and the profile stays here · Senha da conta · the danger verb |

**Done screen**: title, one sentence and a primary block "Concluir".

### Entry modal: "Redefinir senha do perfil" (`recover-form`)

- Title and subtitle (§7).
- The account e-mail plate.
- "Senha da conta", with the link "Esqueci a senha da conta".
- A button row with ghost "Cancelar" (→ unlock) and primary "Continuar".
- The desktop caption "Redefinir a senha não apaga nada."
- The wheel shows the selected profile.

### Toast

**Desktop**: fixed at the top right (below the 44px bar + `space-4`), 380px maximum.

**Mobile**: `space-3` from the top, left and right.

**Content**:
- an 8px accent dot
- a column with the micro label and the text
- a 44px ✕

### Home: empty device

Centered in `<main>`, 360px maximum, `space-4` gap:
- the eyebrow "Nenhum perfil neste aparelho"
- a small muted line
- primary "Criar perfil"

## 3. States

| Where | State | What's shown | Req. |
|---|---|---|---|
| Sync plate | linked, idle/done/last/never | mark + the `syncDisplay` label, the e-mail, secondary "Sincronizar agora" | FR-003a |
| Sync plate | syncing | spinner + "Sincronizando…", no button | FR-003a |
| Sync plate | offline / error after a hub sync | danger mark and label, the e-mail, "Tentar de novo" | FR-003a, spec 004 |
| Sync plate | local | hollow ring, "Sem conta na nuvem", the meta line, "Vincular conta na nuvem" | FR-003a |
| Sync plate | expired | danger mark, label and border, the e-mail, **primary** "Entrar de novo" | FR-003a |
| Hub | syncing | "Trocar de perfil" disabled | Edge Cases, R17 |
| `local` | clean name | "Salvar" disabled (color taps don't enable it) | FR-009a |
| `local` | name changed | "Salvar" enabled. On save: "Salvando…", then a toast, and the screen stays | FR-009a |
| `local` | invalid name | the field error replaces the helper | FR-009 |
| `local` | syncing | the "Excluir perfil" row disabled | R17 |
| Any wheel | 1 pick / 3 picks | the last pick can't be removed / the others are locked (tiny ring, `aria-disabled`) | FR-008 |
| Any step | request running | the busy label, the verb and the fields locked | FR-020 |
| `pw` | wrong current / mismatch / short | the field error on that field | FR-010 |
| `cloudpw`, `delcloud` | wrong password / offline | the form error (generic / offline) | FR-016a, FR-019a |
| `cloudpw`, `delcloud`, `unlink` | account gone (on open or submit) | back to the hub + the toast | FR-019b |
| `reauth` | wrong password | the form error `wrongCloud` + the hint line (`goneHint`) | FR-019c |
| `delprofile` | linked with unsynced changes | a danger-bordered plate with the warning and secondary "Sincronizar agora" | FR-018a |
| `delprofile` | block syncing | a spinner line, "Sincronizando…". The delete verb is locked | FR-018a |
| `delprofile` | block done | "Sincronizado agora — nada se perde na nuvem." | FR-018a |
| `delprofile` | block failed | a danger line ("Sem conexão" / "Sessão expirada" / "Falha ao sincronizar") + "Tentar de novo" | FR-018a |
| `cloud` | expired | no "Senha da conta" and no "Excluir conta na nuvem" | FR-004, FR-019 |
| `cloud` | local | only the link block | FR-004 |
| Toast | shown | above whatever is open. It closes by itself after 5 s or on ✕. A new toast replaces it | FR-022 |
| Home | no profiles | the empty-device state | FR-018b |

## 4. Interaction flow

```
Profile control (profile active) ──► Profile modal @ hub
Profile control (no profile)     ──► Entry modal (unchanged)
Sync area: link / reauth         ──► Profile modal @ in / reauth   (origin = hub)
Drawer: profile / sync action    ──► close drawer ──► same as above

hub ──► local ──► pw ────────────────► done ─Concluir─► local
    │         └─► delprofile ──► (others remain) close ─► Entry modal @ list
    │                        └─► (last profile) close ─► navigate "/" (empty state)
    ├─► cloud ──► cloudpw / unlink / delcloud ─► done ─Concluir─► cloud
    │         └─► in ⇄ up, in/reauth ─► reset-email ─► reset-code ─► done ─► cloud
    ├─► plate: Vincular / Entrar de novo ─► in / reauth ─► done ─► hub
    └─► Trocar de perfil ─► close ─► Entry modal @ list

Cancelar ─► origin · Voltar (sub-screens) ─► hub · ✕/Esc/backdrop ─► close + reset
Entry modal "Perfil criado" ─► Vincular conta na nuvem ─► close ─► Profile modal @ up (origin hub)
Entry modal unlock (linked) ─► Esqueci minha senha ─► Redefinir senha do perfil ─► recover-newpw
```

No flow starts a sync except "Sincronizar agora" / "Tentar de novo" (FR-016).

## 5. Design-system reuse

**Reused**:
- `ThemedModal`, with `[roles]` from `IdentityService.roles()`, so the modal retints live
- `IdentityWheel` (`picker`)
- `IdentityChip`, `MiniWheel`, `TextField`, `SyncMark`, `SparkField`
- `.btn--primary/--secondary/--ghost/--danger/--block`, `.plate`, `.eyebrow`, `.micro-label`,
  `.link-btn`, `.field*`
- `CloudForm` and `ResetForm`, through `CloudFlowHost`
- the entry modal's done-panel styling
- `syncDisplay()` for the plate's labels

**New**, each justified and added to `DESIGN.md` first:

| Primitive | Why it's new |
|---|---|
| `ActionRow` | The handoff's `.grm-row` has a trailing verb and a danger variant. `ProfileRow` is a profile picker with badges and hover-preview semantics, so it doesn't fit |
| `SyncPlate` | The expanded sync area. The shell's `SyncStatus` is a text button or a line |
| `ToastOutlet` | There is no existing notice component. Inline plates would shift the layout (FR-022) |
| Danger plate | A modifier on `.plate` |
| Empty-device pattern | |

`fluid-face.ts` is shared behavior, not a visual.

## 6. Accessibility

- **Modal basics**: `aria-labelledby` points at the current title, including done titles. Focus stays
  inside the native dialog, Esc closes it, and focus returns to the opener. From the drawer, the
  opener is Menu (spec 004).
- **Screen changes**: the first field or action row gets focus whenever the phase or done state
  changes (`fluid-face`).
- **Wheel swatches**: `<button aria-pressed>` named with the color. Locked swatches have
  `aria-disabled="true"`, and a tap on them does nothing. A color change is announced through the
  wheel center's tribe name, which has `aria-live="polite"` in the profile modal.
- **Action rows**: one button each, with the accessible name "{title}. {meta}.". Disabled rows use
  `disabled`, and while syncing they add the hint "Aguarde a sincronização terminar" to the
  description.
- **Password fields**:
  - `current-password` on the current and account fields
  - `new-password` on the new and confirm fields
  - the labels say "do perfil" vs. "da conta" (FR-016a)
  - the name field uses `autocomplete="username"`
- **Toast**: `role="status"` and `aria-live="polite"` on a persistent region. It never takes focus,
  and its ✕ is labelled "Fechar aviso". It doesn't pause on hover (the spec says 5 s).
- **Touch targets**: 44px minimum everywhere, including the row verbs, the toast ✕ and the prompt
  links on mobile.
- **Reduced motion**:
  - The ring, halo, sparks, the wheel's spin, breathing, motes and bursts all stop.
  - Height changes happen instantly.
  - The toast appears without its transition.

## 7. Copy (PT-BR, into `entry-copy.ts`)

`{nome}` is the active profile's name and `{email}` is the linked e-mail.

**Hub**
- Title: `{nome}`
- Caption: "Cada perfil tem sua coleção, seus decks e suas cores."
- Rows:
  - "Perfil neste aparelho" / "Cores, nome e senha"
  - "Conta na nuvem" / `{email}` · "Sessão expirada · {email}" · "Vincular para sincronizar entre aparelhos"
- Row verb: "Abrir"
- Prompt: "Não é você?" + "Trocar de perfil"
- Sync plate:
  - labels from `SYNC_AREA`
  - the local meta: "Sem conta na nuvem — funciona sem internet."
  - buttons: "Sincronizar agora" / "Vincular conta na nuvem" / "Entrar de novo" / "Tentar de novo"

**Perfil neste aparelho**
- Title: "Perfil neste aparelho"
- Subtitle:
  - linked/expired: "Cores e nome também seguem para a conta na nuvem na próxima sincronização."
  - local: "Tudo aqui funciona sem internet."
- Caption: "Toque nas cores da roda para mudar. A primeira tinge o app inteiro."
- Rows:
  - "Senha do perfil" / "Desbloqueia o perfil neste aparelho" · "Mudar"
  - "Excluir perfil" / "Apaga {nome} e os dados dele deste aparelho" · "Excluir"
- Buttons: "Voltar" · "Salvar" / "Salvando…"

**Conta na nuvem**
- Title: "Conta na nuvem"
- Caption: "Opcional — a conta na nuvem sincroniza este perfil entre aparelhos. O app funciona sem ela."
- Subtitle:
  - linked: "{nome} sincroniza com {email}."
  - expired: "A sessão expirou. {nome} continua funcionando neste aparelho."
  - local: "Opcional — vincule para sincronizar {nome} entre aparelhos."
- Plates:
  - "Vinculado à nuvem"
  - "Sessão expirada" + "O perfil continua funcionando neste aparelho. Entre de novo para voltar a sincronizar."
  - "Só neste aparelho" + "A conta na nuvem sincroniza {nome} entre aparelhos. O app funciona sem ela."
- Rows:
  - "Senha da conta" / "Usada para entrar na conta em outros aparelhos" · "Mudar"
  - "Desvincular conta" / "Os dados continuam aqui e na nuvem" · "Desvincular"
  - "Excluir conta na nuvem" / "Apaga {email} e os dados na nuvem" · "Excluir"

**Steps** (title · subtitle · caption · verb/busy)

| Step | Title | Subtitle | Caption | Verb / busy |
|---|---|---|---|---|
| `pw` | "Mudar senha do perfil" | linked: "Vale só para desbloquear {nome} neste aparelho. A senha da conta na nuvem não muda." · local: "A nova senha passa a desbloquear {nome} neste aparelho." | "Mudar a senha não apaga nada." | "Salvar senha" / "Salvando…" |
| `cloudpw` | "Mudar senha da conta" | "A senha do perfil neste aparelho não muda. Os outros aparelhos vinculados vão pedir a nova senha." | the optional caption | "Salvar senha da conta" / "Salvando…" |
| `in`, `up`, `reset-email`, `reset-code`, `reauth`, `unlink` | as spec 003's link-context copy (`TITLE`/`SUBTITLE`/`CAPTION` entries), moved to `PROFILE` | | | |
| `delprofile` | "Excluir perfil" | "{nome} e tudo o que é dele saem deste aparelho. Não dá para desfazer." | "Os outros perfis deste aparelho não mudam." | "Excluir perfil" / "Excluindo…" |
| `delcloud` | "Excluir conta na nuvem" | "A conta {email} e todos os dados dela na nuvem serão apagados para sempre. Não dá para desfazer." | "Excluir a conta não apaga nada deste aparelho." | "Excluir conta" / "Excluindo…" |

**Fields**
- "Senha atual do perfil"
- "Nova senha do perfil" (helper "Pelo menos 8 caracteres. Funciona sem internet.")
- "Confirmar nova senha"
- "Senha atual da conta"
- "Nova senha da conta"
- "Senha do perfil"
- "Senha da conta"

**Plates and notes**

`delprofile`:
- "Sai deste aparelho:" Cartas · Locais de armazenamento · Decks · Cores · O perfil {nome}
- Linked note: the cloud account and its data are not deleted. The exact handoff string goes in
  during implementation, from `ProfileModalApp.dc.html` `ph.delprofile`.
- Unsynced block: "Há mudanças que ainda não foram sincronizadas. Se excluir agora, elas se perdem."
  and "Sincronizar agora"
- Sync line: "Sincronizando…" / "Sincronizado agora — nada se perde na nuvem." / the failure label +
  "Tentar de novo"

`delcloud`: "Sai da nuvem para sempre:" and its notes, also taken verbatim from the handoff's
`ph.delcloud`.

**Done screens**

| Title | Body |
|---|---|
| "Senha alterada" | "A nova senha já desbloqueia {nome} neste aparelho." + (linked) " A senha da conta na nuvem continua a mesma." |
| "Senha da conta alterada" | "Este aparelho continua conectado. Os outros aparelhos vinculados a {email} vão pedir para entrar de novo com a nova senha." |
| "Conta vinculada" | "{nome} agora sincroniza com {email}." (+ the colors-replaced sentence from spec 003) |
| "Conta criada" | "{nome} agora sincroniza com {email}. Suas cores foram salvas na conta." |
| "Sincronização retomada" | "A conta voltou a sincronizar {nome}." |
| "Conta desvinculada" | "{nome} continua neste aparelho com todos os dados e parou de sincronizar." |
| "Conta excluída" | "A conta {email} e os dados dela na nuvem foram apagados. {nome} continua neste aparelho com todos os dados, agora só neste aparelho." |

**Toasts**
- "Perfil" / "Alterações salvas."
- "Conta na nuvem" / "A conta {email} não existe mais. {nome} continua neste aparelho com todos os dados."
- ✕ label: "Fechar aviso"

**Errors**
- Existing `MSG`: "Digite sua senha.", "Senha incorreta.", "Use pelo menos 8 caracteres.",
  "E-mail ou senha incorretos.", the offline message and the name rules
- New:
  - `pwMismatch`: "As senhas não são iguais."
  - `samePassword`: "A nova senha precisa ser diferente da atual." (**review**)
  - `goneHint`: "Se a conta não existe mais, Desvincular conta mantém {nome} e os dados neste
    aparelho." (**review**)

**Entry modal, "Redefinir senha do perfil"**
- Subtitle: "{nome} está vinculado à nuvem. Confirme a senha da conta para criar uma nova senha do
  perfil neste aparelho."
- Link: "Esqueci a senha da conta"
- Buttons: "Cancelar" · "Continuar" / "Confirmando…"
- Caption: "Redefinir a senha não apaga nada."

**Empty device**
- "Nenhum perfil neste aparelho"
- "Crie um perfil para começar — funciona sem internet, sem e-mail."
- "Criar perfil"

**Shell**: the profile control's hint and accessible-name tail change to "Gerenciar perfil"
(**review**, R16).
