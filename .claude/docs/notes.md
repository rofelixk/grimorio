## Notes

Dated, fact-based entries accumulated session-to-session go here — new dependencies, new durable conventions, new scripts/commands, structural changes. See the "worth adding" test in `CLAUDE.md`'s Maintaining section before adding anything. Keep entries short; if a note describes something stable enough to be a permanent reference, move it into `architecture.md` or `commands.md` instead and remove it from here.

## 2026-09-16

- New tokens in `_tokens.scss`: `--shadow-glow-primary-strong` (ember glow for primary-button hover/focus), `--ring-accent` (teal glow-style focus ring, used in place of a hard `outline` on newer components).
- `_tokens.scss` gained `--overlay-backdrop` for `<dialog>::backdrop` — use it instead of a raw `rgba(0,0,0,0.75)`.

## 2026-09-24

- `DESIGN.md` (root) is the design system's source of truth; UI it doesn't cover is undecided.
  Legacy styles (`src/styles/*`, existing component `.scss`) are frozen.
- Legacy global selectors are fenced via `$legacy` from `src/styles/_fence.scss`
  (`:where(:not([data-grm], [data-grm] *))`) — any new legacy global rule must append it, and new
  design-system UI lives under a `[data-grm]` root.
- The pre-rebuild auth UI is preserved at git tag `auth-modal-v1`.
- Until spec 003 lands, `architecture.md`'s "Styling / design system" section describes the legacy
  system only — don't apply it (or `auth-modal` as a reference) to new UI.
