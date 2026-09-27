# Handoff: Profile modal (spec 005)

## Overview
Grimorio (`rofelixk/grimorio`, Angular, PT-BR only) gets a **profile modal**: a hub for everything about the active profile, organized by *where the data lives* — this device vs. the cloud account. Opened from the top-bar profile control (desktop) or the nav drawer (mobile). Implements `specs/005-profile-modal/spec.md`.

Final decisions from the design session:
- **Hub + 2 sub-screens** ("Perfil neste aparelho", "Conta na nuvem"). Destructive actions live inside the sub-screen that owns the data — no separate "Excluir" screen.
- **Toast** for short confirmations/notices (variant 5b desktop / 5e mobile — "glow"). No inline notice plates that shift layout.
- **Refined identity wheel** (`IdentityWheelV2.js`) replaces the DS wheel everywhere (profile modal + entry modal).
- Sync of colors/name (FR-012 / FR-012a) is **quiet** — no warnings; changes ride the next sync.
- Deleting the last profile → app shows an **empty state** (not the entry modal).

## About the design files
The files here are **design references built in HTML** — prototypes of intended look and behavior, not production code. Recreate them in the Angular app using its existing patterns: `src/app/shared/ds/*` (themed-modal, identity wheel, buttons, fields), `src/app/shared/auth/entry-modal/*`, `src/app/shared/layout/*`, `src/styles/*`, and the copy in `src/app/core/utils/entry-copy.ts`.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii and motion come from the Grimorio design system tokens (`design_brief/tokens.css`, `controls.css`, `components/*.css`). Match them exactly; use existing token names, never hard-coded hex in chrome.

**What to ignore in `ProfileModalApp.dc.html`:** it still contains explored-and-rejected variants. Final = the path with **no `actionsVariant` prop** (`ph.hub`, `ph.local`, `ph.cloud` + the action steps below). Ignore: `ph.overview` (old single-screen layout, turn-4 variants a–d), `ph.manage`, `ph.danger`, `ph.colors`, `ph.name`, and toast variants `plate` / `bar`.

---

## Screens

All screens render inside the existing **ThemedModal** (ring + halo + face):
- Desktop: 880px wide grid, `400px` identity pane | form pane. Form pane: 44px close row (✕, 44×44, `aria-label="Fechar"`), scrolling body, bottom prompt pinned with 1px hairline. Height animates to content (0.24s, `cubic-bezier(0.4,0,0.2,1)`), min 460px.
- Mobile (<640px): full-bleed; header = wordmark + IdentityChip (8px glowing dots + "name · tribe") + ✕; scrolling body; button rows stack (`flex-direction: column-reverse`, full width).
- Left pane (desktop): IdentityWheel + caption. Mobile has no left pane — where the wheel is editable it sits at the top of the body (240px).
- Body vertical gap: `--space-4` between blocks; `--space-2` between list rows.
- Modal is themed by the profile's picks (`[data-theme-scope]` + `Identity.themeVars(picks)`); on "Perfil neste aparelho" the modal re-themes live from the *unsaved* picks (preview); the app retints only on save.

### 1. Hub (`overview`)
Purpose: status at a glance + entry to the two areas.
- **Title**: profile name (Grenze 600, title glow). No subtitle.
- **Left pane (desktop)**: wheel in **display** mode (not clickable), tribe name + color names in the center. Caption: "Cada perfil tem sua coleção, seus decks e suas cores."
- **Sync plate** (`.plate`: surface `#1e1a17`, 1px `#3a332e`, 4px radius) — expanded version of the top-bar sync area:
  - Desktop: row, `align-items:center; justify-content:space-between; gap: var(--space-3)`. Mobile: column, button full width.
  - Left column (gap 2px): status line (sync mark + label, `--font-size-xs`, left-aligned) over meta line (`--font-size-sm`, muted `#a89e96`, `overflow-wrap:anywhere`).
  - States:
    | link state | mark | label | meta | button |
    |---|---|---|---|---|
    | linked | 8px filled muted dot | "Sincronizado há 5 min" | email | secondary "Sincronizar agora" |
    | linked, syncing | 12px spinner (1px muted border, right transparent, spin 0.8s linear) | "Sincronizando…" | email | hidden |
    | local | 8px hollow ring (1px muted) | "Sem conta na nuvem" | "Sem conta na nuvem — funciona sem internet." | secondary "Vincular conta na nuvem" → sign-in step |
    | expired | 8px danger dot + `0 0 8px` danger glow | "Sessão expirada" (danger color) | email | **primary** "Entrar de novo" → re-auth step; plate border = `--color-danger` |
