#!/usr/bin/env bash
# auto_deploy_greenlight.sh
# Fully automated "green-light" deployment for No_Gas_Labs™ Matrix (2026).
# WARNING: Destructive operations can occur (force push, repo creation). Run locally only.
set -euo pipefail
IFS=$'\n\t'

# -------------------------
# Configuration via ENV
# Required:
#   REPO_OWNER, REPO_NAME, GH_PAT
# Optional:
#   CUSTOM_DOMAIN, ANNOUNCEMENT_TONE (Neon|Founder|Bankless)
# Controls:
#   AUTO_RUN=1 (must be set to run automatically)
#   ALLOW_DESTRUCTIVE=1 (must be set to permit force-push/repo creation)
# -------------------------
REPO_OWNER="${REPO_OWNER:-}"
REPO_NAME="${REPO_NAME:-}"
CUSTOM_DOMAIN="${CUSTOM_DOMAIN:-}"
ANNOUNCEMENT_TONE="${ANNOUNCEMENT_TONE:-Neon}"
AUTO_RUN="${AUTO_RUN:-0}"
ALLOW_DESTRUCTIVE="${ALLOW_DESTRUCTIVE:-0}"
GH_PAT="${GH_PAT:-}"

# Safety check: must explicitly enable auto-run and destructive ops
if [ "${AUTO_RUN}" != "1" ]; then
  echo "AUTO_RUN not enabled. Export AUTO_RUN=1 to allow automatic execution. Exiting."
  exit 1
fi
if [ "${ALLOW_DESTRUCTIVE}" != "1" ]; then
  echo "ALLOW_DESTRUCTIVE not enabled. Export ALLOW_DESTRUCTIVE=1 to permit destructive remote operations. Exiting."
  exit 1
fi
if [ -z "${REPO_OWNER}" ] || [ -z "${REPO_NAME}" ]; then
  echo "REPO_OWNER and REPO_NAME must be set in env. Exiting."
  exit 1
fi
if [ -z "${GH_PAT}" ]; then
  echo "GH_PAT must be set in environment (export GH_PAT=\"ghp_...\"). Exiting."
  exit 1
fi

# Helper: timestamp
ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

# Persist deploy state
STATE_FILE=".deploy_state"
save_state() {
  jq -n --arg stage "$1" --arg info "$2" --arg time "$(ts)" '{stage:$stage,info:$info,time:$time}' > "$STATE_FILE"
}

echo "AUTO DEPLOY (green-light) — starting at $(ts)"
echo "Repo: ${REPO_OWNER}/${REPO_NAME}  Domain: ${CUSTOM_DOMAIN:-(none)}"

# -------------------------
# Dependency checks
# -------------------------
missing=()
for cmd in git curl jq python3 zip sed grep find base64; do
  if ! command -v "$cmd" >/dev/null 2>&1; then missing+=("$cmd"); fi
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "Missing dependencies: ${missing[*]}. Install them and re-run."
  exit 1
fi

# -------------------------
# Secret scan (hard gate)
# -------------------------
echo "Running secret scan..."
secrets=$(grep -R --line-number -E "ghp_[A-Za-z0-9_+-]{10,}|github_pat_[A-Za-z0-9_+-]{10,}|gho_[A-Za-z0-9_+-]{10,}|ghs_[A-Za-z0-9_+-]{10,}|sk-[A-Za-z0-9]{32,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC |OPENSSH |PRIVATE )?PRIVATE KEY-----" . || true)
high_entropy=$(git ls-files -z 2>/dev/null | xargs -0 grep -Eo "[A-Za-z0-9+/]{50,}={0,2}" || true)
if [ -n "$secrets" ] || [ -n "$high_entropy" ]; then
  echo "Security HALT: potential secrets detected (redacted):"
  if [ -n "$secrets" ]; then
    echo "$secrets" | sed -E 's/([A-Za-z0-9_+-]{4})[A-Za-z0-9_+-]+([A-Za-z0-9_+-]{4})/\1...REDACTED...\2/g' || true
  fi
  if [ -n "$high_entropy" ]; then
    echo "(High entropy fragments detected; inspect manually.)"
  fi
  save_state "preflight_failed_secrets" "secrets_detected"
  exit 2
fi
echo "Secret scan: OK"

# -------------------------
# Ensure required files exist (create templates if missing)
# -------------------------
mkdir -p .github/workflows .github/hooks .github/ISSUE_TEMPLATE tests .well-known
write_if_missing() {
  local file="$1"; local content="$2"
  if [ ! -e "$file" ]; then
    echo "Creating missing file: $file"
    mkdir -p "$(dirname "$file")"
    cat > "$file" <<'EOF'
'"$content"'
EOF
  fi
}

# Instead of embedding massive templates with here-doc quoting complexity,
# we will create necessary files from the previous conversation content.
# For brevity in this script, write concise placeholders if full files exist already.
# If you want the full originals, run the companion script 'populate_templates_from_source.sh'
# (I'll create essential minimal templates here).

