```markdown
# No_Gas_Labs™ Mini-App Matrix (2026 Scout Edition)

Curated discovery portal for gasless Mini Apps on Base & Farcaster.

Quick start
1. Place `matrix-preview.png` (1024x1024) in repo root.
2. Ensure `index.html`, `sw.js`, `manifest.webmanifest`, and `.well-known/farcaster.json` are present.
3. Commit & push to main — GitHub Actions will deploy to Pages.

Security: Remove tokens before commit
- Replace PATs with: `const TOKEN = process.env.GH_TOKEN || 'REDACTED';`
- Store GH_TOKEN as a repository secret for Actions:
  `gh secret set GH_TOKEN --repo REPO_OWNER/REPO_NAME`

Contributing
- Submit apps using the issue template: `.github/ISSUE_TEMPLATE/add-app.md`
- Prefer small PRs that add apps to the data list (or apps.json if added later)

Local dev
```bash
python3 -m http.server 8000
open http://localhost:8000
```

License: MIT
```