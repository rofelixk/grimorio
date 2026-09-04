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
  `scheme`, `planar`, `vanguard`, `augment`, `host`.
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
| `set`, `set_name`, `set_type`, `collector_number`, `rarity`, `artist`, `released_at` | Printing-level. Belong on a collection item once printing tracking exists. (`set_type` is still *read* during import as a secondary filter — see *Import filter* — just not stored.) |
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
  cards); `meld` stores only the two faces of one card, not the link to its meld partner;
  `reversible_card` is handled by the same shape but is rare and untested.
- **No printing information.** The collection will record `oracle_id` + quantity only; which
  set / finish / condition you own is not captured yet.
- **English only.** No `printed_name` / `printed_text`.

---

## Deferred (Phase 2+)

- **Printing tracking.** Either ingest Scryfall's *Default Cards* bulk file (one row per
  printing) into a `printings` table keyed by `scryfall_id`, or capture
  set + collector number + finish + condition per collection item.
- **Portuguese.** Ingest localized data (`printed_name`, `printed_text`, localized images).
  No schema migration needed — everything is keyed on `oracle_id`.
- **Relational `card_faces` table** — migrate from the JSONB column if face-level querying
  (type filters, deck-builder UIs) becomes a real need.
- **`edhrec_rank`, `keywords`** for deck analysis / recommendations.

---

## Planned tables (not yet designed)

Stubs — fill in when each is built.

- **`collection_items`** — `user_id`, `oracle_id`, `quantity`; later: printing, finish,
  condition, language, `container_id`, `last_location_update_date`.
- **`containers`** — `user_id`, `name` (flat, user-named storage locations).
- **`decks`** — `user_id`, `name`, commander `oracle_id`, format.
- **`deck_cards`** — `deck_id`, `oracle_id`, `quantity`, `is_commander`.
