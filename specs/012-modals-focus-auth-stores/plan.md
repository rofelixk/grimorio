# Implementation Plan: Modals, Focus & Auth Stores

**Branch**: `012-modals-focus-auth-stores` | **Date**: 2026-10-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-modals-focus-auth-stores/spec.md`

## Summary

A refactor that settles the modal foundation. No stored data, copy or layout changes.

**Height (#6)**: one `FluidHeight` class (`shared/ds/fluid-height.ts`) replaces `CompactModal`'s observer code and `FluidFace`'s measuring.
- **Writes**: the face height and the `is-sized`/`is-resizing`/`capped` classes go straight to the DOM, in the observer callback.
- **Removed**:
  - the double measure on open (the observer's first notification is the measure);
  - the fonts-ready re-measure (the observer catches font reflow);
  - `ThemedModal`'s `faceHeight` binding;
  - the `[class.capped]` bindings.
- **Changed**: all three modals now animate only after the first pointer or key press (FR-009). This is the one visible change, for the entry and profile modals.
- **Kept**: `FluidFace` stays as the themed preset (460px minimum, 64px viewport cap, chrome + content + prompt measure).

**DESIGN.md (#7)**: the "Fluid height" and "Compact modal" entries describe the settled behavior (text drafted in [ui.md](ui.md) §5).

**Focus (#19)**: one module, `shared/ds/focus.ts`.
- **Helpers**: `focusFirst`, `focusElement`, `captureFocus`, `focusOnChange`.
- **Strategies**: the compact modal keeps its `[data-autofocus]` marker; the themed modals keep their priority order on screen change.
- **Return focus**: the modals restore the captured opener; the drawer restores Menu.
- **Radio groups**: the four use a `RovingRadios` directive over a pure `rovingIndex` util. The delete dialog gains Home/End.

**Auth stores (#16)**: each store composes two shared units.
- `FlowForm<F>`: fields, errors, loading, the stale-result token, edit, fail and submit.
- `CloudSteps<F, P>`: the reset code with its cooldown and resend, "Esqueci minha senha", "Recupere o acesso", "Usar outro e-mail", "Voltar", and the cloud form's labels. It replaces `CloudFlowHost` as what `CloudForm`/`ResetForm` inject.

The stores keep their public surface as aliases, so templates and the 56 store specs stay as they are.

## Technical Context

**Language/Version**: TypeScript ~6.0, Angular 22 (standalone, zoneless, signals)

**Primary Dependencies**: none new. Browser APIs already in use: `ResizeObserver`, `matchMedia` (`mediaQuerySignal`) and `<dialog>`.

**Storage**: N/A, nothing persisted changes.

**Testing**:
- Vitest via `ng test` (jsdom).
- A new fake `ResizeObserver` in `@testing/resize-observer` drives the height code, since jsdom has none (research R11).
- `stubDialog()` for `<dialog>`.

**Target Platform**: browser/PWA (Chromium, Firefox, Safari) and the Capacitor Android WebView

**Project Type**: single-project Angular web app

**Performance Goals**:
- Height changes land in the same frame as the content change (FR-002).
- One measure per open (FR-007).

**Constraints**:
- Zero behavior change outside FR-009 and FR-017's Home/End (FR-022, SC-002).
- No user-visible text change (FR-026).
- Every existing test passes unchanged (FR-024).

**Scale/Scope**:
- **New**: 4 shared units (`fluid-height`, `focus`, `roving-radios`, `roving.util`), 2 auth units (`flow-form`, `cloud-steps`) and 1 test helper.
- **Changed**: `CompactModal`, `ThemedModal`, `FluidFace`, `EntryModal`, `ProfileModal`, `NavDrawer`, the 4 radio groups, `CloudForm`, `ResetForm`, both flow stores, `_face.scss`, `themed-modal.scss` and DESIGN.md.
- **Removed**: `cloud-flow-host.ts`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Physical-World Fidelity | Pass | No owned-card data path changes. The delete dialog's choice keeps "nothing selected by default" and gains only Home/End. |
| II. PT-BR-First | Pass | No copy changes (FR-026). Cloud errors still pass only through `mapCloudError` (now in `FlowForm.fail`). |
| III. Free and Accessible | Pass | No limits or monetization surface. |
| IV. Local-First, Cloud-Optional | Pass | Local flows are unchanged. `FlowForm` serves local steps without depending on `CloudSteps` (research R9). |
| V. Zoneless, Signal-Driven Angular | Pass | The units are signals plus `afterRenderEffect`/`effect`. The one directive is standalone. The direct DOM writes are justified by FR-002, as `CompactModal` already does. No UI library. The visual behavior change (FR-009) and the compact modal's undocumented fluid height are both added to DESIGN.md (FR-011/012), so nothing ships undecided. |
| VI. Persistence and Sync Pattern | Pass | Not touched. |

**Post-design re-check (after Phase 1)**: still passes. One deliberate choice is recorded rather than silent, and was approved by the maintainer:

- **Interplanar Tunnel**: with nothing chosen yet, its first arrow press now selects the focused plane instead of the next one (research R8). The spec says "as today" for all four groups. The shared no-selection rule follows the delete dialog, which the spec's edge case and its existing test pin.

`architecture.md` will need updating after implementation, under CLAUDE.md's "worth adding" test (a durable convention):
- **Auth** paragraph: `CloudSteps` replaces `CloudFlowHost` (provided by factory), and `FlowForm` is the shared form core.
- **Same paragraph**: `fluid-face.ts` now composes `FluidHeight`.
- **Modals** paragraph: `focus.ts` and `RovingRadios` as the focus conventions for future modals and radio groups.

## Project Structure

### Documentation (this feature)

```text
specs/012-modals-focus-auth-stores/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── shared-units.md  # Phase 1
├── ui.md                # Phase 1
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### UI Design (Phase 1 → `ui.md`)

