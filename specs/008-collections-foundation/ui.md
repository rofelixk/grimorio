# UI: Collections Foundation

**Feature**: `008-collections-foundation`. The visual source is `design_handoff_collections_foundation/Colecao.dc.html`: high fidelity, to be rebuilt pixel-perfect. Its README has every measurement. This file fixes structure, states and flow. Values are taken from the handoff and added to DESIGN.md first (FR-026).

## 1. Surfaces

| Surface | New / modified | Where |
|---|---|---|
| Collection area view: list, collection page, holding-box page | **New** (replaces `views/collection`, `collection-detail`, `collection-import`) | `views/collection-area/` |
| Collection row | **New** | `shared/collections/collection-row/` |
| Dashed create row | **New** | `shared/collections/create-row/` |
| Create/edit dialog | **New** | `shared/collections/collection-form-dialog/` |
| Color picker (5/6/5 honeycomb) | **New** | `shared/collections/color-picker/` |
| Delete dialog | **New** | `shared/collections/collection-delete-dialog/` |
| Compact modal shell | **New** DS primitive | `shared/ds/compact-modal/` |
| `<main>` scroll area | Modified: `scrollbar-gutter: stable` | `app.scss` |
| DESIGN.md | Modified: palette, collection components, page transition, copy | root |

The shell (top bar, side nav, drawer, legal notice, toast outlet) is untouched. "Coleção" is already the `/collection` destination.

## 2. Layout per surface

### Page column (all three places)

- Centered, with a maximum width of 760 px. On the list page, while the aside shows (≥ 960 px), it's 1080 px with the grid `minmax(0,1fr) 220px`.
- Padding is `space-5` (`space-4` at ≤ 640 px).
- The content is one flex column with `space-4` gap, inside a height-lock wrapper used by the transition.

### List (`/collection`)

```text
┌ header ─────────────────────────────────────────────────────────┐
│ h1 Coleção                [□ Caixa temporária 37 cartas] [Nova coleção]│  ← tag only while holding > 0; button only > 640px
├ search row (reserved) ──────────────────────────────────────────┤
│ [ Buscar coleções — em breve (disabled) ]  [Filtros (disabled)] │  ← Filtros button only < 960px
├ rows ────────────────────────────────────────┬ aside ≥ 960px ───┤
│ ● Caixa de trocas            ABRIR            │ FILTROS          │
│   1.240 cartas · 85 à venda · 5 subcoleções   │ Busca e filtros  │
│ ● Fichário azul              ABRIR            │ chegam em breve. │
│   …                                           │ (sticky)         │
│ [+ Nova coleção] (dashed, ≤ 640px only)       │                  │
└───────────────────────────────────────────────┴──────────────────┘
```

**Empty state** (no collections and no holding box): only the `h1`, then a centered 360 px section with an eyebrow, an `h2`, the copy, and primary "Criar coleção". The search row and the aside are hidden.

### Collection page (`/collection/{id}`)

```text
nav "Caminho":  Coleção · Caixa de trocas · Azuis        (current = muted, aria-current)
header:         ◉ h1 {name}                     [Editar] [Excluir]   ← phone: actions on own row, 50/50
stats:          [N Cartas] [N À venda] [N Subcoleções]   (3 plates)
meta:           Cor: {Cor} · Nível {n} de 3
content by kind:
  subcollections → eyebrow "Subcoleções", rows, [+ Nova subcoleção] (level < 3)
  cards (1–2)    → eyebrow "Cartas", placeholder plate, [Dividir em subcoleções / As {n} cartas vão para a primeira subcoleção.]
  cards (3)      → eyebrow "Cartas", placeholder plate, "Último nível — guarda só cartas."
  empty          → two plates side by side (stacked on phone):
                   "Guardar cartas" + disabled "Adicionar cartas — em breve"
                   "Dividir" + primary "Nova subcoleção"      (hidden at level 3)
                   note: the either/or rule, or at level 3 "Último nível — guarda só cartas."
```

