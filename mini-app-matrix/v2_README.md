```markdown
# No_Gas_Labs™ Mini-App Matrix (2025 Edition)

This repo contains the No_Gas_Labs Mini-App Matrix — a Frame-ready single-file HTML matrix of Farcaster mini-apps and Base frames.

Included:
- index.html — improved, Frame-aware, with per-item copy links, search and PWA hooks
- sw.js — service worker (basic cache-first)
- manifest.webmanifest — PWA manifest
- .well-known/farcaster.json — Farcaster well-known metadata
- .github/workflows/deploy.yml — GitHub Actions auto-deploy to Pages
- .github/ISSUE_TEMPLATE/add-app.md — Issue template for submissions

Quick start (deploy):
1. Add these files to the root of a new repository (include `matrix-preview.png` at repo root).
2. Push to GitHub `main` branch. The included workflow will deploy to GitHub Pages automatically.
3. Optional: update links, add new apps via PRs or Issues.

Notes:
- Frame SDK usage: the page attempts to open links via the Frame SDK first, falling back to window.open.
- Service worker is minimal for offline usage. Bump `CACHE_NAME` for new releases.

Contributing:
- Use the Issue template to suggest apps.
- PRs welcome — prefer small diffs to the HTML or split into JSON data if you plan programmatic updates.

License: MIT
```