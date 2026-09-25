#!/bin/sh
# PostToolUse hook (matcher: Edit|Write). Type-checks and lints after an
# edit, but only when the edited file is TypeScript or an Angular template —
# edits to specs, docs and other non-code files skip the slow tsc/lint pass.
set -e

project_dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

file=$(node -e '
  let s = "";
  process.stdin.on("data", (c) => (s += c)).on("end", () => {
    try { process.stdout.write(JSON.parse(s).tool_input?.file_path ?? ""); } catch {}
  });
')

case "$file" in
  *.ts|*.html) ;;
  *) exit 0 ;;
esac

cd "$project_dir"
npx tsc --noEmit -p tsconfig.json && npx ng lint --fix 2>&1 | tail -20
