# Handoff: Decks foundation (spec 009)

## Overview
The Decks area of Grimorio: list of decks (shown as sleeved-card fans), empty state, deck page header, create/edit dialog with a format picker, delete confirmation + toast, and the signature **page-turn with dust** transition between the list and a deck. PT-BR only. Desktop + mobile (< 640 px).

Repo: `rofelixk/grimorio` (Angular). Build on existing patterns from spec 008 (collections): `collection-area`, `compact-modal`, `collection-form-dialog`, `collection-delete-dialog`, `create-row`, `toast-outlet`, shell (`top-bar`, `side-nav`, `nav-drawer`, `legal-notice`), `src/styles/_fio.scss`.

## About the design files
The HTML files here are **design references** (prototypes of look and behavior), not production code. Recreate them in the Angular app using its components, SCSS tokens and conventions. The prototype rebuilds the shell inline only to give context — reuse the real shell.

## Fidelity
**High-fidelity** for `Decks Hi-fi.dc.html`: final copy, tokens, layout, motion. `Decks Transições.dc.html` is a lo-fi exploration; only option **4a** (dust) was chosen and it is implemented in hi-fi. `Decks Wireframes.dc.html` is history.

## Spec deltas (update spec.md before building)
- **Formats (FR-003 / FR-016)** — 8 options, in this order: Commander, Pauper, Modern, Standard, Pioneer, Legacy, Vintage, Casual. Removed: Duel Commander, cEDH, Premodern.
- **Deck page (FR-005)** — header only (back link, name, format, actions). Contents below the header are out of scope (next spec).
- **Featured card** — decks show a card fan with a slot for a featured card. No card data yet → placeholder. Card images must **never be cropped, masked or altered**; only whole-image translate/scale is allowed.
- **Deck color identity** — the dust uses the deck's identity (derived from its commander/cards later). Until card data exists, use parchment `--color-text` as the dust color. The prototype hard-codes identities on sample decks for demo only.
- **No wash / no role tint on the deck page** — deck identity may differ from the profile identity; the shell stays in profile colors, and the deck's colors appear only in the transient dust.

## Screens

### 1. Decks list
- Container: `max-width: 1080px`, centered, padding 24px (mobile 16px), column gap 16px.
- Header row: `h1` "Decks" (Grenze 600, `--font-size-2xl`, line-height 1.1, `--glow-title`) + primary button **"Novo deck"** (desktop). Mobile: button hidden; a dashed create row **"+ Novo deck"** at the end of the list (reuse `create-row`, min-height 56px, 8px radius).
- Grid: desktop `repeat(4, minmax(0,1fr))`, gap 32px row / 24px col. Mobile: one column, centered.
- Sort: alphabetical, `localeCompare(…, 'pt-BR', {sensitivity:'base'})`.
- **Deck fan (tile)** — whole tile is a link (`role=link`, `aria-label="{name}, {format}"`), focus outline per DS.
  - Stage 320 × 392 (desktop rendered at **0.75 scale** as a unit so 4 fit; mobile 1.0).
  - Three sleeves, each 256 × 352, `left:32px; top:20px`, radius 14px, `transform-origin: 50% 100%`:
    - Back: 1px `--role-tertiary`, bg `--color-surface`, `rotate(-9deg)`.
    - Middle: 1px `--role-accent`, bg `--color-surface-raised`, `rotate(-4deg)`.
    - Front: 1px `--role-primary`, bg `--color-bg`, padding 5px, `box-shadow: 0 0 20px -4px rgb(primary / 55%)`; hover `translateY(-8px)` + shadow `0 0 28px -4px / 70%`, 0.5s DS easing.
  - Card window inside front sleeve: exactly **244 × 340** (63:88), radius 12px, `object-fit: contain`. Placeholder: bg `--color-surface`, radial `rgb(primary / 26%)` at 50% 38% → transparent 68%, micro-label "Carta em destaque" + xs muted "Chega com as cartas do deck."
  - Below: name (700, `line-height 1.2`, wraps, `overflow-wrap:anywhere`) + format (sm, muted), centered.

