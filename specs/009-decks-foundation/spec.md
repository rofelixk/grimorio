# Feature Specification: Decks Foundation

**Feature Branch**: `009-decks-foundation`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "we're doing decks now. Decks are pretty much another version of a collection, they hold cards. Since this project is about having high fidelity of locaiton of cards there will be some future shenannigans like "when a card is placed on a deck it leaves the collection" but that's some future work and not on this scope. The scope right now is just a way of listing decks and CRUD of them"

## Clarifications

### Session 2026-09-28

- Q: Besides the name, what does a deck carry in this slice? → A: A format (Commander, Pauper, …), no color (FR-003).
- Q: Do decks sync with the linked cloud account in this slice? → A: Yes, like collections: owner-only cloud copy, most recent change wins, deletion markers (FR-012).
- Q: What happens to a deck's cards when it is deleted? → A: They always go to the holding box ("Caixa temporária"); there is no option to delete them (FR-009).
- Q: Which formats are offered? → A: Commander, Duel Commander, cEDH, Pauper, Modern, Standard, Premodern and Casual, for starters (FR-003). *Superseded by the design handoff below.*
- Q: Does the form explain the chosen format? → A: Yes. Picking a format in the create or edit form shows a short summary of how that format's deck is built (FR-016).
- Q: What does a deck's own page show? → A: Only its name and format, with edit (name, format) and delete. Anything else inside a deck — card list, counts, placeholders for them — is out of scope (FR-004, FR-005).
- Q: Where can a person edit or delete a deck: from the deck page only, or also from each row in the deck list? → A: Only on the deck page; list rows just open the deck, like collection rows (FR-007, FR-008).
- Q: Leaving a deck page for the deck list, which navigations play the page turn? → A: The back link, "Decks" in the side nav, and browser/Android back; the wordmark goes to Home with no turn (FR-018).

### Design handoff 2026-09-28

Amendments from `design_handoff_decks_foundation/` (the hi-fi prototype `Decks Hi-fi.dc.html` and its README):

- The format list is **8** formats: Commander, Pauper, Modern, Standard, Pioneer, Legacy, Vintage, Casual. Duel Commander, cEDH and Premodern are removed; Pioneer, Legacy and Vintage are added, with their summaries (FR-003, FR-016).
- Each deck in the list is shown as a fan of sleeved cards with a slot for a featured card. With no card data yet, the slot shows a placeholder; card images, once they arrive, are never cropped, masked or altered (FR-017).
- The deck page is its header only (back, name, format, edit, delete); what goes below it is the next spec (FR-005).
- Opening a deck from the list and going back to the list turn the page, with dust in the deck's colors; direct loads and reduced motion swap instantly. Until card data exists the dust is parchment-colored (FR-018).
- The deck page keeps the profile's colors: a deck's own colors may differ and appear only in the transient dust (FR-018).
- Duplicate names are compared ignoring accents as well as case and surrounding spaces (FR-003).
- Long names wrap in the list instead of being truncated (Edge Cases).

## Context

A deck is a physical place that holds cards, like a collection (spec 008): a deck box on the shelf, sleeved and ready to play. Because Grimorio answers "where is this card, right now" (Constitution I), a deck will later become a card location in its own right — placing a card in a deck will take it out of its collection. That card movement is a later spec.

This first slice builds the deck area: a list of the profile's decks and creating, opening, editing and deleting a deck. A deck holds no cards yet: the list shows each deck as a fan of sleeved cards whose featured card is a placeholder, and its page shows only its name and format with edit and delete; what goes inside a deck is a later spec. The existing deck screens, the deck record and its commander/legality prototype are **not** a starting point — this feature replaces them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See my decks (Priority: P1)

A player opens "Decks" and sees every deck they've registered — "Krenko goblins", "Atraxa superfriends", "Pauper faeries" — each with its name and format. From here they can open a deck.