### Holding-box page (`/collection/caixa`)

The path "Coleção · Caixa temporária", then a hollow-square header with the `h1`, two stat plates (at most 360 px wide), and the copy (at most 52ch). There are no actions and no content slot beyond that.

### Create/edit dialog (in `app-compact-modal`)

```text
[✕]                                     (phone: header = Grimorio wordmark · ✕, hairline)
Nova coleção | Nova subcoleção | Editar coleção | Editar subcoleção
Dentro de {pai}.                        (subcollections only)
[plate: {pai} tem {n} cartas. …]        (create inside a 'cards' parent only)
Nome  [______________]
helper | error                 {n}/40
Cor · {Nome da cor}
   ○ ○ ○ ○ ○
  ○ ○ ○ ○ ○ ○
   ○ ○ ○ ○ ○
                  [Cancelar] [Criar coleção | Criar subcoleção | Salvar | Criar e mover cartas]
```

At > 640 px it's a centered ring, 480 px wide, with the halo. At ≤ 640 px it's full-bleed with no halo, and the buttons stack full-width (`column-reverse`).

### Delete dialog (same shell)

```text
Excluir {nome}?
subtitle (with cards):    {As N subcoleções vão junto.} Há {n} cartas guardadas aqui — escolha o que fazer com elas.
  (radio) Mover para a caixa temporária — As {n} cartas ficam guardadas, …
  (radio) Excluir as cartas — As {n} cartas saem do app. Não dá para desfazer.   (sub-text danger)
subtitle (no cards):      Não há cartas aqui. {As N subcoleções vão junto. | Nada mais é afetado.}
                  [Cancelar] [Excluir coleção | Excluir subcoleção]   (danger)
```

## 3. States

| State | What changes | Requirement |
|---|---|---|
| List, holding > 0 | Header tag shown | FR-016, US5-2 |
| List, holding = 0 | Tag absent | US5-1, US5-4 |
| List, nothing at all | Empty state; search and aside hidden | FR-009, US1-4 |
| Row, empty collection | Meta "Vazia" | US1-7 |
| Row meta | Subcollection part omitted when 0; singular forms | FR-006, FR-007 |
| Collection, kind subcollections | Rows plus create row (level < 3); no card actions | FR-027, US3-6 |
| Collection, kind cards | Placeholder plate plus "Dividir" row (level < 3) | FR-030, FR-029 |
| Collection, kind empty | Two choice plates; "Dividir" hidden at level 3 | US1-7, FR-002 |
| Form, parent holds cards | Move plate; verb "Criar e mover cartas" | FR-029, US3-5 |
| Form, invalid name on submit | Field error replaces the helper; clears on typing; counter turns danger > 40 | FR-003, US2-2/3 |
| Delete, subtree has cards | Two radios, none preselected; confirm `aria-disabled` until a choice | FR-013, US4-2 |
| Delete, no cards | Plain confirmation | FR-012, US4-1 |
| Delete, running | "Excluindo…"; both buttons locked; Esc, backdrop and ✕ ignored | FR-031, US4-7 |
| Delete, done | Dialog closes; toast; navigation to the parent if the page was inside the subtree | FR-031, US4-6 |
| Unknown `ref`, or empty holding box | `replaceUrl` redirect to the list | FR-006 |
| Transition | out 140 ms → swap → in 240 ms, height lock, orbs | handoff "Page transition" |
| Reduced motion | Instant swap, no orbs, no height animation | DESIGN.md Motion |

There is no loading state: data is hydrated before the first render (app initializer).

## 4. Interaction flow

- **List → collection → subcollection**: row click → `router.navigate(['/collection', id])`. Direction +1.
- **Path link or system back**: goes to the parent's address. Direction −1.
- **Holding tag** → `/collection/caixa`. Direction +1.
- **"Nova coleção"**, from the header button, the dashed row or the empty-state button, opens the form dialog in create mode with parent `null`. **"Nova subcoleção"** and **"Dividir em subcoleções"** open it with the current collection as parent.
  - On save, the dialog closes and the new row appears in its sorted place. The person stays on the current page.
