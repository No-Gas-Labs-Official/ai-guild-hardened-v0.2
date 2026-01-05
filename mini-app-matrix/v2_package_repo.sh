#!/usr/bin/env bash
set -euo pipefail
OUT="${PWD##*/}.zip"
zip -r "$OUT" . -x ".git/*" "node_modules/*" "*.bak" >/dev/null
echo "Created $OUT"