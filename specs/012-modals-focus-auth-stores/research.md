# Research: Modals, Focus & Auth Stores

All Technical Context unknowns are resolved below. Each entry: Decision, Rationale, Alternatives considered.

## R1. One height mechanism: `FluidHeight`, a composed class

**Decision**: A framework-light class `FluidHeight` in `shared/ds/fluid-height.ts`, created in a component constructor (`new FluidHeight({...})`), like `FluidFace` today. It owns everything about desktop fluid height:

- observing the measured elements with one `ResizeObserver`;
- writing `face.style.height` directly (FR-002);
- the `is-sized` (armed) and `is-resizing` classes, the `transitionend` listener and the 300 ms fallback timer (FR-003);
- the phone check (writes `''`, FR-004), reduced motion (FR-008) and the window `resize` listener (FR-006);
- the optional minimum and viewport cap, with `capped` (FR-005).

The caller supplies only *what* to measure (a `measure()` callback) and *where* to write (the face and the scroller element). `CompactModal` measures its content. `FluidFace` (the themed preset, kept in `themed-modal/fluid-face.ts`) measures chrome + content + prompt, with a 460px minimum and the 64px viewport margin.

**Rationale**: The two copies differ only in what they measure and in the 460px/cap rules (FR-010 keeps the cap themed-only), so a callback plus two optional numbers covers both. A class created in the constructor runs in the injection context (`DestroyRef`, `mediaQuerySignal`, `afterRenderEffect`), needs no template wiring, and matches the existing `FluidFace` idiom.

**Alternatives considered**:
- A directive on the face. Rejected: the themed face lives in `ThemedModal`'s template while the measured content and prompt live in the entry/profile templates, so a directive would still need inputs crossing that boundary, plus a second directive or query for the prompt.
- Moving the measuring into `ThemedModal` via content queries. Rejected: `ThemedModal` would need to know about the form pane's prompt and chrome, which belong to the auth modals (`_face.scss`).

## R2. Measure once on open: rely on the observer's first notification

**Decision**: Neither modal calls `measure()` next to `observe()`. A `ResizeObserver` always delivers one notification for a newly observed element once it has a box, so that notification is the single measure on open (FR-007).

**Rationale**: Both modals observe during the first render, before `showModal()`. A closed `<dialog>` is `display: none`, so the explicit `measure()` in `CompactModal` read a height of 0 and wrote `0px`, which the observer then corrected before paint. When `showModal()` lays the content out, the observer fires after layout and before paint, in the same frame. The modal's first painted height is right, and there is one write, not two.

**Alternatives considered**: Keeping an explicit measure after `showModal()`. Rejected: it duplicates the observer's notification in the same frame.

## R3. The fonts-ready re-measure is removed

**Decision**: `document.fonts.ready.then(measure)` is dropped (spec assumption).

**Rationale**: A web font swap (Grenze/Karla, `font-display: swap`) reflows the text, which changes the observed content box, and `ResizeObserver` reports any content-box change whatever its cause. A swap that changes no observed height needs no re-measure. The prompt is observed too, so its reflow is caught the same way.

**Alternatives considered**: Keeping it as a safety net. Rejected: it can only cause a redundant measure, and the spec asks to remove it once the observer covers the case.

## R4. One animation rule for all three modals

**Decision**: The face's `height` transition applies only under an `is-sized` class, which `FluidHeight` adds at the first `pointerdown` or `keydown` inside the modal's `<dialog>` (FR-009). `themed-modal.scss` moves its `transition` under `.face.is-sized`, as `compact-modal.scss` already does. The `prefers-reduced-motion` rule keeps `transition: none` (FR-008). `FluidHeight` sets `is-resizing` only when armed and not under reduced motion.

The listeners go on `face.closest('dialog')`, so keys pressed while focus sits on the dialog itself still arm it.

**Rationale**: This is the spec's clarified rule. Written as a class rather than a binding, the arming takes effect in the same frame as the press, and the next height change animates.

**Alternatives considered**: An `armed` signal bound in each template. Rejected: one more binding per modal, and the class lands a frame late.

## R5. Direct writes replace the themed modal's height and `capped` bindings

**Decision**: `ThemedModal` drops its `faceHeight` input and exposes its face element (`readonly face = viewChild.required(...)`). `FluidFace` passes it to `FluidHeight`. `FluidHeight` also writes the `capped` class directly on the *scroller*: the face itself for `CompactModal`, the form pane for the themed modals. The `[class.capped]` bindings in `entry-modal.html` and `profile-modal.html` go away.

`is-resizing` goes on the same scroller element, and `_face.scss` gains `.form-pane.is-resizing { overflow: hidden }`, which wins over `.capped`.

**Rationale**: FR-002's same-frame rule applies to the scroll state too. A height crossing the cap flips `capped` in the frame the height changes, and a capped pane hides its scrollbar while it animates (FR-003), which the themed modals couldn't do before. The `is-resizing` class can't go on the themed face: `_face.scss` compiles into the auth modals' encapsulated styles, so an ancestor class on `ThemedModal`'s element can't reach the form pane. Putting it on the form pane avoids `::ng-deep`.

