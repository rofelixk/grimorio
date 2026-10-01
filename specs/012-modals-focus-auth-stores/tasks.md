---

description: "Task list for Modals, Focus & Auth Stores"
---

# Tasks: Modals, Focus & Auth Stores

**Input**: Design documents from `/specs/012-modals-focus-auth-stores/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/shared-units.md, ui.md, quickstart.md

**Tests**: Requested. FR-025 requires specs for every new shared unit (height, focus, cloud), and FR-024 requires every existing spec to keep passing unchanged. Within each story the new spec is written first and must fail before the unit exists.

**Organization**: Tasks are grouped by user story. US1 and US2 both touch `compact-modal.ts`, `themed-modal.ts` and `fluid-face.ts`, so they run in order (US1 height first, then US2 focus), not in parallel.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Paths are from the repository root; `@testing/*`, `@utils/*`, `@shared/*` aliases resolve per `tsconfig.json`

---

- [X] T000 Before any other task, check out `feature/012-modals-focus-auth-stores` and make its first commit: every file under `specs/012-modals-focus-auth-stores/` and nothing else (this feature has no `design_handoff_*/` folder).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The test helper the height specs need (research R11: jsdom has no `ResizeObserver`)

- [ ] T001 Create the fake `ResizeObserver` in `src/app/core/testing/resize-observer.ts`: `installResizeObserver()` replaces `globalThis.ResizeObserver` with a fake that records each instance's callback and observed elements, `restoreResizeObserver()` puts the original back (or deletes it when there was none), and `notifyResize(target?)` delivers one observation to every instance observing `target` (or every observed element when omitted); `disconnect()` and `unobserve()` stop delivery. Specs set `offsetHeight` with `Object.defineProperty` because jsdom has no layout. Follow the style of `src/app/core/testing/dialog.ts` (`stubDialog()`).
- [ ] T002 Checkpoint: run `npm run lint` and the full suite through the `test-runner` agent, fix everything, then commit Phase 1 ("Modals, focus & auth stores: setup").

---

## Phase 2: Foundational (Blocking Prerequisites)

None. Each story's shared unit (`FluidHeight`, `focus.ts`/`RovingRadios`, `FlowForm`/`CloudSteps`) is built inside that story, and nothing blocks all four stories.

---

## Phase 3: User Story 1 - Modals keep resizing smoothly with their content (Priority: P1) 🎯 MVP

**Goal**: One `FluidHeight` mechanism gives the compact modal and both themed modals their desktop fluid height, with direct same-frame writes and one animation rule (FR-001–FR-010).

**Independent Test**: On desktop, walk screens and error states in the profile modal, the entry modal and "Nova coleção": height follows content with a 0.24s animation only after the first click or key, never below 460px in the themed modals, no scrollbar flash; reduced motion makes it instant; at phone width the face has no inline `height` (quickstart Manual 1–6).

### Tests for User Story 1

- [ ] T003 [US1] Write `src/app/shared/ds/fluid-height.spec.ts` against the contract in `contracts/shared-units.md` (`FluidHeight`), using `installResizeObserver`/`notifyResize` from `@testing/resize-observer` and a host component that creates `new FluidHeight({...})` in its constructor inside a `<dialog>` (`stubDialog()` from `@testing/dialog`). Cases: (a) the first `notifyResize` writes `face.style.height` once, with no explicit measure call (FR-007); (b) before any `pointerdown`/`keydown` on the dialog, a height change writes instantly and adds no `is-resizing` (FR-009); (c) after a `keydown` on the dialog the face gets `is-sized`, and a changed height adds `is-resizing` on the scroller; (d) `is-resizing` clears on a `transitionend` with `propertyName: 'height'` whose target is the face, and separately after 300 ms with fake timers (FR-003); (e) under `prefers-reduced-motion: reduce` no `is-resizing` is ever set (FR-008); (f) at phone width (`(max-width: 640px)` matching) the height is `''` and neither `capped` nor `is-resizing` is present (FR-004); (g) with `min: 460` a measure of 300 writes `460px`; (h) with `cap: 64` and `innerHeight` 600, a measure of 700 adds `capped` to the scroller and one of 400 removes it (FR-005); (i) a window `resize` event re-measures (FR-006); (j) an unchanged height writes nothing; (k) destroying the host disconnects the observer and clears the timer; (l) switching the mobile query while open: going to phone width clears the height and `capped`, and coming back to desktop writes the measured height again (spec edge case: phone↔desktop while open). Stub `matchMedia` per case. Confirm the spec fails (no `fluid-height.ts` yet).

### Implementation for User Story 1

- [ ] T004 [US1] Create `src/app/shared/ds/fluid-height.ts` exporting `FluidHeightConfig` and `FluidHeight` exactly as in `contracts/shared-units.md`, with the state machine of data-model.md §1. In the constructor (injection context): one `ResizeObserver` (guard `typeof ResizeObserver !== 'undefined'`) observing `config.observe()` elements from an `afterRenderEffect`, re-observing when the set changes; the callback calls the private measure directly (no `requestAnimationFrame`, FR-002). Measure: on phone (`mediaQuerySignal` with the same mobile query `CompactModal` uses today) write `''`, remove `capped`/`is-resizing`; else `h = max(min ?? 0, ceil(measure()))`, skip when `measure()` is `null` or `h` equals the last written value; with `cap`, `capped = h > innerHeight - cap`, toggle the `capped` class on `scroller()` (defaults to `face()`) and expose it as the `capped` signal; when armed and not reduced motion, add `is-resizing` to the scroller and (re)start a 300 ms fallback timer; write `face.style.height = h + 'px'`. Arming: the first time the `afterRenderEffect` finds the face, it attaches `pointerdown` and `keydown` listeners to `face.closest('dialog')` and the `transitionend` listener to the face, once. They are not attached in the constructor, because the `viewChild` refs aren't available yet. The first `pointerdown` or `keydown` adds `is-sized` to the face. `transitionend` on the face clears `is-resizing` only when `event.target === face && event.propertyName === 'height'`. Window `resize` listener and an `effect` on the mobile signal both re-measure (research R6). No `document.fonts.ready` re-measure (R3). `DestroyRef.onDestroy`: disconnect, remove all listeners, clear the timer. Copy the reduced-motion and mobile detection idioms from the current `src/app/shared/ds/compact-modal/compact-modal.ts`. Make T003 pass.
- [ ] T005 [US1] Change `src/app/shared/ds/compact-modal/compact-modal.ts` and `compact-modal.html` to use `new FluidHeight({ face, observe: () => [content], measure: () => content.offsetHeight })` with no `min` and no `cap` (FR-010: the face keeps its CSS `max-height: calc(100vh - 4rem)` and scrolls as a whole). Remove its own `ResizeObserver`, `measure()`, the `sized` signal, the fallback timer, `onTransitionEnd`, the explicit measure after observe, and the template's `(transitionend)` and `[class.is-sized]`/`[class.is-resizing]` bindings. Leave the open-focus and opener code as it is (US2 replaces it). Keep `compact-modal.scss` as is: its `transition` already lives under `.face.is-sized`. `src/app/shared/ds/compact-modal/compact-modal.spec.ts` must pass unchanged; if it asserted the removed internals, report it rather than editing it.
- [ ] T006 [US1] Change `src/app/shared/ds/themed-modal/themed-modal.ts`, `themed-modal.html` and `themed-modal.scss`: remove the `faceHeight` input and the `[style.height.px]` binding on the face; add a public `readonly face = viewChild.required<ElementRef<HTMLElement>>('face')` (add the `#face` template ref if missing); move the face's `height` `transition` under `.face.is-sized` (the reduced-motion `transition: none` rule stays). Leave its opener capture/restore as is (US2 replaces it).
- [ ] T007 [P] [US1] Add `.form-pane.is-resizing { overflow: hidden; }` to `src/app/shared/ds/themed-modal/_face.scss`, placed after the `.form-pane.capped` rule so it wins over `capped` (research R5).
- [ ] T008 [US1] Rewrite the measuring part of `src/app/shared/ds/themed-modal/fluid-face.ts` as the themed preset over `FluidHeight`: `FluidFaceRefs` gains `face` (the `ThemedModal.face` element ref signal) and `pane` (the `.form-pane` ref), keeps `content`, `prompt` and `screenKey` (contracts `FluidFace`); config is `min: 460`, `cap: 64`, `scroller: pane`, `observe: [content, prompt]`, and `measure` = `80 + content.offsetHeight + (prompt ? 16 + prompt.offsetHeight : 0)` (the existing chrome/prompt constants, moved as they are), returning `null` while content is absent. Remove the `faceHeight` and `capped` signals, the `document.fonts.ready` re-measure, the explicit measure after observing and the module's own observer/resize listener. Keep the existing focus-on-screen-change loop unchanged for now (US2 replaces it).
- [ ] T009 [US1] Update `src/app/shared/auth/entry-modal/entry-modal.ts` and `entry-modal.html`: query the `ThemedModal` (`viewChild.required(ThemedModal)`) and pass `face: computed(() => themed().face())` plus a `pane` `viewChild` on the `.form-pane` element into `new FluidFace({...})`; remove `[faceHeight]` from `<app-themed-modal>` and `[class.capped]` from the form pane.
- [ ] T010 [US1] Apply the same change as T009 to `src/app/shared/auth/profile-modal/profile-modal.ts` and `profile-modal.html`. `src/app/shared/auth/profile-modal/profile-modal.spec.ts` must pass unchanged.
- [ ] T011 [US1] Checkpoint: run `npm run lint` and the full suite through `test-runner` (fluid-height, compact-modal, profile-modal, entry-flow.store, profile-flow.store specs included); run `design-auditor` on the changed `.html`/`.scss`/`.ts` and fix what it reports; then commit Phase 3 ("Modals, focus & auth stores: shared fluid height").

