# OPP-001 · Selling from a large collection

- **Status**: draft — features are a first breakdown, to be detailed by the user before the build order is written
- **Created**: 2026-10-09
- **Updated**: 2026-10-09

## Opportunity

- **Who**: people who own a large collection (several binders and boxes) and sell part of it, without a store. They sell to other players in person (events, game nights, meetups) and remotely (contacted through LigaMagic).
- **Their situation**: they know roughly what they have, but not which binder a given card is in, nor which cards are still available. Buyers ask "você tem X?" and the answer means flipping through binders. What was sold is tracked in memory, on paper or in a spreadsheet, if at all. At an event they carry only some of their binders, so "do I have it" and "do I have it *here*" are different questions.
- **The need**:
  - Show buyers what is for sale, without exposing the whole private collection.
  - Let a buyer pick cards and hand the seller a clear list, so price and payment can be discussed directly (on LigaMagic, or in person).
  - Find the picked cards physically and fast.
  - Know what was sold, and stop offering it.
- **Why Grimorio**: Grimorio already knows *where* each card physically is (Principle I), which is exactly what a seller without a store lacks. It is PT-BR-first, and LigaMagic is the Brazilian marketplace where these sellers and buyers already talk. Generic trackers (Moxfield, Deckbox) know ownership, not location, and don't speak to LigaMagic.
- **Success looks like**:
  - A seller can answer "você tem X aqui?" from their phone, at an event, without opening binders.
  - A buyer can browse a seller's sale cards in Grimorio, build a list and paste it into a LigaMagic message.
  - The seller turns that list into a pick list ordered by binder.
  - Once the sale is done, the sold cards leave the collection and are no longer offered, with a record of the sale.

## Scope

- **In**:
  - Public/private visibility for collections and decks, visible to other Grimorio users inside the app.
  - A seller's public identity.
  - "Comigo" (the collections the seller is carrying right now).
  - A cart for both the seller (in person) and the buyer (remote).
  - A checkout that produces a text list.
  - Taking a buyer's list back in.
  - Recording sales.
  - Bulk for-sale marking and partial for-sale quantities.
- **Non-goals**:
  - **Payments, prices, price suggestions or fees.** Price and payment are negotiated between the people, outside the app (Principle III; no price data is modeled).
  - **An open web link** that people without Grimorio can open. Public data is visible only inside Grimorio (decided 2026-10-09).
  - **In-app messaging between buyer and seller.** LigaMagic or in-person conversation is the channel.
  - **Integration with LigaMagic's API or store.** The only touchpoint is pasted text.
  - **Ratings and reputation.**

## Constitution check

- **I. Physical-World Fidelity**: this opportunity strengthens it.
  - The seller's cart is a pick list ordered by location.
  - Confirming a sale must remove the copies from the exact rows they were in.
  - Reservations must never hide where a card is.
- **II. PT-BR-First**: all new UI text is PT-BR. The checkout list targets LigaMagic, a Brazilian venue.
- **III. Free and Accessible**: no fees, paid seller tiers, payments or price data.
- **IV. Local-First, Cloud-Optional**: this needs an amendment.
  - **Stays local-first**: everything about the seller's own data works offline with a local profile — Comigo (F3a), the seller cart (F4a), the seller checkout list (F5), confirming sales (F7), bulk marking (F8) and partial quantities (F9).
  - **Can't be local-first by nature**: publishing (F1, F2, F3b) needs a cloud account, and browsing someone else (F2b, F4b) needs the network.
  - **The conflict**: Principle IV says a cloud account "MUST NOT be required for any capability".
  - **Proposed amendment (MINOR)**: capabilities whose purpose is to share one's data with other people may require a cloud account and a connection. Every capability over one's own data stays local-first.
- **V. Zoneless, signal-driven, DESIGN.md**: every new surface is a DESIGN.md gap to fill before building it:
  - the visibility control and marker
  - the seller page
  - the Comigo marker and view
  - the cart and its badge
  - the checkout dialog
  - order intake
  - the sales history
- **VI. Persistence and sync pattern**:
  - **New synced entities** (seller profile, sales) follow the service shape.
  - **New tables** ship grants and RLS in the same migration.
  - **The deliberate exception**: public reads are not owner-only. They must go through an explicit-column view or function, never a broad `select` on `card_entries` (RLS filters rows, not columns, and `notes` must never leak). This exception must be documented in `architecture.md` when it ships.

## Prerequisites

- **#39 Cross-device deletes**:
  - A card sold and removed on one device is uploaded again by another device today.
  - Once collections are public, buyers would see sold cards come back. This blocks F2b and the synced part of F7.
