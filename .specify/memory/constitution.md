<!--
Sync Impact Report
- Version change: 1.1.0 → 2.0.0 (MAJOR: Principle IV redefined — core capabilities now require a
  local profile, where 1.x required they work without any sign-in)
- Modified principles: IV. Local-First, Account-Optional → IV. Local-First, Cloud-Optional
  (introduces local profiles as the gate for core features, per-profile data isolation, cloud
  accounts as an optional sync link, and a profile-free tier for gameplay tools)
- Added sections: none
- Removed sections: none
- Templates requiring updates: plan-template.md, spec-template.md, tasks-template.md, checklist-template.md
  reference this file generically ("Constitution Check") and need no edits.
- Artifacts now non-compliant: specs/001-auth-modal/spec.md (User Story 4, FR-008, SC-003 assume
  core features need no sign-in) — to be superseded by a new profiles/accounts spec, not amended.
- Follow-up TODOs: none
-->
# Grimorio Constitution

## Core Principles

### I. Physical-World Fidelity
The app MUST always be able to answer "where is this card, right now." Every feature that touches
owned-card data MUST preserve or improve the accuracy of physical storage location, not just
ownership state.
Rationale: this is Grimorio's core differentiator against generic collection trackers (Moxfield,
Deckbox, spreadsheets) — losing location fidelity for convenience elsewhere undermines the product's
reason to exist.

### II. PT-BR-First, Not PT-BR-Translated
Product-facing language and UX decisions MUST treat the Brazilian MTG audience as the primary
design input, not a localization pass applied after the fact. No i18n/multi-language abstraction
layer is to be introduced for a hypothetical English audience. This scope includes any text a user
can see regardless of its source — an unhandled or passthrough error message from a dependency
(e.g. Supabase) is not exempt just because the app didn't author it; a feature is only compliant
once that text is caught and translated like any other user-facing string.
Rationale: positioning depends on market fit, not just feature parity — an English-first app with
Portuguese strings bolted on would forfeit the differentiator, and an untranslated error message
reaching a user is the same forfeiture at a smaller scale.

### III. Free and Accessible
The product MUST remain free, with no ads and no monetization plan. Feature and UX decisions MUST
NOT be shaped by monetization pressure (e.g., artificial limits, paywalls, upsell flows).
Rationale: stated product commitment in PRODUCT.md; introducing monetization surface area would
require a governance amendment, not a routine feature decision.

### IV. Local-First, Cloud-Optional
Core functionality (tracking owned cards, storage locations, decks, and color identity) MUST work
fully offline and MUST require only a *local profile* — a username and password stored on the
device, with no email and no network. A device MAY hold multiple local profiles, and each
profile's data MUST be isolated from the others. A *cloud account* (email/password or Google) MAY
be linked to a local profile to enable sync, but MUST NOT be required for any capability. Gameplay
tools that don't touch owned-card data (e.g. life counter, planechase) MUST require no profile at
all.
Rationale: matches real usage — mid-collection-sorting sessions with inconsistent connectivity, and
several players sharing one device, each needing their own collection and color identity. Sync
stays layered on top of local data, not underneath it, and table-side gameplay tools stay usable by
anyone at the table without setup.

### V. Zoneless, Signal-Driven Angular
New code MUST use standalone components with `ChangeDetectionStrategy.OnPush`, and MUST NOT
introduce `zone.js` or rely on implicit zone-triggered change detection. State derivation uses
`computed`/`linkedSignal`; side effects use `effect`. No UI component framework (Ionic, Angular
Material, etc.) is to be reintroduced — components and styles are hand-written per the established
design-token system.
Rationale: this is a deliberate, already-migrated architectural stance (see architecture.md); a spec
or plan that assumes zone-based patterns or a component library would conflict with the existing
codebase rather than extend it.

### VI. Established Persistence and Sync Pattern
New entity types that need persistence MUST follow the existing service shape: signal-backed state
hydrated asynchronously from IndexedDB via `idb`, `whenReady()`/`flush()`, a serialized write queue,
and (if synced) `updatedAt` stamping plus soft-delete tombstones reconciled last-write-wins through
`reconcileEntities`. New Supabase tables MUST ship GRANT statements and owner-only RLS policies in
the same migration that creates them.
Rationale: this pattern is already proven across `CardService`/`StorageLocationService`/`DeckService`;
diverging per-feature would fragment the sync/offline story the rest of the app depends on.

## Technology Constraints

Current stack specifics — framework version, path aliases, test runner, OCR loading strategy,
native platform status, and similar implementation-level facts — are documented in `architecture.md`
and are intentionally not restated here, to avoid the two documents drifting out of sync. Those
specifics MAY change through ordinary code changes without a constitution amendment, unless the
change would conflict with a Core Principle above (I-VI) — e.g. reintroducing `zone.js` or a UI
component framework requires amending Principle V first, not just editing `architecture.md`.

## Development Workflow

Documentation in the project's AI agent guidance file and its imports (`AGENTS.md` is the portable
name this constitution expects; the project currently uses `CLAUDE.md` and `.claude/docs/*.md` for
this role, pending a possible future migration) MUST stay strictly fact-based (stack, structure,
commands, conventions actually present in the code) — this constitution governs product and
architectural principles; day-to-day conventions and their "worth adding" test remain owned by that
guidance file, not this one. Specs produced via `/speckit-specify` and plans via `/speckit-plan` MUST be checked
against this constitution's principles before implementation begins (`/speckit-implement`), and any
necessary deviation MUST be called out explicitly and justified rather than silently introduced.

## Governance

This constitution supersedes ad-hoc conventions when the two conflict. Amendments are made by
editing `.specify/memory/constitution.md` directly, incrementing the version per semantic
versioning (MAJOR: incompatible principle removal/redefinition; MINOR: new principle or materially
expanded guidance; PATCH: clarification/wording), and recording the change in the Sync Impact Report
comment at the top of this file. Every `/speckit-plan` run MUST include a Constitution Check gate
against the current version; unjustified violations block the plan from proceeding. Runtime,
day-to-day development guidance beyond governance lives in the project's AI agent guidance file
(`AGENTS.md` by convention; currently `CLAUDE.md` in this repo).

**Version**: 2.0.0 | **Ratified**: 2026-09-23 | **Last Amended**: 2026-09-24
