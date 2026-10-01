# Feature Specification: Modals, Focus & Auth Stores

**Feature Branch**: `012-modals-focus-auth-stores`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "Modals, focus & auth stores (backlog roadmap entry 3; items #6, #7, #16, #19 in backlog/pending-items.md). Goal: one settled modal foundation that later UI can use without copying code. Shared height tracking for both modal kinds, one focus helper, the compact modal's fluid height documented in DESIGN.md, and auth flow stores small enough to change safely. This is mostly a refactor: what users see in the collection dialogs (CompactModal), the entry modal and the profile modal must stay the same, except where this spec deliberately decides otherwise. (1) Shared modal height tracking (#6), keeping CompactModal's direct height write, is-resizing state and no measuring on phone, and FluidFace's prompt measuring, fixed chrome, 460px minimum, viewport cap with `capped` and window-resize re-measure; removing the duplicate measure on open, the themed modal's height binding if the direct write replaces it, and the fonts-ready re-measure if the resize observer already covers it. (2) DESIGN.md: compact modal fluid height (#7). (3) Focus-management helper (#19), replacing the hand-written focus moves while keeping each place's behavior. (4) Split the auth flow stores (#16) with a shared cloud sub-store. Out of scope: page transitions, the setTimeout/effect audits, mobile landscape, storage & sync items #39/#40, the Planechase gameplay items."

## Context

Modals are the shell for most of Grimorio's UI: the entry modal (pick, unlock or create a profile), the profile modal (manage the active profile and its cloud account) and the compact modal (create, edit and delete collections and decks). Future features (adding cards, deck editing) will open more of them. Today their foundation has four problems:

- **Height tracking exists twice.** On desktop, both modal kinds grow and shrink with their content, but each does it with its own code, and the two differ in small ways (when the change animates, how the maximum height is enforced, what is measured). A new modal would have to copy one of them.
- **The compact modal's fluid height is undocumented.** DESIGN.md describes fluid height only for the 880px auth/profile modal, so by DESIGN.md's own rule the compact modal's behavior is undecided.
- **Focus moves by hand.** Opening a modal focuses its first field, closing one returns focus to whatever opened it, and arrow keys move between options in radio groups. Each of these is written separately in each place, with small differences (some radio groups support Home/End, one doesn't).
- **The auth flow stores are the largest files in the app** (about 720 and 580 lines). Both contain the same cloud steps (sign in, create account, reset code, resend with cooldown, "e-mail already in use"), written twice, so a change to the cloud flow must be made in two places.

This spec settles these before later features build on them. It is entry 3 on the feature roadmap (`backlog/features.md`, "Modals, focus & auth stores") and absorbs pending items #6, #7, #16 and #19. It is mostly a refactor: every flow a person can run today behaves the same afterwards, except where this spec decides otherwise below.

## Clarifications

### Session 2026-10-01

- Q: Should the entry and profile modals adopt the compact modal's rule that height changes animate only after the first pointer or key press inside the modal? → A: Yes, one rule for all three modals: nothing animates while a modal opens.
- Q: What should the compact modal do when its content is taller than the window allows? → A: Keep its current behavior: the whole face scrolls past the maximum height.
- Q: Which radio groups move to the shared focus mechanism? → A: All four (delete dialog's choice, color picker, deck format picker, Interplanar Tunnel chooser); the delete dialog's choice gains Home/End.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Modals keep resizing smoothly with their content (Priority: P1)

On desktop, a person opens the profile modal and moves from the hub to the cloud sign-in screen, gets an error message under the password, then reaches a confirmation screen. Each change of content resizes the modal smoothly, never jumping and never flashing a scrollbar. Later they create a collection in the compact modal; the same happens when a validation message appears under the name. Both modal kinds now get this behavior from one shared mechanism, which any future modal can reuse.

**Why this priority**: It is the base the other modal work depends on, and it is the part a person can see; a regression here (jumps, flashing scrollbars, clipped content) shows up in every modal.

**Independent Test**: On a desktop window, open each modal kind, walk through screens and error states of different heights, and confirm the height follows the content with an animation, with no scrollbar flash and no clipping; repeat with reduced motion turned on and confirm the changes are instant; repeat on a phone-width window and confirm the modals are full-screen with no height tracking.

**Acceptance Scenarios**:

1. **Given** the entry or profile modal is open on desktop, **When** its content changes height (a screen change, an error appearing, the prompt at the bottom appearing or disappearing), **Then** the modal's height follows the content, animated over the standard modal duration, and is never shorter than 460px.
2. **Given** the compact modal is open on desktop, **When** its content changes height after the person has interacted with it, **Then** its height follows the content with the same animation.
3. **Given** either modal kind is resizing, **When** the height animates, **Then** no scrollbar appears during the animation.
4. **Given** content taller than the window allows, **When** the modal reaches its maximum height, **Then** the content scrolls inside the modal instead of being cut off.
5. **Given** the window is resized while a modal is open, **When** the available height changes, **Then** the modal's maximum height and whether its content scrolls update to match.
6. **Given** reduced motion is on, **When** content changes height, **Then** the modal changes height instantly.
7. **Given** a phone-width screen, **When** either modal opens, **Then** it is full-screen as today and its height is not tracked.
8. **Given** any of the three modals is opening, **When** its content is still settling (fonts loading, first layout), **Then** the modal takes its content's height without animating; height changes animate only after the first pointer or key press inside the modal.

---

### User Story 2 - Focus lands in the right place, the same way everywhere (Priority: P1)

A keyboard user opens the "Nova coleção" dialog and starts typing the name straight away, because focus is already in the name field. They close it with Esc and focus returns to the button that opened it. In the entry modal, each new screen puts focus on its first field or action. In the delete dialog's choice between "Mover para a caixa temporária" and "Excluir as cartas", the arrow keys move between the options. All of these behave as they do today, now through one shared focus mechanism.

**Why this priority**: Focus is what makes the modals usable from a keyboard and with a screen reader; the refactor must not break it, and future modals and option groups should get it without writing it again.

**Independent Test**: Using only the keyboard, open and close each modal and the navigation drawer, walk through the entry and profile modal screens, and use the arrow keys in each radio group; confirm focus lands where it does today at every step.

**Acceptance Scenarios**:

1. **Given** a compact modal opens, **When** its content marks a first stop (the name field, or Cancelar in a confirmation), **Then** that element receives focus.
2. **Given** the entry or profile modal shows a new screen, **When** the screen appears, **Then** focus moves to its first editable field, or else its action row, or else its first list option, or else its first enabled button, as today.
3. **Given** the same screen re-renders without changing (a field error appears, say), **When** it updates, **Then** focus stays where the person left it.
4. **Given** any modal or the navigation drawer closes, **When** it closes, **Then** focus returns to the control that opened it (the Menu button for the drawer).
5. **Given** a radio group of options has focus (the delete dialog's choice, the color picker, the deck format picker, the Interplanar Tunnel chooser), **When** the person presses an arrow key, **Then** the selection and focus move to the next or previous option, wrapping around, as today.
6. **Given** any of those four radio groups has focus, **When** the person presses Home or End, **Then** the selection and focus move to the first or last option (new for the delete dialog's choice).

---

### User Story 3 - The compact modal's fluid height is a documented design decision (Priority: P2)

The maintainer, building a new dialog on the compact modal, reads DESIGN.md's "Compact modal" entry and finds how its desktop height behaves: it follows its content, when the change animates, its maximum height and what scrolls past it. The design auditor checks the compact modal against that entry and no longer reports its fluid height as undecided.

**Why this priority**: Required by the constitution (UI not in DESIGN.md is undecided), but it documents behavior rather than changing it, so it follows Story 1's decisions.

**Independent Test**: Read DESIGN.md's "Compact modal" entry and confirm it describes the fluid height decided in Story 1; run the design audit on the compact modal and confirm it reports no undocumented fluid-height behavior.

**Acceptance Scenarios**:

1. **Given** DESIGN.md, **When** the maintainer reads the "Compact modal" entry, **Then** it states that the desktop face follows its content's height, its animation duration, when the animation applies (including under reduced motion), and how its maximum height and scrolling work.
2. **Given** DESIGN.md's general "Fluid height" rule, **When** the maintainer reads it, **Then** it agrees with the behavior Story 1 settles for the entry and profile modals.

---

### User Story 4 - The cloud steps live in one place (Priority: P2)

The maintainer needs to change how the cloud sign-in form handles an e-mail that is already in use. They find the cloud steps (sign in, create account, reset code, resend with cooldown) in one shared unit, used by both the entry modal and the profile modal, change it once, and both modals pick up the change. The entry and profile flow stores now hold only their own screens.

**Why this priority**: No direct user value, but the cloud flow is the most likely part of auth to change (new sign-in methods, error handling), and today every change must be made twice and kept in step.

**Independent Test**: Run the existing entry and profile flow tests and confirm they pass; walk every cloud flow in both modals (sign in, create account, forgot password with code, resend code with cooldown, e-mail already in use with "Recupere o acesso", re-authenticate an expired session) and confirm each behaves exactly as before.

**Acceptance Scenarios**:

1. **Given** the entry modal, **When** a person signs in to a cloud account, creates one, resets its password with a code or resends the code, **Then** every screen, message, field error and cooldown behaves as before.
2. **Given** the profile modal, **When** a person links a cloud account, re-authenticates an expired session, resets its password or resends the code, **Then** every screen, message, field error and cooldown behaves as before.
3. **Given** a cloud request is still running, **When** the person leaves the screen or closes the modal, **Then** its late result is ignored as today.
4. **Given** the split stores, **When** the maintainer reads either modal's store, **Then** it contains only that modal's own screens, and the shared cloud steps are in one unit used by both.

### Edge Cases

- **Content changes height while the modal is still opening**: the modal must not visibly animate from a wrong starting height (see Story 1, scenario 8).
- **A height change interrupted by another one, or clamped by the maximum height**: the scrollbar-hiding state still clears, even if the animation never finishes.
- **Fonts finish loading after the modal opens**: the modal re-measures and ends at the right height; whether a separate trigger is needed for this or the content-size tracking already catches it is checked during planning, not assumed.
- **The window shrinks below the modal's content height while open**: the content becomes scrollable inside the modal; growing the window again removes the scroll.
- **A modal switches between phone and desktop width while open**: as today, the phone layout is decided by the screen width, and height tracking applies only on desktop.
- **A screen has no focusable element**: focus stays on the dialog, as today; nothing throws.
- **The element that opened a modal is gone when it closes** (it was inside content that re-rendered): closing must not throw; focus falls back to the browser default, as today.
- **A modal opens while the navigation drawer is open**: the drawer closes first, so the modal records Menu as its opener, as today.
- **The delete dialog's choice with nothing selected yet** (DESIGN.md: nothing is selected by default): an arrow key selects and focuses an option, as today.
- **A cloud step's request resolves after the modal moved to another screen or closed**: the late result changes nothing, in either modal.
- **Only one modal at a time**: the shared cloud steps must not make the entry and profile modals share state with each other; opening one while the other was open is still a no-op, and each starts from a blank form.

## Requirements *(mandatory)*

### Functional Requirements

**Shared height tracking (#6)**

- **FR-001**: The entry modal, the profile modal and the compact modal MUST get their desktop fluid height from one shared mechanism; neither modal kind keeps its own copy of the measuring logic.
- **FR-002**: The shared mechanism MUST apply a new height in the same frame as the content change that caused it, so no scrollbar flashes for a frame.
- **FR-003**: While a height change animates, the modal MUST NOT show a scrollbar; that state MUST clear when the animation ends, and also after a short fallback delay if the animation never runs or is interrupted.
- **FR-004**: On phone-width screens the mechanism MUST NOT set any height; the modals stay full-screen.
- **FR-005**: For the entry and profile modals, the measured height MUST include the pinned bottom prompt when one shows and the form pane's fixed padding and close row, MUST NOT go below 460px, and MUST report when the content is taller than the largest height the window allows, so that only then the content area scrolls.
- **FR-006**: The maximum height and the scroll state MUST update when the window is resized.
- **FR-007**: Opening a modal MUST measure its content once, not twice.
- **FR-008**: Under reduced motion, every height change MUST be instant.
- **FR-009**: In all three modals, height changes MUST animate only after the first pointer or key press inside the modal; changes before that (while the modal opens and its content settles) MUST apply instantly. This is a behavior change for the entry and profile modals, which today can animate while opening, and DESIGN.md MUST state the rule.
- **FR-010**: The compact modal MUST keep its current maximum height: the face stops at the largest height the window allows and the whole face scrolls past it. The shared mechanism applies the 460px minimum and the `capped` scroll rule only to the entry and profile modals.

**DESIGN.md (#7)**

- **FR-011**: DESIGN.md's "Compact modal" entry MUST describe its desktop fluid height: that the face follows its content's height, the animation duration (`base`, 0.24s), when the animation applies and when it doesn't (including reduced motion), and its maximum height and scrolling, matching FR-009 and FR-010.
- **FR-012**: DESIGN.md's general "Fluid height" rule for the 880px modal MUST match the behavior FR-009 settles for the entry and profile modals.

**Focus management (#19)**

- **FR-013**: Moving focus on open, on screen change and on close MUST go through one shared focus mechanism, replacing the hand-written focus moves in the compact modal, the themed modal, the entry/profile modals' screen changes and the navigation drawer.
- **FR-014**: The compact modal MUST still focus the element its content marks as the first stop when it opens.
- **FR-015**: The entry and profile modals MUST still focus, on each new screen, the first match in this order: an editable field, an action-row button, a list option's button, any enabled button; and MUST NOT move focus when the same screen re-renders.
- **FR-016**: Every modal and the navigation drawer MUST still return focus to the control that opened it when they close.
- **FR-017**: Keyboard movement in all four radio groups (the delete dialog's choice, the color picker, the deck format picker, the Interplanar Tunnel chooser) MUST go through the shared focus mechanism: the arrow keys move to the next or previous option, wrapping around; Home and End move to the first and last option; selection follows focus as today. The delete dialog's choice gains Home and End, which it lacks today.
- **FR-018**: Focus moves elsewhere in the views (a page heading focused after a page change, Planechase controls) are out of scope and stay as they are.

**Auth flow stores (#16)**

- **FR-019**: The cloud steps both modals share (the sign-in, account-creation and reset-code forms' fields, field errors, labels and helpers, "Esqueci minha senha", "e-mail already in use" with "Recupere o acesso", choosing another e-mail, resending the code with its cooldown) MUST live in one unit used by both the entry and profile modals.
- **FR-020**: The entry flow store and the profile flow store MUST each keep only their own screens and actions; neither may keep a copy of a shared cloud step.
- **FR-021**: The shared cloud forms (`CloudForm`, `ResetForm`) MUST keep rendering identically in both modals.
- **FR-022**: Every entry and profile flow MUST behave exactly as before: same screens in the same order, same PT-BR copy, same field errors, same cooldown, same handling of a late result after the person moved on, same cloud error mapping.
- **FR-023**: Each modal's cloud state MUST start blank when the modal opens and MUST NOT be shared between the two modals.

**Guardrails**

- **FR-024**: The existing modal, auth-flow and focus tests MUST keep passing; a test changes only where a decision in this spec changes the behavior it checks.
- **FR-025**: New behavior this spec introduces (the shared height mechanism, the shared focus mechanism, the shared cloud unit) MUST be covered by tests.
- **FR-026**: No user-visible text changes, except any text DESIGN.md needs for the decisions above.

### Key Entities

- **Modal face**: the visible surface of a modal on desktop; its height follows its content, between a minimum (460px for the entry and profile modals, none for the compact modal) and the largest height the window allows.
- **Focus stop**: the element that receives focus when a modal opens or shows a new screen: marked explicitly by the content (compact modal) or found by a priority order (entry and profile modals).
- **Opener**: the control that had focus when a modal or the drawer opened, which gets focus back when it closes.
- **Cloud steps**: the sign-in, account-creation, reset-code and resend parts of the auth flows, with their fields, field errors, cooldown and in-flight request; shared in behavior by both modals, with separate state per modal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every existing test for the modals, the navigation drawer, the radio groups and the entry and profile flows passes, with changes only where this spec decides a behavior change.
- **SC-002**: Walking every flow of the entry and profile modals (local and cloud) shows the same screens, copy and focus stops as before the change, with 0 differences outside the decisions in this spec.
- **SC-003**: The measuring logic for modal height exists in exactly 1 place, used by 3 modals; the focus-on-open, focus-on-screen-change and return-focus logic exists in exactly 1 place.
- **SC-004**: Each shared cloud step is implemented once instead of twice.
- **SC-005**: On desktop, across screen changes and error states in all three modals, no scrollbar is visible during a height animation and no content is clipped.
- **SC-006**: The design audit reports no undocumented behavior for the compact modal's height, and DESIGN.md's "Fluid height" and "Compact modal" entries agree with what the modals do.

## Assumptions

- **Technical choices are left to the plan**: whether the focus mechanism is a helper, a directive or both; whether autofocus uses an explicit marker, the priority order, or both per modal kind (as long as each modal keeps its current focus stops, FR-014/FR-015); and how the shared cloud unit is provided to the two modals (today they share forms through the `CloudFlowHost` token). These don't change what a person sees, so `/speckit-plan` decides them.
- **The fonts-ready re-measure** is removed only if planning confirms the content-size tracking already catches the change when fonts finish loading; otherwise it stays in the shared mechanism.
- **The themed modal's height binding** is replaced by the direct write (FR-002), since one mechanism serves all three modals; the entry and profile modals don't flash a scrollbar today because their form pane hides overflow, so this changes nothing visible for them.
- **The 460px minimum and the 880px layout** stay specific to the entry and profile modals; the compact modal keeps no minimum.
- **No line-count target**: the stores get smaller as a side effect of removing the duplicated cloud steps; their size is not a goal in itself.
- **Early development, single user**: no backward-compatibility code for the old height or focus code paths.
- **Spec 010's tests** guard the refactor; any missing coverage for a behavior this spec keeps (for example, return-focus on the drawer) is added before or with the change.
- **Out of scope**: page transitions (roadmap entry 4), the `setTimeout`/`effect` audits (entry 5, which comes after this spec rewrites many of them), mobile landscape (entry 6), storage & sync items #39/#40, and the Planechase gameplay items.