- **List** (`.grm-list` of `.grm-row`, 8px radius, gradient raised→surface, hover border role-primary + glow `0 0 18px -4px` role 55%):
  1. MiniWheel (36px) · "Perfil neste aparelho" / meta "Cores, nome e senha" · micro-label "Abrir"
  2. 36px spacer · "Conta na nuvem" / meta: linked → email; expired → "Sessão expirada · {email}"; local → "Vincular para sincronizar entre aparelhos" · "Abrir"
- **Bottom prompt**: "Não é você? **Trocar de perfil**" → opens the entry modal on its profile list.

### 2. Perfil neste aparelho (`local`)
Purpose: edit device-local profile data.
- Title "Perfil neste aparelho". Subtitle: linked/expired → "Cores e nome também seguem para a conta na nuvem na próxima sincronização."; local → "Tudo aqui funciona sem internet."
- Left pane: wheel in **picker** mode. Caption: "Toque nas cores da roda para mudar. A primeira tinge o app inteiro."
- Mobile: picker wheel (240px) centered at top of body.
- TextField "Nome do perfil" prefilled with current name; helper "3 a 16 caracteres: letras, números, _ . ou -"; `autocomplete="username"`.
- List row: "Senha do perfil" / "Desbloqueia o perfil neste aparelho" · "Mudar" → Change profile password step.
- List row (danger — name in `--color-danger`): "Excluir perfil" / "Apaga {nome} e os dados dele deste aparelho" · "Excluir" → Delete profile step.
- Button row (right-aligned desktop, stacked mobile): ghost "Voltar" (→ hub, discards unsaved edits) · primary "Salvar".
  - **Salvar is disabled unless picks or trimmed name differ from saved values.** While saving: "Salvando…", locked.
  - On success: stay on this screen, show toast (label "Perfil", text "Alterações salvas.").
  - Validation (name): 3–16 chars → "Use de 3 a 16 caracteres."; charset → "Use só letras, números, _ . ou -."; unique on device (case-insensitive) → "Esse nome já está em uso neste aparelho."

### 3. Conta na nuvem (`cloud`)
- Title "Conta na nuvem". Caption: "Opcional — a conta na nuvem sincroniza este perfil entre aparelhos. O app funciona sem ela."
- Subtitle: linked → "{nome} sincroniza com {email}."; expired → "A sessão expirou. {nome} continua funcionando neste aparelho."; local → "Opcional — vincule para sincronizar {nome} entre aparelhos."
- **Linked**: plate (micro-label "Vinculado à nuvem" + email); list: "Senha da conta" / "Usada para entrar na conta em outros aparelhos" · "Mudar"; "Desvincular conta" / "Os dados continuam aqui e na nuvem" · "Desvincular"; separate list, danger row "Excluir conta na nuvem" / "Apaga {email} e os dados na nuvem" · "Excluir".
- **Expired**: plate (micro-label "Sessão expirada" in danger, email, xs muted "O perfil continua funcionando neste aparelho. Entre de novo para voltar a sincronizar.") + primary block "Entrar de novo"; list row "Desvincular conta". (Delete cloud account not offered while expired.)
- **Local**: plate (micro-label "Só neste aparelho", muted "A conta na nuvem sincroniza {nome} entre aparelhos. O app funciona sem ela.") + secondary block "Vincular conta na nuvem" → sign-in step.
- Ghost "Voltar" → hub.

### 4. Action steps (reached from the sub-screens)
Each: title + subtitle + fields + button row ghost "Cancelar" · verb. Cancelar / Concluir return to the **screen they were opened from** (local or cloud), not the hub.

| Step | Fields | Primary (busy label) | Result |
|---|---|---|---|
| Change profile password (`pw`) | "Senha atual do perfil", "Nova senha do perfil" (helper "Pelo menos 8 caracteres. Funciona sem internet."), "Confirmar nova senha" | "Salvar senha" ("Salvando…") | Done screen "Senha alterada" |
| Change account password (`cloudpw`) | plate w/ email; "Senha atual da conta"; "Nova senha da conta" | "Salvar senha da conta" | Done "Senha da conta alterada" |
| Sign in / link (`in`) | E-mail, "Senha da conta", link "Esqueci minha senha" → reset | "Entrar" ("Entrando…") | Done "Conta vinculada"; prompt "Ainda não tem conta na nuvem? Criar conta" → `up` |
| Create account (`up`) | E-mail, "Senha da conta" (≥8) | "Criar conta" ("Criando conta…") | Done "Conta criada" |
| Reset (`reset` → `code`) | E-mail → "Enviar código"; then "Código" (6 digits, numeric, `one-time-code`) + "Nova senha da conta" | "Salvar e entrar" | Done |
| Re-auth (`reauth`) | plate w/ email; "Senha da conta"; "Esqueci minha senha" | "Entrar" | Done "Sincronização retomada" |
| Unlink (`unlink`) | — (subtitle states consequence; caption "Desvincular não apaga nada — nem aqui, nem na nuvem.") | danger "Desvincular" ("Desvinculando…") | Done "Conta desvinculada" |
| Delete profile (`delprofile`) | plate "Sai deste aparelho: Cartas · Locais de armazenamento · Decks · Cores · O perfil {nome}"; if linked, note that the cloud account isn't deleted; **unsynced-changes block** (below); "Senha do perfil" | danger "Excluir perfil" ("Excluindo…") | Profile removed; see "last profile" |
| Delete cloud account (`delcloud`) | plate "Sai da nuvem para sempre: …"; note other devices stop syncing and profile stays here; "Senha da conta" | danger "Excluir conta" | Done "Conta excluída"; profile becomes local |

