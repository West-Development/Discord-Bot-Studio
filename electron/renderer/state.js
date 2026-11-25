// ================= CUSTOM STUDIO TITLE BAR =================
(function () {
  function mountTitleBar() {
    if (document.getElementById('studio-titlebar') || !document.body) return;
    const bar = document.createElement('div');
    bar.id = 'studio-titlebar';
    bar.innerHTML = `
      <div class="tb-left">
        <span>Discord Bot Studio</span>
      </div>
      <div class="tb-controls">
        <button id="tb-min" class="tb-btn" title="Minimize">—</button>
        <button id="tb-max" class="tb-btn" title="Maximize">☐</button>
        <button id="tb-close" class="tb-btn tb-close" title="Close">✕</button>
      </div>
    `;
    document.body.prepend(bar);

    const ipc = window.ipcRenderer || require('electron').ipcRenderer;
    document.getElementById('tb-min').onclick = () => ipc.send('win-minimize');
    document.getElementById('tb-max').onclick = () => ipc.send('win-maximize');
    document.getElementById('tb-close').onclick = () => ipc.send('win-close');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountTitleBar);
  } else {
    mountTitleBar();
  }
})();

// ================= STUDIO CHARCOAL POPUP DIALOGS (REPLACES WHITE WINDOWS POPUPS) =================
(function () {
  function getDialogOverlay() {
    let overlay = document.getElementById('studio-dialog-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'studio-dialog-overlay';
    overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(10,10,12,0.78);z-index:999999;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
    overlay.innerHTML = `
      <div style="background:#28282b;border:1px solid #484850;border-radius:8px;box-shadow:0 20px 48px rgba(0,0,0,0.65);width:440px;max-width:92vw;padding:20px;color:#ececef;display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #383840;padding-bottom:10px;">
          <span id="studio-dialog-title" style="font-size:14px;font-weight:700;color:#ffffff;">Discord Bot Studio</span>
          <button id="studio-dialog-x" style="background:transparent!important;border:none!important;color:#9a9aa2!important;font-size:18px;padding:0 4px;cursor:pointer;">×</button>
        </div>
        <div id="studio-dialog-msg" style="font-size:13px;line-height:1.55;color:#d4d4d8;white-space:pre-wrap;"></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:10px;border-top:1px solid #383840;">
          <button id="studio-dialog-cancel" style="background:#3a3a42!important;border:1px solid #52525c!important;color:#ececef!important;padding:7px 14px;border-radius:5px;cursor:pointer;">Cancel</button>
          <button id="studio-dialog-ok" style="background:#237a3b!important;border:1px solid #2ea04d!important;color:#ffffff!important;padding:7px 16px;border-radius:5px;cursor:pointer;">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  window.studioConfirm = function (message, title = 'Confirm', okText = 'Confirm', isDanger = false) {
    return new Promise((resolve) => {
      const overlay = getDialogOverlay();
      document.getElementById('studio-dialog-title').textContent = title;
      document.getElementById('studio-dialog-msg').textContent = message;
      const cancelBtn = document.getElementById('studio-dialog-cancel');
      const okBtn = document.getElementById('studio-dialog-ok');
      const xBtn = document.getElementById('studio-dialog-x');

      cancelBtn.style.display = 'inline-block';
      okBtn.textContent = okText;
      okBtn.style.cssText = isDanger
        ? 'background:#a82424!important;border:1px solid #c93030!important;color:#ffffff!important;padding:7px 16px;border-radius:5px;cursor:pointer;'
        : 'background:#237a3b!important;border:1px solid #2ea04d!important;color:#ffffff!important;padding:7px 16px;border-radius:5px;cursor:pointer;';

      const done = (result) => {
        overlay.style.display = 'none';
        resolve(result);
      };
      okBtn.onclick = () => done(true);
      cancelBtn.onclick = () => done(false);
      xBtn.onclick = () => done(false);
      overlay.style.display = 'flex';
      okBtn.focus();
    });
  };

  window.studioAlert = function (message, title = 'Discord Bot Studio') {
    return new Promise((resolve) => {
      const overlay = getDialogOverlay();
      document.getElementById('studio-dialog-title').textContent = title;
      document.getElementById('studio-dialog-msg').textContent = message;
      const cancelBtn = document.getElementById('studio-dialog-cancel');
      const okBtn = document.getElementById('studio-dialog-ok');
      const xBtn = document.getElementById('studio-dialog-x');

      cancelBtn.style.display = 'none';
      okBtn.textContent = 'OK';
      okBtn.style.cssText = 'background:#45454d!important;border:1px solid #63636e!important;color:#ffffff!important;padding:7px 18px;border-radius:5px;cursor:pointer;';

      const done = () => {
        overlay.style.display = 'none';
        resolve();
      };
      okBtn.onclick = done;
      xBtn.onclick = done;
      overlay.style.display = 'flex';
      okBtn.focus();
    });
  };

  window.alert = (msg) => { window.studioAlert(String(msg || '')); };
})();


window.ipcRenderer = window.ipcRenderer || require('electron').ipcRenderer;


window.appState = {
  botsData: {},
  currentBot: null,
  commands: {},
  selectedCommand: null,
  selectedActionIdx: null,
  actionDefinitions: {},
  botLogs: {}
};

// Switch tab logic
function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  
  const pane = document.getElementById(`tab-${tabId}`);
  if (pane) pane.style.display = 'flex';
  
  const navBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (navBtn) navBtn.classList.add('active');

  if (tabId === 'settings' && window.loadBotSettings) {
    window.loadBotSettings();
  }
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn') || e.target.closest('.nav-item');
  if (!btn) return;
  const tabId = btn.dataset.tab || btn.getAttribute('data-tab');
  if (!tabId) return;

  document.querySelectorAll('.tab-pane').forEach(el => {
    el.style.display = 'none';
    el.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn, .nav-item').forEach(el => {
    el.classList.remove('active');
    el.style.background = '#212429';
    el.style.color = '#94a3b8';
    el.style.borderTop = 'none';
    el.style.borderBottom = '2px solid transparent';
  });

  const pane = document.getElementById(`tab-${tabId}`);
  if (pane) {
    pane.style.display = 'flex';
    pane.classList.add('active');
  }

  const navBtns = document.querySelectorAll(`.tab-btn[data-tab="${tabId}"], .nav-item[data-tab="${tabId}"]`);
  navBtns.forEach(el => {
    el.classList.add('active');
    el.style.background = '#181a1d';
    el.style.color = '#ffffff';
    el.style.borderTop = 'none';
    el.style.borderBottom = '2px solid #2b82d9';
  });

  if ((tabId === 'settings' || tabId === 'database') && window.loadBotSettings) {
    window.loadBotSettings();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.nav-item[data-tab="commands"]')?.click();
});


