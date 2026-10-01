# Feature Specification: Page Transitions

**Feature Branch**: `013-page-transitions`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "Page transitions (backlog entry 4, backlog/features.md; item detail in backlog/pending-items.md #1, #2, #3, #4, #5, #8, #9, #10). Goal: One page-change system shared by decks and collections, with PageSweep as a reusable component, so any new area gets page transitions without copying code. Pure refactor: what users see in the deck and collection page changes stays the same (DESIGN.md Motion "Page sweep" unchanged). Scope: a shared page-change controller replacing DeckTurn and CollectionTransition, where each area supplies only its direction rule (#1); decks move from pendingClose to the shown + leaving model, with the deck page's header deriving from the leaving place too (#2); PageSweep becomes a component owning the canvas, the .sweep wrapper, the page offset and the attach wiring each view copies today (#3); PageSweep.start's active callback is dropped (#4 — open decision: intended dust behavior when a change finishes without a new sweep); the collections redirect uses navigation info instead of a mutable redirecting flag (#5); pageOf is memoized per place (#8); --band is set from FRONT_BAND instead of a comment-synced duplicate (#9); naming leftovers (deck-dust.util.ts no longer deck-specific, "page turn" wording in app.routes.ts) (#10). Open decisions for clarify: #4's dust behavior; component vs. directive for PageSweep."

## Context

The collection area (list ↔ collection ↔ holding box) and the deck area (list ↔ deck) both change pages with the page sweep (DESIGN.md Motion, "Page sweep"). In the sweep, the outgoing page dissolves behind a front that crosses the view and stirs dust in the profile's colors. The two areas look the same, but each has its own copy of what runs it:

- **Two near-identical controllers.** Each area has its own page-change controller (`DeckTurn`, `CollectionTransition`). Each tracks the shown page and whether a change is running, honors reduced motion, shows the first page instantly, and finishes a running change before starting the next. The real differences are which way a change goes and which navigations sweep at all.
- **Two models for the outgoing page.** Collections keep the incoming page as "shown" and the outgoing one as "leaving". Decks instead hold back the incoming page while closing ("pending close"). Because of that, the deck page's header depends on decks' own model.
- **Copied view wiring.** Each area view repeats the dust canvas, the outgoing-page layer, its scroll offset, blocking input while a change runs, and connecting the canvas to the sweep.
- **Small leftovers.** The sweep takes an "is the change still running" callback, which both callers pass identically. Collections mark their redirect with a mutable flag, where decks read the navigation's own data. A collection page's data is rebuilt on every render. The front's band width is kept in sync between code and styles by a comment only. A few names still say "deck" or "page turn" for shared code.

The card features (catalog, adding cards) will add more areas with pages, and each would need a third copy. This spec settles one shared page-change system first. It is entry 4 on the feature roadmap (`backlog/features.md`, "Page transitions") and absorbs pending items #1, #2, #3, #4, #5, #8, #9 and #10. It is a refactor: every page change a person sees today looks and behaves the same afterwards, except where this spec decides otherwise.

## Clarifications

### Session 2026-10-01

- Q: When a page change is cut short by a navigation that doesn't start a new sweep (a redirect, a delete landing, a return to the place already shown), what happens to the dust in flight? → A: It settles at once, as at the end of a normal change (gone ≤ 1 s), in both areas; collections' abrupt clear goes away.
- Q: Is the shared page sweep a component the area places (owning canvas and outgoing layer) or a directive over markup the area writes? → A: A component. The area projects its incoming and outgoing pages into it. It owns the dust canvas, the outgoing-page layer and its scroll offset, the band width and the input blocking.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Page changes look and behave exactly as before (Priority: P1)

A person browsing their collections opens a collection. The list dissolves right to left behind the dust, and the collection page is underneath. They go into a subcollection, then back up through the breadcrumb, and the sweep mirrors left to right. In Decks, they open a deck from its fan and later return with the back link or the browser's back button, and the same sweep runs. Nothing about these changes differs from before the refactor. The difference is internal: both areas now run on one shared page-change system.

