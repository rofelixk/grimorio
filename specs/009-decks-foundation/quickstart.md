# Quickstart: Decks Foundation

How to check that spec 009 works end to end. Behavior is in [spec.md](spec.md); structure and copy are in [ui.md](ui.md); services are in [contracts/services.md](contracts/services.md).

## Prerequisites

- `npm start` running (the dev server on port 4200), and an active local profile.
- For US4: two browsers (or one normal and one private window), each with a local profile linked to the **same** cloud account, with migration `009_decks` applied ([contracts/supabase.md](contracts/supabase.md)).
- To test reduced motion, turn on DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce".

## Automated coverage (unit)

Run through the `test-runner` agent (`npm test`). The new specs cover:
- **`deck.util`**: normalization (case, accents, spaces), ordering, validation, `repairDeckNames` (remote survivor, lowest free suffix, the 40-character cut).
- **`deck-turn.util`**: every row of the research R8 table (tile open, forward, first load, back link, side nav, popstate, delete landing, `replaceUrl` redirect).
- **`deck-dust.util`**: seeded specks; still specks stay invisible; every speck's alpha is 0 by 2000 ms after settle.
- **`DeckService`**: create/update/remove, validation errors, one row per write, a tombstone on remove, `remove` writing no card, `applySyncResult` diffing, profile isolation.
- **`computeStats`**: a card seeded with a deck id is in neither a collection nor the holding box, and it is in the holding box once the deck is deleted.
- **`SyncService`**: deck upsert, delete and tombstone clearing, the duplicate rename uploaded, the deck step order.
- **`hasUnsyncedChanges`**: deck changes and deck tombstones count.
- **Components**: tile, fan placeholder, format picker (keyboard), form dialog, delete dialog (lock), and `DeckArea` (redirect, focus, reduced-motion instant swap, `inert` while turning).

## Manual scenarios

1. **Empty state (US1-3)**: open **Decks** in the side nav. The page shows "Nenhum deck ainda", "Sleevados e prontos pra jogar", the body text and **Criar deck**.
2. **Create (US2-1, US2-6)**: select **Criar deck**. Commander is preselected and the rules plate lists its 5 bullets. Pick **Vintage**: the label reads "Formato · Vintage" and the plate updates at once. Type "Krenko goblins" and select **Criar deck**. The tile appears with the "Carta em destaque" placeholder and "Vintage".
3. **Validation (US2-2, US2-3)**: create with an empty name, a 41-character name, and "krênko GOBLINS". The errors are "Dê um nome ao deck.", "Use no máximo 40 caracteres." and "Já existe um deck com esse nome." The counter turns red past 40.
4. **Order (US1-1)**: add "Atraxa", "zur" and "Élesh". The list reads Atraxa, Élesh, Krenko goblins, zur. On desktop there are 4 per row; at 390 px there's one centered column, the header button is hidden, and "+ Novo deck" ends the list.
5. **Page turn (FR-018, US1-2, US1-5)**:
   1. Select a tile. The list lifts from its left edge and turns over in about 1.3 s, parchment dust stirs along the moving edge, and the deck header is left with no specks. The canvas is gone within about 2 s of the page settling.
   2. Clicks during the turn do nothing.
   3. Go back with **Voltar para decks**, then open a deck and use side-nav **Decks**, then the browser back button. Each turns the page back.
   4. From a deck page, select the wordmark. You land on Home with no turn.
   5. Press browser forward into a deck. There's no turn.
   6. Reload on `/decks/{id}`. The page shows at once.
   7. With reduced motion on, every open and close is instant, with no dust.
6. **Edit (US2-4)**: on the deck page, select **Editar**, rename to "Krenko tokens" and switch to Commander. The header updates. Go back: the tile shows the new name and format.
7. **Offline (US2-5)**: in DevTools, go offline. Create and edit a deck, then reload. The changes are still there.
8. **Delete (US3-1, US3-3, US3-4)**: on a deck page, select **Excluir**. The dialog reads "Excluir {nome}?" and "Não há cartas aqui. Nada mais é afetado." Confirm: the label flashes "Excluindo…" and Esc does nothing. You land on `/decks` with no turn, and the toast "Deck — {nome} foi excluído." appears. Canceling changes nothing.
9. **Delete with cards (US3-2, SC-004)**: seed a card in a deck (in DevTools, put a `cards` row whose `locationId` is the deck id, then reload). The collection area shows no holding box for it. Delete the deck: the dialog and toast mention 1 card, and **Coleção** now shows the holding box with that card, all its fields unchanged.
10. **Missing deck (FR-005)**: open `/decks/not-a-real-id`. You're sent to `/decks` with no turn, and back doesn't return to the bad address.
11. **Profiles (US1-4)**: switch profile while on a deck page. You're returned to `/decks` (or Home, via the guard), and you see only the other profile's decks.
12. **Sync (US4)**:
    1. On A, create "Pauper faeries" and "Mono red" and sync. On B, sync: both decks appear.
    2. Edit "Mono red" on both A and B, B last, then sync A, then B, then A. B's edit wins on both.
    3. Delete a deck on A and sync. Sync B: the deck is gone and doesn't come back after syncing A again.
    4. Create "Elfos" on both, offline, then sync A, then B. B shows "Elfos" and "Elfos (2)", and A shows both after its next sync.
    5. A profile with no linked account never sends anything; the Network tab shows no `decks` request.

## Post-implementation

- Run `design-auditor` on the new UI and fix what it reports.
- Run `get_advisors` (security) after the migration.
- Update the docs listed in plan.md, "Docs to update".
