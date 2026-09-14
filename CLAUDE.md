# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Grimorio is a free, personal Magic: The Gathering collection/deck manager built for a Brazilian audience. It tracks physical storage location of cards, with planned future features for card scanning and deck analysis.

@.claude/docs/commands.md

@.claude/docs/architecture.md

@.claude/docs/skills.md

@.claude/docs/notes.md

## Maintaining these files

Keep CLAUDE.md and the files it imports under `.claude/docs/` strictly fact-based: stack, structure, commands, and conventions actually present in the code. Do not add opinions, session-specific preferences, or in-progress decisions — those belong elsewhere (the user's personal memory, not this committed, shared file).

Use this test before adding anything:

- **Worth adding:** a new dependency/library that changes the stack, a new durable convention a future session would get wrong by default (e.g. an import alias, a default component setting), a new script/command, a structural change (new top-level folder, new routing pattern).
- **Not worth adding:** a new view/component that just follows an existing documented pattern, bug fixes/refactors/renames with no lasting convention shift, anything speculative or in-progress.

If nothing about a change passes the "worth adding" test, say so plainly rather than proposing filler. Accepted updates go into `.claude/docs/notes.md` first; once a note describes something stable, fold it into `architecture.md` or `commands.md` and drop it from `notes.md`.

After finishing an approved plan's work, a hook nudges Claude to check whether anything from that plan is doc-worthy per the test above, and to propose the specific edit in conversation — nothing is ever written to these files without the user reviewing it first.
