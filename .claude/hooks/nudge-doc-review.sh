#!/bin/sh
# Stop hook. Fires after every response, but only acts once: if a plan
# was just approved (marker from mark-plan-started.sh present), nudges
# Claude to check whether the finished work is CLAUDE.md-worthy, then
# consumes the marker so it doesn't repeat on later turns.
set -e

project_dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
marker="$project_dir/.claude/docs/.plan-in-progress"

if [ -f "$marker" ]; then
  rm -f "$marker"
  cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"You just finished executing an approved plan. Check whether anything from that plan is CLAUDE.md-worthy per the \"worth adding\" test in CLAUDE.md's Maintaining section, and if so, propose the specific edit to the user now. If nothing qualifies, say so plainly instead of proposing filler."}}
EOF
fi

exit 0