**Why this priority**: It's the entry point of the deck area; creating, editing and deleting happen from here.

**Independent Test**: With a profile holding several decks, open the deck area and check each deck is listed with its name and format in alphabetical order; open one and check its page.

**Acceptance Scenarios**:

1. **Given** an active profile with decks, **When** the person opens the deck area, **Then** every deck is listed, in alphabetical order, as a fan of sleeved cards with a featured-card placeholder, its name and its format.
2. **Given** a listed deck, **When** the person opens it, **Then** the page turns to its page: name, format, a way back to the deck area, and the edit and delete actions — nothing else.
3. **Given** a profile with no decks, **When** the person opens the deck area, **Then** they see an empty state that explains what a deck is and offers to create the first one.
4. **Given** two profiles on the device, **When** each opens the deck area, **Then** each sees only their own decks.
5. **Given** a deck page, **When** the person goes back to the deck area (back link, side-nav "Decks", or browser/Android back), **Then** the page turns back to the list; **When** reduced motion is on or the page is loaded directly, **Then** it appears at once with no turn.

---

### User Story 2 - Create and edit a deck (Priority: P1)

A player just sleeved a new deck. From the deck area they create a deck, name it "Krenko goblins" and keep the preselected format, Commander. Later they rename it. The change is saved on the device at once and works offline.

**Why this priority**: Without creating decks there is nothing to list; this and Story 1 together are the minimum viable slice.

**Independent Test**: Offline, create a deck, see it listed; edit it, reload the app, and check the changes persisted.

**Acceptance Scenarios**:

1. **Given** the deck area, **When** the person creates a deck with a valid name and a format, **Then** it appears in the list with that format.
2. **Given** the create form, **When** the name is empty, only spaces, or longer than 40 characters, **Then** the deck is not created and a PT-BR message says why.
3. **Given** the create form, **When** the name matches another of the profile's decks (ignoring case and surrounding spaces), **Then** the deck is not created and a PT-BR message says the name is already in use (comparison also ignores accents).
4. **Given** an existing deck, **When** the person edits its name or format, **Then** the list and its page show the change immediately.
5. **Given** no network connection, **When** the person creates or edits a deck, **Then** it works exactly as online, and the change survives an app restart.
6. **Given** the create or edit form, **When** a format is selected (including the preselected Commander when the form opens), **Then** a short PT-BR summary of how a deck of that format is built is shown next to the format choice, and it updates at once when the person picks another format.

---

### User Story 3 - Delete a deck (Priority: P2)

A player took a deck apart. They delete it from the app after confirming; any cards recorded in it go to the holding box ("Caixa temporária") until they're put away, so no card loses its place.

**Why this priority**: Deleting completes the requested CRUD. Decks hold no cards in this slice, but the rule for their cards is fixed now so the deck-cards spec doesn't change what a delete does.

**Independent Test**: Delete a deck, confirm, and check it's gone from the list and its page address no longer opens it; cancel a delete and check nothing changed. With a test profile whose data places cards in a deck, delete it and check those cards are in the holding box with their other data unchanged.

**Acceptance Scenarios**:

