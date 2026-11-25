// Removed duplicate ipcRenderer declaration

let isRunning = false;

function setRunningUI(running) {
  const toggleBtn = document.getElementById('toggle-bot-btn');
  const statusEl = document.getElementById('bot-status') || document.getElementById('bot-status-badge');
  if (!toggleBtn) return;
  isRunning = running;
  toggleBtn.classList.toggle('btn-stop', running);
  toggleBtn.classList.toggle('is-running', running);
  if (running) {
    toggleBtn.textContent = 'Stop Bot';
    toggleBtn.style.background = '#a82424';
    if (statusEl) {
      statusEl.textContent = '● Online';
      statusEl.classList.add('online', 'status-running');
      statusEl.style.color = '#4ade80';
      statusEl.style.background = 'rgba(74, 222, 128, 0.16)';
      statusEl.style.borderColor = 'rgba(74, 222, 128, 0.35)';
    }
  } else {
    toggleBtn.textContent = 'Start Bot';
    toggleBtn.style.background = '#237a3b';
    if (statusEl) {
      statusEl.textContent = '● Offline';
      statusEl.classList.remove('online', 'status-running');
      statusEl.style.color = '#f87171';
      statusEl.style.background = 'rgba(244, 67, 54, 0.16)';
      statusEl.style.borderColor = 'rgba(244, 67, 54, 0.35)';
    }
  }
}

setRunningUI(false);

document.addEventListener('DOMContentLoaded', () => {
  setRunningUI(false);

  const toggleBtn = document.getElementById('toggle-bot-btn');
  const restartBtn = document.getElementById('restart-bot-btn');
  const statusBadge = document.getElementById('bot-status-badge');
  const consoleOutput = document.getElementById('console-output');
  const consoleInput = document.getElementById('console-input');

  async function stopAllOtherBots(exceptFolder) {
    const allKeys = Object.keys(window.appState?.botsData || {});
    for (const key of allKeys) {
      if (key !== exceptFolder) {
        await window.ipcRenderer.invoke('stop-bot', key).catch(() => null);
      }
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', async () => {
      const bot = window.appState.currentBot;
      if (!bot) return alert('No bot selected.');
      toggleBtn.disabled = true;
      try {
        if (isRunning) {
          await window.ipcRenderer.invoke('stop-bot', bot);
          setRunningUI(false);
        } else {
          await stopAllOtherBots(bot);
          await window.ipcRenderer.invoke('stop-bot', bot).catch(() => null);
          const res = await window.ipcRenderer.invoke('start-bot', bot);
          if (res && res.success) {
            setRunningUI(true);
          } else {
            setRunningUI(false);
            alert('Failed to start bot: ' + (res?.error || 'Unknown error'));
          }
        }
      } finally {
        toggleBtn.disabled = false;
      }
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', async () => {
      const bot = window.appState.currentBot;
      if (!bot) return alert('No bot selected.');
      restartBtn.disabled = true;
      restartBtn.textContent = 'Restarting...';
      try {
        appendConsoleLine('[System] Restarting bot...\n', '#e5c07b');
        await stopAllOtherBots(bot);
        await window.ipcRenderer.invoke('stop-bot', bot).catch(() => null);
        setRunningUI(false);
        await new Promise((r) => setTimeout(r, 700));
        const res = await window.ipcRenderer.invoke('start-bot', bot);
        if (res && res.success) {
          setRunningUI(true);
        } else {
          setRunningUI(false);
          alert('Failed to restart bot: ' + (res?.error || 'Unknown error'));
        }
      } finally {
        restartBtn.disabled = false;
        restartBtn.textContent = 'Restart Bot';
      }
    });
  }

  if (consoleInput) {
    consoleInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const cmd = consoleInput.value.trim();
        if (!cmd || !window.appState.currentBot) return;
        appendConsoleLine(`> ${cmd}`, '#ffffff');
        await window.ipcRenderer.invoke('console-command', { folderName: window.appState.currentBot, command: cmd });
        consoleInput.value = '';
      }
    });
  }

  ipcRenderer.on('bot-log', (event, { folderName, type, data }) => {
    if (folderName === window.appState.currentBot) {
      const color = type === 'stderr' ? '#e06c75' : '#abb2bf';
      appendConsoleLine(data, color);
    }
  });

  ipcRenderer.on('bot-stopped', (event, { folderName, code }) => {
    if (folderName === window.appState.currentBot) {
      setRunningUI(false);
      if (statusBadge) {
        statusBadge.textContent = 'Offline';
        statusBadge.className = 'badge badge-secondary';
      }
      appendConsoleLine(`[Bot process exited with code ${code}]`, '#e5c07b');
    }
  });
});

function appendConsoleLine(text, color = '#abb2bf') {
  const consoleOutput = document.getElementById('console-output');
  if (!consoleOutput) return;
  const div = document.createElement('div');
  div.style.color = color;
  div.style.fontFamily = 'monospace';
  div.style.whiteSpace = 'pre-wrap';
  div.textContent = text;
  consoleOutput.appendChild(div);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}