**Why this priority**: The page changes are the most visible motion in the owned-data areas. A regression here (a blank page during a close, a stuck input block, dust that never clears, a sweep where there should be none) shows up on every navigation.

**Independent Test**: In both areas, walk every navigation DESIGN.md lists (open, close, sideways, browser back and forward, direct load, side-nav, wordmark, delete landing, missing-place redirect). Confirm each one sweeps or swaps instantly as before, in the same direction, with the outgoing page whole until the front reaches it. Repeat with reduced motion on and confirm every change is an instant swap with no dust.

**Acceptance Scenarios**:

1. **Given** the collection list, **When** the person opens a collection or the holding box, **Then** the page sweeps open (right → left), and the outgoing list dissolves over the incoming page from where it was scrolled.
2. **Given** a collection page, **When** the person opens a subcollection or a sibling, **Then** the page sweeps open; **When** they go up (breadcrumb, back link, browser back), **Then** it sweeps closed (left → right).
3. **Given** the deck list, **When** the person opens a deck from its tile, **Then** the page sweeps open; **When** they open the same deck by browser forward or a typed address, **Then** it swaps instantly.
4. **Given** a deck page, **When** the person returns by the back link, side-nav "Decks" or browser/Android back, **Then** the page sweeps closed, and the deck page (header, name, format, actions) stays whole and readable as it dissolves.
5. **Given** a deck page, **When** the deck is deleted, or the address names a deck that doesn't exist, **Then** the list appears with no sweep.
6. **Given** a collection page, **When** the collection is deleted, removed by a sync, or the address names one that doesn't exist (or an empty holding box), **Then** the parent or the list appears with no sweep.
7. **Given** any page change is running, **When** it runs, **Then** input is blocked until it ends, and focus moves to the new page's heading once it ends.
8. **Given** reduced motion is on, **When** the person navigates in either area, **Then** every change is an instant swap and no dust is drawn.

---

### User Story 2 - A new area gets page changes without copying code (Priority: P2)

The maintainer builds the next area with pages (for example, a card catalog). To give it the page sweep, they provide only what is specific to the area: its places, which way a change between two places goes, and which navigations sweep. They place the shared sweep in the area's template. They do not copy a controller, the canvas wiring, the outgoing-page layer or the input blocking.

**Why this priority**: This is the reason for the spec. It has no direct user value, but without it every future area adds a third or fourth copy of the same state machine and wiring.

**Independent Test**: Read the deck and collection area code and confirm that neither keeps its own controller state machine, canvas wiring, outgoing-page layer markup or input blocking. Each supplies only its places and direction rule. The shared controller's tests cover what both areas rely on.

**Acceptance Scenarios**:

1. **Given** the shared page-change system, **When** the maintainer reads the deck and collection areas, **Then** each supplies only its places, its direction rule and its sweep triggers, and the page-change state lives in one shared unit.
2. **Given** the shared sweep, **When** an area uses it, **Then** the dust canvas, the outgoing-page layer with its scroll offset, and the connection between them come from the shared sweep, not from the area.
3. **Given** the shared controller, **When** its tests run, **Then** they cover the first place shown instantly, a sweep, an instant swap, reduced motion, and a change started while another runs.

---

### User Story 3 - Quick successive navigations stay clean (Priority: P2)

A person clicks into a collection and, before the sweep ends, presses back. Or they open a deck and immediately use the side nav to leave. The page never shows a blank area or a stale page. Input is never left blocked, and the dust never freezes on screen. All of it clears within a second of the last change.

**Why this priority**: Interrupted changes are where the two current controllers differ most, so a shared controller must settle them deliberately.

**Independent Test**: In both areas, start a page change and trigger another navigation before it ends: one that sweeps, one that swaps instantly, and one that returns to the same place. Confirm the final page is correct, input works, and the dust is gone within 1 second.

**Acceptance Scenarios**:

