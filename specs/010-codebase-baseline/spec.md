# Feature Specification: Codebase Baseline

**Feature Branch**: `010-codebase-baseline`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "Codebase baseline: shrink and guard the codebase before a series of refactors, with no change to what the user sees or does. Why: the next specs (storage/sync, modals/auth stores, page transitions, reactivity audit) are refactors. They need guardrails that catch regressions, and dead code removed first so new lint rules don't flag code about to be deleted. In scope: (1) remove unused code, excluding ThemeService, the _modal.scss/_dropdown.scss partials and card components; (2) one source for the active profile's effective colors on IdentityService, replacing the fallback in identity.service.ts, theme.service.ts and page-sweep.ts, leaving the entry flow's draft-identity fallback; (3) bundle budgets that fail the build when the initial bundle grows past a limit or a lazily loaded dependency (tesseract.js, Planechase card data) lands in it; (4) stricter lint — unhandled promises flagged, relative ../ imports into core/ or shared/ forbidden, signal-based APIs preferred as a warning only; existing violations recorded as known exceptions, only relative-import violations fixed now; (5) unit specs for dropdown-placement.util, dropdown-dismiss.util, db/entity-store, profile-session.service, identity.service, excluding card-import.util and card-color.util; (6) fix architecture.md's stale nav section. Success: build, lint and tests pass; a static tesseract.js import fails the build; a new floating promise or relative ../ import into core fails lint; grandfathered violations don't; no user-visible change. Leave for clarify: errors vs. warnings for the remaining rules; budget thresholds."

## Context

Grimorio's next specs — storage & sync foundation, modals & auth stores, page transitions, and a reactivity/timing audit — are refactors: they change how the code is built without changing what the app does. Refactors break things silently unless something is watching. This spec puts that watch in place first, and removes dead code before the watch is switched on, so the new checks don't flag code about to be deleted.

The "user" of this feature is the maintainer. A person using the app sees no difference: every screen, flow, text and stored record behaves exactly as before.

This is the first spec on the feature roadmap (`backlog/features.md`, "1. Codebase baseline") and absorbs pending items #14, #11, #24, #25, #22 (non-card files) and #26.

## Clarifications

### Session 2026-09-29

- Q: Should lint adopt only the named rules, or switch to typescript-eslint's full type-aware preset with all existing violations recorded as known exceptions? → A: Only the named rules — unhandled promises plus the related misused-promises rule, relative imports into core/shared, signal-API warnings; no full type-aware preset, other rules keep their current levels.
- Q: Should the initial-bundle budget be generous, with a separate lint rule catching lazy-dependency leaks? → A: Yes — generous budget (warning ~1.25 MB, error ~1.5 MB; much more is still to be added), and a lint error on static imports of the OCR library and the Planechase data (the OCR library adds only ~63 KB, too little for a roomy budget to catch).
- Q: Should a lazy chunk or component stylesheet over its limit fail the build or only warn? → A: Both thresholds, set generously: warning at about 2× today's largest compiled lazy chunk / component stylesheet, error at about 4×.
- Q: Should unused-code detection become a permanent project command, or is the cleanup a one-time pass? → A: One-time pass; no dead-code tool, script or config is kept in the project.
- Q (post-plan): Where do the OCR library and card reading stand? → A: The OCR library gets no lint guard now (a later card-reading spec adds one). The OCR and CSV import code fall under the normal cleanup rules, but before any removal their working configuration is written to a reference note, so a later spec never has to rediscover it. The code itself needs no preserving.
- Q: Should existing decorator-based inputs/outputs/queries warn on every lint run, or be grandfathered so only new ones warn? → A: Grandfathered: existing signal-API violations are recorded per file so lint output stays clean and only new code warns.

### Session 2026-09-30

- Q (post-plan): What happens to the card components? → A: All of them are removed; the card features will start fresh. Everything used only by them goes too: OCR (`tesseract.js`), card catalog lookup, card color and filter logic, the legacy theme adapter (ThemeService), the legacy select/filter-select dropdowns with their placement and dismissal utilities, and the legacy modal/dropdown style partials. Before removal, the configuration of card reading, catalog lookup and CSV import is recorded (FR-002a). The specs planned for the dropdown utilities are dropped, since that code is removed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Refactor against guardrails (Priority: P1)

While refactoring in a later spec, the maintainer accidentally pulls the Planechase card data into the initial bundle, drops an `await` on a save, or imports across into the shared core with a relative `../` path. The build or the linter stops them before the change is committed, naming the problem.

