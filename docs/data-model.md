# Data Model

What grimório persists in Supabase, and **why** each field is or isn't stored. This is a
record of *intent* — the live schema will live in Supabase migration files once they exist.
Keep this in sync whenever a table or column decision changes.

Full product context: [project-brief.md](project-brief.md) (see *Card Data Ingestion* for the
card-data rationale).

## Conventions

- **Cards are keyed by `oracle_id`** (a UUID, language- and printing-independent), never
  `scryfall_id`. See the brief's *Key Data Model Decision*.
- **Oracle-level vs printing-level.** A fact is *oracle-level* if it's true for the card
  regardless of which printing or language you hold (name, rules text, mana cost, colour
  identity, Commander legality). It's *printing-level* if it depends on the physical copy
  (set, collector number, rarity, artist, exact art). Only oracle-level data goes in `cards`;
  printing-level data is deferred (see *Deferred* below).
- **Row Level Security.**
  - `cards`: RLS on. `SELECT` for authenticated users; inserts/updates only via the
    `service_role` key used by the import script. No user ever writes to it.
  - Per-user tables: RLS on, every row scoped to `auth.uid()`.

## Table relationships

Kept up to date as tables are added, so a future change can be scoped by seeing what already
points where, without re-deriving it from the live schema.

```
cards (oracle_id PK)  ── shared, read-only reference data
  ↑ oracle_id FK ── printings (scryfall_id PK)  ── per-printing lookup
  ↑ oracle_id FK ── collection_items.oracle_id
  ↑ oracle_id FK ── deck_cards.oracle_id

collections (id PK, user_id)  ── per-user
  ↑ collection_id FK ── collection_items

collection_items (id PK)
  → collection_id FK → collections
  → oracle_id FK → cards
  → printing_id FK → printings (nullable — "I own this card" without a chosen printing)

decks (id PK, user_id)  ── per-user
  → commander_oracle_id FK → cards (nullable — unset until a commander is chosen)
  ↑ deck_id FK ── deck_cards

deck_cards (id PK)
  → deck_id FK → decks
  → oracle_id FK → cards
  → printing_id FK → printings (nullable — same "no printing chosen" meaning as collection_items)
```

---

## `cards` — local trimmed card catalogue

Populated by the ingestion script from Scryfall's **Oracle Cards** bulk file (~30–35k rows,
one object per `oracle_id`), refreshed ~weekly.

> **Representative-printing caveat.** The Oracle Cards file picks one printing to stand in
> for each card. Any printing-level value in that object (set, rarity, artist, the specific
> art) is just whatever printing Scryfall chose — not authoritative. That's why those fields
> are excluded rather than stored with a false sense of accuracy.

### Import filter (applied before trimming)

The bulk file is not pre-filtered to gameplay cards — non-gameplay objects (art cards,
tokens, emblems…) have their own distinct `oracle_id` and appear as separate rows sharing
only a name (e.g. an `art_series` "Aang, at the Crossroads // Aang, at the Crossroads" with
`type_line: "Card // Card"`, distinct from the real `transform` card of the same name). A
row is imported only if **all** of these hold:

- `games` includes `paper` — excludes digital-only (Alchemy / Arena) cards. *(This alone is
  not enough: the `art_series` example above also has `games: ["paper"]`.)*
- `layout` is **not** one of: `art_series`, `token`, `double_faced_token`, `emblem`,
  `scheme`, `planar`, `vanguard`, `augment`, `host`, `reversible_card` (no top-level
  `oracle_id` — see *Known limitations*).
- `oracle_id` is present *(belt-and-suspenders for any current or future layout without
  one — a single row missing it fails the whole upsert batch, not just that row)*.
- `set_type` is **not** one of: `memorabilia`, `token`, `minigame` *(secondary
  belt-and-suspenders check)*.

Open decision: `set_type == "funny"` (Un-sets, silver border). Mostly not Commander-legal —
currently **excluded**; revisit if silver-border support is ever wanted.

`layout` is kept as a stored column (below): it drives this filter, tells the app whether to
render one face or several, and future-proofs face handling.

### Stored columns

