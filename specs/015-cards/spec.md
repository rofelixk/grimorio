# Feature Specification: Cards

**Feature Branch**: `015-cards`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "Cards: a card list inside collection pages (fills the existing "cards soon" placeholder; no new route or nav entry), plus adding cards through two separate modals. (1) Search modal: name search on the catalog's cards (one row per card, not per printing), min 3 characters, page size 100, scroll-based pagination; picking a card opens the add-card modal. (2) Add-card modal: user chooses the printing, finish, language, condition and quantity; if the card matches an existing row (same printing, finish, language, condition) it warns the user, who decides between merging the quantity and adding a separate row. Adding to a collection that has subcollections is blocked. Editing an owned card is included; move and remove are not. `canBeCommander` stays on the owned card and is filled in at add time. The catalog sync also records each printing's artist (backlog #13). List layout and empty state are decided after the design handoff. Out of scope: list search/filters, OCR scanning, CSV import, prices, live Scryfall API, deck quantity reservation. Spec 008 (FR-006/016/024/030) deferred the card list and add-cards to this spec."

## Context

Collections answer "where is this card, right now" (Constitution I), but today a collection only shows counts: spec 010 removed every card screen, and spec 008 reserved the space — a card-list placeholder and a disabled "add cards" action (008 FR-030) — and left the owned-card record untouched (008 FR-024). This spec fills that space. A person opens a collection, sees the cards physically in it, finds a card by name in the catalog, picks the exact printing they own and adds it with its finish, language, condition and quantity, and can later correct those details.

Owned cards stay what they are: printing-level records holding a collection (or deck) as their location, synced like collections and decks. The record is unchanged, including its "can be commander" flag, which nothing reads yet but later features will; this spec is the first to fill it in. The same feature also folds in backlog #13: the catalog starts recording each printing's artist, shown when choosing a printing.

## Clarifications

### Session 2026-10-01

- Q: Where do cards live in the UI? → A: Inside collection pages only — no new route, no navigation entry (FR-001).
- Q: What does the search look up? → A: The catalog's cards (one result per card, not per printing), 3-character minimum, 100 per page, more loaded while scrolling; the printing is chosen afterward (FR-006–FR-009).
- Q: Searching and adding — one modal or two? → A: Two separate modals: a search modal picks a card, then an add-card modal collects the printing and ownership details (FR-005, FR-010).
- Q: What if the card being added matches a row already owned? → A: The check covers the whole profile, not just the target collection; the person is warned, told where the match is, and decides between merging the quantities and adding a separate row (FR-015).
- Q: Can cards be added to a collection that has subcollections? → A: The action isn't offered there (FR-004). If the collection gains subcollections while the person is adding (a sync), the card goes into its first subcollection and they are told so, acknowledging it (FR-017).
- Q: What can be done to an owned card? → A: Edit only, including changing its printing; moving and removing cards are later specs (FR-018).
- Q: What does the add form collect, and what are the save buttons? → A: Printing, finish, language, condition, quantity, for-sale and notes; "Salvar e adicionar outra" returns to the search, "Salvar" returns to the collection page (FR-005, FR-011, FR-014).
- Q: The holding box? → A: Its cards are listed read-only; nothing is added to it and its cards aren't edited from it (FR-004, FR-029).
- Q: Where is the printing's artist shown? → A: Decided with the design handoff (FR-027).
- Q: What happens to "can be commander"? → A: It stays on the owned card, as is, and is filled in when a card is added, since later features will use it (FR-012, FR-021).
- Q: Does this spec also carry backlog item #13 (artist data)? → A: Yes. The catalog sync starts recording each printing's artist; where it is shown is decided with the design handoff (FR-026–FR-028).
- Q: Layout of the list and its empty state? → A: Decided after the design handoff; this spec fixes only what the list contains and does (FR-002, FR-003).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a card I own to a collection (Priority: P1)

A player opens "Fichário azul", chooses to add cards, types "sol ring", sees matching cards, picks one, then picks the printing they actually own (the one from Commander Legends), sets foil, English, near mint, quantity 2, and saves. The card now appears in the collection and the collection's counts go up.