1. **Given** a page change is running, **When** a navigation that sweeps starts, **Then** the running change finishes at once (its outgoing page removed, its dust cleared) and the new sweep starts from the page just reached.
2. **Given** a page change is running, **When** a navigation that doesn't sweep lands (a redirect, a delete landing, a navigation that never sweeps), **Then** the running change finishes at once, the new page shows instantly, and the dust in flight settles as it does at the end of a normal change. Collections today clear it abruptly instead.
3. **Given** a page change is running, **When** the navigation returns to the place already shown, **Then** the running change finishes at once and no new sweep starts.
4. **Given** any sequence of quick navigations, **When** the last one ends, **Then** input is unblocked and no dust remains on screen more than 1 second later.

### Edge Cases

- **The outgoing deck or collection is removed while it dissolves** (deleted in another copy of the app, removed by a sync): the outgoing page keeps showing its last content until the sweep ends. It never goes blank mid-change.
- **The view is left while a sweep runs** (a navigation to another area, a sign-out): the sweep's timers and drawing stop with the view, and nothing is left running.
- **The first place shown** (a direct load or arriving from another area): always instant, never a sweep.
- **A collection removed mid-change still has a direction**: the depth it had when it was shown still decides open vs. close.
- **A redirect back to the place already shown**: it must not mark the next real navigation as instant.
- **No canvas available** (reduced motion, or a browser with no 2D canvas context): the page change still completes on time, with no dust.
- **The page was scrolled when the change starts**: the outgoing page leaves from where it was scrolled, and the incoming one starts at the top.
- **The dust canvas appears or disappears while the view is open** (reduced motion toggled in the OS): the sweep uses the canvas that is present, or none.

## Requirements *(mandatory)*

### Functional Requirements