- **"Editar"** opens the form in edit mode, prefilled. On save, the dialog closes and the header, path and rows update.
- **"Excluir"** opens the delete dialog, and the view records the subtree and its parent. On confirm it awaits `remove()`:
  1. if the current page is in the subtree, the redirect effect moves to the parent (or the list) as soon as the collection leaves the signal (research R8);
  2. once `remove()` resolves, the dialog closes;
  3. the toast shows.
- **Cancel, ✕, Esc or backdrop** close with no change (except while deleting).
- **Profile switch or sync removal while on a page**: the redirect effect moves to the list.

## 5. Design-system reuse

- **Primitives**:
  - `_controls.scss`: `.btn--primary/--secondary/--ghost/--danger`, `.field*`, `.plate`, `.eyebrow`, `.micro-label`, `.link-btn`.
  - `_tokens.scss`: spacing, radii, motion, `--glow-plate-hover`, `--glow-title`, `--overlay-backdrop`, `--ring-gradient`, `--halo-gradient`, `--wash-header`.
- **Collection row**: it matches DESIGN.md "Action rows", but its lead slot is a 20 px swatch and its accessible name includes the color name. It's a sibling component (`app-collection-row`) rather than an `ActionRow` variant, because ActionRow's name is fixed to "{title}. {meta}." and its lead is a mini wheel or spacer. It shares ActionRow's SCSS values through DESIGN.md.
- **Create row**: the DESIGN.md dashed "create" row, extracted as `app-create-row` because it's used three times.
- **Name field**: `app-text-field` has no counter slot. The form uses the `.field` primitives directly, adding the counter in a helper row. `TextField` is not changed.
- **Dialog shell**: new `CompactModal` (research R10), built from the existing `_ring.scss`/`_face.scss`.
- **Toast**: `ToastService.show('Coleção', text)`.
- **New to DESIGN.md**:
  - the collection palette, with the "swatches only" rule;
  - Collections components: row, create row, holding tag, stats plates, choice plates, color picker, delete radios, compact modal;
  - the page transition and orbs;
  - the reserved-placeholder rule;
  - the collection copy under Content.

## 6. Accessibility

- **Headings**: one `h1` per place. The empty state's title is an `h2`.
- **Path**: `nav aria-label="Caminho"`; the current item has `aria-current="page"`.
- **Rows**: accessible name "{nome}, cor {Cor}. {meta}." The swatch is `aria-hidden`, and the color is always named in text (FR-004).
- **Holding tag**: `aria-label` "Caixa temporária. {n} cartas sem coleção, {s} à venda."
- **Focus after a navigation**: moves to the new `h1` (`tabindex="-1"`), after the in-phase starts, so screen readers announce the place.
- **Dialogs**: native `showModal()` traps focus.
  - The name field autofocuses, and Enter submits.
  - In the delete dialog, focus starts on Cancelar.
  - On close, focus returns to the opener. After a delete that navigated, it goes to the new page's `h1` instead.
- **Color picker**: `role="radiogroup"` labelled "Cor". Swatches are `role="radio"` with `aria-checked`, an `aria-label` and a `title` naming the color. Arrow keys move through the palette order, with roving tabindex.
- **Delete choices**: `role="radiogroup"`. Confirm uses `aria-disabled` (not `disabled`) until a choice is made, so it stays focusable and explains itself.
- **Reserved controls**: they're `disabled`, with the "(em breve)" wording in the accessible name.
- **Motion**: no fade, slide, height animation or orbs under `prefers-reduced-motion`.
- **Width**: everything works from 320 px wide, with 44 px targets.

## 7. Copy (PT-BR, `COLLECTION` in `core/utils/collection-copy.ts`)

