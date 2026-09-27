# UI Design: Planar Card Preview in Deck Settings

Values (sizes, tokens, timings) are in `design_handoff_planar_card_preview/README.md`, and
FR-015 moves them into DESIGN.md ("Gameplay: Planechase → Card preview") before anything is
built. This file covers structure, states and flow. Where the two disagree on layout or copy,
the handoff wins.

## 1. Surfaces

| Surface | New / modified | Component |
|---|---|---|
| Deck settings ("Baralho planar") | Modified: hint copy, tile gestures, popover and dialog host | `PlanechaseDeck` (`views/planechase-deck/`) |
| Card tile | Modified: hover/long-press/context-menu, hold glow, accessible description | `PlanarTile` |
| Hover popover | New | a `div role="tooltip"` in `PlanechaseDeck` + `PlanarPreviewContent` |
| Preview dialog, wide (> 640 px) and narrow (≤ 640 px) | New | `PlanarPreviewDialog` + `PlanarPreviewContent` |
| In-game card block | Internal only: its text logic moves to `planarCardText()`, no visible change | `PlanarCard` |
| DESIGN.md | New "Card preview" entry under Gameplay: Planechase | from the handoff's proposed section |

## 2. Layout per surface

**Hover popover** (380 px; placed beside the tile, never covering it)
```text
┌───────────────────────────────┐
│ [ image frame, 1.4 ]          │
│ ● Ativada no baralho          │  status row
│ Name (Grenze, en)             │
│ type line (muted)             │
│ static text ¶…                │  (none for phenomena)
│ ┌ CAOS / AO ENCONTRAR ──────┐ │  plate, never lit (none if no chaos ability)
│ │ ability ¶…                │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

**Dialog, wide** (centered, 880 px, ring)
```text
┌ Planechase · 12 de 143 ─────────────────────────────── ✕ ┐
│ [ image frame, 1.4 ]          │ ● status                  │
│                               │ Name / type / text / plate │  ← this column scrolls
├───────────────────────────────────────────────────────────┤
│ [Anterior] [Próxima]                      [Desativar carta] │
└───────────────────────────────────────────────────────────┘
```

**Dialog, narrow** (full-bleed, no ring)
```text
┌ Planechase · 12 de 143 ── ✕ ┐  header: wash + hairline
│ [ image frame, full width ] │
│ ● status                    │  ← body scrolls
│ Name / type / text / plate  │
├─────────────────────────────┤  pinned footer (+ safe-area inset)
│ [      Desativar carta    ] │
│ [ Anterior ] [ Próxima ]    │
└─────────────────────────────┘
```

Deck settings: unchanged except the hint text. The popover is a sibling of the tile grid, not
inside a tile.

## 3. States

| State | What changes | Source |
|---|---|---|
| Card on | Lit bead + "Ativada no baralho"; dialog toggle is secondary "Desativar carta" | FR-003 |
| Card off | Empty bead + "Desativada no baralho"; toggle is primary "Ativar carta"; image **not** dimmed | FR-003, edge case |
| Translated | PT-BR type line/text/ability, no `lang` | FR-002 |
| Untranslated | English type line/text/ability with `lang="en"`, plate still labeled in PT-BR | FR-002, edge case |
| Phenomenon | No static text; plate "Ao encontrar" | edge case |
| Plane without chaos | No plate | edge case |
| Image loading | Frame keeps 1.4 ratio, shows the card name; text already visible | edge case |
| Image unavailable | Name + "Imagem indisponível sem conexão" | FR-004, edge case |
| First / last visible card (dialog) | Anterior / Próxima disabled | FR-009a |
| Long-press building | Tile glow grows (`is-holding`); instant under reduced motion | FR-008 |
| Popover open | Its tile keeps the hover glow | FR-006 |
| Restart confirm footer showing | No preview can open; an open one closes | FR-013 |
| Default selection (nothing saved) | The 8 default-off tiles show as off; counter reflects it | FR-017, US4 |

## 4. Interaction flow

- **Pointer** (mouse/pen): rest 300 ms on a tile → popover. Move to another tile → switch at once.
  Leave the tile and the popover for 150 ms, or press Esc → close. Click a tile → toggle, and the
  popover's status updates. Right-click → dialog (the popover closes first).
- **Touch**: hold 500 ms (glow grows) → dialog, and lifting the finger doesn't toggle. Moving more
  than 8 px or scrolling cancels. A tap toggles as before.
- **Keyboard**: Menu or Shift+F10 on the focused tile → dialog. Enter/Space toggle. Tab only
  focuses.
- **Dialog**: Anterior/Próxima step through the visible tiles (all sets in order, collapsed sets
  skipped) and update "{i} de {n}". The toggle edits the draft (tile and counter update behind
  the dialog). ✕, Esc, backdrop tap or system back → close, focus the tile of the card on screen,
  and scroll it into view in `main.view-area`. The deck settings and the draft stay.
- **Leaving the deck settings** (Cancelar, Salvar, nav) closes any preview first. While the dialog
  is open, nav is inert behind it.

## 5. Design-system reuse

- **Reused as is**: `PlanarImage` (frame, placeholder and cache), `.plate`, `.eyebrow`,
  `.micro-label`, `.btn--primary/--secondary`, the bead styling (the tile's, moved into a shared
  rule both use), and the tokens `--glow-overlay`, `--glow-plate-hover`, `--ring-gradient`,
  `--wash-header`, `--overlay-backdrop`, `--modal-width`, `--touch-target`, `--bead`,
  `--duration-slow`, `bp.mobile`.
- **Extracted, not copied**: the themed modal's rotating `.ring` moves into
  `shared/ds/themed-modal/_ring.scss`, which `ThemedModal` and `PlanarPreviewDialog` both use
  (R5). The card block's text logic becomes `planarCardText()` (contracts).
- **New**: the popover face (380 px, the side nav's `--glow-overlay` recipe), the dialog's
  header/footer layout, and the hold glow, all defined in DESIGN.md first (FR-015).
  `ThemedModal` itself isn't reused: no halo or sparks, no own theme root, and focus doesn't go
  back to the opener (R5).

## 6. Accessibility

- **Popover**: `role="tooltip"`, the tile's `aria-describedby` points to it while open, it holds
  no focusable elements and never takes focus (FR-007). Keyboard users get the dialog instead.
- **Tile**: keeps `aria-pressed` and `aria-label="{name}, plano|fenômeno"`, plus a hidden
  description "Menu ou Shift+F10 abre a carta." (FR-010).
- **Dialog**: native `showModal()` traps focus and makes the page inert. Focus starts on ✕.
  Tab order: ✕ → (scrolling text, if focusable) → Anterior → Próxima → toggle (wide: footer
  left to right; narrow: toggle first, then Anterior/Próxima, following DOM order).
  `aria-labelledby` → card name `h2`. The toggle has `aria-pressed`. Anterior/Próxima carry
  "Carta anterior"/"Próxima carta" labels. Esc closes, and focus returns to the tile of the card
  on screen (FR-011).
- **Reduced motion**: no popover fade, the ring is frozen, and the hold glow appears without
  growing.
- `lang="en"` on the card name, the set name and untranslated text.

## 7. Copy (PT-BR, `DECK` in `planechase-copy.ts`)

| Key | Text |
|---|---|
| `hintPointer` | Clique numa carta para ativar ou desativar. Pare o ponteiro sobre ela para ler o texto, ou use o botão direito para abri-la. Nada muda até você salvar. |
| `hintTouch` | Toque numa carta para ativar ou desativar. Toque e segure para ler o texto. Nada muda até você salvar. |
| `tileKeys` | Menu ou Shift+F10 abre a carta. |
| `previewOn` / `previewOff` | Ativada no baralho / Desativada no baralho |
| `previewPosition(i, n)` | `{i} de {n}` |
| `previous` / `previousLabel` | Anterior / Carta anterior |
| `next` / `nextLabel` | Próxima / Próxima carta |
| `disable` / `enable` | Desativar carta / Ativar carta |
| `close` | Fechar |

Existing: `PLANAR_CARD.chaos` ("Caos"), `.encounter` ("Ao encontrar"), `.imageMissing`. The
feature has no error messages.
