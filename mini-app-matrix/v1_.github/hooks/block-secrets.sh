#!/usr/bin/env bash
# block-secrets.sh - simple pre-commit guard
set -euo pipefail
# check staged files for token patterns
staged_files=$(git diff --cached --name-only --diff-filter=ACM)
if [ -z "$staged_files" ]; then exit 0; fi
patterns="ghp_[A-Za-z0-9_+-]{10,}|github_pat_[A-Za-z0-9_+-]{10,}|gho_[A-Za-z0-9_+-]{10,}|sk-[A-Za-z0-9]{32,}|-----BEGIN .*PRIVATE KEY-----"
found=0
for f in $staged_files; do
  if grep -I -n -E "$patterns" -- "$f" >/dev/null 2>&1; then
    echo "ERROR: Potential secret found in staged file: $f"
    grep -n -E "$patterns" -- "$f" | sed -E 's/([A-Za-z0-9_+-]{4})[A-Za-z0-9_+-]+([A-Za-z0-9_+-]{4})/\1...REDACTED...\2/g'
    found=1
  fi
done
if [ "$found" -eq 1 ]; then
  echo "Commit blocked. Remove secrets or run sanitization before committing."
  exit 1
fi
exit 0