### 2. Empty state
Title "Decks", then centered section (max-width 360px, margin 32px auto, gap 16px):
- Eyebrow: **Nenhum deck ainda**
- H2 (Grenze 600, `--font-size-xl`, glow): **Sleevados e prontos pra jogar**
- Body (sm, muted, pretty): **Um deck é um lugar físico, como uma coleção — o baralho montado, na caixa, pronto para jogar. Crie um para cada deck que você tem.**
- Primary button: **Criar deck**

### 3. Deck page (header only)
Container max-width 760px, padding 24/16px, gap 16px.
- Link button **"Voltar para decks"** (sm, `.link-btn`, 44px target), margin-bottom −12px.
- Row (wrap, gap 12px, align start): left column = `h1` deck name (2xl, glow, `text-wrap:balance`) + format below (sm, muted, gap 4px). Right: **Editar** (secondary) + **Excluir** (danger).
- Mobile: actions on their own full-width row, 50/50.
- Unknown deck id → redirect to list.

### 4. Create / edit dialog
Reuse `compact-modal` (480px, conic ring + halo, 44px close row, body padding 0 32px 32px). Mobile: full-screen sheet (header wordmark + ✕, stacked full-width buttons, primary on top).
- Title: **Novo deck** / **Editar deck**.
- Field **Nome**: helper "Como você reconhece o deck na estante."; counter `n/40` right (tabular nums, danger when > 40).
- Validation on submit (trimmed): empty → "Dê um nome ao deck." · > 40 → "Use no máximo 40 caracteres." · duplicate (case/accents-insensitive, pt-BR, excluding self on edit) → "Já existe um deck com esse nome." Error uses `.field__error`, input border `--color-danger`, `aria-invalid`.
- **Formato · {selected}** label, radiogroup of 8 buttons: desktop 4 columns, mobile 2 (always full rows — no empty cells). Selected: border + text `--role-primary`, 700, `--glow-button`, `--glow-button-text`; others muted.
- Rules plate below (`.plate`, padding 12px) — bullet list (sm, muted, gap 4px):
  - **Commander**: Exatamente 100 cartas, contando o comandante. · Uma cópia de cada carta, exceto terrenos básicos. · O comandante é uma criatura lendária. · Todas as cartas na identidade de cor do comandante. · Sem sideboard.
  - 60-card base (Pauper, Modern, Standard, Pioneer, Legacy, Vintage): Mínimo de 60 cartas. · Sideboard de até 15 cartas. · Até 4 cópias de cada carta, exceto terrenos básicos. — plus:
    - Pauper: Só cartas impressas como comuns.
    - Modern: Cartas de coleções a partir da Oitava Edição.
    - Standard: Só cartas das coleções mais recentes, que rodam com o tempo.
    - Pioneer: Cartas de coleções a partir de Retorno a Ravnica.
    - Legacy: Cartas de todas as coleções, com lista de banidas própria.
    - Vintage: Cartas de todas as coleções. · Cartas da lista de restritas: só 1 cópia.
  - **Casual**: Sem regras fixas: o deck segue o que o seu grupo de jogo combinar.
  - *(Rules copy needs product review before adding to entry-copy / DESIGN.md.)*
- Actions: **Cancelar** (ghost) · **Criar deck** / **Salvar** (primary).

### 5. Delete confirmation + toast
`compact-modal`. Title **Excluir {name}?** Body:
- With cards: "As {n} cartas deste deck vão para a caixa temporária, com todos os dados, até você guardá-las em outro lugar. Nada mais é afetado."
- Without: "Não há cartas aqui. Nada mais é afetado."
- Actions: **Cancelar** (ghost) · **Excluir deck** (danger). While running: label "Excluindo…", all controls `aria-disabled` (close, backdrop, Esc blocked).
- On success: go to list, toast (reuse `toast-outlet`, micro-label "Deck"): "{name} foi excluído." / "{name} foi excluído. {n} cartas foram para a caixa temporária." Auto-dismiss 6s, ✕ 44px.

## Page-turn with dust (list ↔ deck)
Triggered by opening a deck from the list, and by "Voltar para decks" / wordmark / nav "Decks" from a deck page. Direct URL loads and jumps: no animation. `prefers-reduced-motion: reduce` → instant swap, no dust.

