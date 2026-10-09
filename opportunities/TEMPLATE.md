# OPP-NNN · [Name]

- **Status**: draft
- **Created**: [YYYY-MM-DD]
- **Updated**: [YYYY-MM-DD]

## Opportunity

- **Who**: [the group of users, as specifically as possible]
- **Their situation**: [what they have and do today, with or without Grimorio]
- **The need**: [what they can't do today, or can only do badly; what it costs them]
- **Why Grimorio**: [how meeting it fits PRODUCT.md's positioning and principles; why not another tool]
- **Success looks like**: [plain-language outcome for these users; no invented numeric targets]

## Scope

- **In**: [what this opportunity covers]
- **Non-goals**: [what it deliberately leaves out, and why]

## Constitution check

[Each principle in `.specify/memory/constitution.md` this opportunity touches, and whether it fits. A conflict names the amendment it would need; it is not resolved silently.]

## Prerequisites

[Specs that must ship first and `#N` items from `backlog/pending-items.md` this depends on, each with why.]

## Features

| ID | Feature | Size | Maturity | Depends on | Spec |
|---|---|---|---|---|---|
| F1 | [name] | [S/M/L/XL] | [needs shaping / ready to spec] | [—] | — |

---

### F1 · [Feature name]

- **Size**: [M (d·p·u·r·k): data model · persistence & sync · UI · reach · unknowns]
- **Maturity**: [needs shaping / ready to spec]
- **Depends on**: [F#, specs, #N]
- **Spec**: —

**Goal.** [The outcome, one or two sentences.]

**User stories**

- [As a …, when …, I want … so that …]

**Behavior**

- [The rules, precise enough to become functional requirements: what happens, under which conditions, what is shown, what is stored.]

**Data & sync**

- [Models and fields added or changed, IndexedDB stores, Supabase tables/columns/RLS/grants, sync steps. "None" when none.]

**UI surfaces**

- [Views, components and entry points touched. DESIGN.md gaps this needs filled before building.]

**Edge cases**

- [Offline, profile switch, another open copy, sync conflicts, empty and huge collections, decks vs. collections, the holding box.]

**Out of scope**

- [What this feature does not do, and where it goes instead if anywhere.]

**Open decisions**

- [Question] — [options and their implications; a recommendation when there is one]

**Sub-features** *(only when split; each gets the sections above, shorter)*

- **F1a · [name]** — [size] — [what it ships on its own]

**Spec seed**

> [One paragraph, the `/speckit-specify` input: the need, the behavior, what's in and out. It must make sense on its own, without this file.]

---

## Suggested build order

*Written last, once every feature is at least `ready to spec` or explicitly parked.*

- **Phases**: [ordered groups of features, each ending in something usable]
- **Critical path**: [the chain that decides the earliest finish]
- **In parallel**: [what can be specified or built side by side]
- **Why this order**: [dependencies, risk first or value first, what each phase unlocks]