**Checkpoint**: All three modals get fluid height from `FluidHeight`; focus code is still the old per-modal code.

---

## Phase 4: User Story 2 - Focus lands in the right place, the same way everywhere (Priority: P1)

**Goal**: Open focus, screen-change focus, return focus and radio-group keys all go through `focus.ts` and `RovingRadios` (FR-013–FR-017), with every focus stop unchanged and Home/End added to the delete dialog.

**Independent Test**: Keyboard only: "Nova coleção" focuses its name field and Esc returns to the opener; each entry/profile screen focuses its first field or action and a field error keeps focus in place; the drawer returns focus to Menu; in all four radio groups arrows wrap and Home/End jump to the ends; in the delete choice with nothing selected, ArrowDown selects "Mover para a caixa temporária" (quickstart Manual 7).

### Tests for User Story 2

- [ ] T012 [P] [US2] Write `src/app/shared/ds/focus.spec.ts` against the contract in `contracts/shared-units.md` (focus helpers): `focusFirst` returns and focuses the first match of the earliest matching selector in `FIRST_STOP_ORDER` (an `input:not([readonly])` beats an action-row button; a disabled button is skipped; returns `null` and moves nothing when nothing matches or root is `null`); `focusElement` ignores `null` and detached elements; `captureFocus()` restores a connected opener and does not throw when the opener was removed; `focusOnChange` (in a host component) focuses on the first non-empty key, does not refocus when the component re-renders with the same key, refocuses when the key changes, and does nothing for `''`.
- [ ] T013 [P] [US2] Write `src/app/core/utils/roving.util.spec.ts` for `rovingIndex(key, from, count)`: ArrowRight/ArrowDown → next, wrapping from `count - 1` to 0; ArrowLeft/ArrowUp → previous, wrapping from 0 to `count - 1`; Home → 0; End → `count - 1`; any other key (`Tab`, `a`, `Enter`) → `null`.
- [ ] T014 [P] [US2] Write `src/app/shared/ds/roving-radios.spec.ts` with a host template `<div role="radiogroup" [appRovingRadios]="sel()" (radioMove)="sel.set($event)">` and three `role="radio"` buttons: an arrow key emits the next index, calls `preventDefault()` and focuses that radio; wrapping both ways; Home/End go to 0 and 2; with `sel() === -1` an arrow key on the focused radio emits that radio's own index (research R8 no-selection rule); keys from elements that are not radios and unrelated keys are ignored.
- [ ] T015 [P] [US2] Add a Home/End case to `src/app/shared/collections/collection-delete-dialog/collection-delete-dialog.spec.ts` (FR-017): with "Mover para a caixa temporária" selected, End selects and focuses "Excluir as cartas", and Home selects and focuses "Mover…" again. Leave every existing case untouched.
- [ ] T016 [P] [US2] Create `src/app/shared/ds/themed-modal/themed-modal.spec.ts` (new) covering return focus (FR-016): focus a button outside, mount `ThemedModal` in a host behind an `@if`, destroy it, and expect focus back on the button; a second case removes the opener before destroy and expects no throw. Use `stubDialog()` and restore it after destroying the host.
- [ ] T016a [P] [US2] Create `src/app/shared/gameplay/tunnel-choice/tunnel-choice.spec.ts` (new; the component has none) against today's behavior, then update it in T027: arrow keys move the selection and focus, wrapping both ways; Home/End jump to the first and last plane. Add one case for the deliberate change: with nothing chosen, ArrowDown on the focused plane selects that plane (FR-017). Write that case to fail until T027 lands.

