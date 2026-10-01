# UI Design: Modals, Focus & Auth Stores

No new surface, layout or copy. This feature changes *how* three modal kinds size and move focus, and one behavior a person can notice: the entry and profile modals no longer animate their height while opening (FR-009). Everything else must look and act as today.

## 1. Surfaces

| Surface | New / modified | Component | What changes |
|---|---|---|---|
| Compact modal (collection/deck create, edit, delete; reload prompt) | Modified (internals) | `CompactModal` | Height via `FluidHeight`; focus via `focus.ts`. No visible change. |
| Entry modal | Modified | `EntryModal` in `ThemedModal` | Height via `FluidFace` → `FluidHeight`, direct writes; animates only after the first interaction (FR-009); a capped pane hides its scrollbar while resizing. |
| Profile modal | Modified | `ProfileModal` in `ThemedModal` | Same as the entry modal. |
| Themed modal shell | Modified (internals) | `ThemedModal` | `faceHeight` input removed; transition gated on `is-sized`; opener via `captureFocus`. |
| Navigation drawer | Modified (internals) | `NavDrawer` | Open/close focus via `focusElement`. No visible change. |
| Delete dialog's choice | Modified | `CollectionDeleteDialog` | Keys via `RovingRadios`; gains Home/End. |
| Color picker | Modified (internals) | `ColorPicker` | Keys via `RovingRadios`. |
| Format picker | Modified (internals) | `FormatPicker` | Keys via `RovingRadios`. |
| Interplanar Tunnel chooser | Modified | `TunnelChoice` | Keys via `RovingRadios`; with nothing chosen, the first arrow selects the focused plane (research R8). |
| DESIGN.md | Modified | "Fluid height", "Compact modal" | Documents the settled behavior (§5). |

## 2. Layout

Unchanged at every breakpoint.

- **Phone (≤ 640px)**: all three modal kinds stay full-bleed, and no height is written (FR-004).
- **Desktop**: the themed modals keep the 880px two-column face with a 460px minimum. The compact modal keeps its 480px ring with no minimum.

## 3. States

| State | Compact modal | Entry / profile modal | Requirement |
|---|---|---|---|
| Opening (unarmed) | Takes its content height instantly | Same; **was animated before** | FR-009, US1-8 |
| Armed (after the first pointer/key press inside) | Height changes animate over `base` 0.24s | Same | US1-1, US1-2 |
| Resizing | The face hides its scrollbar | The form pane hides its scrollbar, even when capped | FR-003, US1-3 |
| Content taller than the window | The face stops at `100vh − 4rem` and the whole face scrolls | The face stops at `100dvh − 2 × space-6`; only the form pane scrolls (`capped`) | FR-005, FR-010, US1-4 |
| Window resized | Re-measured; the CSS cap follows | Re-measured; `capped` updates | FR-006, US1-5 |
| Reduced motion | Every change instant | Every change instant | FR-008, US1-6 |
| Phone | Full-screen, no tracking | Full-screen, no tracking | FR-004, US1-7 |

## 4. Interaction flow

Unchanged:
- every entry, profile, collection and deck flow;
- every screen order;
- the drawer → modal hand-off (the drawer closes first, so the modal records Menu as its opener).

## 5. Design-system reuse and DESIGN.md text

No new tokens, classes or components in the design system. The motion tokens are `--duration-base` (0.24s) and `--ease-standard`. `is-sized`, `is-resizing` and `capped` are component-internal state classes.

**DESIGN.md edits** (FR-011, FR-012), to be written in DESIGN.md's own voice during implementation:

- **"Fluid height"**, in the modal blueprint list. Replace the bullet with:
  > **Fluid height:** the desktop surface animates its height to its content (minimum 460px) over `base` 0.24s. Content changes (mode switches, errors appearing, confirmation screens) resize the modal smoothly; it never jumps. Height changes animate only after the first pointer or key press inside the modal; while it opens and its content settles, it takes its height instantly. Instant under reduced motion. The face stops at the viewport height less `space-6` on each side; only then does the form pane scroll, and no scrollbar shows while the height animates.

- **"Compact modal"**: append a sentence:
  > Desktop: the face follows its content's height over `base` 0.24s, with the same rule as the auth blueprint's fluid height: animated only after the first pointer or key press inside it, instant under reduced motion, no scrollbar while it animates. It has no minimum; it stops at the viewport height less 4rem, and past that the whole face scrolls.

"Delete radios" gets no keyboard text. Like "Color picker" and "Format picker", whose keys are documented in their component comments, not DESIGN.md, keyboard behavior isn't a visual decision.

## 6. Accessibility

- **Open focus**:
  - compact modal: the content's `[data-autofocus]` (the name field, or Cancelar in a confirmation);
  - themed modals: on each new screen, the first editable field → action-row button → list option button → any enabled button. Nothing moves on a re-render of the same screen;
  - drawer: ✕ when opened by keyboard, else the dialog itself.
- **Close focus**:
  - modals return focus to the captured opener, if it is still in the document;
  - the drawer returns focus to Menu.
- **Focus trapping**: native `<dialog>` `showModal()`, unchanged.
- **Radio groups**:
  - one tab stop each (roving `tabindex`, unchanged);
  - arrows move and select, wrapping; Home and End go to the ends; selection follows focus;
  - with nothing selected, the first arrow selects the focused option.
- **Reduced motion**: height transitions off; no `is-resizing` state.

## 7. Copy

No user-visible text changes (FR-026). The only new text is the DESIGN.md wording in §5.
