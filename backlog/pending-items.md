# Pending items

Known work that isn't specced yet. [features.md](features.md) groups items into planned specs by number (`#N`), so **numbers are permanent**: never renumber, and give a new item the next free number (the next is **#41**; #12 was retired). When a spec ships, delete its items here. Check each item still applies before planning it.

**Size**: `S` a focused change, `M` several files or one design decision, `L` changes a model or spans the app. Every **L** is listed under "Big items" too.

## Big items

- **#31 Planechase: cards that need the planar deck** — five cards still can't be played as written; two of them need several face-up planes.
- **#15 Mobile-landscape layout** — the breakpoints only look at width.

## At a glance

| # | Item | Size | Spec ([features.md](features.md)) |
|---|---|---|---|
| **Planechase gameplay** | | | |
| 31 | Cards that need the planar deck | **L** | — |
| 32 | Phenomena that change the die | M | — |
| 33 | "Then planeswalk" chaos abilities | S | — |
| 34 | Effects that last until a planeswalk | S | — |
| 35 | Default-off the unsupported cards | S | — |
| 36 | DESIGN.md: Interplanar Tunnel chooser | S | — |
| **Storage & sync** | | | |
| 39 | Cross-device deletes | M | — |
| 40 | Card refresh vs. a pending collection write | S | — |
| **Codebase health** | | | |
| 23 | `setTimeout` audit | M | 5 |
| 28 | `effect` audit | M | 5 |
| 37 | Fix the recorded promise exceptions | S | 5 |
| **Layout** | | | |
| 15 | Mobile-landscape layout | **L** | 6 |
| **Card features (deferred)** | | | |
| 13 | Sync card artist data | M | deferred |
| 38 | Card-reading guardrails | S | deferred |

---

## Planechase gameplay

Found in a scan of all 151 catalog cards (2026-09-29) for effects that touch what the app tracks: the planar deck, the die, the roll cost and planeswalking. Spec 006 leaves card effects to the table, but the table can't see the planar deck, so these cards are wrong or unplayable as written. Interplanar Tunnel was the first one fixed (`tunnelReveal`/`resolveTunnel` in `planechase-game.util.ts`, `app-tunnel-choice`); the rest follow the same shape: a pure transition, derived (never stored) reveals, undoable.

### #31 · Cards that need the planar deck — L

Only the app knows the deck's order, so the table can't resolve these:

- **Stairs to Infinity** (plane) — on chaos, reveal the top card of the planar deck; the table may put it on the bottom. The simplest: one revealed card, a keep/bottom choice.
- **The Fertile Lands of Saulvinia** (plane) — on chaos, reveal down to the next plane; *that* plane's chaos ability triggers; everything revealed goes to the bottom. The app must show another card's chaos text.
- **Pools of Becoming** (plane) — on chaos, reveal the top three cards; all three chaos abilities trigger, then they go to the bottom. Three foreign chaos texts at once.
- **Norn's Seedcore** (plane) — arriving there makes chaos ensue; on chaos, reveal down to the next plane and planeswalk to it *without leaving any plane*. Several face-up planes.
- **Spatial Merging** (phenomenon) — reveal down to two planes and planeswalk to both at once. Several face-up planes.

