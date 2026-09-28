# Feature Specification: Collections Foundation

**Feature Branch**: `008-collections-foundation`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "let's build from the ground up the logic behind collections, you MUST ignore any existing collection function and layout, including supabase. This is the main feature of the app. Every user has a main collection area where their different boxes or folders will reside. The main view of the locations list will list their collections and show basic data like how many cards and how many cards for sale are in them, as well as a how many sublocations. As with other data all collections are saved first locally and pushed to supabase only when synced. Each collection MUST belong to a user. If a user deletes a collection or subcollection the user will be prompted to either delete all cards inside of it or move all to a temporary holding box. This temporary box only shows up if the user has cards not assigned a collection. we MUST pay close attention as to how data is saved to prevent bloating if users have a ton of cards. each location has a name and a color so the user can differentiate between them. for now let's focus on just creating the main view with the collections list and the new collection crud, also the new subcollection CRUD. a collection has a max depth of 3."

## Clarifications

### Session 2026-09-28

- Q: Which colors can a collection have? → A: A larger fixed palette of about 10–12 named colors, added to DESIGN.md, separate from the five identity colors (FR-004).
- Q: Does this spec also rebuild the owned-card record for the anti-bloat goal? → A: No. Only the collection side is rebuilt; the current card record and its reference to a location stay until a later card spec (FR-024).
- Q: When a collection (or the holding box) is opened, does its page list the cards inside it? → A: No. It shows counts and direct subcollections only; the holding box opens to a count summary. Card lists come with a later card spec (FR-006, FR-016).
- Q: After sync, what happens to a subcollection whose parent was deleted on another device? → A: It is removed as part of the deleted subtree; any cards in it show up in the holding box (FR-019).
- Q: What happens when sync brings in two sibling collections with the same name? → A: Both are kept; the later-synced one is renamed with a numbered suffix, e.g. "Fichário azul (2)" (FR-003, FR-019).
- Q: Does each opened collection have its own address in the app? → A: Yes. Back returns to the level above, a reload keeps the place, and opening one that no longer exists returns to the collection area (FR-006).
- Q: If a sync leaves a collection holding both cards and subcollections, where do its cards go? → A: Into its first subcollection in alphabetical order, mirroring the in-app rule (FR-029).
- Q: Is "Caixa temporária" the holding box's final name? → A: Yes, final (FR-016).

### Design handoff 2026-09-28

Amendments from `design_handoff_collections_foundation/` (the hi-fi prototype `Colecao.dc.html` and its README):

- A collection holds **cards or subcollections, never both**; whatever goes in first sets it, and a level-3 collection holds only cards. Creating the first subcollection in a collection with cards moves those cards into it; deleting the last subcollection leaves the parent empty again (FR-027–FR-029).
- The collection palette has **16** named colors, replacing "about 10–12" (FR-004).
- The preselected color is the first palette color no sibling uses (FR-005).
- The holding box's PT-BR name is **"Caixa temporária"** (confirmed as final above).
- Search, filters, the card list and "add cards" ship now as visibly disabled placeholders, so later specs don't change the layout (FR-030).
- A finished delete shows a confirmation toast, and a page inside the deleted subtree goes to the deleted collection's parent (FR-031).

## Context

Collections are Grimorio's main feature: they answer "where is this card, right now" (Constitution I). The existing collection screens, their storage and their cloud tables are prototypes and are **not** a starting point — this feature rebuilds the collection logic from scratch and replaces them.

Each local profile has one **collection area**: the top of its storage tree. Inside it, the person creates **collections** — the boxes, binders and folders that physically hold their cards — and inside a collection, **subcollections** (a divider inside a box, a page range in a binder), down to three levels in total. Each collection has a name and a color so the person can tell them apart at a glance. A collection either holds cards directly or is divided into subcollections, never both — like a box that either has cards in it or has dividers with cards behind them.

