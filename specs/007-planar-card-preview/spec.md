# Feature Specification: Planar Card Preview in Deck Settings

**Feature Branch**: `007-planar-card-preview`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "let's add a hover on the planechase deck list so a bigger image and translation show up, we have to figure out a mobile design too"; then: "research planechase cards that are considered too strong or unfair and are usually kept out of games, so we can start with a fixed on/off removing them"

> Visuals, layout, motion and copy come from `design_handoff_planar_card_preview/` (README.md →
> `Planar Card Preview.dc.html`, the interactive canvas; `PlanarPreview.dc.html` is the preview
> component with its three variants); this spec fixes behavior.

## Context

Spec 006 built the Planechase deck settings ("Baralho planar") as a grid of card-image tiles, one per plane or phenomenon, grouped by set. Tapping or clicking a tile turns the card on or off. The tiles are small, so the English card text is hard to read, and the PT-BR translation (shown during a game in the card block) isn't visible at all. A person choosing which cards to keep can't tell what a card does without starting a game.

This feature adds a **card preview** to the deck settings: a larger card image with the card's PT-BR type line and rules text (or its English text when there's no up-to-date translation), laid out like the card block shown during a game. On devices with a pointer, it opens when the pointer rests on a tile. Touch devices have no hover, so they need their own way to open it.

