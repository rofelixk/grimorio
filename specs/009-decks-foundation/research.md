# Research: Decks Foundation

**Feature**: `009-decks-foundation`. Inputs: [spec.md](spec.md), the design handoff in `design_handoff_decks_foundation/` (hi-fi `Decks Hi-fi.dc.html` and its README), and the spec 008 code this feature builds on (`CollectionService`, `writeRows`, `repairCollectionTree`, `CompactModal`, `CreateRow`, `ToastService`).

No NEEDS CLARIFICATION remained in the Technical Context. Each section below is one decision.

## R1. A deck is a card location, and the holding box excludes deck ids

**Decision**: a card placed in a deck (a later spec) will carry the deck's id in its existing `locationId`. The holding box becomes "every card whose `locationId` matches no collection **and no deck**". `computeStats` takes the set of deck ids and skips those cards: they're counted neither in a collection nor in the holding box. `DeckService` derives each deck's copy count from the same field.

Deleting a deck therefore writes **no card**: the deck row goes, the cards' `locationId` now matches nothing, and they are holding-box cards. This is spec 008's R1 applied to decks.

**Rationale**:
- FR-009 needs the delete to be all-or-nothing, and a card pointing at a deleted deck must count as a holding-box card. A dangling reference gives both by construction: there's no card write to interrupt.
- "A card in a deck is not a holding-box card" (spec Assumptions) holds as soon as the derivation knows the deck ids.
- Nothing changes on `CardEntry`, locally or in the cloud (`card_entries.location_id` has no FK since spec 008).

**Alternatives considered**:
- A separate `deckId` field on `CardEntry`: two location fields that can disagree, which breaks "where is this card, right now" (Constitution I).
- Rewriting the deck's cards to a holding-box id on delete: a card write per copy, and a transaction that can fail halfway.

In this slice decks hold no cards, so the rule is exercised by specs that seed cards with a deck id.

## R2. The deck record and the format list

**Decision**: `Deck = { id, name, format, updatedAt }`.
- `format` is a `DeckFormatId`: `'commander' | 'pauper' | 'modern' | 'standard' | 'pioneer' | 'legacy' | 'vintage' | 'casual'`.
- `DECK_FORMATS` (in `deck.model.ts`) lists the ids in the FR-003 order, and `DEFAULT_FORMAT = 'commander'`.
- Display names and rule bullets are copy: they live in `core/utils/deck-copy.ts` (`DECK.formats[id] = { name, rules: string[] }`), verbatim from the handoff.
- An unknown stored format (the cloud column is checked, but a future spec could add ids) falls back to `'casual'` via `formatOf(id)`.

**Rationale**: FR-011 (small record, no card data, no counts). Ids are stable and language-free, and the names are shown as players say them (spec Assumptions).

**Alternatives considered**: storing the display name. Renaming a label would then need a data change.

The featured card and deck colors (handoff `featuredCardId?`, `identity?[]`) are **not** stored. They come with the deck-cards spec (spec Assumptions).

## R3. Local storage: profile DB v3, per-row writes

**Decision**:
- `profile-db.ts` goes to version 3. The upgrade deletes and recreates the `decks` store when `oldVersion < 3`, which drops the old records (FR-013: dropped, not migrated).
- `TombstoneEntity` gains `'decks'`, and `RowOp`/`EntityStoreName` gain the `decks` store.
- `DeckService` persists like `CollectionService`: `writeRows` per-row puts and deletes, plus tombstones in the same transaction, through its own serialized queue with a captured handle.

**Rationale**: this is Constitution VI, using the per-row variant spec 008 already justified (small writes, one transaction). A rename writes one row.

**Alternatives considered**: `replaceStore`, which the old `DeckService` used. It rewrites every deck on each change, and its tombstone write would be a separate transaction.

## R4. Name rules: trimmed, 1–40 characters, unique ignoring case and accents

