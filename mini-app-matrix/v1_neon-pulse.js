// Neon ritual pulse for No_Gas_Labs™ Matrix
// Safe, non-blocking visual + subtle audio feedback.
// Usage: triggerNeonPulse('AlfaFrens');

(function (global) {
  function triggerNeonPulse(appName) {
    try {
      // Console ritual (neon log)
      console.log(
        `%c ⚡️ RITUAL RECOGNIZED: ${appName} has been absorbed into the Matrix.`,
        "color: #00ff99; font-weight: 700; text-shadow: 0 0 8px rgba(0,255,153,0.45)"
      );
    } catch (e) {
      // ignore console failures
    }

    try {
      // Visual flash overlay (non-interactive)
      const overlay = document.createElement("div");
      overlay.setAttribute("aria-hidden", "true");
      overlay.style.cssText = [
        "position:fixed",
        "inset:0",
        "width:100%",
        "height:100%",
        "background:#00ff99",
        "opacity:0.08",
        "pointer-events:none",
        "z-index:9999",
        "mix-blend-mode:screen",
        "backdrop-filter: blur(2px)",
        "transition:opacity 520ms ease"
      ].join(";");
      document.body.appendChild(overlay);

      // Slightly ramp and fade quickly for a pulse
      requestAnimationFrame(() => {
        overlay.style.opacity = "0.08";
      });
      setTimeout(() => {
        overlay.style.opacity = "0";
      }, 120);
      setTimeout(() => {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 640);
    } catch (e) {
      // visual fallback — ignore
    }

    try {
      // Very short, soft audio cue (subtle — avoids startling)
      // If audio is blocked by autoplay policy, this will fail silently.
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        // gentle sine-ish tone
        o.type = "sine";
        o.frequency.value = 880; // Hz
        g.gain.value = 0.006; // very low volume
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        // ramp down quickly for a soft click
        setTimeout(() => {
          try { o.stop(); } catch (e) {}
          try { ctx.close(); } catch (e) {}
        }, 80);
      }
    } catch (e) {
      // ignore audio failures
    }
  }

  // Expose globally: window.triggerNeonPulse
  try {
    global.triggerNeonPulse = triggerNeonPulse;
  } catch (e) {
    // in restrictive environments, do nothing
  }
})(typeof window !== "undefined" ? window : this);