```markdown
# No_Gas_Labs™ Mini-App Matrix (2025 Edition)

This repo contains the No_Gas_Labs Mini-App Matrix — a single-file HTML matrix of Farcaster mini-apps and Base frames.

What's included:
- index.html — improved, Frame-aware, with per-item copy buttons and search
- sw.js — tiny service worker for basic offline caching
- manifest.webmanifest — PWA manifest
- .well-known/farcaster.json — Farcaster well-known metadata

Quick start (deploy):
1. Add these files to the root of a static hosting site (GitHub Pages, Vercel, Netlify).
2. Ensure `/matrix-preview.png` is available at root for preview/manifest.
3. Optional: serve .well-known/farcaster.json at `/.well-known/farcaster.json`.

Notes:
- The page attempts to use the Frame SDK to open links in-frame when available, and falls back to `window.open`.
- The service worker is intentionally minimal. Update the cache name on deploy to refresh caches.

Contributions:
- Use the Issue template (create an Issue in this repo) to suggest new apps.
- Pull requests welcome — keep changes lightweight.

License: MIT
```