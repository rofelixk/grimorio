# UI Design: App Shell Navigation (spec 004)

The visual values (colors, sizes, motion) are final in `design_handoff_app_shell_navigation/README.md`, and they
go into DESIGN.md before building (FR-032). This file covers structure, states and behavior only.

## 1. Surfaces

| Surface | New / modified | Component |
|---|---|---|
| App root layout | modified | `App` (`app.html`/`app.scss`) |
| Top bar | rewritten | `TopBar` (`shared/layout/top-bar/`) |
| Profile control | new (replaces `ProfileButton`) | `ProfileControl` |
| Sync area / sync mark / drawer sync line | new | `SyncStatus` + `SyncMark` (ds) |
| Side nav (wide) | new (replaces legacy `NavBar`) | `SideNav` + `NavLinks` |
| Drawer (narrow) | new | `NavDrawer` + `NavLinks` (mirrored) |
| Legal notice | new | `LegalNotice` |
| About view | modified: its copy comes from `NOTICE` | `About` |
| Entry modal | modified: sync line removed, 3 strings reworded | `EntryModal`, `DonePanel`, `EntryFlowStore` |

## 2. Layout

### Wide (≥ 960px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [wash] Grimorio                     ● Sincronizado há 42 min │ ●●● rafa   │ ← top bar, flowing line below
├──┬───────────────────────────────────────────────────────────────────────┤
│ ┊│ <routed view>                                                          │
│ ●│   (scrolls inside <main>)                                              │
│ ┊│                                                                        │
│ ┊│ ─────────────────────────────────────────────────────────────────────  │
│ ┊│ Aviso legal: WotC · Scryfall · IA                                      │
└──┴───────────────────────────────────────────────────────────────────────┘
  ↑ collapsed nav: thread + beads (24px). The spacer holds 24px.

