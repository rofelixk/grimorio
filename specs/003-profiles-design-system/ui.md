# UI Design: Profiles, Accounts and the New Design System

**Feature**: `003-profiles-design-system` | **Date**: 2026-09-24

This file is structural only. Visual values come from the root `DESIGN.md`, and every phase, copy
string, busy label, prompt and color source comes from `design_handoff_auth_profiles/STATES.md`. Where
this file points at one of them, that source wins. Breakpoints: mobile < 640px; desktop ≥ 640px.

## 1. Surfaces

| Surface | Status | Location |
|---|---|---|
| App themed root (tokens, role chain, base styles) | **new**, replaces the legacy globals | `src/styles/`, `app.ts` host bindings |
| App top bar (wordmark + temporary profile button) | **new** | `src/app/shared/layout/top-bar/` |
| Temporary profile button + menu | **new** (placeholder, unstyled, FR-029) | `src/app/shared/auth/profile-button/` |
| Entry modal (every phase in STATES.md) | **new**, replaces `AuthModal` | `src/app/shared/auth/entry-modal/` (+ phase children) |
| DS primitives: themed modal shell, spark field, identity wheel, mini wheel, identity chip, profile row, sync line | **new** | `src/app/shared/ds/` |
| Legacy `NavBar` | **modified, minimally**: drops `AuthControl`, `SyncIndicator` and the `/profile` link | `src/app/shared/layout/nav-bar/` |
| Removed | `AuthControl`, `AuthModal`, `SyncIndicator`, `ColorThemePicker`, `Profile` view | — |
| Home, About and legacy views | unchanged; they inherit the new base (page, text, type) and may break visually (US9-2) | `src/app/views/*` |

## 2. Layout per surface

### App shell

```text
┌──────────────────────────────────────────────┐
│ Grimorio                        [ rafa · … ] │  top bar (new) — hairline below
├──────────────────────────────────────────────┤
│ legacy .app-layout (nav drawer + <main>)     │  height = 100dvh − top bar
└──────────────────────────────────────────────┘
<app-entry-modal />  (rendered once, closed by default)
```

The top bar is identical at every width. `app.scss` subtracts its height from the legacy layout's
`100dvh`. The legacy `--nav-bar-height` math is left alone and may break.

### Entry modal — desktop (≥ 640px)

```text
ring (2px gap, conic) + halo + 20 sparks outward
┌─ face 880px, grid [400px | 1fr], fluid height ≥ 460 ─────────────────────┐
│ identity pane (wash)          │ close row (44px, ✕ right)                 │
│                               │ title (Grenze) / subtitle                 │
│      ◯ identity wheel 300     │ [phase body: fields | list | plate]       │
│   tribe name + subline        │ form error (alert)                        │
│                               │ primary button (full width)               │
│   caption (2 reserved lines)  │ secondary items (links, cooldown, etc.)   │
│                               │ ─────────────── (hairline)                │
│                               │ bottom prompt: "Pergunta? **Link**"       │
└───────────────────────────────┴───────────────────────────────────────────┘
```

On success screens, the form pane shows the done title, the body, the optional sync line, the
optional secondary button and **Concluir**. The prompt is hidden.

### Entry modal — mobile (< 640px)

```text
┌ full-bleed, ring gap on the screen edge, 12 sparks inward ┐
│ header (wash): Grimorio        [chip ● rafa · Izzet] ✕    │  safe-area top padding
├───────────────────────────────────────────────────────────┤
│ body (scrolls): title 1.5rem / subtitle                   │
│ fields …                                                  │
│ [Criar perfil only] eyebrow "SUA IDENTIDADE", wheel 240,  │
│   helper "Escolha até 3 cores. …"                         │
│ form error / primary / secondary (stacked, full width)    │
│ prompt pinned last (margin-top:auto, min 44px)            │
└───────────────────────────────────────────────────────────┘
```

The wheel is shown **only** in `profile` on mobile. In every other phase, the identity chip carries
the identity.

### Phase bodies (field order follows STATES.md "Fields")

- `list`:
  1. notice plate (after sign-out);
  2. `role="list"` of profile rows, active row first with "Em uso";
  3. dashed "+ Criar novo perfil" row;
  4. "Sair de {P}" secondary (active only).
