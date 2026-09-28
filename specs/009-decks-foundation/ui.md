# UI: Decks Foundation

**Feature**: `009-decks-foundation`.

The visual source is `design_handoff_decks_foundation/Decks Hi-fi.dc.html`, which is high fidelity. Its README has every measurement. The chosen dust is option 4a in `Decks Transições.dc.html`, as implemented in the hi-fi.

This file fixes structure, states and flow. Values come from the handoff and are added to DESIGN.md first (FR-015).

## 1. Surfaces

| Surface | New / modified | Where |
|---|---|---|
| Deck area view: list, empty state, deck page, page turn and dust | **New** (replaces `views/decks`, `views/deck-detail`) | `views/deck-area/` |
| Deck tile (fan, caption, link) | **New** | `shared/decks/deck-tile/` |
| Deck fan (three sleeves plus the featured-card window) | **New** | `shared/decks/deck-fan/` |
| Format picker (radiogroup plus rules plate) | **New** | `shared/decks/format-picker/` |
| Create/edit dialog | **New** | `shared/decks/deck-form-dialog/` |
| Delete dialog | **New** | `shared/decks/deck-delete-dialog/` |
| Side nav and drawer links | Modified: + "Decks" | `shared/layout/nav-links/nav-destinations.ts` |
| Profile modal delete step | Modified: the "Decks ainda não vão para a nuvem" note is removed | `shared/auth/profile-modal/` |
| DESIGN.md | Modified: a Decks components section, the page-turn motion, the sleeve and card-window radii, and copy | root |

The rest of the shell (top bar, legal notice, toast outlet) is untouched. The deck page keeps the profile's colors: no wash and no role override (R13).

## 2. Layout per surface

### List (`/decks`)

- The column is centered, 1080 px maximum, with padding `space-6` (`space-4` at ≤ 640 px). It's a flex column with `space-4` gap.

```text
┌ header ──────────────────────────────────────────────────────────┐
│ h1 Decks                                           [Novo deck]  │  ← button only > 640px
├ grid: 4 columns, row gap 32px / column gap 24px ─────────────────┤
│  ╱▭╲        ╱▭╲        ╱▭╲        ╱▭╲                           │  fan at 0.75 scale
│ Atraxa      Krenko     Pauper     …                              │  name (700, wraps)
│ Commander   Commander  Pauper                                    │  format (0.875rem, muted)
└──────────────────────────────────────────────────────────────────┘
```

- **Phone (≤ 640 px)**: one centered column of fans at 1.0 scale. The header has only the `h1`. After the last tile comes the dashed create row "+ Novo deck".
- The order is alphabetical (FR-004).

### Deck fan (inside each tile)

- The stage is 320 × 392 (scaled 0.75 on desktop inside a reserved box).
- Three 256 × 352 sleeves rotated −9° / −4° / 0°, with borders tertiary / accent / primary.
- The front sleeve holds the 244 × 340 card window (63:88, 12 px radius).
- **Placeholder** (the only state in this slice): a `surface` window with a radial primary wash, the `.micro-label` "Carta em destaque" and the 0.75rem muted "Chega com as cartas do deck."
- Hover or focus of the tile lifts the front sleeve 8 px, and its glow goes from 55% to 70%.

### Empty state (`/decks`, no decks)

```text
h1 Decks
        ┌ centered 360px, margin space-6 auto, gap space-4 ┐
        │ NENHUM DECK AINDA                   (.eyebrow)    │
        │ Sleevados e prontos pra jogar       (h2, glow)    │
        │ Um deck é um lugar físico, …        (muted sm)    │
        │ [Criar deck]                        (primary)     │
        └───────────────────────────────────────────────────┘
```

There's no header button and no create row in this state; the CTA is the only create action.

### Deck page (`/decks/{id}`)

- The column is centered, 760 px maximum, with the same padding and gap.

```text
Voltar para decks                               (.link-btn, sm, 44px; margin-bottom −12px)
┌──────────────────────────────────────────┬──────────────────────┐
│ h1 Krenko goblins (2xl, glow, balance)   │ [Editar] [Excluir]   │  secondary · danger
│ Commander (sm, muted)                    │                      │
└──────────────────────────────────────────┴──────────────────────┘
```

- **Phone**: the actions drop to their own full-width row, 50/50.
- Nothing is rendered below the header (FR-005).

### Page turn (list ↔ deck)