This first slice builds the collection area's main view (the list of collections with their card counts) and creating, renaming, recoloring, nesting and deleting collections. Adding cards to collections is a later spec; this one fixes how collections are stored so that a profile with tens of thousands of cards stays small and fast, locally and in the cloud.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See my collections at a glance (Priority: P1)

A player opens "Coleção" and sees every top-level collection they've made — "Caixa de trocas", "Fichário azul", "Deck box do Commander" — each in its own color, with how many cards it holds, how many of those are for sale, and how many subcollections it has. From here they can open a collection to see its subcollections.

**Why this priority**: This is the entry point to the main feature. Everything else (creating, editing, deleting) happens from this view.

**Independent Test**: With a profile holding several collections (some nested, some with cards), open the collection area and check that each top-level collection shows its name, color, card count, for-sale count and subcollection count, and that opening one lists its subcollections with the same data.

**Acceptance Scenarios**:

1. **Given** an active profile with collections, **When** the person opens the collection area, **Then** every top-level collection is listed with its name, its color, its total card count, its for-sale card count and its subcollection count.
2. **Given** a collection with subcollections that hold cards, **When** it is listed, **Then** its card and for-sale counts include the cards in all its subcollections, not only the ones placed directly in it.
3. **Given** a listed collection, **When** the person opens it, **Then** they see its card, for-sale and subcollection count summary, its level ("Nível n de 3"), and either its direct subcollections listed with the same data, or — if it holds cards — a placeholder saying the card list is coming (no list of the cards themselves), and a way back to each level above.
4. **Given** a profile with no collections, **When** the person opens the collection area, **Then** they see an empty state that explains what a collection is and offers to create the first one.
5. **Given** two profiles on the device, **When** each opens the collection area, **Then** each sees only their own collections.
6. **Given** a profile with several thousand cards across its collections, **When** the collection area opens, **Then** the list and its counts appear without a perceptible wait.
7. **Given** a collection with no cards and no subcollections, **When** it is listed, **Then** its row says it is empty ("Vazia"); **When** it is opened, **Then** it offers the two ways to use it — keep cards directly (disabled until the card spec) or divide it into subcollections (not offered at level 3).

---

### User Story 2 - Create, rename and recolor a collection (Priority: P1)

A player just bought a new binder. From the collection area they create a collection, name it "Fichário vermelho" and pick a color. Later they rename it and change its color. The change is saved on the device at once and works offline.

**Why this priority**: Without creating collections there is nothing to list; this and Story 1 together are the minimum viable slice.

**Independent Test**: Offline, create a collection with a name and color, see it listed; rename and recolor it, reload the app, and check the changes persisted.

**Acceptance Scenarios**:

1. **Given** the collection area, **When** the person creates a collection with a name and a color, **Then** it appears in the list with zero cards, zero for sale and zero subcollections.
2. **Given** the create form, **When** the name is empty, only spaces, or longer than the maximum length, **Then** the collection is not created and a PT-BR message says why.
3. **Given** the create form, **When** the name matches another collection at the same level (ignoring case and surrounding spaces), **Then** the collection is not created and a PT-BR message says the name is already in use there.
4. **Given** an existing collection, **When** the person renames it or changes its color, **Then** the list shows the change immediately, and the cards inside it are unaffected.
5. **Given** no network connection, **When** the person creates or edits a collection, **Then** it works exactly as online, and the change survives an app restart.

---

### User Story 3 - Organize with subcollections (Priority: P2)

A player's trade box has dividers for each color. Inside "Caixa de trocas" they create "Brancas", "Azuis" and so on, and inside "Azuis" one more level, "Raras". The app doesn't offer a deeper level than that. When they divide a box that already holds cards, the app tells them the cards will go into the new first divider, and moves them there.

**Why this priority**: Nesting mirrors real storage and is part of the asked-for scope, but top-level collections alone already deliver value.