The last two need `PlanechaseGameState.current` to become a set of face-up planes (a planeswalk leaves all of them; chaos asks which one's ability applies). Spec 006 put "Grand Melee (several face-up planes)" out of scope, so they share that decision.

### #32 · Phenomena that change the die — M

The app's roll result is wrong while these apply:

- **Chaotic Aether** — every blank roll is a chaos roll until a player planeswalks away from a plane. The app shows "Nada acontece". The game state can hold the flag and clear it on the next planeswalk.
- **Fixed Point in Time** — until your next turn, a planeswalk roll makes chaos ensue instead. The app doesn't know whose turn it is, so this needs a manual on/off control.

### #33 · "Then planeswalk" chaos abilities — S

**Bad Wolf Bay**, **Pompeii**, **TARDIS Bay**, **Temple of Atropos** and **Grand Ossuary** end their chaos ability with "Then planeswalk". It works today through the manual Planeswalk button (cost unchanged, which is correct), but nothing reminds the table. A hint or a prompted planeswalk after their chaos result would cover it. **Aretopolis** and **Lair of the Ashen Idol** planeswalk on their own from table state the app can't see, so the manual button stays the answer there.

### #34 · Effects that last until a planeswalk — S

**Agyrem**, **Celestine Reef**, **Eloren Wilds**, **Unyaro** and **The Doctor's Childhood Barn** create effects that end "until a player planeswalks". The app knows exactly when that happens and could remind the table as it does.

### #35 · Default-off the unsupported cards — S

`default-off.ts` holds Temple of Atropos, Otaria and Morphic Tide, but none of the cards in #31 or #32, so they're live in a default deck. Until each is supported, consider adding them (and removing each as it ships).

### #36 · DESIGN.md: Interplanar Tunnel chooser — S

`app-tunnel-choice` isn't in DESIGN.md, so by its own rule the design is undecided. `design-auditor` listed what an entry needs: placement (under the card block, above the links); the eyebrow `h2` "N planos revelados"; a `radiogroup` with roving tabindex (arrows, Home, End); "Concluir encontro" disabled until a pick, and the pick reset whenever the reveal changes; a 5-column grid (1 on phone) vs. the card tile's 4; the chosen state (lit bead + role-primary border, glow on hover only); the focus outline on the image frame; the heading level next to the card name's `h2`. The bead-inset `calc()` is duplicated from `planar-tile.scss` — move it into `_bead.scss` when both are documented. The future #31/#32 choosers should follow the same entry.

---

## Storage & sync

### #39 · Cross-device deletes — M

A row deleted on device A is deleted remotely, but device B still has it locally, finds no remote copy, and `reconcileEntities` (`core/utils/sync-reconcile.util.ts`) treats "local-only" as "never synced", so B uploads it again. Deletes don't reach other devices. A fix needs remote tombstones (a soft-delete column or tombstone table, with a migration per synced table) so absence can be told apart from deletion.

### #40 · Card refresh vs. a pending collection write — S

Found in spec 011. `CardService.refresh()` (run when another copy announces `cards`) awaits only its own `flush()`. A `CollectionService` write that moves or deletes cards (create-with-move, delete with "Excluir as cartas", `resolveMixedCollections`) changes the card signal through `applyMoved`/`applyRemoved` but persists through the collection queue. If another copy's announcement arrives while that write is still queued, the refresh reads IndexedDB before it lands and the screen shows the old card locations until the next load; the stored data is correct. A fix: let the refresh also wait for writes queued elsewhere that touch cards (e.g. a flush hook `CollectionService` registers with `CardService`).

---

## Codebase health

### #23 · `setTimeout` audit — M

19 `setTimeout` calls outside specs. Check which should instead be tied to `animationend`/`transitionend` or signals; timer-based sequencing is a flakiness source (see the SC-004 fix).

### #28 · `effect` audit — M

16 `effect(` calls outside specs. Check which are really derived state and should be `computed` or `linkedSignal` (the idiom in architecture.md), keeping `effect` for real side effects.

### #37 · Fix the recorded promise exceptions — S

Spec 010 recorded the existing promise violations in `eslint-suppressions.json` instead of fixing them (its FR-016): `no-floating-promises` in `views/collection-area/collection-area.ts` (2, the `openCollection`/`openHolding` `router.navigate` calls; spec 013 fixed the redirect and the deck area's one); `no-misused-promises` in `core/services/sync.service.spec.ts` (3) and `shared/auth/profile-modal/profile-flow.store.spec.ts` (1). Await, handle or `void` each one, then run `npx eslint src --prune-suppressions`. The file should end up empty and can be deleted.

---

## Layout

### #15 · Mobile-landscape layout — L

A phone in landscape is short (~390px tall) but often wider than `$bp-mobile` (640px), so it gets the tablet/desktop layout on a very short screen. The breakpoints only look at width. Add a height-aware condition (e.g. `(orientation: landscape) and (max-height: …)`), then check the app shell, top bar, modals (the fluid-height faces and their viewport cap) and the Planechase phone dock against it.

---

## Card features (deferred)

Spec 010 removed every card component, card reading (OCR), catalog lookup and CSV import; the card features start fresh. Their tuned configuration is in [reference/card-features.md](reference/card-features.md). These items wait for those specs (see features.md, "Deferred: card features").

### #13 · Sync card artist data — M

Scryfall provides artist info, but `scripts/sync-scryfall.ts` doesn't extract it. The `ScryfallCard` interface has the artist field available, but `toCardRow` and `toPrintingRow` skip it. Add `artist` to the sync (likely to `printings` table since it's printing-specific in Scryfall) and ensure the Supabase schema has the column.

### #38 · Card-reading guardrails — S

When card reading (OCR) returns, keep `tesseract.js` out of the initial bundle the way the Planechase data is (spec 010, FR-009): add a `tesseract.js` pattern to the `@typescript-eslint/no-restricted-imports` blocks in `eslint.config.js` (static imports fail lint, `import()` passes), and a named `bundle` budget in `angular.json` for its lazy chunk.
