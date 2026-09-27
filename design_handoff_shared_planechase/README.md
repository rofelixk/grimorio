# Handoff: Shared Planechase (spec 006)

## Overview
First gameplay mode for Grimorio. Adds a **"Modos de jogo"** nav destination → gameplay menu (Planechase only) → the **Planechase page**, which runs a shared-planar-deck game at the table: current plane (image + PT-BR text), planar die (Planeswalk / Caos / Nada acontece), roll cost, manual planeswalk, one-step undo, phenomenon confirmation, used/available tracking with reset, end game, PT-BR rules ("Como jogar") and deck selection ("Baralho planar"). Source spec: `specs/006-shared-planechase/spec.md` in `rofelixk/grimorio`.

Everything lives **inside the shell's `<main class="view-area">`** (routed views), never in a modal.

## About the design files
The files in this bundle are **design references built in HTML** — prototypes showing intended look and behavior, not production code. Recreate them in the existing **Angular 22** app (standalone components, signals, `src/styles/*` tokens and class primitives, `src/app/shared/ds/*`), following its patterns. Do not ship the HTML.

## Fidelity
**High-fidelity** for layout, copy, tokens, states and flair motion. Exceptions:
- Card images are placeholders (surface-raised box with the card name). Real images come from the existing card catalog (FR-006).
- The catalog in the prototype is a 28-card sample (two sets). Production ships ~160 entries (FR-003).
- PT-BR card texts are **drafts** — must be reviewed (FR-004).
- The top bar / side nav / drawer are simplified recreations of the existing shell for context only — **keep the real `app-top-bar`, `app-side-nav`, `app-nav-links`, `app-nav-drawer`**. Only add the "Modos de jogo" entry to `NAV_DESTINATIONS`.

## Routes (suggested)
| Route | View |
|---|---|
| `/modes` | Modos de jogo menu |
| `/modes/planechase` | Planechase (no game ↔ game in progress) |
| `/modes/planechase/rules` | Como jogar |
| `/modes/planechase/deck` | Baralho planar (draft editor) |

No profile guard on any of them (FR-002). Nav item "Modos de jogo" is `is-current` for all four.

## Breakpoints
Use `_breakpoints.scss`: **mobile ≤ 640px** switches the game to the docked layout; **wide ≥ 960px** shows the side-nav rail (existing shell behavior).

---

## Screens

### 1. Modos de jogo (menu)
- Page padding `--space-5` (mobile `--space-4`), column, gap `--space-4`, max-width 720px.
- `h1` "Modos de jogo": Grenze 600, 2rem/1.1, `text-shadow: var(--glow-title)`.
- One **action row** (reuse `app-action-row`): title **Planechase**, meta "Um baralho de planos compartilhado pela mesa.", verb (micro-label) **Abrir** — or **Continuar** when a game is in progress. Row: min-height 56px, padding `--space-2 --space-3`, 1px `--color-border`, radius 8px, `linear-gradient(--color-surface-raised, --color-surface)`; hover/focus border `--role-primary` + `--glow-plate-hover`.

### 2. Planechase — no game
- Centered column (margin auto, max-width 480px, text-center, gap `--space-4`).
- Eyebrow "Nenhuma partida" (`.eyebrow`: 0.75rem, 0.14em, uppercase, muted).
- `h1` "Planechase".
- Copy (1rem, muted, max 40ch): "Planos mudam as regras da mesa. Um baralho só, compartilhado por todos — funciona sem internet."
- Buttons row (gap `--space-2`): `.btn.btn--primary` **Iniciar partida**, `.btn` **Como jogar**.
- `.link-btn` "Baralho: {n} cartas ativas" → deck.

### 3. Planechase — game (wide, > 640px)
Scrolling page, padding `--space-5`, column gap `--space-4`, max-width 1120px, min-height 100%.

