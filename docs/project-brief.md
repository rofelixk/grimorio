# MTG Collection & Deck App — Project Brief

## Vision
A free, Brazil-first web app for Magic: The Gathering players to manage their card collection and decks — built as a personal passion project and a hands-on learning exercise in backend development and AI-assisted development.

## Core Values
- **Free** — No cost, no paywall, no data monetization. Built with AI, a technology with real environmental cost; being free and genuinely useful is a way of giving something back.
- **Brasil** — Built for Brazilian players first. Portuguese card names/text are a core requirement, not a later localization pass. Others may use it, but it isn't designed around them.
- **Knowledge** — Taken seriously despite being coursework. The goal is real understanding of basic backend development and AI collaboration/specification skills — not just a finished app. Mistakes and friction are part of the learning, not something to be engineered away.
- **Discovery** — *Ad astra, per aspera.* Difficulty is expected and accepted, not avoided.

## Target User
Brazilian MTG players, primarily Commander/EDH format.

## Core Features (full vision)
1. Card Collection CRUD
2. Deck CRUD
3. Card scanning (OCR-based, text/set recognition — not image recognition)
4. Deck analysis & recommendations (Commander legality, curve, synergy)
5. Helpful/guided interface — including a custom **storage location system**
6. Completely free to use and run

## MVP Scope (6 weeks)
**In scope:**
- Collection CRUD
- Deck CRUD (Commander/EDH focus)
- Storage location system:
  - Flat, user-named containers (e.g. "Blue Binder")
  - Each card tracks `lastLocationUpdateDate`
  - Location confidence flagged for re-check when a card's deck membership changes after that date
  - Manual "correct location" action resets confidence
- Local trimmed card database, populated from Scryfall's **bulk data** files (see *Card Data Ingestion* below). Card search and display run against this local copy in Supabase, not against the live Scryfall API.

**Explicitly out of scope for MVP (Phase 2/3):**
- Card scanning
- Deck analysis & recommendations
- Portuguese card display (`printed_name`, `printed_text`)

## Tech Stack
- **Frontend:** Angular — the user's existing area of expertise. The course's focus is fluency in AI-assisted development, not learning a new frontend framework, so the frontend is deliberately kept on familiar ground rather than stretching into React/Next.js. This keeps the learning effort on backend concepts and AI collaboration/specification skills.
- **Backend:** Supabase (Postgres + auth + storage), free tier
- **Hosting:** Vercel (free tier)
- **Card data:** Scryfall — consumed via its **bulk data** files (downloaded, trimmed, and stored in Supabase), not via live per-request API calls.

## Key Data Model Decision
- Cards keyed by **`oracle_id`** (language-independent) rather than `scryfall_id` (per-printing/per-language) — ensures the same card is recognized regardless of language or printing, setting up future Portuguese support without a schema migration.

## Card Data Ingestion
- **Decision (moved into MVP):** maintain a local trimmed card database instead of querying the live Scryfall API at runtime.
- **Why:** the live API is rate-limited (~10 req/s, throttling + IP blocks on abuse) and is a runtime dependency that can be slow or down; browsers also can't send the `User-Agent` Scryfall asks for. Scryfall explicitly publishes bulk data files so apps don't hammer the API. A local copy removes Scryfall from the request path, makes search a fast Postgres query, and gives a predictable, downtime-free workflow from day one.
- **Source:** Scryfall's *Oracle Cards* bulk file (~30–35k cards, one object per `oracle_id`), trimmed to the gameplay fields the app needs (name, mana cost, cmc, type line, oracle text, colors, color identity, keywords, Commander legality, layout, one image URL, trimmed `card_faces`). Target size well under 20 MB in Postgres.
- **Ingestion:** a server-side script (local `npm` script first, later a scheduled GitHub Action) downloads and stream-parses the file, trims it, and upserts into the Supabase `cards` table using the `service_role` key. Never runs in the browser.
- **`cards` table RLS:** shared read-only reference data — `SELECT` for authenticated users, writes only via the `service_role` key (a deliberate contrast with per-user tables like `collection_items`).
- **Refresh cadence:** weekly is enough; the real trigger is a new set release (~every 4–6 weeks). The scheduled refresh also keeps the free-tier Supabase project from auto-pausing.
- **Still out of scope:** the *All Cards* / localized bulk files that carry `printed_name` / `printed_text` — that is the Phase 2 Portuguese path.

## Rough 6-Week Roadmap
| Week | Focus |
|---|---|
| 1 | Project setup, auth, schema, Scryfall bulk card import, basic collection CRUD |
| 2 | Finish collection CRUD + storage containers |
| 3 | Deck CRUD + basic Commander legality checks |
| 4 | Location-confidence system (deck-change detection, re-check flags, manual correction) |
| 5 | Polish, search/filter, error handling |
| 6 | Buffer + deployment |

## Future Phases (not yet scoped)
- OCR-based card scanning
- Deck analysis & recommendations engine
- Portuguese card names/text via Scryfall's `pt` language data (localized bulk files)
- Fully offline card search (service worker / local cache of the trimmed DB)
- Possible hierarchical storage containers (binder → page → slot)

## Working Principle for AI Collaboration
- **Delegate** what's already understood (boilerplate, repetitive/familiar patterns, most Angular/frontend work).
- **Collaborate** (explain, don't just generate) on what's being learned — backend concepts and AI collaboration/specification practice.