**Independent Test**: Create a collection, a subcollection inside it and a third level inside that; check that the third level offers no "create subcollection" action, and that counts roll up to each ancestor. With a collection holding cards, create its first subcollection and check every card moved into it with its other data unchanged.

**Acceptance Scenarios**:

1. **Given** a top-level collection, **When** the person creates a subcollection inside it, **Then** the subcollection appears inside it and the parent's subcollection count goes up by one.
2. **Given** a second-level subcollection, **When** the person creates a subcollection inside it, **Then** it is created at the third level.
3. **Given** a third-level subcollection, **When** the person views it, **Then** no action to create a subcollection inside it is offered.
4. **Given** a subcollection, **When** the person renames or recolors it, **Then** the same rules as for collections apply (Story 2).
5. **Given** a level-1 or level-2 collection that holds cards directly, **When** the person starts creating a subcollection in it, **Then** the form says how many cards it holds and that they will move into the new subcollection, and the confirm action says so ("Criar e mover cartas"); on confirm, the subcollection is created and every card that was directly in the parent is now in it, with all its other data unchanged; canceling changes nothing.
6. **Given** a collection that holds subcollections, **When** the person views it, **Then** no action to place cards directly in it is offered.
7. **Given** a collection whose only remaining subcollection is deleted, **When** the deletion completes, **Then** the collection is empty and offers both ways to use it again.

---

### User Story 4 - Delete a collection and decide what happens to its cards (Priority: P2)

A player empties an old box. They delete it from the app; because cards are still recorded in it (or in its subcollections), the app asks whether to delete those cards too or move them to a temporary holding box, and says how many cards that is. They choose to move them; the cards appear in the holding box until they're placed in another collection.

**Why this priority**: Deleting is part of the requested CRUD, and it is the one action that can silently lose track of cards (Constitution I), so the choice must be explicit.

**Independent Test**: Delete an empty collection (only a confirmation), then a collection with cards in it and in a subcollection; choose "move", check the holding box appears with those cards; delete another with cards and choose "delete", check the cards are gone.

**Acceptance Scenarios**:

1. **Given** a collection whose whole subtree holds no cards, **When** the person deletes it, **Then** a confirmation names the collection and how many subcollections go with it, and on confirm the collection and all its subcollections are removed.
2. **Given** a collection whose subtree holds cards, **When** the person deletes it, **Then** they must choose between deleting those cards and moving them to the holding box, shown with the card count and the number of subcollections that go with it; canceling changes nothing.
3. **Given** the person chose to move the cards, **When** the deletion completes, **Then** the collection and its subcollections are removed, every card that was in them is in the holding box with all its other data unchanged, and the holding box appears in the collection area.
4. **Given** the person chose to delete the cards, **When** the deletion completes, **Then** the collection, its subcollections and every card recorded in them are removed; the confirmation states that this can't be undone.
5. **Given** a subcollection, **When** the person deletes it, **Then** the same choice applies to its own subtree only; its parent and siblings are untouched.
6. **Given** any delete completes, **When** the dialog closes, **Then** a toast confirms what happened (collection deleted; how many cards moved to the holding box, or were deleted), and if the person was on a page inside the deleted subtree they land on the deleted collection's parent (the collection area for a top-level one).
7. **Given** a delete is running, **When** the person tries to close the dialog or act again, **Then** nothing happens until it finishes.

---

### User Story 5 - The holding box (Priority: P2)

Cards whose collection was deleted wait in a holding box. The holding box appears in the collection area only while it holds cards, and disappears once it is empty.

**Why this priority**: It is the safety net that makes "move" in Story 4 possible, and keeps every card findable.

**Independent Test**: With no unplaced cards, check the holding box is absent; move cards into it by deleting a collection, check it's listed with their count; remove those cards, check it disappears.

**Acceptance Scenarios**:

