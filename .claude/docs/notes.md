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
- New `src/app/shared/color-theme-picker/` + `src/app/core/services/theme.service.ts`: a concept-test feature letting sign-up (and Profile) pick up to 3 MTG colors (W/U/B/R/G) that retint `auth-modal`'s own ring/glow/tab/button *locally*, not app-wide. Pattern worth reusing for any future component-scoped (non-global-token) runtime theming: define short aliases with fallback chains once on the root element (e.g. `--mp: var(--modal-primary, var(--color-primary));`), then reference the short alias everywhere else in that component's stylesheet instead of repeating the full `var(--x, var(--y))` chain per rule — keeps compiled CSS well under the `anyComponentStyle` 8kB error budget in `angular.json`.
- `public/assets/mana/`: all 84 MTG mana/card symbol SVGs fetched from Scryfall's `/symbology` API, plus a `manifest.json` describing each (symbol, english name, colors, hybrid/phyrexian flags). Only the 5 WUBRG icons are wired up so far (the theme picker); the rest are fetched for future mana-cost rendering.
- `auth-modal.scss` uses CSS relative-color syntax `rgb(from var(--x) r g b / pct%)` rather than `color-mix()` for alpha-blended glow effects — meaningfully shorter compiled output for the same effect, same modern-browser baseline as `color-mix()` already in use.
- A negative margin used to "reclaim" padding added for a box-shadow ring/glow doesn't survive being the first/last child of an `overflow: hidden` ancestor whose size is auto (e.g. the grid-rows accordion's `.collapse-inner`): the ancestor sizes itself to the normal-flow box, then clips anything the negative margin pushed past that boundary. Give the ring real, uncompensated padding instead.