Unsynced-changes block (FR-018a, delete profile, linked only): danger-bordered plate "Há mudanças que ainda não foram sincronizadas. Se excluir agora, elas se perdem." + secondary "Sincronizar agora" → SyncLine pending "Sincronizando…" (delete button locked meanwhile) → success: SyncLine done "Sincronizado agora — nada se perde na nuvem."; failure: SyncLine failed ("Sem conexão" / "Sessão expirada" / "Falha ao sincronizar") + "Tentar de novo".

Done screen: title + one sentence + primary block "Concluir". Exact copy for each is in `ProfileModalApp.dc.html` (`finish(...)` calls).

Errors (never raw backend text): "Digite sua senha." · "Senha incorreta." · "Use pelo menos 8 caracteres." · "As senhas não são iguais." · "E-mail ou senha incorretos." · "Digite seu e-mail." · "Esse e-mail não parece válido." · "Digite os 6 dígitos do código." · offline: "Sem conexão. A conta na nuvem precisa de internet — o resto do app continua funcionando." Field errors replace the helper; form errors use `.grm-form-error` with `role="alert"`.

### 5. Shell touch points
- **Desktop top bar** (44px): right side = sync area button (mark + label, xs, 44px tall; linked → triggers sync; local → opens profile modal on sign-in; expired → opens on re-auth) · 1px×20px divider · profile control (glowing 8px dots per color + name, 700, sm) → opens hub. With no active profile the control reads "Entrar" and opens the entry modal.
- **Mobile top bar**: sync mark only (24px) + ghost "Menu" → right drawer (280px, page bg, left hairline) with profile control (md), status line, and xs uppercase action link.
- **Empty device** (last profile deleted): main area centered, max-width 360px, gap `--space-4`: eyebrow "Nenhum perfil neste aparelho", sm muted "Crie um perfil para começar — funciona sem internet, sem e-mail.", primary "Criar perfil" → entry modal create step. If other profiles remain, open the entry modal on its list instead.

