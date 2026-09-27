# Quickstart: validating Shared Planechase

**Feature**: `006-shared-planechase`

## Prerequisites

- The migrations from [contracts/supabase.md](contracts/supabase.md) are applied, and `get_advisors`
  (security) is clean for the new table.
- `.env` holds `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- The catalog is refreshed with `npm run sync:scryfall`, so printings have border, release date and
  `small`/`large` images.
- The card data is generated with `npm run sync:planechase`, and the translations with
  `/planechase-translate`, reviewed by the maintainer.
- The dev server is running (the user's `npm start`). Browser checks go through the `run` skill.
- Automated checks:
  - `npm test`: the game util, crypto util, selection util, services and components.
  - `npm run lint`

## Scenarios

| # | Scenario | Steps | Expected |
|---|---|---|---|
| V1 | Nav + menu (US1-1, FR-001) | Open the app with no profile; open the drawer → "Modos de jogo" | The menu lists only Planechase, with "Abrir". The nav item is current on all four routes |
| V2 | No profile gate (US1-2, FR-002) | With no profile active, open Planechase and start a game | No entry modal and no guard |
| V3 | Start (US1-3, FR-007) | Iniciar partida | The current card is a plane with its image, English name and PT-BR text (or English), and the chaos plate is shown. "Desfazer" is disabled |
| V4 | Die (US1-4..7, FR-008/011) | Roll until all three results appear | Planeswalk swaps the card with a flair. Caos lights the plate with a flair and keeps the card. Nada changes nothing. The cost increments {0}→{1}→… |
| V5 | Manual planeswalk (US1-8) | Planeswalk | The next card; the cost is unchanged; the sub line says the cost doesn't change |
| V6 | Zerar custo + Desfazer (US1-9/10, FR-015a) | Roll twice, Zerar custo, Desfazer, then try Desfazer again | The cost returns to {2}. The second Desfazer is disabled. Undoing a planeswalk restores the same card and the same next card |
| V7 | Phenomenon (US3-3, FR-010) | Enable exactly 10 cards including 2 phenomena and planeswalk until one appears | The encounter plate is lit; roll, Planeswalk, Zerar custo and Reiniciar are disabled; Concluir encontro planeswalks again, and chained phenomena each wait |
| V8 | All used + reset (US4-2/3, FR-013) | With 10 cards, planeswalk until the prompt shows; Reiniciar planos | Only Desfazer and Reiniciar planos are enabled (plus Como jogar, Baralho and Encerrar). The next 9 planeswalks show every other card exactly once |
| V9 | No counts (FR-012) | Inspect the page and the reset confirm during a game | No used/available lists or numbers anywhere |
| V10 | Persistence (US4-5, FR-015) | Mid-game, with a pending phenomenon and an undo available, reload, then close and reopen | Same card, cost, pending state, undo and next draw |
| V11 | Confirmations (US4-4, FR-014) | Reiniciar planos and Encerrar partida, each Cancelar, then confirm | Cancel keeps the state. End returns to no-game, and the menu shows "Abrir" |
| V12 | Rules (US2, FR-016) | Open Como jogar with and without a game | All 7 sections are PT-BR; the back label varies; the game is untouched |
| V13 | Deck draft (US5-1, FR-017/019) | Open Baralho; collapse a set; Desativar todos on every set; Salvar | Blocked with "Ative pelo menos 10 cartas…". Enable 10 → the notice shows and saves. Collapsed sets load no images (network panel) |
| V14 | Discard on leave (clarification A) | Toggle tiles, then leave via the header back, the nav and browser back | No prompt; reopening shows the saved selection |
| V15 | Save with a game (US5-4, FR-022) | With a game, change the selection and Salvar | Inline confirm. "Manter partida" keeps both. "Salvar e reiniciar" starts a new game at {0} with no undo |
| V16 | Refused start (FR-007) | Save exactly 10 cards; edit `cards.json` locally to drop one; reload; Iniciar partida | Alert with the reason and "Ajustar baralho"; the selection is unchanged. Revert the edit |
| V17 | Profiles (US5-6/7, FR-020) | No profile: disable card A. Profile P1: disable card B. Switch between them | Each context shows its own selection; the game in progress is unaffected by switches |
| V18 | Sync (US5-8, SC-007, FR-021) | Linked profile on device 1: change the selection and sync. Device 2, same account: sync | Device 2 shows the same disabled cards. The profile modal's unsynced warning appears after an unsynced change |
| V19 | Offline (US3-2, FR-006, SC-005/008) | Show 3 cards online, go offline (DevTools), reload, play | Text always renders; the 3 seen images render from cache; others show the placeholder; a roll result appears under 1 s |
| V20 | Zero Supabase (SC-008) | Play a full game with the network log filtered on `supabase.co` | No requests (only `cards.scryfall.io` images) |
| V21 | Phone dock (FR-012a) | 390×844 viewport, scroll the card text | Dock actions stay on screen |
| V22 | Reduced motion (FR-011a) | Emulate `prefers-reduced-motion: reduce`; planeswalk and caos | No flair; the content swaps |
| V23 | English fallback (FR-004a, SC-002) | Delete one entry from `cards.pt-br.json` locally | That card shows its English type and text with the plate; others stay PT-BR. Revert |
| V24 | Randomness (SC-003, SC-004) | `npm test` | The crypto-random spec's 6,000 rolls are within ±2 points; the game util spec shows no repeats within N draws |
| V25 | Script determinism (SC-009, by hand) | Run `npm run sync:planechase` twice | The second run leaves `git status` clean for both JSON files and prints "Translations are up to date." |
| V26 | Skill scope (SC-009, by hand) | Change one card's `hash` in `cards.json` (it simulates an English text change), then run `/planechase-translate` | Only that card's entry changes in `cards.pt-br.json` |