**a. Console** (the focus of the page)
- Grid `minmax(0,1fr) auto`, gap `--space-4`, align center, padding `--space-4 --space-5`, 1px `--role-primary`, radius 8px, `box-shadow: var(--glow-button)`.
- Left (`role="status" aria-live="polite"`): eyebrow "Dado planar · próxima rolagem {N}" → result title (Grenze 600, 2rem/1.15, glow) → sub line (0.875rem muted).
- Right actions (wrap, gap `--space-2`, right-aligned), in order: `.btn.btn--ghost` **Desfazer** · `.btn` **Zerar custo** · `.btn` **Planeswalk** · `.btn.btn--primary` **Rolar dado planar**.
- Variants:
  - **Phenomenon pending**: eyebrow "Fenômeno", title "Fenômeno encontrado", sub "Resolva o efeito na mesa e conclua para seguir ao próximo plano.", primary becomes **Concluir encontro**; Zerar custo + Planeswalk (+ footer "Reiniciar planos") `disabled`. Desfazer stays enabled.
  - **All used** (planeswalk needed, none available): eyebrow "Planeswalk pendente", title "Todos os planos foram usados", sub "Reiniciar devolve os planos usados ao baralho e conclui o planeswalk.", actions: Desfazer · primary **Reiniciar planos**.
  - **Confirm** (inline, replaces console content, `role="alertdialog"`): border `--color-danger`, no glow. Title + body, actions `.btn` **Cancelar** · `.btn.btn--danger` verb.
    - Reset: "Reiniciar planos?" / "Os {usados} planos usados voltam ao baralho. O plano atual continua na mesa." / **Reiniciar planos**
    - End: "Encerrar partida?" / "A partida some deste aparelho. Seu baralho continua salvo." / **Encerrar partida**

**b. Plane** — grid `1fr 1fr`, gap `--space-5`, align start.
- Image: aspect-ratio 1.4 (landscape planar card), radius 8px, 1px border, `--color-surface-raised` placeholder. Offline & never cached → placeholder with name + "Imagem indisponível sem conexão" (text still renders).
- Text column (gap `--space-2`): name `h2` (Grenze 600, 1.5rem — **English**), type line (0.875rem muted, e.g. "Plano — Zendikar" / "Fenômeno"), static text (0.875rem, omitted for phenomena), ability plate.
- Ability plate: padding `--space-2 --space-3`, 1px border, radius 4px, `--color-surface`; eyebrow **Caos** (planes) or **Ao encontrar** (phenomena).
  - **Lit** (after a Caos result, and always for a pending phenomenon): border `--role-primary`, bg `rgb(from var(--role-primary) r g b / 12%)`, `box-shadow: var(--glow-plate-hover)`, eyebrow in `--color-text`. Transition 0.5s standard easing. Stays lit until the next action.

**c. Footer line** (margin-top auto, padding-top `--space-3`, hairline top)
- Left: "{u} usados · {a} disponíveis" (0.875rem muted). **No list of used/available planes during a game** (deliberate — players must not browse upcoming planes).
- Right `.link-btn`s: Como jogar · Baralho · Reiniciar planos · Encerrar partida.

### 4. Planechase — game (mobile ≤ 640px)
Grid `minmax(0,1fr) auto` filling the view: **scrolling body + dock fixed at the bottom** (controls always reachable without scrolling).
- Body (padding `--space-4`, gap `--space-3`): row "Planechase" (h2) + counts (0.75rem muted, right) → image → name/type/text/ability (stacked) → 2×2 grid of 44px buttons (gap `--space-2`): `.btn.btn--secondary` Como jogar, Baralho; `.btn.btn--ghost` with 1px `--color-border` Reiniciar planos, Encerrar partida.
- Dock: border-top 1px `--role-primary`, `box-shadow: 0 -8px 24px -8px rgb(from var(--role-primary) r g b / 35%)`, padding `--space-3 --space-4`, gap `--space-2`, bg `--color-bg`.
  - Row: result (Grenze 600, 1.25rem) + "Próxima: {N}" right; sub line 0.75rem muted.
  - Row: Desfazer (ghost) · Planeswalk (flex 1) · Zerar custo (flex 1).
  - `.btn--primary.btn--block` Rolar dado planar / Concluir encontro.
  - All-used and confirm variants mirror the wide console (danger border-top for confirm, buttons flex 1).

### 5. Como jogar
- Wide: grid `180px | minmax(0,1fr)`, gap `--space-6`. Left sticky TOC: eyebrow "Nesta página", then anchor links, each min-height 44px with 1px top hairline, muted → text on hover. Mobile: TOC hidden, single column.
- Article max 62ch, gap `--space-5`:
  - Header group: ghost button (muted text, pulled left by `--space-3`) **Voltar à partida** (or **Voltar** without a game), `h1` "Como jogar", intro 1rem muted: "Planechase compartilhado: uma variante casual em que a mesa inteira usa um só baralho de planos."
  - Sections: padding-top `--space-5`, 1px top hairline; `h2` Grenze 600 1.25rem; body 1rem/1.5 in `--color-text`.
  - Sections: O que é · Baralho compartilhado · Início · Controlador planar · Dado planar · Planeswalk · Caos e fenômenos (full copy in `Planechase.dc.html`, `rules` array). Opening it never alters the game.