**Why this priority**: Without a way to put cards in, the collection feature records nothing. This is the core of the feature.

**Independent Test**: In an empty collection with no subcollections, search a card, pick it, choose a printing and details, save; the card appears in the collection's list and in its card count.

**Acceptance Scenarios**:

1. **Given** a collection with no subcollections, **When** the person chooses "Adicionar cartas", **Then** the search modal opens with the field focused and no results yet.
2. **Given** the search modal, **When** the person types fewer than 3 characters, **Then** no search runs and the modal says how many characters are needed; **When** they type 3 or more, **Then** matching cards are listed, one entry per card.
3. **Given** results, **When** the person picks a card, **Then** the add-card modal opens for that card, listing its printings to choose from, with finish, language, condition and quantity preset to non-foil, English, near mint and 1.
4. **Given** the add-card modal with a printing chosen, **When** the person chooses "Salvar e adicionar outra", **Then** a card is created in the collection with that printing's data and the chosen details, the add-card modal closes, the search modal is still open with its results, and a confirmation is shown.
5. **Given** the add-card modal with a printing chosen, **When** the person chooses "Salvar", **Then** the same card is created, both modals close and the collection's list and counts already include it.
6. **Given** the person is adding, **When** they cancel the add-card modal, **Then** nothing is saved and they return to the search results.
7. **Given** a search with more than 100 matches, **When** the person scrolls to the end of the results, **Then** the next 100 load, until none are left.
8. **Given** the add-card modal, **When** the person enters a quantity that is not a whole number of at least 1, **Then** saving is refused and the reason is shown.
9. **Given** the collection gained subcollections after the modal opened, **When** the person saves, **Then** the card is added to the first subcollection and the person is told where it went and acknowledges it (FR-017).

---

### User Story 2 - See the cards in a collection (Priority: P1)

A player opens a collection that holds cards and sees each card in it: its name, set and collector number, finish, language, condition, quantity and for-sale flag, replacing the "em breve" placeholder.

**Why this priority**: Adding cards is only useful if the person can see where they went.

**Independent Test**: With a collection holding cards (added or synced), open it and check every card appears with its details; open one holding thousands and check it appears without a perceptible wait.

**Acceptance Scenarios**:

1. **Given** a collection that holds cards directly, **When** it is opened, **Then** the cards placed directly in it are listed with the details above, and the placeholder is gone.
2. **Given** a collection with an image available for a card, **When** it is listed, **Then** the card's image is shown with it.
3. **Given** a collection with subcollections, **When** it is opened, **Then** it shows its subcollections as before and no card list, since it holds no cards directly.
4. **Given** an empty collection with no subcollections, **When** it is opened, **Then** an empty state offers to add the first card (look and wording decided with the design handoff).
5. **Given** two profiles on the device, **When** each opens a collection, **Then** each sees only their own cards.
6. **Given** the holding box holds cards, **When** it is opened, **Then** its cards are listed with the same details, with no add or edit actions.

---

### User Story 3 - Handle a card I already own (Priority: P2)

A player adds a Lightning Bolt (same printing, non-foil, English, near mint) that they already have, in this collection or another. The app tells them they already own it and where, and lets them either add the new quantity to the existing row or keep it as a separate row.

**Why this priority**: Avoids silent duplicates without taking the decision away from the person, who may keep copies as separate rows on purpose.

**Independent Test**: Add the same printing with the same finish, language and condition twice; at the second save the warning appears, and each of the two choices produces the described result.

**Acceptance Scenarios**:

1. **Given** the profile already holds a row with the same printing, finish, language and condition, in any collection, **When** the person saves a new card matching it, **Then** nothing is saved yet and they are told a matching card exists, and where, with the choices "somar à quantidade existente", "adicionar como linha separada" and cancel.
2. **Given** that warning, **When** they choose to merge, **Then** the existing row's quantity increases by the new quantity, it stays where it is, and no new row is created.
3. **Given** that warning, **When** they choose a separate row, **Then** a new row is created in the collection being added to and both remain.
4. **Given** the only match is a card in a deck, **When** the person saves, **Then** the warning appears and says it is in that deck.

