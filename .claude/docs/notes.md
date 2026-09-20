## Notes

Dated, fact-based entries accumulated session-to-session go here — new dependencies, new durable conventions, new scripts/commands, structural changes. See the "worth adding" test in `CLAUDE.md`'s Maintaining section before adding anything. Keep entries short; if a note describes something stable enough to be a permanent reference, move it into `architecture.md` or `commands.md` instead and remove it from here.

## 2026-09-16

- New tokens in `_tokens.scss`: `--shadow-glow-primary-strong` (ember glow for primary-button hover/focus), `--ring-accent` (teal glow-style focus ring, used in place of a hard `outline` on newer components).
- `_tokens.scss` gained `--overlay-backdrop` for `<dialog>::backdrop` — use it instead of a raw `rgba(0,0,0,0.75)`.