1. **Given** a deck, **When** the person deletes it, **Then** a confirmation names the deck, and says its cards will go to the "Caixa temporária" when it holds any; on confirm the deck is removed, and canceling changes nothing.
2. **Given** a deck holding cards, **When** the delete completes, **Then** every card that was in it is in the holding box with all its other data unchanged, and the holding box appears in the collection area.
3. **Given** a delete completes (always from the deck's own page), **When** the dialog closes, **Then** the person lands on the deck area and a toast confirms the deck was deleted (and how many cards went to the holding box, if any).
4. **Given** a delete is running, **When** the person tries to close the dialog or act again, **Then** nothing happens until it finishes.

---

### User Story 4 - Decks sync with the linked cloud account (Priority: P3)

A player with a linked cloud account creates decks on their phone, then syncs. On their computer, after syncing, the same decks appear. Nothing reaches the cloud until they sync.

**Why this priority**: Cloud sync is optional (Constitution IV); the feature is complete offline without it.

**Independent Test**: On device A, create, edit and delete decks, sync; on device B with the same account, sync and check the lists match; edit the same deck on both before syncing and check the most recent edit wins.

**Acceptance Scenarios**:

1. **Given** a profile linked to a cloud account, **When** decks are created or changed, **Then** nothing is sent to the cloud until the person syncs.
2. **Given** the person syncs, **When** the sync completes, **Then** the account holds the profile's decks (names and formats) and deletions are applied there too.
3. **Given** the same deck edited on two devices before syncing, **When** both sync, **Then** the most recent edit wins on both.
4. **Given** a deck deleted on one device, **When** the other device syncs, **Then** the deck is removed there too and doesn't come back.
5. **Given** a profile without a linked account, **When** decks are created, **Then** they are never sent anywhere.

---

### Edge Cases

- **Same-named decks created on two devices**: after sync both are kept, and the later-synced one is shown as "Nome (2)", as with collections.
- **Edit on one device while another deleted the deck**: last write wins between the edit and the deletion.
- **Deck name equal to a collection name**: allowed; decks and collections are separate namespaces.
- **Open deck deleted by a sync, or profile switch/sign-out while on a deck page**: the page re-checks the profile as other owned-data pages do, and a deck that no longer exists (or belongs to another profile) returns to the deck area.
- **Very long names**: wrap under the deck's fan in the list and on its page, never truncated; the length limit keeps names reasonable.
- **Reduced motion and narrow screens**: the list, page and forms work from 320 px wide, following DESIGN.md.

## Requirements *(mandatory)*

### Functional Requirements

**Ownership and identity**

- **FR-001**: Every deck MUST belong to exactly one local profile and be visible only to that profile (Constitution IV). The deck area is an owned-data page, gated like the collection area.
- **FR-002**: Decks MUST form a flat list: no deck is nested in another deck or in a collection, and decks hold no subdivisions.
- **FR-003**: Every deck MUST have a name (1–40 characters after trimming surrounding spaces), unique among the profile's decks ignoring case, accents and surrounding spaces, and a format picked from a fixed list, in this order: Commander, Pauper, Modern, Standard, Pioneer, Legacy, Vintage, Casual. A new deck MUST come with Commander preselected, so creating one takes only a name. The format is a label in this slice: it doesn't validate the deck's contents.

**Deck area and deck page**

- **FR-004**: The deck area MUST list the profile's decks in alphabetical order by name (PT-BR collation, ignoring case and accents), each shown as a fan of sleeved cards with its featured card (FR-017), its name and its format. The whole deck is one link to its page.
- **FR-005**: Opening a deck MUST show its page: a header with its name and format, a way back to the deck area, and edit and delete actions — nothing else: no card list, counts or placeholders for them. What goes below the header is the next spec. Each deck MUST have its own address in the app: back returns to the deck area, a reload stays on the deck, and opening the address of a deck that no longer exists (deleted, removed by sync, or another profile's) MUST return to the deck area.
- **FR-006**: With no decks, the deck area MUST show an empty state explaining decks and offering to create one.
- **FR-017**: Each deck's fan MUST reserve a slot for a featured card. Until decks hold cards, the slot MUST show a placeholder saying the featured card arrives with the deck's cards. A card image shown in it later MUST be whole and unaltered — never cropped, masked or recolored; only moved or scaled as a whole.
- **FR-018**: Opening a deck from the deck area, and returning to the deck area from a deck page (its back link, "Decks" in the side nav, or the browser/Android back), MUST turn the page like a book, with dust stirred by the turning edge that settles and fades within about 2 seconds, leaving nothing behind. The dust takes the deck's colors; while decks hold no cards it is parchment. Loading a deck page or the deck area directly, or any other navigation (including the wordmark, which goes to Home, and landing on the deck area after a delete), MUST NOT animate, and with reduced motion the swap MUST be instant with no dust. Input is ignored while a turn runs. The deck page and the rest of the shell keep the profile's colors; a deck's colors appear only in the dust.

**Create, edit, delete**

- **FR-007**: The person MUST be able to create a deck from the deck area, and edit its name and format from its page. Edit and delete live only on the deck page; a row in the deck list only opens its deck, as a collection row does. Validation errors MUST be shown in PT-BR next to the field.
- **FR-016**: The create and edit forms MUST show, for the selected format, a short PT-BR summary of its deck structure, updated as soon as the format changes. The summary is information only: it validates nothing and blocks nothing. It covers deck size, copy limit, sideboard, commander and color identity where they apply, and which cards are allowed, never a ban list. Content for this slice:

  | Format | Summary (content, final PT-BR copy fixed with DESIGN.md) |
  |--------|----------------------------------------------------------|
  | Commander | Exatamente 100 cartas, contando o comandante. Uma cópia de cada carta, exceto terrenos básicos. O comandante é uma criatura lendária. Todas as cartas na identidade de cor do comandante. Sem sideboard. |
  | Pauper | Mínimo de 60 cartas. Sideboard de até 15 cartas. Até 4 cópias de cada carta, exceto terrenos básicos. Só cartas impressas como comuns. |
  | Modern | Mínimo de 60 cartas. Sideboard de até 15 cartas. Até 4 cópias de cada carta, exceto terrenos básicos. Cartas de coleções a partir da Oitava Edição. |
  | Standard | Mínimo de 60 cartas. Sideboard de até 15 cartas. Até 4 cópias de cada carta, exceto terrenos básicos. Só cartas das coleções mais recentes, que rodam com o tempo. |
  | Pioneer | Mínimo de 60 cartas. Sideboard de até 15 cartas. Até 4 cópias de cada carta, exceto terrenos básicos. Cartas de coleções a partir de Retorno a Ravnica. |
  | Legacy | Mínimo de 60 cartas. Sideboard de até 15 cartas. Até 4 cópias de cada carta, exceto terrenos básicos. Cartas de todas as coleções, com lista de banidas própria. |
  | Vintage | Mínimo de 60 cartas. Sideboard de até 15 cartas. Até 4 cópias de cada carta, exceto terrenos básicos. Cartas de todas as coleções. Cartas da lista de restritas: só 1 cópia. |
  | Casual | Sem regras fixas: o deck segue o que o seu grupo de jogo combinar. |

  The handoff flags this copy as needing product review before it goes into DESIGN.md.
- **FR-008**: Deleting a deck MUST require a confirmation naming the deck. On completion a PT-BR toast MUST confirm it, and the person MUST land on the deck area. While a delete runs, the dialog MUST NOT be closable and its actions MUST be locked.
- **FR-009**: Deleting a deck MUST move every card recorded in it to the holding box ("Caixa temporária", spec 008 FR-016), keeping every other attribute of each card; there is no option to delete the cards with the deck. The delete MUST apply entirely or not at all: an interruption never leaves a card pointing at a deleted deck as if the deck still existed — such a card counts as a holding-box card. Deleting a deck MUST NOT change any collection or any card outside it. In this slice decks hold no cards, so the rule is fixed now and exercised once the deck-cards spec places cards in decks.

**Storage, sync and scope**

- **FR-010**: All deck changes MUST be saved on the device first and work fully offline (Constitution IV, VI).
- **FR-011**: A deck record MUST stay small: its own identity, name, format and change time only — no copies of card data and no stored counts.
- **FR-012**: Decks MUST reach the linked cloud account only when the person syncs (from the shell's sync controls, as collections do), and MUST never leave the device for a profile without a linked account. Sync MUST carry deck creations, edits and deletions in both directions, resolving conflicts by the most recent change per deck, and MUST NOT resurrect a deck deleted on another device (Constitution VI). If sync leaves two decks with the same name (FR-003), both MUST be kept and the one synced later renamed with the lowest free numbered suffix — "Nome (2)", "Nome (3)" — shortening the base name if needed to stay within 40 characters; the rename is an ordinary edit, carried on the next sync. The cloud copy of decks MUST be readable and writable only by the owning account.
- **FR-013**: This feature MUST replace the existing deck screens, the deck record (commander, deck-card list, free-build cards) and the deck legality checks rather than extend them; nothing of the old implementation is kept for compatibility, and existing local deck data is dropped, not migrated.
- **FR-014**: All user-facing text MUST be PT-BR (Constitution II), and every cloud error reaching the person MUST be translated.
- **FR-015**: The deck area's visual design MUST be added to DESIGN.md before it is built (Constitution V), taken from the design handoff (`design_handoff_decks_foundation/`, hi-fi `Decks Hi-fi.dc.html`): the deck fans with the featured-card placeholder, the empty state, the deck page header, the create/edit dialog with the format picker and its rules summary, the delete confirmation and toast, and the page turn with dust (FR-018). It reuses the collection area's patterns (create row, compact dialogs, toast) wherever they fit.

### Key Entities

- **Deck** (new, replaces the old deck record): a physical deck holding cards. Owner profile, name, format, last-change time. No card data or counts are stored on it.
- **Deck format**: one of 8 fixed formats (FR-003), stored by its identity, shown by its name.
- **Deletion marker**: the minimal record of a deleted deck, kept only until synced, so other devices apply the deletion instead of restoring it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can create a named deck from the deck area in under 15 seconds and at most 3 interactions after typing the name.
- **SC-002**: With 200 decks, the deck area shows its list in under 1 second on a mid-range phone.
- **SC-003**: All deck features work with no network, and a profile never sees another profile's decks.
- **SC-004**: After deleting a deck, 100% of the cards that were in it are found in the holding box with their other data unchanged, and every collection and every card outside the deck is unchanged.
- **SC-005**: No two decks of one profile can end up with the same name (ignoring case, accents and surrounding spaces) through any path in the app.
- **SC-006**: After both devices sync, two devices on the same account show identical deck lists (names and formats) in 100% of tested scenarios, including concurrent edits and deletions.

## Assumptions

- "User" means the local profile (Constitution IV).
- Decks live in their own area ("Decks" in the side nav), separate from the collection area; they are not listed among collections. A card in a deck is not a holding-box card; it becomes one only when its deck is deleted.
- Adding cards to a deck, moving owned cards from a collection into a deck, deck-building aids (commander, legality, color identity, mana curve) and deck analysis are later specs, as is everything shown inside a deck beyond its name and format; this slice reserves no space for them on the deck page. The only reserved slot is the featured card in each deck's fan (FR-017); how a deck's featured card and colors are picked comes with the deck-cards spec.
- Decks are not nested and cannot be grouped into folders in this slice.
- The app is unreleased: existing local deck data is dropped, not migrated; the old cloud deck tables were already dropped, and the new cloud copy is designed from scratch.
- The format list is a starting set of formats popular in Brazil; more can be added by a later spec. "Casual" covers any deck that fits none of the others. Formats are names, not rule sets, until a deck-analysis spec.
- Format names are shown as players say them in Brazil (the English names, e.g. "Standard", not "Padrão").
- The format summaries (FR-016) describe structural rules that rarely change; ban lists and rotation dates are left out so the text doesn't go stale. They're shipped with the app, so they work offline.
- Copy and visual details follow the design handoff and are fixed with the DESIGN.md addition (FR-015). `Decks Transições.dc.html` (option 4a is the chosen dust) and `Decks Wireframes.dc.html` are background only; the hi-fi prototype wins where they differ, except that specks fade out one by one at random rather than all together.