### Implementation for User Story 2

- [ ] T017 [US2] Create `src/app/shared/ds/focus.ts` with `FIRST_STOP_ORDER` (moved verbatim from `src/app/shared/ds/themed-modal/fluid-face.ts`: `input:not([readonly])` → `app-action-row button:not([disabled])` → `[role="listitem"] button:not([disabled])` → `button:not([disabled])`), `MARKED_STOP = ['[data-autofocus]']`, `focusFirst`, `focusElement`, `captureFocus` and `focusOnChange` as specified in `contracts/shared-units.md` and research R7. `focusOnChange` uses one `afterRenderEffect` and remembers the last key it focused for. None of them throw on a missing root, a missing target or a detached element. Make T012 pass.
- [ ] T018 [P] [US2] Create `src/app/core/utils/roving.util.ts` exporting `rovingIndex(key: string, from: number, count: number): number | null` per research R8. Make T013 pass.
- [ ] T019 [US2] Create the standalone directive `src/app/shared/ds/roving-radios.ts` (`selector: '[appRovingRadios]'`, `selected = input.required<number>({ alias: 'appRovingRadios' })`, `radioMove = output<number>()`) per `contracts/shared-units.md`: a host `(keydown)` listener finds the radios as the host's `[role="radio"]` descendants, ignores events whose target is not one of them, computes the target with `rovingIndex` (or, when `selected() === -1` and the key is an arrow, the focused radio's own index; Home/End still go to the ends), calls `preventDefault()`, emits `radioMove`, then focuses the target radio. It does not touch `tabindex` or `aria-checked`. Make T014 pass.
- [ ] T020 [US2] In `src/app/shared/ds/compact-modal/compact-modal.ts`: replace the hand-written `[data-autofocus]` lookup after `showModal()` with `focusFirst(dialog, MARKED_STOP)` (FR-014), and the opener capture/restore with `captureFocus()` called just before `showModal()` and its `restore()` called on destroy. `compact-modal.spec.ts` must pass unchanged.
- [ ] T021 [US2] In `src/app/shared/ds/themed-modal/themed-modal.ts`: replace the opener capture/restore with `captureFocus()` before `showModal()` and `restore()` on destroy. Make T016 pass.
- [ ] T022 [US2] In `src/app/shared/ds/themed-modal/fluid-face.ts`: replace the inline focus-on-screen-change loop and its local `FIRST_STOP_ORDER` with `focusOnChange(refs.screenKey, refs.content, FIRST_STOP_ORDER)` imported from `@shared/ds/focus` (FR-015).
- [ ] T023 [P] [US2] In `src/app/shared/layout/nav-drawer/nav-drawer.ts`: replace the hand-written focus moves with `focusElement` — on open the drawer's ✕ (or the dialog itself), on close the Menu toggle (`[aria-controls="grm-drawer"]`), keeping the explicit Menu target rather than a captured opener (research R7, Safari). `nav-drawer.spec.ts` must pass unchanged.
- [ ] T024 [P] [US2] Adopt `RovingRadios` in `src/app/shared/collections/collection-delete-dialog/collection-delete-dialog.ts` and `.html`: put `[appRovingRadios]="choiceIndex()" (radioMove)="pickIndex($event)"` on the `role="radiogroup"` element, add `choiceIndex = computed(() => ['move','delete'].indexOf(choice()))` (−1 when `null`) and `pickIndex(i)`, and remove its own `onKeydown`/`onRadioKey`, the option `viewChildren` and the `data-choice` lookups. Nothing stays selected by default. Make T015 pass with every existing case unchanged.
- [ ] T025 [P] [US2] Adopt `RovingRadios` in `src/app/shared/collections/color-picker/color-picker.ts` (index = position of `value()` in `COLLECTION_COLORS`; `radioMove` sets the value at that index); remove its own key handler and option lookups. `color-picker.spec.ts` must pass unchanged.
- [ ] T026 [P] [US2] Adopt `RovingRadios` in `src/app/shared/decks/format-picker/format-picker.ts` (index = position of `value()` in `DECK_FORMATS`); remove its own key handler and option lookups. `format-picker.spec.ts` must pass unchanged.
- [ ] T027 [P] [US2] Adopt `RovingRadios` in `src/app/shared/gameplay/tunnel-choice/tunnel-choice.ts` and `tunnel-choice.html` (index = position of `selected()` in `planes()`, −1 when `null`); remove its own key handler and option lookups. Deliberate change (plan.md post-design re-check, research R8): with nothing chosen, the first arrow key now selects the focused plane instead of the next one. Make T016a pass.
- [ ] T028 [US2] Verify SC-003 with a search over `src/app`: no `.focus(` call remains in `compact-modal.ts`, `themed-modal.ts`, `fluid-face.ts` or `nav-drawer.ts`, and no `ArrowDown`/`ArrowRight` handling remains in the four radio-group components (only in `roving.util.ts`). View-level focus moves (page headings, Planechase controls) stay as they are (FR-018).
- [ ] T029 [US2] Checkpoint: run `npm run lint` and the full suite through `test-runner`; run `design-auditor` on the changed `.html`/`.ts` and fix what it reports; then commit Phase 4 ("Modals, focus & auth stores: shared focus").

