# CLAUDE.md

MTG collection & deck manager — a free, Brazil-first web app. Personal passion project and a hands-on learning exercise in backend development and AI-assisted development.

Full context, rationale, and roadmap: [docs/project-brief.md](docs/project-brief.md). Read it when a decision depends on the "why".
What gets persisted in Supabase (per-column decisions and rationale): [docs/data-model.md](docs/data-model.md).

## Commands & workflow
- **Do not run `npm test`, `npm start`, `npm run build`, `ng test`, `ng serve`, or `ng build`.** The user runs and verifies these. Claude's job is to create/modify the necessary files and then hand off.
- Run tests: `npm test` (Jest, via `jest-preset-angular`; config in `jest.config.js` / `setup-jest.ts`). Watch mode: `npm run test:watch`.
- Dev server: `npm start` (`ng serve`, http://localhost:4200). Production build: `npm run build`.

## Tech Stack
- **Frontend:** Angular — the user's existing area of expertise. The course's focus is AI-collaboration fluency, not learning a new frontend framework, so the frontend deliberately stays on familiar ground (no React/Next.js stretch).
- **Backend:** Supabase (Postgres + auth + storage), free tier.
- **Hosting:** Vercel, free tier.
- **Card data:** Scryfall **bulk data** files, downloaded/trimmed/stored in Supabase. Search and display run against this local `cards` table — no live Scryfall calls at runtime.

## Core Architecture Decisions
- **Cards keyed by `oracle_id`** (language-independent), never `scryfall_id` (per-printing/per-language). This lets the same card be recognized across languages and printings, and sets up Portuguese support with no schema migration.
- **Local card DB:** a server-side script (local `npm` script first, later a scheduled GitHub Action) upserts the trimmed Scryfall *Oracle Cards* bulk file into `cards` via the `service_role` key — never in the browser. Refresh ~weekly. `cards` RLS = `SELECT` for authenticated users, writes only via `service_role` (contrast with per-user tables). Rationale in the brief's *Card Data Ingestion* section.
- **Storage location system:** flat, user-named containers (e.g. "Blue Binder"). Each card tracks `lastLocationUpdateDate`. Location confidence is flagged for re-check when a card's deck membership changes after that date; a manual "correct location" action resets confidence.
- Everything must run on free tiers — treat quota and cost as design constraints.

## Core Values (as applied to technical decisions)
- **Free** — No cost, no paywall, no data monetization. Keep it cheap to run; free tier is a hard constraint, not a starting point.
- **Brasil** — Brazilian players first. Portuguese card names/text (`printed_name`, `printed_text`) are a core requirement deferred to Phase 2, so don't make choices now that block it. Commander/EDH is the primary format.
- **Knowledge** — This is coursework taken seriously. On concepts being learned (backend, AI collaboration/specification), explain and collaborate — don't just generate. Don't engineer away friction that's part of the learning.
- **Discovery** — *Ad astra, per aspera.* Difficulty is expected and accepted; don't optimize it out at the cost of understanding.

## AI Collaboration Principle
- **Delegate** what's already understood (boilerplate, familiar/repetitive patterns, most Angular/frontend work).
- **Collaborate** (explain, don't just generate) on what's being learned — backend concepts and AI collaboration/specification practice.

## MVP Scope
**In scope:**
- Collection CRUD
- Deck CRUD (Commander/EDH focus), incl. basic Commander legality checks
- Storage location system with location-confidence tracking (see above)
- Local trimmed card DB from Scryfall bulk data (search/display source)
- Search/filter, error handling, polish, deployment

**Out of scope for MVP (Phase 2/3):**
- Card scanning (OCR-based text/set recognition)
- Deck analysis & recommendations engine
- Portuguese card display (localized bulk files)
- Fully offline card search