**Alternatives considered**: `capped` and `resizing` as signals bound in the templates. Rejected: they land a frame late, which is the scrollbar flash FR-002 forbids.

## R6. Window resize and the phone switch

**Decision**: `FluidHeight` keeps a window `resize` listener that re-measures (FR-006). It also re-measures from an effect on its `mediaQuerySignal(MOBILE_QUERY)`, so a modal crossing 640px while open drops or regains its height at once. On phone it writes `height: ''` and removes `capped` and `is-resizing`.

**Rationale**: A window resize that doesn't change the content box fires no observer callback, yet it changes the cap. The phone switch usually changes the content (the mobile header replaces the close row), but an explicit trigger doesn't depend on that.

**Alternatives considered**: Observing the dialog for viewport changes. Rejected: the dialog's box doesn't change on desktop when the window does.

## R7. Focus helpers: one module, two autofocus strategies

**Decision**: `shared/ds/focus.ts` holds the DOM focus helpers:

- `focusFirst(root, order)` focuses the first match of the first selector that matches, and returns it.
- `FIRST_STOP_ORDER` is the themed modals' priority list, moved verbatim from `fluid-face.ts`.
- `MARKED_STOP` is `['[data-autofocus]']`.
- `captureFocus()` records the active element and returns `restore(options?)`, which focuses it only if it is still connected.
- `focusElement(el, options?)` is a null-safe, connected-only focus, for targets that are known rather than captured (the drawer's Menu and close button).
- `focusOnChange(key, root, order)` runs in an injection context: an `afterRenderEffect` that calls `focusFirst` when the key changes to a new non-empty value, and never on a re-render with the same key (FR-015).

The users:
- `CompactModal` calls `focusFirst(dialog, MARKED_STOP)` after `showModal()` (FR-014).
- `FluidFace` calls `focusOnChange(screenKey, content, FIRST_STOP_ORDER)` (FR-015).
- `ThemedModal` and `CompactModal` use `captureFocus()` around open and destroy (FR-016).
- `NavDrawer` uses `focusElement` for its close button or the dialog on open, and for Menu on close.

**Rationale**: SC-003 asks for one place for open focus, screen-change focus and return focus. The spec's assumption leaves the strategy per modal kind to the plan, and keeping each kind's current strategy keeps every focus stop unchanged. The drawer keeps targeting Menu explicitly rather than a captured opener: Safari doesn't focus a button on click, so a captured opener could be `<body>`.

**Alternatives considered**:
- A `[appAutofocus]` directive. Rejected: the compact modal must focus after `showModal()`, which the modal controls, not the content.
- Using the priority order for the compact modal too. Rejected: "Cancelar in a confirmation" isn't the first button, so it needs the explicit marker.

## R8. Radio groups: one directive over a pure index rule

**Decision**:
- `rovingIndex(key, from, count)` in `core/utils/roving.util.ts` is pure:
  - ArrowRight/ArrowDown step to the next option, wrapping;
  - ArrowLeft/ArrowUp step to the previous one, wrapping;
  - Home goes to the first option, End to the last;
  - any other key returns `null`.
- The `RovingRadios` directive (`shared/ds/roving-radios.ts`, selector `[appRovingRadios]`) goes on each `role="radiogroup"` element. Its input is the selected index, with −1 for none. It handles the bubbled `keydown` of its `[role="radio"]` descendants:
  - it computes the target index and calls `preventDefault()`;
  - it emits `(radioMove)` with the index, so selection follows focus;
  - it focuses that radio.
- **No selection yet**: an arrow key selects the *focused* radio (the group's single tab stop). Home and End still go to the ends.

All four groups adopt it and drop their own `onKeydown`/`onRadioKey` and their option `viewChildren`/`data-choice` lookups. The delete dialog gains Home and End (FR-017).

**Rationale**: One rule for movement, and DOM lookup by role, so every template keeps its own markup. The no-selection rule keeps the delete dialog exactly as its test checks: the first ArrowDown selects "Mover para a caixa temporária".

**Deliberate side effect**: Interplanar Tunnel's chooser also starts with nothing chosen. Today its first ArrowRight selects the *second* plane. With the shared rule it selects the focused first plane, and the next press moves on. This matches the delete dialog and the WAI-ARIA radio pattern, and is called out in plan.md.

**Alternatives considered**:
- Stepping from the focused radio even with no selection (the tunnel's current behavior). Rejected: the delete dialog's first ArrowDown would jump to "Excluir as cartas", a destructive choice, and its existing test would change.
- A per-group option for the no-selection case. Rejected: two rules for one keyboard pattern.

## R9. Auth stores: a form core plus the cloud steps, composed per modal

**Decision**: Two shared units under `shared/auth/`, both plain classes created in each store's field initializers (injection context), so each modal mount owns its own instances (FR-023):

- **`FlowForm<F>`** (`flow-form.ts`): the form state both stores run on:
  - state: `fields`, `fieldErrors`, `formError`, `emailInUse` and `loading`, plus the stale-result token (`bump()`, `token()`, `stale(t)`);
  - actions: `edit(key, value)` (the 6-digit code filter, clearing that field's error, `emailInUse` reset), `clearForPhase(keys)`, `fail(error)` (via `mapCloudError`, with an optional field remap), the `submit(validate, run)` wrapper (validate, then lock and run, ignoring a stale result) and `reset()`.
- **`CloudSteps<F, P>`** (`cloud-steps.ts`): the cloud steps over a `FlowForm`:
  - state: `backTarget`, `emailLocked`, `cooldown`, `resending`, plus the computeds `isCloudBusy`, `resendLabel`, `shown`, `pwLabel`, `pwAutocomplete` and `pwHelper`;
  - actions: `forgot()`, `recoverAccess()`, `otherEmail()`, `back()`, `requestCode()` (the `reset-email` step plus cooldown), `resend()` and `reset()` (which also calls `cloudAuth.discardPending()`).

  The host passes `phase`, `isCloudPhase`, `plateEmail`, `lockedEmail` (the e-mail a reset from this phase is fixed to), `go` and `toPhase`. Both stores' `forgot` branches reduce to this one rule:
  - **entry**: `recover-form` locks to the subject's cloud e-mail;
  - **profile**: `reauth` locks to the linked e-mail.

  `CloudSteps` replaces the abstract `CloudFlowHost`: `CloudForm` and `ResetForm` inject `CloudSteps`, provided per modal with `{ provide: CloudSteps, useFactory: () => inject(EntryFlowStore).cloud }`. `cloud-flow-host.ts` is deleted.

**What stays in each store**:
- its phases, done screens and copy computeds;
- its `run()` cases (including what happens *after* a cloud sign-in: setup in the entry modal, link or reauth in the profile modal);
- the entry modal's `unlock` branch of "Esqueci minha senha", and the profile modal's `in`/`reauth` guard on its own `forgot()`. `CloudForm` only shows the link on `FORGOT_PHASES` (`in`, `reauth`, `recover-form`, `unlock`), so `CloudSteps.forgot()` never needs either.

The stores keep their public member names as one-line aliases (`readonly fields = this.form.fields`, `resend() { return this.cloud.resend(); }`), so the modal templates, the sub-screen components and the 56 existing store specs don't change (FR-024).

**Rationale**:
- Every duplicated block in the two stores falls into one of two kinds. The form mechanics (`editField`, `fail`, the submit wrapper, the generation counter) are used by local steps too, so they don't belong to "cloud". The reset-code mechanics (cooldown, resend, the reset entry points) are cloud-only. Splitting them keeps `CloudSteps` about the cloud and lets the profile modal's local steps (`local`, `pw`) use the form without the cloud.
- Composition with `new` keeps instances per store, so per modal. Nothing is `providedIn: 'root'`, so the two modals can't share state.
- Keeping the store surfaces avoids a rewrite of every auth component and spec, which would itself be a regression risk.

**Alternatives considered**:
- A single `CloudFlow` holding the form state too. Rejected: local-profile steps would depend on a "cloud" unit.
- An abstract base store both extend. Rejected: inheritance would tie the two state machines together, and their phase types differ.
- A root service. Rejected: it breaks FR-023.
- Templates calling `store.cloud.x()` directly. Rejected: it churns about 20 components and specs for no behavior gain.

## R10. No store size target

**Decision**: The stores lose only what R9 moves out (about 140 lines each). Everything that is a modal's own (phases, `run()` cases, copy computeds, the profile modal's account checks and delete-profile unsynced block) stays in its store.

**Rationale**: The maintainer dropped the line-count goal (spec SC-004). The duplication was the real problem, and R9 removes it. Splitting a store's own state machine further would only spread one flow across files.

**Alternatives considered**: Moving the profile modal's unsynced-changes block into its own class. Rejected: it was only proposed to meet a line target.

## R11. Tests

**Decision**:
- A fake `ResizeObserver` in `@testing/resize-observer`: install and restore, plus `notify()` to deliver an observation. Specs set `offsetHeight` with `Object.defineProperty`, because jsdom has no layout.
- New specs:
  - `fluid-height.spec.ts`: direct write, arming, `is-resizing` cleared by `transitionend` and by the fallback, phone, reduced motion, cap/`capped`, resize, one write on open;
  - `focus.spec.ts`: `focusFirst` order, `captureFocus` with a removed opener, `focusOnChange` same-key re-render;
  - `roving.util.spec.ts`;
  - `roving-radios.spec.ts`;
  - `flow-form.spec.ts`;
  - `cloud-steps.spec.ts`: cooldown, stale resend, the lock rule, `back()`.
- Additions: a delete-dialog Home/End case, and a themed-modal return-focus case. The drawer's return-focus test already exists (nav-drawer.spec).
- The existing compact-modal, nav-drawer, radio-group, entry/profile-flow and profile-modal specs run unchanged.

**Rationale**: FR-024/FR-025. A fake observer is the only way to drive the height code under jsdom, which has no `ResizeObserver` (`typeof` guard).

**Alternatives considered**: Testing height only by hand. Rejected: FR-025 requires coverage.
