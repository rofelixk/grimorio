# UI Design: Cards

Phase 1 for [plan.md](plan.md). The visual source is `design_handoff_cards/`: the README, `UPDATE-D1b-duplicata-multipla.md` and the `.dc.html` mocks (high fidelity, desktop first). This file fixes structure, the phone layout the handoff leaves open, states, flow, reuse, accessibility and copy. Exact values (px, tokens, timings) are the handoff's and move into DESIGN.md (§5).

## 1. Surfaces

| Surface | New / modified | Component |
|---|---|---|
| Collection page: cards, empty and subcollections kinds | modified | `views/collection-area` |
| Holding box page | modified (read-only grid) | `views/collection-area` |
| Card grid and card tile (list, holding box, search results) | new | `shared/cards/card-grid`, `card-tile` |
| Display-mode toggle | new | `shared/cards/card-view-toggle` |
| Search modal ("Adicionar cartas") | new | `shared/cards/card-search-modal` |
| Add / edit card modal | new | `shared/cards/card-modal` |
| Duplicate notice (D1a / D1b, add and edit) | new | `shared/cards/duplicate-notice` |
| "Carta adicionada em outra coleção" notice | new | `shared/cards/moved-notice` |
| Custom dropdown | new DS primitive | `shared/ds/select-list` |
| "À venda" checkbox | new control primitive | `.check` in `_controls.scss` |
| Compact modal | modified (`size`, toast outlet) | `shared/ds/compact-modal` |
| Toasts "Carta adicionada" / "Carta atualizada" / "Nada foi salvo" | reuse | `ToastService` |

## 2. Layout per surface

### 2.1 Collection page (all three kinds) and holding box, wide (≥ 960px)

1080px column, grid `minmax(0,1fr) 220px`, gap `space-6`, padding `space-5`. Every collection page and the holding box use it (the handoff shows the same summary in all four states).

```
┌──────────────────────────────────────────────────────────┬──────────────────────┐
│ STICKY HEADER (bg, z 2)                                  │ SIDE COLUMN (sticky) │
│ Coleção · Pai · Nome                    [Editar][Excluir]│ 128 cartas · 6 à venda│
│ ■ Nome (h1)                                              │ ──────────────────── │
│ (o) Só imagens ( ) Com detalhes          [Adicionar cartas]│ BUSCAR E FILTRAR     │
├──────── 32px fade ───────────────────────────────────────┤ [Buscar cartas] (off)│
│ CARD GRID (6 or 4 columns)                               │ Filtros em breve.    │
│ …                                                        │                      │
└──────────────────────────────────────────────────────────┴──────────────────────┘
```

**The path row**: Editar and Excluir move from beside the title to the right end of the path row (handoff A1). On the holding box, the path has no buttons.

**Below the sticky header, by kind**:
- **cards**: the list bar, then the grid.
- **empty (A2)**: no list bar. The two choice plates sit side by side, followed by the note "Uma coleção guarda cartas ou subcoleções — nunca os dois."
  - "Guardar cartas aqui" holds a primary "Adicionar cartas".
  - "Dividir em subcoleções" holds a secondary "Nova subcoleção". This plate is hidden at level 3, and the note then reads "Último nível: esta coleção só guarda cartas."
- **subcollections (A3)**: no list bar. The `Subcoleções` eyebrow, the collection rows, then the dashed "+ Nova subcoleção" (hidden at level 3). The 008 stat plates are removed.
- **holding (A4)**: a hollow 24px square, the title, then the toggle (no "Adicionar cartas"), the read-only note, and the grid.

