## Notes

Dated, fact-based entries accumulated session-to-session go here — new dependencies, new durable conventions, new scripts/commands, structural changes. See the "worth adding" test in `CLAUDE.md`'s Maintaining section before adding anything. Keep entries short; if a note describes something stable enough to be a permanent reference, move it into `architecture.md` or `commands.md` instead and remove it from here.

## 2026-09-14

- New `src/app/core/utils/` folder for framework-agnostic pure functions (first occupant: `card-ocr.util.ts`, OCR helpers used by card scanning).
- Angular's Vitest builder does not support `vi.mock` on relative imports — if a util needs to be mocked in a component test, wrap it in a thin `providedIn: 'root'` service (e.g. `CardOcrService` wrapping `runCardOcr`) so it can be swapped via a TestBed provider instead.

## 2026-09-15

- New `src/styles/_forms.scss` global stylesheet partial: baseline styling for `input[type='text']` (dark surface background, token border/radius/padding), following the same global-tag-selector convention `_buttons.scss` already uses for `button`. Imported in `styles.scss` alongside `buttons`.

## 2026-09-16

- New `src/styles/_motion.scss` partial: shared `--ease-standard`/`--duration-fast/base/slow` timing tokens, `@keyframes spin`, and a `.spinner` loading utility. Imported in `styles.scss` alongside `buttons`/`forms`. New components needing transitions/animations should reuse these tokens instead of retyping timing values.
- New tokens in `_tokens.scss`: `--shadow-glow-primary-strong` (ember glow for primary-button hover/focus), `--ring-accent` (teal glow-style focus ring, used in place of a hard `outline` on newer components).
- The CSS grid-rows accordion trick (`display: grid; grid-template-rows: 0fr` → `1fr` on a wrapper, `overflow: hidden` on its inner child) animates a block's height without JS measurement — used in `auth-modal` for the sign-up-only field and the submit spinner. Pair a collapsed wrapper with `[attr.inert]` when it holds a focusable control, so it's skipped from the tab order while hidden.
