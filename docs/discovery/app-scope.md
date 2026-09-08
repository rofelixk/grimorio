# App scope — discovery (provisional)

**Status:** draft, in progress. Nothing here is decided. Ratified decisions live in
[`../decisions/`](../decisions/); this document feeds a future scope ADR.

**Last updated:** 2026-09-08

---

## Purpose

Map the full *possible* scope of the app, then carve it down point by point. When
sections settle, the confirmed keeps/cuts get promoted to a scope decision (ADR).

## Context so far

- Genre survey done: MTG tooling splits into ~15 categories (collection trackers,
  deck builders, card search, life counters, playgroup/stats, digital play,
  draft sims, price/finance, rules/judge, news/spoilers, official Companion,
  cube tools, recommendations/meta, all-in-one companions, storage/logistics).
- Working angle: **Commander/EDH**, **Brazil / pt-BR first**, casual playgroup use.
- Trigger anecdote: playing **Planechase** with no physical planes — needed an
  online plane list + a randomizer, and the rules were English-only and hard to
  read for a non-English speaker. Supplemental modes (Planechase family) need
  components players don't own and were barely localized to Portuguese.

## Provisional leanings (not yet ADRs)

- **L1 — No in-app pricing at all.** No reliable BRL data source: LigaMagic has no
  API (community has asked since 2014, still nothing), only fragile HTML scrapers;
  Scryfall prices are USD and don't track the BR market. Instead: the user can
  **export a buy-list** to paste into the official ligamagic.com.br site.
  *Ready to promote to an ADR.*
- **L2 — Cut three whole areas** from the earlier inventory: playgroup/social/stats,
  prices & finance, news/spoilers/content. *Provisional — confirm before promoting.*

## Mode filter — BR "moderately popular or better"

Rodrigo to confirm; these are judgement calls.

- **Kept:** Commander/EDH, Standard, Pioneer, Modern, **Pauper**, Limited
  (Draft/Sealed), **Planechase**, Two-Headed Giant.
- **Dropped:** Legacy/Vintage, Oathbreaker, Canlander, Tiny Leaders, Archenemy,
  Vanguard, Attractions / Un-sets, Horde, Cube.

---

## Function inventory — TO REVIEW POINT BY POINT

Section numbers kept from the discovery conversation for traceability (hence the
gaps at 6, 8, 9). Review marker per line:

- `- [ ]` not yet reviewed &nbsp;·&nbsp; `KEEP` / `CUT` / `MAYBE` appended once decided

### 1. Card database & search  *(foundation — everything else depends on it)*

- [ ] Search by name in **pt-BR and English**; English name always shown
- [ ] Full-text / oracle-text search; syntax filters (color, type, CMC, set, rarity, format)
- [ ] Card detail: oracle text, **printed pt-BR text**, mana cost, P/T, rulings, legality per format
- [ ] Printings browser (every set / version, foil, language, art)
- [ ] Multi-face handling: DFC, meld, split, adventure, flip
- [ ] Set / block browser + release calendar
- [ ] Token & emblem lookup
- [ ] Offline card data (local copy, periodic refresh)

### 2. Collection management

- [ ] Add / remove cards with quantity
- [ ] Printing granularity: set, collector number, foil / non-foil, **language**, condition
- [ ] Camera scan — single and batch
- [ ] Import / export — CSV, plain decklist, other tools' formats
- [ ] **Physical location system** — named binders / boxes, "where is this card",
      re-shelve prompts when a card's deck membership changes
