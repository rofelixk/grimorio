# Handoff: Collections foundation (spec 008)

## Overview
The collection area is Grimorio's main feature. It answers "where is this physical card right now". This handoff covers the first slice of `specs/008-collections-foundation/spec.md`:
- the collection area's main view (the list of top-level collections, with their counts);
- create, rename and recolor for collections and subcollections (at most 3 levels);
- delete, with a required choice about the cards (move them to the holding box, or delete them);
- the holding box ("Caixa temporária", provisional name);
- the empty states;
- page-to-page transitions.

Everything is built inside the existing app shell: top bar, side nav or drawer, and legal notice.

**Rule added during design, not yet in the spec:** a collection holds **cards or subcollections, never both**. The type isn't chosen up front; whatever goes in first sets it. The spec needs an amendment (FR-002, FR-007 and FR-010, plus a new FR). Details are under *Interactions*.

## About the design files
The files in this bundle are **design references created in HTML**. They're prototypes showing the intended look and behavior, not production code. The task is to **recreate them in the Grimorio Angular app** (`rofelixk/grimorio`, Angular 22, standalone components, signals, SCSS). Use its existing primitives: `_tokens.scss`, `_controls.scss` (`.btn*`, `.field*`, `.plate`, `.eyebrow`, `.micro-label`, `.link-btn`), `_fio.scss`, `app-action-row`, `app-text-field`, the toast outlet, and the themed-modal ring styles.

Per the brief, **ignore the existing collection / collection-detail / location components and storage** (FR-024). Build new views and services from scratch.

The HTML files load the design system from `_ds/…` paths relative to the design project root. Inside this folder alone they won't style correctly, so use them together with this README.

## Fidelity
- `Colecao.dc.html` is **high fidelity**. It's a clickable prototype with final colors, type, spacing, copy and motion. Recreate it pixel-perfectly.
- `Colecao Wireframes.dc.html` is **low fidelity**: 7 rounds of exploration. Round 3a became the list, round 4 the other screens, round 5 the cards-or-subcollections rule, and round 7a the color picker. It's context only.

---

## Screens / views

