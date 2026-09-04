# Design Context

Written for design tools (e.g. Claude Design) working against this repo. Covers what a visual
design pass needs — real screens, the one real visual constraint that exists, and product
boundaries — rather than the engineering detail in [CLAUDE.md](../CLAUDE.md). For "why" behind
any of this, see [project-brief.md](project-brief.md); for what's persisted, see
[data-model.md](data-model.md).

## What this app is

Grimório: a free, Brazil-first Magic: The Gathering collection & deck manager, Commander/EDH
focus. Personal project, not a commercial product — no monetization, no growth/engagement
mechanics. A user tracks the cards they physically own, organizes them into named collections,
and (eventually) builds decks and tracks physical storage location.

**Platform: responsive web app** (Angular, served via `ng serve` locally / Vercel in
production). Not a native mobile app, no mobile app store presence, no separate mobile design
system — "mobile" only matters here as a responsive breakpoint of the same web app.

## Current visual state — read before assuming a style exists

**There is no design system yet.** The app is functional-first: default HTML form controls,
ad-hoc spacing, plain `1px solid #ddd`-style borders, no typography scale, no component
library (no Material/Tailwind/etc.), no logo, no defined brand colors beyond the one palette
below. If asked to "match the existing style," the honest answer is that there isn't one to
match beyond structural conventions — the real task is usually establishing a visual identity,
not extending one.

**Collection colors are a placeholder, not a brand decision.** `PALETA_CORES_COLECAO`
(`src/app/shared/constants/colecao.ts`) is 8 generic hex swatches, added purely so collections
are visually distinguishable at a glance (a left-border/dot marker) — not a considered palette
and not brand identity. **Planned replacement:** a two-color picker built on Magic's own WUBRG
color wheel, letting a player assign their collection a mono- or two-color identity (e.g. a
Golgari-colored binder) instead of an arbitrary hex swatch — a more on-theme way to solve the
same "tell collections apart at a glance" need. Not yet designed or built. Don't treat the
current 8 hex values as something to extend or theme around — expect them to be replaced.

## Real screens today

| Route | Component | State |
|---|---|---|
| `/` | `Inicio` | Card search (name/text), results grid, pagination |
| `/colecao` | `Colecao` | List user's collections (create/edit/delete via modal), cross-collection card search |
| `/colecao/:id` | `ColecaoDetalhe` | One collection: card search + add, list of cards in it with quantity/remove |
| `/carta/:oracleId` | `Carta` | Single card detail — art, mana cost/value, type, oracle text, flip for multi-face cards |
| `/baralhos` | `Baralhos` | **Stub only** — a heading and a back button, no deck functionality built yet |
| `/cadastro` | `Cadastro` | Sign up form (email/password) |
| `/creditos` | `Creditos` | Legal/attribution notice |

Shared chrome: a fixed header (nav + sign in/out) and footer (Scryfall/Wizards attribution,
link to Créditos) wrap every page — see `src/app/app.html`.

Shared reusable pieces: `Cartao` (a card tile), `BuscaCartas` (search input + paginated results
grid, used by both `Inicio` and `ColecaoDetalhe`), `ModalColecao` (create/edit collection),
`ModalEntrar` (sign in).

## Values that should shape tone, not just features

- **Free** — no paywalls, no upsells, no "premium" visual signaling (locked features, upgrade
  nags).
- **Brasil** — Brazilian players are the primary audience. Note: **current UI copy is English**
  (see screens above) — Portuguese UI text is a known future direction, not yet decided or
  built. Don't assume pt-BR interface copy is already a settled convention; ask if unsure.
- **Knowledge / Discovery** — this is a learning project; friction and manual steps (e.g. no
  onboarding wizard, no gamified quiz-driven personalization) are acceptable and often
  intentional, not gaps to smooth over by default.

## Explicitly not in scope — don't design for these unless asked

- No persona/onboarding-quiz system, no content-curation or "player type" concept of any kind.
- No meta stats, price tracking, trade/marketplace, LGS or event finder — this is a personal
  collection/deck tool, not a social or competitive platform.
- No card scanning/OCR UI yet (deferred feature; ask before designing scan flows).
- No native mobile screens — design responsively for the one web app.

## IP / legal constraints (carries into any generated asset)

- Unofficial fan project — never imply WotC/Hasbro endorsement, never use their logos/branding.
- Card images come from the Scryfall API, not custom-illustrated assets — don't invent new card
  art or remix licensed IP (including Universes Beyond crossover art) into new imagery.
- Keep the existing attribution footer/credits pattern (see `Creditos` above) intact in any
  full-page redesign.
