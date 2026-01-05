#!/usr/bin/env bash
set -euo pipefail

# Safe deployment helper.
# Usage: ./deploy_safe.sh REPO_OWNER REPO_NAME [CUSTOM_DOMAIN]
REPO_OWNER=${1:-YOUR_GH_ORG}
REPO_NAME=${2:-nogas-matrix-2026}
CUSTOM_DOMAIN=${3:-""}

# Basic secret-scan
if grep -R --line-number -E "ghp_|github_pat_|PERSONAL_ACCESS_TOKEN|GH_TOKEN" .; then
  echo "ERROR: Potential token-like strings found. Sanitize files before deploying."
  exit 1
fi

if [ ! -d .git ]; then
  git init
  git add .
  git commit -m "🚀 Genesis: No_Gas_Labs Matrix (sanitized)"
else
  git add .
  git commit -m "chore: update sanitized site" || true
fi

if [ -n "$CUSTOM_DOMAIN" ]; then
  echo "$CUSTOM_DOMAIN" > CNAME
  git add CNAME
  git commit -m "chore: add CNAME for $CUSTOM_DOMAIN" || true
fi

# Create or push using gh CLI
if ! gh repo view "${REPO_OWNER}/${REPO_NAME}" >/dev/null 2>&1; then
  gh repo create "${REPO_OWNER}/${REPO_NAME}" --public --source=. --remote=origin --push
else
  git remote add origin "https://github.com/${REPO_OWNER}/${REPO_NAME}.git" 2>/dev/null || true
  git branch -M main
  git push -u origin main --force
fi

echo "Deployed (or pushed). Check Actions → Pages for deployment status."