**Checkpoint**: US1 and US2 both work; all focus moves in modals, drawer and radio groups go through `focus.ts`/`RovingRadios`.

---

## Phase 5: User Story 3 - The compact modal's fluid height is a documented design decision (Priority: P2)

**Goal**: DESIGN.md describes the settled fluid height for both modal kinds (FR-011, FR-012).

**Independent Test**: DESIGN.md's "Fluid height" and "Compact modal" entries match what US1 built, and `design-auditor` reports no undocumented compact-modal height behavior (quickstart Manual 9).

- [ ] T030 [US3] In `DESIGN.md`, replace the "Fluid height" bullet of the modal blueprint list with the text drafted in `specs/012-modals-focus-auth-stores/ui.md` §5 (460px minimum, `base` 0.24s, animated only after the first pointer or key press, instant while opening and under reduced motion, viewport height less `space-6` on each side, only the form pane scrolls, no scrollbar while animating), adjusted to DESIGN.md's own voice and token naming.
- [ ] T031 [US3] In `DESIGN.md`, append to the "Compact modal" entry the sentence drafted in `ui.md` §5 (follows content over `base` 0.24s, same arming rule, instant under reduced motion, no scrollbar while animating, no minimum, stops at viewport height less 4rem and the whole face scrolls past it). Add no keyboard text for "Delete radios" (ui.md §5).
- [ ] T032 [US3] Checkpoint: run `design-auditor` on `src/app/shared/ds/compact-modal/` and `src/app/shared/ds/themed-modal/` against the updated DESIGN.md and fix what it reports (expect no undocumented fluid-height finding); then commit Phase 5 ("Modals, focus & auth stores: DESIGN.md fluid height").