### 6. Toast (final: "glow", 5b / 5e)
- Absolute over the app, `z-index` above the modal overlay. `role="status" aria-live="polite"`.
- Desktop: `top: calc(44px + var(--space-4))`, `right: var(--space-4)`, max-width 380px. Mobile: `top/left/right: var(--space-3)`.
- Face: background `--color-surface-raised` (#292320), 1px solid `--role-primary`, radius 8px, glow `0 0 18px -4px` role-primary 55%, padding `--space-3 --space-4`, `display:flex; gap: var(--space-3); align-items:flex-start`, text sm parchment.
- Content: 8px role-accent dot (glow `0 0 8px`, margin-top 6px) · column (micro-label + text, `text-wrap: pretty`) · ✕ close (44×44, muted, negative margins to sit in the corner).
- Auto-dismiss after **5s**; new toast replaces the current one.
- Uses: save confirmation ("Perfil" / "Alterações salvas."), FR-019b ("Conta na nuvem" / "A conta {email} não existe mais. {nome} continua neste aparelho com todos os dados."). This is a new DS component — add it to DESIGN.md.

### 7. Identity wheel v2 (`IdentityWheelV2.js`)
Same geometry as DS wheel (swatch 19% of size, positions W 40.5/3.5, U 75.7/29.1, B 62.3/70.4, R 18.7/70.4, G 5.3/29.1 %; conic ring + radial glow + spark/ripple on new pick; 28s spin; center tribe + sub). Changes — every swatch has the same anatomy:
- `disc` (inset −1px, page bg — **masks the spinning ring line**) · `rim` (1px border in the color) · `dot` (inset 14%, filled color).
- **Selected**: scale 1.06, opacity 1; dot glow `0 0 14px` color 55%, breathing to `0 0 20px 1px` 62% over 5s; rim glow `0 0 10px` 35%. **Motes**: every 700ms each selected color has a 26% chance to emit one 2px mote from its edge, drifting outward (away from wheel center, ±0.7 rad) 14–28px over 2.4–3.6s, peak opacity 0.35–0.6, then fading.
- **Selectable, not selected**: scale 0.58, opacity 0.28 (rim + dot). Hover: scale 0.66, opacity 0.5.
- **Locked** (3 already picked): scale 0.24, rim opacity 0.35, **no dot**; `cursor: not-allowed`, `aria-disabled`.
- Neutral (no picks): scale 0.88, opacity 0.85.
- Transitions 0.5s standard easing. `prefers-reduced-motion`: no breathing, no motes, no spin, no bursts.
- Picker: buttons with `aria-pressed`, `aria-label` = color name; tapping selected removes it (min 1); max 3; order of taps = role order.

### 8. Entry modal change
Unlock → "Esqueci minha senha": local profile → existing local reset warn; **linked profile → new step "Redefinir senha do perfil"**: subtitle "{nome} está vinculado à nuvem. Confirme a senha da conta para criar uma nova senha do perfil neste aparelho.", plate with account email, "Senha da conta", link "Esqueci a senha da conta" → cloud reset, buttons Cancelar (→ unlock) · "Continuar" ("Confirmando…") → local new-password step. Caption "Redefinir a senha não apaga nada." Wheel shows the selected profile. Also: entry modal name rule must be 3–16 (it currently says 20), and linking the active profile should move out of it (FR-006).

## Interactions & behavior summary
- Hover 0.18s; modal height 0.24s; swatch/name 0.5s; single easing `cubic-bezier(0.4,0,0.2,1)`.
- Focus: `outline: 2px solid var(--role-accent); outline-offset: 2px`. Trap focus in the modal, return focus to the opener on close, Esc closes (and closes the mobile drawer) — FR-020.
- While a sync runs, the top-bar sync area is inert (US1-4).
- FR-012 / 012a: colors & name save locally; the account receives them on the next sync; incoming color changes from other devices retint silently.
- FR-019b: first cloud action (open account password, unlink, delete account, sync) after the account was deleted elsewhere → profile flips to local, toast shown.

## State
`activeProfile {name, colors[1..3], link: 'linked'|'local'|'expired', email}`, `profiles[]`, `modal: null|'profile'|'entry'`, `phase`, `backTo` (parent screen for Cancelar/Concluir), `draft {picks, name}` (dirty check for Salvar), form fields + per-field errors + `formError`, `busy`, `sync: idle|syncing|failed`, `hasUnsyncedChanges`, `toast {label, text} | null`, `online`.

## Design tokens (from DS)
Neutrals: bg #14110f · surface #1e1a17 · surface-raised #292320 · border #3a332e · text #f2ede8 · muted #a89e96 · backdrop rgba(0,0,0,.75). Danger: text `oklch(0.72 0.16 28)`, bg `oklch(0.27 0.06 28)`. Roles `--role-primary/-accent/-tertiary` from picks (fallback Vermelho → Azul → Verde). Type: Grenze 600/700 display, Karla 400–700 body; sizes 0.75/0.875/1/1.25/1.5/2rem; line-heights 1.2/1.5; tracking 0.05em micro / 0.14em eyebrow. Spacing 0.25rem base, `--space-1..6` (max 2rem). Radii 4px controls/plates · 8px containers/rows/toast · 50% swatches. Touch target 44px. Only neutral shadow `0 1px 3px rgba(0,0,0,.4)`; everything else is role glow. Borders always 1px.

## Assets
None. No icons, images or symbols — only the ✕ and + glyphs, color swatches and written names.

## Files
- `Final Designs.dc.html` — canvas with only the final frames (turn 6 hub/sub-screens desktop + mobile, toast 5b/5e). Open in a browser from this folder.
- `ProfileModalApp.dc.html` — the interactive prototype (all logic, copy, validation). Props: `layout`, `linkState`, `startPhase` (`overview|local|cloud|pw|cloudpw|in|reauth|unlink|delprofile|delcloud`), `unsynced`, `offline`, `cloudGone`.
- `IdentityWheelV2.js` — reference implementation of the refined wheel.
- `EntryModal.jsx` — entry modal reference with the linked-profile password reset step.
- `_ds/` — Grimorio design system bundle + tokens used by the prototypes; `support.js` — prototype runtime.
- New/changed PT-BR copy is **not yet in `entry-copy.ts`** — add it there after review.
