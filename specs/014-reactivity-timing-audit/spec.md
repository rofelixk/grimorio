# Feature Specification: Reactivity & Timing Audit

**Feature Branch**: `014-reactivity-timing-audit`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "Reactivity & timing audit (roadmap #5, backlog items #23, #28, #37; short name: reactivity-timing-audit). Timers and effects used only where they belong: sequencing tied to animation/transition events or signals instead of timers; derived state as computed/linkedSignal instead of effect, keeping effect for real side effects. Every non-spec setTimeout (13: side-nav, sweep-loop x2, planar-preview x2, planar-tile, fluid-height, toast.service, sync.service timeout, entry-flow.store delay, legacy-cleanup, core/testing/cross-tab) and every effect( (15: deck-area, collection-area, page-sweep x3, page-change, planechase, nav-drawer, toast-outlet, planar-image, fluid-height, identity-wheel, profile-modal, entry-modal, planar-preview.controller) gets a recorded verdict: keep (real time-based behavior or a real side effect), convert, or remove. Also fix the promise violations recorded in eslint-suppressions.json (2 no-floating-promises in views/collection-area/collection-area.ts, 3 no-misused-promises in core/services/sync.service.spec.ts, 1 in shared/auth/profile-modal/profile-flow.store.spec.ts), prune, and delete the file. No user-visible behavior change."

## Context

Specs 012 (modals, focus & auth stores) and 013 (page transitions) rewrote most of the app's effects and timers, so they can now be audited without the audit being redone. Two patterns make the code harder to trust. The first is timer-based sequencing: a timer guesses how long an animation or another part of the app will take, instead of waiting for it, which is a known source of flaky behavior and flaky tests. The second is state copied by effects: an effect writes a value that could be declared as derived state, which the project's own rule (constitution, Principle V) reserves for `computed`/`linkedSignal`. Spec 010 also left six recorded promise violations for this spec to fix.

The "user" of this feature is the maintainer. A person using the app sees no difference.

This is entry 5 on the feature roadmap (`backlog/features.md`) and absorbs pending items #23, #28 and #37. The audit's scope was widened from the backlog's `setTimeout` and `effect` to their close relatives (see Clarifications).

## Clarifications

### Session 2026-10-01

- Q: Besides `setTimeout` and `effect`, which related primitives get a verdict? → A: Also `afterRenderEffect`, `setInterval`, and the subscriptions to router events. One-shot after-render callbacks and animation-frame loops stay out of scope.
- Q: Beyond the verdict list in the spec folder, how should the reason a timer or effect stays live on for future sessions reading the code? → A: The general rule goes only in the architecture guide; per-site reasons stay in the spec folder's verdict list. No per-site code comments and no lint rule for new timers or effects.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sequencing waits for what it depends on (Priority: P1)

The maintainer changes an animation's duration in a stylesheet, or a step that another part of the app signals becomes slower. The code that waited for it still runs at the right moment, because it waits for the animation, transition or state change itself rather than a guessed delay. The tests for that code pass by firing the event, not by advancing a clock to a guessed time.

**Why this priority**: Timer-guessed sequencing is the flakiness source the backlog names; it breaks silently when durations change.

**Independent Test**: For each timer converted, change the duration it used to guess (or slow the step it waited for) and confirm the dependent behavior still happens when the event does, not at the old delay. Its spec drives it through the event or state change.

**Acceptance Scenarios**:

1. **Given** code that used a timer to wait for an animation or transition to end, **When** the audit is done, **Then** it continues when that animation or transition ends, and still continues when the animation never runs (reduced motion, element hidden, animation cancelled).
2. **Given** code that used a timer to wait for state another part of the app announces, **When** the audit is done, **Then** it continues when that state is announced.
3. **Given** a timer whose duration is itself the behavior (how long a toast stays, a hover delay, a network timeout, a periodic clock or cooldown), **When** the audit is done, **Then** it is kept, with its reason recorded.

---

### User Story 2 - Derived state is declared, not copied (Priority: P1)

The maintainer reads a component and finds every value derived from other state declared as derived state, so it is always current. Effects remain only where something outside the reactive state has to change: the page, focus, storage, the browser, a timer.

**Why this priority**: Copied state can go stale or flash an old value for a render; declared state can't. It is the project's stated rule.

