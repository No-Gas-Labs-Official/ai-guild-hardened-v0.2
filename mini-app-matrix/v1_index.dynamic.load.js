/* Insert this script into index.html (defer or at end of body)
   It fetches /apps.json and renders dynamic lists, then re-initializes page bindings. */
(async function(){
  async function fetchApps(){
    try{
      const resp = await fetch('/apps.json', {cache:'no-store'});
      if(!resp.ok) throw new Error('apps.json not found');
      return await resp.json();
    }catch(e){
      console.warn('apps.json load failed, falling back to inline HTML', e);
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
  const bodySections = document.querySelectorAll('section');
  bodySections.forEach(s => s.remove()); // remove originals
  const categories = apps.reduce((m,a)=>{ (m[a.category] = m[a.category]||[]).push(a); return m; }, {});
  for(const cat of Object.keys(categories)){
    const sec = document.createElement('section');
    const h = document.createElement('h2'); h.textContent = cat;
    sec.appendChild(h);
    const ul = document.createElement('ul');
    categories[cat].forEach(app => ul.appendChild(makeCard(app)));
    sec.appendChild(ul);
    document.body.appendChild(sec);
  }
  // Re-run page init if needed: dispatch DOMContentLoaded to run existing listeners
  document.dispatchEvent(new Event('DOMContentLoaded'));
})();