All views render inside `<main>` (the shell's only scroll container).

**Page column:**
- `max-width: 760px`, or `1080px` when the filter aside is shown (wide screens with search reserved).
- Centered, padding `--space-5` (1.5rem); `--space-4` at ≤640px.
- Grid columns: `minmax(0,1fr) 220px` when the aside is shown, else `minmax(0,1fr)`. Gap `--space-6`.
- Content stack: flex column, gap `--space-4`.
- **Page title:** `h1` Grenze 600, 2rem/1.1, `text-shadow: var(--glow-title)`, `text-wrap: balance` (same as `game-modes.scss .page-title`).

### 1. Collection area — list (route suggestion `/collection`)

**Header row** (flex, wrap, align center, gap `--space-3`):
- The `h1` "Coleção" takes `flex: 1`.
- **Holding-box tag** (only while the holding box holds ≥1 card):
  - Button: min-height 44px, padding `0 --space-3`, `1px solid --color-border`, radius 4px, transparent background, 0.875rem.
  - Content: a 10×10 hollow square (`1px solid --color-text-muted`, radius 2px), then bold "Caixa temporária", then a muted count ("37 cartas").
  - Hover: border `--role-primary`, 0.18s.
  - `aria-label`: "Caixa temporária. 37 cartas sem coleção, 4 à venda."
  - Opens the holding-box view.
- **"Nova coleção"** as `.btn.btn--primary` (the glow button, never filled). Wide and tablet (>640px) only.

**Search row** (reserved for a future spec; controlled by the `reserveSearch` flag):
- A disabled `.field__input` at `opacity: .5`, placeholder "Buscar coleções — em breve".
- At <960px it's followed by a disabled `.btn.btn--secondary` "Filtros".
- At ≥960px, filters live in the **right-hand aside** instead, not on the left, so they stay clear of the side nav:
  - sticky `top: --space-5`, `padding-left: --space-5`, `border-left: 1px solid --color-border`, min-height 240px;
  - contents: `.eyebrow` "Filtros" and a muted 0.875rem line "Busca e filtros chegam em breve."

**Collection rows** (flex column, gap `--space-2`). Each row follows the `app-action-row` spec:
- Full-width button, min-height 56px, padding `--space-2 --space-3`, `1px solid --color-border`, radius 8px.
- Background `linear-gradient(--color-surface-raised, --color-surface)`.
- Hover and focus: border `--role-primary` and `box-shadow: --glow-plate-hover`, 0.18s standard easing.
- Lead: a 20px color swatch circle. Carvão also gets `1px solid #6b635c` so it reads against the page.
- Text: the name (700, one line, ellipsis) over the meta line (0.75rem, muted).
- Trailing `.micro-label` "Abrir".
- Meta format: "1.240 cartas · 85 à venda · 5 subcoleções", with pt-BR number formatting and singular forms ("1 carta", "1 subcoleção"). The subcollection part is left out when there are none. A collection with no cards and no subcollections shows "Vazia".
- Counts roll up the whole subtree (FR-007). The subcollection count covers every level.
- `aria-label`: "{nome}, cor {Cor}. {meta}." The color is named in text, never shown by color alone.
- Sort order: `localeCompare(…, 'pt-BR', {sensitivity:'base'})` (FR-008).

**Phone (≤640px):** the header button is hidden. The list ends with a **dashed create row**:
- Same size as a list row, but `1px dashed --color-border`, transparent background, muted text.
- "+" in a 36px centered slot, then bold "Nova coleção".
- Hover: text `--color-text`, border `--role-accent`.

### 2. Empty state (no collections and no holding box; FR-009)
- The header shows only the `h1`. Search and aside are hidden.
- A centered section, max-width 360px, margin `--space-6 auto`, gap `--space-4`, containing:
  - `.eyebrow` "Nenhuma coleção ainda"
  - `h2` Grenze 600 1.5rem with the title glow: "Onde suas cartas moram"
  - muted 0.875rem copy: "Uma coleção é um lugar físico — uma caixa, um fichário, uma pasta. Crie uma para cada um e divida em subcoleções quando precisar."
  - `.btn--primary` "Criar coleção"

### 3. Inside a collection (route suggestion `/collection/:id`; FR-006)
- **Breadcrumb** (`nav aria-label="Caminho"`): `.link-btn` links for "Coleção" and each ancestor, separated by a muted "·". The current name is muted text with `aria-current="page"`. Margin-bottom `-var(--space-3)`.
  - Don't use "›", "‹" or "/". The design system only allows ✕ and +.
- **Header** (flex, wrap, gap `--space-3`):
  - a 24px swatch with `box-shadow: 0 0 16px {hex}66`;
  - the `h1` name (`overflow-wrap: anywhere`, so long names wrap here);
  - actions `.btn--secondary` "Editar" and `.btn--danger` "Excluir". On phone they drop to their own row at 50/50.
- **Stats:** a 3-column grid of `.plate`s, each a Grenze 600 1.5rem number over a `.micro-label`: "Cartas", "À venda", "Subcoleções".
- A muted 0.75rem line: "Cor: {Cor} · Nível {n} de 3".
- **Content, depending on the rule:**
  - **Has subcollections:** `.eyebrow` "Subcoleções", then rows (same component as the list), then the dashed row "+ Nova subcoleção" while the level is below 3. No "add cards" action.
  - **Has cards (level 1–2):** `.eyebrow` "Cartas", then a muted `.plate`: "A lista das cartas desta coleção chega em breve. Por enquanto, os números acima mostram o que está guardado aqui." Then a dashed row with "Dividir em subcoleções" and a sub-line "As {n} cartas vão para a primeira subcoleção."
  - **Has cards at level 3:** the same plate, plus the muted line "Último nível — guarda só cartas."
  - **Empty:** two `.plate` choices side by side (stacked on phone), padding `--space-4`:
    - "Guardar cartas": "As cartas ficam direto nesta coleção." and a disabled secondary button "Adicionar cartas — em breve".
    - "Dividir": "Crie subcoleções — divisórias, páginas, seções." and `.btn--primary` "Nova subcoleção". Hidden at level 3.
    - Note underneath: "Uma coleção guarda cartas ou subcoleções — o que entrar primeiro define qual." At level 3 the note reads "Último nível — guarda só cartas."

### 4. Holding box (route suggestion `/collection/caixa`; FR-016, FR-017)
- Breadcrumb "Coleção · Caixa temporária".
- Header: a 24px hollow square (`1px solid --color-text-muted`, radius 4px) and the `h1` "Caixa temporária".
- Two stat plates, "Cartas" and "À venda", max-width 360px.
- Copy (max 52ch): "Cartas que ficaram sem coleção quando uma coleção foi excluída. Elas guardam todos os dados. Quando a última sair daqui, esta caixa some sozinha."
- **No actions:** it can't be edited, deleted or nested.
- If it's opened while empty, redirect to the list.

### 5. New / edit collection dialog
**Shell:**
- Desktop and tablet (>640px): the themed-modal ring, but narrow.
  - Ring: `width: min(480px, 100vw - 2rem)`, padding 2px, radius 10px, `background: var(--ring-gradient)`, `spin-angle` 28s linear.
  - Halo: `inset: -32px`, radius 70px, blur 26px, `--halo-gradient`, spin plus `flicker` 6s.
  - Face: `--color-bg`, radius 8px, `--shadow-rest`, `max-height: calc(100vh - 4rem)`.
  - Close row with a 44×44 "✕" (`aria-label="Fechar"`).
  - Body padding `0 --space-6 --space-6`, gap `--space-4`.
  - Backdrop `--overlay-backdrop`. Esc, the backdrop and ✕ all close it.
- Phone (≤640px): full-bleed, no ring gap and no halo.
  - Header: the "Grimorio" wordmark (Grenze 700 1.25rem, `--role-primary`, title glow) and ✕. Hairline below, `--wash-header` background.
  - Body padding `--space-5`.
  - Buttons stack full-width (`column-reverse`).

**Title** (Grenze 600, 2rem, 1.5rem on phone, title glow):
- "Nova coleção", "Nova subcoleção", "Editar coleção" or "Editar subcoleção".
- Subtitle (for subcollections): "Dentro de {pai}."

**Move notice** (creating a subcollection inside a collection that has cards): a muted `.plate` reading "{pai} tem {n} cartas. Uma coleção guarda cartas ou subcoleções — elas vão para esta nova subcoleção." The submit button becomes "Criar e mover cartas".

**Name field** (`.field`):
- Label "Nome".
- `.field__input`, autofocused, Enter submits.
- Below it: the helper "Uma caixa, um fichário, uma divisória." on the left, or the `.field__error` in its place; a live "{n}/40" counter on the right (turns danger when over 40).
- Validation runs on submit, and the error clears as the person types. The name is trimmed first.
  - empty → "Dê um nome à coleção."
  - longer than 40 → "Use no máximo 40 caracteres."
  - same as a sibling, ignoring case and surrounding spaces → "Já existe uma coleção com esse nome aqui."

**Color picker: 5/6/5 honeycomb** (`role="radiogroup"`, centered):
- Label: "Cor · {Nome da cor}", with the color name muted.
- Rows have gap 6px; swatches in a row have gap 12px. Rows 1 and 3 are indented 24px, so they sit in the gaps of the middle row.
- Each swatch: a 36px circular `button role="radio"` with `aria-label` and `title` set to the color name.
- Selected: `box-shadow: 0 0 0 3px var(--color-bg), 0 0 0 4px {hex}, 0 0 20px {hex}80`, transition 0.5s. Carvão uses `#8a837e` for the 1px ring.
- FR-005 preselection: the first palette color not already used by a sibling, in palette order.

**Actions:** `.btn--ghost` "Cancelar", then `.btn--primary` with the verb: "Criar coleção", "Criar subcoleção", "Salvar" or "Criar e mover cartas".

### 6. Delete dialog (FR-012, FR-013)
- Same dialog shell. Title: "Excluir {nome}?"
- **With cards in the subtree:**
  - Subtitle: "{As N subcoleções vão junto.} Há {n} cartas guardadas aqui — escolha o que fazer com elas."
  - Two radio rows. Each is a full-width button with padding `--space-3`, radius 8px, the row gradient, and an 18px radio indicator (1px border, inset 4px `--color-bg` ring, fill when selected):
    - **"Mover para a caixa temporária"**, sub-text "As {n} cartas ficam guardadas, com todos os dados, até você colocá-las em outra coleção." Selected: border and fill `--role-primary`, plus `--glow-plate-hover`.
    - **"Excluir as cartas"**, sub-text in `--color-danger`: "As {n} cartas saem do app. Não dá para desfazer." Selected: border and fill `--color-danger`.
  - **Nothing is selected by default.** The confirm button stays `aria-disabled` until a choice is made.
- **Without cards:** subtitle "Não há cartas aqui. {As N subcoleções vão junto. | Nada mais é afetado.}"
- **Actions:** `.btn--ghost` "Cancelar", then `.btn--danger` "Excluir coleção" or "Excluir subcoleção".
  - While running: the label becomes "Excluindo…", both buttons lock, and the dialog can't be closed.
- **After it finishes:** show a toast, labelled "Coleção" (`.micro-label`):
  - moved: "{nome} foi excluída. {n} cartas foram para a caixa temporária."
  - deleted: "{nome} e {n} cartas foram excluídas."
  - empty collection: "{nome} foi excluída."

  If the current page was inside the deleted subtree, go to the deleted collection's parent, or to the list for a top-level collection.

---

## Interactions & behavior

**Navigation:**
- Each collection and the holding box has its own address.
- Browser back returns to the level above, and a reload stays on the same page.
- A collection that doesn't exist (or belongs to another profile), or an empty holding box, redirects to the list (FR-006).
- A new page starts scrolled to the top, following the shell's existing router rule.

**Page transition** (between list, collection and holding box):
1. **Out** (140ms): the content column goes to opacity 0 and `translateX(-dir*8px)`, standard easing.
2. **Swap:** the view is replaced. The content starts at opacity 0 and `translateX(dir*12px)` with no transition.
3. **In** (240ms): the content goes to opacity 1 and `translateX(0)`.
   - `dir = +1` when going deeper (or sideways), `-1` when going up.
4. **Height, to avoid flicker:**
   - Before "out", measure the content height and lock the column to it (`overflow: hidden`).
   - After the swap, measure the new height (from an inner wrapper) and transition to it in 240ms.
   - Release to `auto` about 280ms later.
   - `<main>` also gets `scrollbar-gutter: stable`, so the scrollbar appearing doesn't shift the layout.
5. **Light orbs** (they start with "out" and last about 1.5s):
   - 13 orbs in a `position:absolute; inset:0; pointer-events:none; overflow:hidden; mix-blend-mode:screen` layer over `<main>`.
   - Size 2–6.4px (`(5 + r*11) * 0.4`).
   - Colors cycle through the profile's `--role-primary`, `--role-accent` and `--role-tertiary`.
   - Fill: `radial-gradient(circle, c 0%, c/67% 40%, transparent 72%)`, with a glow of `0 0 {1.6*size}px {0.4*size}px c/40%`.
   - Start position: left 8–63% (going deeper) or 35–90% (going up); top 10–80%.
   - Keyframe `grm-orb`: 0% at opacity 0 and scale .5; 25% at opacity 1; 100% at opacity 0 and `translate(dx, dy)` with scale 1.1.
     - `dx = dir*(50…160)px`, `dy = -(15…75)px`.
     - Duration 750–1250ms, delay 0–220ms, standard easing.
6. **`prefers-reduced-motion`:** no fade, slide, height animation or orbs. This matches the global rule.

**Rule, cards or subcollections:**
- A collection with subcollections never receives cards directly.
- A collection with cards that gets its first subcollection moves all its direct cards into that new subcollection, with the explicit copy described above.
- When the last subcollection is deleted, the parent becomes empty and can take either again.
- Level 3 holds only cards.
- **The spec needs updating for this.**

**Other behavior:**
- **Side nav** (≥960px): the existing `app-side-nav`, a 24px rail that widens to 232px on hover or focus. "Coleção" is the current destination.
- **Drawer** (<960px): the existing drawer, opened from the top bar's "Menu".
- **Toast:** the existing toast outlet, dismissed after about 6s or with ✕.

## State management (suggested)
- **`CollectionStore`** (per active profile, local-first, per the spec's storage FRs):
  - `collections: {id, profileId, name, color, parentId|null, updatedAt}[]`. **No counts and no card lists are stored** (FR-020).
  - Derived: `children(id)`, `subtree(id)`, `depth(id)`, `totals(id) → {cards, sale, subs}` (computed from owned cards by collection reference), and `holding → {cards, sale}` (cards with no collection or a missing one).
  - Commands:
    - `create(parentId, name, color)`: if the parent has direct cards, move them in the same transaction.
    - `rename`, `recolor`.
    - `delete(id, choice: 'move'|'delete')`: all-or-nothing, and writes the deletion markers needed for sync.
- **View state:**
  - `view: list | col(id) | holding` (from the router);
  - `form: {mode, parentId, id?, name, color, error} | null`;
  - `del: {id, choice: null|'move'|'delete', busy} | null`;
  - transition `phase: out|pre|in`, `dir`, `lockH`, `burst`.

## Design tokens

**Tokens from `src/styles/_tokens.scss` (already in the app):**
- **Neutrals:** bg `#14110f`, surface `#1e1a17`, raised `#292320`, border `#3a332e`, text `#f2ede8`, muted `#a89e96`.
- **Danger:** `oklch(0.72 0.16 28)` on `oklch(0.27 0.06 28)`.
- **Roles:** `--role-primary/-accent/-tertiary`, resolved from the profile's identity. The default is R → U → G.
- **Type:**
  - Grenze 600 for titles; 700 for the wordmark.
  - Karla 400/700.
  - Sizes 0.75, 0.875, 1, 1.25, 1.5, 2rem.
  - Tracking 0.05em (micro labels), 0.14em (eyebrows).
- **Spacing:** 0.25, 0.5, 0.75, 1, 1.5, 2rem.
- **Sizes:** touch target 44px, list row 56px.
- **Radii:** 4px controls, 8px containers, 10px ring, 50% swatches.
- **Motion:** easing `cubic-bezier(0.4,0,0.2,1)`; 0.18s hover, 0.24s base, 0.5s swatch.

**New, to add to DESIGN.md (FR-004, FR-026): the collection palette of 16 named colors.** Swatches only, never UI chrome. Always name the color in text.

| Row | Name | Hex |
|---|---|---|
| 1 | Branco | `#d8cdb0` |
| 1 | Azul | `#3d6b85` |
| 1 | Violeta | `#7c5aa6` |
| 1 | Vermelho | `#a8402c` |
| 1 | Verde | `#4c7a43` |
| 2 | Carvão | `#3a3531` (plus 1px `#6b635c` outline) |
| 2 | Névoa | `#a3b4b6` |
| 2 | Anil | `#565f99` |
| 2 | Vinho | `#7a3553` |
| 2 | Ocre | `#7d5c2e` |
| 2 | Sálvia | `#a6b07c` |
| 3 | Cinza | `#8a837e` |
| 3 | Turquesa | `#2e8279` |
| 3 | Rosa | `#d197a0` |
| 3 | Laranja | `#c86a28` |
| 3 | Dourado | `#cfab45` |

How the palette was chosen:
- **Row 1:** the five identity colors (W U B R G). The B tone is named "Violeta" here so it isn't confused with Carvão.
- **Row 2:** the colors between each neighboring pair on the wheel (W–U, U–B, B–R, R–G, G–W), plus a true dark.
- **Row 3:** common colors the wheel doesn't cover.
- **Separation:** tones were pushed apart so neighbors don't look alike (Ocre darker, Vinho darker, Névoa and Sálvia lighter).

## Copy (PT-BR, to add to the copy file)
The exact strings are all given above, inline with each screen. Shell strings come from the existing `SHELL`, `SYNC_AREA` and `NOTICE` entries.

## Assets
None. There are no icons, images or Magic symbols. The only glyphs are ✕ and +, per the design system.

## Reserved space for future features (build it now)
These slots have **no working feature yet**, but they MUST ship in this slice so later specs drop in without changing the layout. All are visible and disabled or muted; none pretend to work.

| Slot | Where | Size / style | Copy | Future spec |
|---|---|---|---|---|
| Collection search | List page, row under the header, full width of the content column | Disabled `.field__input` (min-height 44px, `opacity:.5`, `cursor:not-allowed`), flex:1 | placeholder "Buscar coleções — em breve", `aria-label` "Buscar coleções (em breve)" | Search |
| Filters button (narrow) | Same row, right of search, **<960px only** | Disabled `.btn.btn--secondary`, 0.875rem | "Filtros" | Filters |
| Filters aside (wide) | **Right** column of the page grid, **≥960px only**. It's on the right so it doesn't fight the side nav on the left. | Column 220px (grid `minmax(0,1fr) 220px`, gap 2rem, page max-width 1080px). Sticky `top:1.5rem`, `padding-left:1.5rem`, `border-left:1px solid --color-border`, min-height 240px | `.eyebrow` "Filtros"; muted 0.875rem "Busca e filtros chegam em breve." | Filters |
| Card list | Inside a collection that holds cards, under `.eyebrow` "Cartas" | Muted `.plate`, full width | "A lista das cartas desta coleção chega em breve. Por enquanto, os números acima mostram o que está guardado aqui." | Cards |
| Add cards | Empty collection, "Guardar cartas" choice plate | Disabled `.btn.btn--secondary`, left-aligned | "Adicionar cartas — em breve" | Cards |
| Holding-box card list | Holding-box page, under the copy | No slot yet. The page ends after the copy; the list will go below it. | — | Cards |

Rules:
- Search and filters are hidden in the empty state (no collections and no holding box). They're shown only on the list page, not inside a collection.
- Keep the 220px aside column even while it only holds the placeholder. Collapsing it would change the width of the list rows when filters arrive.
- The prototype has a `reserveSearch` tweak (default **on**) so you can compare the page with and without the reserved space. Production ships with it on.

## Open items
- **Holding box name:** "Caixa temporária" is provisional; the spec says it's decided with DESIGN.md.
- **Card list and adding cards:** placeholders until the card spec.
- **Search and filters:** placeholders until a later spec.
- **Spec amendment:** the cards-or-subcollections rule, and what happens when the last subcollection is deleted.

## Files
- `Colecao.dc.html`: the hi-fi interactive prototype. Its tweaks are profile identity, start empty, and reserve search/filters.
- `Colecao Wireframes.dc.html`: all the wireframe rounds. The chosen options were 3a, 4a–e, 5a–e and 7a.
- Source spec: `specs/008-collections-foundation/spec.md`.
- Shell files read for fidelity:
  - `src/app/app.html`, `src/app/app.scss`
  - `shared/layout/{top-bar,side-nav,nav-links,nav-drawer,profile-control,sync-status,legal-notice}`
  - `shared/ds/{action-row,toast,themed-modal}`
  - `src/styles/{_tokens,_fio,_controls}.scss`
  - `core/utils/entry-copy.ts`
