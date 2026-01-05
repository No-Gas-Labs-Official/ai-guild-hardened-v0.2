// Privacy-first: only send when user opts in
(function(){
  const key = 'ngl_scout_analytics';
  function record(appId){
    const data = JSON.parse(localStorage.getItem(key)||'{}');
    const day = new Date().toISOString().slice(0,10);
    data[day] = data[day] || {};
    data[day][appId] = (data[day][appId]||0) + 1;
    localStorage.setItem(key, JSON.stringify(data));
  }
  // Call record(appId) when Mark Visited clicked (integrate into existing handler)
  // To send: call sendAnalytics() only if user opted in
  async function sendAnalytics(){
    const consent = localStorage.getItem('ngl_analytics_consent');
    if (consent !== 'yes') return;
    const payload = { site:"nogas-matrix-2026", data: JSON.parse(localStorage.getItem(key)||'{}') };
    try{ await fetch('https://YOUR_SERVERLESS_ENDPOINT/collect', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}); }
    catch(e){ /* ignore */ }
  }
  window.NGL = window.NGL || {};
  window.NGL.recordVisit = record;
  window.NGL.sendAnalytics = sendAnalytics;
})();