- `unlock`: Senha → "Esqueci minha senha" link.
- `profile`: Nome do perfil (helper) → Senha (helper) → [mobile: wheel block].
- `in` / `up` / `reset-email`: E-mail → Senha (except in reset-email) → "Esqueci minha senha" (`in`).
  In `up` with e-mail in use, the field error is followed by "É seu? Recupere o acesso".
- `reset-code`: Código → Nova senha da conta → primary → "Enviar novo código" / "Reenviar em Ns" →
  "Usar outro e-mail".
- `setup` / `reauth` / `recover-form`: "Conta na nuvem" plate → (setup: Nome do perfil) → password
  field → "Esqueci minha senha" (reauth, recover-form).
- `localreset-warn` and `unlink`: subtitle only → primary action (unlink: danger) + Cancelar (ghost).
- `localreset-newpw` / `recover-newpw`: a single new-password field.

## 3. States

| State | What changes | Required by |
|---|---|---|
| Default (per phase) | per STATES.md row | FR-036 |
| In flight | primary disabled, label → busy label; other controls stay enabled except the resubmit | FR-028, edge case "double submit" |
| Field error | message under the field (danger), helper hidden; cleared when that field is edited | FR-005 |
| Form error | `role="alert"` above the primary; the form stays usable | FR-020/021/027/033 |
| E-mail in use | e-mail field error + "Recupere o acesso" link → `reset-email` | US4-4 |
| Offline | form error with the offline copy on any cloud submit; local phases unaffected | FR-021 |
| Resend cooldown | "Reenviar em {n}s" disabled for 30 s, then "Enviar novo código" | FR-024 |
| Hover preview (list) | the whole modal retints to the row's profile; the list's `mouseleave`/`focusout` restores it; the create row clears it | US2-2, FR-031 |
| Picker | swatch pressed state, locked at 3 / at 1, live retint, tribe name re-enters | US1-3 |
| Signed out | list without an active row, notice plate, default identity, neutral wheel | FR-008 |
| Success + sync line | spinner + "Sincronizando…"/"Baixando sua coleção…" → dot + "Sincronizado agora"/"Coleção baixada"; driven by the real `SyncService.syncNow()` promise | FR-016a |
| Sync failed after success | the sync line shows the offline or generic message as status text; the success stands | FR-016a ("syncs that can't run must not block") |
| Linked with new colors | "Conta vinculada" body adds the tribe sentence; the wheel ripples on each newly lit color | US4-2 |
| Reduced motion | ring/halo frozen, no sparks/ripples/name-in; fluid height still resizes | US8-3, FR-040 |
| Top bar button | "Nenhum perfil ativo" / "{P} · Vinculado à nuvem" / "{P} · Só neste aparelho" | FR-029 |
| Menu sync status | "Sincronizando…" → "Sincronizado agora", or the offline / generic message | US4-8 |

## 4. Interaction flow

```text
entry points ─┬─ gated route with no profile ── profileGuard ──► modal(device|gate)
              ├─ top-bar button with no profile ─────────────────► modal(device|gate)
              └─ top-bar button with a profile ──► menu ─┬─ Trocar perfil ───► modal(gate, list)
                                                         ├─ Conta na nuvem ──► modal(link, in|unlink|reauth)
                                                         └─ Sincronizar agora ► syncNow() | modal(link, reauth)

device:  profile ⇄ in ──► setup ──► done(setup)
         profile ──► done(profiled) ──[Vincular conta na nuvem]──► link/up for the new profile
gate:    list ──► unlock ──► done(unlocked)   unlock ──Esqueci──► recover-form→recover-newpw | localreset-warn→localreset-newpw
         list ──► profile │ list ──► in ──► setup │ list ──Sair de P──► list(signed out + notice)
link:    in ⇄ up ──► done(linked|created)   unlink ──► done(unlinked)   reauth ──► done(reauthed)
any cloud form ──Esqueci minha senha──► reset-email ──► reset-code ──► (back to origin flow's post-sign-in step)
reset "Voltar" ──► backTarget
```

