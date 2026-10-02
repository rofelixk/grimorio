# Quickstart: Cards

Validation guide for [plan.md](plan.md). Details are in [data-model.md](data-model.md), [contracts/](contracts/) and [ui.md](ui.md).

## Prerequisites

1. Apply migration `015_cards` ([contracts/supabase.md](contracts/supabase.md)) after the user confirms, then run `get_advisors` (security and performance) and fix any finding on the touched tables.
2. Run `npm run sync:scryfall` so `printings.artist`, `printings.faces` and `cards.search_name` are filled. Spot-check:

   ```sql
   select name, search_name from cards where name ilike '%jötun%';
   select set_code, collector_number, artist, faces is not null from printings where oracle_id = (select oracle_id from cards where name = 'Delver of Secrets') limit 5;
   ```

3. `npm start` is already running (the user's own dev server). Open `http://localhost:4200` with an unlocked local profile.
4. For US5: two browsers, each with a profile linked to the same cloud account.

## Automated checks

- **Full suite**: `npm test` (via the `test-runner` agent). The new specs cover:
  - `card-search.util`: the key, escaping, every reducer transition, stale generations;
  - `card-entry.util`: `canBeCommander`, printing sort, filter and initial, `findMatches` order, quantity validation, `printingFromEntry`;
  - `card-colors.util`: 0–5 colors;
  - `firstLeaf`;
  - `CardService`: `add` stamps, `update` keeps `addedAt`, `mergeInto` with and without removal, `byLocation` order, `writeRows` atomicity;
  - `CardCatalogService` against a fake client: 101-row `hasMore`, error mapping;
  - `CardViewModeService` per profile, plus `forget`;
  - `sync-rows`: round trip of `artist`/`added_at`;
  - `SelectList` keyboard;
  - the components: search states with a fake catalog and the `@testing/intersection-observer` helper, the card modal (add and edit, offline printings), the duplicate notices, the moved notice, `CardFlow` (every branch in ui.md §4), and the collection area's kinds.
- **Lint**: `npm run lint`.
- **Build**: `npm run build`, which must stay within the budgets.

## Manual scenarios

| # | Steps | Expected |
|---|---|---|
| 1 | US1: open an empty leaf collection → "Adicionar cartas" | The search modal opens with the field focused and the idle text (US1-1). |
| 2 | Type "so", then "sol r" | First "Digite pelo menos 3 caracteres…" with no request in the network tab; then image results, one per card (US1-2). |
| 3 | Type "jotun" | Cards named "Jötun…" appear (accent-insensitive, FR-006). |
| 4 | Type "dragon" and scroll to the end | 100 results, then "Carregando mais…", then the next page, until no more requests (US1-7). |
| 5 | Type fast "lightning bolt" with network throttling | Only the final text's results show (FR-009). |
| 6 | Pick "Sol Ring" | The card modal opens in colorless neutral with a printing preselected and artist shown; defaults Normal / Inglês / NM / 1 (US1-3). |
| 7 | Filter the set by "cmr" and pick the Commander Legends printing; set Foil, qty 2 → "Salvar e adicionar outra" | The card modal closes; the search is still open with its results; the toast "Carta adicionada" shows inside the search modal (US1-4). |
| 8 | Pick another card → "Salvar" | Both modals close; the grid shows the card first; the summary counts go up (US1-5, FR-016). |
| 9 | In the card modal, type "0", "1.5", "abc" | Error text, `aria-invalid`, both save buttons disabled (US1-8). |
| 10 | US3: add the same Sol Ring (same printing, Foil, EN, NM) again | D1a appears, naming the collection; "Somar" → the existing row becomes ×3, no new tile; repeat with "Adicionar como linha separada" → a second tile (US3-1..3). |
| 11 | Create the same match in a second collection, then add once more | D1b "Você já tem esta carta em 2 lugares"; switch "Onde ela está" → the "passa de N para…" text updates; "Somar" grows only the chosen row (US3-5). |
| 12 | Put a matching card in a deck only (devtools or a later spec), add | No warning (US3-4). |
| 13 | US2: toggle "Só imagens" / "Com detalhes" | 6 vs 4 columns; the details animate; hover in "Só imagens" shows the overlay without moving the grid; reload → the mode is kept; another profile has its own mode (US2-2a). |
| 14 | Hover tiles of mono, two-color, 4-color, 5-color and colorless cards | Border, halo, scale and dust in the card's colors; silver and gold for 4 and 5; with OS reduced motion, no spin or dust (FR-032). |
| 15 | Open the holding box with cards | Same grid, toggle, summary and read-only note; tiles don't respond to click (US2-6). |
| 16 | Open a parent collection | Subcollection rows, summary aside, no "Adicionar cartas" (US2-3). |
| 17 | US4: click a tile → change condition, quantity, for sale, notes → Salvar | Toast "Carta atualizada"; the tile updates in place; the summary's for-sale count changes (US4-1, US4-3). |
| 18 | Edit → pick another printing → Salvar | The tile shows the new set, number and image; the other details are kept (US4-2). |
| 19 | Edit a card into a match with another row | The edit-variant notice; "Somar" removes the edited tile and grows the other; "Manter as duas linhas" keeps both (US4-5). |
| 20 | Go offline (devtools), edit a card | The current printing shows; the printing list shows the error + "Tentar de novo"; other fields save (FR-024). |
| 21 | Offline, open the search and type | The "Sem conexão…" plate + "Tentar de novo"; back online → retry works. |
| 22 | With the search open, create a subcollection in another tab, then save in the first | The card lands in the first subcollection; the locked "Carta adicionada em outra coleção" notice in its color, only "Ok" closes it (US1-9, FR-017). |
| 23 | With a modal open, delete the collection in another tab | All modals close; back to the collection list; toast "Nada foi salvo" (FR-017). |
| 24 | Seed about 5,000 cards in one collection (a dev-console loop over `CardService.add`) and open it | It opens without a perceptible wait; scrolling stays smooth (SC-004). |
| 25 | US5: on browser A add and edit cards → sync; on browser B → sync | Same cards, quantities, `addedAt` order and artists; edit the same card on both → the latest wins (US5-1/2). |
| 26 | Phone width (≤ 640px) | One column; the summary and search above the grid; 3 or 2 columns; modals full-bleed; buttons stacked. |

## After implementation

- Run the `design-auditor` agent against DESIGN.md and ui.md, then fix what it reports.
- Update architecture.md (see plan.md "Docs to update").