| Column | Scryfall source | Type / notes |
|---|---|---|
| `oracle_id` | `oracle_id` | UUID, primary key. |
| `name` | `name` | For double-faced / split cards this is `"Front // Back"`. |
| `mana_cost` | `mana_cost` | Text, `NULL` for multi-face layouts (`transform`, `modal_dfc`, `split`, …) — the per-face costs live in `card_faces`. |
| `mana_value` | `cmc` | Numeric. Stored (not recomputed) — hybrid/`{X}` costs make recomputation error-prone. |
| `type_line` | `type_line` | Text. Also used for "Legendary" checks and type filters. |
| `oracle_text` | `oracle_text` | English oracle wording. |
| `color_identity` | `color_identity` | Array of `W/U/B/R/G`. Needed for Commander deck colour-identity legality. |
| `power` | `power` | Text, nullable (creatures only; can be `*`, `1+*`). |
| `toughness` | `toughness` | Text, nullable. |
| `loyalty` | `loyalty` | Text, nullable (planeswalkers). |
| `layout` | `layout` | `normal`, `transform`, `modal_dfc`, `split`, `adventure`, … Drives the import filter and tells the app whether to render one face or several. |
| `commander_legality` | `legalities.commander` | Text: `legal` / `not_legal` / `banned`. Only this one format is stored. |
| `image_url` | `image_uris.normal`, else `card_faces[0].image_uris.normal` | Text. `transform` / `modal_dfc` have no top-level image — fall back to face 0's front image. |
| `card_faces` | `card_faces[]` (trimmed) | **JSONB, nullable.** `NULL` for single-face cards (the sentinel the app branches on). For multi-face cards, an array of face objects — see below. |

Optional / add only if a feature needs it: `colors`, `keywords`, `defense` (Battle cards).

### `card_faces` JSONB shape

Chosen over a separate `card_faces` table: smallest change, one `upsert`, mirrors Scryfall,
refresh stays idempotent (the whole array is replaced with the row). A relational
`card_faces` table is a clean later migration *if* face-level querying (filters, deck-builder
UIs) ever becomes a real need.

Populated for gameplay layouts that carry faces: `transform`, `modal_dfc`, `adventure`,
`split`, `flip`, `battle`, `meld`, `reversible_card`, `prepare`. Each element:

```
{ name, mana_cost, type_line, oracle_text, colors, power, toughness, image_url }
```

- `mana_cost` may be `""` (e.g. the back of a transform card); `colors` may be `[]`.
- `power` / `toughness` are `null` when the face has none.
- `image_url` = that face's `image_uris.normal`; may be `null` for `split` / `adventure` /
  `flip`, where the single image lives at card level.

Card-level `mana_cost` / `oracle_text` / `power` / `toughness` stay `NULL` for these cards
(matching Scryfall); the faces are authoritative.

Worked example — `transform` "Aang, at the Crossroads // Aang, Destined Savior"
(`oracle_id 96e5d4a1-…`): card-level `mana_cost`/`oracle_text`/`power`/`toughness` `NULL`,
`mana_value` 5, `color_identity` `{G,U,W}`, `layout` `transform`, `commander_legality`
`legal`, `image_url` = face 0 front image;

```
card_faces = [
  { name: "Aang, at the Crossroads", mana_cost: "{2}{G}{W}{U}",
    type_line: "Legendary Creature — Human Avatar Ally", oracle_text: "Flying\n…",
    colors: ["G","U","W"], power: "3", toughness: "3",
    image_url: "https://cards.scryfall.io/normal/front/f/e/fea89ca0-….jpg" },
  { name: "Aang, Destined Savior", mana_cost: "",
    type_line: "Legendary Creature — Avatar Ally", oracle_text: "Flying\n…",
    colors: [], power: "4", toughness: "4",
    image_url: "https://cards.scryfall.io/normal/back/f/e/fea89ca0-….jpg" }
]
```

### Deliberately NOT stored