**Checkpoint**: Documentation matches behavior; nothing in the compact modal's height is undecided.

---

## Phase 6: User Story 4 - The cloud steps live in one place (Priority: P2)

**Goal**: `FlowForm<F>` and `CloudSteps<F, P>` hold the form core and the cloud steps once; both flow stores compose them per instance and keep their public surface as aliases; `CloudFlowHost` is gone (FR-019–FR-023).

**Independent Test**: `entry-flow.store.spec.ts`, `profile-flow.store.spec.ts` and `profile-modal.spec.ts` pass unchanged; every cloud flow in both modals behaves as before (quickstart Manual 8).

### Tests for User Story 4

- [ ] T033 [P] [US4] Write `src/app/shared/auth/flow-form.spec.ts` against `FlowForm<F>` in `contracts/shared-units.md` and data-model.md §4: `edit('code', 'a1b2c3d4e5')` keeps digits only, max 6 (`'12345'`→ `'12345'`, `'1234567'` → `'123456'`); `edit` clears that field's error through `errorKeys`; editing `email` clears `emailInUse`; `clearForPhase(['pw','code'])` blanks only those keys and clears `fieldErrors`, `formError`, `emailInUse`; `fail` routes a field failure to `fieldErrors` (and through `remap` when given) and a form failure to `formError`, using `mapCloudError`; `submit` sets validation errors and does not run when `validate()` returns errors, skips while `loading`, locks `loading` while running, and ignores a failure whose token went stale after `bump()`; `reset()` returns everything to blank and bumps the token.
- [ ] T034 [P] [US4] Write `src/app/shared/auth/cloud-steps.spec.ts` against `CloudSteps<F, P>` in `contracts/shared-units.md` and data-model.md §5, with a stub host (signals for `phase`, `plateEmail`, `lockedEmail`, spies for `go`/`toPhase`) and a `CloudAuthService` test double provided through TestBed: `forgot()` sets `backTarget` to the current phase and, when `lockedEmail()` is set, writes it to the e-mail field and sets `emailLocked`, then `go('reset-email')`; `recoverAccess()` sets `backTarget` without locking; `otherEmail()` goes to `reset-email`; `back()` goes to `backTarget ?? 'in'` and clears `backTarget` and the lock; `requestCode(token)` calls `requestResetCode`, then `toPhase('reset-code')` and starts a 30 s cooldown counting down to 0 (fake timers); a `resend()` whose result lands after `bump()` changes nothing; `resend()` is blocked during cooldown, while resending and while loading; `reset()` stops the cooldown, clears `backTarget`/`emailLocked`/`resending` and calls `discardPending()`; two instances share no state (FR-023).