1. **Given** no cards without a collection, **When** the collection area opens, **Then** no holding box is shown.
2. **Given** cards without a collection, **When** the collection area opens, **Then** the holding box is shown in the page header, visually distinct from the person's collections, with its card count (and its for-sale count in its accessible name); opening it shows its card and for-sale counts and what it is for.
3. **Given** the holding box, **When** the person looks for edit actions, **Then** it cannot be renamed, recolored, deleted, or given subcollections, and no collection can be created inside it.
4. **Given** the holding box's last card leaves it, **When** the collection area is shown, **Then** the holding box is no longer listed.

---

### User Story 6 - Collections sync with the linked cloud account (Priority: P3)

A player with a linked cloud account creates collections on their phone, then syncs. On their computer, after syncing, the same collections appear with the same names, colors and nesting. Nothing reaches the cloud until they sync.

**Why this priority**: Cloud sync is optional (Constitution IV); the feature is complete offline without it.

**Independent Test**: On device A, create, edit and delete collections, sync; on device B with the same account, sync and check the tree matches; edit the same collection on both before syncing and check the most recent edit wins.

**Acceptance Scenarios**:

1. **Given** a profile linked to a cloud account, **When** collections are created or changed, **Then** nothing is sent to the cloud until the person syncs.
2. **Given** the person syncs, **When** the sync completes, **Then** the account holds the profile's collections (names, colors, nesting) and deletions are applied there too.
3. **Given** the same collection edited on two devices before syncing, **When** both sync, **Then** the most recent edit wins on both.
4. **Given** a collection deleted on one device and never synced elsewhere, **When** the other device syncs, **Then** the collection is removed there too and doesn't come back.
5. **Given** a profile without a linked account, **When** collections are created, **Then** they are never sent anywhere.

---

### Edge Cases

- **Depth limit on move**: no action in this slice moves a collection to another parent, so a tree can never exceed three levels. (Moving collections is out of scope.)
- **Duplicate names across levels**: "Raras" inside "Caixa A" and "Raras" inside "Caixa B" are both allowed; only siblings must differ.
- **Same-named siblings created on two devices**: after sync both are kept, and the later-synced one is shown as "Nome (2)" (FR-019).
- **Name and color edit on a synced collection while another device deleted it**: last write wins between the edit and the deletion, as elsewhere in sync.
- **Deleting a collection with many cards** (thousands): the operation completes in one step from the person's point of view, the app stays responsive, and an interruption (app closed mid-way) never leaves cards pointing at a collection that no longer exists — such cards count as holding-box cards.
- **Subcollection whose parent was deleted on another device** (created or changed offline under a collection another device deleted): after sync it is removed along with the deleted subtree, on every device; cards in it become holding-box cards.
- **Cards pointing at a missing collection** (for any reason, e.g. a sync that removed a collection another device still had cards in): they are treated as holding-box cards, so no card is ever unfindable.
- **Holding box and sync**: the holding box isn't a stored collection; whether it shows depends only on the cards, on each device.
- **Profile switch or sign-out while on a collection's page**: the page re-checks the profile as other owned-data pages do; the next profile never sees the previous one's collections, and since that collection doesn't exist for it, the page returns to the collection area (FR-006).
- **Open collection deleted by a sync**: the page returns to the collection area (FR-006).
- **Empty subcollection counts**: a collection with only empty subcollections shows zero cards and its subcollection count.
- **A collection with both cards and subcollections after sync** (e.g. cards placed in it on one device while another device divided it, once the card spec lets cards be placed): the same rule as creating the first subcollection applies — its direct cards move into its first subcollection in alphabetical order, as ordinary card edits carried on the next sync (FR-029).
- **Deleting the last subcollection of a collection**: the parent becomes empty, not a card holder by default (FR-028).
- **Creating the first subcollection in a collection with many cards** (thousands): same guarantees as a delete — one step from the person's point of view, and an interruption never leaves the parent holding both cards and subcollections, nor loses a card (FR-015).
- **Very long names**: shown truncated in the list with the full name available; the length limit keeps names reasonable.
- **Reduced motion and narrow screens**: the list and its forms work from 320 px wide, following DESIGN.md.