- **Dismiss** (✕, Esc, backdrop click): close and reset everything. A pending guard resolves with
  whether a profile is now active (R12).
- **Concluir**: close and reset. From a guard, navigation proceeds to the requested page.
- **Switching forms**: clears errors and password/code fields and keeps the e-mail (FR-028).

## 5. Design-system reuse

New UI follows the root `DESIGN.md` only. Nothing is reused from the legacy styling section of
`architecture.md` (notes.md 2026-09-24).

- **Tokens and recipes**: `src/styles/_tokens.scss` is a port of `tokens.css`. Roles come only from
  `--role-*`, and glow, wash, ring and halo come from the tokens.css recipe variables.
- **Global primitives** (`_controls.scss`, class-based): `.btn` variants, `.field`, `.plate`,
  `.micro-label`, `.eyebrow`, `.divider`, `.link-btn`.
- **Component primitives** (`src/app/shared/ds/`):
  - `ThemedModal` — the dialog, ring, halo and face, with `data-theme-scope` and `--theme-*` inputs;
  - `SparkField` — count and direction as inputs;
  - `IdentityWheel` — `picker` or `display` mode, picks, and a ripple on newly lit colors;
  - `MiniWheel`;
  - `IdentityChip`;
  - `ProfileRow`;
  - `SyncLine`.
- **Retained**: `_breakpoints.scss` (`bp.mobile`/`bp.wide` mixins). The native `<dialog>` pattern is
  kept from the architecture.
- **New to DESIGN.md**: an "App top bar" entry, added before the top bar is built (Principle V, R16).
  No other UI in this feature falls outside DESIGN.md. The temporary button and menu are exempt per
  FR-029.

## 6. Accessibility

- Native `<dialog>.showModal()` gives the focus trap and Esc. On open, focus moves to the first field
  (or the first row in `list`). On close, focus returns to the opener.
- `role="alert"` on form errors; `role="status"` on the sync line, notices and the menu sync status.
- The ✕ control has `aria-label="Fechar"`.
- Picker swatches are `<button aria-pressed aria-label="Branco|Azul|Preto|Vermelho|Verde">`. A locked
  swatch uses `aria-disabled="true"`, not `disabled`, so it stays focusable and announced.
- Profile rows are `<button>` elements inside `role="listitem"` wrappers. The active row has
  `aria-current="true"` plus `aria-disabled="true"`.
- The identity is always named in text (tribe + color names), never by color alone (FR-034).
- Autocomplete values:
  - `username` on Nome do perfil;
  - `email`;
  - `current-password` on unlock/in/reauth/recover-form;
  - `new-password` on up/profile/setup/reset-code/*-newpw;
  - `one-time-code` on the code field, with `inputmode="numeric"` and `maxlength="6"`.
- Every interactive element has a minimum of 44×44 (FR-040), including text links and the
  placeholder button and menu items.
- Reduced motion: the global `[data-theme-scope] * { animation: none }` rule plus `SparkField`
  rendering nothing. The height transition is kept, because it is not decorative, and with it
  DESIGN.md "never jumps".
- `index.html` is set to `lang="pt-BR"`.

## 7. Copy

All modal copy is taken verbatim from STATES.md (titles, subtitles, labels, busy labels, prompts,
success titles and bodies, errors) and DESIGN.md (Content). It is centralised in
`src/app/core/utils/entry-copy.ts` so tests can assert SC-006. Captions under the wheel follow the
prototype's `leftCaption` rules (e.g. "Cada perfil tem sua coleção, seus decks e suas cores.",
"Redefinir a senha não apaga nada.", "Desvincular não apaga nada — nem aqui, nem na nuvem.").

Placeholder strings (FR-029, not in STATES.md):

| Where | Copy |
|---|---|
| Top-bar button, no profile | "Nenhum perfil ativo" |
| Top-bar button, profile | "{P} · Vinculado à nuvem" / "{P} · Só neste aparelho" |
| Menu items | "Trocar perfil", "Conta na nuvem", "Sincronizar agora" |
| Menu status | "Sincronizando…", "Sincronizado agora", the offline message, "Algo deu errado. Tente de novo em instantes." |
