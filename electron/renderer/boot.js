// ================= STUDIO BOOT SPLASH & FULLSCREEN LAUNCHER =================
(function () {
  function runStudioBoot() {
    if (document.getElementById('studio-boot-splash') || !document.body) return;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes studioPulse {
        0%, 100% { transform: scale(1); opacity: 0.92; }
        50% { transform: scale(1.05); opacity: 1; }
      }
      @keyframes studioLoadBar {
        0% { width: 0%; }
        45% { width: 62%; }
        85% { width: 92%; }
        100% { width: 100%; }
      }
      #studio-boot-splash {
        position: fixed;
        top: 36px;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at center, #29292f 0%, #161618 85%);
        z-index: 99998;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 18px;
        transition: opacity 0.45s ease, transform 0.45s ease;
      }
      #studio-boot-splash.boot-fade-out {
        opacity: 0;
        transform: scale(1.02);
        pointer-events: none;
      }
      .studio-boot-logo {
        width: 82px;
        height: 82px;
        border-radius: 18px;
        background: #232328;
        border: 1px solid #44444f;
        padding: 10px;
        box-shadow: 0 18px 45px rgba(0, 0, 0, 0.65);
        animation: studioPulse 1.8s ease-in-out infinite;
        object-fit: contain;
      }
      .studio-boot-title {
        font-size: 22px;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: 0.03em;
      }
      .studio-boot-sub {
        font-size: 12px;
        color: #9a9aa2;
        margin-top: -10px;
      }
      .studio-boot-track {
        width: 260px;
        height: 4px;
        background: #27272c;
        border-radius: 999px;
        overflow: hidden;
        border: 1px solid #383842;
      }
      .studio-boot-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #52525b, #e4e4e7);
        border-radius: 999px;
        animation: studioLoadBar 1.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
    `;
    document.head.appendChild(style);

    const splash = document.createElement('div');
    splash.id = 'studio-boot-splash';
    splash.innerHTML = `
      <img class="studio-boot-logo" src="icon.png" onerror="this.style.display='none'" />
      <div class="studio-boot-title">Discord Bot Studio</div>
      <div id="studio-boot-status" class="studio-boot-sub">Initializing workspace &amp; blueprints...</div>
      <div class="studio-boot-track"><div class="studio-boot-fill"></div></div>
    `;
    document.body.appendChild(splash);

    setTimeout(() => {
      const st = document.getElementById('studio-boot-status');
      if (st) st.textContent = 'Loading bot projects...';
    }, 650);

    setTimeout(() => {
      splash.classList.add('boot-fade-out');
      setTimeout(() => splash.remove(), 480);
    }, 1550);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runStudioBoot);
  } else {
    runStudioBoot();
  }
})();