## Requirements *(mandatory)*

### Functional Requirements

**Ownership and structure**

- **FR-001**: Every collection MUST belong to exactly one local profile and be visible only to that profile (Constitution IV). Collections require an active profile; the collection area is an owned-data page, gated like the others.
- **FR-002**: A profile's collections MUST form a tree of at most three levels: top-level collections, their subcollections, and those subcollections' subcollections. The app MUST NOT offer, and MUST reject, creating a fourth level. Each collection MUST hold either cards directly or subcollections, never both (FR-027).
- **FR-003**: Every collection MUST have a name (1–40 characters after trimming surrounding spaces) and a color. Names MUST be unique among siblings, ignoring case and surrounding spaces.
- **FR-004**: The color MUST be picked from a fixed palette of 16 named collection colors (Branco, Azul, Violeta, Vermelho, Verde, Carvão, Névoa, Anil, Vinho, Ocre, Sálvia, Cinza, Turquesa, Rosa, Laranja, Dourado, in that order), defined in DESIGN.md as part of FR-026. The palette is separate from the identity colors: collection colors appear only as swatches marking a collection, never as UI chrome (the Identity Rule still holds), and each MUST stay readable against the page. Each color MUST have a PT-BR name, given in text wherever the color is the only distinguishing mark (DESIGN.md: never rely on color alone).
- **FR-005**: A new collection MUST come with a preselected color so creating one takes only a name: the first palette color, in palette order, that none of its future siblings uses (the first palette color if all are used).

**Main view**

- **FR-006**: The collection area MUST list the profile's top-level collections, each with its name, color (also named in text for assistive technology), total cards, cards for sale, and number of subcollections; a collection with no cards and no subcollections is labeled empty. Opening a collection MUST show its path from the collection area (each level reachable), its own count summary and level, and its direct subcollections with the same data if it has any. An opened collection MUST NOT list its cards in this slice; listing cards belongs to a later card spec. Each opened collection, and the holding box, MUST have its own address in the app: after drilling down, the system/browser back action returns to the level above, and a reload stays on the same collection. Opening the address of a collection that no longer exists (deleted, removed by sync, or belonging to another profile), or of an empty holding box, MUST return to the collection area.
- **FR-007**: Card counts MUST count copies (a card entry with quantity 3 counts as 3) and MUST include the cards in all of a collection's subcollections. The for-sale count counts only copies marked for sale. The subcollection count counts all subcollections beneath it, at any level.
- **FR-008**: Collections at each level MUST be listed in alphabetical order by name (PT-BR collation, ignoring case and accents).
- **FR-009**: With no collections and no holding box, the collection area MUST show an empty state explaining collections and offering to create one.

**Create, edit, delete**

- **FR-010**: The person MUST be able to create a collection at the top level, and a subcollection inside any collection above the third level — including one that holds cards, in which case FR-029 applies.
- **FR-011**: The person MUST be able to rename and recolor any collection or subcollection. Renaming or recoloring MUST NOT change or rewrite any card.
- **FR-012**: Deleting a collection MUST delete all its subcollections with it. If the collection's subtree holds no cards, a confirmation naming the collection and the number of subcollections going with it is enough.
- **FR-013**: If the subtree holds cards, deleting MUST require an explicit choice between **moving the cards to the holding box** and **deleting the cards**, showing how many cards are affected. There is no default choice, canceling changes nothing, and the delete-cards option states that it can't be undone.
- **FR-014**: Moving cards to the holding box MUST keep every other attribute of each card (printing, finish, condition, language, quantity, for-sale, notes).
- **FR-015**: A delete, and a subcollection creation that moves cards (FR-029), MUST apply entirely or not at all from the person's point of view: after it, no card refers to a collection that no longer exists, no collection holds both cards and subcollections, and an interruption never loses cards that were meant to be moved.

**Holding box**

