# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Grimorio is a free, personal Magic: The Gathering collection/deck manager built for a Brazilian audience. It tracks the physical storage location of cards, per local profile with optional cloud sync; adding cards (catalog search, scanning) and deck analysis are planned future features.

Features are specified and built through spec-kit (`specs/NNN-*/`, `.specify/`): `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`, governed by `.specify/memory/constitution.md`. `.specify/templates/overrides/plan-template.md` adds a `ui.md` Phase 1 artifact for features with UI.

Early-development rework, single user. Never add backward-compatibility code, migrations, or edge-case handling for old conventions.

## Subagents

Project agents live in `.claude/agents/`. Use them at these points (they override the spec-kit skills' "read everything" steps):

- **`/speckit-implement`**: after each phase, verify the checkpoint with **`test-runner`** (full suite) before starting the next.
- **UI changes**: after any phase or change that touches `.html`/`.scss`/component `.ts`, and always before reporting a feature complete, run **`design-auditor`** and fix what it reports.
- **Tests and lint**: any `npm test`, single-spec or `npm run lint` run from the main thread goes through **`test-runner`**.
- Small single-file edits outside `/speckit-implement` stay inline, with no agents.

@.claude/docs/commands.md

@.claude/docs/architecture.md

## Maintaining these files

Keep CLAUDE.md and the files it imports under `.claude/docs/` strictly fact-based: stack, structure, commands, and conventions actually present in the code. Do not add opinions, session-specific preferences, or in-progress decisions — those belong in the user's personal memory or in the current spec, not this committed, shared file.

Use this test before adding anything:

- **Worth adding:** a new dependency/library that changes the stack, a new durable convention a future session would get wrong by default (e.g. an import alias, a default component setting), a new script/command, a structural change (new top-level folder, new routing pattern).
- **Not worth adding:** a new view/component that just follows an existing documented pattern, bug fixes/refactors/renames with no lasting convention shift, anything speculative or in-progress, and decision history (that lives in each spec's `plan.md`/`research.md`).

If nothing about a change passes the test, say so plainly rather than proposing filler. Accepted updates go straight into `architecture.md` or `commands.md`, after the user reviews the proposed edit.
