---

description: "Task list for spec 008: Collections Foundation"
---

# Tasks: Collections Foundation

**Input**: Design documents from `/specs/008-collections-foundation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/services.md, contracts/supabase.md, ui.md, quickstart.md

**Visual source**: `design_handoff_collections_foundation/Colecao.dc.html` (hi-fi) and its `README.md`, which holds every measurement. Recreate it pixel-perfect with the app's primitives.

**Tests**: Included, following the project convention: each new or changed unit gets a colocated `.spec.ts`, and the specs of deleted units go with them. The visual, scale and two-device checks are in quickstart.md.

**Organization**: Tasks are grouped by user story, so each story can be built and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1–US6)

## Path Conventions

This is a single Angular project. Paths are relative to the repo root. The aliases are `@models/*`, `@services/*`, `@utils/*`, `@testing/*` and `@shared/*` (architecture.md). Every component is standalone and OnPush.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The design system entry, the model constants and the copy that every later phase uses.

- [X] T001 Update `DESIGN.md` before any UI is built (Constitution V, FR-026), taking every value from `design_handoff_collections_foundation/README.md`:
  - **(a)** In the front matter `colors:`, add `collection-{id}` for the 16 palette colors (data-model.md table).
  - **(b)** Under "## Colors", add a "### Collection colors" subsection:
    - the table in row order (Row · Name · Hex, Carvão with its `#6b635c` outline and `#8a837e` selected ring);
    - how the palette was chosen (the handoff's three bullets);
    - the rule: "Swatches only, never UI chrome — the Identity Rule still holds. Always name the color in text."
  - **(c)** Under "## Components", add a "### Collections" section:
    - the page column (760px, or 1080px with the 220px aside at ≥ 960px);
    - the collection row (action-row anatomy with a 20px swatch lead, name/meta, the "Abrir" micro label, the meta format and "Vazia", the accessible name "{nome}, cor {Cor}. {meta}.");
    - the dashed create row (phone list end, "Nova subcoleção", "Dividir em subcoleções" with its sub-line);
    - the holding-box tag (10×10 hollow square, bold name, muted count, hover border role-primary);
    - the collection header (24px swatch with a `0 0 16px {hex}66` glow, Editar/Excluir, 50/50 on phone);
    - the path nav (`.link-btn` items separated by a muted "·", never "›", "‹" or "/");
    - the 3 stat plates;
    - the empty-collection choice plates;
    - the empty state;
    - the reserved placeholders (the handoff's "Reserved space" table and rules);
    - the **compact modal** (480px ring with halo, phone full-bleed with a wordmark header, column-reverse buttons);
    - the color picker (5/6/5 honeycomb, rows 1 and 3 indented 24px, 36px swatches, gaps 12px/6px, the selected shadow, 0.5s);
    - the delete radios (18px indicator; move selected = role-primary + `--glow-plate-hover`; delete selected = danger; the delete sub-text in danger; no default).
  - **(d)** Under "## Motion", add the **page transition**: out 140ms `translateX(-dir*8px)`, swap, in 240ms from `dir*12px`, the height lock and release after ~280ms, and the 13 orbs (size, colors, fill, glow, start ranges, `grm-orb` keyframes, dx/dy, 750–1250ms, 0–220ms delay). Reduced motion turns all of it off.
  - **(e)** Under "## Content", add the collection copy bullets: the errors, the delete consequences, the toasts ("Coleção" label).
- [X] T002 [P] Create `src/app/core/models/collection.model.ts` (data-model.md), containing:
  - `CollectionColorId` = `'branco' | 'azul' | 'violeta' | 'vermelho' | 'verde' | 'carvao' | 'nevoa' | 'anil' | 'vinho' | 'ocre' | 'salvia' | 'cinza' | 'turquesa' | 'rosa' | 'laranja' | 'dourado'`;
  - `interface Collection { id: string; name: string; color: CollectionColorId; parentId: string | null; updatedAt: string }`;
  - `COLLECTION_COLORS` as a readonly array of `{ id, name, hex, outline? }` in palette order, with the exact names/hexes from the data-model table (Carvão `outline: '#6b635c'`);
  - `CARVAO_RING = '#8a837e'`, `MAX_NAME = 40`, `MAX_DEPTH = 3`, `HOLDING_REF = 'caixa'`;
  - `type NameError = 'empty' | 'too-long' | 'taken'`, `type CollectionKind = 'empty' | 'cards' | 'subcollections'`;
  - `interface CollectionTotals { cards: number; sale: number; subs: number; directEntries: number }` and `interface CollectionStats { byId: Map<string, CollectionTotals>; holding: { cards: number; sale: number } }`;
  - `colorOf(id)` returning the palette record.
- [X] T003 [P] Create `src/app/core/utils/collection-copy.ts`, following `planechase-copy.ts`'s header style:
  - `const nf = new Intl.NumberFormat('pt-BR')`;
  - `formatCount(n)`;
  - `plural(n, one, many)`, which returns `"1 carta"` / `"1.240 cartas"` (the number formatted, then the word);
  - `COLLECTION`: every string in ui.md §7 verbatim, with functions for the interpolated ones.
    - `meta(t)` returns "Vazia" when `cards === 0 && subs === 0`, otherwise "{n} cartas · {s} à venda[ · {k} subcoleções]", omitting the subcollection part when `subs === 0`.
    - `deleteSubsGo(n)` returns "A subcoleção vai junto." for 1, and "As {N} subcoleções vão junto." otherwise.
    - The toasts use the singular forms "1 carta foi para a caixa temporária." and "{nome} e 1 carta foram excluídas.".

  Add `collection-copy.spec.ts` covering `meta` (Vazia, singulars, no subs part, "1.240") and the singular/plural toasts.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Storage, derivation, the new service, the removal of the old location stack, sync pointed at the new table, and the new route. After this phase the app compiles, `/collection` renders a skeleton, and nothing references `StorageLocation`.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 In `src/app/core/db/profile-db.ts`:
  - set `DB_VERSION = 2`;
  - add `collections: { key: string; value: Collection }` to `ProfileDbSchema` and remove `locations`;
  - set `TombstoneEntity = 'cards' | 'collections'`.
  - In `upgrade(db)`, create each of `cards`, `collections`, `decks`, `tombstones` (with the `by-entity` index) and `meta` only if it's missing from `db.objectStoreNames`, and delete `locations` if present. This is not a data migration (research R13).

  In `src/app/core/db/entity-store.ts`:
  - set `EntityStoreName` to `'cards' | 'collections' | 'decks'`;
  - add the `RowOp` type and `writeRows(ops, handle = currentDbHandle())` (contracts/services.md). It opens one `readwrite` transaction over the distinct stores the ops touch, applies each `put`/`delete` in order, awaits `tx.done`, and rejects via `requireDb` with no handle. An empty op list resolves without opening a transaction. Tombstone puts use the `{entity}:{id}` key shape of `putTombstone`.

  Extend `src/app/core/db/profile-db.spec.ts` to cover: the v2 stores exist, `locations` is absent, `writeRows` applies puts and deletes across stores atomically (a failing op rolls back the others), and it rejects when unbound.
- [X] T005 [P] Create `src/app/core/utils/collection-tree.util.ts` with the pure functions from contracts/services.md, except `repairCollectionTree`, which comes in T033:
  - `normalizeName(name)` = `name.trim().toLocaleLowerCase('pt-BR')`.
  - `compareByName(a, b)` = `a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)`.
  - `validateCollectionName(name, siblings, selfId?)` returns, in this order:
    - `'empty'` when the trimmed length is 0;
    - `'too-long'` when the trimmed length is > 40;
    - `'taken'` when a sibling other than `selfId` has the same `normalizeName`;
    - otherwise `null`.
  - `defaultColor(siblings)`: the first `COLLECTION_COLORS` id no sibling uses, else `'branco'`.
  - `buildChildrenOf(collections)`: a `Map<string | null, Collection[]>`, each list sorted with `compareByName`.
  - `subtreeIds(id, childrenOf)`: `id` plus all descendants.
  - `depthOf(id, byId)`: 1 + the number of ancestors, or 0 if unknown.
  - `computeStats(collections, cards)`, in one pass over `cards` (research R3):
    - each entry with a known `locationId` adds `quantity` to that collection's direct `cards`, adds to `sale` when `forSale`, and adds 1 to `directEntries`;
    - an entry with an unknown `locationId` adds to `holding`;
    - then totals roll up to every ancestor, and `subs` counts all descendants.
  - `suffixedName(base, n)`: `"{base} ({n})"`, with `base` trimmed and then cut so the result is ≤ 40 characters.

  Add `collection-tree.util.spec.ts` covering:
  - validation ("" → empty, 41 characters → too-long, " FICHÁRIO " vs "Fichário" → taken, self excluded on rename, "Raras" vs "Rarás" allowed);
  - sorting with accents and case;
  - `defaultColor` skipping used colors and falling back to branco;
  - `subtreeIds` over 3 levels;
  - `computeStats` (a quantity-3 entry counts 3, for-sale only, roll-up to both ancestors, subs at every level, unknown ids → holding, a collection with only empty children → 0 cards and its subs);
  - 50,000 entries over 100 collections finishing well under 1 s;
  - `suffixedName` cutting a 40-character base.
- [X] T006 [P] In `src/app/core/services/card.service.ts`, add `applyRemoved(ids: ReadonlySet<string>)` and `applyMoved(ids: ReadonlySet<string>, locationId: string, updatedAt: string)`. They update `cardsSignal` only: no `persist`, no `changeCount` bump, no tombstones. Only `CollectionService` calls them, with its own `writeRows` (research R2).

  Update `card.service.spec.ts`: both new methods change the signal and leave IndexedDB untouched.
- [X] T007 Create `src/app/core/services/collection.service.ts` (`providedIn: 'root'`) with the entity-service shape of the old `StorageLocationService` (Constitution VI): `load(profileId)` (clears the signal synchronously, generation guard), `whenReady()`, `flush()`, a private `enqueueWrite` whose tasks first `await this.cards.flush()` (research R2), and `changeCount`. It adds the derived signals from contracts/services.md:
  - `collections`, `byId`, and `childrenOf` via `buildChildrenOf`;
  - `stats = computed(() => computeStats(this.collections(), this.cards.cards()))`;
  - `depth(id)`, `path(id)` (root → id), `kind(id)` (`'subcollections'` if it has a child, `'cards'` if `stats().byId.get(id).directEntries > 0`, else `'empty'`), and `defaultColor(parentId)`.

  It also has the sync-only `getTombstones()`/`clearTombstones(ids)` (entity `'collections'`) and `applySyncResult(merged)`. That method sets the signal and enqueues one `writeRows` with a put for each merged row whose value changed and a delete for each id no longer present. It never restamps `updatedAt` and never tombstones.

  The mutations are added in the story phases (create/update T022, create-with-move T025, remove T028). Add `collection.service.spec.ts` covering: load isolation between two profiles, hydration from seeded rows, derived `path`/`depth`/`kind`, `stats` reacting to `CardService` changes, and `applySyncResult` writing only the diff (depends on T004, T005, T006)
- [X] T008 Replace `StorageLocationService` with `CollectionService` everywhere, then delete the old stack:
  - **(a)** `src/app/core/services/profile-session.service.ts` `entityServices`.
  - **(b)** `src/app/core/utils/sync-status.util.ts` `hasUnsyncedChanges`: rename the input `locations` to `collections`, and compare the collections' `updatedAt` as it compared the locations'. Update its spec.
  - **(c)** `src/app/shared/auth/profile-modal/profile-flow.store.ts` `evaluateUnsynced`: read `CollectionService.getTombstones()` and `.collections()`. Update `profile-flow.store.spec.ts`.
  - **(d)** `src/app/core/services/entity-load-isolation.spec.ts` uses `CollectionService`.
  - **(e)** Delete:
    - `src/app/core/services/storage-location.service.ts` (+spec) and `src/app/core/models/storage-location.model.ts`;
    - `src/app/core/utils/location-cards.util.ts` (+spec);
    - the whole `src/app/shared/locations/` folder;
    - `src/app/shared/cards/collection-card-grid/`, `src/app/shared/common/search-results-list/`;
    - `src/app/views/collection/`, `src/app/views/collection-detail/`, `src/app/views/collection-import/`;
    - `CardService.search()` and its `matchesCardQuery` import; `src/app/core/utils/text-search.util.ts` (+spec); the `search` cases in `card.service.spec.ts`;
    - `getLocationAccent`/`LOCATION_ACCENT_POOL` in `src/app/core/utils/card-color.util.ts` and their spec cases.

    Remove their exports from `src/app/shared/index.ts`.
  - **Keep** `src/app/core/services/card-import.service.ts` and `src/app/core/utils/card-import.util.ts` unchanged: they're the CSV import logic, kept for a future spec (research R13).
  - Remove every `Color`/`StorageLocation` import that pointed at the deleted model. `Color` stays in `card.model.ts`. (Depends on T007.)
- [X] T009 **Main thread only**: `phase-implementer` has no Supabase MCP tools. Before `apply_migration`, confirm with the user, since it drops `storage_locations` in the live project and can't be undone. Apply the Supabase migration `008_collections` from `contracts/supabase.md` verbatim with the MCP `apply_migration` (project `hyzbkxraanzhdyhtnadf`). Then run `get_advisors` (security) and fix anything it reports for `collections`. Confirm with `list_tables` that:
  - `storage_locations` is gone;
  - `card_entries` has no `card_entries_location_fkey`;
  - `collections` has RLS on.
- [X] T010 In `src/app/core/services/sync.service.ts`, replace `syncLocations`/`StorageLocationRow`/`locationToRow`/`locationFromRow` with `syncCollections`:
  - a `CollectionRow { id, user_id, name, color, parent_id, updated_at }` with its `collectionToRow`/`collectionFromRow`. Normalize `updated_at` through `new Date(...).toISOString()`, as `syncPlanarSelection` does.
  - `select('id, user_id, name, color, parent_id, updated_at')`, `reconcileEntities`, `upsert(..., { onConflict: 'user_id,id' })`, `delete().eq('user_id', uid).in('id', ids)`, then `collections.applySyncResult` and `clearTombstones`.
  - Flush `CollectionService` with the cards before the run.
  - Order: identity → collections → cards → planar selection.
  - Update the header comment, which says "locations". The tree repair is added in US6 (T034).

  Update `sync.service.spec.ts`: the location cases become collection cases (round-trip, tombstoned delete, newer remote wins). (Depends on T007, T009.)
- [X] T011 Routing and the view skeleton:
  - **(a)** Create `src/app/views/collection-area/collection-area.ts/.html/.scss/.spec.ts` (`selector: 'app-collection-area'`) with `ref = input<string>()`, rendering for now only the page column and `h1` "Coleção" (ui.md §2 page column: centered, 760px, padding `space-5`/`space-4` ≤ 640px, a flex column with `space-4` gap). No max-width is set on the host itself; the column is inner (architecture.md).
  - **(b)** In `src/app/app.routes.ts`, export a `collectionMatcher: UrlMatcher`:
    - `['collection']` → `{ consumed }`;
    - `['collection', x]` → `{ consumed, posParams: { ref: x } }`;
    - anything else → `null`.

    Replace the three old collection routes with `{ matcher: collectionMatcher, component: CollectionArea, ...gated }`, and remove the deleted views' imports.
  - **(c)** In `src/app/app.scss`, give `main.view-area` `scrollbar-gutter: stable`.

  The spec checks that the matcher accepts `/collection`, `/collection/{uuid}` and `/collection/caixa`, and rejects `/collection/a/b`, and that the view renders gated. (Depends on T008.)

**Checkpoint**: `npm test` and `npm run lint` pass. The app builds, `/collection` shows the skeleton, and sync round-trips collections.

---

## Phase 3: User Story 1 - See my collections at a glance (Priority: P1) 🎯 MVP

**Goal**: The list of top-level collections with their counts, and opening a collection to see its summary and subcollections, each at its own address, with the page transition.

**Independent Test**: Seed a profile with nested collections and cards (quickstart step 3):
- the list shows name, swatch, cards, for-sale and subcollection counts in PT-BR format;
- opening drills down and the path leads back;
- back and reload work;
- unknown ids redirect;
- a new profile shows the empty state.

- [X] T012 [P] [US1] Create `src/app/shared/collections/collection-row/collection-row.ts/.scss/.spec.ts` (`app-collection-row`), per ui.md §2 and DESIGN.md "Collections":
  - inputs `collection: Collection` and `totals: CollectionTotals`; output `open`;
  - a full-width `<button>`: min-height 56px, padding `space-2 space-3`, 1px `border`, radius 8px, the `surface-raised → surface` gradient;
  - hover and focus: border role-primary and `--glow-plate-hover`, 0.18s standard easing;
  - a 20px swatch (`colorOf(color).hex`, plus a 1px `outline` border for Carvão), the name (700, one line, ellipsis) over `COLLECTION.meta(totals)` (0.75rem muted), and the trailing `.micro-label` "Abrir";
  - `aria-label` = "{nome}, cor {Cor}. {meta}.", with the swatch and inner text `aria-hidden`.

  The spec covers: the label with the color name, "Vazia", the omitted subcollection part, "1.240 cartas", the Carvão outline, and the click emitting `open`.
- [X] T013 [P] [US1] Create `src/app/shared/collections/create-row/create-row.ts/.scss/.spec.ts` (`app-create-row`):
  - inputs `label: string` and `sub = ''`; output `activate`;
  - the same size as a collection row, but 1px **dashed** `border`, transparent, muted text;
  - "+" centered in a 36px slot, bold label, optional 0.75rem sub-line;
  - hover and focus: text → `text`, border → role-accent.

  The spec covers the label, the sub-line and the emit.
- [X] T014 [P] [US1] Create `src/app/core/utils/collection-transition.util.ts`:
  - `type Place = { kind: 'list' } | { kind: 'holding' } | { kind: 'collection'; id: string }`.
  - `placeDepth(place, depthOf)`: list 0, holding 1, collection `depthOf(id)`.
  - `transitionDir(from, to, depthOf)`: −1 when the target is shallower, otherwise +1 (deeper and sideways).
  - `interface Orb { size; left; top; dx; dy; duration; delay; role: 0 | 1 | 2 }`.
  - `makeOrbs(count, dir, random)`: 13 by default. For each orb i, with `r = random()`:
    - `size = (5 + r * 11) * 0.4`;
    - `left` in 8–63% (dir +1) or 35–90% (dir −1), `top` in 10–80%;
    - `dx = dir * (50…160)`, `dy = −(15…75)`;
    - `duration` 750–1250ms, `delay` 0–220ms;
    - `role = i % 3`.

  Add `collection-transition.util.spec.ts` with a seeded random covering: every range, count, direction sign, and dir for list→collection, collection→child, child→parent, collection→holding and sibling→sibling.
- [X] T015 [US1] Create `src/app/views/collection-area/collection-transition.ts`, a view-provided `@Injectable()` controller (research R9).
  - It exposes:
    - `shown = signal<Place>`;
    - `phase = signal<'idle' | 'out' | 'in'>`;
    - `dir`, `lockHeight = signal<number | null>`, `orbs = signal<Orb[]>`;
    - `go(target, depthOf, measure: { outer: () => number; inner: () => number })`.
  - `go()` runs these steps:
    1. It locks the height at `outer()` and emits `makeOrbs(13, dir, Math.random)`.
    2. It sets `out`; after 140ms it sets `shown`, and the content starts at `dir*12px` with no transition.
    3. On the next frame it sets `in`, and the height goes to `inner()` over 240ms.
    4. After ~280ms it releases to `null` and `idle`.
    5. It clears the orbs after ~1.5s.
  - A `go()` during a run jumps to the latest target.
  - Under `prefers-reduced-motion` (a `matchMedia` signal, as in `src/app/shared/ds/media-query.ts`), `go()` sets `shown` at once with no orbs and no lock. The first place is set without animation.
  - Timers are cleared on `DestroyRef`.

  Add `collection-transition.spec.ts` with fake timers: the phase sequence and timings, the jump on a second `go`, and the reduced-motion instant swap. (Depends on T014.)
- [X] T016 [US1] Build the list place in `src/app/views/collection-area/collection-area.html/.scss/.ts` (ui.md §2 "List", handoff README §1):
  - **Header row**: flex, wrap, `space-3` gap; the `h1` "Coleção" (Grenze 600 2rem/1.1, `--glow-title`, `text-wrap: balance`, `tabindex="-1"`) with `flex: 1`.
  - **Search row**: a disabled `.field__input` at `opacity: .5`, `cursor: not-allowed`, `flex: 1`, placeholder `COLLECTION.searchPlaceholder`, `aria-label` `searchLabel`. At < 960px it's followed by a disabled `.btn.btn--secondary` "Filtros" (0.875rem).
  - **Rows**: a flex column with `space-2` gap, one `app-collection-row` per `childrenOf().get(null)` with `stats().byId`.
  - **At ≥ 960px**: the page grid `minmax(0,1fr) 220px`, 1080px max, `space-6` gap. The aside is sticky `top: space-5`, `padding-left: space-5`, `border-left` 1px, min-height 240px, with `.eyebrow` "Filtros" and a muted 0.875rem `filtersSoon`. It's kept even with only the placeholder.
  - **Empty state** (no collections and no holding cards, FR-009): only the `h1`, then a centered section (360px, margin `space-6 auto`, gap `space-4`, centered text) with `.eyebrow` `emptyEyebrow`, an `h2` `emptyTitle` (Grenze 600 1.5rem, title glow), muted 0.875rem `emptyCopy`, and a `.btn--primary` "Criar coleção". Search and aside are hidden.

  The create buttons are rendered but wired in US2. Use `ShellState`/`media-query.ts` for the 640/960 breakpoints, or CSS where layout alone differs. (Depends on T011, T012.)
- [X] T017 [US1] Build the collection place in the same view (ui.md §2 "Collection page", handoff README §3):
  - **Path**: `<nav aria-label="Caminho">`, flex, `space-2` gap, margin-bottom `-space-3`. It holds `.link-btn` "Coleção" and a link per ancestor from `path(id)` (excluding the current one), separated by muted `·` spans (`aria-hidden`), then the current name as muted text with `aria-current="page"`.
  - **Header**: flex, wrap, `space-3` gap. A 24px swatch with `box-shadow: 0 0 16px {hex}66`, and the `h1` name (`overflow-wrap: anywhere`, `tabindex="-1"`). Room is reserved for the actions (added in T024/T030).
  - **Stats**: a 3-column grid of `.plate`s, each a Grenze 600 1.5rem `formatCount` number over a `.micro-label` "Cartas" / "À venda" / "Subcoleções".
  - **Meta**: a muted 0.75rem `colorLevel(Cor, depth)`.
  - **Content by `kind(id)`** (FR-027, FR-030):
    - `'subcollections'`: `.eyebrow` "Subcoleções" plus rows of `childrenOf().get(id)`.
    - `'cards'`: `.eyebrow` "Cartas" plus a muted `.plate` `cardsSoon`. At level 3, add the muted line `lastLevel`.
    - `'empty'`: two `.plate` choices side by side (stacked ≤ 640px, padding `space-4`):
      - "Guardar cartas" / `keepCardsCopy` with a disabled `.btn--secondary` `addCardsSoon`;
      - "Dividir" / `divideCopy` with a `.btn--primary` "Nova subcoleção", hidden at level 3.

      Then the note `eitherOr`, or `lastLevel` at level 3.

  The create actions are wired in US3. (Depends on T016.)
- [X] T018 [US1] Wire navigation and addresses in `collection-area.ts` (FR-006, research R8):
  - Map `ref()` to a `Place` (none → list, `HOLDING_REF` → holding, otherwise collection). Provide `CollectionTransition` in the view's `providers`.
  - An `effect` calls `transition.go(place, depthOf, measure)` when the routed place changes. The view renders from `transition.shown()`. `measure` reads the content column's `offsetHeight` and the inner wrapper's `scrollHeight`.
  - An `effect` redirects with `router.navigate(['/collection'], { replaceUrl: true })` when the routed place is a collection id missing from `byId()`.
  - Row `open` → `router.navigate(['/collection', id])`; path links → the parent's address.
  - After each swap to a new place, focus the `h1` (`afterNextRender`).
  - **Template bindings**: the content column carries `[style.height.px]="lockHeight()"` with `overflow: hidden` while locked, and classes for `out`/`in` (opacity and `translateX` via a `--dir` custom property, 140ms/240ms standard easing, no transition during the swap frame).
  - **Orb layer**: an `aria-hidden` absolute `inset: 0` layer (the host is `position: relative`), `pointer-events: none`, `overflow: hidden`, `mix-blend-mode: screen`. Each orb uses `radial-gradient(circle, c 0%, c/67% 40%, transparent 72%)` with the glow `0 0 {1.6*size}px {0.4*size}px c/40%`, and `c` cycles through `var(--role-primary)`, `--role-accent` and `--role-tertiary`. Add the keyframes `grm-orb` (0%: opacity 0, scale .5; 25%: opacity 1; 100%: opacity 0, `translate(var(--dx), var(--dy)) scale(1.1)`).
  - Reduced motion: no transition classes and no orbs (DESIGN.md Motion). (Depends on T015, T017.)
- [X] T019 [US1] Write `src/app/views/collection-area/collection-area.spec.ts` for US1 (fake timers, `CollectionService`/`CardService` seeded through their public APIs or IndexedDB):
  - the list order (accents, case), the meta counts and roll-up;
  - two profiles each seeing only their own;
  - the empty state and the hidden search;
  - the aside/Filtros split by width;
  - drilling down to level 3 and back through the path links;
  - the `kind` content for subcollections, cards (level 2 and 3) and empty (level 1 vs. 3);
  - the redirect for an unknown id, and when a sync removes the open collection;
  - the `h1` focused after a navigation;
  - the reduced motion swap. (Depends on T018.)

**Checkpoint**: US1 works with seeded data. This is the MVP read path.

---

## Phase 4: User Story 2 - Create, rename and recolor a collection (Priority: P1)

**Goal**: Create top-level collections and edit any collection's name and color, offline, through the compact dialog with the color picker.

**Independent Test**: Offline:
- create "Fichário vermelho" with the preselected color, and it appears as "Vazia";
- the empty, 41-character and duplicate names each show their PT-BR error;
- rename and recolor, reload, and the changes persist.

- [X] T020 [P] [US2] Create `src/app/shared/ds/compact-modal/compact-modal.ts/.html/.scss/.spec.ts` (`app-compact-modal`, research R10, DESIGN.md "compact modal").
  - Inputs: `roles: Roles` (required), `labelledBy`, `locked = false`. Output: `closed`.
  - It's a native `<dialog data-grm data-theme-scope>` with the `--theme-*` bindings, as in `themed-modal.html`.
  - **Ring**: `@use 'ring'` and `_face.scss` from `src/app/shared/ds/themed-modal/` (via a relative `@use` or the `includePaths`), sized `width: min(480px, 100vw - 2rem)` with 2px padding and 10px radius.
  - **Halo**: `inset: -32px`, radius 70px, blur 26px, `--halo-gradient`, spin plus flicker.
  - **Face**: `--color-bg`, radius 8px, `--shadow-rest`, `max-height: calc(100vh - 4rem)`, scrolling.
  - **Close row**: a 44×44 muted "✕" (`aria-label` "Fechar").
  - **Body slot**: padding `0 space-6 space-6`, gap `space-4`.
  - **≤ 640px**: full-bleed, no halo, no ring gap. The header holds the "Grimorio" wordmark (Grenze 700 1.25rem, role-primary, title glow) and ✕, with a hairline and `--wash-header`. The body padding is `space-5`.
  - **Behavior**: `showModal()` on mount, remembering the opener; Esc (cancel event), a backdrop click and ✕ emit `closed` unless `locked`; on destroy it closes and restores focus to the opener.

  The spec covers: open on mount, the three close paths, `locked` blocking all three, and focus restored on destroy.
- [X] T021 [P] [US2] Create `src/app/shared/collections/color-picker/color-picker.ts/.scss/.spec.ts` (`app-color-picker`).
  - Input `value: CollectionColorId`, output `valueChange`.
  - **Label**: "Cor · {Nome}", with the name muted.
  - **Layout**: a centered `role="radiogroup"` (`aria-labelledby` pointing at the label) laid out 5/6/5 from `COLLECTION_COLORS` order. Rows have a 6px gap; swatches in a row have 12px; rows 1 and 3 are indented 24px.
  - **Swatches**: 36px circular `<button role="radio">`, with `aria-checked`, `aria-label` and `title` set to the color name, and roving `tabindex`. Arrow keys move and select through the palette order, wrapping; Home and End go to the ends.
  - **Selected**: `box-shadow: 0 0 0 3px var(--color-bg), 0 0 0 4px {hex}, 0 0 20px {hex}80`, with Carvão using `#8a837e` for the 4px ring, and a 0.5s transition (none under reduced motion).

  The spec covers: 16 radios in 5/6/5, a click emitting, the arrow keys wrapping, the label text, and a single tab stop.
- [X] T022 [US2] Add `create` and `update` to `src/app/core/services/collection.service.ts` (contracts/services.md), for top-level collections here; children are extended in T025.
  - **`create({ parentId: null, name, color })`**:
    1. Trim the name and validate it with `validateCollectionName` against `childrenOf().get(null)`.
    2. On success, build `{ id: crypto.randomUUID(), name: trimmed, color, parentId: null, updatedAt: now }`.
    3. Update the signal and bump `changeCount`.
    4. Enqueue a `writeRows([{ store: 'collections', put }])` with the handle captured at call time.
    5. Return `{ ok: true, collection, moved: 0 }`.
  - **`update(id, { name?, color? })`**: validate only a changed name, against the siblings excluding self; stamp `updatedAt`; write one row; never touch a card (FR-011, FR-021). It returns `'not-found'` for an unknown id.

  Extend `collection.service.spec.ts`: create persists across a reload, the validation errors, update writes exactly one collections row and zero card rows, and a recolor keeps the name.
- [X] T023 [US2] Create `src/app/shared/collections/collection-form-dialog/collection-form-dialog.ts/.html/.scss/.spec.ts` (`app-collection-form-dialog`, ui.md §2 dialog, handoff README §5), inside `app-compact-modal` with `IdentityService.roles()`.
  - Inputs: `mode: 'create' | 'edit'`, `parentId: string | null`, `collectionId?`. Outputs: `closed`, `saved(Collection)`.
  - **Title**: Grenze 600 2rem (1.5rem ≤ 640px), title glow, `id` for `labelledBy`: "Nova coleção" or "Editar coleção" here; the subcollection titles come in T026.
  - **Name field**: built with the `.field` primitives. A `.field__label` "Nome" and a `.field__input`, autofocused, where Enter submits. Below it, a row with the helper `nameHelper` (or the `.field__error` in its place, linked via `aria-describedby`) on the left, and a live "{n}/40" counter on the right that turns danger over 40.
  - **Validation** runs on submit through the service result, and the error clears on the next input. The name is trimmed first.
  - **Color**: `app-color-picker`, preselected with `defaultColor(parentId)` in create mode (FR-005), or the current color in edit mode.
  - **Actions**: `.btn--ghost` "Cancelar", then `.btn--primary` "Criar coleção" / "Salvar". At ≤ 640px they stack full-width with `column-reverse`.

  The spec covers: the preselected color skipping used ones, each error message, the error clearing on typing, the counter at 40/41, Enter submitting, and edit prefilling and saving.
- [X] T024 [US2] Wire the create/edit dialogs in `collection-area.ts/.html`:
  - A view `form = signal<{ mode; parentId; collectionId? } | null>`, rendered with `@if`.
  - "Nova coleção" (`.btn--primary` in the header, shown only > 640px), the dashed `app-create-row` "Nova coleção" at the end of the list (only ≤ 640px), and the empty-state "Criar coleção" all open create with parent `null`.
  - On the collection page, add `.btn--secondary` "Editar" beside the `h1` (on phone the actions drop to their own row at 50/50) to open edit.
  - On `saved`/`closed`, set `form` to `null`. The person stays on the current page.

  Extend `collection-area.spec.ts`: create from each entry point, then the new row sorted in; edit updates the header and path. (Depends on T020–T023.)

**Checkpoint**: US1 + US2 make a usable slice: see, create, rename, recolor.

---

## Phase 5: User Story 3 - Organize with subcollections (Priority: P2)

**Goal**: Create subcollections down to level 3, enforce cards-or-subcollections, and move a parent's cards into its first subcollection.

**Independent Test**: Create 3 levels; level 3 offers no subcollection action. In a collection seeded with cards, "Dividir em subcoleções" shows the move plate, and "Criar e mover cartas" moves every card with its data unchanged.

- [X] T025 [US3] Extend `CollectionService.create` in `src/app/core/services/collection.service.ts` for `parentId !== null` (FR-002, FR-010, FR-027, FR-029):
  1. Reject `'no-parent'` when the parent is missing, and `'too-deep'` when `depth(parentId) >= 3`.
  2. Validate the name against `childrenOf().get(parentId)`.
  3. If `kind(parentId) === 'cards'`, gather the parent's direct card entries (`locationId === parentId`) and call `cards.applyMoved(ids, newId, now)`. Then enqueue **one** `writeRows` holding the new collection put and a card put for each moved card (the updated entry with `locationId: newId` and `updatedAt: now`). Return `moved` as the sum of their quantities.

  Extend `collection.service.spec.ts`:
  - levels 2 and 3 are created, and level 4 is rejected;
  - create-with-move moves all direct cards with every other field unchanged (FR-014) in one transaction;
  - a rejected transaction (stub `writeRows` failing) leaves IndexedDB with neither the collection nor the moved cards (FR-015);
  - the parent's kind becomes `'subcollections'`;
  - a parent holding 5,000 cards finishing in under 3 s (SC-009).
- [X] T026 [US3] Extend `collection-form-dialog` for subcollections (ui.md §2, handoff §5):
  - titles "Nova subcoleção" / "Editar subcoleção" when `parentId` (or the edited collection's parent) isn't `null`;
  - the subtitle `inside(pai)`;
  - in create mode inside a `'cards'` parent, a muted `.plate` `movePlate(pai, n)`, where `n` is the parent's `stats` cards, and the verb "Criar e mover cartas" (otherwise "Criar subcoleção").

  Extend its spec: titles, subtitle, the plate and verb only for a `'cards'` parent. (Depends on T025.)
- [X] T027 [US3] Wire the subcollection entry points in `collection-area.html/.ts`, all opening create with `parentId = id`:
  - for kind `'subcollections'` below level 3, the trailing `app-create-row` "Nova subcoleção";
  - for kind `'cards'` at levels 1–2, the `app-create-row` "Dividir em subcoleções" with the sub-line `splitSub(n)`;
  - for kind `'empty'` below level 3, the "Nova subcoleção" button in the "Dividir" plate.

  Level 3 shows none of them (US3-3). Extend `collection-area.spec.ts`: the entry points per kind and level, the move flow ending with the parent listing the new subcollection and its counts unchanged, and no card action on a `'subcollections'` collection (US3-6). (Depends on T026.)

**Checkpoint**: Trees up to 3 levels with the either/or rule.

---

## Phase 6: User Story 4 - Delete a collection and decide what happens to its cards (Priority: P2)

**Goal**: Delete a collection and its subtree, with an explicit move/delete choice when cards are affected, all-or-nothing, with a toast and navigation.

**Independent Test**:
- deleting an empty collection is a plain confirmation;
- with cards, confirm stays disabled until a choice;
- "Mover" puts the cards in the holding box, and "Excluir as cartas" removes them;
- deleting from inside the subtree lands on the parent;
- deleting the last subcollection leaves the parent `'empty'`.

- [X] T028 [US4] Add `remove(id, choice: 'move' | 'delete')` to `src/app/core/services/collection.service.ts` (FR-012–FR-015, FR-022, research R1/R7):
  1. `ids = subtreeIds(id)`; for `'delete'`, `cardIds` = the entries whose `locationId ∈ ids`.
  2. Update the collection signal and, for `'delete'`, call `cards.applyRemoved(cardIds)`. Bump `changeCount`.
  3. Enqueue **one** `writeRows`: a collection delete and a `collections` tombstone for each id, plus, for `'delete'`, a card delete and a `cards` tombstone for each card, with one `deletedAt` for all.
  4. Return a promise that resolves after that transaction commits with `{ collections: ids.length, cards: copies }`, where `copies` is the sum of quantities. For `'move'` it's the subtree's `stats` cards.

  With `'move'`, no card row is written. Extend `collection.service.spec.ts`:
  - move: collection rows and tombstones only, and the cards become holding cards;
  - delete: cards and tombstones gone;
  - a subcollection delete leaves the parent and siblings intact (US4-5);
  - the last child removed → parent `kind` is `'empty'` (FR-028);
  - a rejected transaction leaves IndexedDB unchanged;
  - 5,000 cards finishing in under 3 s (SC-004).
- [X] T029 [US4] Create `src/app/shared/collections/collection-delete-dialog/collection-delete-dialog.ts/.html/.scss/.spec.ts` (`app-collection-delete-dialog`, ui.md §2, handoff §6), inside `app-compact-modal` with `[locked]="busy()"`.
  - Input `collectionId`. Outputs `closed`, `deleted({ parentId, name, choice, result })`.
  - **Captured on open**: the name, `parentId`, subtree card count and subcollection count are read once when the dialog is created, so the title, subtitle and toast payload survive `remove()` clearing the collection from the signal.
  - With no subtree cards, confirm calls `remove(id, 'move')` (data-model.md "Delete").
  - **Title**: `deleteTitle(nome)`.
  - **With subtree cards** (`stats` cards > 0):
    - the subtitle `deleteSubsGo(N)` (only when N > 0) + `deleteWithCards(n)`;
    - a `role="radiogroup"` of two full-width radio buttons: padding `space-3`, radius 8px, the row gradient, an 18px indicator (1px border, inset 4px `--color-bg` ring, filled when selected), title 700, and a 0.75rem sub-text.
      - "Mover para a caixa temporária" / `moveOptionSub(n)`, muted. Selected: border and fill role-primary plus `--glow-plate-hover`.
      - "Excluir as cartas" / `deleteOptionSub(n)` in `--color-danger`. Selected: border and fill danger.
    - Nothing is selected at first. Confirm is `aria-disabled="true"` and inert until a choice is made.
  - **Without cards**: the subtitle `deleteNoCards` + (`deleteSubsGo(N)` or `nothingElse`).
  - **Actions**: `.btn--ghost` "Cancelar" (focused on open), then `.btn--danger` "Excluir coleção" / "Excluir subcoleção" (subcollection when `parentId` isn't `null`).
  - **While `remove()` runs**: the label is "Excluindo…", both buttons are locked, and the modal is `locked`.

  The spec covers: both subtitles, no default, `aria-disabled` until a choice, the danger sub-text, the busy lock blocking Esc/✕/backdrop, the emitted payload, and Cancel changing nothing.
- [X] T030 [US4] Wire the delete in `collection-area.ts/.html` (FR-031):
  - On the collection page, add `.btn--danger` "Excluir" after "Editar" (50/50 on phone). A view `del = signal<{ id: string; parentId: string | null; subtree: ReadonlySet<string> } | null>`, set when "Excluir" is clicked (`subtree` from `subtreeIds(id)` at that moment), renders the dialog.
  - Extend the redirect effect (T018): when the routed collection id is missing from `byId()` and `del()?.subtree.has(id)`, navigate to `['/collection', parentId]` (or `['/collection']`) with `replaceUrl`. Otherwise navigate to `/collection` as before (research R8).
  - On `deleted`:
    1. Set `del` to `null`.
    2. Call `ToastService.show(COLLECTION.toastLabel, text)`, with text `toastMoved(nome, n)` for move with cards, `toastDeleted(nome, n)` for delete with cards, or `toastEmpty(nome)` with no cards.
  - Focus lands on the new page's `h1` (T018) instead of the removed opener.

  Extend `collection-area.spec.ts`: the three toasts, navigation to the parent, staying on the list for a top-level delete from its own page, and that a delete from inside the subtree lands on the parent even though the collection disappears from the signal before `remove()` resolves (no intermediate `/collection`). (Depends on T028, T029.)

**Checkpoint**: Full CRUD. Cards moved by a delete are counted as holding cards.

---

## Phase 7: User Story 5 - The holding box (Priority: P2)

**Goal**: Show the holding box only while it holds cards, with its own read-only page.

**Independent Test**:
- no unplaced cards → no tag;
- after a "move" delete, the tag shows the count and opens the holding page;
- `/collection/caixa` with an empty box redirects;
- removing the last holding card hides the tag.

- [X] T031 [US5] Add the holding-box tag to the list header in `collection-area.html/.scss` (handoff README §1, FR-016), shown only while `stats().holding.cards > 0`.
  - It sits between the `h1` and "Nova coleção": min-height 44px, padding `0 space-3`, 1px `border`, radius 4px, transparent, 0.875rem.
  - Contents: a 10×10 hollow square (1px `text-muted`, radius 2px), bold `holdingName`, and a muted `plural(n, 'carta', 'cartas')`.
  - Hover: border role-primary, 0.18s.
  - `aria-label` = `holdingLabel(n, s)`. Click → `/collection/caixa`.
  - The empty state (T016) counts the holding box: no collections but holding cards means the list, not the empty state.
- [X] T032 [US5] Add the holding place in `collection-area.html/.ts` (handoff README §4, FR-016, FR-017):
  - the path "Coleção · Caixa temporária" (current is muted, `aria-current`);
  - a header with a 24px hollow square (1px `text-muted`, radius 4px) and the `h1` `holdingName`;
  - two stat plates, "Cartas" and "À venda", max-width 360px;
  - the muted 0.875rem `holdingCopy`, max 52ch.

  No actions and no content slot. Extend the redirect effect (T018): the holding place with `holding.cards === 0` → `/collection` with `replaceUrl`. Extend `collection-area.spec.ts` for US5-1 to US5-4, the tag's accessible name, and the empty-box redirect. (Depends on T031.)

**Checkpoint**: Every card stays findable (Constitution I).

---

## Phase 8: User Story 6 - Collections sync with the linked cloud account (Priority: P3)

**Goal**: Sync keeps every device's tree identical: no orphans, no duplicate sibling names, and no collection holding both cards and subcollections.

**Independent Test**: quickstart step 7 on two devices, plus the sync unit cases below.

- [X] T033 [P] [US6] Add `repairCollectionTree(merged, remoteIds, now)` to `src/app/core/utils/collection-tree.util.ts` (research R6).
  - **Step 1, orphans**: repeatedly drop collections whose `parentId` isn't null and isn't in the set, until stable. The dropped ids go to `removedIds`.
  - **Step 2, duplicates**: group the remaining siblings by `(parentId, normalizeName(name))`.
    - In each group of 2 or more, the survivor is the member in `remoteIds`. When there are none or several, the lowest `id` wins.
    - Every other member, in `id` order, gets `suffixedName(trimmedBase, k)` with the lowest `k ≥ 2` whose normalized result collides with no sibling (existing or already renamed), and `updatedAt: now`. It's added to `renamed`.
  - Return `{ collections, removedIds, renamed }`.

  Extend `collection-tree.util.spec.ts`:
  - an orphan chain of 2 levels removed;
  - a survivor from remote;
  - a lowest-id tie-break;
  - "Nome (2)" skipping an existing "Nome (2)" to "(3)";
  - a 40-character base cut;
  - case and space variants treated as duplicates;
  - a clean tree unchanged.
- [X] T034 [US6] Integrate the repair into `syncCollections` in `src/app/core/services/sync.service.ts`:
  - after `reconcileEntities`, run `repairCollectionTree(result.merged, new Set(remoteRows.map(r => r.id)), new Date().toISOString())`;
  - remove `removedIds` from `toUpsertRemote` and add those the remote has to `toDeleteRemoteIds`;
  - add `renamed` to `toUpsertRemote`, replacing any same-id entry;
  - apply `repair.collections` through `applySyncResult`.

  Removed orphans get no tombstone: they're deleted remotely in the same run. (Depends on T033.)
- [X] T035 [US6] Add `resolveMixedCollections()` to `src/app/core/services/collection.service.ts` (FR-029, research R6).
  - For each collection with a child and `directEntries > 0`, it moves those entries to its first child in `compareByName` order: `cards.applyMoved` plus one `writeRows` with the card puts and a fresh `updatedAt`.
  - `SyncService.exchange` calls it after `syncCards` and before `syncPlanarSelection`, guarded by `ensureCurrent`. It captures `syncedAt` **before** that call, so the moved cards' fresh `updatedAt` is newer than `lastSyncedAt`: `hasUnsyncedChanges` reports them, and the next sync uploads them (FR-029's "carried on the next sync").
- [X] T036 [US6] Extend `src/app/core/services/sync.service.spec.ts` with a mocked client:
  - a remote-deleted parent removes the local child subtree and deletes the child remotely;
  - a same-named sibling from another device is renamed "(2)" and upserted, while the remote one keeps its name;
  - a "move" delete sends zero `card_entries` upserts;
  - a "delete" delete sends the card deletions;
  - a collection with both children and direct cards after sync has its cards moved to the first child with new `updatedAt`, `hasUnsyncedChanges` is true right after the run, and the cards are uploaded on the next run;
  - renaming a collection that holds cards, then syncing, sends one `collections` upsert and zero `card_entries` upserts (SC-003);
  - an unlinked profile never calls the client (US6-5).

  (Depends on T034, T035.)

**Checkpoint**: All six stories complete.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T037 Update `.claude/docs/architecture.md` with the lasting conventions from plan.md "Docs to update", after showing the user the proposed edit (CLAUDE.md "Maintaining these files"):
  - "Domain model": `StorageLocation` → `Collection` (16-color palette ids, derived counts/kind, the dangling-reference holding box);
  - the persistence pattern note on `writeRows` per-row/cross-store transactions;
  - "Sync": `collections` plus `repairCollectionTree`;
  - the `shared/` domain folders: `collections/` replaces `locations/`, and `ds/compact-modal`;
  - "Routing": the matcher route;
  - the card-import service kept, unused, for a future spec.
- [X] T038 Run the `design-auditor` agent over every new or changed `.html`/`.scss`/component `.ts` (T011–T032) against `DESIGN.md` and `ui.md`, and fix what it reports.
- [X] T039 Run the full suite and lint through the `test-runner` agent (`npm test`, `npm run lint`), and fix any failure or unused import left by the deletions (T008).
- [X] T040 Walk quickstart.md steps 1–10 on the running dev server (the user runs `npm start`), including 320px width, reduced motion and the 50,000-copy scale seed. Record any deviation.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none. T002 and T003 run in parallel; T001 is independent.
- **Foundational (Phase 2)**: needs T002. T005 ∥ T006 can run in parallel. T004 → T007 → T008 run as one sequential hand-off, because T004 removes the `locations` store the old service still uses until T008. Then T009 (main thread, between the T008 and T010 hand-offs) → T010, and T011 after T008. The tree compiles again only at the Phase 2 checkpoint, so per-task runs inside the phase use single-spec `--include`.
- **US1 (Phase 3)**: needs Phase 2 and T001 (DESIGN.md) and T003 (copy).
- **US2 (Phase 4)**: needs US1's view (T016–T018).
- **US3 (Phase 5)**: needs US2 (the form dialog and `create`).
- **US4 (Phase 6)**: needs US1's view, and T020 (the compact modal) from US2.
- **US5 (Phase 7)**: needs US1. It's most testable after US4, which puts cards in the holding box, but seeded cards with unknown ids work.
- **US6 (Phase 8)**: needs Phase 2 (T010). It's independent of the UI stories.
- **Polish (Phase 9)**: after all stories.

### Within Each Story

Models/utils → service → components → view wiring → view spec.

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003 (T001 alongside).
- **Phase 2**: T005 ∥ T006 (T004 starts the sequential hand-off).
- **US1**: T012 ∥ T013 ∥ T014.
- **US2**: T020 ∥ T021, then T022 can run beside them (a different file).
- **US6**: T033 can start any time after T005. The whole of US6 can run in parallel with US2–US5, because it touches no UI files.

---

## Parallel Example: User Story 1

```text
Task: "T012 [US1] collection-row in src/app/shared/collections/collection-row/"
Task: "T013 [US1] create-row in src/app/shared/collections/create-row/"
Task: "T014 [US1] collection-transition.util in src/app/core/utils/"
```

## Parallel Example: User Story 2

```text
Task: "T020 [US2] compact-modal in src/app/shared/ds/compact-modal/"
Task: "T021 [US2] color-picker in src/app/shared/collections/color-picker/"
Task: "T022 [US2] create/update in src/app/core/services/collection.service.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Phase 1 → Phase 2. The app compiles on the new model, and sync points at `collections`.
2. US1: the list and collection pages with transitions (a read path over seeded data).
3. US2: create, rename and recolor. **Stop and validate**: a person can build a flat list of collections offline.

### Incremental Delivery

4. US3: nesting and the either/or rule.
5. US4: delete with the card choice.
6. US5: the holding box surfaces.
7. US6: sync repair. This can run in parallel from step 3 on.
8. Polish: docs, design audit, full suite, the quickstart walk.

---

## Notes

- Quote the constraints exactly as given: names are 1–40 characters after trimming, unique among siblings ignoring case and surrounding spaces; depth ≤ 3; the 16 color ids; no counts stored.
- `CollectionService` never calls `replaceStore`. Every write is `writeRows` with the handle captured at call time.
- A "move" delete never writes a card row (research R1). Any card write in that path is a bug.
- Every string comes from `COLLECTION` (`collection-copy.ts`); no inline PT-BR in templates.
- Commit after each task or logical group; stop at each checkpoint to validate.