### Implementation for User Story 4

- [ ] T035 [US4] Create `src/app/shared/auth/flow-form.ts` with `FlowFormConfig<F>` and `FlowForm<F extends CloudFormFields>` per `contracts/shared-units.md` and research R9, moving `CloudFormFields` here from `src/app/shared/auth/cloud-flow-host.ts`. Lift the bodies of `editField`, `fail`, the submit wrapper and the generation counter from `src/app/shared/auth/entry-modal/entry-flow.store.ts` and `src/app/shared/auth/profile-modal/profile-flow.store.ts` as they are (the two copies must agree; where they differ, keep both behaviors through config or the `remap` parameter, never drop one). Errors reach the UI only through `mapCloudError` (`@utils/cloud-error.util`). Plain class, no `providedIn`. Make T033 pass.
- [ ] T036 [US4] Create `src/app/shared/auth/cloud-steps.ts` with `CloudStepsHost<F, P>` and `CloudSteps<F, P>` per `contracts/shared-units.md`: created with `new` in an injection context (it `inject`s `CloudAuthService`, `DestroyRef` for the cooldown interval); computeds `isCloudBusy`, `resendLabel`, `shown`, `pwLabel`, `pwAutocomplete`, `pwHelper` from the host's `phase` through `isCloudPhase` and `core/utils/entry-flow.util.ts` (moved from the stores unchanged); actions `forgot`, `recoverAccess`, `otherEmail`, `back`, `requestCode`, `resend`, `reset`, `editField` (delegates to `form.edit`) lifted from the two stores, with the two `forgot` branches reduced to the `lockedEmail` rule (research R9). Keep all PT-BR copy coming from `core/utils/entry-copy.ts`. Make T034 pass.
- [ ] T037 [US4] Refactor `src/app/shared/auth/entry-modal/entry-flow.store.ts`: compose `readonly form = new FlowForm<EntryFields>({...})` and `readonly cloud = new CloudSteps<EntryFields, EntryPhase>({ form, phase, isCloudPhase: () => true, plateEmail, lockedEmail: computed(() => phase() === 'recover-form' ? <subject's cloud e-mail> : null), go, toPhase })` as field initializers; stop extending `CloudFlowHost`; replace the moved members with one-line aliases or delegations under the same public names (`readonly fields = this.form.fields`, `resend() { return this.cloud.resend(); }`, …) so templates and `entry-flow.store.spec.ts` are untouched. Keep in the store only its phases, done screens, copy computeds, `run()` cases (setup after a cloud sign-in) and the `unlock` branch of "Esqueci minha senha". `reset()`/`go()` call `form.reset()`/`form.bump()` and `cloud.reset()` as the old code did. `entry-flow.store.spec.ts` must pass unchanged.
- [ ] T038 [US4] Refactor `src/app/shared/auth/profile-modal/profile-flow.store.ts` the same way with `FlowForm<ProfileFields>` (blank includes `pwNew`, `pwConfirm`; `clearForPhase` clears them too) and `CloudSteps<ProfileFields, ProfilePhase>` with `isCloudPhase: isSharedCloudPhase` and `lockedEmail` = the linked e-mail when `phase() === 'reauth'`, else `null`. Keep in the store its phases, done screens, copy computeds, account checks, delete-profile unsynced block, `run()` cases (link or reauth after a cloud sign-in) and its `in`/`reauth` guard on `forgot()`. The local steps (`local`, `pw`) use `form` only. `profile-flow.store.spec.ts` and `profile-modal.spec.ts` must pass unchanged.
- [ ] T039 [P] [US4] In `src/app/shared/auth/entry-modal/entry-modal.ts`, replace `{ provide: CloudFlowHost, useExisting: EntryFlowStore }` with `{ provide: CloudSteps, useFactory: () => inject(EntryFlowStore).cloud }` in the component `providers`.
- [ ] T040 [P] [US4] In `src/app/shared/auth/profile-modal/profile-modal.ts`, replace the `CloudFlowHost` provider with `{ provide: CloudSteps, useFactory: () => inject(ProfileFlowStore).cloud }`.
- [ ] T041 [P] [US4] In `src/app/shared/auth/entry-modal/cloud-form/cloud-form.ts` and `src/app/shared/auth/entry-modal/reset-form/reset-form.ts`, `inject(CloudSteps)` instead of `CloudFlowHost`; templates stay unchanged (same member names, FR-021).
- [ ] T042 [US4] Delete `src/app/shared/auth/cloud-flow-host.ts` and confirm with a search over `src/` that nothing imports `CloudFlowHost` or `cloud-flow-host` anymore (including specs).
- [ ] T043 [US4] Verify FR-020/SC-004 with a search: `entry-flow.store.ts` and `profile-flow.store.ts` contain no cooldown interval, no `requestResetCode`/`discardPending` call and no code-digit filter of their own — only aliases and delegations to `form`/`cloud`.
- [ ] T044 [US4] Checkpoint: run `npm run lint` and the full suite through `test-runner` (flow-form, cloud-steps, entry-flow.store, profile-flow.store, profile-modal specs included), fix everything, then commit Phase 6 ("Modals, focus & auth stores: shared cloud steps").

