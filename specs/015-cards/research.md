# Research: Cards

Phase 0 for [plan.md](plan.md). Each item: decision, rationale, alternatives. Facts about the live catalog come from the Supabase project `hyzbkxraanzhdyhtnadf` as of 2026-10-01: `cards` 35,903 rows, `printings` 103,241 rows (2,600 not in English, up to 869 per card), `card_entries` empty. Neither `pg_trgm` nor `unaccent` is installed, and there is no index on `cards.name`.

## R1. Catalog client

**Decision**: a new `CardCatalogService` owns one anonymous Supabase client, created lazily on first use: `createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'grm-catalog' } })`. It never holds a session, so its storage key stays apart from the per-profile `grm-cloud:{id}` clients.

**Rationale**: `cards`/`printings` are already granted `select` to `anon` with a public-read policy, so the catalog must work signed out and with a local-only profile (FR-028). This is the shape recorded in `backlog/reference/card-features.md`. `supabase-js` is already in the initial bundle (`CloudSessionService`), so a static import costs nothing.

**Alternatives**: borrowing the active profile's cloud client fails for local-only profiles. A lazy `import()` gains nothing, because the library is already loaded.

## R2. Name search: accents, "anywhere" matching, order, paging

**Decision**:
- **Search key column**: migration `015_cards` adds `cards.search_name text`, filled by `sync:scryfall` with `searchKey(name)`. `searchKey` = NFD, strip combining marks (`\p{M}`), lowercase, collapse whitespace, trim.
- **Index**: a GIN `gin_trgm_ops` index on `search_name`, with `pg_trgm` enabled in the `extensions` schema.
- **Query**: the client sends `ilike('search_name', '%' + escapeLike(searchKey(text)) + '%')`, where `escapeLike` escapes `\`, `%` and `_`, then `.order('name').order('oracle_id').range(from, from + 100)`. It asks for 101 rows and shows 100; a 101st row means another page exists. There is no `count`.
- **Columns**: `oracle_id, name, type_line, color_identity, image_url`, which is enough to show a result, carry its name and type line to assistive technology (FR-008), and color its hover (FR-032).
- **Minimum length**: under 3 characters (after `searchKey`) nothing is sent.

**Rationale**:
- FR-006 needs case- and accent-insensitive matching anywhere in the name; 96 card names carry diacritics ("Lim-Dûl", "Jötun").
- A key normalized once at sync time keeps the query a plain `ilike`, which PostgREST supports directly, with no RPC and no `unaccent` at query time. `unaccent` is not immutable, so it can't back a generated column or an expression index.
- The trigram index keeps `%text%` well inside SC-002 as the catalog grows.
- `range` with a 101-row probe gives exact end-of-results detection (FR-007) without the cost of `count: 'exact'` on every keystroke.
- The secondary `oracle_id` sort keeps pages stable when names tie.

**Alternatives**:
- An RPC `search_cards(text, offset)` using `unaccent`: one more database object and a function grant, and it still needs a trigram index on an expression it can't index.
- `ilike` on `name` alone: fails "jotun" → "Jötun".
- Client-side filtering: impossible with server paging.

**Consequence**: the search returns nothing until the maintainer runs `npm run sync:scryfall` after the migration. That run is needed anyway for the artist (FR-026). quickstart.md lists it as a prerequisite.

## R3. Catalog changes beyond the artist

**Decision**: migration `015_cards` adds three catalog columns: `printings.artist text` (FR-026), `printings.faces jsonb`, and `cards.search_name text` (R2). `faces` is `[{ name, image_url }]` for printings with two or more faces, each face's own image, else `null`.

**Rationale**:
- FR-012 copies "for double-faced cards, the faces" onto the owned card, but the catalog only has face images in `cards.card_faces`. Those come from whichever printing the sync met first, so for any other printing they would be the wrong art.
- Per-printing faces have to come from the same bulk row as the printing.
- This goes beyond the spec's assumption that "the only catalog change in this spec is the printing's artist". The deviation is purely additive and is called out in plan.md.

**Alternatives**: deriving the back image by rewriting `/front/` to `/back/` in the image URL depends on Scryfall's URL layout and breaks silently. Storing no faces drops part of FR-012.

## R4. Printings and card details for the add/edit modal

**Decision**: `CardCatalogService.detail(oracleId)` makes one request:

```
from('cards')
  .select('oracle_id, name, type_line, oracle_text, color_identity, commander_legality, card_faces,
           printings(scryfall_id, set_code, set_name, collector_number, rarity, lang, released_at,
                     image_url, image_small, artist, faces)')
  .eq('oracle_id', oracleId)
  .single()
```

The printings are sorted on the client: `released_at` desc, then set code, then collector number with numeric awareness (`localeCompare(…, { numeric: true })`). The largest card has 869 printings, under PostgREST's 1000-row cap for one embedded resource.

**Initial printing (FR-010)**: when adding, the first printing whose `lang` is `en`, else the first. When editing, the card's current printing (`scryfallId`). Before the list loads, or if it fails, the current printing is shown from the owned card's own copy (R13).

**Set filter**: `filterPrintings(printings, text)` keeps printings whose `searchKey(set_name)` contains the key, or whose set code starts with it. The selected printing always stays in the list.

**Rationale**: one round trip carries both the card-level fields that `canBeCommander` and the copied identity need, and every printing. Newest-first matches what most people are holding.

**Alternatives**: a separate printings query plus a card query means two failure points for one screen. Sorting by set code alone lists ancient sets first.

## R5. Search state, debounce and stale answers

**Decision**: a pure reducer in `card-search.util.ts`:
- **States**: `idle | short | loading | ok | empty | offline | failed`, plus `loadingMore` and `moreFailed` flags.
- **Debounce**: `CardSearchModal` runs a query 250 ms after the last keystroke, a timer whose duration is the behavior.
- **Stale answers**: each query carries a generation number. An answer whose generation isn't current is dropped (FR-009, "typing quickly").
- **Next page**: an `IntersectionObserver` on a sentinel after the last result, with the modal's scroll area as `root`, asks for it. It doesn't run while a page is loading, at the end, or after a failed page until "Tentar de novo".

**Rationale**: the timing rules in architecture.md allow a timer whose duration is the behavior. The reducer keeps every FR-009 state testable without a DOM. An observer avoids scroll-position math.

**Alternatives**: a scroll listener with arithmetic is more code and harder to test. RxJS `switchMap` would work, but signals plus a token is the codebase idiom (`FlowForm`'s stale-result token).

**Testing**: jsdom has no `IntersectionObserver`. A new `@testing/intersection-observer` helper (`installIntersectionObserver()`/`intersect()`/`restoreIntersectionObserver()`) mirrors `@testing/resize-observer`.

## R6. Catalog errors

**Decision**: catalog calls throw a `CatalogError` with `kind: 'offline' | 'failed'`:
- `offline` when `navigator.onLine === false` or `isNetworkError(error)` (from `cloud-error.util.ts`);
- `failed` otherwise.

The UI maps `offline` to the handoff's "Sem conexão…" plate and `failed` to "Não foi possível acessar o catálogo…". Both offer "Tentar de novo". No `error.message` is ever shown (FR-025, SC-007).

**Rationale**: the existing offline detection is reused. `mapCloudError` is shaped for auth forms (field keys), so the catalog gets its own two-way split in the same file style.

## R7. Owned-card writes

**Decision**:
- `CardService` user mutations (`add`, `update`, new `mergeInto`) persist through `writeRows` (per-row puts/deletes and tombstones in one transaction), like `CollectionService`/`DeckService`, instead of `replaceStore` on the whole store. `applySyncResult` keeps `replaceStore`.
- `mergeInto(targetId, removeId | null, addQuantity)` is one signal update plus one transaction: target `quantity += addQuantity` with a fresh `updatedAt`, plus, for an edit merge (FR-019), a delete and a tombstone for the edited row.

**Rationale**:
- FR-019's merge must drop one row and update another all-or-nothing.
- Rewriting thousands of rows on every add would make "Salvar e adicionar outra" slower as a collection grows (SC-004 territory).
- `writeRows` already accepts `cards`.

**Alternatives**: `update` + `remove` as two queued `replaceStore`s is not atomic and costs O(n) per write.

## R8. `addedAt` and the list order

**Decision**:
- `CardEntry.addedAt: string` (ISO) is required. `add()` stamps it, like `id`/`updatedAt`; `update`/`mergeInto` never touch it.
- `CardService.byLocation` is a `computed` `Map<locationId, CardEntry[]>`, each list sorted `addedAt` desc then `id`. Built in one pass, it is read by the collection page and the holding box.
- Remote: `added_at timestamptz not null default now()`.
- **No migration**: no local or remote card exists yet (`card_entries` is empty, and no add UI shipped since spec 010).

**Rationale**: FR-002/FR-021. One shared index avoids re-filtering thousands of cards per page and per sweep frame.

## R9. Duplicate matching (FR-015/FR-019)

**Decision**:
- **The match**: a pure `findMatches(cards, key, collectionIds, excludeId?)` returns the rows whose `scryfallId|finish|language|condition` equals the draft's and whose `locationId` is a collection. Deck cards and holding-box cards don't match.
- **The edit check**: excludes the edited row itself.
- **Place order**: rows in the destination collection first, then the others by their collection path's PT-BR name order, then quantity desc. The first is preselected. Each row is one place, so two separate rows in one collection appear twice, each with its quantity.
- **D1a or D1b**: one match shows D1a (the existing row's plate), two or more show D1b (the "Onde ela está" dropdown). In both, "Somar à quantidade existente" is preselected.

**Rationale**: the destination is the likeliest merge target. Listing per row keeps "the result matches their choice" exact (SC-005) when a person keeps deliberate separate rows. The D1b handoff leaves the default and order open and allows this choice.

**Alternatives**: highest quantity first is less predictable. Grouping by collection hides which row grows.

## R10. Subcollections or a deleted collection at save time (FR-017)

**Decision**:
- **Destination**: `firstLeaf(id, childrenOf)` (collection-tree.util) descends through `childrenOf.get(id)[0]`, already in `compareByName` order, until it reaches a collection without children. The save resolves it at the moment it writes, and again after the duplicate notice's "Continuar".
- **Subcollections appeared**: when the destination differs from the opened collection, the card goes there and the moved notice opens (destination color, "Ok" only).
- **Collection deleted**: `CardFlow` watches the target. Once it's gone from `CollectionService.byId()`, the open card modals close, nothing is saved, and the toast "Nada foi salvo" shows. The area's existing missing-place redirect takes the person back.
- **Edited card gone**: the same watch closes an edit whose card left the collection (a sync), with "Nada foi salvo · Esta carta não está mais nesta coleção."

**Rationale**: this mirrors 008 FR-029's first-child rule (`resolveMixedCollections`) and keeps the existing redirect as the single navigation path.

## R11. `canBeCommander` at add time

**Decision**: `canBeCommander(typeLine, oracleText, cardFaces)` returns true when the type line contains both "Legendary" and "Creature", or the oracle text contains "can be your commander" (case-insensitive). When `oracle_text` is null, the faces' oracle texts are joined by newlines. It is computed once in `entryFromPrinting`. Edits never recompute it.

**Rationale**: FR-021, and the rule recorded in the card-features reference.

## R12. Card colors (FR-032)

**Decision**: `cardPalette(colorIdentity)` in `card-colors.util.ts` returns `{ stops: string[]; roles: Roles }`:

| Color identity | Stops | Roles |
|---|---|---|
| 1 color | that color's base | `rolesFor` |
| 2–3 colors | their bases in WUBRG order | `rolesFor` |
| 4 colors | silver `#b6b8c2`, `#e8e9ee`, `#8d8f9b` | silver main/light/dark |
| 5 colors | gold `#c49a3c`, `#f0d98a`, `#9a7424` | gold |
| colorless | neutral `#a89e96`, `#6b635c` | neutral |

- **Hover state**: the "hover" role values for silver, gold and neutral are their light variants; for neutral, `#c2b9b1`, recorded in DESIGN.md.
- **DESIGN.md**: the hexes become a "Card colors" subsection, a named exception to the Identity Rule (they represent a card, like swatches represent an identity).
- **Where they apply**: tile hover stops, card modal roles, duplicate notice roles.
- **The moved notice** uses `rolesFromHex(collectionHex)` (all three roles one color, hover = the same hex).

**Rationale**: the spec's assumption fixes the hexes, and Constitution V requires them in DESIGN.md before building.

## R13. Editing offline

**Decision**: `printingFromEntry(card)` builds a `CatalogPrinting` from the owned card's copied fields (set, number, name, image, artist, faces). The edit modal shows it at once as the selected printing. The catalog list loads in the background:
- **On success**: it becomes the options, with the current printing matched by `scryfallId`.
- **On failure**: the selector shows the PT-BR error and "Tentar de novo" in place of its options, and the rest of the form saves normally (FR-024).

**Rationale**: FR-024 and FR-028. The artist is on the record precisely so this works.

## R14. Modal shells and stacking

**Decision**:
- **Sizes**: `CompactModal` gains `size: 'compact' | 'wide' | 'split'`, a ring width of 480 / 720 / 880 px. The 480px default changes nothing for existing dialogs.
- **Search modal**: `wide` with a fixed 640px face height. Only its results area scrolls, so the fluid height is off for this size.
- **Card modal**: `split`, fluid as usual.
- **Notices**: the duplicate and moved notices are `compact`.
- **Stacking**: the card modal stacks on top of the search modal as a second native modal `<dialog>` in the top layer, and Esc closes only the top one.
- **Toast host**: `CompactModal` gains a `<app-toast-outlet [active]="true" />`, so "Carta adicionada" after "Salvar e adicionar outra" shows inside the still-open search modal. Today only `ThemedModal` and the drawer host one.

**Rationale**: it reuses the mount/destroy, `locked`, phone full-bleed and fluid-height contract instead of a third modal shell. The 720/880 widths come from the handoff. The "only one modal open" rule in architecture.md concerns the entry and profile modals, not view dialogs.

**Alternatives**: `ThemedModal` is the auth blueprint with an identity pane and wordmark rules, which is the wrong shape. A new shell would duplicate `CompactModal`.

**Toast color**: the handoff asks for toasts in the collection's color. The toast follows its host's roles: the profile's at the app root and in the search modal (profile-colored), and that rule stays. This is recorded as a deviation from the handoff in ui.md §5.

## R15. Custom dropdown

**Decision**: a new DS primitive `SelectList` (`shared/ds/select-list/`):
- **Trigger**: a `<button class="field__input">` with `aria-haspopup="listbox"`/`aria-expanded`.
- **List**: a `role="listbox"` popup with `role="option"` items and `aria-activedescendant`. Arrows, Home and End move, Enter or Space picks, Esc closes the list and stops the event, so the dialog stays open. Clicking outside closes it.
- **Options**: projected through an `<ng-template>` per option.
- **Users**: the printing selector (thumbnail, set · code · number, artist) and the D1b "Onde ela está" field.

**Rationale**: a native `<select>` can't show thumbnails or two-line options (handoff C3, D1b). One primitive serves both. Finish, language and condition stay native `<select class="field__input">`, since their options are plain text.

## R16. Infinite scroll in the list and thousands of cards

**Decision**:
- **Rendering**: the card grid renders every card in a `@for` (track `id`). Each tile has `content-visibility: auto` with `contain-intrinsic-size` matching the 5:7 tile, so off-screen tiles skip layout and paint.
- **Images**: `loading="lazy"` and `decoding="async"`.
- **No virtual scroller**: none is added.

**Rationale**: SC-004 with several thousand cards. `content-visibility` gives most of a virtual list's win with no scroll-position code. It also keeps the page sweep's retained leaving page a plain DOM copy.

**Alternatives**: a virtual scroller (CDK is excluded, and a hand-written one is a lot of code), or incremental rendering via `afterNextRender` chunks, which is held in reserve if measuring shows a need.

## R17. Sticky header and side column

**Decision**:
- **Sticky regions**: inside `main.view-area` (still the only scroll container), the collection page's header block (path, title, list bar) is `position: sticky; top: 0` with the 32px fade beneath it. The 220px side column is `position: sticky; top: 0` in its own grid column, so no card passes behind it.
- **"Only the grid scrolls"**: this is achieved visually. No nested scroll container is created.
- **Phone**: the header is not sticky; the summary line sits above the grid and the disabled search sits below it.

**Rationale**: FR-031. The legal notice stays at the end of the scroll, and `--bottom-bar-height` keeps working. A nested scroller would break both rules in architecture.md's page shell.

## R18. Display mode preference

**Decision**: `CardViewModeService` keeps `'images' | 'details'` (default `'details'`) per profile in `localStorage` under `grm-card-view:{profileId}`, read through a `linkedSignal` on `ProfileStore`'s active profile id. Every read and write is wrapped in try/catch. `ProfileLifecycleService` removes the key when it deletes a profile. The mode is never synced.

**Rationale**:
- FR-030: per profile on the device.
- It is a cosmetic preference like `grm-nav-pinned`, so it doesn't warrant a meta record, hydration in `ProfileSessionService`, or cross-tab plumbing.
- Removing the key on delete keeps profiles isolated.

**Alternatives**: a `meta` record in the profile database gives isolation by construction, but it is async-hydrated, so the grid would flash the default.

## R19. Languages

**Decision**: `CARD_LANGUAGES` in `card.model.ts` uses the reference's codes, with PT-BR names and short labels:

| Code | Name | Label | | Code | Name | Label |
|---|---|---|---|---|---|---|
| `en` | Inglês | EN | | `jp` | Japonês | JP |
| `pt` | Português | PT | | `kr` | Coreano | KO |
| `sp` | Espanhol | ES | | `ru` | Russo | RU |
| `fr` | Francês | FR | | `cs` | Chinês simplificado | ZHS |
| `de` | Alemão | DE | | `ct` | Chinês tradicional | ZHT |
| `it` | Italiano | IT | | | | |

The order is English, then Portuguese, then the rest as listed. The details plate shows the label, for example `Foil · EN · NM`.

**Rationale**: these are the spec's assumption (the reference set) and LigaMagic-style labels that Brazilian players read.

## R20. Quantity limit

**Decision**: the form accepts whole numbers from 1 to 9999. The error is "Use um número inteiro de 1 a 9.999." Merging adds without a cap. The database check stays `quantity > 0`.

**Rationale**: the spec lets the plan set a sane limit. 9999 rules out typos like 11111 without constraining real collections. A merged row exceeding it is harmless.