---

### User Story 4 - Correct an owned card (Priority: P2)

A player notices a card was recorded as near mint but is lightly played, or the quantity changed after a trade. They open the card from the list, change the details and save.

**Why this priority**: Real collections change; without editing, any mistake is permanent (removal is a later spec).

**Independent Test**: Open an owned card, change each editable field, save; the list shows the new values and they survive a reload and a sync.

**Acceptance Scenarios**:

1. **Given** a card in a collection's list, **When** the person chooses to edit it, **Then** a form opens with its current printing, finish, language, condition, quantity, for-sale flag and notes.
2. **Given** the edit form, **When** the person picks another printing of the same card and saves, **Then** the card shows that printing's set, collector number and image, with its other details kept.
3. **Given** the edit form, **When** they change values and save, **Then** the list and the collection's counts (including for-sale) reflect the change.
4. **Given** the edit form, **When** they cancel, **Then** nothing changes.
5. **Given** an edit that makes the card match another row in the profile (same printing, finish, language, condition), **When** they save, **Then** the same warning and choices as in User Story 3 apply, merging into the other row or keeping both.
6. **Given** the edit form, **When** the person tries to enter a quantity that is not a whole number of at least 1, **Then** it is not accepted and the reason is shown.

---

### User Story 5 - Cards sync like the rest (Priority: P3)

A player adds and edits cards on one device and finds them on another after syncing, and a card changed on two devices resolves to the latest change.

**Why this priority**: Sync already exists for the owned-card record; this only guarantees the new flows and the changed record keep working with it.

**Independent Test**: Add and edit cards on device A, sync, sync on device B; cards, quantities and locations match.

**Acceptance Scenarios**:

1. **Given** cards added or edited while offline, **When** the person syncs, **Then** they reach the account like any other change, and a later sync on another device shows them.
2. **Given** a card edited on two devices, **When** both sync, **Then** the most recent edit wins, as for collections and decks.

---

### Edge Cases

- **Offline while searching or adding**: the catalog needs a connection. The search or the printings list shows a plain PT-BR message that the catalog can't be reached, with a way to retry; listing owned cards and editing their other details work offline, while changing a card's printing needs the catalog. No untranslated error text ever reaches the person (Constitution II).
- **Catalog returns nothing**: the search modal says no card matched.
- **Typing quickly**: only the results for the latest text are shown; an older, slower answer never replaces newer results.
- **Scrolling to the end of results**: the next page loads; at the last page nothing more is requested; a failed page load can be retried without losing the results already shown.
- **Card with two faces**: it is listed and added as one card, with the data both faces need to be shown.
- **Printing has no image**: the card is added and listed without an image.
- **Collection gets subcollections while a modal is open** (for instance through a sync): the card is added to the collection's first subcollection and the person is told so, acknowledging it (FR-017).
- **Collection deleted while a modal is open**: the modals close and the person returns to the collection area, as for other pages inside a deleted collection; nothing is saved.
- **Same card added twice quickly**: the second save sees the first and warns.
- **Collection holding box**: it is not a collection; cards cannot be added to it or edited from it, but they are listed on its page next to its count summary.
- **Card in a deck**: a card whose location is a deck is not in any collection's list and is not touched by this spec.
- **Mixed collection left by an old sync**: the existing repair still moves its cards into its first subcollection (008 FR-029); this spec's list only ever shows cards placed directly in the opened collection.
- **Many cards in one collection**: the list and its counts remain responsive with thousands of cards.

## Requirements *(mandatory)*

### Functional Requirements

**Where it lives**