**Independent Test**: For each effect converted, its spec shows the derived value is correct on the first read after its sources change, with no render or tick in between.

**Acceptance Scenarios**:

1. **Given** an effect or after-render effect whose only job is to compute a value from other state and store it, **When** the audit is done, **Then** that value is declared as derived (read-only, or writable and resynced from its source where local edits are allowed) and the effect is gone.
2. **Given** an effect that changes something outside the reactive state, **When** the audit is done, **Then** it stays an effect, with its reason recorded.
3. **Given** a subscription to router events, **When** the audit is done, **Then** it is replaced by derived state where its consumer only needs the latest value, and kept where each event in order matters.

---

### User Story 3 - Lint passes with no recorded exceptions (Priority: P2)

The maintainer runs lint and it passes with no record of known exceptions in the repository. Every promise in the code is awaited, returned, handled or explicitly marked as deliberately ignored.

**Why this priority**: Small and isolated, but it closes out the exceptions spec 010 deferred here, so any new promise violation now fails with no grandfathering in the way.

**Independent Test**: Lint passes on a clean tree with the record file deleted; adding a new unhandled promise anywhere fails lint.

**Acceptance Scenarios**:

1. **Given** the two unhandled navigation promises in the collection area, **When** the audit is done, **Then** each is handled according to what should happen if the navigation fails or is cancelled.
2. **Given** the four misused promises in the sync and profile-flow specs, **When** the audit is done, **Then** each is rewritten so the test still checks the same behavior.
3. **Given** all recorded exceptions are fixed, **When** lint runs, **Then** it passes and the exceptions record no longer exists.

---

### User Story 4 - Every kept timer and effect explains itself (Priority: P3)

A future spec adds a timer or an effect and the maintainer wants to know whether it fits. The architecture guide states the general rule, and the audit's verdict list says, for each existing one, what it does and why it stays, which serves as the precedent.

**Why this priority**: The record is what makes the audit durable rather than a one-time cleanup.

**Independent Test**: Every audited call site in the code appears in the verdict list with a verdict and a reason, and every kept one still exists in the code.

**Acceptance Scenarios**:

1. **Given** the audit's inventory, **When** the audit is done, **Then** each entry has a verdict (keep, convert or remove) and a one-line reason.
2. **Given** a verdict of convert or remove, **When** the audit is done, **Then** the call site is gone from the code and what replaced it is named.

### Edge Cases

- **The awaited animation never runs**: with reduced motion, a hidden or detached element, or an animation cancelled by a new one, the end event may never fire. Converted code MUST still continue (for example on the cancel event, or through a fallback timer that is recorded as such).
- **The owner is destroyed while waiting**: a component or service destroyed mid-animation or mid-timer MUST NOT run the rest of its sequence, leave a listener, timer, interval or subscription behind, or leave input blocked.
- **The test environment has no animations**: the test DOM never fires animation or transition events by itself. Specs fire them explicitly; nothing in production code special-cases tests.
- **Rapid repeats**: a new change arriving while an earlier one still waits (a second toast, a quick re-hover, a navigation during a page sweep) behaves as today: the earlier wait is cancelled or superseded, never run twice.
- **A derived value that local actions may also change** (e.g. a drawer that closes on resize but opens on a click): it becomes writable derived state that resyncs from its source, not read-only derived state.
- **A helper used only by tests** (the cross-tab testing helper) is audited too: it shapes how specs wait, so the same rules apply.
- **A call site that moved or changed count since the inventory**: the inventory is taken at the start of implementation; any timer or effect added later in this spec is audited too.

## Requirements *(mandatory)*

### Functional Requirements

**Unchanged behavior**

- **FR-001**: The app MUST behave identically for its users before and after this spec: same screens, flows, text, timings as perceived, animations, focus, stored data and sync behavior, with motion on and with reduced motion.

**Inventory and verdicts**

- **FR-002**: Every call outside spec files of these five kinds MUST be inventoried with its location and purpose: one-shot timers, repeating timers, effects, after-render effects and subscriptions to router events. At spec time that is 12, 3, 15, 5 and 3, 38 in total.
- **FR-003**: Each inventoried call MUST get exactly one verdict (keep, convert or remove) and a one-line reason, recorded in the spec folder. For convert, the record names the replacement.
- **FR-004**: Out of scope: one-shot after-render callbacks, animation-frame loops, and timers inside spec files. They are neither inventoried nor changed, unless a conversion in scope replaces one.

