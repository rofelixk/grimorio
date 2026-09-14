#!/bin/sh
# PostToolUse hook (matcher: ExitPlanMode). Marks that a plan was just
# approved, so the Stop hook (nudge-doc-review.sh) can nudge once that
# plan's work finishes. No AI calls here — just a timestamp file.
set -e

project_dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
mkdir -p "$project_dir/.claude/docs"
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$project_dir/.claude/docs/.plan-in-progress"

exit 0