- **FR-016**: Cards with no collection, or whose collection no longer exists, MUST be treated as being in the **holding box** ("Caixa temporária"). The holding box MUST appear in the collection area only while it holds at least one card, with its card and for-sale counts, visually distinct from the person's collections. Opening it shows only that count summary, not a list of its cards.
- **FR-017**: The holding box MUST NOT be renamable, recolorable, deletable, or nestable, and MUST NOT be stored or synced as a collection.

**Storage and sync**

- **FR-018**: All collection changes MUST be saved on the device first and work fully offline (Constitution IV, VI). Collections MUST reach the linked cloud account only when the person syncs, and MUST never leave the device for a profile without a linked account.
- **FR-019**: Sync MUST carry collection creations, edits and deletions in both directions, resolving conflicts by the most recent change per collection, and MUST NOT resurrect a collection deleted on another device (Constitution VI). A collection whose parent no longer exists after sync MUST be removed along with its own subcollections, so every stored collection always has an existing parent; cards in it are treated as holding-box cards (FR-016). If sync leaves two siblings with the same name (FR-003), both MUST be kept and the one synced later renamed with the lowest free numbered suffix — "Nome (2)", "Nome (3)" — shortening the base name if needed to stay within 40 characters; the rename is an ordinary edit, carried to the cloud on the next sync.
- **FR-020**: Collection records MUST stay small and independent of how many cards they hold: a collection stores only its own identity, name, color, parent and change time — never a list of its cards, copies of card data, or stored counts. Counts are derived from the cards.
- **FR-021**: A card MUST refer to its collection by reference only. Renaming, recoloring or re-nesting a collection MUST NOT touch any card record, and syncing a collection change MUST NOT re-send any card.
- **FR-022**: Deleting a collection with cards MUST touch only the cards in its subtree (and moving cards into a new first subcollection, FR-029, only the parent's direct cards), and MUST leave no lasting per-card residue beyond what is needed to carry the deletion to the cloud on the next sync.
- **FR-023**: The cloud copy of collections MUST be readable and writable only by the owning account.

**Scope and replacement**

- **FR-024**: This feature MUST replace the existing collection screens, their collection/location logic and their cloud tables rather than extend them; nothing of the old implementation is kept for compatibility. Only the collection side is rebuilt: the current owned-card record, and its reference to a location, stay as they are until a later card spec redesigns them. This spec reads cards for counts and changes them only for deletes (FR-013–FR-015, FR-022) and for moving a collection's direct cards into its first subcollection (FR-029).
- **FR-025**: All user-facing text MUST be PT-BR (Constitution II), and every cloud error reaching the person MUST be translated.
- **FR-026**: The collection area's visual design MUST be added to DESIGN.md before it is built (Constitution V), taken from the design handoff (`design_handoff_collections_foundation/`, hi-fi `Colecao.dc.html`): the collection rows with color and counts, the holding-box tag and page, the collection page (path, stats, content by kind, empty-collection choices), the create/edit dialog with the 16-color picker, the delete choice, the empty state, the reserved placeholders (FR-030), and the page-to-page transition (fully disabled under reduced motion).

**Cards or subcollections**

- **FR-027**: A collection's kind MUST NOT be chosen up front: an empty collection can take either cards or subcollections, and whatever goes in first sets it. A collection holding subcollections MUST NOT offer, and MUST reject, placing cards directly in it. A level-3 collection holds only cards.
- **FR-028**: When a collection's last subcollection is deleted, it MUST become empty (holding neither), and can again take either.
- **FR-029**: Creating the first subcollection inside a collection that holds cards MUST move all of its direct cards into the new subcollection, as one step (FR-015), keeping every other attribute of each card (FR-014). Before confirming, the form MUST say how many cards will move and name the action accordingly ("Criar e mover cartas"). If sync leaves a collection with both direct cards and subcollections, its direct cards MUST move into its first subcollection in alphabetical order (FR-008), as ordinary card edits carried on the next sync.

**Reserved space and feedback**

- **FR-030**: The layout MUST reserve, now, the space of features coming in later specs, each visible and clearly disabled, never pretending to work: collection search ("em breve") and a filters control on the list page (a filters side column on wide screens, a filters button on narrower ones), hidden in the empty state; a card-list placeholder in a collection that holds cards; a disabled "add cards" action in an empty collection.
- **FR-031**: After a delete finishes, a toast MUST confirm the outcome in PT-BR (collection deleted; with the number of cards moved to the holding box or deleted). If the person's current page was inside the deleted subtree, they MUST land on the deleted collection's parent, or the collection area for a top-level collection. While a delete runs, the dialog MUST NOT be closable and its actions MUST be locked.

### Key Entities

- **Collection area**: the root of a profile's storage tree. Not a stored record; one per profile.
- **Collection** (new, replaces the old storage location): a physical place holding cards — a box, binder, folder, or a division inside one. Owner profile, name, color, optional parent collection (none for top-level), last-change time. Depth derived from its parents, at most 3. Its kind (empty, holds cards, holds subcollections) is derived from its contents, never stored.
- **Collection color**: one of 16 fixed named colors (FR-004), stored by its identity, not its appearance.
- **Holding box** ("Caixa temporária"): a derived view of the profile's cards that have no existing collection. Never stored.
- **Owned card** (existing, unchanged by this spec; see FR-024): an owned printing with quantity and a for-sale flag, referring to at most one collection.
- **Deletion marker**: the minimal record of a deleted collection (and, when cards are deleted, of those cards) kept only until it has been synced, so other devices apply the deletion instead of restoring the item.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can create a named, colored collection from the collection area in under 15 seconds and at most 3 interactions after typing the name.
- **SC-002**: With 50,000 card copies spread over 100 collections, the collection area shows its list with correct counts in under 1 second on a mid-range phone.
- **SC-003**: The stored size of a collection does not grow with the number of cards in it; renaming or recoloring a collection holding 5,000 cards changes one record and sends one record on the next sync.
- **SC-004**: Deleting a collection that holds 5,000 cards (move or delete) completes in under 3 seconds, and in 100% of tests no card is left pointing at a deleted collection.
- **SC-005**: After any delete with "move", 100% of the affected cards are found in the holding box with their other data unchanged.
- **SC-006**: No tree deeper than three levels can be created through any path in the app.
- **SC-007**: After both devices sync, two devices on the same account show identical collection trees (names, colors, nesting) in 100% of tested scenarios, including concurrent edits and deletions.
- **SC-008**: All collection features work with no network, and a profile never sees another profile's collections.
- **SC-009**: Creating the first subcollection in a collection holding 5,000 cards completes in under 3 seconds, and in 100% of tests every card ends up in the new subcollection with its other data unchanged and no collection holds both cards and subcollections.

## Assumptions

- "User" means the local profile (Constitution IV); a collection belongs to the profile and, through its link, to the cloud account when synced.
- "Cards" and "cards for sale" count copies, not distinct printings, and include every level beneath a collection.
- "Subcollections" in the list means all subcollections beneath a collection, at any level (at most two levels below a top-level collection).
- Deleting a collection always deletes its whole subtree; there's no "move subcollections up" option.
- Moving collections to a different parent, reordering them manually, and adding or moving cards between collections are later specs, as are collection search and filters (only their space is reserved, FR-030). Cards can reach the holding box in this slice only through deleting a collection (or a card pointing at a missing one), and move between collections only through FR-029.
- The holding box is named "Caixa temporária"; the rest of the copy follows the design handoff and is fixed with the DESIGN.md addition (FR-026).
- The app is unreleased: existing local collection/location data and the old cloud tables are dropped, not migrated.
- Sync follows the app's existing pattern: started only from the shell's sync controls, most recent change wins per record, deletion markers cleared once synced.