**The 008 split row**: 008 showed the dashed "Dividir em subcoleções" row (sub "As {n} cartas vão para a primeira subcoleção.") under the card list, and it is the only way to split a collection that holds cards. The handoff A1 has no place for it, since the grid can be thousands of cards long. It moves to the side column, below "Filtros em breve.", separated by `space-5`. On phone it goes below the list bar. At level 3 it is replaced by the "Último nível" meta, as in 008. (*A placement the handoff doesn't show; flagged in plan.md.*)

**Side column summary**: "{n} cartas · {s} à venda" for the collection's subtree (or for the holding box). Subcollections are never counted there.

### 2.2 Phone (< 640px) and mid (640–959px)

- **One column, no side column**:
  - the path row (Editar and Excluir drop to their own 50/50 row on phone, as in 008);
  - the title;
  - the summary line;
  - the list bar (toggle, then "Adicionar cartas" full width on phone);
  - the disabled search `field__input` (+ the disabled "Filtros" button, as on the list page);
  - the grid.
- **Header**: not sticky (R17).
- **Grid columns**:

  | Width | Só imagens | Com detalhes |
  |---|---|---|
  | phone | 3 | 2 |
  | 640–959 | 5 | 3 |
  | ≥ 960 | 6 | 4 |

- **Empty-state plates**: stacked.

### 2.3 Card tile (5b)

- **Image**: 5:7, 1px border, 6px radius (6 6 0 0 while details show).
- **Details plate**, glued under the image (`margin-top: -1px`):
  - line 1: `SET · nº` and `Acabamento · Idioma · Condição`;
  - line 2: `À venda` micro-label (only when for sale) and `×{qtd}`.
- **Só imagens**: the plate is an absolutely positioned overlay shown on hover or focus-visible, so it never moves the grid.
- **Com detalhes**: the plate is in flow inside a `grid-template-rows: 0fr → 1fr` wrapper, so the toggle animates rows open and closed (0.32s).
- **No image**: a gradient placeholder of the same shape, with the card name in it as visible muted text (it doubles as the alt text).

### 2.4 Search modal (B)

`CompactModal size="wide"`: 720px, fixed 640px face, profile roles. On phone it goes full-bleed with the wordmark header.

```
Adicionar cartas                                        ✕
Nome da carta
[Ex.: sol ring                                   ]
Mínimo de 3 caracteres.
┌ results area (scrolls, thin scrollbar, padding space-3) ┐
│ 5 columns of image tiles (3 on phone) … sentinel        │
│ state messages / plates                                  │
└──────────────────────────────────────────────────────────┘
```

### 2.5 Card modal (C)

`CompactModal size="split"`, 880px, colored by `cardPalette(colorIdentity)`.

**Wide**:

```
┌ left 300px (wash-header, border-right) ┬ right ─────────────────────────────── ✕ ┐
│ [printing image 5:7]                   │ ADICIONAR CARTA / EDITAR CARTA            │
│ Buscar set  [Nome ou código do set]    │ Card name (Grenze xl, glow)               │
│ Impressão   [SelectList ▾]             │ type line ··················· artist      │
│   (listbox: 28px thumb, Set · CODE · nº│ ───────────────────────────────────────── │
│    / artist; error + Tentar de novo)   │ Acabamento [▾]     Idioma [▾]             │
│                                        │ Condição  [▾]      Quantidade [  1 ]      │
│                                        │ Notas [textarea, 2 lines]                 │
│                                        │ ───────────────────────────────────────── │
│                                        │ [□ À venda]   Cancelar · Salvar e adicionar│
│                                        │               outra · Salvar              │
└────────────────────────────────────────┴───────────────────────────────────────────┘
```

**Phone**: full-bleed, one column, in this order:
1. eyebrow;
2. name;
3. type and artist;
4. the image, centered at most 200px wide;
5. Buscar set;
6. Impressão;
7. the fields in one column;
8. Notas;
9. À venda;
10. the buttons stacked full width (`column-reverse`: Salvar on top).

### 2.6 Duplicate notice (D1a / D1b)

`CompactModal` (480px), card palette, ✕.

**D1a, one match**:
1. Title "Você já tem esta carta".
2. Subtitle with the collection.
3. The match's plate: 36px thumbnail, name, meta, `×qtd`, collection micro-label.
4. Two radio rows.
5. Cancelar · Continuar.

**D1b, two or more matches**:
1. Title "Você já tem esta carta em {n} lugares".
2. Subtitle.
3. The "Onde ela está" `SelectList`: 22px thumbnail, collection, `×qtd`.
4. Two radio rows.
5. Cancelar · Continuar.

**The edit variant**: different subtitle and second option ("Manter as duas linhas"). It names both cards' details: the edited card's line above the match plate, or in D1b above the dropdown.

### 2.7 Moved notice

`CompactModal [locked]` in `rolesFromHex(destination.color)`:
1. Title.
2. The sentence.
3. The card row with the subcollection micro-label.
4. Primary "Ok", which on phone is the only action. The ✕ is hidden because the modal is locked.

## 3. States

| Surface | State | What shows | Req |
|---|---|---|---|
| Collection page | cards | sticky header + toggle + Adicionar + grid + side summary | FR-002, FR-030, FR-031 |
| | empty | choice plates, Adicionar enabled | FR-003, US2-4 |
| | subcollections | rows, no grid, no Adicionar | FR-004, US2-3 |
| | holding | grid read-only, note, no Adicionar, tiles not interactive | FR-029, US2-6 |
| Grid | images / details | 6 / 4 columns, overlay on hover / in-flow plate | FR-030 |
| Tile | no image | placeholder with name | FR-002, US2-2 |
| | hover / focus-visible | border, halo, scale 1.08, one dust burst per pointer entry (none on focus) | FR-032 |
| | reduced motion | static colored border, no spin and no dust; the scale is kept as an instant transform | FR-032 |
| Search | idle | "Busque uma carta pelo nome…" | FR-009, US1-1 |
| | short | "Digite pelo menos 3 caracteres para buscar." | US1-2 |
| | loading | 10 placeholder tiles + "Buscando…" | FR-009 |
| | ok | grid; sentinel | FR-007 |
| | loadingMore | "Carregando mais…" after the grid | FR-009 |
| | moreFailed | plate "Não foi possível carregar mais cartas." + Tentar de novo; results kept | FR-009 |
| | empty | "Nenhuma carta encontrada para “{texto}”…" | edge case |
| | offline | plate "Sem conexão…" + Tentar de novo | FR-024 |
| | failed | plate "Não foi possível acessar o catálogo…" + Tentar de novo | FR-025 |
| Card modal | loading printings (add) | image placeholder; Impressão trigger disabled showing "Carregando impressões…"; fields enabled; Salvar disabled until a printing exists | FR-010 |
| | load failed (add) | the whole left pane shows the error plate + Tentar de novo; Salvar disabled (no printing to save) | FR-024 |
| | ready | initial printing selected | FR-010 |
| | edit, printings failed | current printing kept in the trigger; listbox shows the error + Tentar de novo; save enabled | FR-024 |
| | quantity invalid | `field__error` "Use um número inteiro de 1 a 9.999.", `aria-invalid`, both save buttons disabled | FR-013 |
| | set filter matches nothing | listbox shows "Nenhum set encontrado." (the selected printing is kept) | FR-010 |
| | no artist | the artist is simply not shown | edge case |
| Duplicate | D1a / D1b; add / edit | §2.6 | FR-015, FR-019 |
| Moved | — | §2.7 | FR-017 |

## 4. Interaction flow

```
Collection page ──[Adicionar cartas]──► Search modal ──[pick result]──► Card modal (add)
      ▲                                    ▲   │✕                         │
      │                                    │   └──► page                  ├─ Cancelar/Esc/✕ ──► Search (state kept)
      │                                    │                              ├─ Salvar e adicionar outra ─┐
      │                                    └──── toast "Carta adicionada" ◄────────────────────────────┤
      └──────────── both close, toast ◄──────────────────────── Salvar ────────────────────────────────┤
                                                                  │ match?  ──► Duplicate notice
                                                                  │              ├ Cancelar ──► Card modal (values kept)
                                                                  │              └ Continuar ──► write → (as above)
                                                                  │ gained subs? ──► write to firstLeaf → Moved notice ─Ok─► (as above)
                                                                  └ collection gone ──► all close, toast "Nada foi salvo"
Collection page ──[tile]──► Card modal (edit) ──Salvar──► (match? Duplicate edit) ──► close + toast "Carta atualizada"
```

- **After the moved notice**: "Ok" continues where the save was headed. After "Salvar e adicionar outra" it returns to the search, which still targets the opened collection, so the next save resolves the destination again. After "Salvar" both modals close.
- **Focus on close**: closing any modal restores focus to its opener: the search field after the card modal, the tile after an edit, "Adicionar cartas" after the search.
- **Collection deleted**: deleting the collection elsewhere (sync, other tab) while any card modal is open closes all of them and shows the toast. The area's redirect navigates.
- **After saving**: the grid updates at once. The new card appears first (`addedAt`). An edit or merge leaves the tile in place.

## 5. Design-system reuse and additions

### Reused

- Tokens.
- `.btn` variants, `.field`/`.field__input`/`.field__label`/`.field__error`, `.plate`, `.eyebrow`, `.micro-label`, `.link-btn`.
- `CompactModal`, `FluidHeight`, `focus.ts`, `RovingRadios` (toggle and notice radios).
- `CollectionRow`, `CreateRow`, `ToastService`/`ToastOutlet`.
- The `spark` and `spin-angle` keyframes and `@property --spin-angle`, all already in `_tokens.scss`.
- The page sweep (the card grid is ordinary page content).
- The radio rows reuse the delete dialog's radio-row recipe (DESIGN.md "Delete radios"), with role-primary selection.

### New, justified, each recorded in DESIGN.md before it is built

- **Card colors**: silver, gold and neutral, as an Identity Rule exception (R12).
- **Cards section**: page layout v2 (sticky header, side summary, the Editar/Excluir position), tile 5b, the toggle, grid columns per breakpoint, the hover recipe, the empty plates (enabled), the holding grid, and an amended "Reserved placeholders": the card-list placeholder and the disabled Adicionar are removed.
- **Motion**: card hover (0.24s; spin 6s; halo; dust: 10 specks, 3.6s, 70ms stagger, 30px × jitter 0.7–1.5), details toggle 0.32s, and reduced-motion behavior.
- **Compact modal**: the `wide` (720, fixed 640 face) and `split` (880, two panes) sizes; the toast outlet.
- **Select list**: trigger, chevron (a 7px rotated border square, no glyph), listbox, option, selected and open states. Native selects can't render thumbnails (R15).
- **Check (`.check`)**: an 18px box with a 10px role-primary inner square, no ✓ glyph (handoff C5).
- **Card modal, search modal, duplicate and moved notices**: component entries.
- **Single 1px rule**: the card modal uses a single 1px rule (`border-top`), not `.divider` (handoff C2).

### Deviation from the handoff

The handoff asks for toasts in the collection's color. They follow their host's roles (the profile at the app root and in the search modal), as `ToastOutlet` does everywhere (R14).

## 6. Accessibility

- **Grid**:
  - each tile is a `<button>` (editable) with accessible name "{nome}, {SET} {nº}, {acabamento}, {idioma}, {condição}, {qtd} cópias[, à venda]. Editar.";
  - on the holding box, a non-focusable `<div role="img">` with the same description minus "Editar";
  - images are `alt=""` because the name is on the tile;
  - the dust is `aria-hidden`.
- **Search results**: each result is a `<button>` named "{nome} — {tipo}" (FR-008). On a new result set, the grid is announced through a polite live region with "{n} cartas encontradas" or "mais de 100 cartas", and each state message also goes there.
- **Toggle**: a `role="radiogroup"` labelled "Exibição", with roving tabindex and 44px targets.
- **Focus on open**:
  - search modal: the name field (`data-autofocus`);
  - card modal: the Impressão trigger on add, the first field on edit;
  - notices: the preselected radio or the "Ok".
- **Focus trapping and Esc**: focus stays in the top dialog (native). Esc closes the top layer only; with a `SelectList` open, Esc closes the list first.
- **`SelectList`**: listbox semantics, `aria-activedescendant`, arrows, Home, End, Enter and Space; each option is labelled with its full text (set, code, number, artist / collection, quantity).
- **Quantity errors**: `aria-invalid` and `aria-describedby` point to the error. Disabled buttons keep their label.
- **"À venda"**: a native `<input type="checkbox">` visually restyled; the label wraps it, so it is a 44px target.
- **Reduced motion**: no spin, dust or details row animation (instant). Modal heights are instant (existing).

## 7. Copy (PT-BR, `core/utils/card-copy.ts`)

### List and page

| Key | Text |
|---|---|
| add | Adicionar cartas |
| viewLabel | Exibição |
| viewImages / viewDetails | Só imagens / Com detalhes |
| summary | **{n}** carta(s) · **{s}** à venda |
| searchLabel / searchPlaceholder | Buscar cartas / Buscar cartas |
| searchFilters | Buscar e filtrar |
| filtersSoon | Filtros em breve. |
| forSale | À venda |
| quantity | ×{qtd} |
| keepCards / keepCardsCopy | Guardar cartas aqui / Adicione as cartas que estão fisicamente nesta coleção. |
| divide / divideCopy | Dividir em subcoleções / Organize por gaveta, fichário ou pasta. Depois disso, as cartas ficam nas subcoleções. |
| eitherOr | Uma coleção guarda cartas ou subcoleções — nunca os dois. |
| holdingCopy | Cartas sem lugar definido. Aqui só dá para ver — sem adicionar nem editar. |
| tileEdit | {descrição}. Editar. |

### Finishes, conditions, languages

- **Finishes**: Normal · Foil · Etched.
- **Conditions**:
  - NM — Praticamente nova;
  - LP — Pouco usada;
  - MP — Usada;
  - HP — Muito usada;
  - DMG — Danificada.

  The list shows "NM — Praticamente nova"; the plate shows "NM".
- **Languages**: see R19.

### Search modal

| Key | Text |
|---|---|
| title | Adicionar cartas |
| nameLabel / namePlaceholder / nameHelp | Nome da carta / Ex.: sol ring / Mínimo de 3 caracteres. |
| idle | Busque uma carta pelo nome para escolher a impressão que você tem. |
| short | Digite pelo menos 3 caracteres para buscar. |
| loading / loadingMore | Buscando… / Carregando mais… |
| empty | Nenhuma carta encontrada para “{texto}”. Confira a grafia — a busca usa o nome em inglês. |
| offline | Sem conexão. O catálogo precisa de internet — o resto do app continua funcionando. |
| failed | Não foi possível acessar o catálogo agora. Tente de novo em instantes. |
| moreFailed | Não foi possível carregar mais cartas. |
| retry | Tentar de novo |
| found | {n} carta(s) encontrada(s) / Mais de 100 cartas encontradas — role para ver mais. |
| close | Fechar |

### Card modal

| Key | Text |
|---|---|
| eyebrowAdd / eyebrowEdit | Adicionar carta / Editar carta |
| setFilter / setFilterPlaceholder | Buscar set / Nome ou código do set |
| printing | Impressão |
| printingOption | {Nome do set} · {CÓDIGO} · {nº} (artist below) |
| printingsLoading | Carregando impressões… |
| printingsFailed | Não foi possível carregar as impressões. Sem conexão, a impressão atual fica como está. |
| setNone | Nenhum set encontrado. |
| finish / language / condition / quantity | Acabamento / Idioma / Condição / Quantidade |
| quantityError | Use um número inteiro de 1 a 9.999. |
| notes / notesPlaceholder | Notas / Opcional |
| forSale | À venda |
| cancel / saveAgain / save | Cancelar / Salvar e adicionar outra / Salvar |

### Duplicate notice

| Key | Text |
|---|---|
| dupTitle / dupTitleMany | Você já tem esta carta / Você já tem esta carta em {n} lugares |
| dupSub | Mesma impressão, acabamento, idioma e condição. Está em “{coleção}”. |
| dupSubMany | Mesma impressão, acabamento, idioma e condição. |
| dupSubEdit | Com essa mudança, a carta fica igual a outra que você já tem em “{coleção}”. |
| dupSubEditMany | Com essa mudança, a carta fica igual a outras que você já tem. |
| where | Onde ela está |
| merge | Somar à quantidade existente |
| mergeSub | A linha existente passa de {N} para {N+q} cópias e fica onde está. |
| mergeSubEdit | A quantidade desta carta é somada à outra linha ({N} → {N+q} cópias), e esta linha deixa de existir. |
| separate / separateSub | Adicionar como linha separada / Cria uma nova linha em “{coleção}”. (D1b: “…{coleção}”, a coleção que você está usando.) |
| keep | Manter as duas linhas |
| continue | Continuar |

### Moved notice

| Key | Text |
|---|---|
| movedTitle | Carta adicionada em outra coleção |
| movedCopy | Enquanto você adicionava, “{coleção}” ganhou subcoleções. A carta foi para “{subcoleção}”, a primeira em ordem alfabética. |
| ok | Ok |

### Toasts

| Label | Text |
|---|---|
| Carta adicionada | {Nome} ×{qtd} em “{coleção}”. (On a merge, the collection is the merged row's.) |
| Carta atualizada | {Nome} foi atualizada. |
| Nada foi salvo | A coleção “{coleção}” não existe mais. Você voltou para as coleções. / Esta carta não está mais nesta coleção. |