**Shared page-change controller (#1, #2)**

- **FR-001**: The deck and collection areas MUST run their page changes through one shared page-change controller. Neither area keeps its own copy of the shown place, the running-change state, reduced-motion handling, first-place handling or finish-then-start logic.
- **FR-002**: Each area MUST supply only what is specific to it: its kinds of places, when two places are the same, which way a change between two places goes (open or close), and which navigations sweep at all.
- **FR-003**: The controller MUST keep both the incoming place (shown underneath from the start of a change) and the outgoing place (dissolving over it while the change runs) for both areas. Decks move to this model and drop their "pending close" hold-back.
- **FR-004**: During a close in the deck area, the outgoing deck page MUST keep showing the deck's header (name, format, actions) whole until the front dissolves it. It MUST NOT go blank because the shown place is already the list, nor because the deck was removed mid-change.
- **FR-005**: The decks' sweep triggers MUST stay as DESIGN.md lists them. Opening a deck from its tile sweeps open. The back link, side-nav "Decks" and browser/Android back sweep closed. A direct load, browser forward, a typed address, the wordmark, the landing after a delete and the missing-deck redirect never sweep. Deck → another deck never sweeps.
- **FR-006**: The collections' sweep rule MUST stay as DESIGN.md states it. Every navigation sweeps, open going deeper or sideways and closed going up, except the first load and the missing-place redirect (including landing on the parent after a delete), which swap instantly.
- **FR-007**: The first place an area shows MUST appear instantly, and under reduced motion every change MUST be an instant swap with no dust.

**Interrupted changes (#4)**

- **FR-008**: A navigation that lands while a change runs MUST finish that change at once: its outgoing page is removed and input is unblocked.
- **FR-009**: If the new navigation sweeps, the dust in flight MUST be cleared and the new sweep MUST start fresh. If it doesn't sweep, or returns to the place already shown, the dust in flight MUST start settling at once, as it does at the end of a normal change (DESIGN.md "Settle", all gone ≤ 1 s), in both areas. The front is not kept moving to the end of the interrupted sweep's duration. This replaces collections' abrupt clear on an instant swap.
- **FR-010**: The sweep MUST NOT ask its caller whether the change is still running. The controller tells the sweep when the page has settled.

**Shared sweep (#3, #9)**

- **FR-011**: The page sweep MUST be a shared component that an area places in its template, projecting its incoming and outgoing pages into it. The component owns the dust canvas, the outgoing-page layer and its scroll offset, the band width (FR-013) and the input blocking (FR-012). An area uses it without the area copying any of these: the dust canvas, the outgoing-page layer and its scroll offset, the per-view connection between canvas and sweep, or the reset of the front between two quick sweeps.
- **FR-012**: While a change runs, input to the area MUST be blocked, as today. Every area that uses the shared sweep gets this without writing it itself.
- **FR-013**: The width of the front's fading band MUST be defined in one place and used by both the dust and the outgoing page's fade, so the two can't drift apart.
- **FR-014**: The sweep's timing, front, fade, dust and settle MUST stay exactly as DESIGN.md Motion "Page sweep" specifies. DESIGN.md's Page sweep entry does not change.

**Redirect marking (#5)**

- **FR-015**: The collections' missing-place redirect MUST mark itself as instant through the navigation that performs it, the way decks mark their delete landing. The area keeps no flag between the redirect and its landing. A redirect back to the place already shown MUST NOT make the next navigation instant.

**Collection page data (#8)**

- **FR-016**: A collection page's data (the collection, its color, ancestors, depth, kind, totals and children) MUST be derived once per place when its inputs change, for both the shown and the outgoing place, not rebuilt on every render.

**Naming (#10)**

- **FR-017**: Shared page-change and dust code MUST carry names and locations that reflect that it is shared. No file or comment shared by both areas may call itself deck-specific or a "page turn".

**Guardrails**

- **FR-018**: The existing deck-area, collection-area, page-change and dust tests MUST keep passing. A test changes only where it moves to the shared controller or where this spec decides a behavior change (FR-009).
- **FR-019**: The shared controller and the shared sweep MUST be covered by tests, including interrupted changes (User Story 3).
- **FR-020**: No user-visible text changes.

### Key Entities

- **Place**: a page an area can show. In the collection area: the list, a collection or the holding box. In the deck area: the list or a deck. Each area defines its own places and when two are the same.
- **Page change**: the move from one place to another, either a sweep (open or close) or an instant swap. While a sweep runs it has an incoming place (shown underneath) and an outgoing place (dissolving over it).
- **Direction rule**: the area-specific rule that says, for a navigation between two places, whether it sweeps and which way (open or close).
- **Page sweep**: the shared visual effect of a sweep. It consists of the moving front, the outgoing page's fading layer and the dust.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every navigation listed in DESIGN.md's "Collections page change" and "Decks page change" entries sweeps or swaps instantly exactly as before, in the same direction, with 0 differences outside FR-009.
- **SC-002**: The page-change state machine exists in exactly 1 place, used by 2 areas. The dust canvas wiring, the outgoing-page layer and the input blocking each exist in exactly 1 place.
- **SC-003**: The front's band width is defined in exactly 1 place.
- **SC-004**: After any sequence of quick navigations in either area, input works and no dust remains on screen more than 1 second after the last change.
- **SC-005**: Every existing test for the two areas, the page change and the dust passes, with changes only where tests move to the shared controller or check FR-009.
- **SC-006**: The design audit reports no difference between the page changes and DESIGN.md's Motion entries.

## Assumptions

- **Technical choices are left to the plan**, except the shared sweep's form: a component (Clarifications, 2026-10-01), because it must render the dust canvas, which a directive can't. The plan decides how the controller is generic over each area's places, and how navigation data reaches the direction rule. None of these change what a person sees.
- **FR-009 is the one behavior change.** It applies the end-of-change settle to every interrupted change that doesn't start a new sweep, matching DESIGN.md's "Settle" rule ("all gone ≤ 1s after the page settles"). Today decks already do this and collections clear the dust abruptly. Confirmed in Clarifications (2026-10-01).
- **The navigation marking for instant changes** (decks' delete landing, collections' redirect) may share one convention across both areas. The plan decides its shape.
- **The heading focus after a change** (User Story 1, scenario 7) stays as today in each area. Whether it moves into the shared controller is a plan decision.
- **Early development, single user**: no backward-compatibility code for the old controllers.
- **DESIGN.md needs no change**: the visuals and triggers are already documented, and this spec only changes how they are built.
- **Out of scope**: the `setTimeout`/`effect` audits (roadmap entry 5, which follows this spec), mobile landscape (entry 6), new page-change visuals, and page changes for areas that don't exist yet.
