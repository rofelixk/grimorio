# Quickstart: validating the planar card preview

Contracts are in [contracts/components.md](contracts/components.md), states in [ui.md](ui.md).

## Prerequisites

- The dev server is running (`npm start`, http://localhost:4200). The route is
  `/modes/planechase/deck`, and it needs no profile.
- For touch checks: a phone on the same network (or the Android build from the `android-build`
  skill), or Chrome DevTools device mode for a first pass. DevTools doesn't reproduce native
  long-press menus or the system back button, so run those steps on a real device.

## Automated

```bash
npm test
npm run lint
```

What the tests need to cover:
- `default-off.ts`: all 8 ids exist in `cards.json`, and the default passes `validateSelection`.
- `enabledCards(cards, null)` excludes exactly the default-off ids. With a saved selection it
  ignores the list.
- `placePopover`: left-half tile → right side, right-half → left side, never intersecting the
  tile, clamped between the top and bottom bounds, and the fallback when a narrow window fits
  neither side.
- `visibleOrder`: sets in order, collapsed sets skipped.
- `PlanarTile`: 300 ms hover emits only for mouse/pen, a touch hold fires at 500 ms and swallows
  the next click, more than 8 px of movement or `pointercancel` cancels it, Menu and Shift+F10
  emit, and Enter/Space still toggle.
- `PlanarPreviewController`: an immediate switch while open, the 150 ms close, the Esc close, the
  guard while `confirming()`, closing on collapse, the Anterior/Próxima ends, and focus returning
  to the current card's tile.
- `PlanarPreviewDialog`: the header position, disabled nav at the ends, the toggle's labels and
  `aria-pressed`, and `closed` on cancel and on a backdrop click.

## Manual: desktop (mouse), User Story 1

1. Clear site data (DevTools → Application → Clear site data) so no selection is saved.
2. Open `/modes/planechase/deck`. The hint is the pointer version. Otaria, Temple of Atropos,
   Sanctum of Serra, Norn's Dominion, Planewide Disaster, Morphic Tide, Lethe Lake and Unleash
   the Flux show as off, and the counter reads `143 de 151 cartas · …` (US4, scenario 1).
3. Sweep the mouse quickly across a row → no popover (SC-002).
4. Rest on a tile in column 1 → the popover appears on its right within half a second. Rest on
   column 4 → it appears on the left. Near the bottom it stays above the footer (FR-006, SC-004).
5. Move to the neighbor tile → the content switches with no flicker. Click → the tile toggles and
   the popover's status flips. Move off → it closes after a short beat. Esc also closes it.
6. Check the English fallback on an untranslated card, a phenomenon (no static text, "Ao
   encontrar"), and an off card (image at full strength).
7. Right-click a tile → the wide dialog opens and no browser menu appears. Próxima across a set
   boundary → the header's set and "{i} de {n}" update. Collapse a set first and check that it's
   skipped. Toggle in the dialog → the counter behind it updates. Esc → focus lands on the tile of
   the card shown, scrolled into view.
8. With a game in progress, change a card and press Salvar → the confirm footer shows. Hover and
   right-click open nothing (FR-013).
9. Narrow the window below 640 px and right-click → the narrow dialog opens. Widen it while open →
   it stays narrow.
10. The browser's back button with the dialog open → only the dialog closes, and the draft is
    intact (SC-005).

## Manual: keyboard, User Story 3

1. Tab through the tiles → no preview opens. Shift+F10 → the dialog opens with focus on ✕.
2. Tab cycles inside the dialog. Esc → focus returns to the tile.
3. With a screen reader, the tile announces its name, state and "Menu ou Shift+F10 abre a carta.",
   and the dialog announces the card name as its label.

## Manual: phone, User Story 2

1. The hint is the touch version. Tap a tile → it toggles, and no preview opens.
2. Press and hold → the glow grows and the full-screen dialog opens at about 0.5 s. Lifting the
   finger doesn't toggle the tile. No image menu, text selection or drag ghost appears.
3. Start a hold, then scroll → the list scrolls, and nothing opens or toggles.
4. In the dialog: the text scrolls, the footer stays pinned above the home indicator, the toggle
   and Anterior/Próxima work, and a tap on ✕ closes it.
5. The system back gesture/button with the dialog open → the dialog closes and the deck settings
   stay with the draft unchanged. Press back again → you leave the deck settings as before.
6. Tablet (> 640 px) hold → the centered wide dialog opens. A tap outside it closes it.
7. With reduced motion on in the OS: the ring is still, and the hold glow appears without
   growing.

## Manual: default selection, User Story 4

1. With nothing saved, start a game from `/modes/planechase` and planeswalk through the whole
   deck → none of the 8 default-off cards appear (SC-008).
2. Turn Otaria on and save → it's in the deck. Reload → it stays on. The default list plays no
   further part (FR-018).
3. With a linked profile that never saved, sync → nothing is uploaded for the selection until a
   save.

## Offline

Preview a card, go offline (DevTools → Network → Offline), and preview it again → the image still
shows. Preview a never-seen card while offline → it shows the name and "Imagem indisponível sem
conexão", and the text is intact.
