# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Grimorio is a free, personal Magic: The Gathering collection/deck manager built for a Brazilian audience. It tracks the physical storage location of cards, per local profile with optional cloud sync; adding cards (catalog search, scanning) and deck analysis are planned future features.

Features are specified and built through spec-kit (`specs/NNN-*/`, `.specify/`): `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`, governed by `.specify/memory/constitution.md`. `.specify/templates/overrides/plan-template.md` adds a `ui.md` Phase 1 artifact for features with UI.

Early-development rework, single user. Never add backward-compatibility code, migrations, or edge-case handling for old conventions.

## Working Style

- In auto-mode, apply proposed edits directly. Don't just describe them.
- When I say skip tests, don't update or run specs until I say otherwise.
- If test code looks broken, ask whether it is unfinished before calling it a 'pre-existing bug'.
- For styling feedback, make the smallest change that matches the request. Don't add extra animations or effects.

## Subagents

Project agents live in `.claude/agents/`. Use them at these points (they override the spec-kit skills' "read everything" steps):

- **`/speckit-implement`**: after each phase, verify the checkpoint with **`test-runner`** (full suite) before starting the next.
- **UI changes**: after any phase or change that touches `.html`/`.scss`/component `.ts`, and always before reporting a feature complete, run **`design-auditor`** and fix what it reports.
- **Tests and lint**: any `npm test`, single-spec or `npm run lint` run from the main thread goes through **`test-runner`**.
- Small single-file edits outside `/speckit-implement` stay inline, with no agents.

## Browser Verification

- Use Playwright for a quick visual check only: 1–3 screenshots of the changed component.
- If a selector or flow fails twice, stop. Report what you saw and ask before going further.
- Never build multi-step automation or test harnesses just to verify a styling change.

## Git / Shipping

- Every commit must include the required attribution trailer. Check it before pushing.
- Before committing, list ONLY files actually changed in this session (git diff --stat). Do not describe pre-existing uncommitted files as new.
- Ask before including untracked handoff/design folders.
- If push fails with an OAuth/token refresh error, retry once automatically before reporting.

@.claude/docs/commands.md

@.claude/docs/architecture.md

## Maintaining these files

The Working Style, Subagents, Browser Verification and Git / Shipping sections are standing working rules for Claude and are edited only when the user asks.

Keep everything else — the Project section and the files imported under `.claude/docs/` — strictly fact-based: stack, structure, commands, and conventions actually present in the code. Do not add opinions, session-specific preferences, or in-progress decisions there — those belong in the user's personal memory or in the current spec.

Use this test before adding anything:

- **Worth adding:** a new dependency/library that changes the stack, a new durable convention a future session would get wrong by default (e.g. an import alias, a default component setting), a new script/command, a structural change (new top-level folder, new routing pattern).
- **Not worth adding:** a new view/component that just follows an existing documented pattern, bug fixes/refactors/renames with no lasting convention shift, anything speculative or in-progress, and decision history (that lives in each spec's `plan.md`/`research.md`).

If nothing about a change passes the test, say so plainly rather than proposing filler. Accepted updates go straight into `architecture.md` or `commands.md`, after the user reviews the proposed edit.
