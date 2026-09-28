---

description: "Task list for spec 009: Decks Foundation"
---

# Tasks: Decks Foundation

**Input**: Design documents from `/specs/009-decks-foundation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/services.md, contracts/supabase.md, ui.md, quickstart.md

**Visual source**: `design_handoff_decks_foundation/Decks Hi-fi.dc.html` (hi-fi) and its `README.md`, which holds every measurement. Recreate it with the app's primitives. The dust is option 4a, with the per-speck settle described in the README ("Settle (change vs. prototype)").

**Tests**: Included, following the project convention: each new or changed unit gets a colocated `.spec.ts`, and the specs of deleted units go with them. Test and lint runs go through the `test-runner` agent. The visual and two-device checks are in quickstart.md.

**Organization**: Tasks are grouped by user story, so each story can be built and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1–US4)

## Path Conventions

This is a single Angular project. Paths are relative to the repo root. The aliases are `@models/*`, `@services/*`, `@utils/*`, `@testing/*` and `@shared/*` (architecture.md). Every component is standalone and OnPush. Every PT-BR string comes from `DECK` (`deck-copy.ts`); templates have no inline copy.

---

- [X] T000 Before any other task, check out `feature/009-decks-foundation` and make its first commit: every file under `specs/009-decks-foundation/` plus `design_handoff_decks_foundation/`, and nothing else.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The design system entry, the model and the copy that every later phase uses.

- [X] T001 Update `DESIGN.md` before any UI is built (Constitution V, FR-015), taking every value from `design_handoff_decks_foundation/README.md` and ui.md:
  - **(a)** Under "## Shapes", add the exception: the deck sleeves use a 14px radius and the card window 12px, the only radii outside 4/8/10 (like the create row's dashed border).
  - **(b)** Under "## Components", add a "### Decks" section after "### Collections", covering:
    - the list column (1080px, padding `space-6`/`space-4`, 4-column grid with 32px row / 24px column gap; phone: one centered column);
    - the header ("Decks" `h1`, the primary "Novo deck" hidden ≤ 640px, the dashed create row "Novo deck" ending the list on phone);
    - the **deck fan**: a 320×392 stage (0.75 scale on desktop as one unit, in a reserved box); three 256×352 sleeves at `left: 32px; top: 20px`, `transform-origin: 50% 100%`, 14px radius:
      - back: 1px tertiary on `surface`, −9°;
      - middle: 1px accent on `surface-raised`, −4°;
      - front: 1px primary on `bg`, padding 5px, `0 0 20px -4px` primary at 55%, lifting `translateY(-8px)` at 70% on hover/focus over 0.5s;
    - the **card window**: exactly 244×340 (63:88), 12px radius, `object-fit: contain`. The placeholder is a `surface` fill with a radial primary 26% at 50% 38% fading to transparent at 68%, the micro label and the 0.75rem muted hint. The rule: **card images are never cropped, masked or altered — only the whole image may be translated or scaled** (FR-017);
    - the caption (name 700, `line-height 1.2`, wraps with `overflow-wrap: anywhere`; format 0.875rem muted; centered) and the tile focus outline (`2px solid role-accent`, offset 2px);
    - the empty state (same recipe as Collections: eyebrow, `h2`, muted copy, primary CTA);
    - the deck page header (760px column; "Voltar para decks" `.link-btn` with margin-bottom −12px; `h1` with `text-wrap: balance` over the muted format; "Editar" secondary and "Excluir" danger, dropping to a 50/50 row on phone), and the rule that it carries **no wash or role override** — a deck's colors appear only in the dust;
    - the **format picker**: a radiogroup of text buttons, 4 columns (2 on phone, always full rows). Selected: border and text role-primary, 700, `--glow-button` plus `--glow-button-text`; others muted. Its label is "Formato · {selected}", with the `.plate` rules list (padding `space-3`, sm muted bullets, gap `space-1`) below;
    - the name counter (`n/40`, right-aligned, tabular numbers, danger above 40).
  - **(c)** Under "## Motion", add **"Decks page turn"** (list ↔ deck):
    - the page is the list inside the view, `transform-origin: 0 50%`, `preserve-3d`, with the front face `backface-visibility: hidden` on `bg` and the back face flat `surface` with a 1px `border` left edge;
    - perspective 2800px desktop, 1100px phone;
    - `rotateY(0 → -180deg)` to open, reverse to close, over 1300ms with the standard easing; input is blocked while turning;
    - the triggers from spec FR-018;
    - **dust**:
      - count: 260 desktop / 110 phone;
      - radius `0.45 + r^2.2 × 1.1`px, as a sprite at 5× radius (parchment core 0–12% → color to 45% → transparent; alpha 1 → .55 at 20% → 0; drawn at `a × 0.7`);
      - the edge-x formula, the push, swirl, clamp, damping and ambient drift constants, and "visibility = motion" — all verbatim from the README;
      - the settle: per-speck random delay 0–600ms and fade 0.6–1.4s, all gone ≤ 2s after the page settles, then the canvas is cleared and the loop stopped;
      - parchment until decks have colors;
    - `prefers-reduced-motion`: an instant swap and no dust.
  - **(d)** Under "## Content", add the **Decks** copy bullets: the three name errors, the two delete bodies, and the toasts labelled "Deck" (ui.md §7), plus the eight format rule lists (spec FR-016). Leave a note there that the format rules were reviewed with the user when this section was added. **Show the user the format rules and get their OK before continuing**: the handoff flags them for product review.
- [X] T002 [P] Rewrite `src/app/core/models/deck.model.ts` (data-model.md), replacing the old `Deck`/`DeckCard`/`DeckCardIdentity`:
  - `export const DECK_FORMATS = ['commander', 'pauper', 'modern', 'standard', 'pioneer', 'legacy', 'vintage', 'casual'] as const;`
  - `export type DeckFormatId = (typeof DECK_FORMATS)[number];`
  - `export const DEFAULT_FORMAT: DeckFormatId = 'commander';`
  - `export interface Deck { id: string; name: string; format: DeckFormatId; updatedAt: string }` — "no card data, counts, featured card or colors" (FR-011);
  - `export type DeckNameError = 'empty' | 'too-long' | 'taken';`
  - `export function formatOf(id: string): DeckFormatId`, which returns `id` when it's in `DECK_FORMATS`, else `'casual'`.

  Re-export nothing else, and reuse `MAX_NAME` from `@models/collection.model` (40) rather than redeclaring it. The old imports break until T008 removes them; that's expected inside Phase 2.
- [X] T003 [P] Create `src/app/core/utils/deck-copy.ts`, following `collection-copy.ts`'s header style. It exports `DECK` with every string in ui.md §7 verbatim (read the current ui.md, whose copy the user has edited), with functions for the interpolated ones: `tileLabel`, `formatLabel`, `deleteTitle`, `deleteWithCards`, `toastDeleted` and `toastMoved`.
  - Counts go through `formatCount` from `collection-copy.ts`.
  - `deleteWithCards(1)` uses the singular text from ui.md §7, and `toastMoved(nome, 1)` uses "1 carta foi para a caixa temporária."
  - Include `formats: Record<DeckFormatId, { name: string; rules: readonly string[] }>` with the names and one bullet per sentence from spec FR-016. The 60-card base is "Mínimo de 60 cartas." · "Sideboard de até 15 cartas." · "Até 4 cópias de cada carta, exceto terrenos básicos."; Pauper, Modern, Standard, Pioneer, Legacy and Vintage append their own bullets; Commander has its 5 and Casual its 1.

  Add `deck-copy.spec.ts` covering: singular and plural of `deleteWithCards`/`toastMoved`, "1.240" grouping, every format having a name and at least one rule, and the Vintage bullets in order.
- [X] T003a Checkpoint: run `deck-copy.spec.ts` through `test-runner` (the full suite only compiles again at T010), then commit Phase 1.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Storage v3, the name rules, the rewritten service core, the holding-box derivation, the old deck stack removed, and the new route and nav entry. After this phase the app compiles, `/decks` renders a skeleton `DeckArea`, and nothing references `DeckCard`/`DeckCardIdentity`.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 In `src/app/core/db/profile-db.ts`:
  - set `DB_VERSION = 3`;
  - set `TombstoneEntity = 'cards' | 'collections' | 'decks'`;
  - change `upgrade(db)` to `upgrade(db, oldVersion)`. When `oldVersion < 3` and `decks` exists, delete it before the create-if-missing block, so `decks` is recreated empty and the old records are dropped, not migrated (FR-013, research R3). Keep every other create-if-missing line.

  In `src/app/core/db/entity-store.ts`, widen `RowOp` so `store` can be `'decks'` for put/delete (the value type becomes `Collection | CardEntry | Deck`). `EntityStoreName` already includes `'decks'`.

  Extend `src/app/core/db/profile-db.spec.ts`: a v2 database holding an old-shaped deck row opens at v3 with an empty `decks` store and its `cards`/`collections` rows intact; `writeRows` puts and deletes `decks` rows alongside a `decks:{id}` tombstone in one transaction.
- [X] T005 [P] Create `src/app/core/utils/deck.util.ts` (contracts/services.md, research R4). `repairDeckNames` comes in T028.
  - `normalizeDeckName(name)` = `name.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR')`.
  - `compareDeckNames(a, b)` = `a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)`.
  - `validateDeckName(name, decks, selfId?)` returns, in this order:
    - `'empty'` when the trimmed length is 0;
    - `'too-long'` when the trimmed length is > 40 (`MAX_NAME`);
    - `'taken'` when a deck other than `selfId` has the same `normalizeDeckName`;
    - otherwise `null`.

  Add `deck.util.spec.ts` covering: "" and "   " → empty; 41 characters → too-long; 40 characters with surrounding spaces → ok; "krênko GOBLINS " vs "Krenko goblins" → taken; self excluded on rename; ordering "zur", "Élesh", "Atraxa" → Atraxa, Élesh, zur; ties broken by id.
- [X] T006 Rewrite `src/app/core/services/deck.service.ts` (`providedIn: 'root'`) with `CollectionService`'s entity shape (Constitution VI, research R3):
  - `load(profileId)` clears the signal synchronously, with a generation guard;
  - `whenReady()`, `flush()`, and `changeCount`;
  - a private `enqueueWrite(fn)` that chains on `writeQueue` and logs "Grimorio: failed to persist decks." on failure;
  - every write is `writeRows(ops, handle)` with `handle = currentDbHandle()` captured at call time, never `replaceStore`.

  The derived signals are `decks`, `sorted` (by `compareDeckNames`), `byId` (a `Map`) and `ids` (a `ReadonlySet<string>`). `cardCount(id)` = Σ `quantity` of `CardService.cards()` with `locationId === id`. It also has the sync-only `getTombstones()`/`clearTombstones(ids)` (entity `'decks'`) and `applySyncResult(merged)`, which sets the signal, writes only changed rows and deletes missing ids, never restamps, never tombstones and never bumps `changeCount`.

  The mutations come in the story phases (create/update T018, remove T023). Rewrite `deck.service.spec.ts` covering: load isolation between two profiles, hydration from seeded rows, `sorted` order, `cardCount` from seeded cards, and `applySyncResult` writing only the diff (depends on T002, T004, T005).
- [X] T007 Make the holding box exclude deck ids (research R1):
  - In `src/app/core/utils/collection-tree.util.ts`, `computeStats(collections, cards, deckIds: ReadonlySet<string> = new Set())` skips an entry whose `locationId` is in `deckIds` before the holding-box branch: it counts neither in a collection nor in `holding`.
  - In `src/app/core/services/collection.service.ts`, inject `DeckService` and use `stats = computed(() => computeStats(this.collections(), this.cards.cards(), this.decks.ids()))`.

  Extend `collection-tree.util.spec.ts` (a card with a deck id is in neither; without that id in `deckIds` it's in holding) and `collection.service.spec.ts` (a seeded deck plus a card pointing at it → `holding.cards === 0`) (depends on T006).
- [X] T008 Remove the old deck stack (research R14, FR-013):
  - **(a)** Delete `src/app/views/decks/` and `src/app/views/deck-detail/` (with their specs), `src/app/shared/decks/deck-list/`, `src/app/shared/cards/deck-card-list/`, `src/app/shared/cards/card-picker/` and `src/app/shared/cards/color-identity/`.
  - **(b)** In `src/app/shared/cards/add-card-modal/add-card-modal.ts` (+ html and spec), remove the `'deck'` context, the `deckId` and `filter` inputs, `toIdentity`, the `DeckService`/`DeckCardIdentity` imports and every deck branch. `context` stays as `input<'collection'>('collection')`, or is removed if nothing else reads it.
  - **(c)** In `src/app/shared/index.ts`, drop the `CardPicker`, `ColorIdentity`, `DeckCardList` and `DeckList` exports.
  - **(d)** In `src/app/core/services/entity-load-isolation.spec.ts`, replace `decks.add({ name, commander, cards })` with a row seeded through `writeRows` (`DeckService.create` replaces the seed in T022), and assert on `decks.decks()`.
  - **(e)** Grep `src/` for `DeckCard`, `DeckCardIdentity`, `commander:` on decks, `setCommander`, `addCard(` and `removeCard(` on `DeckService`: there must be no hits (depends on T002, T006).
- [X] T009 Route and shell:
  - In `src/app/app.routes.ts`, add `export const deckMatcher` (it matches `['decks']` → `{ consumed }` and `['decks', ref]` → `{ consumed, posParams: { ref } }`), and replace the `decks` and `decks/:id` routes with `{ matcher: deckMatcher, component: DeckArea, ...gated }`.
  - Create a skeleton `src/app/views/deck-area/deck-area.ts` (+ `.html`/`.scss`/`.spec.ts`): OnPush, `readonly ref = input<string>()`, rendering just the `h1` "Decks" for now.
  - Update `app.routes.spec.ts`: the matcher accepts `/decks` and `/decks/x`, rejects `/decks/x/y`, and both are gated.
  - In `src/app/core/utils/entry-copy.ts`, add `SHELL.decks = 'Decks'`. In `src/app/shared/layout/nav-links/nav-destinations.ts`, insert `{ label: SHELL.decks, path: '/decks' }` between Coleção and Modos de jogo. Update any nav spec that counts destinations (depends on T008).
- [X] T010 Checkpoint: run the full suite and lint through `test-runner`, and fix everything before Phase 3. Then commit Phase 2.

**Checkpoint**: The app compiles on the new `Deck`; `/decks` and `/decks/{id}` render the skeleton behind the profile gate; the side nav shows "Decks".

---

## Phase 3: User Story 1 - See my decks (Priority: P1) 🎯 MVP

**Goal**: The deck area lists the profile's decks as sleeved-card fans in alphabetical order, shows the empty state, opens a header-only deck page, and turns the page (with dust) between them for the exits FR-018 names.

**Independent Test**: Seed several decks in a profile, open "Decks", and check the order, fans, names and formats. Open one: the page turns, the header shows name and format, and back turns it back. Reload on a deck (instant). Open a bad id (redirect). With reduced motion, everything swaps instantly. With no decks, the empty state shows.

- [X] T011 [P] [US1] Create `src/app/shared/decks/deck-fan/deck-fan.ts` (+ `.scss`/`.spec.ts`). It's an `aria-hidden` stage of three sleeves plus the front sleeve's 244×340 card window, per DESIGN.md "Decks" (T001), with an input `scale = input(1)` applied as one `transform: scale()` inside a host box sized `320*scale × 392*scale`.
  - The window renders only the placeholder in this slice: `.micro-label` `DECK.featuredLabel` over the 0.75rem muted `DECK.featuredHint`. Leave a one-line comment that a later image goes here with `object-fit: contain`, whole image only (FR-017).
  - The hover lift is driven by a host class the tile sets (`.is-lifted`), and disabled under reduced motion.
  - Spec: renders three sleeves and the placeholder copy; the host size follows `scale`.
- [X] T012 [P] [US1] Create `src/app/core/utils/deck-turn.util.ts` (research R8): `type DeckPlace = { kind: 'list' } | { kind: 'deck'; id: string }`, `samePlace(a, b)`, and `turnFor(from, to, nav)`, which returns `'open' | 'close' | null`:
  - `from === null` or `samePlace(from, to)` → `null`;
  - list → deck: `'open'` only if `(nav.info as { deckTurn?: boolean })?.deckTurn === true`;
  - deck → list: `'close'` unless `nav.replaceUrl === true` or `deckTurn === false`;
  - deck → another deck → `null`.

  Spec: one test per row of the research R8 table (tile, browser forward `popstate`, typed/first load, back link, side nav, `popstate` back, delete landing, `replaceUrl` redirect).
- [X] T013 [P] [US1] Create `src/app/core/utils/deck-dust.util.ts` (research R10), pure and taking an injected `random: () => number`, with constants verbatim from the handoff README "Dust":
  - `interface Speck { x; y; r; color; seed; kx; ky; a; fadeDelay; fadeMs; alphaAtSettle }`.
  - `makeSpecks(count, w, h, colors, random)`: random positions; `r = 0.45 + random() ** 2.2 * 1.1`; colors cycling through `colors`.
  - `edgeX(theta, w, perspective, off)` = `off + w/2 + (w*cos θ − w/2) * P / (P + w*sin θ)`.
  - `stepSpeck(s, { t, edgeX, vex, w, turning })`:
    - push (only while turning) with σ = `30 * (w/300) ** 0.6`, jitter 0.6–1.4 drawn at creation via `seed`;
    - swirl proportional to `min(1, |k|)`;
    - clamp |k| to `3.5 * sqrt(w/300)`, damping 0.95;
    - ambient ±0.003 sin/cos plus 0.002 gravity, damping 0.955;
    - alpha target `clamp((|k| − 0.12) / (1.1 * sqrt(w/300)), 0, 1)` while turning, rising 0.3 and falling 0.04 per frame.
  - `settleSchedule(specks, random)`: `fadeDelay = random() * 600` and `fadeMs = 600 + random() * 800`, recording `alphaAtSettle = s.a`.
  - `settledAlpha(s, ms)`: `alphaAtSettle` until `fadeDelay`, then linear to 0 over `fadeMs`.

  Spec (seeded random): a speck far from the edge with no push stays at alpha 0; a speck at the edge while turning gains alpha; after `settleSchedule` every speck's `settledAlpha(s, 2000) === 0`, and fades end at different times.
- [X] T014 [US1] Create `src/app/views/deck-area/deck-turn.ts`: `@Injectable()`, provided by `DeckArea` (research R9, R10).
  - **State**: signals `shown: DeckPlace` and `turning: 'open' | 'close' | null`. `phone` and `reducedMotion` come from `mediaQuerySignal(MOBILE_QUERY | REDUCED_MOTION_QUERY)`.
  - **Navigation capture**: subscribe to `Router.events`. On `NavigationStart`, store `{ trigger: e.navigationTrigger, info: router.currentNavigation()?.extras.info, replaceUrl: router.currentNavigation()?.extras.replaceUrl }` as `lastNav`.
  - **`go(to)`**:
    - The first call sets `shown` with no turn.
    - Otherwise `dir = turnFor(shown(), to, lastNav)`. With `null` or reduced motion, it sets `shown` instantly.
    - `'open'`: set `shown = to` (the deck renders underneath) and `turning = 'open'`.
    - `'close'`: set `turning = 'close'` and keep `shown` on the deck until the end.
    - After 1300 ms (a `setTimeout`, not `transitionend`), clear `turning` and, on close, set `shown = to`.
    - A `go()` during a turn finishes the current one instantly first.
  - **Dust**: `attachCanvas(canvas: HTMLCanvasElement, host: HTMLElement)`.
    - While turning and until settled, it runs one rAF loop: it sizes the canvas to `host` × `devicePixelRatio`, pre-renders one sprite per color (parchment read from `getComputedStyle(host).getPropertyValue('--color-text')`), and creates `makeSpecks(phone ? 110 : 260, …)` at turn start.
    - Each frame derives θ from elapsed/1300 with the DS easing `cubic-bezier(0.4,0,0.2,1)` (open 0 → π, close π → 0) and calls `edgeX`, `vex` and `stepSpeck`.
    - At turn end it calls `settleSchedule` and draws with `settledAlpha`. When all specks are 0 (≤ 2000 ms), it clears the canvas and cancels the loop.
  - **Cleanup**: all timers and rAF are cancelled on `DestroyRef`.

  Add `deck-turn.spec.ts` (fake timers, stubbed rAF and canvas context): first go is instant; tile info opens, then clears after 1300 ms; close keeps the deck shown until 1300 ms; reduced motion is instant; destroy cancels; the loop stops ≤ 2000 ms after settle.
- [X] T015 [US1] Create `src/app/shared/decks/deck-tile/deck-tile.ts` (+ `.scss`/`.spec.ts`): an `<a>` with `[routerLink]="['/decks', deck().id]"`, `[info]="{ deckTurn: true }"` and `[attr.aria-label]="DECK.tileLabel(name, formatName)"`, containing `app-deck-fan` (`scale` 0.75 when not on phone, 1 on phone, via `MOBILE_QUERY`) and the caption (name 700 wrapping with `overflow-wrap: anywhere`; the format name from `DECK.formats[formatOf(deck().format)].name`, 0.875rem muted), both `aria-hidden`.
  - Hover and focus-visible set `.is-lifted` on the fan. The focus outline is `2px solid var(--role-accent)`, offset 2px.
  - The host uses `content-visibility: auto` with `contain-intrinsic-size` matching the scaled stage plus caption (SC-002).
  - Spec: the link target and info, the accessible name "Krenko goblins, Commander", the format name shown.
- [X] T016 [US1] Build `src/app/views/deck-area/deck-area.ts|html|scss` (ui.md §2–§4, §6), replacing the T009 skeleton. It provides `DeckTurn`.
  - **Routing**: `routed = computed<DeckPlace>` from `ref` (undefined → list, else deck). `missing = computed` is true when a deck ref isn't in `DeckService.byId()`.
    - An effect calls `turn.go(routed())` once per new place, skipping while `missing`.
    - A second effect redirects a missing deck to `/decks` with `replaceUrl: true` (FR-005, Edge Cases).
  - **List place** (1080px column):
    - a header with the `h1` `DECK.title` (`tabindex="-1"`, `#heading`) and, when not on phone, a primary `DECK.newDeck` button (wired in T021);
    - a grid of `app-deck-tile` over `DeckService.sorted()`, 4 columns with 32px row / 24px column gap, one centered column on phone;
    - on phone, `app-create-row` with label `DECK.createRow` after the last tile (wired in T021);
    - when there are no decks, the empty section (eyebrow, `h2` with the title glow, muted body, primary `DECK.emptyCta`), with no header button and no create row.
  - **Deck place** (760px column): the `.link-btn` `DECK.back` with `routerLink="/decks"`, then the row with the `h1` name (2xl, glow, `text-wrap: balance`, `tabindex="-1"`) over the muted format, and "Editar" (secondary) and "Excluir" (danger), dropping to a full-width 50/50 row on phone (wired in T021/T025). Nothing below the header (FR-005).
    - The header reads a `shownDeck` `linkedSignal` that follows `DeckService.byId()` for the routed id but keeps its last value when the deck leaves the signal. A pending delete (T023 removes the deck before the write commits) or a sync removal before the redirect then never blanks the header or throws.
  - **Turn layer**:
    - While `turn.turning()` is set, render the deck place for the deck id underneath, and the list place inside a `.page` layer with `.page__front` (the list) and `.page__back` (flat `surface`, 1px `border` left edge).
    - The host has `perspective: 2800px` (1100px on phone) and `[inert]="!!turn.turning()"`.
    - The `.page` transitions `transform` over 1300ms with the standard easing: `rotateY(0)` ↔ `rotateY(-180deg)`, starting from the right end for close. Use a one-frame `entering` flag, like `CollectionTransition`, so the transition runs.
    - Offset the layer by the `<main>` scrollTop captured at turn start, then scroll `<main>` to 0.
  - **Canvas**: a `<canvas aria-hidden="true">` absolutely covering the host, `pointer-events: none`, passed to `turn.attachCanvas` after render. It's never rendered under reduced motion.
  - **Focus**: after each change of `turn.shown()` or the end of a turn (not the first render), focus `#heading` via `afterNextRender`.
  - **Color**: no `data-theme-scope` and no wash on the deck place (research R13).

  Spec (`deck-area.spec.ts`, fake timers): the sorted tiles; the empty state with no decks; the deck page shows name and format and nothing else; an unknown id redirects with `replaceUrl`; a tile navigation sets `inert` during 1300 ms and then removes it; under reduced motion there's no `.page` layer and no canvas; the heading is focused after a swap (depends on T011–T015).
- [X] T017 [US1] Checkpoint: run the full suite through `test-runner`, then run the `design-auditor` agent on T011–T016 and fix what it reports. Then commit Phase 3.

**Checkpoint**: With seeded decks, the list, the empty state, the deck page, the redirect and the page turn with dust all work, and reduced motion swaps instantly.

---

## Phase 4: User Story 2 - Create and edit a deck (Priority: P1)

**Goal**: Create a deck from the deck area (name plus a format, Commander preselected) and edit its name and format from its page, offline, with the format's rules summary shown in the form.

**Independent Test**: Offline, create "Krenko goblins" keeping Commander; check the rules plate and that picking Vintage updates it at once; see the tile. Try an empty, 41-character and "krênko GOBLINS" name. Edit the name and format on the deck page, reload, and check persistence.

- [X] T018 [P] [US2] Add `create` and `update` to `src/app/core/services/deck.service.ts` (contracts/services.md):
  - `create({ name, format })` runs `validateDeckName(name, decks())`. On error it returns `{ ok: false, error }` and writes nothing. Otherwise it builds `{ id: crypto.randomUUID(), name: name.trim(), format, updatedAt: new Date().toISOString() }`, appends it to the signal, bumps `changeCount`, and enqueues `writeRows([{ store: 'decks', put }], handle)`.
  - `update(id, { name?, format? })` returns `'not-found'` for an unknown id. It validates only when the trimmed name differs from the current one (excluding `id`), then writes one row with a fresh `updatedAt` and bumps `changeCount`.

  Extend `deck.service.spec.ts`: create persists across a reload; the three errors write nothing; a rename writes exactly one `decks` row; an unchanged-name update with a new format succeeds; accent-duplicate → taken.
- [X] T019 [P] [US2] Create `src/app/shared/decks/format-picker/format-picker.ts` (+ `.scss`/`.spec.ts`):
  - It's a `model<DeckFormatId>('commander')`-driven `role="radiogroup"` with `aria-labelledby` pointing to its own label "Formato · {DECK.formats[value].name}" (`DECK.formatLabel`).
  - It has 8 `button role="radio"` items in `DECK_FORMATS` order, with `aria-checked` and roving `tabindex` (0 on the selected one). ArrowRight/Down move to the next and ArrowLeft/Up to the previous, wrapping and selecting; Home/End go to the ends. The grid is 4 columns, 2 at ≤ 640px, with 44px minimum targets and the selected style from DESIGN.md (T001).
  - Below it, a `.plate` with `aria-live="polite"` renders the selected format's `rules` as a list (FR-016). It's information only and never disables anything.
  - Spec: all 8 render in order; clicking or pressing an arrow changes the value and the plate text immediately; Home/End; only the selected radio is tabbable.
- [X] T020 [US2] Create `src/app/shared/decks/deck-form-dialog/deck-form-dialog.ts|html|scss` (+ spec), modelled on `collection-form-dialog`, inside `app-compact-modal` (`[roles]` from `IdentityService.roles`, `labelledBy` the title id):
  - **Inputs and outputs**: `mode: 'create' | 'edit'`, `deckId?`, then `closed` and `saved(Deck)`.
  - **Title**: `DECK.formTitles` by mode.
  - **Name field** (`.field`, `[data-autofocus]`): label `DECK.nameLabel`, a right-aligned `n/40` counter (tabular numbers, danger when over 40), and the helper `DECK.nameHelper` replaced by the `.field__error` text on error, with `aria-invalid` and `aria-describedby` pointing to the helper or error and the counter.
  - **`app-format-picker`** bound to a `linkedSignal` of the editing deck's format, or `DEFAULT_FORMAT` (FR-003).
  - **Actions**: `DECK.verbs.cancel` (ghost) and `DECK.verbs.create` or `DECK.verbs.save` (primary). Submit calls `DeckService.create`/`update` and maps `'empty' | 'too-long' | 'taken'` to `DECK.errEmpty | errLong | errTaken`. The error clears on the next input; `'not-found'` just closes.
  - Spec: Commander is preselected on create; the three errors show the exact PT-BR text; the error clears on input; edit prefills name and format; save emits `saved` (depends on T018, T019).
- [X] T021 [US2] Wire create and edit into `src/app/views/deck-area/deck-area.ts|html`:
  - a `form = signal<{ mode: 'create' | 'edit'; deckId?: string } | null>(null)`;
  - the header "Novo deck", the phone create row and the empty-state "Criar deck" open `{ mode: 'create' }`, and the deck page's "Editar" opens `{ mode: 'edit', deckId }`;
  - render `@if (form(); as f) { <app-deck-form-dialog … (closed)="form.set(null)" (saved)="form.set(null)" /> }`. The person stays on the current place after either.

  Extend `deck-area.spec.ts`: creating from the empty state shows the tile; editing on the deck page updates the header; there's no navigation (depends on T020).
- [X] T022 [US2] Update `src/app/core/services/entity-load-isolation.spec.ts` to create decks through `DeckService.create` now that it exists (replacing the T008 seed). Checkpoint: run the full suite through `test-runner`, then `design-auditor` on T019–T021, and fix what it reports. Then commit Phase 4.

**Checkpoint**: A person can build their deck list offline. US1 plus US2 is the MVP.

---

## Phase 5: User Story 3 - Delete a deck (Priority: P2)

**Goal**: Delete a deck from its page after a confirmation. Its cards go to the holding box, all-or-nothing, and a toast confirms it.

**Independent Test**: Delete a deck (confirm → the list plus a toast; cancel → nothing). With a card seeded with that deck's id, the delete dialog and toast mention it and the card appears in the collection area's holding box with its fields unchanged. While the delete runs, Esc, ✕ and the backdrop do nothing.

- [X] T023 [P] [US3] Add `remove(id): Promise<{ cards: number }>` to `src/app/core/services/deck.service.ts` (FR-009, research R1):
  - an unknown id resolves `{ cards: 0 }` and writes nothing;
  - otherwise it captures `cards = cardCount(id)`, removes the deck from the signal, bumps `changeCount`, and enqueues **one** `writeRows([{ store: 'decks', delete: id }, { store: 'tombstones', put: { key: 'decks:' + id, entity: 'decks', id, deletedAt } }], handle)`. It resolves `{ cards }` on commit and rejects on failure. It writes **no card row**.

  Extend `deck.service.spec.ts`: the row and tombstone are written together; a failing transaction leaves both unwritten; a seeded card with `locationId === id` is unchanged in IndexedDB and now counts in `CollectionService.stats().holding.cards` (SC-004).
- [X] T024 [P] [US3] Create `src/app/shared/decks/deck-delete-dialog/deck-delete-dialog.ts|html|scss` (+ spec), modelled on `collection-delete-dialog` without the radios:
  - **Inputs and outputs**: `deckId`, then `closed` and `deleted({ name: string; cards: number })`.
  - On init it snapshots `{ name, cards: DeckService.cardCount(id) }`.
  - **Title**: `DECK.deleteTitle(name)`. **Body**: `DECK.deleteWithCards(cards)` when `cards > 0`, else `DECK.deleteNoCards`.
  - **Actions**: `DECK.verbs.cancel` (ghost) and `DECK.deleteVerb` (danger).
  - Confirm sets `busy`: the label becomes `DECK.deleting`, both actions are `aria-disabled`, and `app-compact-modal` gets `[locked]="busy()"` (Esc, backdrop and ✕ are ignored). It awaits `DeckService.remove`, emits `deleted`, and on error clears `busy`.
  - Spec: both bodies' text; the lock while pending; a second confirm is ignored; the emitted payload (depends on T023).
- [X] T025 [US3] Wire delete into `src/app/views/deck-area/deck-area.ts|html`:
  - "Excluir" opens `del = signal<string | null>`.
  - `onDeleted({ name, cards })` awaits `router.navigate(['/decks'], { info: { deckTurn: false } })` (no turn, research R8), then clears `del` and calls `ToastService.show(DECK.toastLabel, cards > 0 ? DECK.toastMoved(name, cards) : DECK.toastDeleted(name))`.
  - The missing-deck redirect effect must not fire while the delete is running or its navigation is in flight: skip it while `del()` is set, as `CollectionArea` does with its subtree. Because `del` is cleared only after the navigation lands, exactly one navigation happens.

  Extend `deck-area.spec.ts`: a confirmed delete lands on `/decks` with no `.page` layer, through exactly one navigation (no `replaceUrl` redirect), and the toast text matches; while the delete is pending, the header still shows the deck's name and format; cancel keeps the deck (depends on T024).
- [X] T026 [US3] Checkpoint: run the full suite through `test-runner`, then `design-auditor` on T024–T025, and fix what it reports. Then commit Phase 5.

**Checkpoint**: Delete is complete. A deck's cards (seeded) land in the holding box, and nothing else changes.

---

## Phase 6: User Story 4 - Decks sync with the linked cloud account (Priority: P3)

**Goal**: A linked profile's decks reach its account only on sync, in both directions, with last-write-wins, deletions that don't come back, and duplicate names renamed "Nome (2)".

**Independent Test**: The two-device steps in quickstart.md scenario 12, plus unit coverage of `syncDecks` against a mocked client.

- [X] T027 [US4] Apply migration `009_decks` exactly as in contracts/supabase.md through the Supabase MCP `apply_migration` (project `hyzbkxraanzhdyhtnadf`). It has `name text not null check (char_length(name) between 1 and 40)`, `format` checked in the 8 ids, `updated_at timestamptz not null default now()`, primary key `(user_id, id)`, the four owner-only policies, and `grant select, insert, update, delete on public.decks to authenticated`. Then run `get_advisors` (security) and fix any finding on `decks`. **Confirm with the user before applying**: it changes the live project.
- [X] T028 [P] [US4] Add `repairDeckNames(merged, remoteIds, now)` to `src/app/core/utils/deck.util.ts` (research R6):
  - Group by `normalizeDeckName`. In each group of 2+, the single member in `remoteIds` survives unchanged; otherwise the lowest id survives.
  - Every other member, in id order, takes the lowest free `suffixedName(base, k)` (`k ≥ 2`, imported from `collection-tree.util`), checked against all used normalized names and stamped `updatedAt: now`.
  - It returns `{ decks, renamed }`.

  Extend `deck.util.spec.ts`: the remote member keeps the name; the local one becomes "Elfos (2)"; three duplicates → (2), (3); an existing "Elfos (2)" is skipped → (3); a 40-character base is cut to fit; no duplicates → no renames.
- [X] T029 [US4] In `src/app/core/services/sync.service.ts`, add `syncDecks(client, run)`, mirroring `syncCollections`:
  - `interface DeckRow { id; user_id; name; format; updated_at }`, `deckToRow` (ISO `updated_at`), and `deckFromRow` (`format: formatOf(row.format)`, `updatedAt: new Date(row.updated_at).toISOString()`).
  - Select `'id, user_id, name, format, updated_at'` filtered by `user_id`, with the abort signal, then `ensureCurrent`.
  - Run `reconcileEntities(decks.decks(), remote, await decks.getTombstones())`, then `repairDeckNames(result.merged, remoteIds, new Date().toISOString())`, and merge the renamed rows into `toUpsertRemote` (replacing any entry with the same id).
  - Upsert with `{ onConflict: 'user_id,id' }`, then delete `toDeleteRemoteIds` with `.eq('user_id', uid).in('id', ids)`, throwing on error.
  - `ensureCurrent`, then `decks.applySyncResult(repair.decks)` and `decks.clearTombstones(result.tombstonesToClear)`.
  - Call it in `exchange` after `syncCollections` and before `syncCards`, and add `this.decks.flush()` to the pre-sync flush.
  - Replace "Decks never sync" in the class comment with the deck step.

  Extend `sync.service.spec.ts` (mocked client): a local deck is upserted; a remote deck is applied; a tombstoned deck is deleted remotely and its tombstone cleared; a remote-newer edit wins; a local edit newer than a remote deletion keeps the deck, and a remote deletion newer than a local edit removes it (spec Edge Cases); a duplicate is renamed and uploaded; an upsert error on `decks` ends the sync in the same failure state as a collections error, with no raw Supabase text reaching the UI (FR-014); the step order is collections → decks → cards (depends on T028).
- [X] T030 [P] [US4] In `src/app/core/utils/sync-status.util.ts`, add `decks: { updatedAt: string }[]` to the `hasUnsyncedChanges` input, counted like `collections`, and remove "Decks never sync, so they never count." from its comment.
  - In `src/app/shared/auth/profile-modal/profile-flow.store.ts`, pass `DeckService.decks()` and include `DeckService.getTombstones()` in the tombstone count. Remove `decksNote`.
  - In `src/app/shared/auth/profile-modal/delete-profile-step/delete-profile-step.ts`, remove its `@if (store.decksNote())` block.
  - In `src/app/core/utils/entry-copy.ts`, remove `decksNote`.
  - Update `sync-status.util.spec.ts` (a newer deck → true, an older one → false) and `profile-flow.store.spec.ts` (drop the `decksNote` cases; a deck tombstone counts as unsynced).
- [X] T031 [US4] Checkpoint: run the full suite and lint through `test-runner`, and fix everything. Then commit Phase 6.

**Checkpoint**: Decks sync like collections; profiles without a linked account send nothing.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T032 Update `.claude/docs/architecture.md` with plan.md "Docs to update", after showing the user the proposed edit (CLAUDE.md "Maintaining these files"):
  - "Domain model": the new `Deck` (name, format id, `updatedAt`) replaces the `Deck`/`DeckCard` entry, and a deck id in `CardEntry.locationId` places a card in a deck; the holding box is cards matching no collection and no deck;
  - "Sync": decks sync through `decks` with tombstones and the duplicate rename; remove "Not extended to decks…" and the `DeckCardIdentity` sentence;
  - "Routing": the deck area is one matcher route (`deckMatcher`), like the collection area.
- [ ] T033 Run the `design-auditor` agent over every new or changed `.html`/`.scss`/component `.ts` (T011, T015, T016, T019–T021, T024, T025, nav links) against `DESIGN.md` and `ui.md`, and fix what it reports.
- [ ] T034 Run the full suite and lint through `test-runner` (`npm test`, `npm run lint`), and fix any failure or unused import left by the deletions (T008) or the removed `decksNote`.
- [ ] T035 Walk quickstart.md scenarios 1–11 on the running dev server (the user runs `npm start`), including 320px and 390px widths, reduced motion, and a 200-deck seed for SC-002. In scenario 2, count the interactions after typing the name (at most 3, SC-001). Scenario 12 (two devices) goes to the user. Record any deviation. Then commit Phase 7.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: needs T000. T002 and T003 can run in parallel. T001 is independent but needs the user's OK on the format rules before the UI tasks.
- **Foundational (Phase 2)**: needs T002.
  - T004 and T005 can run in parallel.
  - T006 needs T004 and T005.
  - T007 and T008 need T006.
  - T009 needs T008, and T010 closes the phase.
  - The tree compiles again only at T010, so per-task runs inside the phase use single-spec `--include`.
- **US1 (Phase 3)**: needs Phase 2, T001 (DESIGN.md) and T003 (copy).
- **US2 (Phase 4)**: needs US1's view (T016). T018 and T019 can start as soon as Phase 2 is done.
- **US3 (Phase 5)**: needs US1's view (T016). T023 can start as soon as Phase 2 is done. It's independent of US2 except for sharing `deck-area.ts` (run T021 before T025).
- **US4 (Phase 6)**: needs Phase 2 only. It touches no UI files except the profile modal (T030), so it can run in parallel with US1–US3.
- **Polish (Phase 7)**: after all stories.

### Within Each Story

Utils → service → components → view wiring → view spec → checkpoint (`test-runner` + `design-auditor`).

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003, with T001 alongside.
- **Phase 2**: T004 ∥ T005.
- **US1**: T011 ∥ T012 ∥ T013, then T014 and T015, then T016.
- **US2**: T018 ∥ T019.
- **US3**: T023 ∥ T024 (the dialog spec stubs `DeckService.remove` until T023 lands).
- **US4**: T028 ∥ T030; T027 whenever the user approves.

---

## Parallel Example: User Story 1

```text
Task: "T011 [US1] deck-fan in src/app/shared/decks/deck-fan/"
Task: "T012 [US1] turnFor in src/app/core/utils/deck-turn.util.ts"
Task: "T013 [US1] dust physics in src/app/core/utils/deck-dust.util.ts"
```

## Parallel Example: User Story 2

```text
Task: "T018 [US2] create/update in src/app/core/services/deck.service.ts"
Task: "T019 [US2] format-picker in src/app/shared/decks/format-picker/"
```

## Parallel Example: User Story 4

```text
Task: "T028 [US4] repairDeckNames in src/app/core/utils/deck.util.ts"
Task: "T030 [US4] hasUnsyncedChanges + profile modal in src/app/core/utils/sync-status.util.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Phase 1 → Phase 2. The app compiles on the new `Deck`, the old deck stack is gone, and "Decks" is in the nav.
2. US1: the list, empty state, deck page and page turn (a read path over seeded data).
3. US2: create and edit with the format picker. **Stop and validate**: a person can build their deck list offline.

### Incremental Delivery

4. US3: delete, with the holding-box rule for (seeded) cards.
5. US4: cloud sync. This can run in parallel from Phase 2 on.
6. Polish: docs, design audit, full suite, the quickstart walk.

---

## Notes

- Quote the constraints exactly as given: names are "1–40 characters after trimming", "unique among the profile's decks ignoring case, accents and surrounding spaces"; the format is one of `commander | pauper | modern | standard | pioneer | legacy | vintage | casual`, defaulting to Commander; the record is "own identity, name, format and change time only".
- `DeckService` never calls `replaceStore`. Every write is `writeRows` with the handle captured at call time.
- A deck delete never writes a card row (research R1). Any card write in that path is a bug.
- The page turn plays only for the research R8 table. Any other navigation, and reduced motion, swaps instantly. The dust canvas must be cleared and its loop stopped ≤ 2 s after settle.
- The deck page never sets a theme scope or wash (R13).
- Card images (later) are never cropped, masked or altered (FR-017).
- Work on `feature/009-decks-foundation` from T000. Commit once per phase, in its checkpoint task, only after its checks pass: never per task, never one commit for the whole feature.
