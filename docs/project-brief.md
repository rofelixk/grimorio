# MTG Collection & Deck App — Project Brief

## Vision
A free, Brazil-first web app for Magic: The Gathering players to manage their card collection and decks — built as a personal passion project and a hands-on learning exercise in React, backend development, and AI-assisted development.

## Core Values
- **Free** — No cost, no paywall, no data monetization. Built with AI, a technology with real environmental cost; being free and genuinely useful is a way of giving something back.
- **Brasil** — Built for Brazilian players first. Portuguese card names/text are a core requirement, not a later localization pass. Others may use it, but it isn't designed around them.
- **Knowledge** — Taken seriously despite being coursework. The goal is real understanding of React, basic backend, and AI collaboration/specification skills — not just a finished app. Mistakes and friction are part of the learning, not something to be engineered away.
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

**Explicitly out of scope for MVP (Phase 2/3):**
- Card scanning
- Deck analysis & recommendations
- Portuguese card display (`printed_name`, `printed_text`)
- Local/offline trimmed card database

## Tech Stack
- **Frontend:** React / Next.js (deliberate stretch — user is an experienced Angular developer choosing to learn React)
- **Backend:** Supabase (Postgres + auth + storage), free tier
- **Hosting:** Vercel (free tier)
- **Card data:** Scryfall API (live queries for MVP; no local bulk data yet)

## Key Data Model Decision
- Cards keyed by **`oracle_id`** (language-independent) rather than `scryfall_id` (per-printing/per-language) — ensures the same card is recognized regardless of language or printing, setting up future Portuguese support without a schema migration.

## Rough 6-Week Roadmap
| Week | Focus |
|---|---|
| 1 | Project setup, auth, schema, basic collection CRUD |
| 2 | Finish collection CRUD + storage containers |
| 3 | Deck CRUD + basic Commander legality checks |
| 4 | Location-confidence system (deck-change detection, re-check flags, manual correction) |
| 5 | Polish, search/filter, error handling |
| 6 | Buffer + deployment |

## Future Phases (not yet scoped)
- OCR-based card scanning
- Deck analysis & recommendations engine
- Portuguese card names/text via Scryfall's `pt` language data
- Local trimmed card database (~31,000 cards, ~5–15 MB) for offline search
- Possible hierarchical storage containers (binder → page → slot)

## Working Principle for AI Collaboration
- **Delegate** what's already understood (boilerplate, repetitive/familiar patterns).
- **Collaborate** (explain, don't just generate) on what's being learned — React and backend concepts.