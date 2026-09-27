# Feature Specification: Shared Planechase — First Gameplay Mode

**Feature Branch**: `feature/006-shared-planechase`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "we'll brainstorm our first gameplay function of the app, the planechase game mode. We'll add a gameplay nav item, it shows the current game modes available and for now we'll have onyl planechase. we need to properly research how it's played and show the user the rules in ptbr, keep in code the list of planechase cards that are not golden border so it's easy to fetch the data from supabase to show the user. for this first implementation we'll focus on shared planechase (where all palyers share the same planechase deck instead of each having their own).  Most planechase cards are not translated to ptbr so we'll nee dto keep the translation on code to show the user instead of relying on auto translate taht can give different interpretations. the gameplay page must show how to play, a way to randomize the current plane, a way to track already used and still available planes, a way to enable/disable specific planes (this will be saved to the local and linked user, a \"die roll\" that tells if we have to planeswalk, activate chaos or do nothing (no actual die animation needed), a way to reset planes if all are used."

## Rules research *(context for this spec)*

Source: Magic: The Gathering Comprehensive Rules effective 2026-09-25, rules 311 (Planes), 312 (Phenomena), 701.31 (Planeswalk), 901 (Planechase) and 901.15 (Single Planar Deck Option). The in-app PT-BR rules (FR-016) summarize these points:

- **What it is.** A casual variant layered on a normal Magic game (usually multiplayer free-for-all). A face-up **plane** card adds rules everyone plays under; **phenomenon** cards are one-shot events.
- **Shared deck (901.15).** Instead of one planar deck per player, the table uses one communal planar deck. It must hold at least 40 cards, or at least 10 × the number of players, whichever is smaller; at most 2 × the number of players can be phenomena; no two cards may share an English name. The current planar controller counts as the owner of every card in it.
- **Start (901.5).** After mulligans, the starting player reveals the top card. A phenomenon revealed at this point goes to the bottom and the reveal repeats until a plane appears; nothing triggers during this. That plane is the starting plane.
- **Planar controller (901.6).** Normally the active player controls the face-up plane and its abilities.
- **Rolling the planar die (901.9).** During a main phase of their own turn, with priority and an empty stack, the active player may roll the planar die as a special action. The first roll in a turn costs {0}; each further roll that turn costs {1} more than the previous one ({1}, {2}, …).
- **Die faces (901.3a, 901.9a–c).** Six faces: one **Planeswalker** symbol (planeswalk), one **chaos** symbol (the current plane's chaos ability triggers), four blank (nothing happens).
- **Planeswalking (701.31b).** The face-up card goes to the bottom of the planar deck and the top card is turned face up. Effects lasting "until a player planeswalks" end.
- **Phenomena (312.5, 312.7).** When a phenomenon is turned face up, its "when you encounter" ability triggers; once that resolves, the planar controller planeswalks again.

## Clarifications

### Session 2026-09-27

- Q: Which cards make up the catalog? → A (from rules research against the card catalog): every plane and phenomenon card that has at least one non-gold-border printing, one entry per distinct English name. That is about 160 cards from Planechase Anthology (which reprints Planechase 2009 and 2012), March of the Machine Commander, Doctor Who and the black-bordered Unknown event planes. Gold-bordered Secret Lair Showcase and Unknown Planechase planes are excluded.
- Q: Should card names be translated? → A: No. Names stay in English. Only the type line and rules text are translated.
- Q: Do deck-settings changes save on each toggle or through an explicit save? → A: The person edits a draft. "Salvar" checks the limits and saves, and "Cancelar" throws the draft away. The draft may pass through invalid states while it is being edited.
- Q: Can an accidental roll or planeswalk be undone? → A: Yes, one step. "Desfazer" reverts only the last game action.
- Q: Which printing's image represents a card with several non-gold-border printings? → A: The newest non-gold-border printing.
- Q: Should images the app has already shown stay available offline? → A: Yes. Each card image is kept on the device once shown and reused offline. There is no bulk download.
- Q: Can the card list change while a game is in progress? → A: No. A game keeps the card list it started with. Saving a changed selection while a game is in progress ends it (after confirmation) and starts a new game with the new list.
- Q: Can the table planeswalk without using the app's die? → A: Yes. The "Planeswalk" action planeswalks directly. It doesn't touch the roll cost or show a die result.
- Q: If the selection is changed on two devices before syncing, does the later change win for the whole selection or card by card? → A: Not an expected scenario (single user). The selection syncs as a whole, and the most recently saved one wins. There is no per-card merging.
- Q: Which actions are available while a phenomenon waits for confirmation? → A: Only confirming it, "Desfazer", "Como jogar", deck settings and "Encerrar partida". Rolling, "Planeswalk" and "Próximo turno" are disabled until it is confirmed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Play a shared Planechase game at the table (Priority: P1)

A group sitting down to play Commander decides to use Planechase but owns no physical planar deck (or doesn't want to shuffle one). One person opens Grimorio on a phone or tablet in the middle of the table, goes to "Modos de jogo", picks Planechase and starts a game. The app shows the starting plane: its card image and its full rules text in Portuguese. During a turn, the active player taps "Rolar dado planar". The app says what happened: planeswalk, chaos, or nothing. On planeswalk, the app moves to the next plane. On chaos, it points to the current plane's chaos ability. The app also shows how much mana the next roll costs this turn.

**Why this priority**: This is the feature. Without it the other stories have nothing to support.

**Independent Test**: With no profile active, open Planechase, start a game, roll until each of the three results has appeared, and confirm that each result shows its outcome and that planeswalking changes the plane.

**Acceptance Scenarios**:

1. **Given** the gameplay menu, **When** the person opens it, **Then** it lists the available game modes and Planechase is the only one.
2. **Given** no active profile, **When** the person opens Planechase, **Then** it works fully: no sign-in prompt, no profile gate.
3. **Given** the Planechase page with no game in progress, **When** the person starts a game, **Then** a random enabled plane (never a phenomenon) becomes the current plane and is shown with its card image, its English name and its PT-BR text, with the chaos ability clearly marked.
4. **Given** a game in progress, **When** the person rolls the planar die, **Then** the result is one of three outcomes with odds of 1 in 6 for "Planeswalk", 1 in 6 for "Caos" and 4 in 6 for "Nada acontece". The result is shown as a clear text label without a die animation.
5. **Given** a "Planeswalk" result, **When** it is shown, **Then** the current plane moves to the used list and a random card from the still-available enabled cards becomes current.
6. **Given** a "Caos" result, **When** it is shown, **Then** the current plane's chaos ability is highlighted so the table can resolve it, and the plane stays the same.
7. **Given** a "Nada acontece" result, **When** it is shown, **Then** nothing else changes.
8. **Given** a game in progress, **When** the table planeswalks without the app's die (a card effect, or they rolled a physical planar die), **Then** a separate "Planeswalk" action draws a random card in the same way as a die result, and leaves the roll cost unchanged.
9. **Given** a turn in progress, **When** rolls are made, **Then** the page shows the cost of the next roll ({0}, then {1}, {2}, …). A "Próximo turno" action resets the count to {0}.
10. **Given** the last action was a roll, a planeswalk, a phenomenon confirmation or "Próximo turno", **When** the person taps "Desfazer", **Then** the game returns exactly to the state before that action (current card, used/available lists, roll cost, pending phenomenon, shown result). A second "Desfazer" right after is not available.

---

### User Story 2 - Read the Planechase rules in Portuguese (Priority: P1)

Several players at the table have never played Planechase. Before starting, someone opens "Como jogar" on the Planechase page and reads a short PT-BR explanation of the variant: the shared deck, the starting plane, the die and its cost, planeswalking, chaos and phenomena.

**Why this priority**: Most Brazilian players have never seen these cards in Portuguese, and the variant has rules that aren't obvious (roll cost, phenomena). Without them the tool is only usable by people who already know the format.

**Independent Test**: Open "Como jogar" and check that every point listed under "Rules research" above is covered in PT-BR.

**Acceptance Scenarios**:

1. **Given** the Planechase page, **When** the person opens "Como jogar", **Then** the rules are shown in PT-BR, covering every point under "Rules research".
2. **Given** a game in progress, **When** the person opens "Como jogar", **Then** the rules show without ending or resetting the game.

---

### User Story 3 - Read every card in Portuguese, the same way every time (Priority: P1)

A plane's text decides what everyone at the table can do, so it must read the same way every time. For every card, the app shows a PT-BR rules text written and reviewed once and kept with the app, never produced by automatic translation at runtime. The original card image, in English, stays visible next to it for reference.

**Why this priority**: A wrong or unstable translation of a rules text causes arguments at the table. Most of these cards were never printed in Portuguese, so the app is the only source.

**Independent Test**: Browse the full card list and confirm that every card shows a PT-BR text and that the text is identical across reloads and devices.

**Acceptance Scenarios**:

1. **Given** any card in the catalog, **When** it is shown (as the current plane or in a list), **Then** its English name and PT-BR rules text are shown, and the English card image is available.
2. **Given** no network connection, **When** a card is shown, **Then** its name and PT-BR text still appear. Its image appears if it was shown before on this device, and a placeholder appears otherwise.
3. **Given** a phenomenon comes up, **When** it is shown, **Then** its PT-BR "ao encontrar" effect is shown, and after the table confirms it has been resolved, the app planeswalks to a random plane.

---

### User Story 4 - Track used and available planes, and reset (Priority: P2)

During a long game, the table wants to know which planes they have already visited and which are still to come. The page shows two lists, used and available. When every enabled card has been used, the app says so and offers a reset that makes all of them available again. The person can also reset at any time, or end the game.

**Why this priority**: The draw works without it (Story 1), but this list is what makes the app better than a shuffled pile: people can see their history, and the deck never runs out.

**Independent Test**: Enable exactly 10 cards, planeswalk until all are used, confirm the "all used" state appears, reset, and confirm that the available list is full again.

**Acceptance Scenarios**:

1. **Given** a game in progress, **When** the person opens the lists, **Then** they see the current plane, the used cards in the order they were visited, and the still-available enabled cards.
2. **Given** a planeswalk, **When** the next card is drawn, **Then** it is never a card that is already used or is the current plane, as long as any other card is still available.
3. **Given** no enabled cards remain available, **When** a planeswalk is needed, **Then** the app says every plane has been used and offers "Reiniciar planos". Resetting makes every card in the game's list available again except the current plane, and the pending planeswalk then completes.
4. **Given** a game in progress, **When** the person chooses "Reiniciar planos" or "Encerrar partida", **Then** the app asks for confirmation first.
5. **Given** a game in progress, **When** the page is reloaded or the app is closed and reopened on the same device, **Then** the game resumes: same current plane, used/available lists and roll cost.

---

### User Story 5 - Choose which cards are in the planar deck (Priority: P2)

A player who owns a physical Planechase deck, or who dislikes certain planes, wants the app to draw only from a chosen set. They open the deck settings, see every card grouped by the set it came from, and turn cards on or off, one at a time or a whole set at once. Their choice is remembered: under their profile if one is active, and on their linked cloud account after they sync.

**Why this priority**: The default (everything enabled) is already playable. Choosing cards is a refinement.

**Independent Test**: With a linked profile, disable a few cards, sync, open the same profile on another device, sync, and confirm the same cards are disabled there.

**Acceptance Scenarios**:

1. **Given** the deck settings, **When** they open, **Then** every catalog card is listed by its English name, grouped by set, with the plane/phenomenon type visible and an on/off control. Each set also has "enable all / disable all" controls. Changes are made to a draft and take effect only after "Salvar". "Cancelar" discards them.
2. **Given** someone has never changed the selection, **When** a game starts, **Then** every catalog card is enabled.
3. **Given** a card is disabled, **When** any draw happens, **Then** that card is never drawn.
4. **Given** a game in progress, **When** the person saves a changed selection in the deck settings, **Then** the app first warns that the game will restart. On confirmation, the current game ends and a new game starts with the new card list: a new starting plane, an empty used list, roll cost {0} and nothing to undo. Cancelling keeps the game and the old selection.
5. **Given** a draft selection with fewer than 10 enabled cards or 0 enabled planes, **When** the person taps "Salvar", **Then** the app refuses to save and says why. The draft stays open for editing (e.g. "disable all" on every set, then enabling a few cards, is allowed while editing). With 10 or more cards but fewer than 40, the app shows a notice with the shared-deck size rule (at least 40, or 10 × the number of players if that is smaller), but doesn't block.
6. **Given** an active local profile, **When** the selection changes, **Then** it is saved to that profile, and other profiles on the device have their own selections.
7. **Given** no active profile, **When** the selection changes, **Then** it is saved on this device and used whenever no profile is active.
8. **Given** a profile linked to a cloud account, **When** the person syncs with the existing sync controls, **Then** the selection syncs like other profile data: last change wins.

---

### Edge Cases

- **Phenomenon as the first card**: a game never starts on a phenomenon (rule 901.5). The start picks only from enabled planes.
- **Back-to-back phenomena**: after a phenomenon resolves, the next draw may be another phenomenon. Each one is shown and resolved in turn until a plane comes up.
- **All cards used while a phenomenon is waiting to planeswalk**: the reset prompt from Story 4 appears. Resetting completes the planeswalk.
- **Card image unavailable (offline or catalog down, and never shown on this device before)**: the name and PT-BR text still show, with a placeholder where the image would be. Rolls and draws still work.
- **Selection sync conflict** (changed on two devices before syncing): not expected, since there is one user. If it happens, the whole selection with the later timestamp wins. Cards are not merged one by one.
- **Profile switch or sign-out during a game**: the game in progress stays as it was (it belongs to the device, not the profile). The game keeps the card list it started with. The new profile's selection applies only to the next game started.
- **A card deleted from the catalog**: a card identifier missing from the catalog is skipped when the list is shown, and never drawn.
- **Two cards with the same English name in different sets**: they are one catalog entry (the rules forbid duplicate names in a planar deck).
- **Rolling outside a main phase / on another player's turn**: the app doesn't enforce timing. The rules text explains it, and the table is responsible.

## Requirements *(mandatory)*

### Functional Requirements

**Navigation**

- **FR-001**: The shell nav MUST include a gameplay destination labeled "Modos de jogo". It leads to a gameplay menu that lists the available modes. For now the only one is Planechase, with a one-line PT-BR description.
- **FR-002**: The gameplay menu and the Planechase page MUST NOT require a profile, and MUST work offline except for card images (Constitution IV).

**Card catalog and translations**

- **FR-003**: The app MUST ship a fixed list of the Planechase catalog: every plane and phenomenon card with at least one non-gold-border printing, one entry per distinct English name. Each entry MUST hold the identifier of the card's newest non-gold-border printing, used to fetch its image and printing data from the existing card catalog, its set grouping, and its type (plane or phenomenon).
- **FR-004**: For every catalog entry, the app MUST ship a reviewed PT-BR planar type line and rules text, with the chaos ability (planes) or the encounter ability (phenomena) stored separately so it can be highlighted. These texts MUST NOT be produced by runtime automatic translation.
- **FR-005**: Card names MUST stay in English, matching the card image and how Brazilian players refer to them. Only the type line and rules text are translated.
- **FR-006**: The app MUST fetch the card image from the existing card catalog. Each image MUST be kept on the device after it is first shown, and reused when there is no network. The app MUST NOT bulk-download images it hasn't shown. It MUST degrade to text only when an image was never shown on this device and can't be fetched.

**Game**

- **FR-007**: Starting a game MUST fix the game's card list to the enabled cards at that moment, and make a random plane from it (never a phenomenon) the current plane. All other cards in the list start as available and none as used. That list MUST NOT change for the rest of the game (FR-022).
- **FR-008**: "Rolar dado planar" MUST produce "Planeswalk" with probability 1/6, "Caos" with 1/6 and "Nada acontece" with 4/6, drawn with a uniform random source. The result MUST be shown as text (no die animation) and announced to assistive technology.
- **FR-009**: The page MUST show the mana cost of the next roll this turn, starting at {0} and increasing by 1 after each roll made with the roll button. "Próximo turno" MUST reset it to {0}.
- **FR-010**: A "Planeswalk" die result, or the separate "Planeswalk" action (for planeswalks the table triggers without the app's die, e.g. a card effect or a physical die), MUST move the current card to used and turn up a random card from the available enabled cards. If that card is a phenomenon, the app MUST show its encounter effect, wait for the table to confirm it has been resolved, and then planeswalk again. While it waits, "Rolar dado planar", "Planeswalk" and "Próximo turno" MUST be disabled. Confirming, "Desfazer", "Como jogar", deck settings and "Encerrar partida" stay available. The "Planeswalk" action MUST NOT change the roll cost or show a die result.
- **FR-011**: A "Caos" result MUST visually highlight the current plane's chaos ability and leave the current plane unchanged.
- **FR-012**: The page MUST show the current card, the used list (in visit order) and the available list.
- **FR-013**: When a planeswalk is needed and no enabled card is available, the app MUST say every plane has been used and offer "Reiniciar planos". The same action MUST be available at any time with confirmation. Resetting makes every card in the game's list except the current one available again and clears the used list.
- **FR-014**: "Encerrar partida" MUST end the game with confirmation and return to the no-game state.
- **FR-015**: The game in progress (current card, used and available lists, roll cost, any pending phenomenon, the undo step) MUST survive a reload and an app restart on the same device. It is NOT tied to a profile and NOT synced.
- **FR-015a**: "Desfazer" MUST revert the last game action (roll, planeswalk, phenomenon confirmation, "Próximo turno") to the exact prior state. Only one step can be undone. It is unavailable right after a start, a reset or an undo, and it doesn't apply to "Encerrar partida".

**Rules**

- **FR-016**: The Planechase page MUST offer "Como jogar" with PT-BR rules for the shared-deck variant covering every point under "Rules research". The rules MUST be reachable with or without a game in progress, without changing the game.

**Deck selection**

- **FR-017**: The deck settings MUST list every catalog card grouped by set, showing its English name and type, with a per-card on/off control and per-set enable-all/disable-all controls. The list MUST show how many cards and how many phenomena are enabled in the draft. Edits MUST apply to a draft that is saved only through "Salvar" and discarded through "Cancelar".
- **FR-018**: By default, every catalog card is enabled.
- **FR-019**: "Salvar" MUST refuse a draft with fewer than 10 enabled cards or with no enabled plane and say why. The draft itself MAY be in that state while it is being edited, so a saved selection is always valid. It MUST show a non-blocking notice when fewer than 40 cards are enabled, and when more than 2 phenomena are enabled, explaining the shared-deck limits (at least 40 cards or 10 × players; at most 2 × players phenomena), since the app doesn't know how many players there are.
- **FR-020**: On "Salvar", the selection MUST be saved to the active local profile. With no active profile it MUST be saved on the device, separate from every profile's selection.
- **FR-021**: For a profile linked to a cloud account, the selection MUST sync through the existing manual sync, using last-write-wins like other profile data. Nothing syncs on its own.
- **FR-022**: A game's card list MUST NOT change while it is in progress. Saving a changed selection while a game is in progress MUST first warn that the game will restart. On confirmation, the app MUST end the game and start a new one with the new list (FR-007). Profile switches and sign-outs MUST NOT affect a game in progress.

**Language**

- **FR-023**: All user-facing text (labels, results, rules, card texts, errors) MUST be PT-BR (Constitution II). The one exception is card names, which stay in English (FR-005).

### Key Entities

- **Planechase card (catalog entry)**: one plane or phenomenon, identified by its English name and the catalog identifier of its newest non-gold-border printing. It has a set grouping, a type (plane/phenomenon), a PT-BR type line, a PT-BR static/triggered text, and a PT-BR chaos ability (planes) or encounter ability (phenomena). It is fixed and ships with the app.
- **Planar deck selection**: the set of disabled catalog cards (everything else is enabled). It belongs to a local profile, or to the device when no profile is active. It has a last-change timestamp for sync.
- **Planechase game**: the device's game in progress: the card list fixed when it started, the current card, the ordered used list, the available list, the next roll cost, whether a phenomenon is waiting for confirmation, and the state before the last action (for a single-step undo). One game per device at most.
- **Die result**: Planeswalk, Caos or Nada acontece. It is transient and shown until the next roll or action.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person with no profile can go from opening the app to seeing the starting plane in PT-BR in 3 taps or fewer.
- **SC-002**: 100% of catalog cards show a PT-BR rules text, and the text for a card is identical on every device and every visit.
- **SC-003**: Over 6,000 rolls, each result's frequency is within ±2 percentage points of its expected value (16.7% / 16.7% / 66.7%).
- **SC-004**: In a game with N enabled cards, the first N planeswalks never repeat a card.
- **SC-005**: A roll result appears within 1 second of the tap, with or without network.
- **SC-006**: A player new to Planechase can explain the die, the roll cost and phenomena after reading "Como jogar" once.
- **SC-007**: A deck selection changed on one device appears on a second device linked to the same account after one sync on each.

## Assumptions

- The catalog (planes and phenomena with at least one non-gold-border printing, about 160 cards) is already present in the existing card catalog database in English. Only images and printing data are fetched from it; translations ship with the app.
- The PT-BR card texts are written for this feature (drafted, then reviewed by the user) against current Oracle wording. Official Portuguese printings are used as the reference wherever they exist.
- Only the shared-deck variant is in scope. Per-player planar decks, Two-Headed Giant Planechase, Grand Melee (several face-up planes) and planar-controller changes when a player leaves are out of scope.
- The app does not track life, turns, players or the game of Magic itself. "Próximo turno" only resets the roll cost.
- The "active player / main phase / empty stack" timing for rolls is explained but not enforced.
- Owned physical cards and the collection are unrelated to this feature. Enabling a card does not require owning it.
- The gameplay menu is where future modes (e.g. a life counter) will go. Only Planechase is built now.
- The deck selection syncs through the existing manual sync. The game in progress stays on the device.