- The deck page renders underneath.
- The list renders as a page layer on top of it: a front face with the list and a back face with the flat `surface` and a 1px `border` left edge.
- The page rotates around the view's left edge, with perspective on the view host.
- The dust canvas covers the view area, above both.
- During a close, the deck page stays underneath until the list lands.

### Create/edit dialog (in `app-compact-modal`)

```text
Novo deck | Editar deck                               (modal title)
Nome                                         12/40    (label · counter, tabular, danger > 40)
[ Krenko goblins                          ]
Como você reconhece o deck na estante.                (helper; replaced by the error)
Formato · Commander                                   (label with the selected name)
[Commander][Pauper][Modern][Standard]                 (radiogroup: 4 columns; 2 on phone)
[Pioneer][Legacy][Vintage][Casual]
┌ .plate ────────────────────────────────────────┐
│ • Exatamente 100 cartas, contando o comandante. │    (rules of the selected format)
│ • …                                              │
└──────────────────────────────────────────────────┘
                              [Cancelar] [Criar deck | Salvar]
```

- **Phone**: the compact modal's full-screen sheet (wordmark header plus ✕), with buttons stacked full width, primary on top.
- The format grid always fills full rows (8 = 2 × 4 = 4 × 2).

### Delete dialog (same shell)

```text
Excluir Krenko goblins?
As {n} cartas deste deck vão para a caixa temporária, … Nada mais é afetado.   | Não há cartas aqui. Nada mais é afetado.
                                         [Cancelar] [Excluir deck]   (ghost · danger)
```

## 3. States

| State | What changes | Requirement |
|---|---|---|
| List with decks | The grid of tiles, sorted | FR-004, US1-1 |
| List, no decks | Only the `h1` and the empty section | FR-006, US1-3 |
| Deck page | The header only | FR-005, US1-2 |
| Deck page, unknown id | Redirects to `/decks` (`replaceUrl`, no turn) | FR-005, Edge Cases |
| Turning (open/close) | The view is `inert`, the page rotates for 1300 ms, the dust canvas is live | FR-018, US1-2, US1-5 |
| Settling | The page is still; specks fade one by one; the canvas is gone ≤ 2 s after | FR-018 |
| Reduced motion or direct load | An instant swap: no layer, no canvas | FR-018, US1-5 |
| Form: pristine | Helper visible; Commander preselected on create; the rules plate shows the selected format | FR-003, FR-016, US2-6 |
| Form: error | `.field__error` replaces the helper; `aria-invalid`; danger border. Cleared on the next input. | FR-007, US2-2, US2-3 |
| Form: over 40 while typing | The counter turns danger. Submit still validates (the error shows on submit). | FR-003 |
| Delete: with cards | The body with the count | FR-008, FR-009, US3-1 |
| Delete: running | The label is "Excluindo…"; confirm, cancel and ✕ are `aria-disabled`; Esc and the backdrop are ignored (`locked`) | FR-008, US3-4 |
| Deleted | Goes to `/decks` (no turn), with the toast | FR-008, US3-3 |

## 4. Interaction flow

- **Entry**: "Decks" in the side nav or drawer goes to `/decks`.
- **Open a deck**: activate a tile. The page turns forward, and focus moves to the deck `h1` when the turn ends.
- **Back to the list**: the back link, side-nav "Decks", or browser/Android back. The page turns back, and focus moves to the list `h1` when it ends. The wordmark goes to Home, with no turn.
- **Create**: "Novo deck" (desktop header), "+ Novo deck" (phone, end of the list) or "Criar deck" (empty state) opens the form. On success the dialog closes and the new tile is in the list. The person stays on the list.
- **Edit**: "Editar" on the deck page. On success the dialog closes and the header shows the change.
- **Delete**: "Excluir" on the deck page. On confirm, the dialog locks until the delete commits, then closes; the app lands on `/decks` and the toast shows. Cancel, ✕, Esc or the backdrop close it with no change (except while running).
- **A sync or profile switch removes the open deck**: the redirect to `/decks` happens with no turn.

## 5. Design-system reuse

