# Feature Specification: Planar Card Preview in Deck Settings

**Feature Branch**: `007-planar-card-preview`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "let's add a hover on the planechase deck list so a bigger image and translation show up, we have to figure out a mobile design too"

## Context

Spec 006 built the Planechase deck settings ("Baralho planar") as a grid of card-image tiles, one per plane or phenomenon, grouped by set. Tapping or clicking a tile turns the card on or off. The tiles are small, so the English card text is hard to read, and the PT-BR translation (shown during a game in the card block) isn't visible at all. A person choosing which cards to keep can't tell what a card does without starting a game.

This feature adds a **card preview** to the deck settings: a larger card image with the card's PT-BR type line and rules text (or its English text when there's no up-to-date translation), laid out like the card block shown during a game. On devices with a pointer, it opens when the pointer rests on a tile. Touch devices have no hover, so they need their own way to open it.

## Clarifications

### Session 2026-09-27

- Q: Which touch trigger opens the preview — long-press on the tile, a "ver carta" button on each tile, or a tap that opens the preview with the on/off toggle moved inside it? → A: Long-press on the tile. A tap keeps toggling; tiles get no extra control.
- Q: How does the preview present when opened by long-press or keyboard on a wide screen? → A: The way it was opened decides it. Hover opens a control-free popover; long-press or the preview key opens a dialog with close and on/off controls, full-screen on narrow screens and centered (image beside text) on wide ones.
- Q: Can the person move to the previous/next card without closing the preview dialog? → A: Yes, with previous/next buttons following the visible tile order across sets, skipping collapsed sets, disabled at the first/last card. No swipe gesture.
- Q: Which key opens the preview dialog for the focused tile? → A: The context-menu action: the Menu key or Shift+F10 on the focused tile, and right-click with a mouse; the browser's own menu is suppressed on tiles.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read a card while choosing the deck, with a mouse (Priority: P1)

A player on a desktop or laptop opens "Baralho planar" to trim the deck. They rest the pointer on a tile, and a larger image of the card appears next to it with its rules text in Portuguese and the chaos or encounter ability highlighted. They read it, decide, and click the tile to turn it off, as before. Moving the pointer to the next tile shows that card instead.

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
2. **Given** a preview opened from the keyboard, **When** the person presses Esc or activates the close control, **Then** the preview closes and focus returns to the tile it was opened from.
3. **Given** the person tabbing through tiles, **When** a tile only receives focus, **Then** no preview opens by itself.

---

### Edge Cases

- **Card without an up-to-date translation**: the preview shows the English type line and rules text marked as English, with the ability plate still highlighted, the same as the card block during a game (006 FR-004a).
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
- **Reduced motion**: the preview appears and disappears without animation.

## Requirements *(mandatory)*

### Functional Requirements

**Preview content**

- **FR-001**: The deck settings MUST offer a preview for every tile, showing the card's large image, its English name, its type line, its static text (omitted for phenomena) and its chaos or encounter ability in a plate with its label, laid out and worded like the card block shown during a game.
- **FR-002**: The preview MUST show the PT-BR type line and texts when the card has an up-to-date translation, and the English ones (marked as English) otherwise, exactly as the card block does. The card name stays in English (006 FR-005).
- **FR-003**: The preview MUST show whether the card is on or off in the current draft.
- **FR-004**: The preview's large image MUST load only when that card's preview opens, MUST be kept on the device and reused offline like other Planechase images, and the preview MUST NOT prefetch images of other cards. Without an image, the preview shows its text, with the card name in the image frame.

**Pointer (desktop)**

- **FR-005**: On a device with a pointer that can hover, resting the pointer on a tile for a short delay (about 300 ms) MUST open that card's preview. Passing over a tile without resting MUST NOT open it. While a preview is open, moving to another tile MUST switch the preview to that card without the delay.
- **FR-006**: The pointer preview MUST appear next to its tile, fully inside the window, without covering that tile. It MUST stay open while the pointer is over the tile or over the preview itself, and close shortly after the pointer leaves both, or when Esc is pressed.
- **FR-007**: Clicking a tile while its preview is open MUST toggle it exactly as without a preview. The pointer preview MUST NOT take keyboard focus or block clicks on other tiles and controls.

**Touch (mobile)**

