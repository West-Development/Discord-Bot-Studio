(function () {
  let expandedTriggers = {};
  let dragStartIdx = null;
  let dragGroupCount = 1;

  function getCommandContainerSpan(actions, startIdx) {
    const ROOT_TRIGGERS = ['slash_command', 'prefix_command'];
    const EMBED_PARTS = ['embed_title', 'send_message', 'embed_field', 'embed_media', 'embed_footer', 'embed_timestamp'];
    const t = actions[startIdx]?.type;
    if (!['slash_command', 'prefix_command', 'send_dm', 'create_embed'].includes(t)) return 1;

    let count = 1;
    for (let i = startIdx + 1; i < actions.length; i++) {
      const nt = actions[i].type;
      if (t === 'create_embed') {
        if (!EMBED_PARTS.includes(nt)) break;
      } else if (t === 'send_dm') {
        if (ROOT_TRIGGERS.includes(nt) || nt === 'send_dm' || (nt !== 'create_embed' && !EMBED_PARTS.includes(nt))) break;
      } else if (ROOT_TRIGGERS.includes(t)) {
        if (ROOT_TRIGGERS.includes(nt)) break;
      }
      count++;
    }
    return count;
  }

  function getAppState() {
    window.appState = window.appState || {
      botsData: {},
      currentBot: null,
      commands: [],
      selectedCommand: -1,
      selectedActionIdx: -1
    };
    if (!Array.isArray(window.appState.commands)) {
      window.appState.commands = Object.values(window.appState.commands || {});
    }
    return window.appState;
  }

  window.loadCommands = async function () {
    const state = getAppState();
    if (!state.currentBot) return;

    const defs = await window.ipcRenderer.invoke('get-action-definitions');
    window.actionDefinitions = Array.isArray(defs) ? defs : [];

    const loaded = await window.ipcRenderer.invoke('get-commands', state.currentBot);
    state.commands = Array.isArray(loaded) ? loaded : Object.values(loaded || {});
    state.selectedCommand = -1;
    state.selectedActionIdx = -1;

    renderCommandList();
    showEmptyEditor();
  };

  function showEmptyEditor() {
    const editor = document.getElementById('command-editor');
    const empty = document.getElementById('command-empty-state');
    if (editor) editor.style.display = 'none';
    if (empty) empty.style.display = 'flex';
  }

  function openCommandEditor(idx) {
    const state = getAppState();
    if (idx < 0 || idx >= state.commands.length) {
      showEmptyEditor();
      return;
    }

    state.selectedCommand = idx;
    state.selectedActionIdx = -1;
    const cmd = state.commands[idx];

    const editor = document.getElementById('command-editor');
    const empty = document.getElementById('command-empty-state');
    if (empty) empty.style.display = 'none';
    if (editor) editor.style.display = 'flex';

    const nameInput = document.getElementById('cmd-name');
    const descInput = document.getElementById('cmd-description');
    if (nameInput) nameInput.value = cmd.name || '';
    if (descInput) descInput.value = cmd.description || '';

    renderCommandList();
    window.renderActionTable();
  }

  window.renderCommandList = function () {
    const state = getAppState();
    const listEl = document.getElementById('command-list');
    if (!listEl) return;
    listEl.style.cssText = 'display: flex; flex-direction: column; gap: 3px; padding: 6px; width: 100%; flex: 1 1 auto; min-height: 0; max-height: calc(100vh - 140px); overflow-y: auto; overflow-x: hidden; box-sizing: border-box;';
    listEl.innerHTML = '';

    state.commands.forEach((cmd, idx) => {
      const row = document.createElement('div');
      const isActive = state.selectedCommand === idx;
      row.className = 'command-item';
      row.style.cssText = `
        display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important;
        width: 100% !important; box-sizing: border-box !important; padding: 6px 10px !important; margin: 0 !important;
        border-radius: 4px !important; cursor: pointer !important; gap: 8px !important; font-size: 13px !important;
        border: 1px solid ${isActive ? '#7a7a7a' : '#444444'} !important;
        background: ${isActive ? '#4d4d4d' : '#343434'} !important;
        color: ${isActive ? '#ffffff' : '#cbd5e1'} !important;
      `;

      const titleSpan = document.createElement('span');
      titleSpan.textContent = cmd.name || `command_${idx + 1}`;
      titleSpan.style.cssText = 'flex: 1 1 auto !important; min-width: 0 !important; color: #ffffff !important; font-size: 13px !important; font-weight: 500 !important; text-align: left !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; display: block !important;';
      titleSpan.ondblclick = (e) => {
        e.stopPropagation();
        const input = document.createElement('input');
        input.type = 'text';
        input.value = cmd.name || `command_${idx + 1}`;
        input.style.cssText = 'width: 100%; background: #181a1d; color: #fff; border: 1px solid #2b82d9; border-radius: 3px; padding: 2px 6px; font-size: 13px; outline: none;';
        
        let committed = false;
        const commitRename = async () => {
          if (committed) return;
          committed = true;
          const newName = input.value.trim();
          if (!newName || newName === cmd.name) {
            renderCommandList();
            return;
          }
          cmd.name = newName;
          if (state.selectedCommand === idx) {
            const nameInput = document.getElementById('cmd-name');
            if (nameInput) nameInput.value = newName;
          }
          renderCommandList();
          if (state.currentBot) {
            await window.ipcRenderer.invoke('save-commands', {
              folderName: state.currentBot,
              commands: state.commands
            });
          }
        };
        
        input.onkeydown = (ev) => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            input.blur();
          } else if (ev.key === 'Escape') {
            renderCommandList();
          }
        };
        input.onblur = commitRename;
        
        titleSpan.replaceWith(input);
        input.focus();
        input.select();
      };
      row.appendChild(titleSpan);

      const delBtn = document.createElement('button');
      delBtn.textContent = '×';
      delBtn.title = 'Delete Command';
      delBtn.style.cssText = 'flex: 0 0 auto !important; margin-left: auto !important; background: transparent !important; border: none !important; color: #cbd5e1 !important; font-size: 16px !important; line-height: 1 !important; padding: 2px 6px !important; cursor: pointer !important; border-radius: 3px !important;';
      delBtn.onmouseenter = () => { delBtn.style.background = '#c72e2e'; delBtn.style.color = '#fff'; };
      delBtn.onmouseleave = () => { delBtn.style.background = 'transparent'; delBtn.style.color = '#cbd5e1'; };
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        if (!(await window.studioConfirm(`Delete command "${cmd.name || 'unnamed'}"?`, 'Delete Command', 'Delete', true))) return;
        state.commands.splice(idx, 1);
        state.selectedCommand = -1;
        state.selectedActionIdx = -1;
        renderCommandList();
        showEmptyEditor();
        if (state.currentBot) {
          await window.ipcRenderer.invoke('save-commands', {
            folderName: state.currentBot,
            commands: state.commands
          });
        }
      };
      row.appendChild(delBtn);

      row.onclick = () => openCommandEditor(idx);
      listEl.appendChild(row);
    });
  };

  window.renderActionTable = function () {
    const state = getAppState();
    const tbody = document.getElementById('action-list-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const idx = state.selectedCommand;
    if (idx === null || idx === undefined || idx < 0 || !state.commands[idx]) return;

    const cmdData = state.commands[idx];
    if (!Array.isArray(cmdData.actions)) cmdData.actions = [];

    const ROOT_TRIGGERS = ['slash_command', 'prefix_command'];
    const EMBED_PARTS = ['embed_title', 'send_message', 'embed_field', 'embed_media', 'embed_footer', 'embed_timestamp'];

    let rootIdx = null;
    let panelIdx = null;
    let btnIdx = null;
    let dmIdx = null;
    let embedIdx = null;

    (typeof cmdData !== 'undefined' ? cmdData : evtData).actions.forEach((action, aIdx) => {
      const t = action.type;
      const isRoot = (typeof ROOT_TRIGGERS !== 'undefined' ? ROOT_TRIGGERS : EVENT_TRIGGERS).includes(t);
      const isPanel = t === 'send_role_buttons';
      const isBtn = t === 'ui_button';
      const isDm = t === 'send_dm';
      const isEmbed = t === 'create_embed';
      const isEmbedPart = EMBED_PARTS.includes(t);
      const isContainer = isRoot || isPanel || isBtn || isDm || isEmbed;

      if (isRoot) {
        rootIdx = aIdx;
        panelIdx = null;
        btnIdx = null;
        dmIdx = null;
        embedIdx = null;
      } else if (isPanel) {
        panelIdx = aIdx;
        btnIdx = null;
        dmIdx = null;
        embedIdx = null;
      } else if (isBtn) {
        btnIdx = aIdx;
        dmIdx = null;
        embedIdx = null;
      } else if (isDm) {
        dmIdx = aIdx;
        embedIdx = null;
      } else if (isEmbed) {
        embedIdx = aIdx;
      } else if (!isEmbedPart) {
        dmIdx = null;
        embedIdx = null;
        if (btnIdx === null) panelIdx = null;
      }

      if (isContainer && expandedTriggers[aIdx] === undefined) {
        expandedTriggers[aIdx] = true;
      }

      const parents = [];
      if (!isRoot && rootIdx !== null) parents.push(rootIdx);
      if (!isRoot && !isPanel && panelIdx !== null) parents.push(panelIdx);
      if (!isRoot && !isPanel && !isBtn && btnIdx !== null) parents.push(btnIdx);
      if (!isRoot && !isPanel && !isBtn && !isDm && dmIdx !== null) parents.push(dmIdx);
      if (!isRoot && !isPanel && !isBtn && !isDm && !isEmbed && isEmbedPart && embedIdx !== null) parents.push(embedIdx);

      // Hide row if any parent container in its chain is collapsed
      if (parents.some((pIdx) => expandedTriggers[pIdx] === false)) {
        return;
      }

      const depth = parents.length;
      const tr = document.createElement('tr');
      const isSelected = state.selectedActionIdx === aIdx;
      const depthBg = ['#2d2d32', '#29292e', '#25252a', '#212126', '#1e1e23'];
      const depthBorder = ['#60a5fa', '#c084fc', '#34d399', '#fbbf24', '#f472b6'];

      tr.style.cssText = `cursor:pointer;background:${isSelected ? '#43434b' : (depthBg[depth] || '#1e1e23')} !important;border-left:4px solid ${depthBorder[depth] || '#f472b6'} !important;`;

      tr.draggable = true;
      tr.ondragstart = (e) => {
        dragStartIdx = aIdx;
        dragGroupCount = e.ctrlKey ? getCommandContainerSpan(cmdData.actions, aIdx) : 1;
        e.dataTransfer.effectAllowed = 'move';
        tr.style.opacity = '0.45';
      };
      tr.ondragend = () => {
        dragStartIdx = null;
        dragGroupCount = 1;
        window.renderActionTable();
      };
      tr.ondragover = (e) => {
        e.preventDefault();
        const scrollBox = tbody.closest('div');
        if (scrollBox) {
          const rect = scrollBox.getBoundingClientRect();
          const edge = 55;
          if (e.clientY - rect.top < edge) {
            scrollBox.scrollTop -= 14;
          } else if (rect.bottom - e.clientY < edge) {
            scrollBox.scrollTop += 14;
          }
        }
        if (dragStartIdx === null) return;
        if (aIdx >= dragStartIdx && aIdx < dragStartIdx + dragGroupCount) return;
        tr.style.boxShadow = 'inset 0 -2px 0 #3b82d9';
      };
      tr.ondragleave = () => {
        tr.style.boxShadow = 'none';
      };
      tr.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        tr.style.boxShadow = 'none';
        if (dragStartIdx === null) return;
        if (aIdx >= dragStartIdx && aIdx < dragStartIdx + dragGroupCount) return;

        const acts = cmdData.actions;
        // If dragging a group (Ctrl+Drag) and dropping onto another container header, place after that container's entire dropdown
        let dropTargetEnd = aIdx;
        if (dragGroupCount > 1) {
          const targetSpan = getCommandContainerSpan(acts, aIdx);
          if (targetSpan > 1) dropTargetEnd = aIdx + targetSpan - 1;
        }

        const moved = acts.splice(dragStartIdx, dragGroupCount);
        let insertAt = dropTargetEnd + 1;
        if (dragStartIdx < insertAt) {
          insertAt -= dragGroupCount;
        }
        insertAt = Math.max(0, Math.min(acts.length, insertAt));
        acts.splice(insertAt, 0, ...moved);

        state.selectedActionIdx = insertAt;
        dragStartIdx = null;
        dragGroupCount = 1;
        window.renderActionTable();
      };

      tr.onclick = (e) => {
        e.stopPropagation();
        state.selectedActionIdx = aIdx;
        window.renderActionTable();
      };

      tr.ondblclick = () => {
        if (typeof window.openActionModal === 'function') window.openActionModal(aIdx);
      };

      // # Column with progressive 24px per-level indentation
      const tdNum = document.createElement('td');
      tdNum.style.cssText = 'color:#9a9aa2;font-family:monospace;width:150px;white-space:nowrap;';
      const numWrap = document.createElement('span');
      numWrap.style.cssText = `display:inline-block;margin-left:${depth * 24}px;`;

      if (isContainer) {
        const arrow = document.createElement('span');
        arrow.textContent = expandedTriggers[aIdx] ? '▾ ' : '▸ ';
        arrow.style.cssText = 'cursor:pointer;color:#e4e4e7;font-weight:700;';
        arrow.onclick = (e) => {
          e.stopPropagation();
          expandedTriggers[aIdx] = !expandedTriggers[aIdx];
          window.renderActionTable();
        };
        if (depth > 0) {
          const sub = document.createElement('span');
          sub.textContent = '↳ ';
          sub.style.cssText = 'color:#8e8e98;font-weight:700;';
          numWrap.appendChild(sub);
        }
        numWrap.appendChild(arrow);
        numWrap.appendChild(document.createTextNode(`#${aIdx + 1}`));
      } else if (depth > 0) {
        const sub = document.createElement('span');
        sub.textContent = '↳ ';
        sub.style.cssText = 'color:#8e8e98;font-weight:700;';
        numWrap.appendChild(sub);
        numWrap.appendChild(document.createTextNode(`#${aIdx + 1}`));
      } else {
        numWrap.textContent = `#${aIdx + 1}`;
      }
      tdNum.appendChild(numWrap);
      tr.appendChild(tdNum);

      // Action Type Column
      const tdType = document.createElement('td');
      tdType.style.cssText = 'padding:8px 10px;color:#f4f4f5;font-weight:600;width:240px;';
      const def = (window.actionDefinitions || []).find((d) => d.id === action.type);
      tdType.textContent = def ? def.name : (action.label || action.type);
      tr.appendChild(tdType);

      // Summary + Row Buttons Column
      const tdSummary = document.createElement('td');
      tdSummary.style.cssText = 'padding:8px 10px;color:#94a3b8;';

      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';

      const sumText = document.createElement('span');
      const d = action.data || {};
      if (action.type === 'slash_command') {
        sumText.textContent = `/${d.triggerName || 'unnamed'} — ${d.description || ''}`;
      } else if (action.type === 'prefix_command') {
        sumText.textContent = `${d.prefix || '!'}${d.triggerName || 'unnamed'}`;
      } else if (action.type === 'role_permission') {
        sumText.textContent = `Allowed Roles: ${d.roleIds || 'None'}`;
      } else if (action.type === 'add_role' || action.type === 'remove_role') {
        sumText.textContent = `Role ID: ${d.roleId || ''}`;
      } else if (action.type === 'send_message') {
        sumText.textContent = d.message || '';
      } else if (action.type === 'user_argument' || action.type === 'role_argument' || action.type === 'text_argument') {
        sumText.textContent = `Option: ${d.optionName || ''} ${d.required ? '(Required)' : ''}`;
      } else {
        sumText.textContent = action.summary || Object.values(d).filter(Boolean).join(' | ');
      }
      wrap.appendChild(sumText);

      const btnGroup = document.createElement('span');
      btnGroup.style.cssText = 'display:flex;gap:4px;flex-shrink:0;';

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.style.cssText = 'background:#2b82d9;color:#fff;border:none;padding:3px 8px;border-radius:3px;font-size:11px;cursor:pointer;';
      editBtn.onclick = (e) => {
        e.stopPropagation();
        if (typeof window.openActionModal === 'function') window.openActionModal(aIdx);
      };
      btnGroup.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.textContent = '×';
      delBtn.style.cssText = 'background:#c72e2e;color:#fff;border:none;padding:3px 8px;border-radius:3px;font-size:11px;cursor:pointer;font-weight:bold;';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        cmdData.actions.splice(aIdx, 1);
        state.selectedActionIdx = -1;
        window.renderActionTable();
      };
      btnGroup.appendChild(delBtn);

      wrap.appendChild(btnGroup);
      tdSummary.appendChild(wrap);
      tr.appendChild(tdSummary);
      tbody.appendChild(tr);
    });
  };

  // + New Command Button
  document.getElementById('new-command-btn')?.addEventListener('click', () => {
    const state = getAppState();
    if (!state.currentBot) return alert('Select a bot first.');
    const newCmd = {
      name: `command_${state.commands.length + 1}`,
      description: '',
      actions: []
    };
    state.commands.push(newCmd);
openCommandEditor(state.commands.length - 1);
});
// + Add Action Button
document.getElementById('add-action-btn')?.addEventListener('click', () => {
const state = getAppState();
if (state.selectedCommand === null || state.selectedCommand < 0) {
return alert('Select or create a command first.');
}
if (typeof window.openActionModal === 'function') {
window.openActionModal(-1);
}
});
// Move Up / Move Down / Remove Action Buttons
const moveUp = () => {
const state = getAppState();
const cIdx = state.selectedCommand;
const aIdx = state.selectedActionIdx;
if (cIdx < 0 || aIdx <= 0) return;
const acts = state.commands[cIdx].actions;
[acts[aIdx - 1], acts[aIdx]] = [acts[aIdx], acts[aIdx - 1]];
state.selectedActionIdx = aIdx - 1;
window.renderActionTable();
};
const moveDown = () => {
const state = getAppState();
const cIdx = state.selectedCommand;
const aIdx = state.selectedActionIdx;
if (cIdx < 0 || aIdx < 0) return;
const acts = state.commands[cIdx].actions;
if (aIdx >= acts.length - 1) return;
[acts[aIdx + 1], acts[aIdx]] = [acts[aIdx], acts[aIdx + 1]];
state.selectedActionIdx = aIdx + 1;
window.renderActionTable();
};
const removeSelectedAction = () => {
const state = getAppState();
const cIdx = state.selectedCommand;
const aIdx = state.selectedActionIdx;
if (cIdx < 0 || aIdx < 0) return;
state.commands[cIdx].actions.splice(aIdx, 1);
state.selectedActionIdx = -1;
window.renderActionTable();
};
document.getElementById('move-up-btn')?.addEventListener('click', moveUp);
document.getElementById('move-action-up')?.addEventListener('click', moveUp);
document.getElementById('move-down-btn')?.addEventListener('click', moveDown);
document.getElementById('move-action-down')?.addEventListener('click', moveDown);
document.getElementById('remove-action-btn')?.addEventListener('click', removeSelectedAction);
// Save Command Button
const saveBtn = document.getElementById('save-command-btn');
if (saveBtn) {
saveBtn.addEventListener('click', async () => {
const state = getAppState();
const cIdx = state.selectedCommand;
if (!state.currentBot || cIdx === null || cIdx < 0 || !state.commands[cIdx]) {
return alert('Select a command first.');
}
const cmd = state.commands[cIdx];
const nameVal = document.getElementById('cmd-name')?.value.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
const descVal = document.getElementById('cmd-description')?.value.trim();
if (nameVal) cmd.name = nameVal;
cmd.description = descVal || '';
try {
const res = await window.ipcRenderer.invoke('save-commands', {
folderName: state.currentBot,
commands: state.commands
});
if (!res || !res.success) {
return alert('Failed to save command: ' + (res?.error || 'Unknown error'));
}
renderCommandList();
window.renderActionTable();
clearTimeout(window.__saveCmdBtnTimer);
saveBtn.textContent = 'Saved ✓';
window.__saveCmdBtnTimer = setTimeout(() => {
  saveBtn.textContent = 'Save Command';
}, 1500);
} catch (err) {
alert('Error saving command: ' + err.message);
}
});
}
  // Import/Export Handlers
  const exportBtn = document.getElementById('export-command-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const state = getAppState();
      if (state.selectedCommand === -1) return alert('Select a command first!');
      const cmd = state.commands[state.selectedCommand];
      const nameInput = document.getElementById('cmd-name');
      const descInput = document.getElementById('cmd-description');
      if (nameInput) cmd.name = nameInput.value;
      if (descInput) cmd.description = descInput.value;
      const res = await window.ipcRenderer.invoke('export-command', cmd);
      if (!res.success && !res.canceled) alert('Export failed: ' + res.error);
    });
  }

  const importBtn = document.getElementById('import-command-btn');
  if (importBtn) {
    importBtn.addEventListener('click', async () => {
      const state = getAppState();
      if (!state.currentBot) return alert('Select a bot first!');
      const res = await window.ipcRenderer.invoke('import-command');
      if (res?.success && res.command) {
        let name = res.command.name;
        if (state.commands.find(c => c.name === name)) name += `_${Date.now().toString().slice(-4)}`;
        res.command.name = name;
        state.commands.push(res.command);
        await window.ipcRenderer.invoke('save-commands', { folderName: state.currentBot, commands: state.commands });
        renderCommandList();
        openCommandEditor(state.commands.length - 1);
      } else if (res?.error) {
        alert('Import failed: ' + res.error);
      }
    });
  }
})();