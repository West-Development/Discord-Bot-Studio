(function () {
  let expandedTriggers = {};
  let dragStartIdx = null;
  let dragGroupCount = 1;

  function getEventContainerSpan(actions, startIdx) {
    const EVENT_TRIGGERS = ['guildMemberAdd', 'guildMemberRemove', 'guildMemberUpdate', 'guildBanAdd', 'guildBanRemove', 'messageCreate', 'messageUpdate', 'messageDelete', 'channelCreate', 'channelDelete', 'roleCreate', 'roleDelete', 'voiceStateUpdate', 'guildBoost', 'guildBoostRemove', 'ready', 'buttonClick', 'dropdownSelect'];
    const EMBED_PARTS = ['embed_title', 'send_message', 'embed_field', 'embed_media', 'embed_footer', 'embed_timestamp'];
    const t = actions[startIdx]?.type;
    if (![...EVENT_TRIGGERS, 'send_role_buttons', 'ui_button', 'send_dm', 'create_embed'].includes(t)) return 1;

    let count = 1;
    for (let i = startIdx + 1; i < actions.length; i++) {
      const nt = actions[i].type;
      if (t === 'create_embed') {
        if (!EMBED_PARTS.includes(nt)) break;
      } else if (t === 'send_dm') {
        if (EVENT_TRIGGERS.includes(nt) || nt === 'send_dm' || nt === 'send_role_buttons' || nt === 'ui_button' || (nt !== 'create_embed' && !EMBED_PARTS.includes(nt))) break;
      } else if (t === 'ui_button') {
        if (EVENT_TRIGGERS.includes(nt) || nt === 'send_role_buttons' || nt === 'ui_button') break;
      } else if (t === 'send_role_buttons') {
        if (EVENT_TRIGGERS.includes(nt) || nt === 'send_role_buttons') break;
      } else if (EVENT_TRIGGERS.includes(t)) {
        if (EVENT_TRIGGERS.includes(nt)) break;
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
      events: [],
      selectedCommand: -1,
      selectedEvent: -1,
      selectedActionIdx: -1
    };
    if (!Array.isArray(window.appState.events)) {
      window.appState.events = Object.values(window.appState.events || {});
    }
    return window.appState;
  }

  window.loadEvents = async function () {
    const state = getAppState();
    if (!state.currentBot) return;

    const defs = await window.ipcRenderer.invoke('get-event-definitions');
    window.eventDefinitions = Array.isArray(defs) ? defs : [];

    const loaded = await window.ipcRenderer.invoke('get-events', state.currentBot);
    state.events = Array.isArray(loaded) ? loaded : Object.values(loaded || {});
    state.selectedEvent = -1;
    state.selectedActionIdx = -1;

    renderEventList();
    showEmptyEditor();
  };

  function showEmptyEditor() {
    const editor = document.getElementById('event-editor');
    const empty = document.getElementById('event-empty-state');
    if (editor) editor.style.display = 'none';
    if (empty) empty.style.display = 'flex';
  }

  function openEventEditor(idx) {
    const state = getAppState();
    if (idx < 0 || idx >= state.events.length) {
      showEmptyEditor();
      return;
    }

    state.selectedEvent = idx;
    state.selectedActionIdx = -1;
    const evt = state.events[idx];

    const editor = document.getElementById('event-editor');
    const empty = document.getElementById('event-empty-state');
    if (empty) empty.style.display = 'none';
    if (editor) editor.style.display = 'flex';

    const nameInput = document.getElementById('event-name');
    if (nameInput) nameInput.value = evt.name || '';

    renderEventList();
    window.renderEventActionTable();
  }

  window.renderEventList = function () {
    const state = getAppState();
    const listEl = document.getElementById('event-list');
    if (!listEl) return;
    listEl.style.cssText = 'display: flex; flex-direction: column; gap: 3px; padding: 6px; width: 100%; flex: 1 1 auto; min-height: 0; max-height: calc(100vh - 140px); overflow-y: auto; overflow-x: hidden; box-sizing: border-box;';
    listEl.innerHTML = '';

    state.events.forEach((evt, idx) => {
      const row = document.createElement('div');
      const isActive = state.selectedEvent === idx;
      row.className = 'event-item';
      row.style.cssText = `
        display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important;
        width: 100% !important; box-sizing: border-box !important; padding: 6px 10px !important; margin: 0 !important;
        border-radius: 4px !important; cursor: pointer !important; gap: 8px !important; font-size: 13px !important;
        border: 1px solid ${isActive ? '#7a7a7a' : '#444444'} !important;
        background: ${isActive ? '#4d4d4d' : '#343434'} !important;
        color: ${isActive ? '#ffffff' : '#cbd5e1'} !important;
      `;

      const titleSpan = document.createElement('span');
      titleSpan.textContent = evt.name || `event_${idx + 1}`;
      titleSpan.style.cssText = 'flex: 1 1 auto !important; min-width: 0 !important; color: #ffffff !important; font-size: 13px !important; font-weight: 500 !important; text-align: left !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; display: block !important;';
      titleSpan.ondblclick = (e) => {
        e.stopPropagation();
        const input = document.createElement('input');
        input.type = 'text';
        input.value = evt.name || `event_${idx + 1}`;
        input.style.cssText = 'width: 100%; background: #181a1d; color: #fff; border: 1px solid #2b82d9; border-radius: 3px; padding: 2px 6px; font-size: 13px; outline: none;';
        let committed = false;
        const commitRename = async () => {
          if (committed) return;
          committed = true;
          const newName = input.value.trim();
          if (!newName || newName === evt.name) {
            renderEventList();
            return;
          }
          evt.name = newName;
          if (state.selectedEvent === idx) {
            const nameInput = document.getElementById('event-name');
            if (nameInput) nameInput.value = newName;
          }
          renderEventList();
          if (state.currentBot) {
            await window.ipcRenderer.invoke('save-events', {
              folderName: state.currentBot,
              events: state.events
            });
          }
        };
        input.onkeydown = (ev) => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            input.blur();
          } else if (ev.key === 'Escape') {
            renderEventList();
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
      delBtn.title = 'Delete Event';
      delBtn.style.cssText = 'flex: 0 0 auto !important; margin-left: auto !important; background: transparent !important; border: none !important; color: #cbd5e1 !important; font-size: 16px !important; line-height: 1 !important; padding: 2px 6px !important; cursor: pointer !important; border-radius: 3px !important;';
      delBtn.onmouseenter = () => { delBtn.style.background = '#c72e2e'; delBtn.style.color = '#fff'; };
      delBtn.onmouseleave = () => { delBtn.style.background = 'transparent'; delBtn.style.color = '#cbd5e1'; };
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        if (!(await window.studioConfirm(`Delete event "${evt.name || 'unnamed'}"?`, 'Delete Event', 'Delete', true))) return;
        state.events.splice(idx, 1);
        state.selectedEvent = -1;
        state.selectedActionIdx = -1;
        renderEventList();
        showEmptyEditor();
        if (state.currentBot) {
          await window.ipcRenderer.invoke('save-events', {
            folderName: state.currentBot,
            events: state.events
          });
        }
      };
      row.appendChild(delBtn);

      row.onclick = () => openEventEditor(idx);
      listEl.appendChild(row);
    });
  };

  window.renderEventActionTable = function () {
    const state = getAppState();
    const tbody = document.getElementById('event-action-list-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const idx = state.selectedEvent;
    if (idx === null || idx === undefined || idx < 0 || !state.events[idx]) return;

    const evtData = state.events[idx];
    if (!Array.isArray(evtData.actions)) evtData.actions = [];

    const EVENT_TRIGGERS = ['guildMemberAdd', 'guildMemberRemove', 'guildMemberUpdate', 'guildBanAdd', 'guildBanRemove', 'messageCreate', 'messageUpdate', 'messageDelete', 'channelCreate', 'channelDelete', 'roleCreate', 'roleDelete', 'voiceStateUpdate', 'guildBoost', 'guildBoostRemove', 'ready', 'buttonClick', 'dropdownSelect'];
    const EMBED_PARTS = ['embed_title', 'send_message', 'embed_field', 'embed_media', 'embed_footer', 'embed_timestamp'];

    let rootIdx = null;
    let panelIdx = null;
    let btnIdx = null;
    let dmIdx = null;
    let embedIdx = null;

    evtData.actions.forEach((action, aIdx) => {
      const t = action.type;
      const isRoot = EVENT_TRIGGERS.includes(t);
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
        dragGroupCount = e.ctrlKey ? getEventContainerSpan(evtData.actions, aIdx) : 1;
        e.dataTransfer.effectAllowed = 'move';
        tr.style.opacity = '0.45';
      };
      tr.ondragend = () => {
        dragStartIdx = null;
        dragGroupCount = 1;
        window.renderEventActionTable();
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

        const acts = evtData.actions;
        let dropTargetEnd = aIdx;
        if (dragGroupCount > 1) {
          const targetSpan = getEventContainerSpan(acts, aIdx);
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
        window.renderEventActionTable();
      };

      tr.onclick = (e) => {
        e.stopPropagation();
        state.selectedActionIdx = aIdx;
        window.renderEventActionTable();
      };

      tr.ondblclick = () => {
        if (typeof window.openActionModal === 'function') window.openActionModal(aIdx, 'event');
      };

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
          window.renderEventActionTable();
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

      const tdType = document.createElement('td');
      tdType.style.cssText = 'padding:8px 10px;color:#f4f4f5;font-weight:600;width:240px;';
      const def = (window.actionDefinitions || []).find((d) => d.id === action.type) || (window.eventDefinitions || []).find((d) => d.id === action.type);
      tdType.textContent = def ? def.name : (action.label || action.type);
      tr.appendChild(tdType);

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
      } else if (action.type === 'create_embed') {
        sumText.textContent = `Embed: ${d.title || 'Untitled'}`;
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
        if (typeof window.openActionModal === 'function') window.openActionModal(aIdx, 'event');
      };
      btnGroup.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.textContent = '×';
      delBtn.style.cssText = 'background:#c72e2e;color:#fff;border:none;padding:3px 8px;border-radius:3px;font-size:11px;cursor:pointer;font-weight:bold;';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        evtData.actions.splice(aIdx, 1);
        state.selectedActionIdx = -1;
        window.renderEventActionTable();
      };
      btnGroup.appendChild(delBtn);

      wrap.appendChild(btnGroup);
      tdSummary.appendChild(wrap);
      tr.appendChild(tdSummary);
      tbody.appendChild(tr);
    });
  };

  document.getElementById('new-event-btn')?.addEventListener('click', () => {
    const state = getAppState();
    if (!state.currentBot) return alert('Select a bot first.');
    const newEvt = {
      name: `event_${state.events.length + 1}`,
      actions: []
    };
    state.events.push(newEvt);
    openEventEditor(state.events.length - 1);
  });

  document.getElementById('event-add-action-btn')?.addEventListener('click', () => {
    const state = getAppState();
    if (state.selectedEvent === null || state.selectedEvent < 0) {
      return alert('Select or create an event first.');
    }
    if (typeof window.openActionModal === 'function') {
      window.openActionModal(-1, 'event');
    }
  });

  const moveUp = () => {
    const state = getAppState();
    const eIdx = state.selectedEvent;
    const aIdx = state.selectedActionIdx;
    if (eIdx < 0 || aIdx <= 0) return;
    const acts = state.events[eIdx].actions;
    [acts[aIdx - 1], acts[aIdx]] = [acts[aIdx], acts[aIdx - 1]];
    state.selectedActionIdx = aIdx - 1;
    window.renderEventActionTable();
  };
  const moveDown = () => {
    const state = getAppState();
    const eIdx = state.selectedEvent;
    const aIdx = state.selectedActionIdx;
    if (eIdx < 0 || aIdx < 0) return;
    const acts = state.events[eIdx].actions;
    if (aIdx >= acts.length - 1) return;
    [acts[aIdx + 1], acts[aIdx]] = [acts[aIdx], acts[aIdx + 1]];
    state.selectedActionIdx = aIdx + 1;
    window.renderEventActionTable();
  };
  const removeSelectedAction = () => {
    const state = getAppState();
    const eIdx = state.selectedEvent;
    const aIdx = state.selectedActionIdx;
    if (eIdx < 0 || aIdx < 0) return;
    state.events[eIdx].actions.splice(aIdx, 1);
    state.selectedActionIdx = -1;
    window.renderEventActionTable();
  };
  document.getElementById('event-move-up-btn')?.addEventListener('click', moveUp);
  document.getElementById('event-move-down-btn')?.addEventListener('click', moveDown);
  document.getElementById('event-remove-action-btn')?.addEventListener('click', removeSelectedAction);

  document.getElementById('save-event-btn')?.addEventListener('click', async () => {
    const state = getAppState();
    const eIdx = state.selectedEvent;
    if (eIdx < 0) return;
    const evt = state.events[eIdx];
    const nameInput = document.getElementById('event-name');
    if (nameInput) evt.name = nameInput.value.trim() || evt.name;
    if (state.currentBot) {
      await window.ipcRenderer.invoke('save-events', {
        folderName: state.currentBot,
        events: state.events
      });
      const saveEvtBtn = document.getElementById('save-event-btn');
      if (saveEvtBtn) {
        clearTimeout(window.__saveEvtBtnTimer);
        saveEvtBtn.textContent = 'Saved ✓';
        window.__saveEvtBtnTimer = setTimeout(() => {
          saveEvtBtn.textContent = 'Save Event';
        }, 1500);
      }
    }
  });

  document.getElementById('export-event-btn')?.addEventListener('click', async () => {
    const state = getAppState();
    const eIdx = state.selectedEvent;
    if (eIdx < 0) return alert('Select an event first before exporting.');
    const evt = { ...state.events[eIdx] };
    const nameInput = document.getElementById('event-name');
    if (nameInput && nameInput.value.trim()) evt.name = nameInput.value.trim();
    const res = await window.ipcRenderer.invoke('export-event', evt);
    if (res && !res.success && !res.canceled) {
      alert('Export failed: ' + (res.error || 'Unknown error'));
    }
  });

  document.getElementById('import-event-btn')?.addEventListener('click', async () => {
    const state = getAppState();
    if (!state.currentBot) return alert('Select a bot first before importing an event.');
    const res = await window.ipcRenderer.invoke('import-event');
    if (!res || res.canceled) return;
    if (!res.success || !res.event) {
      return alert('Import failed: ' + (res?.error || 'Invalid file'));
    }

    const imported = {
      name: res.event.name || `imported_event_${Date.now().toString().slice(-4)}`,
      actions: Array.isArray(res.event.actions) ? res.event.actions : []
    };

    if (state.events.some((e) => e.name === imported.name)) {
      imported.name = `${imported.name}_${Date.now().toString().slice(-4)}`;
    }

    state.events.push(imported);
    openEventEditor(state.events.length - 1);

    await window.ipcRenderer.invoke('save-events', {
      folderName: state.currentBot,
      events: state.events
    });
  });
})();
