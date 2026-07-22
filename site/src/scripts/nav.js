export function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const inner = document.querySelector('.sidebar-inner');

  // Mobile toggle
  toggle?.addEventListener('click', () => {
    inner?.classList.toggle('open');
  });

  // Close on link click (mobile)
  inner?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => inner.classList.remove('open'));
  });

  // Live Toronto clock
  const clockEl = document.getElementById('toronto-clock');
  if (clockEl) {
    function updateClock() {
      const now = new Date();
      clockEl.textContent = now.toLocaleString('en-US', {
        timeZone: 'America/Toronto',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    }
    updateClock();
    setInterval(updateClock, 1000);
  }

  // Background toggle (dev testing)
  const bgLayer = document.getElementById('bg-layer');
  const bgToggle = document.getElementById('bg-toggle');
  if (bgLayer && bgToggle) {
    const currentTime = bgLayer.dataset.time;
    // Mark current as active
    const activeBtn = bgToggle.querySelector(`[data-bg="${currentTime}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const assetBlend = bgLayer.querySelector('.asset-blend');

    bgToggle.querySelectorAll('.bg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.bg;
        const capMode = mode.charAt(0).toUpperCase() + mode.slice(1);
        const gradient = bgLayer.dataset[`gradient${capMode}`];
        if (gradient) {
          bgLayer.style.background = gradient;
          bgToggle.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
        // Update asset blend gradient and blend mode
        if (assetBlend) {
          const blendGrad = assetBlend.dataset[`blend${capMode}`];
          if (blendGrad) assetBlend.style.background = blendGrad;
          assetBlend.style.mixBlendMode = mode === 'night' ? 'hard-light' : 'overlay';
        }
      });
    });
  }
}
