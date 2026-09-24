# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]

**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]

**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]

**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]

**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]

**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]

**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
├── ui.md                # Phase 1 output (/speckit-plan command) - omit if the feature has no UI
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### UI Design (Phase 1 → `ui.md`)

<!--
  ACTION REQUIRED: If the feature adds or changes any user-facing UI, generate
  `ui.md` alongside data-model.md/contracts/quickstart.md during Phase 1, and
  replace this comment with a one-line summary linking to it. If the feature has
  no UI, delete `ui.md` from the tree above and state "No UI surface" here.

  ui.md captures layout/structure decisions the spec deliberately leaves out
  (spec.md stays technology- and layout-agnostic). Keep it structural — what
  exists, where, in what order, in which state — not CSS values. Sections:

  1. Surfaces: every screen/view/modal/panel the feature touches, and whether
     it's new or modified. Name the existing component when modifying one.
  2. Layout per surface: content hierarchy and ordering (e.g. a simple ASCII
     wireframe or ordered list of regions/fields), for mobile (<640px) and
     wide (>=960px) where they differ (e.g. full-bleed vs. centered dialog).
  3. States: default, loading/in-flight, error, empty, disabled, and any
     mode switches — what is visible, hidden, or changed in each. Map each
     to the FR/acceptance scenario that requires it.
  4. Interaction flow: entry points, transitions between surfaces/modes, and
     what happens on dismiss/cancel/success.
  5. Design-system reuse: which existing tokens, global styles, mixins, and
     shared components are used (see architecture.md "Styling / design
     system"), and justify anything new rather than reused.
  6. Accessibility: focus order/trapping, keyboard behavior, labels, and
     reduced-motion handling.
  7. Copy: user-facing strings in PT-BR (Principle II), especially errors.
-->

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