**Why this priority**: This is the reason the spec exists: every later spec depends on these checks catching its mistakes.

**Independent Test**: On a clean tree, make each deliberate regression one at a time (static Planechase data import, a new un-awaited promise, a new relative import into core) and confirm lint fails on each, then passes again once it's reverted.

**Acceptance Scenarios**:

1. **Given** the baseline is in place, **When** the maintainer adds a static (non-lazy) import of the Planechase card data or its translations, **Then** lint fails on that import; a lazy `import()` of it still passes.
2. **Given** the baseline is in place, **When** the maintainer writes a new call whose promise is neither awaited, returned, nor explicitly marked as deliberately ignored, **Then** lint fails on that line.
3. **Given** the baseline is in place, **When** the maintainer adds a relative `../` import that reaches into the core or shared areas from elsewhere, **Then** lint fails on that line.
4. **Given** the baseline is in place, **When** the maintainer writes a new component input/output the old decorator way where a signal-based API exists, **Then** lint shows a warning but does not fail.
5. **Given** the unchanged codebase with its recorded known exceptions, **When** lint runs, **Then** it passes: violations that existed when a rule landed don't fail lint.

---

### User Story 2 - Work in a smaller codebase (Priority: P2)

The maintainer opens the project for the next refactor and finds only code that something actually uses: no orphaned files, exports, imports or styles to read around, and one place that answers "which colors does the active profile show?".

**Why this priority**: Less code to read and change makes every refactor cheaper, and the lint rules from Story 1 land on code that's staying.

**Independent Test**: Search the codebase for each removed item (no references remain; build, lint and tests pass). Search for the default-identity fallback and find it computed in one place, with the app's colors unchanged with and without an active profile.

**Acceptance Scenarios**:

1. **Given** a file, export, import or style that nothing references, **When** the baseline is done, **Then** it has been removed, and each removal was confirmed unused beforehand.
2. **Given** the card components and everything used only by them (FR-004), **When** the baseline is done, **Then** they are gone, and their configuration lives in the reference note (FR-002a).
3. **Given** an active profile with chosen colors, **When** any screen or the page-change dust shows the profile's colors, **Then** it shows the same colors as before the change, read from one shared value.
4. **Given** no active profile, **When** the app shows its theme colors, **Then** it shows the default identity (red, blue, green), as before, from that same shared value.
5. **Given** the entry modal's color picker, **When** a person is choosing a new profile's colors, **Then** it behaves as before: its draft colors stay separate from the active profile's colors.

---

### User Story 3 - Trust the logic that breaks silently (Priority: P2)

Before refactoring the data layer and profile session, the maintainer runs the test suite and it covers the pure logic most likely to break without anyone noticing: the all-or-nothing multi-store write, the profile session's loading of each profile's data, and the identity colors.

**Why this priority**: The storage/sync and modals specs rewrite exactly this code; without tests, a behavior change there would go unnoticed.

**Independent Test**: Run the full test suite and confirm new specs exist for each listed unit and pass; break one behavior per unit on purpose (for example, let one row of a multi-store write succeed while another fails) and confirm a spec fails.

**Acceptance Scenarios**:

1. **Given** a multi-store write of puts and deletes across collections, decks, cards and tombstones, **When** one operation in it fails, **Then** a spec confirms none of its changes are kept.
2. **Given** the profile session, **When** its specs run, **Then** they cover loading every entity service for the active profile, for no profile, and after a profile switch, and resolving readiness only once they've all loaded.
3. **Given** the identity service, **When** its specs run, **Then** they cover the effective colors and color roles with an active profile, and falling back to the default identity without one.

---

### User Story 4 - Read accurate project docs (Priority: P3)

A future session reads the project's architecture guide to find the navigation components and finds the ones that actually exist, not a removed nav bar.

**Why this priority**: Small and isolated, but a stale guide steers every later spec's plan toward code that isn't there.

**Independent Test**: Read the architecture guide's navigation section and check that every path and name it gives exists in the codebase.

**Acceptance Scenarios**:

1. **Given** the architecture guide, **When** the baseline is done, **Then** it describes the current layout components (nav drawer, side nav, nav links) and no longer mentions the removed nav bar folder or its height variable.
2. **Given** the baseline adds bundle budgets and stricter lint, **When** the guide is updated, **Then** it also records any lasting convention they introduce (for example, how a deliberately ignored promise is marked), following the guide's "worth adding" test.