All strings are verbatim from the handoff README; `{…}` are interpolations. Counts use `pt-BR` grouping with singular forms ("1 carta", "1 subcoleção").

| Key | Text |
|---|---|
| title | Coleção |
| newCollection / newSubcollection | Nova coleção / Nova subcoleção |
| holdingName | Caixa temporária |
| holdingLabel | Caixa temporária. {n} cartas sem coleção, {s} à venda. |
| holdingCopy | Cartas que ficaram sem coleção quando uma coleção foi excluída. Elas guardam todos os dados. Quando a última sair daqui, esta caixa some sozinha. |
| searchPlaceholder / searchLabel | Buscar coleções — em breve / Buscar coleções (em breve) |
| filters / filtersSoon | Filtros / Busca e filtros chegam em breve. |
| meta | {n} cartas · {s} à venda · {k} subcoleções — or "Vazia" |
| rowLabel | {nome}, cor {Cor}. {meta}. |
| open | Abrir |
| emptyEyebrow / emptyTitle / emptyCopy / emptyCta | Nenhuma coleção ainda / Onde suas cartas moram / Uma coleção é um lugar físico — uma caixa, um fichário, uma pasta. Crie uma para cada um e divida em subcoleções quando precisar. / Criar coleção |
| path | Caminho |
| edit / delete | Editar / Excluir |
| statCards / statSale / statSubs | Cartas / À venda / Subcoleções |
| colorLevel | Cor: {Cor} · Nível {n} de 3 |
| subsEyebrow / cardsEyebrow | Subcoleções / Cartas |
| cardsSoon | A lista das cartas desta coleção chega em breve. Por enquanto, os números acima mostram o que está guardado aqui. |
| split / splitSub | Dividir em subcoleções / As {n} cartas vão para a primeira subcoleção. |
| lastLevel | Último nível — guarda só cartas. |
| keepCards / keepCardsCopy / addCardsSoon | Guardar cartas / As cartas ficam direto nesta coleção. / Adicionar cartas — em breve |
| divide / divideCopy | Dividir / Crie subcoleções — divisórias, páginas, seções. |
| eitherOr | Uma coleção guarda cartas ou subcoleções — o que entrar primeiro define qual. |
| formTitles | Nova coleção · Nova subcoleção · Editar coleção · Editar subcoleção |
| inside | Dentro de {pai}. |
| movePlate | {pai} tem {n} cartas. Uma coleção guarda cartas ou subcoleções — elas vão para esta nova subcoleção. |
| nameLabel / nameHelper | Nome / Uma caixa, um fichário, uma divisória. |
| errEmpty / errLong / errTaken | Dê um nome à coleção. / Use no máximo 40 caracteres. / Já existe uma coleção com esse nome aqui. |
| colorLabel | Cor · {Nome da cor} |
| cancel / close | Cancelar / Fechar |
| verbs | Criar coleção · Criar subcoleção · Salvar · Criar e mover cartas |
| deleteTitle | Excluir {nome}? |
| deleteSubsGo | A subcoleção vai junto. / As {N} subcoleções vão junto. |
| deleteWithCards | Há {n} cartas guardadas aqui — escolha o que fazer com elas. |
| moveOption / moveOptionSub | Mover para a caixa temporária / As {n} cartas ficam guardadas, com todos os dados, até você colocá-las em outra coleção. |
| deleteOption / deleteOptionSub | Excluir as cartas / As {n} cartas saem do app. Não dá para desfazer. |
| deleteNoCards / nothingElse | Não há cartas aqui. / Nada mais é afetado. |
| deleteVerbs / deleting | Excluir coleção · Excluir subcoleção / Excluindo… |
| toastLabel | Coleção |
| toastMoved / toastDeleted / toastEmpty | {nome} foi excluída. {n} cartas foram para a caixa temporária. / {nome} e {n} cartas foram excluídas. / {nome} foi excluída. |

Singular variants of the counted strings (for example "1 carta foi para a caixa temporária.") follow the prototype's `pl()` helper.
