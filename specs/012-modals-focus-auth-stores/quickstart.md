# Quickstart: Modals, Focus & Auth Stores

These scenarios prove the feature end to end. The surfaces are in [contracts/shared-units.md](contracts/shared-units.md), the state in [data-model.md](data-model.md), and the visible behavior in [ui.md](ui.md).

## Prerequisites

- The dev server running (`npm start`, started by the maintainer).
- A Chromium browser, with a desktop window ≥ 960px wide and DevTools device mode for phone width.
- A local profile with at least one collection holding cards (for the delete dialog).
- A test cloud account (for the cloud flows).

## Automated

```bash
npm test        # full suite, via the test-runner agent
npm run lint
npm run build   # budgets unchanged
```

The specs must cover:

- **`FluidHeight`** (fake `ResizeObserver` from `@testing/resize-observer`):
  - one write on open;
  - instant before arming, `is-resizing` after it;
  - cleared on `transitionend` and after 300 ms;
  - none under reduced motion;
  - `''` on phone;
  - minimum and `capped`;
  - re-measure on window resize.
- **`focus.ts`**:
  - `focusFirst` priority order;
  - `captureFocus` with a removed opener (no throw);
  - `focusOnChange` doesn't refocus on a same-key render.
- **`rovingIndex`** and **`RovingRadios`**: arrows wrap, Home/End, and the no-selection rule.
- **`FlowForm`**: code filter, error clearing, the stale token, the submit lock.
- **`CloudSteps`**:
  - `forgot` locks to `lockedEmail`;
  - `back` defaults to `in`;
  - `requestCode` starts the 30 s cooldown;
  - a stale `resend` is ignored;
  - `reset` stops the timer;
  - two instances share no state.
- **Delete dialog**: Home/End.
- **Themed modal**: focus returns to the opener on destroy.
- **Existing specs**: every one passes unchanged (SC-001). The checkpoint list is compact-modal, nav-drawer, color-picker, format-picker, collection-delete-dialog, entry-flow.store, profile-flow.store and profile-modal.

## Manual

1. **Fluid height, themed modals (US1)**: on desktop, open the profile modal.
   - Expect no height animation while it opens.
   - Click inside, then go hub → "Conta na nuvem" → "Entrar".
   - Submit empty to show field errors, then go back.
   - Expect each change to animate (0.24s), never below 460px, with no scrollbar flash.
2. **Fluid height, compact modal (US1)**: open "Nova coleção" and submit an empty name.
   - Expect the error to grow the face smoothly.
   - Open "Excluir" on a collection with cards: the face takes its height instantly on open.
3. **Cap (US1-4/5)**: shrink the window height below the profile modal's content.
   - Expect only the form pane to scroll.
   - Grow it back: the scroll goes away.
   - With the compact modal, expect the whole face to scroll past `100vh − 4rem`.
4. **Reduced motion (US1-6)**: turn on DevTools → Rendering → `prefers-reduced-motion: reduce` and repeat 1. Expect instant height changes.
5. **Phone (US1-7)**: at 390px width, open each modal. Expect full-screen with no inline `height` on the face (Elements panel).
6. **Fonts (edge case)**: hard-reload with the network throttled (Slow 4G) and open the entry modal before the fonts load. Expect it to end at the right height after the swap.
7. **Focus (US2)**, keyboard only:
   - "Nova coleção": focus is in the name field. Esc returns it to the button that opened the dialog.
   - Entry modal, each screen: focus is on its first field or action. Typing that triggers a field error keeps focus in place.
   - Drawer at < 960px: Menu → Esc returns focus to Menu.
   - The four radio groups (delete choice, color picker, format picker, Interplanar Tunnel):
     - arrows wrap; Home/End jump to the ends;
     - in the delete choice with nothing selected, ArrowDown selects "Mover para a caixa temporária".
8. **Cloud flows (US4)**:
   - **Entry modal**: sign in, create a profile from the cloud, then "Esqueci minha senha" → code → "Enviar novo código". Expect a 30 s countdown, then "Usar outro e-mail".
   - **Profile modal**:
     - link a new account with an e-mail already in use, then "Recupere o acesso";
     - re-authenticate an expired session with "Esqueci minha senha", which keeps the e-mail locked.
   - **Late result**: close the modal while a request runs and reopen. Expect a blank form with no late error.
   - **Every flow**: the screens, copy and errors are identical to before.
9. **Design audit (US3)**: run the `design-auditor` agent. Expect no undocumented fluid-height finding for the compact modal.