- **FR-001**: The card list and the add and edit actions MUST live inside collection pages; there MUST be no new route and no navigation entry.
- **FR-002**: A collection that holds cards directly MUST list those cards, each with its name, set and collector number, finish, language, condition, quantity and for-sale flag, plus its image when it has one. The card-list placeholder from 008 FR-030 MUST be removed.
- **FR-003**: An empty collection with no subcollections MUST show an empty state that offers to add the first card. The list's layout and the empty state's look and wording are defined by the design handoff and are not fixed by this spec.
- **FR-004**: The "adicionar cartas" action MUST be available on a collection that has no subcollections (empty or holding cards) and MUST NOT be available on one that has subcollections, nor on the holding box. Cards in the holding box MUST be listed as in FR-002 but without add or edit actions, which amends 008 FR-016 (count summary only). The disabled "add cards" placeholder from 008 FR-030 MUST be replaced by it. The search and filters placeholders from 008 FR-030 stay as they are.

**Searching for a card**

- **FR-005**: "Adicionar cartas" MUST open a search modal; picking a card from its results MUST open a separate add-card modal. The add-card modal MUST offer "Salvar e adicionar outra", which saves and returns to the search modal with its text and results as they were, and "Salvar", which saves and closes both modals. Cancelling the add-card modal saves nothing and returns to the search modal; closing the search modal returns to the collection page.
- **FR-006**: The search MUST look up cards by name, one result per card regardless of how many printings it has, matching ignoring case and accents, and MUST NOT run for fewer than 3 characters.
- **FR-007**: Results MUST be loaded 100 at a time; scrolling to the end of the list MUST load the next 100 until the results are exhausted.
- **FR-008**: Each result MUST show enough to recognize the card (at least its name and type line).
- **FR-009**: The search MUST show only the results of the latest text, and MUST show loading, empty, "type more characters" and failure states, each in PT-BR.

**Adding a card**

- **FR-010**: The add-card modal MUST show the picked card's printings so the person can choose the one they own, identifying each by at least its set, collector number and, when available, its image. It MUST NOT save until a printing is chosen.
- **FR-011**: The modal MUST collect finish (always non-foil, foil or etched), language, condition (NM, LP, MP, HP, DMG), quantity (the number of copies this row stands for), for-sale flag and notes, preset to non-foil, English, NM, 1, not for sale and no notes.
- **FR-012**: Saving MUST create one owned card in the collection, with the chosen printing's identity data (the printing and card ids, name, set, collector number, rarity, commander legality, color identity, type line, whether it can be a commander, image and, for double-faced cards, the faces) copied onto it, so it can be listed and used offline afterward.
- **FR-013**: Quantity MUST be a whole number of at least 1; an invalid value MUST be refused with the reason shown.
- **FR-014**: The for-sale flag and notes MUST be optional on the add form, and editable later.
- **FR-015**: If the profile already holds a card with the same printing, finish, language and condition as the one being saved, in any collection or deck, the app MUST save nothing yet, tell the person that a match exists and where, and offer: add to the existing quantity (the existing row stays where it is), add as a separate row in the collection being added to, or cancel.
- **FR-016**: After a successful save the person MUST see a confirmation, and the collection's counts (cards, for sale) MUST reflect it immediately, without a sync.
- **FR-017**: If, at save time, the collection has gained subcollections, the card MUST be added to the collection's first subcollection in alphabetical order (descending to its first subcollection again while that one has subcollections too), mirroring 008 FR-029, and the person MUST be told it was added there, naming it, and acknowledge it (an "ok" or similar). How the notice looks and is acknowledged is decided with the design handoff. If the collection no longer exists, nothing is saved and the person is told why.

**Editing a card**

