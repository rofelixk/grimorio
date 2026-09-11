# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Grimorio is a free, personal Magic: The Gathering collection/deck manager built for a Brazilian audience. It tracks physical storage location of cards, with planned future features for card scanning and deck analysis.

## Commands

```bash
npm start          # dev server (ng serve)
npm run build      # production build -> dist/grimorio/browser
npm run watch      # dev build with rebuild on change
npm test           # unit tests (Vitest, via `ng test`)
npm run lint       # ESLint (angular-eslint) over src/
```

Run a single test file: `npx ng test --include='**/home.spec.ts'` (glob is relative to the project root, matching Vitest's `include` semantics).

## Architecture

- **Angular 22, standalone components, zoneless** (no `zone.js` dependency) — change detection relies on signals/explicit triggers, not zone patching. Bootstrapped in `src/main.ts` via `bootstrapApplication`.
- **No UI component framework.** Ionic and Angular Material were both evaluated and removed; components and styles are hand-written (plain HTML/SCSS per component).
- **Routing**: `src/app/app.routes.ts` is the single source of route definitions. Route-level ("page") components live under `src/app/views/<name>/`, one folder per view, each with its own `.ts`/`.html`/`.scss`/`.spec.ts`. `home` is the current example and is mounted at the root path (`''`).
- **App shell**: `src/app/app.ts` is the root component; its template (`app.html`) is just `<router-outlet />`.
- **Static assets** go under `public/assets/` and are served at `/assets/...` at runtime (configured via the `assets` glob in `angular.json`'s build target, which copies everything under `public/` to the app root).
- **Capacitor** (`capacitor.config.ts`) wraps the built web app (`dist/grimorio/browser`, must match the `build` target's output path) for native targets. No native platforms (`android/`, `ios/`, `electron/`) have been added to the project yet — running `npx cap add <platform>` will generate them.
- **Testing**: unit tests run through Angular CLI's `@angular/build:unit-test` builder, backed by Vitest (not Karma, not Jest) — this is Angular's current default runner and is wired into the same esbuild-based pipeline as `ng build`/`ng serve`.

## Maintaining this file

Keep CLAUDE.md (and any future AI-context files added alongside it) strictly fact-based: stack, structure, commands, and conventions actually present in the code. Do not add opinions, session-specific preferences, or in-progress decisions — those belong elsewhere, not in version-controlled project docs.

## Relevant skills/subagents

For this Angular + Capacitor project, these are the most applicable of the skills/subagents available in Claude Code:

- `code-review` skill — review a diff/PR for bugs and cleanup opportunities.
- `simplify` skill — post-change cleanup pass (reuse, simplification, efficiency).
- `run` skill — launch the app and verify a UI change actually works in-browser.
- `doc-syncer` skill — update README/CLAUDE.md after a code change makes them stale.
- `security-review` skill — run before merging security-sensitive changes (e.g. future auth/Supabase work).
- `Explore` subagent — locate code across the repo for open-ended searches.
- `Plan` subagent — design an implementation approach for non-trivial features.
- `debugger` subagent — root-cause a failing test or unexpected runtime behavior.
- `test-writer` subagent — add Vitest coverage for existing code.
- `dep-auditor` subagent — check npm dependencies for outdated/vulnerable packages.
- `pr-describer` subagent — draft a PR description from the current branch's diff.