# Minimal apps.json (if missing)
if [ ! -f apps.json ]; then
  cat > apps.json <<'JSON'
[
  {"id":"farhero","name":"FarHero","url":"https://farhero.xyz","tags":["gaming","3d","onchain","gasless"],"category":"Trending"},
  {"id":"clanker","name":"Clanker","url":"https://clanker.app","tags":["launcher","token","viral"],"category":"Trending"}
]
JSON
  echo "apps.json created (minimal)."
fi

# Insert dynamic loader (if index.html already exists we will append loader if not present)
if [ -f index.html ] && ! grep -q "index.dynamic.load.js" index.html; then
  echo "Appending dynamic loader include to index.html"
  cat >> index.html <<'HTML'
<!-- dynamic loader -->
<script src="/index.dynamic.load.js" defer></script>
HTML
fi

# Write index.dynamic.load.js if missing
if [ ! -f index.dynamic.load.js ]; then
  cat > index.dynamic.load.js <<'JSD'
(async function(){
  async function fetchApps(){
    try{
      const resp = await fetch('/apps.json', {cache:'no-store'});
      if(!resp.ok) throw new Error('apps.json not found');
      return await resp.json();
    }catch(e){
      console.warn('apps.json load failed', e);
      return null;
    }
  }
  function makeCard(app){
    const li = document.createElement('li');
    const name = document.createElement('div'); name.className='app-name'; name.textContent = app.name;
    const tags = document.createElement('div'); tags.className='tags'; tags.textContent = (app.tags||[]).join(' • ');
    const buttons = document.createElement('div'); buttons.className='buttons';
    const a = document.createElement('a'); a.href = app.url; a.target='_blank'; a.textContent='Open';
    const b = document.createElement('button'); b.dataset.app = app.id; b.textContent='Mark Visited';
    buttons.appendChild(a); buttons.appendChild(b);
    li.appendChild(name); li.appendChild(tags); li.appendChild(buttons);
    return li;
  }
  const apps = await fetchApps();
  if(!apps) return;
  document.querySelectorAll('section').forEach(s => s.remove());
  const categories = apps.reduce((m,a)=>{ (m[a.category]=m[a.category]||[]).push(a); return m; },{});
  for(const cat in categories){
    const sec=document.createElement('section');
    const h=document.createElement('h2'); h.textContent=cat; sec.appendChild(h);
    const ul=document.createElement('ul');
    categories[cat].forEach(app=>ul.appendChild(makeCard(app)));
    sec.appendChild(ul); document.body.appendChild(sec);
  }
  document.dispatchEvent(new Event('DOMContentLoaded'));
})();
JSD
  echo "index.dynamic.load.js created."
fi

# sw.js (simple cache-first) if missing
if [ ! -f sw.js ]; then
  cat > sw.js <<'SW'
const CACHE_NAME = 'ngl-matrix-v2026-v2';
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/matrix-preview.png', '/apps.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch', e => {
 if(e.request.method!=='GET') return;
 if(e.request.mode==='navigate'){ e.respondWith(fetch(e.request).catch(()=>caches.match('/index.html'))); return; }
 e.respondWith(caches.match(e.request).then(c=>c || fetch(e.request).then(r=>{ if(r && r.ok) caches.open(CACHE_NAME).then(cache=>cache.put(e.request,r.clone())); return r; }).catch(()=>caches.match('/index.html'))));
});
SW
  echo "sw.js created."
fi

# minimal manifest if missing
if [ ! -f manifest.webmanifest ]; then
  cat > manifest.webmanifest <<'MNF'
{
  "name": "No_Gas_Labs Matrix",
  "short_name": "NGL Matrix",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#00ff99",
  "icons":[{"src":"/matrix-preview.png","sizes":"1024x1024","type":"image/png","purpose":"any maskable"}]
}
MNF
  echo "manifest.webmanifest created."
fi

# minimal farcaster.json
if [ ! -f .well-known/farcaster.json ]; then
  cat > .well-known/farcaster.json <<'FAR'
{
  "frame": {"version":"vNext","name":"No_Gas_Labs Matrix","homeUrl":"https://YOUR_DOMAIN"},
  "version":"2026-01",
  "keywords":["farcaster","base","mini-apps","matrix"]
}
FAR
  echo ".well-known/farcaster.json created (edit YOUR_DOMAIN)."
fi

# minimal ISSUE_TEMPLATE
if [ ! -f .github/ISSUE_TEMPLATE/add-app.md ]; then
  mkdir -p .github/ISSUE_TEMPLATE
  cat > .github/ISSUE_TEMPLATE/add-app.md <<'MD'
---
name: Add Mini-App to Matrix
about: Submit a new gasless mini-app
title: '[APP] Add: '
labels: submission,new-app
---

**Name:**  
**URL:**  
**Category:**  
```json
{
  "id":"myapp",
  "name":"My App",
  "url":"https://example.com",
  "tags":["gasless","game"],
  "category":"Gaming"
}