**Timers (#23)**

- **FR-005**: A timer MUST be kept only when its duration is the behavior itself (a visible duration, a hover or press delay, a network or storage timeout, a periodic clock, cooldown or emission), or when it is the fallback for an event that may never fire, in which case it MUST be paired with that event and recorded as a fallback.
- **FR-006**: A timer that stands in for the end of an animation or transition MUST be replaced by waiting for that end (and its cancellation), keeping a fallback only per FR-005.
- **FR-007**: A timer that waits for state another part of the app announces MUST be replaced by waiting for that state.

**Effects and subscriptions (#28)**

- **FR-008**: An effect or after-render effect whose only job is to compute a value from other state and store it MUST be replaced by derived state: read-only when nothing else writes it, writable-and-resynced when local actions also change it.
- **FR-009**: An effect or after-render effect MUST be kept only when it changes something outside the reactive state (the DOM, focus, storage, the browser, a timer or listener it starts and stops).
- **FR-010**: A subscription to router events MUST be replaced by derived state when its consumer only reads the latest value, and kept when it reacts to each event in order.

**Cleanup and tests**

- **FR-011**: Every timer, interval, listener, subscription and effect that remains or is introduced MUST be released when its owner is destroyed, and a superseded wait MUST NOT run.
- **FR-012**: The specs of converted code MUST drive it through the event or state change it now waits for, not by advancing a clock past a guessed delay. Kept timers' specs may still use controlled time.
- **FR-013**: Existing specs MUST keep passing. A spec changes only where it tested the replaced mechanism rather than the behavior.

**Promise exceptions (#37)**

- **FR-014**: Each of the six recorded promise violations MUST be fixed by awaiting, returning, handling or explicitly marking the promise as ignored, chosen by what should happen if it fails, not by a blanket ignore.
- **FR-015**: After the fixes, the exceptions record MUST be pruned to empty and deleted, and lint MUST pass without it.

**Docs**

- **FR-016**: The architecture guide and command reference MUST drop or reword what they say about the exceptions record where it no longer exists. The architecture guide MUST state the general rule for when a timer, effect or router-event subscription is acceptable (FR-005, FR-009, FR-010). Per-site reasons live only in the spec folder's verdict list: kept call sites get no added justification comments, and no lint rule enforces the rule for new timers or effects.

### Key Entities

- **Audit inventory**: one entry per in-scope call site: location, kind, purpose, verdict, reason, and for converted or removed entries the replacement.
- **Exceptions record**: the lint known-exceptions file from spec 010, six entries today, deleted by this spec.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On completion, the production build, lint and the full test suite pass with zero errors, and no lint exceptions record exists.
- **SC-002**: 100% of the in-scope call sites (38 at spec time, plus any added during implementation) have a recorded verdict and reason, and 0 call sites in the code are missing from the inventory.
- **SC-003**: 0 effects or after-render effects remain whose only job is to store a value derived from other state.
- **SC-004**: 0 timers remain that stand in for an animation's or transition's end without being paired with that event.
- **SC-005**: For each converted timer, changing the duration it used to guess leaves the dependent behavior correct, and its specs pass without advancing a clock to the old delay.
- **SC-006**: A manual pass over the flows that use converted code (page changes in the collection and deck areas, the side nav and nav drawer, the toast, the entry and profile modals, the Planechase game and deck pages), with motion on and with reduced motion, shows no visible difference from before and never leaves input blocked.
- **SC-007**: Adding a new unhandled promise anywhere under `src/` fails lint.

## Assumptions

- The inventory counts are from 2026-10-01 (non-spec files under `src/`); `core/testing/` helpers count as non-spec files.
- No verdict is decided in this spec; the plan's research records them. A kept call is a valid outcome, and the audit is not judged by how many calls it converts.
- Animation and transition end events, and their cancel events, are the expected replacements for animation-guessing timers; where the timed element can't be observed, a recorded fallback timer is acceptable (FR-005).
- This spec has no new UI and so no `ui.md`; the design-auditor pass applies only if a template or stylesheet changes.
- Per the project's early-development policy, no compatibility shims are kept for replaced mechanisms.
- Pending items #39 and #40 (sync and storage) are out of scope, even where they touch an audited call.