| Field(s) | Why not |
|---|---|
| `id` / `scryfall_id`, `multiverse_ids`, `mtgo_id`, `arena_id`, `tcgplayer_id`, `cardmarket_id` | Per-printing / external-service identifiers. Not needed. |
| `set`, `set_name`, `set_type`, `rarity`, `artist`, `released_at` | Printing-level. `set`/`collector_number`/`lang` now live in `printings` (below); the rest still aren't captured anywhere. (`set_type` is still *read* during import as a secondary filter — see *Import filter* — just not stored.) |
| `games` | Used only as an import filter (paper-only), then dropped. |
| `colors` | `color_identity` covers our needs; `colors` adds little for v1. |
| `prices` | Volatile; would need frequent refresh. Out of scope. |
| `edhrec_rank`, `game_changer` | For the future recommendations engine (Phase 2), not now. |
| `legalities.*` (other formats) | Only Commander matters for the MVP. |
| `all_parts` / tokens, `rulings_uri` | Not shown yet. |
| `*_uris`, `related_uris`, `purchase_uris` | External links. |
| `reserved`, `foil`, `nonfoil`, `finishes`, `promo`, `reprint`, `variation`, `oversized`, `digital`, `booster`, `full_art`, `textless` | Printing / cosmetic flags. |
| `frame`, `frame_effects`, `border_color`, `security_stamp`, `card_back_id`, `watermark` | Cosmetic. |
| `highres_image`, `image_status`, `image_updated_at` | Image metadata. |
| `lang` | v1 ingests the English oracle file only; Portuguese is deferred. |

### Known limitations (v1)

- **Multi-face cards** are supported via `card_faces` (above), but: per-face `cmc` is not
  stored (rely on card-level `mana_value`; note Scryfall reports the *sum* for `split`
  cards); `meld` stores only the two faces of one card, not the link to its meld partner.
  `reversible_card` is excluded entirely (see *Import filter*) rather than handled as
  multi-face — those objects have no top-level `oracle_id`/`mana_cost`/etc. at all, since
  each face is really its own oracle-distinct card printed on one piece of cardboard, not
  one card with two faces; treating it like other multi-face layouts wrote `NULL`
  `oracle_id` rows and broke an entire import batch.
- **Printing tracking: populated, but only used by `deck_cards` so far.** The ingestion
  script sources Scryfall's *Default Cards* bulk file (one object per printing), which
  populates both `cards` (deduped to one row per `oracle_id`) and `printings` in a single
  download/run — see *Import filter* above and `printings` below. `deck_cards.printing_id`
  (below) is set by `BaralhosService`, with a printing picker in the add-card UI.
  `collection_items.printing_id` remains schema-only/unused — no service/UI code sets it —
  a deliberate scope choice, not a technical limitation. Finish/condition remain uncaptured
  either way.
- **English only.** No `printed_name` / `printed_text`.

---

## `printings` — per-printing lookup (set + collector number → card)

**Populated.** The ingestion script sources Scryfall's **Default Cards** bulk file (one
object per printing, ~90–110k rows after the same paper/layout filter used for `cards`)
instead of Oracle Cards — since a Default Cards row already carries every oracle-level field
too, one download populates both `cards` (deduped to one row per `oracle_id`) and `printings`
(every filtered row), instead of needing a separate script/download per table.

Exists to resolve "set code + collector number" (what OCR/card-scanning reads off a physical
card, and the more reliable recognition target than the card name — stable position/format
across foils, alt-arts, Universes Beyond frames) to a specific printing, and from there back
to the oracle-level data already in `cards`.

| Column | Scryfall source | Type / notes |
|---|---|---|
| `scryfall_id` | `id` | UUID, primary key. Identity of the printing (not the lookup key — see index below). |
| `oracle_id` | `oracle_id` | UUID, FK → `cards(oracle_id)`. The join back to oracle-level data. No `on delete cascade`: the import script only upserts into `cards`, never deletes, so there's no deletion path to guard against yet. |
| `set_code` | `set` | Text. |
| `collector_number` | `collector_number` | Text, **not numeric** — Scryfall uses values like `182a`, `★7`. |
| `lang` | `lang` | Text, default `'en'`. Only `en` ingested for now (matching `cards`), but kept so `(set_code, collector_number, lang)` stays unambiguous once Portuguese data lands — no migration needed then. |
| `image_url` | `image_uris.normal` | Text, nullable. Optional: lets the app show the *exact* scanned printing's art instead of `cards.image_url`'s representative-printing art. |