### 6. Baralho planar (deck settings — draft)
Grid `minmax(0,1fr) auto`: scrolling body + pinned footer.
- Header: ghost back button, `h1` "Baralho planar" + counter "{n} de {total} cartas · {f} fenômenos" (muted, `aria-live`), hint "Toque numa carta para ativar ou desativar. Nada muda até você salvar."
- Non-blocking notice (0.75rem muted, max 72ch) when < 40 enabled **or** > 2 phenomena: "Menos de 40 cartas ou mais de 2 fenômenos: a regra pede ao menos 10 × o número de jogadores e no máximo 2 fenômenos por jogador. Dá para salvar mesmo assim." — plain text, **not a plate** (plates read as buttons).
- Per set: header row with eyebrow "{Set} · {on} de {total}" + `.link-btn` Ativar todos / Desativar todos.
- **Tile grid of card images** (no name/type rows): `repeat(auto-fill, minmax(150px,1fr))`, gap `--space-2`; mobile 2 columns. Tile = image, aspect 1.4, radius 4px, `aria-pressed`, `aria-label="{name}, plano|fenômeno"`.
  - On: 1px `--role-primary` border + lit bead top-right (7px circle, `--role-primary` fill, `box-shadow: 0 0 0 3px var(--color-bg), 0 0 10px 1px var(--role-primary)`).
  - Off: `--color-border` border, opacity .35, empty bead. Hover: `--glow-plate-hover`, opacity 1.
- Footer (hairline top, padding `--space-3 --space-5`, right-aligned; mobile buttons flex 1): `.btn` **Cancelar** · `.btn--primary` **Salvar**.
  - Error (blocking, `role="alert"`, `--color-danger` 0.875rem): "Ative pelo menos 10 cartas para salvar — agora são {n}." / "Ative pelo menos um plano para salvar." Draft stays open.
  - Game in progress + changed selection → footer turns into inline confirm (border-top danger): **"Salvar reinicia a partida em andamento."** / "Um novo plano inicial é sorteado com o baralho novo." · `.btn` **Manter partida** · `.btn--danger` **Salvar e reiniciar**.

---

## Interactions & behavior
- **Start**: fixes the game's card list to currently enabled cards; current = random **plane** (never phenomenon); available = rest; used = []; cost 0; no undo; result "Plano inicial" / "{name} abre a partida. Role o dado na fase principal do seu turno."
- **Rolar dado planar**: uniform `crypto.getRandomValues` → 1/6 Planeswalk, 1/6 Caos, 4/6 Nada acontece; cost += 1 after every roll.
  - Planeswalk → "Planeswalk" / "{prev} foi para os usados." + planeswalk flair.
  - Caos → "Caos" / "Resolva a habilidade de caos destacada abaixo." + ability lit + chaos flair.
  - Nada → "Nada acontece" / "O plano continua o mesmo."
