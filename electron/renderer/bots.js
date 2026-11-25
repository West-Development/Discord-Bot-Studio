// Removed duplicate ipcRenderer declaration

function updateDbSwitchVisual(enabled) {
  const track = document.getElementById('db-toggle-track');
  const knob = document.getElementById('db-toggle-knob');
  const text = document.getElementById('db-toggle-text');
  const fields = document.getElementById('db-fields-container');
  if (track) track.style.background = enabled ? '#2b82d9' : '#343942';
  if (knob) knob.style.left = enabled ? '23px' : '3px';
  if (text) {
    text.textContent = enabled ? 'Enabled' : 'Off';
    text.style.color = enabled ? '#4ade80' : '#94a3b8';
  }
  if (fields) {
    fields.style.opacity = enabled ? '1' : '0.5';
    fields.style.pointerEvents = enabled ? 'auto' : 'none';
  }
}

window.loadBotSettings = async function() {
  if (!window.appState.currentBot) return;
  const cfg = await ipcRenderer.invoke('get-bot-config', window.appState.currentBot);
  if (document.getElementById('bot-token')) document.getElementById('bot-token').value = cfg.token || '';
  if (document.getElementById('bot-client-id')) document.getElementById('bot-client-id').value = cfg.clientId || '';
  if (document.getElementById('bot-client-secret')) document.getElementById('bot-client-secret').value = cfg.clientSecret || '';
  if (document.getElementById('cfg-guildId')) document.getElementById('cfg-guildId').value = cfg.guildId || '';

  const botMeta = (window.appState.botsData || {})[window.appState.currentBot] || {};
  if (document.getElementById('edit-bot-name')) document.getElementById('edit-bot-name').value = botMeta.name || window.appState.currentBot;
  if (document.getElementById('edit-bot-desc')) document.getElementById('edit-bot-desc').value = botMeta.description || '';
  const previewEl = document.getElementById('edit-bot-icon-preview');
  if (previewEl) {
    if (botMeta.icon && botMeta.icon !== '🤖') {
      previewEl.innerHTML = `<img src="../Projects/${window.appState.currentBot}/${botMeta.icon}?t=${Date.now()}" style="width:100%;height:100%;object-fit:cover;" />`;
    } else {
      previewEl.textContent = '🤖';
    }
  }

  const db = cfg.database || {};
  const enabled = Boolean(db.enabled);
  const dbCheck = document.getElementById('db-enabled');
  if (dbCheck) dbCheck.checked = enabled;
  updateDbSwitchVisual(enabled);

  if (document.getElementById('db-type')) document.getElementById('db-type').value = db.type || 'json';
  if (document.getElementById('db-host')) document.getElementById('db-host').value = db.host || 'localhost';
  if (document.getElementById('db-port')) document.getElementById('db-port').value = db.port || 3306;
  if (document.getElementById('db-name')) document.getElementById('db-name').value = db.name || '';
  if (document.getElementById('db-user')) document.getElementById('db-user').value = db.user || '';
  if (document.getElementById('db-password')) document.getElementById('db-password').value = db.password || '';
  if (document.getElementById('db-uri')) document.getElementById('db-uri').value = db.uri || '';
};

document.getElementById('db-enabled')?.addEventListener('change', (e) => {
  updateDbSwitchVisual(e.target.checked);
});

document.getElementById('save-database-btn')?.addEventListener('click', async () => {
  if (!window.appState.currentBot) return alert('Select a bot first!');
  const database = {
    enabled: Boolean(document.getElementById('db-enabled')?.checked),
    type: document.getElementById('db-type')?.value || 'json',
    host: document.getElementById('db-host')?.value.trim() || 'localhost',
    port: Number(document.getElementById('db-port')?.value) || 3306,
    name: document.getElementById('db-name')?.value.trim() || '',
    user: document.getElementById('db-user')?.value.trim() || '',
    password: document.getElementById('db-password')?.value || '',
    uri: document.getElementById('db-uri')?.value.trim() || ''
  };
  const res = await ipcRenderer.invoke('save-bot-config', {
    folderName: window.appState.currentBot,
    config: { database }
  });
  if (res && res.success) {
    alert('Database config saved to config/bot.js!');
  } else {
    alert('Failed to save database config: ' + (res?.error || 'Unknown error'));
  }
});

