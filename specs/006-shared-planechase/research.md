# Research: Shared Planechase

**Feature**: `006-shared-planechase` | **Date**: 2026-09-27

The spec has no open NEEDS CLARIFICATION items. Four clarification sessions and the design handoff
(`design_handoff_shared_planechase/`) settle the behavior and the visuals. This file records the
technical decisions the spec leaves to the plan. Each one lists the decision, the rationale and the
rejected alternatives.

Live facts checked on 2026-09-27:
- **Supabase** (project `hyzbkxraanzhdyhtnadf`):
  - `printings` has `scryfall_id, oracle_id, set_code, collector_number, lang, image_url, set_name,
    rarity`. There is no border color, no release date and only the `normal` image.
  - `cards.layout = 'planar'` marks every plane and phenomenon: 184 distinct plane names and 21
    phenomena across `ohop`, `opc2`, `opca`, `moc`, `who`, `punk`, `pssc`, `dci` and `phop`. Every
    planar printing in the catalog is `lang = 'en'`.
  - The latest migration is `005_delete_own_account`. Default privileges for the API roles are
    revoked (`revoke_unused_default_privileges_from_api_roles`), so a new table needs explicit grants.
- **Scryfall's image host** (`cards.scryfall.io`):
  - It answers with `Access-Control-Allow-Origin: *` and `Cache-Control: public, max-age=31556952`.
  - A `large` image is about 150 KB and a `small` one about 10 KB.