### Edge Cases

- **Something looks unused but is reached indirectly** (referenced only from a template, a style `@use`, a route's lazy `import()`, `angular.json`, or a spec): it is not dead code and stays. Removal requires evidence that nothing references it, not that no TypeScript file imports it.
- **Code used only by specs**: if the only references to a production export come from its own spec, the export and that spec are removed together.
- **Removing the card components orphans shared code**: anything left referenced only by removed code is unused too and goes in the same pass. Code that something kept still references stays, even if a card component also used it (e.g. `CardService`, the card model, `card.mocks` minus its lookup helper).
- **Relative imports inside a single area**: a relative import within the same folder tree (e.g. between files of one component, or within `core/`) is allowed. Only imports that cross into `core/` or `shared/` from outside must use the path aliases, and within `shared/` itself the existing deep-path alias convention still applies.
- **A promise that is deliberately not awaited** (fire-and-forget): the code marks it explicitly as ignored, and lint accepts the mark.
- **A known exception gets fixed later**: fixing a grandfathered violation (in a later spec or in passing) removes it from the known exceptions, so it can't come back unnoticed.
- **The initial bundle grows legitimately** in a later spec: the budget fails, and raising it is a deliberate, visible change in that spec, not a silent drift.
- **The production service worker, Android build and PWA build**: all keep building; budgets apply to the production web build they share.

## Requirements *(mandatory)*

### Functional Requirements

**Unchanged behavior**

- **FR-001**: The app MUST behave identically for its users before and after this spec: same screens, flows, text, colors, animations, stored data and sync behavior.

**Unused code (#14)**

- **FR-002a**: Before any removal, the working configuration of card reading (OCR library settings and parameters, image preprocessing, how the set code and collector number are parsed from the recognized text, camera capture), of card catalog lookup (the catalog queries, collector-number normalization, batching) and of CSV import (accepted formats and columns, parser options, row-to-card mapping) MUST be written to a reference note under `backlog/`. The note records parameters and rules, not the code.

- **FR-002**: Files, exports, imports and styles that nothing in the project references (source, templates, stylesheets, route definitions, build configuration or specs of other units) MUST be removed.
- **FR-003**: Each removal MUST be confirmed unused before it is made, by search and by a passing build, lint and test run afterward.
- **FR-003a**: The cleanup is a one-time pass: any tool used to find unused code MUST NOT be left in the project as a dependency, script or config file.
- **FR-004**: All card components MUST be removed, together with everything used only by them: card reading (OCR and its `tesseract.js` dependency), card catalog lookup, card color and filter logic, ThemeService, the legacy select and filter-select dropdowns with their placement/dismissal utilities, and the legacy modal and dropdown style partials. None of them is reachable from any route today, so FR-001 holds.

**Effective colors (#11)**

- **FR-005**: The identity service MUST expose one value for the active profile's effective colors: the profile's colors when a profile is active, the default identity otherwise.
- **FR-006**: The identity service's own color roles and the page-change dust colors MUST read that one value instead of repeating the fallback. The legacy theme adapter, the third copy, is removed (FR-004).
- **FR-007**: Draft-identity colors MUST stay separate and MUST NOT read the effective-colors value: the entry flow's (a profile being created or edited in the entry modal) and the cloud sign-up's pending identity (`cloud-auth.service.ts`).

**Bundle budgets (#24)**

- **FR-008**: The production build MUST warn when the initial bundle exceeds about 1.25 MB and fail when it exceeds about 1.5 MB, leaving generous room for the features still to come.
- **FR-009**: Lint MUST fail on any static (non-lazy) import of the Planechase card data and translations; dynamic `import()` of them stays allowed. This, not the size budget, keeps them out of the initial bundle. The OCR library gets no guard in this spec; a later card-reading spec adds one.
- **FR-010**: The production build MUST also enforce a limit on every component stylesheet and on each of today's lazy chunks by name (the Planechase cards and translations chunks): a warning at about twice today's largest compiled lazy chunk / component stylesheet, and a build failure at about four times it. A lazy chunk added by a later spec gets its own named limit in that spec.

**Lint rules (#25)**

- **FR-011**: Lint MUST flag promises that are neither awaited, returned, handled, nor explicitly marked as deliberately ignored, and promises passed where a plain (non-async) callback or condition is expected (misused promises). Both are errors, with existing violations recorded as known exceptions.
- **FR-011a**: The only lint rules added or changed by this spec are those in FR-011–FR-013; the full type-aware preset is not adopted, and every other existing rule keeps its current level.
- **FR-012**: Lint MUST fail on relative `../` imports that reach into `core/` or `shared/` from outside them.
- **FR-013**: Lint MUST warn, never fail, where Angular's signal-based APIs (signal inputs, outputs, queries) can replace the decorator-based ones.
- **FR-014**: Violations of a new rule that already exist when the rule lands MUST be recorded as known exceptions, per file and rule, so lint passes on the unchanged code while any new violation of the same rule fails. This covers the warning-level signal-API rule too: unchanged code shows no warnings and only new code warns (today the codebase has no decorator-based inputs, outputs or queries, so nothing needs recording).
- **FR-015**: Existing relative-import violations (FR-012) MUST be fixed, not recorded as known exceptions.
- **FR-016**: Existing unhandled- and misused-promise violations MUST be recorded as known exceptions, not fixed; their cleanup belongs to the later reactivity & timing audit spec.
- **FR-017**: Fixing a recorded known exception MUST remove it from the record, so the record only shrinks over time.

**Unit specs (#22, non-card files)**

- **FR-018**: New unit specs MUST cover the multi-store all-or-nothing write, the profile session service and the identity service, per User Story 3's acceptance scenarios.
- **FR-019**: Removed code (FR-004, CSV import, the dropdown utilities) gets no new specs.

**Docs (#26)**

- **FR-020**: The architecture guide's navigation section MUST describe the current layout components and drop the removed nav bar folder and its height variable.
- **FR-021**: The architecture guide and command reference MUST record any lasting convention or command this spec introduces, and nothing else, per the project's "worth adding" test.

### Key Entities

- **Known-exceptions record**: the list of lint errors that existed when a rule landed, each identified by file and rule. Lint accepts only these; it only ever shrinks.
- **Size budgets**: the initial-bundle, per-lazy-chunk and per-component-style limits the production build enforces, each with a warning threshold and an error threshold.
- **Effective colors**: the active profile's colors, or the default identity (red, blue, green) with no active profile; one shared value for every consumer of the profile's theme.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On completion, the production build, lint and the full test suite all pass with zero errors.
- **SC-002**: 3 out of 3 deliberate regressions are caught: a static Planechase data import, a new unhandled promise and a new relative import into core each fail lint.
- **SC-003**: 0 errors come from grandfathered violations: lint on the unchanged code passes with every pre-existing unhandled promise recorded as a known exception.
- **SC-004**: 0 relative `../` imports into `core/` or `shared/` from outside them remain in the codebase.
- **SC-005**: The "active colors, or the default identity" fallback appears in exactly 1 place outside the draft identities (FR-007), down from 3.
- **SC-006**: Each of the 3 listed units has a spec file, and for each, deliberately breaking one of its covered behaviors makes at least one spec fail.
- **SC-007**: The codebase is smaller: the count of source files and lines under `src/` goes down, and none of the removed items is referenced anywhere.
- **SC-008**: A manual pass over Home, the collection area, the deck area, Planechase, and the entry and profile modals, with and without an active profile, shows no visible difference from before.
- **SC-009**: Every path and component name in the architecture guide's navigation section exists in the codebase.

## Assumptions

- **Budget thresholds**: the initial bundle is about 856 KB raw today (main ~847 KB + global styles ~9 KB); its limits are set generously (FR-008, see Clarifications). Per-lazy-chunk and per-component-style limits are measured from the production build after the removals (largest lazy chunk ~105 KB) and scaled per FR-010.
- **Errors vs. warnings**: unhandled and misused promises and relative imports into core/shared are errors (with known exceptions for existing promise violations); signal-based APIs are a warning (fixed by the input). No other rule in the current lint setup changes level (see Clarifications).
- The known-exceptions record uses the linter's built-in mechanism for suppressing existing violations, if one exists, rather than scattered inline disable comments.
- "Unused" is judged across the whole project, including templates, stylesheets, route definitions, build configuration and the maintainer scripts under `scripts/`.
- Legacy styles and components that are still referenced stay, even though they are frozen and slated for later removal; only unreferenced code goes.
- The effective-colors change is a pure refactor: the theme roles and the dust produce the same colors, so no visual review beyond SC-008 is needed.
- This spec has no UI and so no `ui.md`; the design-auditor pass applies only if a template or stylesheet is changed by a removal.
- Per the project's early-development policy, no compatibility shims are kept for removed code.