- **FR-018**: A card in a collection's list MUST be editable: printing, finish, language, condition, quantity, for-sale flag and notes. The printing choices are the other printings of the same card; changing it replaces the card's copied printing data (FR-012) with the new printing's. Its collection MUST NOT be changeable here. Moving and removing cards are not part of this spec.
- **FR-019**: An edit that makes the card match another row in the profile (FR-015's match) MUST trigger the same warning and choices, with "add to the existing quantity" meaning the edited card's quantity is added to the other row and the edited row is no longer kept (the only way a card row disappears in this spec). Cancel keeps the card as it was.
- **FR-020**: Edits MUST update the card's last-changed time so sync keeps resolving by most recent change.

**The owned-card record and the cloud**

- **FR-021**: The owned-card record MUST stay as it is, "can be commander" included (008 FR-024 stands); what is stored on the device and in the account is unchanged. A new card's flag MUST be set when it is added: true when its type line is both legendary and a creature, or its rules text says it can be the person's commander, otherwise false. Edits never change it, since changing the printing keeps the same card.
- **FR-022**: Cards already stored without a reliable flag are not migrated or recomputed.
- **FR-023**: Cards MUST be saved locally first and reach the account only through a sync, like collections and decks, and the new add and edit flows MUST NOT start a sync themselves.
- **FR-024**: Searching and picking printings (when adding, or when changing a card's printing) read the public catalog and need a connection; listing, editing a card's other details and everything else MUST work offline with only a local profile (Constitution IV).

**Language and errors**

- **FR-025**: All text — labels, messages, the warning, empty and error states — MUST be PT-BR, and any failure from the catalog MUST be translated like other cloud errors; no raw error text reaches the person.

**Artist data (backlog #13)**

- **FR-026**: The catalog refresh MUST record each printing's artist, and the catalog MUST be able to hold it. Printings with no artist in the source data, or not yet refreshed, have none.
- **FR-027**: Where a printing's artist is shown (the printing choices, the card list, or both) is decided with the design handoff; this spec requires only that the artist be available from the catalog for printings that have one.
- **FR-028**: The catalog stays readable without signing in. Whether the owned card also stores the artist follows the design handoff's decision on FR-027 (it must, if the card list is to show it).

**Holding box**

- **FR-029**: The holding box's cards are the cards whose location matches no collection and no deck (008 FR-016), listed read-only.

### Key Entities *(include if feature involves data)*

- **Owned card**: a printing the person owns (the number of copies is its quantity), with finish, language, condition, quantity, for-sale flag and optional notes, placed in at most one collection (or deck). It carries a copy of its printing's identity data so it works offline. It keeps its "can be commander" flag, now filled in at add time.
- **Catalog card**: one card as the catalog lists it (name, type line, rules text), shared by all its printings. What the search returns.
- **Printing**: one edition of a catalog card (set, collector number, rarity, artist, image). What the person picks in the add-card modal.
- **Collection**: unchanged; holds cards directly or subcollections, never both (008). This spec adds cards to its leaf side.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can go from an open collection to a saved card in under one minute on a normal connection, without leaving the collection page.
- **SC-002**: The first page of search results appears within about one second of the person's pause in typing, on a normal connection.
- **SC-003**: Searching a very common name still returns a first page of results, and all matching cards are reachable by scrolling, 100 at a time.
- **SC-004**: A collection holding several thousand cards opens, with its list and counts, without a perceptible wait.
- **SC-005**: Adding or editing a card into a match with one already owned anywhere in the profile never silently creates or hides a duplicate: in every such case the person is asked, and the result matches their choice.
- **SC-006**: A card added or edited offline appears with the same details on a second device after syncing both.
- **SC-007**: Every failure in searching, adding, editing or syncing the new flows shows PT-BR text, with no raw error message.

## Assumptions

- The catalog already holds one row per card and one row per printing, and is readable without signing in; the only catalog change in this spec is the printing's artist (FR-026).
- Language choices are the set recorded in the card-features reference (`backlog/reference/card-features.md`), shown with PT-BR names, English first.
- Search matches names as the catalog stores them (English); searching in Portuguese is out of scope.
- Quantity (copies per row) has no stated upper bound; the plan may set a sane limit.
- There is no way to remove a card in this spec, so a card added by mistake stays until a later spec adds removal; editing it (including its printing) is the only correction, and quantity stays at least 1.
- The holding box's cards are listed read-only; moving or managing them is a later spec.
- A card's for-sale flag only marks it; it has no price (prices are out of scope).
- Cards in decks and deck quantity reservation (a card in a deck not reducing the collection's quantity) are untouched here.
- The previous collection's list placeholder, "em breve" text and its disabled add button are replaced; only the search and filters placeholders remain disabled.
- Out of scope: list search and filters, moving and removing cards, OCR scanning, CSV import, prices, live Scryfall API, deck quantity reservation.