| Need | Reused | New (why) |
|---|---|---|
| Dialog shell | `CompactModal` (`locked`, `[data-autofocus]`, phone sheet) | — |
| Buttons, field, plate, labels | `_controls.scss`: `.btn--primary/--secondary/--ghost/--danger`, `.field*`, `.plate`, `.eyebrow`, `.micro-label`, `.link-btn` | — |
| Phone create row | `CreateRow` (`shared/collections/`) | — |
| Toast | `ToastService` plus the outlets (5 s, DESIGN.md) | — |
| Queries | `MOBILE_QUERY`, `REDUCED_MOTION_QUERY` | — |
| Tokens | `--role-*`, `--color-*`, `--glow-title`, `--glow-button(-text)`, `--font-size-*`, easing | — |
| Deck fan | — | New component. DESIGN.md gains the sleeve geometry and the **14 px sleeve / 12 px card-window radii**, a documented exception to "4/8/10" like the create row's dashed border. |
| Format picker | — | New radiogroup (a text-button grid, not swatches) |
| Page turn and dust | — | A new motion recipe in DESIGN.md Motion ("Decks page turn"), next to the collections transition |

## 6. Accessibility

- **Tile**: one link. `aria-label="{nome}, {formato}"`; the fan is `aria-hidden`. Focus outline is `2px solid var(--role-accent)`, offset 2px.
- **Page `h1`s** get `tabindex="-1"` and receive focus after each turn or swap (not on first render), so the place is announced.
- **During a turn** the view is `inert`; the canvas is `aria-hidden` with `pointer-events: none`.
- **Format picker**: `role="radiogroup"` with `aria-labelledby` pointing to the "Formato · {name}" label. The buttons are `role="radio"` with `aria-checked` and roving `tabindex`; arrow keys move and select, and Home/End jump to the ends. The rules plate is `aria-live="polite"`, so a format change is read.
- **Name field**: `aria-describedby` points to the helper or error and to the counter; `aria-invalid` is set on error. The first field gets `[data-autofocus]`.
- **Delete lock**: `aria-disabled` rather than `disabled`, so focus isn't lost (as in the collection dialog).
- **Targets**: 44 px minimum everywhere (link-btn, ✕, format buttons, the create row).
- **Reduced motion**: no turn, no dust, no hover lift. Swaps are instant.

## 7. Copy (PT-BR, `DECK` in `core/utils/deck-copy.ts`)

| Key | Text |
|---|---|
| `title` | Decks |
| `newDeck` | Novo deck |
| `createRow` | Novo deck (after the "+" glyph) |
| `emptyEyebrow` | Nenhum deck ainda |
| `emptyTitle` | Sleevados e prontos pra jogar |
| `emptyBody` | Um deck é um lugar físico, como uma coleção, pronto para jogar. Crie um para cada deck que você tem. |
| `emptyCta` | Criar deck |
| `featuredLabel` | Carta em destaque |
| `featuredHint` | Chega com as cartas do deck. |
| `tileLabel(nome, formato)` | {nome}, {formato} |
| `back` | Voltar para decks |
| `edit` / `delete` | Editar / Excluir |
| `formTitles` | Novo deck / Editar deck |
| `nameLabel` / `nameHelper` | Nome / Como você reconhece o deck. |
| `errEmpty` / `errLong` / `errTaken` | Dê um nome ao deck. / Use no máximo 40 caracteres. / Já existe um deck com esse nome. |
| `formatLabel(nome)` | Formato · {nome} |
| `verbs` | Cancelar / Criar deck / Salvar |
| `deleteTitle(nome)` | Excluir {nome}? |
| `deleteWithCards(n)` | As {n} cartas deste deck vão para a caixa temporária, com todos os dados, até você guardá-las em outro lugar. Nada mais é afetado. (singular, not in the handoff: "A carta deste deck vai para a caixa temporária, com todos os dados, até você guardá-la em outro lugar. Nada mais é afetado.") |
| `deleteNoCards` | Não há cartas aqui. Nada mais é afetado. |
| `deleteVerb` / `deleting` | Excluir deck / Excluindo… |
| `toastLabel` | Deck |
| `toastDeleted(nome)` | {nome} foi excluído. |
| `toastMoved(nome, n)` | {nome} foi excluído. {n} cartas foram para a caixa temporária. (singular: "1 carta foi para a caixa temporária.") |
| `formats.*.name` | Commander · Pauper · Modern · Standard · Pioneer · Legacy · Vintage · Casual |
| `formats.*.rules` | As in spec FR-016, one bullet per sentence (data-model "DeckFormatId") |

Counts use `formatCount` (pt-BR grouping). The singular forms follow the collection copy's pattern. The format rules are flagged in the handoff for product review, which happens when they go into DESIGN.md Content (FR-015).