Hover/focus → the nav overlays at 232px (glow, labels, pin button); the spacer stays at 24px.
Pinned       → nav 232px, spacer 232px; the content narrows.
```

- **Top bar order**: wordmark · (auto gap) · sync area · divider · profile control. With no profile: wordmark ·
  Entrar.
- **Nav, top to bottom**: pin button (always in the DOM, hidden while collapsed), then the destinations.

### Narrow (< 960px)

```
┌─────────────────────────────────┐        ┌──────────────┬──────────────────┐
│ Grimorio                 ●  MENU│        │  (backdrop)  │ ✕                │
├─────────────────────────────────┤        │              │         ●●● rafa │
│ <routed view>                   │  Menu  │              │ ● Sincronizado há│
│                                 │ ─────▶ │              │          42 min  │
│                                 │        │              │ SINCRONIZAR AGORA│
│ ─────────────────────────────── │        │              │ ──────────────── │
│ Aviso legal                     │        │              │        Coleção ● ┊│
└─────────────────────────────────┘        └──────────────┴──────────────────┘
```

- **Top bar order**: wordmark · (auto gap) · sync mark (only with a profile) · Menu.
- **Drawer order**: ✕ · account block (profile control, sync line, action) · divider · nav links. The drawer is
  right-aligned and mirrored. With no profile, the account block holds "Nenhum perfil ativo" + Entrar.
- There is no side nav and no spacer.

### Both widths

- The root is a two-row grid filling `100dvh`, and the document never scrolls. `<main>` is the only scroll
  container.
- The routed view and the notice are direct children of `<main>`. The notice follows the view and sits at the
  bottom of short pages (research R2).

## 3. States

### Profile control (FR-003, FR-005, FR-005a)

| State | Wide (bar) | Drawer | Accessible name |
|---|---|---|---|
| Active profile | dots + name | dots + name (1rem), right-aligned | "Perfil {nome} — {Tribo} · {Cor}…. Trocar de perfil ou sair." |
| No profile | "Entrar" | "Nenhum perfil ativo" + "Entrar" | "Entrar" |
| Sync running | dimmed, `aria-disabled`, no-op | same | "Aguarde a sincronização terminar" |

### Sync status (FR-007 to FR-009, FR-018a)

| kind | Mark | Label color | Wide area | Narrow mark | Drawer action |
|---|---|---|---|---|---|
| syncing | spinner | muted | locked (`aria-disabled`) | spinner | hidden |
| synced | bright dot, glow | text | sync | dot | Sincronizar agora |
| last | muted dot | muted | sync | dot | Sincronizar agora |
| never | text-color ring | muted | sync | ring | Sincronizar agora |
| local | muted ring | muted | open modal → link | ring | Vincular conta na nuvem |
| offline | danger dot | danger | retry | danger dot | Tentar de novo |
| expired | danger dot | danger | open modal → reauth | danger dot | Entrar de novo |
| error | danger dot | danger | retry | danger dot | Tentar de novo |
| no profile | — (not rendered) | | | | |

### Side nav (FR-013 to FR-016)

| State | Width | Glow | Spacer | Labels | Pin button |
|---|---|---|---|---|---|
| collapsed | rail | no | rail | hidden | hidden (keeps its space) |
| hover/focus expanded | panel | overlay glow | rail | shown | "Fixar menu", `aria-pressed=false` |
| pinned | panel | no | panel | shown | "Recolher menu", `aria-pressed=true` |

The current destination has a lit bead, gradient text and `aria-current="page"`, and this applies on
`/collection/**` (FR-012).

### Drawer

It is closed (not rendered in the top layer) or open. When the width crosses into wide, the drawer component
unmounts (research R4).

## 4. Interaction flow

- **Wordmark** → `/` (Home). This works in every state.
- **Wide profile control** → `EntryModalService.open({ context: 'gate', start: 'list' })`. With no profile it calls
  `open()` with the defaults, so a device with no profiles gets profile creation and one with profiles gets the
  list.
- **Wide sync area** → `SyncStatusService.act()`.
- **Nav "Coleção"** → `/collection`. With no profile, the existing `profileGuard` opens the modal.
- **Collapsed-strip background click** → pin. **Pin button** → toggle pin.
- **Menu** → open the drawer. Keyboard opens focus ✕; pointer opens focus the dialog.
- **Drawer close**: ✕, a backdrop click, Escape/Back or any navigation. Focus returns to Menu.
- **Drawer controls that open the modal** (profile, Entrar, Vincular conta na nuvem, Entrar de novo): close the
  drawer → focus Menu → open the modal. When the modal closes, focus goes back to Menu (FR-020a).
- **Drawer "Sincronizar agora" / "Tentar de novo"**: sync, and the drawer stays open.
- **Route change** to a different path resets `<main>`'s scroll to the top.
- **While a modal is open**: everything behind it is inert (native `showModal()`).

## 5. Design-system reuse

- **Reused**:
  - `_tokens` (neutrals, roles, spacing, radii, `--duration-fast/base`, `--ease-standard`, `--glow-title`,
    `--touch-target`)
  - `_controls` (`.btn .btn--ghost` for Menu, `.link-btn` for the drawer action, `.eyebrow` styling for Menu, pin
    and action)
  - `_breakpoints` (`bp.wide`), `mediaQuerySignal`
  - the `spin` keyframe for the spinner
  - `identity.util` (`tribeName`, `colorNames`, `IDENTITY_HEX` for the dots, which DESIGN.md allows as pips)
  - `ThemedModal`'s opener restore
- **New, and justified**:
  - **"Fio de luz" band tokens, keyframes and the `_fio.scss` mixins** (research R15). Five components share
    them, and DESIGN.md gains matching entries.
  - **`SyncMark`** as a ds primitive. The bar, the mark and the drawer line all use it.
  - **Shell size tokens**: rail, panel, drawer, thread, bead, status mark, nav-leave delay, drawer duration.
- **Not reused, on purpose**: anything in `shared/common/`, the legacy `NavBar`, and the `_modal`/`_dropdown`
  partials (handoff, DESIGN.md).

## 6. Accessibility

- **Landmarks**:
  - `role="banner"` (top bar)
  - `<nav aria-label="Navegação principal">`
  - `<main>`
  - `<aside aria-label="Aviso legal">`
  - drawer `<dialog aria-label="Menu">`
- **Focus order, wide**: wordmark → sync area → profile control → nav (pin button, links) → main content.
  Focusing into the nav expands it, and focus leaving collapses it.
- **Focus order, narrow**: wordmark → Menu → main content. The sync mark is not focusable. Inside the drawer:
  ✕ → profile control → sync action → links, trapped by `showModal()`.
- **State exposure**:
  - Menu `aria-expanded` + `aria-controls`
  - pin `aria-pressed`
  - the current link `aria-current="page"`
  - the sync area and the profile control `aria-disabled` while syncing
  - sync marks and lines `role="status"`
- Every interactive element has a 44px minimum height, including the notice links (FR-022).
- `focus({ preventScroll: true })` on every programmatic focus.
- **Reduced motion**: the `grm-flow-*` animations stop, `--duration-drawer` → 0s, and the nav width transition
  follows the existing reduced-motion rule.
- Status never relies on color alone: each kind has a distinct mark shape or fill, plus its written label.
- Identity is shown as dots + name, and the tribe and colors are in the accessible name (the DESIGN.md exception
  recorded per FR-032).

## 7. Copy (PT-BR)

All strings live in `core/utils/entry-copy.ts` (`SHELL`, `SYNC_AREA`, `NOTICE`).

| Key | Text |
|---|---|
| Wordmark label | Grimorio — Início |
| Menu / close | Menu · Fechar |
| Nav label | Navegação principal |
| Destination | Coleção |
| Pin | Fixar menu · Recolher menu |
| Sign in / no profile | Entrar · Nenhum perfil ativo |
| Profile accessible name | Perfil {nome} — {Tribo} · {Cor} · {Cor}. Trocar de perfil ou sair. |
| Profile busy | Aguarde a sincronização terminar |
| Sync labels | Sincronizando… · Sincronizado · Sincronizado há N min/h/d · Nunca sincronizado · Sem conta na nuvem · Sem conexão · Sessão expirada · Falha ao sincronizar |
| Sync actions | Sincronizar agora · Tentar de novo · Entrar de novo · Vincular conta na nuvem |
| Sync area accessible name | "{label}. {action}." (e.g. "Sincronizado há 42 min. Sincronizar agora.") |
| Notice label | Aviso legal |
| Notice (a) | Grimorio é Fan Content não-oficial, permitido segundo a [Fan Content Policy] da Wizards of the Coast. Não é aprovado nem endossado pela Wizards. Partes dos materiais usados são propriedade da Wizards of the Coast. ©Wizards of the Coast LLC. |
| Notice (b) | Os dados e imagens de cartas exibidos no Grimorio são fornecidos por [Scryfall]. |
| Notice (c) | Parte do desenvolvimento deste app contou com ferramentas de inteligência artificial. |
| Name helper / error | 3 a 16 caracteres: letras, números, _ . ou - · Use de 3 a 16 caracteres. |
| `SUBTITLE.up` | {p} pode sincronizar entre aparelhos quando você quiser. |
| `SUBTITLE.reauth` | A sessão da conta expirou. Entre para voltar a sincronizar {p}. |

No failure state shows backend text. Sync failures always map to the three fixed labels.