- **FR-008**: On touch input, pressing and holding a tile (about 500 ms) MUST open that card's preview. A long-press MUST NOT also toggle the tile when the finger lifts, and MUST NOT bring up the browser's own image menu, text selection or image drag. Moving the finger (e.g. to scroll) before the hold completes MUST cancel it. A plain tap on a tile MUST keep toggling it.
- **FR-008a**: The deck settings' hint text MUST mention the long-press on touch devices, and the pointer rest and right-click on pointer devices, so the preview can be discovered without trial and error.
- **FR-009**: A preview opened by long-press or by the context-menu action (FR-010) MUST open as a **preview dialog**, whatever the screen width: on a narrow screen it fills the screen with the image and the text stacked; on a wide screen it is centered, with the image beside the text. The text MUST scroll when it doesn't fit. The dialog MUST offer a close control and an on/off control for the card, and MUST close on a tap outside it, on Esc, or on the system back gesture/button, without leaving the deck settings or changing the draft. Hover never opens the dialog, and the dialog never opens as the control-free popover of FR-005–FR-007.
- **FR-009a**: The preview dialog MUST offer "previous" and "next" buttons that switch it to the adjacent card in the visible tile order, crossing from one set to the next and skipping collapsed sets. "Previous" is disabled on the first visible card and "next" on the last. Closing the dialog returns focus to the tile of the card it shows at that moment, scrolled into view. There is no swipe gesture.

**Keyboard and assistive technology**

- **FR-010**: Since the tiles carry no extra control, the preview dialog MUST open through the context-menu action on a tile: the Menu key or Shift+F10 on the focused tile, and a right-click with a mouse. The browser's own context menu MUST NOT appear on tiles. The tile's accessible description MUST name the keys in PT-BR. The preview's text MUST be available to assistive technology when opened this way. Focus alone MUST NOT open it, and Enter/Space keep toggling the tile.
- **FR-011**: The preview dialog (FR-009) MUST move focus into it, keep focus inside it while open, close on Esc, and return focus to the tile of the card it shows when closed (FR-009a). Opening the dialog closes any hover popover.

**General**

- **FR-012**: At most one preview is open at a time. Opening the preview never changes the draft; only the on/off controls do.
- **FR-013**: No preview MUST open while the save-confirmation footer is showing, and an open preview MUST close when its set is collapsed or the person leaves the deck settings.
- **FR-014**: All new user-facing text (control labels, the on/off indication, accessible names) MUST be PT-BR (Constitution II).
- **FR-015**: The preview's visual design (hover popover, and the preview dialog at narrow and wide widths) MUST be added to `DESIGN.md` before it is built (Constitution V), reusing the existing card block, ability plate and modal conventions where they apply.

### Key Entities

- **Planechase card** (existing, from spec 006): its English name, type, large image address, and its PT-BR or English type line, static text and ability. No new data is stored; the preview reads what the game already shows.
- **Deck draft** (existing, from spec 006): the unsaved set of disabled cards the preview reads and, through its on/off control, edits.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can read the full PT-BR text of any card in the deck settings without starting a game, in at most one gesture on either a desktop or a phone.
- **SC-002**: On a desktop, moving the pointer across the tile grid to reach a button opens no preview, and resting on a tile opens one in under half a second.
- **SC-003**: Every card's preview shows the same text as that card's block during a game.
- **SC-004**: The preview is always fully visible inside the window, on screens from 320 px wide up to desktop.
- **SC-005**: Closing a preview by any means (close control, tap outside, Esc, system back) never leaves the deck settings and never changes the draft.
- **SC-006**: Opening the deck settings downloads no large card images until a preview is opened.
- **SC-007**: A keyboard-only user can open, read and close the preview of any tile, and ends with focus back on that tile.

## Assumptions

- The preview reuses what the game already shows: the same content and wording as the card block, so nothing new needs translating beyond a few control labels.
- "Larger image" means the card's large image, already in the card data (006 FR-003).
- The input decides the presentation, not the screen width: hovering a pointer gives the popover; long-press, right-click, the Menu key or Shift+F10 give the dialog. A narrow window with a mouse still gets the hover popover.
- The hover popover is a quick look: it has no controls of its own, and the tile under the pointer stays the way to toggle the card.
- The preview only exists in the deck settings. The in-game card block and other screens are unchanged.
- No new saved state: which card is previewed isn't remembered.