- [ ] Wishlist / want list
- [ ] Trade & sale binder (list what's available)
- [ ] "Bulk" vs. tracked separation
- [ ] Deck ↔ collection reconciliation ("own 82/100 for this deck")
- [ ] **Buy-list export for LigaMagic** — KEEP *(new; replaces all pricing, per L1)*
- [ ] ~~Collection value / value over time~~ — CUT *(per L1)*

### 3. Deck building

- [ ] Create / edit decklist; search cards directly into the deck
- [ ] Format selection + **legality validation** — banlist, singleton,
      **Commander colour identity across all 100**
- [ ] Commander / partner / background / companion selection
- [ ] Stats: mana curve, colour breakdown, type breakdown, land count, mana sources
- [ ] Categories / tags (Ramp, Removal, Draw, Win-con…)
- [ ] Owned-vs-needed view + feeds the buy-list *(no price-to-complete number, per L1)*
- [ ] Goldfish: draw sample hands, mulligan practice
- [ ] Versions / change history / notes / primer text
- [ ] Import / export (Moxfield, Archidekt, Arena, text)
- [ ] Precon / template starting points
- [ ] "Commonly played with your commander" suggestions — MAYBE

### 4. At-the-table gameplay assistance

- [ ] Multiplayer **life counter** (2–6+ players), large-touch layout
- [ ] **Commander damage** grid (per-opponent)
- [ ] Counters: poison, energy, experience, +1/+1 pools, custom
- [ ] State trackers: Monarch, Initiative, Day / Night, "The Ring tempts you" / Ring-bearer
- [ ] Dice roller, coin flip, **random first player**, turn order
- [ ] Turn timer / per-player clock
- [ ] Life-change history + undo
- [ ] Shared table view (one phone in the middle) vs. per-player

### 5. Supplemental modes  *(the Planechase family — kept modes only)*

- [ ] **Planechase:** shared planar deck, plane / phenomenon cards on screen,
      **planar die roll**, planeswalk, chaos trigger, **effect & rules text in pt-BR**
- [ ] Planar deck builder (pick which planes are in the pile) + presets
- [ ] Dungeon tracker: venture step-through, dungeon map visible, room effects in pt-BR
      *(venture cards appear in normal EDH)*
- [ ] Variant-rules reference: Two-Headed Giant (Emperor / Star as read-only text)

### 7. Rules & learning

- [ ] Card rulings (per card)
- [ ] Format rules summaries in pt-BR
- [ ] Keyword / mechanic glossary in pt-BR
- [ ] Comprehensive Rules search — MAYBE *(pt-BR availability is limited)*
- [ ] Beginner "how to play" / first-game guides

### 10. Cross-cutting / infrastructure

- [ ] Auth + user profiles
- [ ] Cross-device sync; **offline-first**
- [ ] Public share links (decks, collection, wishlist)
- [ ] **Localization: pt-BR primary, English fallback** — card names, rules text, UI
- [ ] Onboarding import from other tools
- [ ] Card-data pipeline: Scryfall bulk ingestion + refresh
- [ ] Export everything (data ownership)
- [ ] ~~Pricing pipeline~~ — CUT *(per L1)*

---

## Removed from the earlier inventory

- **6. Playgroup, social & stats** — CUT (L2). Game logging, win rates, ELO,
  pod balancing, per-player notes.
- **8. Prices & finance** — CUT (L1 / L2). Buy-list export survives, relocated to
  section 2.
- **9. Content & news** — CUT (L2). Spoiler feeds, release news, ban-list alerts.

## Open questions

- Which formats need full legality validation, vs. just Commander + a generic check?
- Offline-first: how much of the card DB ships/caches locally, and how is it refreshed?
- Planechase: shared-screen only, or state synced across each player's device?
- Does section 7 (rules & learning) stay, given the pt-BR Comprehensive Rules gap?
- Is the physical location system core, or a later phase?
- Camera scan: build vs. defer — it was a big cost in the previous version.

## Next step

Walk sections 1, 2, 3, 4, 5, 7, 10 line by line; mark each KEEP / CUT / MAYBE;
promote the settled result — plus L1 and the section 6/8/9 cuts — to a scope ADR.

---

## Sources

Competitive/landscape research this document synthesizes. The analysis, filtering
and scope choices above are the author's; these are the inputs.

**App landscape — collection & deck building**
- Draftsim — MTG collection tracker apps: https://draftsim.com/mtg-collection-tracker/
- Draftsim — best MTG deck builder: https://draftsim.com/best-mtg-deck-builder/
- ManaForge — ManaForge vs Moxfield vs Archidekt vs Manabox: https://manaforge.tools/en/blog/manaforge-vs-moxfield-vs-archidekt
- GrimDeck — collection tracker + deck builder apps: https://grimdeck.com/blog/best-mtg-collection-tracker-deck-builder
- ManaTap — MTG deck checker / Commander bracket: https://www.manatap.ai/mtg-deck-checker
- Scrytics — best MTG card scanner apps 2026: https://scrytics.com/blog/best-mtg-card-scanner-app-2026

**App landscape — other categories**
- MTG Wiki — third-party tools: https://mtg.fandom.com/wiki/Third-party_tools
- Draftsim — best MTG life counter apps: https://draftsim.com/best-mtg-life-counter-app/
- Playgroup.gg — EDH game tracker: https://playgroup.gg/
- Commander's Herald — Playgroup.gg overview: https://commandersherald.com/playgroup-gg-a-new-way-to-track-your-games/
- Wizards of the Coast — MTG Companion app: https://magic.wizards.com/en/products/companion-app
- ScrollVault — draft simulator: https://scrollvault.net/draft/
- Lucky Paper — cube resources: https://luckypaper.co/resources/

**Supplemental / variant modes (Planechase family)**
- Quiet Speculation — new (old) ways to play Commander: https://www.quietspeculation.com/2022/01/new-old-ways-to-play-commander/
- Dot Esports — how Planechase works in Commander: https://dotesports.com/mtg/news/how-mtg-planechase-works-in-commander
- PureMTGO — Planechase and Archenemy: https://puremtgo.com/articles/planechase-and-archenemy-two-greatest-formats-youre-not-playing
- MTG Wiki — Dungeon: https://mtg.fandom.com/wiki/Dungeon
- MTG Wiki — Attraction: https://mtg.fandom.com/wiki/Attraction
- Draftsim — Attractions: https://draftsim.com/mtg-attraction/

**BR pricing / LigaMagic API**
- LigaMagic forum — "API de Preços": https://www.ligamagic.com.br/?view=forum%2Fmensagem&id=137182
- LigaMagic forum — "Liga Magic Api": https://www.ligamagic.com.br/?view=forum/mensagem&id=182098
- GitHub — RodrigoMRoli/GetPriceLigamagic: https://github.com/RodrigoMRoli/GetPriceLigamagic
- GitHub — felipeas/liga-price-scraper: https://github.com/felipeas/liga-price-scraper
- GitHub — alan-vieira/preco_magic_card: https://github.com/alan-vieira/preco_magic_card

Retrieved 2026-09-08 via web search.