- **Owned-card search**: Comigo (F3a) and the seller cart (F4a) need a search over the seller's own cards *across* locations. Spec 016 (card filters) is deferred.
  - **Option 1**: F3a carries its own minimal name search.
  - **Option 2**: the name search part of 016 is brought forward.
  - This is an open decision for the build order.

## Features

Sizes are provisional until each feature is detailed. Score order: data model · persistence & sync · UI · reach · unknowns (see [README](README.md#sizing)).

| ID | Feature | Size | Maturity | Depends on | Spec |
|---|---|---|---|---|---|
| F1 | Seller identity | L (2·2·1·0·1) | ready to spec | — | — |
| F2 | Public and private collections and decks | XL → split | — | — | — |
| F2a | ↳ Setting visibility (owner) | M (1·1·1·1·1) | ready to spec | — | — |
| F2b | ↳ Browsing a seller (visitor) | L (0·2·2·1·1) | ready to spec | F1, F2a, #39 | — |
| F3 | "Comigo" | split | — | — | — |
| F3a | ↳ Comigo for the seller | L (1·1·2·1·1) | ready to spec | owned-card search | — |
| F3b | ↳ "Disponível agora" for buyers | M (0·1·1·1·1) | ready to spec | F3a, F2b | — |
| F4 | Cart | split | — | — | — |
| F4a | ↳ Seller cart (sale mode) | L (2·1·2·1·1) | ready to spec | owned-card search, F9 | — |
| F4b | ↳ Buyer cart | L (1·1·2·1·2) | ready to spec | F2b, F4a | — |
| F5 | Checkout list | M (0·0·2·1·2) | ready to spec | F4a (seller), F4b (buyer) | — |
| F6 | Order intake | split | — | — | — |
| F6a | ↳ Paste a buyer's list into a cart | M (0·0·2·1·2) | ready to spec | F4a, F5 | — |
| F6b | ↳ Reservations | L (1·1·2·1·2) | needs shaping | F6a, F2b | — |
| F7 | Sales record | XL (2·2·2·1·2) | needs shaping | F4a, #39 | — |
| F8 | Bulk for-sale marking | M (0·1·1·1·1) | ready to spec | — | — |
| F9 | Partial for-sale quantity | L (2·1·1·2·1) | ready to spec | — | — |

F1–F7 come from the user's request. F8 and F9 were suggested while writing this: both make "what is for sale" practical at the scale this opportunity is about.

---

### F1 · Seller identity

- **Size**: L (2·2·1·0·1)
- **Maturity**: ready to spec
- **Depends on**: —
- **Spec**: —

**Goal.** A seller has a public identity buyers can find in Grimorio, with the LigaMagic name to contact them by.

**User stories**

- As a seller, I want a public handle and display name, so buyers can find my sale cards in Grimorio.
- As a seller, I want to show my LigaMagic username, so a buyer knows where to send the list.
- As a buyer, I want to find a seller by their handle.

**Behavior**

- **Turning it on**: a profile with a linked cloud account can turn on "Perfil de vendedor" in the profile modal. It sets:
  - a **handle**: unique across Grimorio, lowercase letters, digits and `-`/`_`, 3–24 characters, changeable;
  - a **display name**;
  - an optional **LigaMagic username**;
  - an optional short **note**, such as "Entrego em SP capital".
- **Without a cloud account** the option explains that publishing needs one, and offers to link.
- **Turning it off** hides the seller from search, and their public collections become unreachable. The flags on collections and decks stay as they were.
- **Search**: buyers find a seller by exact handle, or by a handle prefix (see open decisions). A seller's code can be copied to share ("@handle").

**Data & sync**

- A new `seller_profiles` table: `user_id` primary key, `handle` unique, `display_name`, `ligamagic_user`, `note`, `enabled`, `updated_at`.
- RLS: the owner has full access. Other users read only rows with `enabled = true`, through a view or function (see the open decision on anonymous reads).
- Locally it is held per profile like the planar selection (a `meta` record), and synced as one reconciled entity.

**UI surfaces**

- A new step or section in `ProfileModal`.
- The seller search entry point (with F2b).
- DESIGN.md: the seller section of the profile modal, and the handle field with its availability check.

**Edge cases**

- A handle is taken; a handle changes (old codes stop working); the cloud account is deleted (the seller profile goes with it, via cascade).
- The profile is unlinked: the seller profile stays in the cloud but is unreachable until the account is linked again (or should it be disabled?).
- Offline: the handle can't be checked; saving waits for a connection.

**Out of scope**

- Avatars, ratings, location or city search, more than one seller identity per account.

**Open decisions**

- **Does a buyer need a cloud account to browse?** The anonymous catalog client could read public data without one, which keeps the buyer side closer to Principle IV. Recommendation: no account needed to browse.
- **Search**: exact handle only, or prefix and display-name search? Exact only is more private.
- **Is a handle change allowed freely, or with a cooldown?**

**Spec seed**

> Sellers without a store need a public identity inside Grimorio so buyers can find what they sell. A profile with a linked cloud account can turn on a seller profile with a unique handle, a display name, an optional LigaMagic username and a short note. Buyers find a seller by handle. Turning it off hides the seller. Publishing needs a cloud account and a connection; nothing else in the app changes for people who don't sell. Out of scope: avatars, ratings, location search.

---

### F2 · Public and private collections and decks

Split in two because the owner's side ships on its own: a seller can prepare what will be public before anyone can see it. The visitor's side is the rest. (Splitting the public read access out of the visitor's view would split by layer, so they stay together.)

#### F2a · Setting visibility (owner)

- **Size**: M (1·1·1·1·1)
- **Maturity**: ready to spec
- **Depends on**: —
- **Spec**: —

**Goal.** The owner marks collections and decks as public or private, and always sees which is which.

**User stories**

- As a seller, I want to make my "Vendas" binder public and keep everything else private.
- As a player, I want to share a deck list publicly without exposing my collection.

**Behavior**

- Collections and decks get a visibility of **Privada** (the default) or **Pública**. It is set in the create/edit dialogs and from the page's menu.
- **Collections inherit**: a subcollection is public only when it and all its ancestors are public. Making a parent private hides the whole branch, without changing the children's own setting (see open decisions).
- **The holding box** ("Caixa temporária") is never public.
- **A public collection or deck shows a visible marker** on its tile and page. The collection list can filter to "Públicas".
- **What a visitor would see**: an open decision (all cards, or only cards for sale). The owner gets a preview: "Ver como visitante".

**Data & sync**

- `Collection.visibility` and `Deck.visibility`, stamped with `updatedAt` and synced; a new column on `collections` and `decks`.
- The effective visibility of a collection is derived (`computeStats`-style), never stored.

**UI surfaces**

- The collection and deck dialogs, the tiles and page headers, and the collection list filter.
- DESIGN.md: the visibility control and the public marker.

**Edge cases**

- A public collection moves under a private parent; a card moves from a public collection into a private one.
- Visibility is set offline and becomes public only at the next sync. The owner must see "publicada na próxima sincronização".
- A profile with no cloud account can set visibility, but nothing is published. Should the control then explain this, or be hidden?

**Out of scope**

- Per-card visibility, sharing with specific people only, the visitor view (F2b).

**Open decisions**

- **What a public collection shows**:
  - **A**: only cards marked for sale.
  - **B**: every card.
  - **C**: a per-collection choice between "Vitrine" (all) and "Venda" (for sale only).
  - Recommendation: C, defaulting to "Venda".
- **Inheritance**:
  - **A**: private wins downward (above).
  - **B**: a child follows its parent unless it overrides.
- **Decks**: is a public deck shown as a deck list (a showcase) or as cards for sale?

**Spec seed**

> Owners can mark each collection and deck as public or private (private by default), so a seller can choose what buyers will see. A subcollection is public only when it and every ancestor are public; the holding box is never public. Public collections and decks show a clear marker, and the owner can preview what a visitor will see. Visibility is synced like the rest of the collection and only takes effect publicly after a sync. Out of scope: per-card visibility, sharing with specific people, the visitor's browsing view.

#### F2b · Browsing a seller (visitor)

- **Size**: L (0·2·2·1·1)
- **Maturity**: ready to spec
- **Depends on**: F1, F2a, #39
- **Spec**: —

**Goal.** Inside Grimorio, a buyer opens a seller and browses their public collections and decks, read-only.

**User stories**

- As a buyer, I want to open a seller by handle and see what they're selling, organized the way they organize it.
- As a buyer, I want to search a seller's public cards by name.

**Behavior**

- **A seller page** shows the seller's identity (F1), then their public collections (the tree, following F2a's rules) and their public decks.
- **Opening a collection** shows a read-only card grid with each card's printing, finish, language, condition, quantity (or for-sale quantity, F9) and a "à venda" marker. It never shows notes, IDs or private locations.
- **Name search** works across all of the seller's public cards.
- **Reading is online.** The page states when it was loaded, and refreshes by hand.
- **The route is ungated** (like `/modes`): browsing needs no local profile, and no cloud account (F1's open decision).

**Data & sync**

- Read-only access through a view or a `security definer` function with explicit columns: `seller_public_collections(handle)`, `seller_public_cards(handle, collection?)`. Only rows whose effective visibility is public (F2a) are returned.
- Effective visibility must be computed server-side too; in SQL that is a recursive check over `collections.parent_id`.
- No local storage of other people's data, except F4b's cart snapshot.

**UI surfaces**

- A new route (e.g. `/vendedor/{handle}`), the seller search entry point (nav or home), a read-only collection tree and card grid reusing `CardGrid`/`CardTile`.
- DESIGN.md: the seller page and the visitor variant of the card grid.

**Edge cases**

- The seller turns their profile off, or a collection goes private, while a buyer is viewing it; the handle doesn't exist; the seller has no public collections.
- The buyer is offline; the visitor is the seller themself.
- A very large public collection (paging, the same way sync pages).

**Out of scope**

- Following sellers, discovery feeds, cross-seller search ("who has X?"), the cart (F4b).

**Open decisions**

- **Cross-seller search** ("quem tem X?"): out of scope here, or a later feature in this opportunity?
- **Does the buyer need a cloud account?** (shared with F1)

**Spec seed**

> Buyers need to see what a seller offers without the seller exposing their whole collection. Inside Grimorio, anyone can open a seller by handle and browse their public collections and decks read-only: the collection tree, a card grid with printing, finish, language, condition, quantity and for-sale marker, and a name search across the seller's public cards. Notes and private collections are never exposed; reads go through explicit-column server functions. Browsing needs a connection, shows when it was loaded, and needs no local profile. Out of scope: discovery, cross-seller search, the cart.

---

### F3 · "Comigo"

A seller carries only some binders. "Comigo" is the set of collections physically with them right now, and search can be limited to it. It is split because the seller's own use works offline on one device, while showing it to buyers needs F2b.

#### F3a · Comigo for the seller

- **Size**: L (1·1·2·1·1)
- **Maturity**: ready to spec
- **Depends on**: owned-card search (see Prerequisites)
- **Spec**: —

**Goal.** At an event, the seller answers "você tem X aqui?" by searching only the collections they brought.

**User stories**

- As a seller leaving for an event, I want to mark the 3 binders I'm taking as "comigo".
- As a seller at the event, I want to search a card name and see only copies in the binders with me, with the binder each one is in.
- As a seller back home, I want to clear "comigo" in one action.

**Behavior**

- **Marking**: any collection can be marked "Comigo" from its tile or page. Marking a collection includes its subcollections.
- **A "Comigo" view** lists every card in the marked collections. Each card shows its full location path. A name search covers this view, and a for-sale-only toggle defaults to on.
- **"Voltei"** clears every mark, after a confirmation.
- **Shell indicator**: while anything is marked, the shell shows it (e.g. "Comigo · 3 coleções"), so a stale mark is noticed.
- **Decks** can be marked too (a deck taken to an event); open decision.

**Data & sync**

- The set of marked collection IDs is stored locally, per profile, as one `meta` record. It is not synced unless F3b needs it (open decision).
- No change to `Collection`.

**UI surfaces**

- The collection tile and page menu, a new Comigo view (route or mode of the collection area), and the shell indicator.
- DESIGN.md: the Comigo marker, view and indicator.

**Edge cases**

- A marked collection is deleted; a card moves into or out of a marked collection while the view is open; the profile switches (the marks are per profile); the marks go stale for weeks.

**Out of scope**

- Showing it to buyers (F3b), automatic marks.

**Open decisions**

- **Local per device or synced?** The phone at the event is usually the only device that matters. Recommendation: local, unless F3b ships.
- **Search**: a minimal name search here, or the name part of spec 016 brought forward?
- **Can decks be marked?**

**Spec seed**

> A seller with many binders carries only some of them to an event, and needs to answer "do I have this card with me?" without opening binders. Any collection (with its subcollections) can be marked "Comigo". A Comigo view lists every card in the marked collections with its exact location, with a name search and a for-sale-only toggle. One "Voltei" action clears every mark, and the shell shows while marks exist. Marks are per profile, stored on the device, and work offline. Out of scope: showing availability to buyers.

#### F3b · "Disponível agora" for buyers

- **Size**: M (0·1·1·1·1)
- **Maturity**: ready to spec
- **Depends on**: F3a, F2b
- **Spec**: —

**Goal.** At an event, a buyer browsing a seller (F2b) can limit the view to what the seller has with them.

**Behavior**

- When the seller chooses to share it, their seller page shows "Disponível agora" on the public cards inside Comigo collections, with a filter for them.
- Sharing is a separate switch, off by default.
- Marks sync when the switch is on.

**Data & sync**

- The Comigo marks become synced: a column on `collections`, or a field on the seller profile.

**Open decisions**

- Does sharing it reveal more than the seller wants, such as "this person is at an event carrying valuable cards right now"? This is a safety concern; the default stays off, and the spec should state the warning.

**Spec seed**

> At an event, buyers browsing a seller in Grimorio want to see only what the seller has with them. A seller who chooses to share it (off by default, with a safety note) makes their Comigo marks visible: public cards in those collections show "Disponível agora", with a filter. Out of scope: anything beyond the marks the seller already set.

---

### F4 · Cart

Two carts with one shape: the **seller cart** references the seller's own cards and works offline; the **buyer cart** holds a snapshot of someone else's cards. It is split because the seller cart is useful on its own, at an in-person sale.

#### F4a · Seller cart (sale mode)

- **Size**: L (2·1·2·1·1)
- **Maturity**: ready to spec
- **Depends on**: owned-card search, F9 (so quantities read the right field from the start)
- **Spec**: —

**Goal.** During an in-person sale, the seller collects the cards the buyer picks, then gets a pick list ordered by where each card is.

**User stories**

- As a seller at an event, I want to add cards to a cart as the buyer picks them, from search, the Comigo view or any collection.
- As a seller, I want the cart grouped by binder, so I pull all the cards from one binder at once.

**Behavior**

- **Adding**: "Adicionar ao carrinho" on a card (tile action and card modal) takes a quantity, limited to the row's quantity, or its for-sale quantity after F9.
- **Cards not for sale** can be added after a confirmation ("Esta carta não está à venda"); open decision.
- **The cart page** groups lines by full location path, ordered by path, then by name within each location. Each line can be changed or removed. It shows the total copies.
- **One cart at a time**, kept until it is emptied or checked out (F5, then F7).
- **A shell badge** shows the cart's copy count while it is not empty.
- **Validation**: if a card in the cart is edited, moved or deleted elsewhere, its line follows the card (by ID) and is flagged when its quantity no longer fits.

**Data & sync**

- A new local entity, stored per profile: one `meta` record holding the lines `{cardId, quantity}`. It is not synced: a sale in progress happens on one device.
- No change to `CardEntry`.

**UI surfaces**

- The card tile and modal actions, a new cart page, and the shell badge.
- DESIGN.md: the add-to-cart control, the cart page and the badge.

**Edge cases**

- A card is deleted or sold elsewhere while it is in the cart; another open copy of the app edits the cart; the profile switches (the cart is per profile); the quantity exceeds the copies available; the same card is added twice (the lines merge).

**Out of scope**

- Several named carts at once (open decision), the buyer cart (F4b), checkout (F5).

**Open decisions**

- **Several carts**: one cart, or several named ones (one per buyer at a busy event)?
- **Not for sale**: may such cards be added at all?
- **Decks**: should the cart reserve copies from other views while it is open, or is that F6b's job?

**Spec seed**

> At an in-person sale, the seller needs to collect what the buyer picks and then find those cards physically. From any card (search, the Comigo view, a collection), the seller adds copies to a cart, limited to the copies available. The cart groups its lines by full location path, so it reads as a pick list, and a shell badge shows its size. Lines follow their card if it is edited, moved or deleted elsewhere, and are flagged when they no longer fit. One cart per profile, stored on the device, offline. Out of scope: buyer carts, checkout, reservations.

#### F4b · Buyer cart

- **Size**: L (1·1·2·1·2)
- **Maturity**: ready to spec
- **Depends on**: F2b, F4a (shared cart shape and UI)
- **Spec**: —

**Goal.** While browsing a seller, a buyer collects the cards they want into a cart for that seller.

**Behavior**

- **Adding**: on a seller's page (F2b), each card has "Adicionar ao carrinho", with a quantity limited to what the seller lists.
- **One cart per seller.** The buyer's carts are listed, one per seller.
- **Lines hold a snapshot** of the card (name, printing, finish, language, condition) plus the seller's card ID.
- **Revalidation**: when the seller's page is reloaded, lines whose card is gone, private or no longer for sale are flagged, and a reduced quantity is pointed out. Nothing is silently removed.
- **Ending a cart**: it ends in checkout (F5), and is kept until the buyer clears it.

**Data & sync**

- Stored locally: on the buyer's device, per profile, or device-scoped when there is no profile (open decision, since browsing needs no profile). Not synced.

**Edge cases**

- The seller changes their handle; the seller disables their profile; the buyer is offline (the cart still shows, without revalidating).

**Open decisions**

- **Where the cart lives** without a local profile: device-scoped, like the Planechase game?
- **Should the seller ever see buyer carts?** Recommendation: no. The checkout list is the only handoff.

**Spec seed**

> A buyer browsing a seller in Grimorio needs to collect the cards they want before contacting the seller. On a seller's page each card can be added to a cart for that seller, limited to the copies listed. Each line keeps a snapshot of the card, and is checked again whenever the seller's page reloads: gone, private or reduced lines are flagged, never removed silently. One cart per seller, stored on the buyer's device. Out of scope: the seller seeing carts, messaging.

---

### F5 · Checkout list

- **Size**: M (0·0·2·1·2)
- **Maturity**: ready to spec
- **Depends on**: F4a for the seller list, F4b for the buyer list
- **Spec**: —

**Goal.** Turn a cart into a text list that people can paste where they talk, mainly into a LigaMagic message, so price and payment are agreed between them.

**Behavior**

- **"Finalizar"** on a cart opens a dialog with the list as text, plus **Copiar** and **Compartilhar** (the native share sheet, where available).
- **The buyer list** starts with a line naming the seller (display name, LigaMagic username), then one line per card:
  - quantity, name, set code and collector number, finish, language and condition;
  - a total of copies at the end;
  - a short reference per line, so F6a can match it back exactly (e.g. the last characters of the seller's card ID).
- **The seller list**:
  - the same lines, grouped under each location path;
  - for in-person use, or to send to the buyer without the locations (a toggle).
- **No prices**: no price, total value or payment field (Non-goals).
- **After copying**:
  - the buyer cart stays until the buyer clears it;
  - the seller cart moves on to "Confirmar venda" (F7) or stays.

**Data & sync**

- None. A pure formatter in `core/utils/`, tested on its own.

**UI surfaces**

- The checkout dialog (`CompactModal`). DESIGN.md: the list preview and the copy and share actions.

**Edge cases**

- Flagged lines (F4a, F4b) are left out or marked, and the dialog says so; names with accents or special characters; double-faced names (front face, or "A // B"?); a very long list; the clipboard is unavailable.

**Out of scope**

- Sending the list anywhere, LigaMagic integration, prices.

**Open decisions**

- **The exact line format.** This needs checking against what LigaMagic accepts:
  - **A**: free text in a private message: any readable format works.
  - **B**: LigaMagic's list importer, which needs its exact syntax.
  - My search could not confirm LigaMagic's format. Arena/MTGO's `4 Name (SET) 123` is the common baseline.
- **Card names**: English, PT-BR (when the printing is Portuguese), or both?
- **Native sharing**: is the Web Share API enough in the Capacitor build, or does it need a plugin?

**Spec seed**

> Buyers and sellers settle price and payment between themselves, mostly through LigaMagic messages, so a cart must turn into a text list they can paste there. "Finalizar" on a cart shows the list with Copy and Share. Buyer lists name the seller, then one line per card (quantity, name, set and collector number, finish, language, condition, a short reference for matching back), then the total of copies. Seller lists can also group lines by location. Lists never carry prices. Out of scope: sending, LigaMagic integration, prices.

---

### F6 · Order intake

The buyer's list comes back to the seller. It is split because turning the list into a cart is useful at once and is well defined, while holding copies for a buyer still needs shaping.

#### F6a · Paste a buyer's list into a cart

- **Size**: M (0·0·2·1·2)
- **Maturity**: ready to spec
- **Depends on**: F4a, F5
- **Spec**: —

**Goal.** The seller pastes the list a buyer sent and gets it as their own cart: a pick list ordered by binder.

**Behavior**

- **"Receber pedido"** takes pasted text. Each line is matched to the seller's own cards:
  - first by the line's reference (F5);
  - then by printing, finish, language and condition (`matchKey`);
  - then by name.
- **The result shows each line** as matched, partly available (fewer copies) or not found. The seller can change a match by hand or drop a line.
- **Confirming** fills the seller cart (F4a), replacing it or adding to it (open decision). From there the cart works as usual: pick list, checkout, sale.

**Data & sync**

- None beyond F4a's cart. The parser is a pure util.

**Edge cases**

- A list from another seller (the references don't match); a list edited by hand; a line whose card has since been sold; lines in a format the parser doesn't recognize, which are shown, never dropped.

**Open decisions**

- **An existing cart**: replace it or merge into it?
- **Non-Grimorio lists**: should lists not made by Grimorio (a buyer's own decklist) be accepted, matched by name only?

**Spec seed**

> When a buyer sends their list (made by Grimorio's checkout) through LigaMagic, the seller needs it as a pick list of their own cards. "Receber pedido" takes pasted text and matches each line to the seller's cards by its reference, then by printing and attributes, then by name. It shows each line as matched, partly available or not found, lets the seller fix matches, and then fills the seller's cart. Out of scope: holding copies for the buyer.

#### F6b · Reservations

- **Size**: L (1·1·2·1·2)
- **Maturity**: needs shaping
- **Depends on**: F6a, F2b
- **Spec**: —

**Goal.** While a remote deal is being discussed, the copies a buyer asked for are held: not offered to other buyers, and not added to another cart.

**Sketch**

- An accepted order becomes a **reserva**, with a buyer label, a date and its lines.
- Reserved copies are subtracted from what F2b shows and from what F4a can add.
- A reserva ends as a sale (F7) or is released.

**To shape**

- Is a reserva its own entity, or a state of a named cart (see F4a's open decision on several carts)?
- Does it expire?
- Does it need to sync, so it shows on public pages? It does, if buyers must not see held copies.
- How does it relate to F9's for-sale quantity?

---

### F7 · Sales record

- **Size**: XL (2·2·2·1·2), to be split once shaped
- **Maturity**: needs shaping (the user asked for it; the concept needs work)
- **Depends on**: F4a; #39 before it syncs
- **Spec**: —

**Goal.** When a sale is done, the sold copies leave the collection, and the seller keeps a record of what was sold, when, and to whom.

**Sketch**

- **"Confirmar venda"** on a seller cart takes a buyer label (free text, such as a LigaMagic username) and an optional note.
- **In one transaction** (`writeRows`), it lowers each row's quantity by the copies sold, deleting rows that reach 0, and writes a **venda** record: date, buyer label, note, and lines with a snapshot of the card and the location each copy came from.
- **A "Vendas" history** lists past sales, newest first, and opens one to see its lines.
- **Undo**: the latest sale can be undone, putting the copies back where they were.

**To shape**

- **What a sale is**:
  - only the confirmation step of a cart (F4a, F6a); or
  - also something created by hand ("vendi estas 3 cartas"), directly from a card.
- **Value**:
  - no value at all (Principle III, no price data); or
  - an optional agreed total typed in by the seller, as plain information and never suggested. This is a product decision, since price data is not modeled anywhere today.
- **Undo window**:
  - only the latest sale;
  - any sale (copies back to the original location, or to the holding box if that location is gone);
  - or none.
- **Sync**:
  - The history is useful on every device, which means new `sales`/`sale_lines` tables with grants and RLS.
  - It needs #39, or a sold row could come back from another device.
- **Sold copies**: are they deleted, or kept as "vendida" rows? Deleting keeps "where is this card" true (Principle I), and the history holds the record.
- **Partial deliveries and cancellations**: a buyer takes only part of the list; a sale is cancelled after it was confirmed.
- **Stats**: total copies sold per month, or nothing beyond the list (no invented metrics).
- **Likely split once shaped**:
  - **F7a**: confirm a sale and keep a local record (offline).
  - **F7b**: the history view and sync.

---

### F8 · Bulk for-sale marking

- **Size**: M (0·1·1·1·1)
- **Maturity**: ready to spec
- **Depends on**: — (F9 changes what it writes, if F9 ships first)
- **Spec**: —

**Goal.** A seller puts a whole binder, or a selection of cards, up for sale (or takes it down) in one action.

**User stories**

- As a seller, I want to put my "Vendas" binder and all its subcollections up for sale at once.
- As a seller, I want to select 40 cards in a collection and take them off sale.

**Behavior**

- **"Colocar à venda"** / **"Retirar da venda"** in a collection's menu apply to every card row in the collection and its subcollections.
- **A confirmation** first states the number of rows and copies affected (e.g. "312 cartas (540 cópias) ficarão à venda").
- **A select mode in the card grid**: select single cards, or "Selecionar todas" (every card currently listed). Its action bar offers the same two actions.
- **With F9 shipped**: "à venda" sets the for-sale quantity to the full quantity, and "retirar" sets it to 0.
- **One change**: the update is one transaction. It either fully lands or fully fails, and is then synced like any card edit.

**Data & sync**

- No model change. Many `CardEntry` updates go in one `writeRows` transaction, applied in memory the same way as `applyMoved`.

**UI surfaces**

- The collection menu, the card grid's select mode and action bar.
- DESIGN.md: the select mode (selected tile state, action bar).

**Edge cases**

- Deck rows (excluded or included? open decision); a selection spanning cards that change in another open copy; an empty collection; cards already in the target state (counted, but not written).

**Out of scope**

- A collection-level default that new cards inherit (open decision), bulk edits of other fields.

**Open decisions**

- **One-time or a default**: a one-time action (above), or also a collection-level "à venda" default that cards added later inherit? A default is more convenient, but it's a second source of truth for the same fact.
- **Select mode**: does it belong to this feature, or to a shared multi-select feature F4a also uses (adding many cards to the cart at once)?
- **Decks**: included or excluded?

**Spec seed**

> A seller with a large collection can't mark cards for sale one at a time. A collection's menu offers "Colocar à venda" and "Retirar da venda" for every card in it and its subcollections, after a confirmation that states the rows and copies affected. The card grid gains a select mode (single cards or every listed card) with the same two actions. Each bulk change is one all-or-nothing write, synced like any card edit. Out of scope: inherited defaults, bulk edits of other fields.

---

### F9 · Partial for-sale quantity

- **Size**: L (2·1·1·2·1)
- **Maturity**: ready to spec
- **Depends on**: —; should ship before F4a, F6 and F7, so they read the right field from the start
- **Spec**: —

**Goal.** One row of 4 copies can have 3 for sale and 1 kept, without splitting the physical stack into two records.

**The problem today**

- `forSale` is a boolean on a row that holds `quantity` copies.
- To sell 3 of 4 Lightning Bolts, the seller would split the row by hand. But `matchKey` (`core/utils/card-entry.util.ts`) ignores `forSale`, so the add and edit flows offer to merge the two rows back together.

**Behavior**

- **Replace the switch with a count**: `forSale: boolean` becomes `forSaleQuantity`, from 0 to `quantity`. In the card modal, the "À venda" switch becomes a stepper. Turning it on sets the count to the full quantity, and the stepper adjusts from there.
- **Totals**: collection `sale` totals count the for-sale copies. A tile shows "3 de 4 à venda" when the counts differ, and "à venda" when all copies are.
- **When quantity drops** below `forSaleQuantity` (an edit, a sale, a move of part of the stack), the for-sale count is clamped.
- **Merging two rows** adds both their quantities and their for-sale counts.
- **Consumers**: the visitor's view (F2b), the carts (F4a, F4b) and sales (F7) all read `forSaleQuantity`.

**Data & sync**

- The `CardEntry` field changes meaning: `card_entries.for_sale` boolean → `for_sale_quantity` integer, `not null default 0`, with `check (for_sale_quantity between 0 and quantity)`.
- Touches `sync-rows.ts`, `computeStats` (`collection-tree.util.ts`), `card-copy.ts` and the card modal.
- The app is unreleased, so there is no migration path for old rows (CLAUDE.md).

**UI surfaces**

- The card modal (switch → stepper), the tile's sale marker, the collection totals.
- DESIGN.md: the for-sale stepper and the "N de M" marker.

**Edge cases**

- A quantity of 1 (the stepper is just on or off); moving part of a stack to another collection (how the for-sale count splits; open decision); merging rows.

**Out of scope**

- Per-copy condition or price.

**Open decisions**

- **Splitting a stack**: when part of a stack moves to another collection, which copies are the for-sale ones? Recommendation: moved copies take for-sale copies first, and the modal shows the result before saving.
- **The alternative**: keep the boolean, add `forSale` to `matchKey` and add a "Separar cópias" action. Simpler, but one physical stack becomes two records. Not recommended.

**Spec seed**

> A row holding several copies of a card can't say that only some of them are for sale. Replace the for-sale switch with a for-sale count from 0 to the row's quantity. Turning it on sets the count to the full quantity; a stepper adjusts it. The count is clamped when the quantity drops, and added up when rows merge. Collection totals count for-sale copies, and tiles show "N de M à venda" when not all copies are for sale. Synced as an integer column. Out of scope: per-copy condition or price.

---

## Suggested build order

*Pending.* The user is detailing each feature first; the order is written once the features are updated.

Known constraints so far, without ordering anything yet:

- **#39** must ship before anything public (F2b) or a synced sales history (F7).
- **Owned-card search** is needed by F3a and F4a. Spec 016 is deferred, so where it comes from is an open decision.
- **F9** changes the field that F4a, F4b, F6 and F7 read.
- **Local-first**: the seller-side features (F3a, F4a, F5, F7a, F8, F9) need no cloud. The public features (F1, F2, F3b, F4b) need the Principle IV amendment.