**Checkpoint**: All four stories work; both modals run on the shared cloud unit with separate instances.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Docs, budgets, end-to-end validation

- [ ] T045 Draft the `.claude/docs/architecture.md` updates listed in plan.md's post-design re-check and show them to the maintainer for review before writing them: in **Auth**, `CloudSteps` (provided by factory per modal) replaces `CloudFlowHost` in the "Shared cloud forms" bullet, `FlowForm` is the shared form core, and `fluid-face.ts` composes `FluidHeight` (`shared/ds/fluid-height.ts`); in **Modals**, `focus.ts` (`focusFirst`/`captureFocus`/`focusOnChange`/`focusElement`) and `RovingRadios` are the focus conventions for future modals and radio groups. Also add `@testing/resize-observer` next to the `stubDialog()` note under **Testing**. Apply only what the maintainer accepts.
- [ ] T046 Run `npm run build` and confirm the `angular.json` budgets (`initial`, `anyComponentStyle`, the named lazy-chunk budgets) still pass unchanged.
- [ ] T047 Walk `specs/012-modals-focus-auth-stores/quickstart.md` "Manual" 1–8 against the maintainer's running dev server (never start or stop port 4200 yourself), using the `run` skill where a headless check fits; report any difference from before outside FR-009, FR-017's Home/End and the tunnel's no-selection key.
- [ ] T048 Final checkpoint: run `npm run lint` and the full suite through `test-runner` and `design-auditor` over every UI file this feature touched, fix everything, then commit the polish phase ("Modals, focus & auth stores: docs and polish").