It also gives the planar deck a **default selection**: until a selection has been saved, a fixed list of cards that end, undo or lock up the game is off, instead of every card being on (006's default). No community ban list exists for Planechase, so the list below is the project's own call, made from each card's text.

## Clarifications

### Session 2026-09-27

- Q: Which touch trigger opens the preview — long-press on the tile, a "ver carta" button on each tile, or a tap that opens the preview with the on/off toggle moved inside it? → A: Long-press on the tile. A tap keeps toggling; tiles get no extra control.
- Q: How does the preview present when opened by long-press or keyboard on a wide screen? → A: The way it was opened decides it. Hover opens a control-free popover; long-press or the preview key opens a dialog with close and on/off controls, full-screen on narrow screens and centered (image beside text) on wide ones.
- Q: Can the person move to the previous/next card without closing the preview dialog? → A: Yes, with previous/next buttons following the visible tile order across sets, skipping collapsed sets, disabled at the first/last card. No swipe gesture.
- Q: Which key opens the preview dialog for the focused tile? → A: The context-menu action: the Menu key or Shift+F10 on the focused tile, and right-click with a mouse; the browser's own menu is suppressed on tiles.
- Q: Which cards should start off in the planar deck? → A: A fixed default list of 8 cards that end or undo the game, or give one player runaway extra turns: Otaria, Temple of Atropos, Sanctum of Serra, Norn's Dominion, Planewide Disaster, Morphic Tide, Lethe Lake, Unleash the Flux (FR-016). Swingy-but-fun cards (Pools of Becoming, Chaotic Aether, Glimmervoid Basin, Naar Isle…) stay on.
- Q: Where do the preview's visuals come from? → A: `design_handoff_planar_card_preview/`. It fixes the narrow/wide dialog breakpoint at 640px (picked when the dialog opens), adds the "{set} · {i} de {n}" position to the dialog header, and adds a growing glow on the tile while a long-press builds.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read a card while choosing the deck, with a mouse (Priority: P1)

A player on a desktop or laptop opens "Baralho planar" to trim the deck. They rest the pointer on a tile, and a larger image of the card appears next to it with its rules text in Portuguese and the chaos or encounter ability in its labeled plate. They read it, decide, and click the tile to turn it off, as before. Moving the pointer to the next tile shows that card instead.

**Why this priority**: This is the feature as asked. The deck settings are where the person decides which cards to keep, and they can't decide without reading the cards.

**Independent Test**: On a pointer device, open the deck settings, rest the pointer on several tiles, and check that each shows its larger image and its PT-BR text (English for an untranslated card), and that clicking still toggles the tile.

**Acceptance Scenarios**:

1. **Given** the deck settings on a device with a pointer, **When** the pointer rests on a tile for a short moment, **Then** a preview opens showing that card's larger image, English name, type line, rules text and chaos/encounter ability plate, in PT-BR when translated and English otherwise.
2. **Given** an open preview, **When** the pointer moves to another tile, **Then** the preview shows that card instead, without closing and reopening visibly.
3. **Given** an open preview, **When** the pointer leaves the tiles (and the preview), or the person presses Esc, **Then** the preview closes.
4. **Given** an open preview, **When** the person clicks the tile, **Then** the tile toggles on/off exactly as it does without a preview, and the preview stays open.
5. **Given** the pointer passing quickly across tiles (e.g. while moving to a button), **When** it never rests on one, **Then** no preview opens.
6. **Given** a preview near the edge of the window, **When** it opens, **Then** it is fully inside the window and doesn't cover the tile it belongs to.

---

### User Story 2 - Read a card on a phone or tablet (Priority: P1)

A player at the table uses a phone to set up the deck. There is no hover, so they press and hold a tile to see the card larger with its Portuguese text, then close it and keep going. Tapping a tile still turns it on or off.

**Why this priority**: Planechase is played at the table and most people there use a phone. A preview that only works with a mouse would leave out most users of this screen.

**Independent Test**: On a touch-only device, open the deck settings, open a card's preview, read it, close it, and check that plain taps still toggle tiles and that closing the preview never leaves the deck settings.

**Acceptance Scenarios**:

1. **Given** the deck settings on a touch device, **When** the person presses and holds a tile, **Then** the preview dialog opens with that card's larger image and its PT-BR (or English) text (full-screen on a phone, centered on a tablet), and the tile's on/off state is unchanged.
5. **Given** a finger resting on a tile, **When** it starts scrolling the list before the hold completes, **Then** the list scrolls, and no preview opens and no toggle happens.
6. **Given** an open preview dialog, **When** the person taps "next" (or "previous"), **Then** it shows the adjacent visible card, moving into the next set when the current set ends and skipping collapsed sets; on the last (first) visible card that button is disabled.
2. **Given** an open preview on a touch device, **When** the person taps its close control, taps outside it, or uses the system back gesture/button, **Then** the preview closes and the deck settings, with the draft unchanged, stay on screen.
3. **Given** an open preview on a touch device, **When** the person turns the card on or off from the preview, **Then** the tile behind it reflects the change and the draft counter updates.
4. **Given** the deck settings on a touch device, **When** the person taps a tile normally, **Then** it toggles on/off as before and no preview opens.

---

### User Story 3 - Keyboard and screen reader access to the preview (Priority: P2)

A person using a keyboard or screen reader can open the same preview for the focused tile and read its text, without the preview popping up on every tile they tab past.

**Why this priority**: Content shown only on hover must also be reachable without a pointer. It matters less than the two main flows because the tile's name and type are already announced.

**Independent Test**: With only the keyboard, move through the tiles, open the preview for one, check that its text is read out, close it, and confirm focus returns to that tile.

**Acceptance Scenarios**:

1. **Given** keyboard focus on a tile, **When** the person presses the Menu key or Shift+F10 (FR-010), **Then** the preview dialog opens for that card and its text is available to assistive technology.
2. **Given** a preview opened from the keyboard, **When** the person presses Esc or activates the close control, **Then** the preview closes and focus returns to the tile of the card it shows (the one it was opened from, unless "Anterior"/"Próxima" moved it).
3. **Given** the person tabbing through tiles, **When** a tile only receives focus, **Then** no preview opens by itself.

---

### User Story 4 - Start from a fair planar deck (Priority: P3)

A group opens Planechase for the first time and starts a game without touching the deck settings. The game never draws a card that wipes every board, deals one player a chain of extra turns, or mills whole libraries away, because those cards start off. Someone who wants them back opens "Baralho planar", sees them as off tiles like any other, turns them on and saves.

**Why this priority**: It improves the first game, but the deck settings already let anyone remove these cards by hand.

**Independent Test**: With no saved selection, open the deck settings and check that exactly the default-off cards are off; start a game and play through the deck and check that none of them is drawn; turn one back on, save, and check that it's drawn from then on.

**Acceptance Scenarios**:

1. **Given** no saved selection (on the device, or for the active profile), **When** the deck settings open, **Then** the cards in the default-off list (FR-016) show as off and every other card as on, and the counter reflects that.
2. **Given** no saved selection, **When** a game starts, **Then** its card list excludes the default-off cards.
3. **Given** the default selection, **When** the person turns a default-off card on and saves, **Then** that card is part of the saved selection and is drawn in later games; the default list plays no further part for that profile or device.
4. **Given** a saved selection, **When** the app is updated with a different default-off list, **Then** the saved selection is unchanged.

---

### Edge Cases

- **Card without an up-to-date translation**: the preview shows the English type line and rules text marked as English, with the ability still in its labeled plate, the same as the card block during a game (006 FR-004a).
- **Large image never shown on this device and no network**: the preview shows the text without an image; the frame shows the card name instead of an image, as elsewhere in Planechase.
- **Large image still loading**: the text shows at once; the image frame keeps its size while the image loads, so the preview doesn't jump.
- **Phenomenon**: no static text, only the encounter ability plate ("Ao encontrar"), as in the card block.
- **Plane with no chaos ability**: no ability plate.
- **Disabled (off) card**: the preview shows the card at full strength (not dimmed), and indicates that it's currently off in the draft.
- **Collapsing a set while its card's preview is open**: the preview closes.
- **Save-confirmation footer open ("Salvar e reiniciar"/"Manter partida")**: no preview opens while the confirmation is showing, so it can't cover it.
- **System back on a phone while the preview is open**: closes the preview only. It must not leave the deck settings, because leaving discards the draft silently (006 FR-017).
- **Window resized or phone rotated with the preview open**: the preview stays fully inside the window.
- **Devices with both touch and a pointer (e.g. touchscreen laptop)**: hover works with the pointer and the touch trigger works with touch.
- **Reduced motion**: the preview appears and disappears without animation, the dialog's ring stays still, and the long-press glow shows without growing.
- **Narrow window with a mouse**: when neither side of the tile has room for the popover, it centers horizontally and goes above or below the tile, whichever has more room, still never covering the tile.
- **Window crosses 640 px with the dialog open**: the dialog keeps the variant it opened with; the breakpoint is checked only on opening.
- **A default-off card removed from the card data**: it's simply absent (006 edge case); the rest of the default list still applies.
- **Default-off list leaves too few cards**: can't happen with the current catalog (151 cards, 8 off). The default list MUST keep the default selection valid (≥ 10 cards, ≥ 1 plane).

## Requirements *(mandatory)*

### Functional Requirements

**Preview content**

- **FR-001**: The deck settings MUST offer a preview for every tile, showing the card's large image, its English name, its type line, its static text (omitted for phenomena) and its chaos or encounter ability in a plate with its label, laid out and worded like the card block shown during a game.
- **FR-002**: The preview MUST show the PT-BR type line and texts when the card has an up-to-date translation, and the English ones (marked as English) otherwise, exactly as the card block does. The card name stays in English (006 FR-005).
- **FR-003**: The preview MUST show whether the card is on or off in the current draft ("Ativada no baralho" / "Desativada no baralho" beside the tile's bead). The image is never dimmed, and the ability plate is never lit in the preview (lighting is a game-state signal).
- **FR-004**: The preview MUST show the same large image the tile already shows (006 loads it for tiles near the viewport), kept on the device and reused offline like other Planechase images. Opening a preview MUST NOT download anything but that card's image when it isn't on the device yet, and MUST NOT prefetch images of other cards. Without an image, the preview shows its text, with the card name in the image frame.

**Pointer (desktop)**

- **FR-005**: On a device with a pointer that can hover, resting the pointer on a tile for a short delay (about 300 ms) MUST open that card's preview. Passing over a tile without resting MUST NOT open it. While a preview is open, moving to another tile MUST switch the preview to that card without the delay.
- **FR-006**: The pointer preview MUST appear next to its tile, fully inside the window, without covering that tile. It MUST stay open while the pointer is over the tile or over the preview itself, and close 150 ms after the pointer leaves both, or when Esc is pressed. While it's open, its tile keeps its hover glow. Only mouse and pen pointers open it; touch never does.
- **FR-007**: Clicking a tile while its preview is open MUST toggle it exactly as without a preview, and the popover's on/off status updates. The pointer preview MUST NOT take keyboard focus, hold focusable elements, or block clicks on other tiles and controls.

**Touch (mobile)**

- **FR-008**: On touch input, pressing and holding a tile (about 500 ms) MUST open that card's preview. A long-press MUST NOT also toggle the tile when the finger lifts, and MUST NOT bring up the browser's own image menu, text selection or image drag. Moving the finger more than 8 px (e.g. to scroll) before the hold completes MUST cancel it. While the hold builds, the tile's glow grows, confirming it (instant under reduced motion). A plain tap on a tile MUST keep toggling it.
- **FR-008a**: The deck settings' hint text MUST mention the long-press on touch devices, and the pointer rest and right-click on pointer devices, so the preview can be discovered without trial and error. Devices with both (e.g. touchscreen laptops) get the pointer version.
- **FR-009**: A preview opened by long-press or by the context-menu action (FR-010) MUST open as a **preview dialog**, whatever the input: at 640 px wide or less it fills the screen with the image and the text stacked and its controls pinned at the bottom; above 640 px it is centered, with the image beside the text. The width is checked only when the dialog opens. Its header shows the card's set name and its position in the visible tile order ("{set} · {i} de {n}"). The text MUST scroll when it doesn't fit. The dialog MUST offer a close control and an on/off control for the card, and MUST close on a tap outside it, on Esc, or on the system back gesture/button, without leaving the deck settings or changing the draft. Hover never opens the dialog, and the dialog never opens as the control-free popover of FR-005–FR-007.
- **FR-009a**: The preview dialog MUST offer "previous" and "next" buttons that switch it to the adjacent card in the visible tile order, crossing from one set to the next and skipping collapsed sets. "Previous" is disabled on the first visible card and "next" on the last, and the header position updates. Closing the dialog returns focus to the tile of the card it shows at that moment, scrolled into view. There is no swipe gesture, and moving to a card doesn't prefetch its neighbors' images.

**Keyboard and assistive technology**

- **FR-010**: Since the tiles carry no extra control, the preview dialog MUST open through the context-menu action on a tile: the Menu key or Shift+F10 on the focused tile, and a right-click with a mouse. The browser's own context menu MUST NOT appear on tiles. The tile's accessible description MUST name the keys in PT-BR. The preview's text MUST be available to assistive technology when opened this way. Focus alone MUST NOT open it, and Enter/Space keep toggling the tile.
- **FR-011**: The preview dialog (FR-009) MUST move focus into it, keep focus inside it while open, close on Esc, and return focus to the tile of the card it shows when closed (FR-009a). Opening the dialog closes any hover popover.

**General**

- **FR-012**: At most one preview is open at a time. Opening the preview never changes the draft; only the on/off controls do.
- **FR-013**: No preview MUST open while the save-confirmation footer is showing, and an open preview MUST close when its set is collapsed or the person leaves the deck settings.
- **FR-014**: All new user-facing text (control labels, the on/off indication, accessible names) MUST be PT-BR (Constitution II).
- **FR-015**: The preview's visual design (hover popover, the preview dialog at narrow and wide widths, and the long-press glow) MUST be added to `DESIGN.md` before it is built (Constitution V), taken from the handoff's proposed "Card preview" section, reusing the existing card block, ability plate and modal conventions where they apply.

**Default selection**

- **FR-016**: The app MUST ship a fixed list of cards that are off by default, identified by stable card id: **Otaria** (chaos: extra turn, repeatable), **Temple of Atropos** (an extra untap/upkeep/draw every turn), **Sanctum of Serra** and **Norn's Dominion** (destroy all nonland permanents when left), **Planewide Disaster** (phenomenon: destroy all creatures), **Morphic Tide** (phenomenon: reshuffles every board), **Lethe Lake** (mills 10 each upkeep) and **Unleash the Flux** (phenomenon: repeated sacrifices). The list is maintained by hand in the project; it isn't generated by the card data script.
- **FR-017**: When no selection has been saved (for the active profile, or for the device without a profile), the deck selection MUST be the default: every catalog card on except those in FR-016. It applies everywhere the saved selection does: the deck settings' draft and counter, starting a game, and the deck validation (006 FR-007, FR-019). The default isn't written anywhere until the person saves.
- **FR-018**: Once a selection is saved, it alone decides which cards are on; the default list no longer applies, and changing that list in a later app version MUST NOT alter saved selections. There is no "restore default" action.

### Key Entities

- **Planechase card** (existing, from spec 006): its English name, type, large image address, and its PT-BR or English type line, static text and ability. No new data is stored; the preview reads what the game already shows.
- **Deck draft** (existing, from spec 006): the unsaved set of disabled cards the preview reads and, through its on/off control, edits.
- **Default-off list** (new): a fixed, hand-kept list of card ids that start off when no selection is saved. Ships with the app; never saved or synced.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can read the full PT-BR text of any card in the deck settings without starting a game, in at most one gesture on either a desktop or a phone.
- **SC-002**: On a desktop, moving the pointer across the tile grid to reach a button opens no preview, and resting on a tile opens one in under half a second.
- **SC-003**: Every card's preview shows the same text as that card's block during a game.
- **SC-004**: The preview is always fully visible inside the window, on screens from 320 px wide up to desktop.
- **SC-005**: Closing a preview by any means (close control, tap outside, Esc, system back) never leaves the deck settings and never changes the draft.
- **SC-006**: The preview adds no image downloads beyond the previewed card's own image: moving through previews (hover or Anterior/Próxima) never fetches images of cards not being previewed.
- **SC-007**: A keyboard-only user can open, read and close the preview of any tile, and ends with focus back on that tile.
- **SC-008**: With no saved selection, a game played through the whole deck never draws any of the 8 default-off cards, and turning one on and saving makes it drawable.

## Assumptions

- The preview reuses what the game already shows: the same content and wording as the card block, so nothing new needs translating beyond a few control labels.
- "Larger image" means the card's large image, already in the card data (006 FR-003).
- The input decides the presentation, not the screen width: hovering a pointer gives the popover; long-press, right-click, the Menu key or Shift+F10 give the dialog. A narrow window with a mouse still gets the hover popover.
- The hover popover is a quick look: it has no controls of its own, and the tile under the pointer stays the way to toggle the card.
- The preview only exists in the deck settings. The in-game card block and other screens are unchanged.
- No new saved state: which card is previewed isn't remembered.
- There is no community-agreed Planechase ban list (checked EDHREC, MTG Salvation, CoolStuffInc, Card Kingdom, CBR, Draftsim; Reddit couldn't be read). The default-off list is the project's own call: cards that end or undo the game, lock it, or hand one player runaway extra turns. Swingy-but-fun cards stay on (considered and kept: Naar Isle, Aplan Mortarium, The Eon Fog, Eloren Wilds, Celestine Reef, Pools of Becoming, Chaotic Aether, Fixed Point in Time, Norn's Seedcore, Spatial Merging, Glimmervoid Basin, Izzet Steam Maze, Stairs to Infinity, Academy at Tolaria West, Minamo).
- The app is unreleased, so existing saved selections don't need migrating to the new default.
- Where the handoff and this spec disagree on layout or copy, the handoff wins; behavior conflicts are resolved by updating this spec.
