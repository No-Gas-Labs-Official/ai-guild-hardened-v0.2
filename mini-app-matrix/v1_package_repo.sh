#!/usr/bin/env bash
# Create a zip of the current folder named nogas-matrix-2026.zip
set -euo pipefail
OUT="nogas-matrix-2026.zip"
if [ -f "$OUT" ]; then
  echo "Removing old $OUT"
  rm -f "$OUT"
fi
zip -r "$OUT" . -x ".git/*" "node_modules/*"
echo "Created $OUT"