[ui.md](ui.md) covers the modified surfaces, the opening/armed/resizing/capped states per modal kind, focus stops and radio-group keys, and the DESIGN.md text for "Fluid height" and "Compact modal". No new surface or copy.

### Source Code (repository root)

```text
DESIGN.md                                          # changed: "Fluid height", "Compact modal" (FR-011/012)
src/app/
├── core/
│   ├── testing/
│   │   └── resize-observer.ts                     # new: fake ResizeObserver (install/restore/notify)
│   └── utils/
│       ├── roving.util.ts                         # new: rovingIndex (R8)
│       └── roving.util.spec.ts
├── shared/
│   ├── ds/
│   │   ├── fluid-height.ts                        # new: FluidHeight (R1–R6)
│   │   ├── fluid-height.spec.ts
│   │   ├── focus.ts                               # new: focusFirst, focusElement, captureFocus, focusOnChange (R7)
│   │   ├── focus.spec.ts
│   │   ├── roving-radios.ts                       # new: RovingRadios directive (R8)
│   │   ├── roving-radios.spec.ts
│   │   ├── compact-modal/compact-modal.ts|.html   # changed: FluidHeight + focus.ts; drops sized/measure/onTransitionEnd
│   │   └── themed-modal/
│   │       ├── themed-modal.ts|.html|.scss        # changed: no faceHeight; public face; transition under .is-sized
│   │       ├── themed-modal.spec.ts               # new: opener restore
│   │       ├── fluid-face.ts                      # changed: themed preset over FluidHeight + focusOnChange
│   │       └── _face.scss                         # changed: .form-pane.is-resizing
│   ├── auth/
│   │   ├── cloud-flow-host.ts                     # removed
│   │   ├── flow-form.ts                           # new: FlowForm<F> (R9)
│   │   ├── flow-form.spec.ts
│   │   ├── cloud-steps.ts                         # new: CloudSteps<F, P> (R9)
│   │   ├── cloud-steps.spec.ts
│   │   ├── entry-modal/
│   │   │   ├── entry-flow.store.ts                # changed: composes form + cloud
│   │   │   ├── entry-modal.ts|.html               # changed: CloudSteps provider; FluidFace refs; no [class.capped]/[faceHeight]
│   │   │   ├── cloud-form/cloud-form.ts           # changed: inject(CloudSteps)
│   │   │   └── reset-form/reset-form.ts           # changed: inject(CloudSteps)
│   │   └── profile-modal/
│   │       ├── profile-flow.store.ts              # changed: composes form + cloud
│   │       └── profile-modal.ts|.html             # changed: as entry-modal
│   ├── collections/
│   │   ├── collection-delete-dialog/*.ts|.html|.spec.ts  # changed: RovingRadios; + Home/End spec
│   │   └── color-picker/color-picker.ts           # changed: RovingRadios
│   ├── decks/format-picker/format-picker.ts       # changed: RovingRadios
│   ├── gameplay/tunnel-choice/tunnel-choice.ts|.html  # changed: RovingRadios
│   └── layout/nav-drawer/nav-drawer.ts            # changed: focusElement
```

**Structure Decision**: the existing single Angular project.
- **Modal and focus mechanics** are design-system plumbing used across domains, so they go in `shared/ds/`.
- **`rovingIndex`** is pure, so it goes in `core/utils/`.
- **The auth units** stay in `shared/auth/`, beside the stores that compose them.

## Complexity Tracking

No constitution violations to justify. The one deliberate deviation from the spec's wording (the tunnel's no-selection key) is recorded in the post-design re-check above.