Unique index on `(set_code, collector_number, lang)` — the actual scan-resolution lookup.
Separate index on `oracle_id` — Postgres doesn't auto-index a foreign key column (only the
referenced side gets one via the target table's own PK), so without it every join back to
`cards`, or a future delete cascade, does a sequential scan.

RLS: same pattern as `cards` — `SELECT` for `authenticated`, writes only via `service_role`.

---

## Deferred (Phase 2+)

- **Portuguese.** Ingest localized data (`printed_name`, `printed_text`, localized images).
  No schema migration needed — everything is keyed on `oracle_id`.
- **Relational `card_faces` table** — migrate from the JSONB column if face-level querying
  (type filters, deck-builder UIs) becomes a real need.
- **`edhrec_rank`, `keywords`** for deck analysis / recommendations.

---

## `collections` — user-defined card groupings

A user can have any number of collections (e.g. "Binder", "Vault"), each with a name and a
color picked from a small app-side preset palette (stored as a key, not a raw hex — see
`@shared/constants`). A card may belong to any number of a user's collections; collections
are groupings, not an exclusive "this card lives here" ledger — that stricter modelling is
what the storage location/container system (Deferred, below) will eventually own.

**Naming exception:** `collections` / `collection_items` and their columns are named in
English, not pt-BR like the rest of the app's identifiers (CLAUDE.md's convention). This was
a deliberate choice to match the existing `cards` table's naming and the SQL/data layer in
general, rather than mixing languages within the DB schema.

| Column | Type / notes |
|---|---|
| `id` | UUID, primary key. |
| `user_id` | UUID, FK → `auth.users`. Owner. |
| `name` | Text. |
| `color` | Text. Preset-palette key, not a raw hex/RGB value. |
| `created_at` | timestamptz, default `now()`. |

RLS: full CRUD scoped to `auth.uid() = user_id` — the first table in the app that isn't
read-only for end users (contrast with `cards`).

## `collection_items` — cards within a collection

| Column | Type / notes |
|---|---|
| `id` | UUID, primary key. |
| `collection_id` | UUID, FK → `collections(id)`, `on delete cascade`. |
| `oracle_id` | UUID, FK → `cards(oracle_id)`. |
| `printing_id` | UUID, **nullable**, FK → `printings(scryfall_id)`. Which exact printing the user owns — nullable so "I own this card" stays valid without ever picking one (most adds are expected to leave this unset; a purist can set it manually, or a scanned add resolves it directly). Replaces an earlier bare-text `set_code` placeholder that had no FK and couldn't disambiguate printings sharing a set code. Not yet set by any service/UI code — schema only so far. |
| `quantity` | Integer, default `1`, `check (quantity > 0)`. Adding a card the user already has in that collection (same `oracle_id` + `printing_id`) increments this rather than inserting a new row; removing one copy decrements it, deleting the row once it hits 0. |
| `date_added` | timestamptz, default `now()`. Set once on insert; **not** touched when `quantity` changes later. |
| `updated_at` | timestamptz, default `now()`, bumped by a trigger on every `UPDATE`. Drives "last updated" ordering in the collection detail view — unlike `date_added`, this *does* move when `quantity` changes. |

Unique index on `(collection_id, oracle_id, coalesce(printing_id::text, ''))` — this is what
"add this card again" resolves against to decide insert vs. increment. (Postgres unique
constraints treat `NULL` as distinct from `NULL`, which would defeat this since most rows are
expected to leave `printing_id` unset — the `coalesce` sidesteps that.)

RLS: scoped indirectly — no `user_id` column here; policies check
`exists (select 1 from collections where id = collection_items.collection_id and user_id = auth.uid())`.

---

## `decks` — user-defined Commander decks

A user can have any number of decks, each with a name, a `format` (only `commander` is built —
column exists for future formats), and at most one commander. `commander_oracle_id` is a
denormalized pointer to the commander's `oracle_id` — the same card is also present as a row
in `deck_cards` (`is_commander = true`); this column exists purely so the commander's
color identity/name/image can be read with a single join back to `cards`, without also
joining through `deck_cards` every time the deck header is shown.