**Turn**
- The list content (inside `<main>`, not the shell) becomes a page: absolutely positioned over the deck page, `transform-origin: 0 50%` (spine = left edge of main), `transform-style: preserve-3d`. Front face = list (`backface-visibility:hidden`, bg `--color-bg`); back face = flat `--color-surface` with 1px `--color-border` left edge.
- `<main>` has `perspective`: 2800px desktop, 1100px mobile.
- Open: `rotateY(0 → -180deg)`; close: `-180 → 0`. **1300 ms**, DS easing `cubic-bezier(0.4,0,0.2,1)`. Deck page is rendered beneath from the start of open; on close, list becomes the route when the turn finishes. Block input during the turn.

**Dust** (canvas overlay over `<main>`, `pointer-events:none`, DPR-scaled)
- Count: ~260 desktop, ~110 mobile. Random positions each run.
- Size: radius `0.45 + rand^2.2 × 1.1` px (most tiny); drawn as a pre-rendered soft sprite at 5× radius: parchment core (0–12%) → deck identity color (to 45%) → transparent, alpha mask 1 → .55 (20%) → 0. Draw alpha = `a × 0.7`. Colors cycle through the deck identity; no identity → parchment.
- Page edge screen-x each frame: `off + W/2 + (W·cosθ − W/2) · P / (P + W·sinθ)`; `vex` = its per-frame delta.
- Per speck, per frame:
  - Push (only while turning): `w = exp(-d²/(2σ²))`, d = x − edgeX, σ = `30 · (W/300)^0.6`. `kx += vex·w·0.3·jitter(0.6–1.4)`; `ky += (sin(seed + t·0.004)·0.55 − 0.2)·|vex|·w·0.25`.
  - Swirl proportional to push speed (so still specks stay still): `kx += sin(y·0.04 + t·0.0021 + seed)·0.06·min(1,|k|)`, `ky += cos(x·0.04 + t·0.0017 + seed)·0.06·min(1,|k|)`. Clamp |k| to `3.5·√(W/300)`, damp 0.95.
  - Ambient drift (never bright enough to show): ±0.003 sin/cos + 0.002 gravity, damp 0.955.
  - **Visibility = motion**: while turning, target alpha `clamp((|k| − 0.12) / (1.1·√(W/300)))`, rise 0.3/frame, fall 0.04/frame.
- **Settle (change vs. prototype)**: prototype fades every speck together with `a *= 0.93` after the turn ends. Implement **randomized per-speck fade**: random start delay 0–600 ms and random fade duration ~0.6–1.4 s, so specks leave the light one by one. Hard rule: all specks gone ≤ ~2 s after the page settles; clear canvas and stop the rAF loop — no artifacts.
- Cancel the loop on route change / destroy.

## Other interactions
- Hover 0.18s; focus `outline: 2px solid var(--role-accent); outline-offset: 2px`; disabled opacity .5.
- Modals: backdrop click and Esc close (except while deleting).

## State
- `decks: {id, name, format, featuredCardId?, identity?[]}[]` (identity/featured card come with card data).
- UI: `route (list | deck/:id)`, `modal (null | create | edit | delete)`, `form {name, format, error}`, `deleting`, `turning`, `toast`.

## Tokens used
All from the DS / `_tokens.scss`: `--color-bg #14110f`, `--color-surface #1e1a17`, `--color-surface-raised #292320`, `--color-border #3a332e`, `--color-text #f2ede8`, `--color-text-muted #a89e96`, `--color-danger`, `--role-primary/-accent/-tertiary`, `--identity-w/u/b/r/g`, `--glow-title`, `--glow-button`, `--glow-button-text`, `--ring-gradient`, `--halo-gradient`, `--overlay-backdrop`, `--shadow-rest`. Radii 4 / 8 / 10 / 12 (card window) / 14 (sleeves). Type Grenze 600/700 + Karla; sizes xs–2xl.

## Assets
None. Card images later from Scryfall (never cropped/altered). The prototype uses a drag-and-drop slot for testing only.

## Files
- `Decks Hi-fi.dc.html` — hi-fi prototype (desktop 1280×800 + mobile 390×844, state tabs at top).
- `Decks Transições.dc.html` — transition explorations; **4a** is the chosen dust reference.
- `Decks Wireframes.dc.html` — earlier wireframe rounds (context).
- `image-slot.js` — prototype-only helper.
