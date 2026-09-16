---
description: Stage all changes, commit, and push to main
---

Run the standard git commit workflow on the current changes:

1. Run `git status` and `git diff` (staged and unstaged) to see everything that changed, and `git log --oneline -5` to match this repo's commit message style.
2. Stage all changed and new files with `git add`, reviewing what got staged for anything that shouldn't be committed (secrets, stray files).
3. Write a concise commit message focused on why the change was made, following the Git Safety Protocol (new commit, no `--amend`, no `--no-verify`, no force push) and ending with the attribution trailer already specified in this session.
4. Push to `main`.

Do not ask for confirmation before pushing — the user invoking `/ship` is the confirmation.
