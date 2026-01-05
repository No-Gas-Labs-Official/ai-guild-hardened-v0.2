#!/usr/bin/env bash
set -euo pipefail
echo "This helper deletes the repository (destructive). Edit REPO_OWNER/REPO_NAME inside before using."
read -r -p "Type DELETE to confirm repository deletion: " C
if [ "$C" = "DELETE" ]; then
  gh repo delete REPO_OWNER/REPO_NAME --confirm
  echo "Repository deleted."
else
  echo "Aborted."
fi