---

## Dependencies & Execution Order

### Phase Dependencies

- **T000** first, then **Setup (Phase 1)**: T001 is needed by US1's spec (T003).
- **Foundational (Phase 2)**: empty.
- **US1 (Phase 3)** → **US2 (Phase 4)**: sequential. Both edit `compact-modal.ts`, `themed-modal.ts` and `fluid-face.ts`; US2 replaces the focus code US1 deliberately leaves in place.
- **US3 (Phase 5)**: after US1 (documents what US1 built). Independent of US2 and US4.
- **US4 (Phase 6)**: independent of US1–US3 in code (store and auth-form files only). T039/T040 touch `entry-modal.ts`/`profile-modal.ts`, which US1 also edits, so run it after US1 to avoid conflicts.
- **Polish (Phase 7)**: after all stories.

### Within Each User Story

- The new spec first (must fail), then the unit, then its adopters, then the checkpoint commit.
- US1: T003 → T004 → T005, T006 → T007 [P] → T008 → T009, T010.
- US2: T012–T016a [P] → T017, T018 [P] → T019 → T020–T027 (T023–T027 [P]) → T028.
- US4: T033, T034 [P] → T035 → T036 → T037, T038 → T039–T041 [P] → T042 → T043.

### Parallel Opportunities

- US2 tests T012–T016 are separate files.
- US2 adopters T023–T027 are separate components once `focus.ts` and `RovingRadios` exist.
- US4 tests T033/T034 and the provider/inject swaps T039–T041.
- US3 and US4 can run side by side after US2.

---

## Parallel Example: User Story 2

```bash
# Specs, together:
Task: "Write src/app/shared/ds/focus.spec.ts"
Task: "Write src/app/core/utils/roving.util.spec.ts"
Task: "Write src/app/shared/ds/roving-radios.spec.ts"
Task: "Add Home/End case to collection-delete-dialog.spec.ts"
Task: "Create src/app/shared/ds/themed-modal/themed-modal.spec.ts"

# Adopters, together, once focus.ts and RovingRadios exist:
Task: "nav-drawer.ts → focusElement"
Task: "collection-delete-dialog → RovingRadios"
Task: "color-picker → RovingRadios"
Task: "format-picker → RovingRadios"
Task: "tunnel-choice → RovingRadios"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T000, Phase 1.
2. Phase 3 (US1): one height mechanism for all three modals.
3. **STOP and VALIDATE**: quickstart Manual 1–6.

### Incremental Delivery

1. Setup → US1 (height) → validate.
2. US2 (focus) → validate keyboard paths.
3. US3 (DESIGN.md) → design audit.
4. US4 (auth stores) → validate cloud flows.
5. Polish → architecture.md review, build budgets, manual walk.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- Existing specs (compact-modal, nav-drawer, color-picker, format-picker, collection-delete-dialog, entry-flow.store, profile-flow.store, profile-modal) must pass **unchanged** (FR-024). The only spec edits are the new files and the delete dialog's added Home/End case. If an existing spec fails, fix the code, not the spec; if the spec checked a removed internal, stop and report it.
- No user-visible text changes (FR-026); no backward-compatibility code for the old height or focus paths.
- The repo mixes CRLF and LF: edit existing files with the Edit tool only, never with sed/python rewrites.
- Work on `feature/012-modals-focus-auth-stores` from T000; commit once per phase, in its checkpoint task, only after its checks pass.