**Decision**:
- `normalizeDeckName(name)` = trim → `normalize('NFD')` → strip `\p{M}` → `toLocaleLowerCase('pt-BR')`.
- `validateDeckName(name, decks, selfId?)` returns `'empty' | 'too-long' | 'taken' | null`, with the length counted on the trimmed string. The limit is the shared `MAX_NAME` (40).
- Order is `localeCompare(…, 'pt-BR', { sensitivity: 'base' })`, with `id` as the tiebreak.

**Rationale**: FR-003 and SC-005, as amended by the handoff ("Krenko" = "krênko").

**Alternatives considered**: reusing `normalizeName` from `collection-tree.util`. It is accent-sensitive by spec 008's R12, and collections keep that rule; this feature doesn't change them.

## R5. Cloud schema: a new `decks` table

**Decision**: migration `009_decks` creates `public.decks (user_id, id, name, format, updated_at)`:
- a composite primary key `(user_id, id)`;
- `name` checked 1–40 characters, and `format` checked against the 8 ids;
- `updated_at timestamptz not null default now()`;
- owner-only RLS (the `"{cmd} own {table}"` policies) and `grant select, insert, update, delete … to authenticated`.

Checked on 2026-09-28: the live project has no deck table (the prototype `decks`/`deck_cards` were already dropped), so nothing is lost. See [contracts/supabase.md](contracts/supabase.md).

**Rationale**: FR-012 and the architecture rule for new tables (grants and RLS in the same migration).

**Alternatives considered**: no format check. A bad value would then silently fall back on every device; the check rejects it at upload instead.

There is no unique-name constraint: duplicates are repaired client-side (R6), as with collections.

## R6. Sync: reconcile, then rename duplicates

**Decision**: `SyncService.syncDecks` runs after `syncCollections` and before `syncCards`:
1. It pulls the rows and reconciles them with `reconcileEntities` against the deck tombstones.
2. `repairDeckNames(merged, remoteIds, now)` renames duplicates. In each group sharing a `normalizeDeckName`, the member already on the remote keeps its name (ties, or none, go to the lowest id). Every other member takes the lowest free `"{base} (k)"` from `suffixedName` (the 40-character-safe helper in `collection-tree.util`), stamped `now`.
3. Renamed rows join the upload set, then the service applies the merged result and clears the tombstones.

`hasUnsyncedChanges` gains `decks`: a deck newer than the last sync, or any deck tombstone, counts. `ProfileFlowStore.decksNote` and the `decksNote` copy ("Decks ainda não vão para a nuvem…") are removed, because decks now sync.

**Rationale**: FR-012 and the "Same-named decks created on two devices" edge case: "the later-synced one is shown as 'Nome (2)'". The rename is an ordinary edit, carried on the next sync.

**Alternatives considered**: a generic dedupe shared with `repairCollectionTree`. That would refactor spec 008's tested repair for a 20-line function; the shared piece that matters (`suffixedName`) is reused.

## R7. One matcher route, so the list and the deck page can coexist

**Decision**: `deckMatcher` matches `/decks` and `/decks/{id}` into one `DeckArea` component (fed `ref` through `withComponentInputBinding`), the same as `collectionMatcher`. Both routes are gated (`profileGuard`, `runGuardsAndResolvers: 'always'`). An unknown id is redirected to `/decks` with `replaceUrl`.

**Rationale**: the page turn (FR-018) needs the list and the deck page in the DOM at the same time. Two routes would destroy the list before the turn starts.

**Alternatives considered**: two routes with router animations. That needs `@angular/animations`, which the project doesn't use, and makes the canvas lifecycle awkward.

## R8. Which navigations turn the page

**Decision**: a `DeckNavigation` reader (inside `DeckTurn`, research R9) captures each navigation's `trigger`, `extras.info` and `extras.replaceUrl` at `NavigationStart`, through `router.currentNavigation()`. When `ref` changes, `DeckArea` asks `turnFor(from, to, nav)`, a pure function in `deck-turn.util.ts`:

| From → to | Turns when |
|---|---|
| list → deck | `info.deckTurn === true`, set only by the deck tile. So browser forward, a typed URL and the first load don't turn. |
| deck → list | always, **except** with `replaceUrl` (the missing-deck redirect) or `info.deckTurn === false` (landing after a delete). That covers the back link, side-nav "Decks" and browser/Android back (`popstate`). |
| anything else | never. The wordmark goes to Home, which destroys the view. |

Reduced motion and the first place shown always swap instantly.

**Rationale**: the clarification (2026-09-28) and FR-018's list of exits. It's pure and table-testable.

**Alternatives considered**: tagging every exit link with `info`. The side nav is a shared shell component that shouldn't know about decks, and `popstate` can't carry `info`.

## R9. The page turn: a CSS 3D transform driven by a view-scoped controller

**Decision**: `DeckTurn` is provided per `DeckArea` instance, like `CollectionTransition`, and exposes these signals:
- `shown` (the place rendered underneath);
- `turning` (`'open' | 'close' | null`);
- `pageUnder` (the list layer, present only while turning).

During a turn:
- The view renders the deck page underneath, plus the list as an absolutely positioned "page" layer on top of it.
- The layer has `transform-origin: 0 50%`, `transform-style: preserve-3d`, and two faces: the list, with `backface-visibility: hidden` on `--color-bg`, and a flat `--color-surface` back with a 1px `--color-border` left edge.
- The view host sets `perspective` (2800px desktop, 1100px at ≤ 640px).
- Open animates `rotateY(0 → -180deg)`; close animates `-180 → 0`, over 1300 ms with the DS easing. The end is found with a timer, not `transitionend`, so a missed event can't strand the turn.
- On close, the list becomes `shown` when the turn ends.

The view is `inert` while turning, so input is ignored (FR-018). The `<main>` scroll is captured: the list layer is offset by its scrollTop, and the main area scrolls to the top under it, so the page lifts from where the person was looking.

**Rationale**: a transform-only animation stays on the compositor. The controller keeps timers and rAF on the view's `DestroyRef` (cancelled on route change or destroy, per the handoff).

**Alternatives considered**: the Web Animations API. It would be equivalent, but a CSS class with one transition is simpler to test with fake timers.

## R10. Dust: pure physics plus a canvas driver

**Decision**:
- `deck-dust.util.ts` holds the math, pure and seeded through an injected `random()`, so it's testable:
  - `makeSpecks(count, w, h, colors, random)`;
  - `edgeX(theta, w, perspective, offset)`, the page edge's screen x;
  - `stepSpeck(s, ctx)`: push, swirl, clamp, damping, ambient drift, and the "visibility = motion" alpha target;
  - `settleSchedule(specks, random)`: each speck gets a random delay of 0–600 ms and a fade of 0.6–1.4 s, so every speck is gone ≤ 2 s after settle.
- `DeckTurn` owns a `<canvas>` overlay over the view: `pointer-events: none`, `aria-hidden`, DPR-scaled. It runs the rAF loop from the turn's start until the last speck fades, then clears the canvas and stops.
- Count: 260 on desktop, 110 at ≤ 640px. Sprites are pre-rendered once per color, as the handoff's soft core → color → transparent sprite at 5× radius.
- Color: while decks have no identity, a single parchment color read from `--color-text` via `getComputedStyle`. Later specs pass the deck's identity colors.
- Reduced motion creates no canvas at all.

**Rationale**: FR-018 ("settles and fades within about 2 seconds, leaving nothing behind") and the handoff's "Settle (change vs. prototype)". A pure step function makes the ≤ 2 s bound a unit test.

**Alternatives considered**:
- DOM particles like spec 008's orbs: 260 elements animated per frame is too heavy on phones.
- Adapting the prototype's code directly: it's React-in-HTML with a global fade.

## R11. Deck fan and tile

