# CLAUDE.md

Guidance for AI assistants working in this repository.

## Project

Grimório is a personal MTG / Commander tool (deck building and collection
tracking). It is coursework for a course where **every step of the process is
evaluated**, not just the final product.

The repo is currently an Angular 22 "Hello World" skeleton. The earlier
implementation (deck CRUD, Supabase, camera OCR) was deliberately reverted so the
project could be rebuilt with a decision trail from the first commit — see
decision **D003**. Scope is being (re)defined through discovery; the decision log
is the source of truth for where things stand.

## Read first

- **[docs/decisoes-resumo.md](docs/decisoes-resumo.md)** — one line per decision.
  Start here for orientation.
- **[docs/decisions/](docs/decisions/)** — full record per decision (context,
  alternatives, consequences). Read the relevant one when a task depends on the
  "why".

## Ignore for code/architecture analysis

- **[backlog/VibeCoding/](backlog/VibeCoding/)** — proposal, specs, data model
  and AI-usage history preserved from the reverted version. Historical background
  only. **Not a specification to implement from**, and not representative of the
  current codebase. Anything from here re-enters as a new decision if adopted.

## Conventions

- **Decisions:** any non-trivial decision — technical, product, scope or
  process — gets an entry before or with the commit that implements it. Copy
  `docs/decisions/_template.md`, fill it in, add a line to
  `docs/decisoes-resumo.md`. See **D001** and **D002** for the why and the
  format.
- **Documentation language:** English for working docs and this file; **pt-BR**
  for `README.md`, commit messages, and the decision log (`docs/decisions/`,
  `docs/decisoes-resumo.md`) — all public-facing and part of what is evaluated.
- **Commits:** Conventional Commits, written in pt-BR
  (e.g. `docs: adiciona registro de decisões`).
- **Verification:** the maintainer runs build, test and dev-server commands.
  Don't run them; state what should be checked.

## Stack

Angular 22, npm. `npm start` (dev server, `http://localhost:4200`),
`npm run build` (production build).