**Naming exception:** same as `collections`/`collection_items` — named in English to match
`cards`/`printings` and the rest of the SQL/data layer, not pt-BR like the rest of the app's
identifiers.

| Column | Type / notes |
|---|---|
| `id` | UUID, primary key. |
| `user_id` | UUID, FK → `auth.users`. Owner. |
| `name` | Text. |
| `commander_oracle_id` | UUID, **nullable**, FK → `cards(oracle_id)`. `NULL` until a commander is chosen; set/cleared by `BaralhosService.definirComandante`/`removerComandante`, kept in sync with the `is_commander` row in `deck_cards`. |
| `format` | Text, default `'commander'`. Only Commander is built for the MVP (per CLAUDE.md scope) — the column exists so a future format doesn't need a migration. |
| `created_at` | timestamptz, default `now()`. |

RLS: full CRUD scoped to `auth.uid() = user_id`, same pattern as `collections`.

## `deck_cards` — cards within a deck

| Column | Type / notes |
|---|---|
| `id` | UUID, primary key. |
| `deck_id` | UUID, FK → `decks(id)`, `on delete cascade`. |
| `oracle_id` | UUID, FK → `cards(oracle_id)`. |
| `printing_id` | UUID, **nullable**, FK → `printings(scryfall_id)`. Same "no printing chosen" meaning as `collection_items.printing_id`, but actually wired up here: `BaralhosService` and a printing-picker modal (`SeletorImpressao`) let the user choose an exact printing when adding a card, unlike `collection_items` where this stays schema-only. |
| `quantity` | Integer, default `1`, `check (quantity > 0)`. Commander singleton rule (see below) means most non-basic-land rows sit at `quantity = 1`; basic lands and cards whose oracle text explicitly permits unlimited copies (e.g. Relentless Rats) can stack higher, and can have several rows — one per distinct `printing_id` chosen. |
| `is_commander` | Boolean, default `false`. Exactly one row per deck should have this `true` (enforced by app logic, not a DB constraint) — that row's `oracle_id` matches `decks.commander_oracle_id`. |
| `date_added` | timestamptz, default `now()`. Same semantics as `collection_items.date_added`. |
| `updated_at` | timestamptz, default `now()`, bumped by a trigger on every `UPDATE` — same trigger function `collection_items` uses. |

Unique index on `(deck_id, oracle_id, coalesce(printing_id::text, ''))` — same shape and
`NULL`-handling rationale as `collection_items`'s index; it's what "add this card again"
resolves against to decide insert vs. increment.

**Commander rules enforced in `BaralhosService` (app-level, not DB constraints):**
- **Commander eligibility** — a card can be set as commander only if its `type_line` contains
  both "Legendary" and "Creature", or its `oracle_text` contains the literal phrase "can be
  your commander" (catches backgrounds/planeswalkers Scryfall marks that way). See
  `regras-comandante.ts` (`elegivelComoComandante`).
- **Color identity** — a card can only be added if its `color_identity` is a subset of the
  commander's (`dentroDaIdentidade`); pushed to the database query itself via
  `CartasService.buscarCartas`'s `containedBy('color_identity', …)` filter for the search UI,
  and re-checked in `BaralhosService.adicionarCarta` before writing.
- **Singleton** — adding a card that already has a row in the deck (any printing) is blocked
  unless the card is a basic land (`type_line` contains "Basic Land") or its `oracle_text`
  contains "A deck can have any number of cards named ..." (`ehTerraBasica` /
  `permiteCopiasIlimitadas`). The singleton check is by `oracle_id` regardless of
  `printing_id` — two different printings of the same card are still "2 copies", illegal
  outside those exceptions.
- **99-card cap** — the sum of `quantity` across all non-commander rows in a deck cannot
  exceed 99 (Commander's "commander + 99 other cards" deck size).

RLS: scoped indirectly like `collection_items` — no `user_id` column here; policies check
`exists (select 1 from decks where id = deck_cards.deck_id and user_id = auth.uid())`.

---

## Planned tables (not yet designed)

Stubs — fill in when each is built.

- **`containers`** — `user_id`, `name` (flat, user-named storage locations).