**Decision**: `app-deck-tile` (`shared/decks/deck-tile/`) is one `<a [routerLink]>` carrying `info: { deckTurn: true }`, with `aria-label="{nome}, {formato}"`. Inside it:
- **The fan stage**: three sleeves, each a `div` with fixed geometry. The front sleeve holds the 244 × 340 card window.
- **The featured-card slot**: an `@if` over a future image input. In this slice it always renders the placeholder ("Carta em destaque" / "Chega com as cartas do deck."). A later image uses `object-fit: contain` inside the window, and only the whole image may be translated or scaled (FR-017).
- **The caption**: the name (wraps, `overflow-wrap: anywhere`) and the format.

On desktop the stage renders at 0.75 scale as one transform, inside a box reserved at the scaled size (240 × 294), so the grid measures correctly. On mobile it renders at 1.0 in one column.

The list grid uses `content-visibility: auto` on tiles, so 200 decks render under the SC-002 budget.

**Rationale**: FR-004 and FR-017, at the handoff's hi-fi geometry.

**Alternatives considered**: `zoom`. It's inconsistent across WebViews for 3D children.

## R12. Dialogs reuse spec 008's shells

**Decision**:
- `deck-form-dialog` and `deck-delete-dialog` live in `shared/decks/`, inside `CompactModal` (the `locked` input while deleting).
- The format picker (`shared/decks/format-picker/`) is a `role="radiogroup"` of 8 `role="radio"` buttons, 4 columns on desktop and 2 at ≤ 640px, with roving tabindex and arrow keys. The rules plate below it reads from `DECK.formats[id].rules`.
- The phone create row reuses `CreateRow` from `shared/collections/`, imported by deep path.
- The toast uses `ToastService.show(DECK.toastLabel, …)`, which stays at the app-wide **5 s** from DESIGN.md "Toast", not the prototype's 6 s. One toast system, one timing.
- Delete follows the collection pattern: a snapshot on open, `busy` locks the dialog, and `DeckService.remove()` resolves with the card count. `DeckArea` then navigates to `/decks` with `info: { deckTurn: false }` and shows the toast.

**Rationale**: FR-015 ("reusing the collection area's patterns"), plus FR-007, FR-008 and FR-016.

## R13. The deck page keeps the profile's colors

**Decision**: the deck page sets no `data-theme-scope` and no role override. A deck's colors appear only in the dust canvas (FR-018). This needs no code; it's recorded so tasks don't add a wash.

## R14. Legacy removal

**Decision**: delete these and don't keep compatibility:
- **Views**: `views/decks`, `views/deck-detail`.
- **Shared**: `decks/deck-list`, `cards/deck-card-list`, `cards/card-picker`, `cards/color-identity` (their only users were the deck views).
- **Model**: the old `Deck`, `DeckCard` and `DeckCardIdentity` in `deck.model.ts` (rewritten).
- **Service**: the old `DeckService` body (rewritten).

`AddCardModal` stays for the card spec, as spec 008 kept it. It loses its `'deck'` context, `deckId`, the `filter` input and `toIdentity`, which are the only `DeckService`/`DeckCardIdentity` uses left. It becomes collection-only and is still mounted nowhere.

The `shared/index.ts` barrel drops the deleted exports. `entity-load-isolation.spec.ts` uses the new `DeckService.create`.

architecture.md mentions `DeckCardIdentity` in the "Sync" paragraph and the old `Deck`/`DeckCard` entry in "Domain model". Both are updated after implementation (plan, "Docs to update").

## R15. Copy

**Decision**: every string is verbatim from the handoff, in `core/utils/deck-copy.ts` (`DECK`), like `collection-copy.ts`. Counts use the existing `formatCount`/`plural` from `collection-copy.ts`.

The format rules are shipped as the handoff gives them. The handoff flags them for product review before they enter DESIGN.md: they go into DESIGN.md with the rest of the Decks section (FR-015) and are reviewed there, before the UI tasks.

The side nav gains **"Decks"** between "Coleção" and "Modos de jogo" (`NAV_DESTINATIONS`, `SHELL.decks`), matching the handoff shell.