- **Oracle wording of the ability** is irregular:
  - Planes: the ability usually starts "Whenever chaos ensues". But there are variants: "When chaos
    ensues", "Chaos: …", a flavor-word prefix ("Praise Him — Whenever chaos ensues…"), a typo in
    one card ("Whenever Chaos ensures", on No Way Out), and chaos folded into another trigger
    (Shy Town, Sky Deck, Jalira's Show).
  - One plane has no chaos ability at all (Ghirapur Grand Prix).
  - Phenomena usually read "When you encounter …", but some Unknown-event phenomena don't
    (Probability Flux, Year-End Review, Team-Up!).

---

## R1. The card data file is generated from the Supabase catalog, with oracle_id as the identifier

- **Decision**:
  - `scripts/sync-planechase.ts` (run with `npm run sync:planechase`, via
    `tsx --env-file=.env`, like `sync:scryfall`) reads with the service-role key:
    - `cards` where `layout = 'planar'`
    - then `printings` for those `oracle_id`s where `lang = 'en'` and `border_color <> 'gold'`
  - Two plain queries, with no embedded join: about 205 ids fit in one `.in()`.
  - **Identifier**: `oracle_id`. It is stable across reprints, which FR-003 requires. One entry per
    oracle is also one entry per English name.
  - **Printing**: the newest one wins, ordered by `released_at` descending, then `set_code`, then
    `collector_number`. The tie-breaks keep the output deterministic.
  - A card with no qualifying printing (gold only) is dropped. Cards are sorted by set (newest set
    first, then `set_code`), then by name. The script writes `JSON.stringify(data, null, 2)` plus a
    newline, so a rerun on the same catalog is byte-identical (FR-024, SC-009).
  - If any selected printing has a null `border_color`, `released_at` or image address, the script
    stops with the message "run `npm run sync:scryfall` first". It never writes a partial file.
- **Rationale**: The spec (FR-024) fixes the source. `oracle_id` is already the catalog's card key,
  and a name-based id would break on an Oracle rename.
- **Alternatives rejected**:
  - *Key by `scryfall_id`*: it changes when a newer printing appears, which would silently reset
    saved selections.
  - *Key by name*: Oracle renames happen (the Unknown-event planes are young).

## R2. Splitting out the chaos or encounter ability

- **Decision**: The script splits each card's `oracle_text` into paragraphs (`\n`):
  - **Phenomenon**: `text = ''` and `ability` = the whole Oracle text. A phenomenon is a single
    encounter effect, and the handoff omits static text for phenomena.
  - **Plane**:
    - `ability` = the last paragraph matching `/\bchaos ensue[sd]?\b|\bchaos ensures\b|^chaos:/i`,
      and `text` = the remaining paragraphs joined with `\n`.
    - A small `ABILITY_OVERRIDES` map in the script, keyed by `oracle_id`, can force a paragraph
      index or `null` for cards the pattern gets wrong.
    - A plane with no match and no override gets `ability: null`.
  - The report (FR-024a) lists every plane that ended with `ability: null`, so the maintainer
    confirms it's genuine, as it is for Ghirapur Grand Prix, or adds an override.
  - In the app, a plane with `ability: null` shows no plate. A "Caos" roll on it shows the sub line
    "Este plano não tem habilidade de caos." (the card's text still applies).
- **Rationale**: Every plane in the catalog, apart from Ghirapur Grand Prix, matches the pattern
  (checked live). The override map covers future oddities without writing a parser for Unknown
  flavor text.
- **Alternatives rejected**:
  - *Store the split by hand for all 205 cards*: that duplicates the Oracle text and drifts on
    Oracle updates.
  - *Let the translation skill do the split*: then the English fallback (FR-004a) would have no
    split for untranslated cards.

## R3. Detecting stale translations

- **Decision**:
  - The script writes `hash` on each card: the first 16 hex characters of the SHA-256 of
    `JSON.stringify([typeLine, text, ability])`, computed with `node:crypto`.
  - The skill copies that value into each translation as `sourceHash`.
  - At runtime a translation is used only when `translation.sourceHash === card.hash`. Otherwise
    the card falls back to English (FR-004a). There is no hashing in the app.
  - The script compares the new hashes with the translations file to report "needs translation"
    (FR-024a). It diffs against the previous `cards.json`, read before it overwrites the file, to
    report new, changed and removed cards.
- **Rationale**: This gives one deterministic value computed by one party, and the runtime check is
  a string comparison.
- **Alternatives rejected**:
  - *Store the English text inside the translations file*: it doubles the file for the same check.
  - *Hash in the app with `crypto.subtle`*: it's async, and pointless since the data is static.

## R4. How the card data reaches the app

- **Decision**:
  - `PlanechaseCatalogService` loads both files with dynamic `import()`, the same rule as for
    tesseract.js. They become one lazy chunk of about 250 KB, kept out of the initial bundle.
  - A route resolver (`planechaseCatalogResolver`) on the three Planechase routes awaits it, so
    views read the catalog synchronously. The gameplay menu doesn't need it.
  - The files are typed through a `PlanarCardData`/`PlanarTranslations` interface and a cast.
  - `tsconfig.json` gets `"resolveJsonModule": true` if the current settings don't already
    imply it.
- **Offline**:
  - PWA: the service worker's `app` asset group prefetches `/*.js`, so the chunk is cached at
    install.
  - Android: Capacitor serves it from the APK.
  - Nothing to add either way (FR-002).
- **Alternatives rejected**:
  - *Static import*: it adds about 250 KB to every page load for a feature most visits don't open.
  - *Fetch from `public/assets/`*: that's a second offline story (an `assets` group,
    `installMode: lazy`) for no gain.

## R5. Where the game, the device selection and the profile selection live

- **Decision**: No schema change to either IndexedDB database. Each value goes in an existing
  `meta` store:

  | Value | Database | `meta` key |
  |---|---|---|
  | The game in progress (FR-015) | `grimorio-device` | `planechaseGame` |
  | The selection with no profile active (FR-020) | `grimorio-device` | `planarSelection` |
  | A profile's selection (FR-020) | `grimorio-profile-{id}` | `planarSelection` |

  - The profile DB is reached through `entity-store.ts`'s `getMeta`/`setMeta` with a captured
    handle, as `SyncService` does for `lastSyncedAt`.
- **Rationale**:
  - The game is device-scoped by spec. The selection is profile-scoped, or device-scoped when no
    profile is active.
  - The `meta` stores already exist, so there is no `DB_VERSION` bump and no upgrade path (the
    project rule: no migrations).
  - Deleting a profile's database takes its selection with it, with no extra code.
- **Alternatives rejected**:
  - *New object stores*: they need a version bump and an upgrade branch for existing databases,
    which is exactly the migration code the project forbids.
  - *`localStorage`*: it breaks the idb persistence convention (Principle VI).

## R6. Selection persistence follows the entity-service shape

- **Decision**: A new `PlanarSelectionService` (`core/services/`) mirrors
  `StorageLocationService`:
  - `load(profileId | null)`, `whenReady()`, `flush()` and a private serialized `enqueueWrite`
    that captures the target database when enqueued.
  - A `selection` signal of `PlanarSelection | null`, where `null` means never changed and
    everything is enabled (FR-018).
  - `save(disabledIds)` stamps `updatedAt`. `applySyncResult(selection)` doesn't restamp.
  - It joins `ProfileSessionService.entityServices`, so a switch flushes it and reloads it with the
    others. `load(null)` reads the device key.
- **Rationale**: This is Principle VI verbatim. Loading in the switch sequence gives the
  "no component sees another profile's selection" guarantee for free.
- **Alternatives rejected**:
  - *Store it on `ProfileRecord`*: that covers the profile case but not the device case, and the
    device registry isn't synced.

## R7. Cloud sync of the selection: a table, reconciled with `reconcileEntities`

- **Decision**:
  - The new table `public.planechase_selections` has:
    - `user_id uuid primary key references auth.users(id) on delete cascade`
    - `disabled_ids text[] not null default '{}'`
    - `updated_at timestamptz not null default now()`
  - It gets owner-only RLS and `select, insert, update, delete` to `authenticated`, in the same
    migration.
  - `SyncService` gains a `syncPlanarSelection` step after cards. It maps the local selection and
    the remote row to a single `{ id: 'planar-selection', disabledIds, updatedAt }` entity and runs
    `reconcileEntities(localOrEmpty, remoteOrEmpty, [])`.
    - If the local copy won, it upserts with `onConflict: 'user_id'`.
    - Otherwise it applies the merged copy with `applySyncResult`.
    - No tombstones: a selection is never deleted, only replaced.
  - `hasUnsyncedChanges` gains `planarSelectionUpdatedAt`, so the profile modal's unsynced warning
    counts it.
- **Rationale**: Whole-selection last-write-wins is the spec's rule. Reusing the reconciler satisfies
  Principle VI's "reconciled LWW through `reconcileEntities`" instead of adding a second LWW
  implementation.
- **Alternatives rejected**:
  - *`user_metadata` (like `grm_colors`)*: up to about 205 UUIDs, roughly 7.5 KB, would ride in
    every JWT.
  - *One row per disabled card*: that's per-card merging, which the spec rejects, plus tombstones
    for re-enabling.

## R8. The catalog sync's new columns (FR-024b)

- **Decision**:
  - A migration adds `border_color text`, `released_at date`, `image_small text` and
    `image_large text` to `public.printings`. They are nullable, because existing rows fill in on
    the next sync run. The existing `select` grants to `anon`/`authenticated` cover them.
  - `scripts/sync-scryfall.ts` maps `border_color`, `released_at`, and
    `image_uris.small/large` (falling back to `card_faces[0].image_uris`) in `toPrintingRow`.
  - Everything comes from the same bulk download.
- **Rationale**: This keeps a single Scryfall touchpoint (Assumptions, FR-024b), and the
  Planechase script stays a pure catalog read.
- **Alternatives rejected**:
  - *Derive `small`/`large` from the `normal` URL by string replacement*: it relies on
    undocumented URL structure.

## R9. Randomness

- **Decision**: A pure util, `core/utils/crypto-random.util.ts`, provides:
  - `randomInt(n, source = crypto.getRandomValues)`: rejection sampling over `Uint32`
    (`limit = 2^32 - (2^32 % n)`), so there is no modulo bias.
  - `shuffle(items, randomInt)`: Fisher–Yates on a copy.
  - `rollPlanarDie(randomInt)`: `randomInt(6) + 1`, then 1 → `planeswalk`, 6 → `chaos`, and
    anything else → `blank`.
  - Game code takes a `RandomInt` function, so tests pass a scripted sequence.
  - A statistical spec rolls 6,000 times with the real source and asserts each result within
    ±2 points of expected (SC-003). Two points is about 4σ at that sample size, so the test is
    effectively never flaky.
- **Rationale**: FR-008/008a spell the method out. Injecting the source keeps the game util pure
  and deterministic in tests.

## R10. The game as a pure state machine

- **Decision**:
  - `core/utils/planechase-game.util.ts` holds `PlanechaseGame` transitions as pure functions:
    `startGame`, `roll`, `planeswalk`, `confirmPhenomenon`, `resetCost`, `reshuffle`, `undo`
    (data-model.md).
  - Each transition returns a new state. Transitions that can be undone set
    `undo = previousWithoutUndo`. `startGame`, `reshuffle` and `undo` set `undo = null`
    (FR-015a).
  - Draws take the top of `drawOrder`. An empty `drawOrder` on a needed planeswalk sets
    `pending = 'reset'` (FR-013).
  - `PlanechaseGameService` (`core/services/`) wraps it:
    - a `game` signal hydrated from the device DB
    - a serialized write queue
    - actions that apply a transition and persist the result
    - `whenReady()`, awaited in `app.config.ts`'s initializer next to
      `ProfileSessionService.whenReady()`, so the menu's "Continuar" and the page never see
      pre-hydration state
- **Rationale**:
  - The trickiest correctness surface (undo, the phenomenon chain, reset during a pending
    planeswalk, the 901.5 start) becomes unit-testable without IndexedDB.
  - Storing the full state, undo snapshot included, gives FR-015 for free.
- **Alternatives rejected**:
  - *Mutable service state with ad-hoc undo*: snapshots are easy to get subtly wrong. For example,
    forgetting `drawOrder` would change what comes next after an undo.

## R11. Cards removed from the card data by an update

- **Decision**:
  - On hydration the game service drops unknown ids from `list`, `used` and `drawOrder`, and from
    the undo snapshot the same way.
  - If `current` itself is gone, the game performs a planeswalk with no undo, so the table lands on
    a real card. If that finds nothing to draw, it shows the all-used state as usual.
  - The selection keeps unknown ids in `disabledIds`. They are harmless, and keeping them means a
    card that returns in a later update stays disabled. Every consumer computes the enabled list
    against the current catalog.
  - "Iniciar partida" validates that enabled list (FR-007).
- **Rationale**: This matches the spec's edge case ("a game already in progress keeps going with
  its remaining cards"). The current-card case isn't spelled out, and silently landing on the next
  card is the least surprising outcome.

## R12. Card images: Cache Storage, read by the app itself

- **Decision**:
  - `PlanarImageService` (`core/services/`) exposes `imageUrl(address): Promise<string | null>`:
    1. It looks the address up in the Cache Storage cache `grm-planechase-images`.
    2. On a miss it runs `fetch(address, { mode: 'cors' })` and `cache.put`s the response.
    3. It returns an object URL for the blob, memoized per address for the session.
    4. On failure it returns `null`, and the view shows the name placeholder (FR-006).
  - A `PlanarImage` component renders it. For tiles it starts the load from an
    `IntersectionObserver` with `rootMargin: '200px'` ("about to scroll into view"). Tiles in a
    collapsed set aren't rendered at all (`@if`), so they never load.
  - There is no eviction. Viewing everything tops out at about 205 × (150 KB + 10 KB), roughly
    33 MB, which is acceptable for a table tool.
- **Rationale**:
  - It works identically under `ng serve`, the PWA and the Capacitor WebView. The Angular service
    worker is inert in dev, and is not relied on inside Capacitor.
  - CORS is open on the image host (checked), so responses are readable, not opaque.
- **Alternatives rejected**:
  - *An `ngsw-config.json` `dataGroups` entry*: dev and the APK wouldn't cache.
  - *Plain `<img>` plus the HTTP cache*: there's no offline guarantee, since the browser may evict
    it.

## R13. Routes, lazy boundary and shell integration

- **Decision**:
  - Routes (from the handoff), with no guard (FR-002):
    - `/modes`: `GameModes`
    - `/modes/planechase`: `Planechase`
    - `/modes/planechase/rules`: `PlanechaseRules`
    - `/modes/planechase/deck`: `PlanechaseDeck`
  - The components are imported eagerly like every other view. Only the card data is lazy (R4).
  - `NAV_DESTINATIONS` gains `{ label: SHELL.modes, path: '/modes' }` after "Coleção". Its
    `exact: false` already marks it current on all four routes.
  - Returning from the rules or the deck settings is a plain `routerLink` to `/modes/planechase`.
- **Rationale**: This keeps the one-folder-per-view convention and needs no new routing pattern.
  The heavy part (the data) is already split off.

## R14. The deck-settings draft is component state

- **Decision**:
  - `PlanechaseDeck` holds the draft as a `signal<ReadonlySet<string>>` of disabled ids, initialized
    from the saved selection. The draft dies with the component, so leaving by any route silently
    discards it (clarification: A).
  - A per-set collapsed map is also component state, not saved (FR-017).
  - "Salvar":
    1. validates the draft with `validateSelection`
    2. if a game is in progress and the enabled set changed, switches the footer to the inline
       confirm
    3. on confirm: `selection.save()`, `game.start(enabledIds)`, then navigates to
       `/modes/planechase` (FR-022)
    4. without a game: saves, then navigates back
- **Rationale**: This is the simplest shape that meets "discard on leave" with no route guard.

## R15. The one-time effects

- **Decision**:
  - Two components in `shared/gameplay/`, `PlaneswalkFlair` and `ChaosFlair`, port `runPw()` and
    `runChaos()` from `Planechase.dc.html`. Each is a single `requestAnimationFrame` clock driving
    the mask, the glow and the sparks.
  - Each exposes `play(): Promise<void>` and removes its DOM on finish.
  - The page calls them from the action handlers, not from an `effect`: a reload or an undo must
    never replay a flair.
  - Under `prefers-reduced-motion: reduce` (the existing `media-query.ts` helper), `play()` resolves
    at once and the content swaps (FR-011a).
  - The planeswalk flair clones the outgoing card block before the state change, as the reference
    does.
- **Rationale**: The handoff reports that CSS-only versions drifted out of sync, and it chose rAF.
  Triggering from the handlers ties each flair to a user action.

## R16. The phone dock (FR-012a)

- **Decision**:
  - Below `bp.mobile` the game page renders the dock as `position: sticky; bottom: 0` inside the
    view. `.view-area` stays the scroll container.
  - The dock holds the result, "Próxima: {N}", Desfazer / Planeswalk / Zerar custo and the primary
    button.
  - The legal notice still follows the view. Once scrolled to the end, the dock rests just above it
    and stays visible.
- **Rationale**: The shell forbids views from owning the page scroll (architecture.md, "Page
  shell"). Sticky keeps the controls on screen without a second scroll region.
- **Alternatives rejected**:
  - *`position: fixed`*: it overlaps the legal notice and the drawer's layer, and needs manual
    bottom padding.

## R17. Copy and rules text

- **Decision**:
  - A new `core/utils/planechase-copy.ts` holds every Planechase string. The handoff is the source,
    and the spec's overrides apply: no counts, so the reset confirmation body loses "{usados}".
  - The seven "Como jogar" sections (from the handoff's `rules` array) live in the same file. They
    are reviewed against the spec's "Rules research" list before commit.
  - `SHELL.modes = 'Modos de jogo'` goes in `entry-copy.ts` next to `SHELL.collection`.
- **Rationale**: `entry-copy.ts` is the auth and shell copy file. A separate file keeps a large
  domain's strings together without bloating it.
- **New strings not in the handoff**, approved by the maintainer on 2026-09-27:
  - The refused-start message with a link (FR-007): "Seu baralho salvo tem menos de 10 cartas ou
    nenhum plano." · "Ajustar baralho".
  - The no-chaos sub line (R2).
  - "Imagem indisponível sem conexão" (the handoff has it). For `aria-label`s, "plano"/"fenômeno"
    (the handoff has these).
  - The reset confirmation body without a count: "Os planos usados voltam ao baralho. O plano atual
    continua na mesa."

## R18. The translation skill

- **Decision**: `.claude/skills/planechase-translate/` contains:
  - `SKILL.md`: the procedure.
    1. Read `cards.json` and `cards.pt-br.json`.
    2. The work list: cards with no translation or with `sourceHash ≠ hash`, plus any names passed
       as arguments.
    3. Translate `typeLine`, `text` and `ability` following the glossary.
    4. Write the file sorted by id, with 2-space JSON.
    5. Drop ids that aren't in `cards.json`.
    6. Print the translated names.
  - `glossary.md`: official PT-BR terms. Plane/Plano, Phenomenon/Fenômeno, chaos ensues/o caos se
    instaura (to be confirmed against official printings), planeswalk (kept), `{CHAOS}` → `{CAOS}`,
    and a creature-type/keyword table seeded from official PT printings.
  - **Irregular chaos and encounter openings**: the glossary has a section mapping every variant
    found in the catalog (R2's live facts) to one canonical PT-BR opening, so the same trigger
    always reads the same way:

    | English opening | Rendered as |
    |---|---|
    | "Whenever chaos ensues" | the canonical chaos trigger |
    | "When chaos ensues" | the canonical chaos trigger |
    | "Chaos:" | the canonical chaos trigger |
    | "Whenever Chaos ensures" (typo, No Way Out) | the canonical chaos trigger |
    | "When you encounter …" | the canonical encounter opening |
    | Phenomena with no "encounter" wording (Probability Flux, Year-End Review, Team-Up!) | translated as written, with no opening invented |

    - **Chaos folded into another trigger** (Shy Town, Sky Deck, Jalira's Show: "Whenever you
      planeswalk here or chaos ensues"): the combined trigger uses the same canonical chaos
      wording.
    - **Ability-word/flavor prefixes** ("Praise Him —", "Song of the Ood —", "Will of the council —"):
      - kept in English when they are proper names or references
      - translated when an official PT-BR ability word exists (e.g. "Vontade do conselho")
    - The skill checks each translated `ability` for the canonical opening and lists any that
      deviate, for the maintainer to review.

  It never touches a card whose hash matches unless that card is named (FR-025/026).
- **Rationale**: This is the spec's workflow. The skill is instructions for the maintainer's Claude
  Code session, not code.