document.getElementById('save-settings-btn').addEventListener('click', async () => {
  const config = {
    token: document.getElementById('bot-token').value,
    clientId: document.getElementById('bot-client-id').value,
    clientSecret: document.getElementById('bot-client-secret').value,
    guildId: document.getElementById('cfg-guildId').value
  };
  await ipcRenderer.invoke('save-bot-config', { folderName: window.appState.currentBot, config });
  alert('Settings saved!');
});

async function loadBots() {
  const bots = await ipcRenderer.invoke('get-bots');
  window.appState.botsData = bots;
  const select = document.getElementById('bot-selector');
  select.innerHTML = '';
  
  const keys = Object.keys(bots);
  if (keys.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No Bots Found (Create One)';
    select.appendChild(opt);
    window.appState.currentBot = null;
  } else {
    keys.forEach(key => {
      const bot = bots[key];
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = bot.name || key;
      select.appendChild(opt);
    });
    if (!window.appState.currentBot || !bots[window.appState.currentBot]) {
      window.appState.currentBot = keys[0];
    }
    select.value = window.appState.currentBot;
  }

  if (window.loadCommands && window.appState.currentBot) {
    window.loadCommands();
  }
  if (window.loadEvents && window.appState.currentBot) {
    window.loadEvents();
  }
  if (typeof window.renderHomeBotGrid === 'function') {
    window.renderHomeBotGrid();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Move/Create Delete Bot button visibly inside the Bot Settings button row
  const topImportBtn = document.getElementById('header-import-bot-btn');
  if (topImportBtn) topImportBtn.style.display = 'none';

  const settingsBtnRow = document.getElementById('import-bot-btn')?.parentElement
    || document.getElementById('export-bot-btn')?.parentElement
    || document.getElementById('save-settings-btn')?.parentElement;

  let delBtnEl = document.getElementById('delete-bot-btn');
  if (!delBtnEl) {
    delBtnEl = document.createElement('button');
    delBtnEl.id = 'delete-bot-btn';
    delBtnEl.className = 'btn btn-danger';
    delBtnEl.textContent = 'Delete Bot';
  }
  if (settingsBtnRow) {
    delBtnEl.style.display = 'inline-block';
    delBtnEl.style.marginLeft = '8px';
    settingsBtnRow.appendChild(delBtnEl);
  }

  // 2. Ensure Back Arrow button exists and is wired via global click delegation
  const selectEl = document.getElementById('bot-selector');
  if (selectEl && selectEl.parentElement && !document.getElementById('back-to-menu-btn')) {
    const backBtn = document.createElement('button');
    backBtn.id = 'back-to-menu-btn';
    backBtn.title = 'Back to Main Menu';
    backBtn.innerHTML = '←';
    backBtn.style.cssText = 'padding:5px 10px;font-size:14px;font-weight:700;margin-right:8px;';
    selectEl.parentElement.insertBefore(backBtn, selectEl);
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#back-to-menu-btn')) {
      e.preventDefault();
      window.showStudioHomeScreen('menu');
    }
  });

  // 3. Build Sleek 2-Column Studio Main Menu & Bot Launcher
  const homeScreen = document.createElement('div');
  homeScreen.id = 'studio-home-screen';
  homeScreen.style.cssText = 'position:fixed;top:36px;left:0;right:0;bottom:0;background:radial-gradient(circle at top left, #2a2a30 0%, #1c1c1f 65%);z-index:9000;display:flex;align-items:center;justify-content:center;padding:28px;';
  homeScreen.innerHTML = `
    <div style="width:900px;max-width:95vw;height:520px;max-height:86vh;background:#242428;border:1px solid #3f3f48;border-radius:12px;box-shadow:0 28px 64px rgba(0,0,0,0.7);display:flex;overflow:hidden;">
      <!-- Left Branding & Navigation Rail -->
      <div style="width:290px;flex-shrink:0;background:#1c1c20;border-right:1px solid #33333a;padding:28px 22px;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="icon.png" style="width:48px;height:48px;border-radius:10px;object-fit:contain;background:#28282e;padding:4px;border:1px solid #3e3e48;" onerror="this.style.display='none'" />
            <div>
              <div style="font-size:17px;font-weight:800;color:#ffffff;line-height:1.2;">Discord Bot Studio</div>
              <div style="font-size:11px;color:#8e8e98;margin-top:2px;">v1.0 • Studio Edition</div>
            </div>
          </div>
          <p style="font-size:12px;line-height:1.5;color:#9a9aa2;margin:6px 0 10px 0;">
            Build, test, and export full-featured Discord bots visually with zero boilerplate.
          </p>
          <button id="home-new-bot-btn" class="btn-start" style="width:100%;padding:11px 14px;font-size:13px;text-align:left;display:flex;align-items:center;justify-content:space-between;">
            <span>+ Create New Bot</span><span>→</span>
          </button>
          <button id="menu-import-bot-btn" style="width:100%;padding:10px 14px;font-size:13px;text-align:left;display:flex;align-items:center;justify-content:space-between;">
            <span>Import Bot (.zip)</span><span>↓</span>
          </button>
          <button id="menu-credits-btn" style="width:100%;padding:10px 14px;font-size:13px;text-align:left;display:flex;align-items:center;justify-content:space-between;">
            <span>Credits &amp; Info</span><span>ⓘ</span>
          </button>
        </div>

        <button id="menu-quit-btn" class="btn-danger" style="width:100%;padding:10px 14px;font-size:12px;">
          Close Application
        </button>
      </div>

      <!-- Right Bot Projects Launcher -->
      <div style="flex:1;padding:24px 26px;display:flex;flex-direction:column;min-width:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #33333a;padding-bottom:14px;margin-bottom:16px;">
          <div>
            <div style="font-size:16px;font-weight:700;color:#ffffff;">Your Bot Projects</div>
            <div style="font-size:12px;color:#8e8e98;margin-top:2px;">Click any bot below to open its workspace</div>
          </div>
          <span id="home-bot-count" style="font-size:11px;font-weight:700;color:#a1a1aa;background:#1c1c20;border:1px solid #383842;padding:4px 10px;border-radius:999px;">0 Bots</span>
        </div>
        <div id="home-bots-grid" style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:12px;align-content:start;padding-right:4px;"></div>
      </div>
    </div>
  `;
  document.body.appendChild(homeScreen);

  window.showStudioHomeScreen = function () {
    homeScreen.style.display = 'flex';
    if (typeof window.renderHomeBotGrid === 'function') window.renderHomeBotGrid();
  };

  window.enterBotWorkspace = function (folderName) {
    window.appState.currentBot = folderName;
    const sel = document.getElementById('bot-selector');
    if (sel) {
      sel.value = folderName;
      sel.dispatchEvent(new Event('change'));
    }
    homeScreen.style.display = 'none';
  };

  window.renderHomeBotGrid = function () {
    const grid = document.getElementById('home-bots-grid');
    const countBadge = document.getElementById('home-bot-count');
    if (!grid) return;
    const bots = window.appState.botsData || {};
    const keys = Object.keys(bots);
    if (countBadge) countBadge.textContent = `${keys.length} Bot${keys.length === 1 ? '' : 's'}`;
    if (keys.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;background:#1d1d21;border:1px dashed #3e3e48;border-radius:8px;text-align:center;padding:48px 20px;color:#9a9aa2;">
          <div style="font-size:28px;margin-bottom:8px;">🤖</div>
          <div style="font-size:14px;font-weight:700;color:#ececef;margin-bottom:4px;">No Bot Projects Yet</div>
          <div style="font-size:12px;">Click <b>+ Create New Bot</b> on the left to build your first bot!</div>
        </div>
      `;
      return;
    }
    grid.innerHTML = keys.map((key) => {
      const b = bots[key] || {};
      const iconHtml = (b.icon && b.icon !== '🤖')
        ? `<img src="../Projects/${key}/${b.icon}?t=${Date.now()}" style="width:46px;height:46px;border-radius:10px;object-fit:cover;flex-shrink:0;border:1px solid #3f3f48;" />`
        : `<div style="width:46px;height:46px;border-radius:10px;background:#18181b;border:1px solid #383842;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">🤖</div>`;
      return `
        <div onclick="window.enterBotWorkspace('${key}')" style="background:#1c1c20;border:1px solid #36363f;border-radius:9px;padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:transform 0.1s,border-color 0.12s,background 0.12s;" onmouseover="this.style.background='#29292f';this.style.borderColor='#6b6b76'" onmouseout="this.style.background='#1c1c20';this.style.borderColor='#36363f'">
          ${iconHtml}
          <div style="min-width:0;flex:1;">
            <div style="font-size:14px;font-weight:700;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.name || key}</div>
            <div style="font-size:11px;color:#8e8e98;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px;">${b.description || key}</div>
          </div>
          <span style="font-size:13px;color:#a1a1aa;font-weight:700;">→</span>
        </div>
      `;
    }).join('');
  };

  document.getElementById('home-new-bot-btn').onclick = () => document.getElementById('create-bot-btn')?.click();
  document.getElementById('menu-import-bot-btn').onclick = () => document.getElementById('import-bot-btn')?.click();
  document.getElementById('menu-credits-btn').onclick = () => {
    window.studioAlert('Discord Bot Studio\n\nDeveloped by WestDevs\nBuilt with Electron & discord.js v14.\nCreated for effortless visual Discord bot development.', 'Credits & Info');
  };
  document.getElementById('menu-quit-btn').onclick = () => {
    const ipc = window.ipcRenderer || require('electron').ipcRenderer;
    ipc.send('win-close');
  };

  loadBots();

  const select = document.getElementById('bot-selector');
  if (select) {
    select.addEventListener('change', async (e) => {
      const folderName = e.target.value;
      window.appState.currentBot = folderName;
      
      const cmds = await window.ipcRenderer.invoke('get-commands', folderName) || {};
      window.appState.commands = cmds;
      window.appState.selectedCommand = null;
      
      const editor = document.getElementById('command-editor');
      const emptyState = document.getElementById('command-empty-state');
      if (editor) editor.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      
      if (window.renderCommandList) window.renderCommandList();

      if (window.loadCommands && window.appState.currentBot) {
        window.loadCommands();
      }
      if (window.loadEvents && window.appState.currentBot) {
        window.loadEvents();
      }
    });
  }

  // Create Bot Modal
  const createModal = document.getElementById('create-bot-modal');
  const createBtn = document.getElementById('create-bot-btn');
  const cancelCreate = document.getElementById('cancel-create-bot');
  const confirmCreate = document.getElementById('confirm-create-bot');
  const botIconFile = document.getElementById('bot-icon-file');
  let selectedIconBase64 = null;
  let selectedIconExt = null;

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      if (createModal) createModal.style.display = 'flex';
    });
  }
  if (cancelCreate) {
    cancelCreate.addEventListener('click', () => {
      if (createModal) createModal.style.display = 'none';
    });
  }

  if (botIconFile) {
    botIconFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        selectedIconExt = file.name.split('.').pop();
        const reader = new FileReader();
        reader.onload = function(evt) {
          const arr = evt.target.result.split(',');
          selectedIconBase64 = arr[1];
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (confirmCreate) {
    confirmCreate.addEventListener('click', async () => {
      const name = document.getElementById('new-bot-name').value.trim();
      const desc = document.getElementById('new-bot-desc').value.trim();
      if (!name) return alert('Please enter a bot name.');

      const res = await ipcRenderer.invoke('create-bot', {
        name,
        description: desc,
        iconBase64: selectedIconBase64,
        iconExt: selectedIconExt
      });

      if (res.success) {
        if (createModal) createModal.style.display = 'none';
        window.appState.currentBot = res.folderName;
        await loadBots();
      } else {
        alert('Failed to create bot: ' + res.error);
      }
    });
  }

  // Import Bot Buttons
  document.getElementById('import-bot-btn')?.addEventListener('click', async () => {
      const res = await window.ipcRenderer.invoke('import-bot');
      if (res && res.success && res.folderName) {
          await loadBots();
          const select = document.getElementById('bot-switcher') || document.getElementById('bot-selector');
          if (select) {
              select.value = res.folderName;
              select.dispatchEvent(new Event('change'));
          }
          alert('Bot imported successfully!');
      }
  });

  document.getElementById('header-import-bot-btn')?.addEventListener('click', async () => {
      const res = await window.ipcRenderer.invoke('import-bot');
      if (res && res.success && res.folderName) {
          await loadBots();
          const select = document.getElementById('bot-switcher') || document.getElementById('bot-selector');
          if (select) {
              select.value = res.folderName;
              select.dispatchEvent(new Event('change'));
          }
          alert('Bot imported successfully!');
      }
  });

  // Export Bot Button
  document.getElementById('export-bot-btn')?.addEventListener('click', async () => {
      if (!window.appState.currentBot) return alert('Select a bot first!');
      const stripToken = await window.studioConfirm('Remove your private Bot Token before exporting so your friend can put in their own token?\n\nClick Strip Token (Recommended) or Keep Token.', 'Export Bot Package', 'Strip Token', false);
      const res = await window.ipcRenderer.invoke('export-bot', { folderName: window.appState.currentBot, stripToken });
      if (res.success) {
          alert('Bot exported! Your friend can import this .zip into DBM or unzip it and run "npm install && node index.js" to host it.');
      } else if (!res.canceled) {
          alert('Error exporting bot: ' + res.error);
      }
  });

  // Delete Bot (delegated so it works wherever the button is placed)
  document.addEventListener('click', async (e) => {
    if (!e.target.closest('#delete-bot-btn')) return;
    if (!window.appState.currentBot) return alert('Select a bot first!');
    if (!(await window.studioConfirm(`Are you sure you want to delete bot "${window.appState.currentBot}"?`, 'Delete Bot', 'Delete', true))) return;
    const res = await ipcRenderer.invoke('delete-bot', window.appState.currentBot);
    if (res.success) {
      window.appState.currentBot = null;
      await loadBots();
      if (typeof window.showStudioHomeScreen === 'function') window.showStudioHomeScreen();
    } else {
      alert('Failed to delete bot: ' + res.error);
    }
  });

  // Save Settings
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
      if (!window.appState.currentBot) return;
      const token = document.getElementById('bot-token').value.trim();
      const clientId = document.getElementById('bot-client-id').value.trim();
      const clientSecret = document.getElementById('bot-client-secret').value.trim();

      const res = await ipcRenderer.invoke('save-bot-config', {
        folderName: window.appState.currentBot,
        config: { token, clientId, clientSecret }
      });

      if (res.success) {
        alert('Bot settings saved successfully!');
      } else {
        alert('Failed to save settings: ' + res.error);
      }
    });
  }

  let editIconBase64 = null;
  let editIconExt = null;

  document.getElementById('edit-bot-icon-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    editIconExt = file.name.split('.').pop();
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      editIconBase64 = dataUrl.split(',')[1];
      const previewEl = document.getElementById('edit-bot-icon-preview');
      if (previewEl) {
        previewEl.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;" />`;
      }
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('save-bot-profile-btn')?.addEventListener('click', async () => {
    const folderName = window.appState.currentBot;
    if (!folderName) return alert('Select a bot first!');
    const name = document.getElementById('edit-bot-name')?.value.trim() || folderName;
    const description = document.getElementById('edit-bot-desc')?.value.trim() || '';

    const res = await ipcRenderer.invoke('update-bot-profile', {
      folderName,
      name,
      description,
      iconBase64: editIconBase64,
      iconExt: editIconExt
    });

    if (res && res.success) {
      editIconBase64 = null;
      editIconExt = null;
      if (res.newFolderName && res.newFolderName !== folderName) {
        if (window.appState.botLogs && window.appState.botLogs[folderName]) {
          window.appState.botLogs[res.newFolderName] = window.appState.botLogs[folderName];
          delete window.appState.botLogs[folderName];
        }
        window.appState.currentBot = res.newFolderName;
      }
      await loadBots();
      if (window.loadBotSettings) await window.loadBotSettings();
      const syncOnline = document.getElementById('sync-discord-profile')?.checked;
      const statusBadge = document.getElementById('bot-status-badge');
      const isOnline = statusBadge && statusBadge.textContent.toLowerCase().includes('online');
      if (syncOnline && isOnline) {
        document.getElementById('restart-bot-btn')?.click();
      }
      alert('Bot profile updated!');
    }
 else {
      alert('Failed to update bot profile: ' + (res?.error || 'Unknown error'));
    }
  });

  // Load bots on start
  loadBots();

  const updateBtn = document.getElementById('update-bot-base-btn');
  if (updateBtn && updateBtn.parentElement && !document.getElementById('save-all-blueprints-btn')) {
    const saveAllBtn = document.createElement('button');
    saveAllBtn.id = 'save-all-blueprints-btn';
    saveAllBtn.className = 'btn-start';
    saveAllBtn.textContent = 'Save & Compile All Commands & Events';
    saveAllBtn.style.marginLeft = '8px';
    updateBtn.parentElement.insertBefore(saveAllBtn, updateBtn.nextSibling);

    saveAllBtn.addEventListener('click', async () => {
      const folderName = window.appState?.currentBot || document.getElementById('bot-selector')?.value;
      if (!folderName) return alert('Select a bot first!');

      const origText = saveAllBtn.textContent;
      saveAllBtn.disabled = true;
      saveAllBtn.textContent = 'Compiling...';

      try {
        // Sync any unsaved edits currently open in the Command or Event editor first
        const cIdx = window.appState?.selectedCommand;
        if (cIdx !== null && cIdx >= 0 && Array.isArray(window.appState.commands) && window.appState.commands[cIdx]) {
          const cName = document.getElementById('cmd-name')?.value.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
          const cDesc = document.getElementById('cmd-description')?.value.trim();
          if (cName) window.appState.commands[cIdx].name = cName;
          if (cDesc !== undefined) window.appState.commands[cIdx].description = cDesc;
        }
        const eIdx = window.appState?.selectedEvent;
        if (eIdx !== null && eIdx >= 0 && Array.isArray(window.appState.events) && window.appState.events[eIdx]) {
          const eName = document.getElementById('event-name')?.value.trim();
          if (eName) window.appState.events[eIdx].name = eName;
        }

        const cmds = Array.isArray(window.appState?.commands) ? window.appState.commands : [];
        const evts = Array.isArray(window.appState?.events) ? window.appState.events : [];

        const cmdRes = await window.ipcRenderer.invoke('save-commands', { folderName, commands: cmds });
        const evtRes = await window.ipcRenderer.invoke('save-events', { folderName, events: evts });

        if ((cmdRes && !cmdRes.success) || (evtRes && !evtRes.success)) {
          alert('Error compiling: ' + (cmdRes?.error || evtRes?.error || 'Unknown error'));
          saveAllBtn.textContent = origText;
        } else {
          if (typeof window.renderCommandList === 'function') window.renderCommandList();
          if (typeof window.renderEventList === 'function') window.renderEventList();
          saveAllBtn.textContent = `Saved & Compiled ${cmds.length} Command(s) + ${evts.length} Event(s) ✓`;
          setTimeout(() => { saveAllBtn.textContent = origText; }, 2500);
        }
      } catch (err) {
        alert('Failed to save all: ' + err.message);
        saveAllBtn.textContent = origText;
      } finally {
        saveAllBtn.disabled = false;
      }
    });
  }
  if (updateBtn) {
    updateBtn.addEventListener('click', async () => {
      const folderName = window.appState?.currentBot || document.getElementById('bot-selector')?.value;
      if (!folderName) return alert('Select a bot first!');
      if (!(await window.studioConfirm(`Update core bot files from Base for "${folderName}"? (Your token, icon, and saved commands will be kept safe.)`, 'Update Bot Files', 'Update Files', false))) return;

      document.querySelector('.tab-btn[data-tab="console"]')?.click();
      const out = document.getElementById('console-output-full') || document.getElementById('console-output');
      if (out) {
        out.innerText += `[System] Updating bot files from Base for "${folderName}"...\n`;
        out.scrollTop = out.scrollHeight;
      }

      const res = await window.ipcRenderer.invoke('update-bot-from-base', folderName);
      if (res.success) {
        const logText = (res.logs || []).join('\n') + '\n';
        if (out) {
          out.innerText += logText;
          out.scrollTop = out.scrollHeight;
        }
        window.appState.botLogs[folderName] = (window.appState.botLogs[folderName] || '') + logText;
        const logBox = document.getElementById('update-base-log');
        if (logBox) {
          logBox.style.display = 'block';
          logBox.innerText = logText;
        }
      } else {
        if (out) out.innerText += `\nError: ${res.error}\n`;
        alert('Update failed: ' + res.error);
      }
    });
  }
});