- **Planeswalk (manual)**: same draw, cost unchanged, sub "{prev} foi para os usados. O custo do dado não muda."
- **Zerar custo** (replaces the spec's "Próximo turno"): cost → 0, "Custo zerado" / "A próxima rolagem custa {0}."
- **Draw**: current → used (push, visit order); random from available. If drawn card is a phenomenon → pending (lock roll/planeswalk/zerar custo). **Concluir encontro** → "Encontro resolvido" + planeswalk again (can chain phenomena).
- **No available on a needed planeswalk** → all-used console. **Reiniciar planos** (from it, or anytime via confirm): available = list − current, used = []; if pending planeswalk, complete it. Clears undo.
- **Desfazer**: restores the full snapshot before the last roll / planeswalk / confirmation / zerar custo (current, lists, cost, pending, shown result). One step only; unavailable after start, reset, undo. Not for Encerrar.
- **Encerrar partida** (confirm) → no-game state.
- **Persistence**: game + selection + route in device storage; survive reload. Game is device-scoped, not profile-scoped, not synced. Selection saved to active profile (or device when none) and synced via existing manual sync, last-write-wins (FR-020/021).
- **A11y**: result region `aria-live="polite"`; confirms `role="alertdialog"`; tiles `aria-pressed`; focus `outline: 2px solid var(--role-accent); offset 2px`; all targets ≥ 44px.

## Flairs (motion)
Both play **once** on the event, leave nothing behind, colored only by `--role-primary/-accent/-tertiary`, and are skipped entirely under `prefers-reduced-motion` (content just swaps). Reference implementation: `runPw()` / `runChaos()` in `Planechase.dc.html` (rAF-driven so glow, mask edge and sparks share one clock — keep them on one clock; CSS-only versions drifted out of sync in exploration).

**Planeswalk — curved light front (1.4s, linear)**
- Before swapping, clone the plane block (image + text) and overlay it (`position:absolute; inset:0`) above the new content.
- Radius `R` goes from −60px to `hypot(w, h/2) + 80` over 1.4s. Old clone mask: `radial-gradient(circle at 0 50%, transparent R, #000 R+60px)` → old plane dissolves along a circular front from the left edge; new plane is revealed behind.
- Glow: three stacked layers (one per role), each `radial-gradient(circle at 0 50%, transparent E−120, <role> E, transparent E+120)` with E = R+30, `filter: blur(30px)`, `mix-blend-mode: screen`, overlay extends 80px above/below and 60px right. Opacity cross-fades **primary → accent → tertiary** as the front travels (colors flow one after another, never all three at once); overall fade-in first 8%, fade-out last 12%, max 0.9.
- ~30 sparks (3px, `box-shadow: 0 0 6px 1px currentColor`): each spawns when the front reaches it, colored by the current role, flies outward along the radius 30–90px over 520ms, shrinking to .3 and fading.

**Caos — shockwave behind the card (~1.1s)**
- Effect layer sits **behind** the image (`z-index:0`, image `z-index:1`), so only what escapes the card edges shows.
- Two rings (size = 1.2 × min(w,h)), centered: primary 2px, accent 1px (+140ms); `box-shadow: 0 0 24px c, inset 0 0 18px c`; scale .3 → 2.6 easeOutCubic over 900ms, opacity 1 → 0.
- 22 sparks radial from center, distance 0.55–1.05 × size, 700ms easeOutCubic, 0–120ms stagger, cycling the three roles.
- Image shake: first 320ms, ±4px decaying sine.
- Ability plate transitions to lit (0.5s).

## State (suggested signals)
```ts
game: {
  list: string[];          // fixed at start
  current: string;
  used: string[];          // visit order
  available: string[];
  cost: number;
  pending: boolean;        // phenomenon awaiting confirmation
  needsReset: boolean;     // planeswalk blocked by empty available
  result: { k: 'start'|'nada'|'caos'|'pw'|'manual'|'cost'|'phen'|'reset'|'reset-pw'; n?: string };
  prev: Game | null;       // single undo snapshot
} | null
disabled: string[]         // selection (everything else enabled), + updatedAt for sync
draft: string[] | null     // deck editor
confirm: 'reset' | 'end' | null
deckError: string; deckAsk: boolean
```
Catalog entry: `{ id, name (EN), set, kind: 'plane'|'phenomenon', typePt, textPt, abilityPt, printingId }` shipped in code (FR-003/004).

## Design tokens (from `src/styles/_tokens.scss` — use the tokens, not literals)
- Neutrals: bg `#14110f`, surface `#1e1a17`, raised `#292320`, border `#3a332e`, text `#f2ede8`, muted `#a89e96`. Danger `oklch(0.72 0.16 28)` on `oklch(0.27 0.06 28)`.
- Roles: `--role-primary/-accent/-tertiary` (+ `-hover`) from profile identity; default Vermelho `#a8402c` → Azul `#3d6b85` → Verde `#4c7a43`.
- Type: Grenze 600 titles / 700 wordmark; Karla 400–700. Sizes 0.75 / 0.875 / 1 / 1.25 / 1.5 / 2rem; LH 1.2 / 1.5; tracking 0.05em micro, 0.14em eyebrow.
- Spacing: 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2rem. Touch 44px, list row 56px.
- Radius: 4px controls/plates/tiles, 8px containers/console/image.
- Light: `--glow-title`, `--glow-button`, `--glow-button-text`, `--glow-plate-hover`, `--shadow-rest`.
- Motion: `cubic-bezier(0.4,0,0.2,1)`; 0.18s hover, 0.24s base, 0.5s slow.
- Copy rules: PT-BR, sentence case, verbs on buttons, no exclamation marks/emoji; card names stay English (FR-005). `{CAOS}`, `{0}`, `{1}` are rendered as text — **no Magic symbols**.

## Assets
None. No icons, no images, no symbols (DESIGN.md). Card images come from the existing card catalog at runtime (newest non-gold-border printing), cached on device after first view.

## Files
- `Planechase.dc.html` — **final hi-fi interactive prototype** (all screens, logic, flairs). Open directly in a browser; resize below 640px for the mobile dock; Tweaks → `identity` to preview identities.
- `Planechase States.dc.html` + `Planechase Screen.dc.html` — every state side by side, desktop 960 and mobile 390 (lower fidelity reference board).
- `Planechase Flairs.dc.html` — flair explorations; **2a** (planeswalk) and **2b** (chaos) were chosen.
- `Planechase Layout.dc.html` — early structure exploration (1e/2a/2b chosen).
- `support.js`, `_ds/…` — runtime + design-system CSS the HTML files need to open.
