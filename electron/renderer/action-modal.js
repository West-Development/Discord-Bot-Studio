(function () {
  let editingActionIdx = -1;

  function getAppState() {
    window.appState = window.appState || {
      currentBot: null,
      commands: [],
      events: [],
      selectedCommand: -1,
      selectedEvent: -1,
      selectedActionIdx: -1
    };
    return window.appState;
  }

  function normalizeId(id) {
    if (id === 'slash') return 'slash_command';
    if (id === 'prefix') return 'prefix_command';
    return id;
  }

  const ALL_PLACEHOLDERS = [
    // Author / Trigger User
    { tag: '{author}', desc: 'Mentions/pings the user who triggered the command or event' },
    { tag: '{author.name}', desc: 'Username of the trigger author' },
    { tag: '{author.tag}', desc: 'Display name / tag of the trigger author' },
    { tag: '{author.nickname}', desc: 'Server nickname of the trigger author' },
    { tag: '{author.id}', desc: 'Discord User ID of the trigger author' },
    { tag: '{author.avatar}', desc: 'Avatar URL of the trigger author' },
    { tag: '{author.created}', desc: 'Account creation date of the trigger author' },
    { tag: '{author.joined}', desc: 'Server join date of the trigger author' },
    { tag: '{author.roles}', desc: 'Comma-separated list of all roles the author has' },
    { tag: '{author.highest_role}', desc: 'Mentions the author’s highest role' },

    // Target / Affected User
    { tag: '{user}', desc: 'Mentions/pings the target user (falls back to author)' },
    { tag: '{target}', desc: 'Mentions/pings the selected or affected target user' },
    { tag: '{target.name}', desc: 'Username of the target user' },
    { tag: '{target.nickname}', desc: 'Server nickname of the target user' },
    { tag: '{target.id}', desc: 'Discord User ID of the target user' },
    { tag: '{target.avatar}', desc: 'Avatar URL of the target user' },
    { tag: '{target.created}', desc: 'Account creation date & time of the target user' },
    { tag: '{target.joined}', desc: 'Server join date & time of the target user' },
    { tag: '{target.roles}', desc: 'Comma-separated list of all roles the target user has' },
    { tag: '{target.highest_role}', desc: 'Mentions the target user’s highest role' },
    { tag: '{target.voice_channel}', desc: 'Current voice channel of the target user (or None)' },

    // Roles
    { tag: '{role}', desc: 'Mentions/pings the selected or affected role' },
    { tag: '{role.name}', desc: 'Plain text name of the selected or affected role' },
    { tag: '{role.id}', desc: 'Discord Role ID of the selected or affected role' },
    { tag: '{role.color}', desc: 'Hex color code of the role (e.g. #2b82d9)' },
    { tag: '{role.position}', desc: 'Hierarchy position number of the role' },
    { tag: '{role.members}', desc: 'Number of members who currently have this role' },
    { tag: '{role.mentionable}', desc: 'Whether anyone can @mention this role (Yes/No)' },
    { tag: '{role.hoisted}', desc: 'Whether the role displays separately in the member list (Yes/No)' },

    // Channels & Messages
    { tag: '{channel}', desc: 'Mentions/links the current or event channel' },
    { tag: '{channel.name}', desc: 'Plain text name of the current or event channel' },
    { tag: '{channel.id}', desc: 'Discord Channel ID of the current or event channel' },
    { tag: '{channel.topic}', desc: 'Topic / description of the current channel' },
    { tag: '{channel.category}', desc: 'Category folder name the channel is inside' },
    { tag: '{channel.slowmode}', desc: 'Slowmode delay in seconds for the current channel' },
    { tag: '{message.content}', desc: 'Full text content of the trigger message' },
    { tag: '{message.id}', desc: 'Discord Message ID of the trigger message' },
    { tag: '{message.url}', desc: 'Direct jump link URL to the trigger message' },

    // Server / Guild
    { tag: '{server}', desc: 'Name of the Discord server' },
    { tag: '{server.id}', desc: 'Discord Server / Guild ID' },
    { tag: '{server.owner}', desc: 'Mentions/pings the server owner' },
    { tag: '{server.owner_id}', desc: 'Discord User ID of the server owner' },
    { tag: '{server.members}', desc: 'Total member count in the server' },
    { tag: '{server.humans}', desc: 'Number of human (non-bot) members in the server' },
    { tag: '{server.bots}', desc: 'Number of bot accounts in the server' },
    { tag: '{server.roles_count}', desc: 'Total number of roles in the server' },
    { tag: '{server.channels_count}', desc: 'Total number of channels in the server' },
    { tag: '{server.boosts}', desc: 'Total Nitro boost count in the server' },
    { tag: '{server.boost_tier}', desc: 'Server Nitro boost level (0, 1, 2, or 3)' },
    { tag: '{server.created}', desc: 'Date the Discord server was created' },
    { tag: '{server.icon}', desc: 'Server icon image URL' },

    // Bot & Date/Time
    { tag: '{bot}', desc: 'Mentions/pings your bot' },
    { tag: '{bot.name}', desc: 'Current username of your bot' },
    { tag: '{bot.id}', desc: 'Discord User ID of your bot' },
    { tag: '{bot.avatar}', desc: 'Avatar image URL of your bot' },
    { tag: '{bot.ping}', desc: 'Live WebSocket latency in milliseconds (ms)' },
    { tag: '{bot.servers}', desc: 'Total number of servers your bot is in' },
    { tag: '{temp.varName}', desc: 'Value of a temporary variable (Current command run only)' },
    { tag: '{server_var.varName}', desc: 'Value of a persistent server-wide variable' },
    { tag: '{user_var.varName}', desc: 'Value of a persistent user-specific variable' },
    { tag: '{database.table.column}', desc: 'Auto-fetch any SQL column for {target.id} (replace table & column with yours)' },
    { tag: '{db.table.key}', desc: 'Read any local JSON database table & key directly (e.g. {db.warnings.123})' },
    { tag: '{linked_server.name}', desc: 'Name of a linked server fetched via Cross-Server Link' },
    { tag: '{linked_server.id}', desc: 'Guild ID of the linked server' },
    { tag: '{linked_server.members}', desc: 'Member count of the linked server' },
    { tag: '{linked_server.boosts}', desc: 'Nitro boost count of the linked server' },
    { tag: '{linked_server.icon}', desc: 'Icon URL of the linked server' },
    { tag: '{linked_server.owner}', desc: 'Mentions the owner of the linked server' },
    { tag: '{linked_server.has_member}', desc: 'Whether the target user is in the linked server (Yes/No)' },
    { tag: '{bot.health}', desc: 'Automatic bot health status (Running Good / Moderate / Slow)' },
    { tag: '{bot.uptime}', desc: 'How long the bot has been online (e.g. 2h 14m 5s)' },
    { tag: '{bot.memory}', desc: 'Live RAM memory usage of the bot process (e.g. 64.2 MB)' },
    { tag: '{bot.users}', desc: 'Total cached users across servers' },
    { tag: '{author.created_unix}', desc: 'Dynamic Discord relative account creation time' },
    { tag: '{author.joined_unix}', desc: 'Dynamic Discord relative server join time' },
    { tag: '{author.roles_count}', desc: 'Total number of roles the author has' },
    { tag: '{author.color}', desc: 'Hex color of the author’s highest colored role' },
    { tag: '{author.voice_channel}', desc: 'Voice channel the author is currently in' },
    { tag: '{author.is_bot}', desc: 'Whether the author is a bot account (Yes/No)' },
    { tag: '{target.tag}', desc: 'Display name / tag of the target user' },
    { tag: '{target.created_unix}', desc: 'Dynamic Discord relative account creation time' },
    { tag: '{target.joined_unix}', desc: 'Dynamic Discord relative server join time' },
    { tag: '{target.roles_count}', desc: 'Total number of roles the target has' },
    { tag: '{target.color}', desc: 'Hex color of the target user’s highest colored role' },
    { tag: '{target.is_bot}', desc: 'Whether the target user is a bot account (Yes/No)' },
    { tag: '{role.managed}', desc: 'Whether the role is managed by a bot/integration (Yes/No)' },
    { tag: '{channel.nsfw}', desc: 'Whether the channel is marked NSFW (Yes/No)' },
    { tag: '{channel.position}', desc: 'Channel sort position number in the server' },
    { tag: '{message.attachments}', desc: 'Attachment URLs from the trigger message' },
    { tag: '{server.emojis_count}', desc: 'Total custom emojis in the server' },
    { tag: '{server.stickers_count}', desc: 'Total custom stickers in the server' },
    { tag: '{server.vanity}', desc: 'Server custom vanity invite URL (or None)' },
    { tag: '{server.banner}', desc: 'Server banner image URL (if boosted)' },
    { tag: '{date}', desc: 'Current formatted date (e.g. November 23, 2026)' },
    { tag: '{time}', desc: 'Current formatted time (e.g. 12:40 AM)' },
    { tag: '{datetime}', desc: 'Full formatted date & time' },
    { tag: '{unix}', desc: 'Current Unix epoch timestamp in seconds' },
    { tag: '{timestamp}', desc: 'Discord dynamic live timestamp (<t:...:R>)' },
    { tag: '{timestamp.full}', desc: 'Dynamic Discord full date & time timestamp' },
    { tag: '{timestamp.short}', desc: 'Dynamic Discord short time timestamp' },
    { tag: '{random.100}', desc: 'Random whole number between 1 and 100' },
    { tag: '{random.1000}', desc: 'Random whole number between 1 and 1000' },
    { tag: '{random.dice}', desc: 'Random 6-sided dice roll (1 to 6)' },
    { tag: '{random.coin}', desc: 'Random coin flip result (Heads or Tails)' },

    // Discord Formatting
    { tag: '**Bold**', desc: 'Bold text formatting' },
    { tag: '*Italic*', desc: 'Italic text formatting' },
    { tag: '***Bold Italic***', desc: 'Bold + Italic text formatting' },
    { tag: '__Underline__', desc: 'Underlined text formatting' },
    { tag: '~~Strikethrough~~', desc: 'Crossed-out / strikethrough text' },
    { tag: '||Spoiler||', desc: 'Hidden spoiler text (click to reveal)' },
    { tag: '`Inline Code`', desc: 'Single-line monospace code pill' },
    { tag: '```\nCode Block\n```', desc: 'Multi-line monospace code block' },
    { tag: '# Large Header', desc: 'Large H1 heading' },
    { tag: '## Medium Header', desc: 'Medium H2 heading' },
    { tag: '### Small Header', desc: 'Small H3 heading' },
    { tag: '-# Subtext', desc: 'Small muted gray subtext / footnote' },
    { tag: '> Quote', desc: 'Single-line indented blockquote' },
    { tag: '>>> Multi-Line Quote', desc: 'Multi-line indented blockquote' },
    { tag: '- Bullet Point', desc: 'Bulleted list item' },
    { tag: '[Link Text](https://example.com)', desc: 'Clickable masked hyperlink' }
  ];

  function buildPlaceholderHelper(inputId) {
        const quickTags = ['{author}', '{target}', '{target.name}', '{role}', '{role.name}', '{channel}', '{server}', '{database.table.column}', '{temp.varName}', '{user_var.varName}', '{timestamp}', '**Bold**'];

    const escAttr = (str) => String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escHtml = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const chipsHtml = quickTags.map((tag) => {
      const found = ALL_PLACEHOLDERS.find((p) => p.tag === tag);
      return `<span class="placeholder-chip" data-insert="${escAttr(tag)}" title="${escAttr(found ? found.desc : '')}" onclick="const el=document.getElementById('${inputId}'); if(el){ el.value += this.dataset.insert; el.focus(); }" style="padding:3px 7px; border-radius:4px; font-size:11px; cursor:pointer;">${escHtml(tag)}</span>`;
    }).join('');

    const groups = [
      { title: 'Author / Trigger User', match: (t) => t.startsWith('{author') },
      { title: 'Target / Affected User', match: (t) => t === '{user}' || t.startsWith('{target') },
      { title: 'Roles', match: (t) => t.startsWith('{role') },
      { title: 'Channels & Messages', match: (t) => t.startsWith('{channel') || t.startsWith('{message') },
      { title: 'Server / Guild', match: (t) => t.startsWith('{server') && !t.startsWith('{server_var') },
      { title: 'Database & Variables', match: (t) => t.startsWith('{temp.') || t.startsWith('{server_var.') || t.startsWith('{user_var.') || t.startsWith('{database.') || t.startsWith('{db.') },
      { title: 'Cross-Server Linking', match: (t) => t.startsWith('{linked_server.') },
      { title: 'Bot Status & Metrics', match: (t) => t.startsWith('{bot') },
      { title: 'Date, Time & Randoms', match: (t) => t === '{date}' || t === '{time}' || t === '{datetime}' || t === '{unix}' || t.startsWith('{timestamp') || t.startsWith('{random.') },
      { title: 'Discord Formatting', match: (t) => !t.startsWith('{') }
    ];

    const groupedRowsHtml = groups.map((g) => {
      const items = ALL_PLACEHOLDERS.filter((p) => g.match(p.tag));
      if (!items.length) return '';
      const itemRows = items.map((p) => {
        const displayTag = p.tag.includes('\n') ? '```Code Block```' : p.tag;
        return `
          <div class="ph-ref-row" data-insert="${escAttr(p.tag)}" data-search="${escAttr((p.tag + ' ' + p.desc).toLowerCase())}" onclick="const el=document.getElementById('${inputId}'); if(el){ el.value += this.dataset.insert; el.focus(); }" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 10px;border-bottom:1px solid #2a2a30;cursor:pointer;font-size:12px;" onmouseover="this.style.background='#32323a'" onmouseout="this.style.background='transparent'">
            <code style="background:#26262c;border:1px solid #3f3f48;padding:2px 6px;border-radius:4px;color:#f4f4f5;font-weight:700;white-space:nowrap;">${escHtml(displayTag)}</code>
            <span style="color:#a1a1aa;text-align:right;line-height:1.35;">${escHtml(p.desc)}</span>
          </div>
        `;
      }).join('');
      return `
        <div class="ph-ref-group">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#71717a;background:#17171a;padding:6px 10px;border-bottom:1px solid #2a2a30;">${g.title}</div>
          ${itemRows}
        </div>
      `;
    }).join('');

    const drawerId = `ph-drawer-${inputId}`;
    return `
      <div style="margin-top:6px; display:flex; flex-wrap:wrap; align-items:center; gap:4px;">
        ${chipsHtml}
      </div>
      <details style="margin-top:7px;background:#1b1b1e;border:1px solid #3c3c44;border-radius:6px;overflow:hidden;">
        <summary style="cursor:pointer;font-size:12px;font-weight:600;color:#d4d4d8;padding:7px 10px;background:#222226;user-select:none;display:flex;align-items:center;justify-content:space-between;">
          <span>All Placeholders &amp; Descriptions (${ALL_PLACEHOLDERS.length})</span>
          <span style="font-size:11px;color:#8e8e98;">Click to expand ▾</span>
        </summary>
        <div id="${drawerId}" style="padding:8px;background:#1b1b1e;">
          <input type="text" placeholder="Filter placeholders (e.g. role, channel, server, target)..." oninput="const q=this.value.toLowerCase(); document.querySelectorAll('#${drawerId} .ph-ref-row').forEach(r => r.style.display = r.dataset.search.includes(q) ? 'flex' : 'none');" style="width:100%;margin-bottom:6px;padding:6px 9px;font-size:12px;" />
          <div style="max-height:260px;overflow-y:auto;border:1px solid #2e2e35;border-radius:5px;">
            ${groupedRowsHtml}
          </div>
        </div>
      </details>
    `;
  }

  function renderActionFields(type, data = {}) {
    const container = document.getElementById('action-dynamic-fields');
    if (!container) return;
    container.innerHTML = '';

    const actionDefs = window.actionDefinitions || [];
    const def = actionDefs.find((d) => d.id === type);
    if (!def || !Array.isArray(def.fields)) return;

    let html = '';
    def.fields.forEach((field) => {
      const rawVal = data[field.id];
      const val = (rawVal !== undefined && rawVal !== null && rawVal !== 'undefined') ? rawVal : '';
      const cleanLabel = String(field.label || '').replace(/\s*\(Placeholders:[^)]+\)/gi, '');
      html += `
        <div style="margin-bottom:14px;">
          <label style="display:block;margin-bottom:5px;font-size:11px;font-weight:700;text-transform:uppercase;color:#a1a1aa;">${cleanLabel}</label>
      `;
      if (field.type === 'boolean') {
        html += `<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;color:#ececef;">
          <input type="checkbox" id="act-f-${field.id}" ${val ? 'checked' : ''} style="width:16px;height:16px;accent-color:#71717a;cursor:pointer;"> Enabled
        </label>`;
      } else if (field.type === 'select') {
        const options = Array.isArray(field.options) ? field.options : [];
        html += `<select id="act-f-${field.id}" style="width:100%;box-sizing:border-box;">
          ${options.map(opt => `<option value="${opt.value}" ${String(val) === String(opt.value) ? 'selected' : ''}>${opt.label}</option>`).join('')}
        </select>`;
      } else if (field.type === 'number') {
        html += `<input type="number" id="act-f-${field.id}" value="${val}" placeholder="${cleanLabel}..." style="width:100%;box-sizing:border-box;" />`;
      } else if (field.type === 'textarea') {
        html += `<textarea id="act-f-${field.id}" rows="4" placeholder="${cleanLabel}..." style="width:100%;box-sizing:border-box;font-family:inherit;">${String(val).replace(/"/g, '&quot;')}</textarea>`;
        html += buildPlaceholderHelper(`act-f-${field.id}`);
      } else {
        html += `<input type="text" id="act-f-${field.id}" value="${String(val).replace(/"/g, '&quot;')}" placeholder="${cleanLabel}..." style="width:100%;box-sizing:border-box;" />`;
        const imageFieldIds = new Set(['iconUrl', 'thumbnail', 'image', 'avatarUrl', 'footerIcon']);
        const messageFieldIds = new Set([
          'message', 'content', 'title', 'name', 'value', 'footerText',
          'reason', 'errorMsg', 'failMessage', 'cooldownMsg',
          'addMsg', 'removeMsg', 'replyMsg', 'nickname', 'channelName', 'newName',
          'threadName', 'topic', 'username', 'activityText', 'text',
          'placeholder', 'key', 'defaultValue', 'leftValue', 'rightValue',
          'url', 'headers', 'body', 'jsonPath'
        ]);
        if (imageFieldIds.has(field.id)) {
          const imgChips = [
            { tag: '{target.avatar}', desc: 'Target User Avatar / PFP' },
            { tag: '{author.avatar}', desc: 'Command Author Avatar / PFP' },
            { tag: '{server.icon}', desc: 'Server Logo / Icon' },
            { tag: '{bot.avatar}', desc: 'Bot Logo / Avatar' }
          ].map(p => `<span class="placeholder-chip" title="${p.desc}" onclick="const el=document.getElementById('act-f-${field.id}'); if(el){ el.value = '${p.tag}'; el.focus(); }" style="padding:3px 7px; border-radius:4px; font-size:11px; cursor:pointer;">${p.tag}</span>`).join('');
          html += `<div style="margin-top:6px; display:flex; flex-wrap:wrap; align-items:center; gap:4px;"><span style="font-size:11px;color:#8e8e98;margin-right:2px;">Quick Logo / PFP:</span>${imgChips}</div>`;
        } else if (messageFieldIds.has(field.id) && type !== 'slash_command' && type !== 'prefix_command' && !type.endsWith('_argument')) {
          html += buildPlaceholderHelper(`act-f-${field.id}`);
        }
      }
      html += `</div>`;
    });

    container.innerHTML = html;
  }

  function getFormData() {
    const data = {};
    const container = document.getElementById('action-dynamic-fields');
    if (!container) return data;

    container.querySelectorAll('input, textarea, select').forEach((input) => {
      const fieldId = input.id.replace('act-f-', '');
      if (input.type === 'checkbox') {
        data[fieldId] = input.checked;
      } else if (input.type === 'number') {
        data[fieldId] = parseFloat(input.value) || 0;
      } else {
        data[fieldId] = input.value;
      }
    });
    return data;
  }

  function buildSummary(data) {
    return Object.entries(data)
      .filter(([, v]) => v !== '' && v !== false)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ')
      .slice(0, 80);
  }

  let activeModalMode = 'command';

  window.openActionModal = async function (actionIdx = -1, mode = 'command') {
    const state = getAppState();
    activeModalMode = mode;
    const targetIdx = mode === 'event' ? state.selectedEvent : state.selectedCommand;
    if (targetIdx === null || targetIdx === undefined || targetIdx < 0) return;

    editingActionIdx = actionIdx === null ? -1 : actionIdx;
    const modal = document.getElementById('action-modal');
    if (!modal) return;

    const trigger = document.getElementById('action-dropdown-trigger');
    const menu = document.getElementById('action-dropdown-menu');
    const label = document.getElementById('action-dropdown-label');
    const typeInput = document.getElementById('selected-action-type');
    const titleEl = document.getElementById('action-modal-title');

    if (mode === 'event') {
      const rawEventDefs = await window.ipcRenderer.invoke('get-event-definitions');
      window.actionDefinitions = Array.isArray(rawEventDefs) ? rawEventDefs : [];
    } else {
      const rawActionDefs = await window.ipcRenderer.invoke('get-action-definitions');
      window.actionDefinitions = Array.isArray(rawActionDefs) ? rawActionDefs : [];
    }

    const defaultDef = window.actionDefinitions[0] || { id: 'send_message', name: 'Send Message', description: '' };
    const cmd = mode === 'event' ? state.events[state.selectedEvent] : state.commands[state.selectedCommand];
    let actionData = {};
    let selectedType = defaultDef.id;

    if (editingActionIdx >= 0 && cmd && cmd.actions[editingActionIdx]) {
      const act = cmd.actions[editingActionIdx];
      selectedType = normalizeId(act.type);
      actionData = act.data || {};
      const found = window.actionDefinitions.find((a) => a.id === selectedType);
      if (titleEl) titleEl.textContent = 'Edit Action';
      if (label) label.textContent = found ? found.name : (act.label || selectedType);
      if (typeInput) typeInput.value = selectedType;
    } else {
      if (titleEl) titleEl.textContent = 'Add Action';
      if (label) label.textContent = defaultDef.name;
      if (typeInput) typeInput.value = defaultDef.id;
    }

    const modalCard = modal.firstElementChild;
    if (modalCard) {
      modalCard.classList.add('studio-action-modal');
      let bodySplit = modalCard.querySelector('.action-modal-split');
      const dropdownWrap = document.getElementById('custom-action-dropdown');
      const fieldsWrap = document.getElementById('action-dynamic-fields');
      const saveBtnEl = document.getElementById('save-action-btn');
      const footerRow = saveBtnEl ? saveBtnEl.parentElement : null;

      if (!bodySplit && dropdownWrap && fieldsWrap) {
        bodySplit = document.createElement('div');
        bodySplit.className = 'action-modal-split';

        const leftSidebar = document.createElement('div');
        leftSidebar.id = 'action-picker-sidebar';
        leftSidebar.className = 'action-picker-sidebar';

        const rightPane = document.createElement('div');
        rightPane.className = 'action-config-pane';

        // Move any label right above custom-action-dropdown into rightPane too
        const prevLabel = dropdownWrap.previousElementSibling;
        if (prevLabel && prevLabel.tagName === 'LABEL') {
          rightPane.appendChild(prevLabel);
        }
        rightPane.appendChild(dropdownWrap);

        const descBanner = document.createElement('div');
        descBanner.id = 'selected-action-desc';
        descBanner.className = 'selected-action-desc';
        rightPane.appendChild(descBanner);
        rightPane.appendChild(fieldsWrap);

        bodySplit.appendChild(leftSidebar);
        bodySplit.appendChild(rightPane);

        if (footerRow && footerRow.parentNode === modalCard) {
          modalCard.insertBefore(bodySplit, footerRow);
        } else {
          modalCard.appendChild(bodySplit);
        }
      }

      if (footerRow) {
        footerRow.style.cssText = 'flex:0 0 auto;margin-top:12px;padding-top:10px;border-top:1px solid #383840;display:flex;justify-content:flex-end;gap:8px;width:100%;';
      }

      const leftSidebar = document.getElementById('action-picker-sidebar');
      const descBanner = document.getElementById('selected-action-desc');

      const updateDescBanner = (typeId) => {
        const found = window.actionDefinitions.find((a) => a.id === typeId);
        if (descBanner) {
          descBanner.textContent = found?.description || 'Configure the fields below for this action.';
        }
      };
      updateDescBanner(selectedType);

      if (leftSidebar) {
        leftSidebar.innerHTML = `
          <div class="dropdown-search-wrap" style="position:sticky;top:0;z-index:5;padding:10px;">
            <input type="text" id="action-sidebar-search" placeholder="Search actions..." style="width:100%;box-sizing:border-box;">
          </div>
          <div id="action-sidebar-list" style="flex:1 1 auto;min-height:0;overflow-y:auto;padding:6px;"></div>
        `;

        const searchInput = document.getElementById('action-sidebar-search');
        const listBox = document.getElementById('action-sidebar-list');

        const renderSidebarItems = (filter = '') => {
          listBox.innerHTML = '';
          const categories = {};
          window.actionDefinitions.forEach((item) => {
            const cat = item.category || 'General';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(item);
          });

          Object.keys(categories).forEach((cat) => {
            const filtered = categories[cat].filter(
              (i) =>
                i.name.toLowerCase().includes(filter.toLowerCase()) ||
                (i.description && i.description.toLowerCase().includes(filter.toLowerCase()))
            );
            if (filtered.length === 0) return;

            const catHeader = document.createElement('div');
            catHeader.className = 'dropdown-category';
            catHeader.textContent = cat;
            listBox.appendChild(catHeader);

            filtered.forEach((item) => {
              const opt = document.createElement('div');
              const isCurr = (typeInput?.value || selectedType) === item.id;
              opt.className = 'dropdown-option' + (isCurr ? ' active' : '');
              opt.style.cssText = 'padding:8px 10px;cursor:pointer;border-radius:5px;margin:2px 4px;display:block;';
              opt.innerHTML = `<div style="font-size:13px;font-weight:600;">${item.name}</div><div style="font-size:11px;opacity:0.7;margin-top:2px;">${item.description || ''}</div>`;
              opt.onclick = (ev) => {
                ev.stopPropagation();
                if (label) label.textContent = item.name;
                if (typeInput) typeInput.value = item.id;
                updateDescBanner(item.id);
                renderActionFields(item.id, {});
                renderSidebarItems(searchInput.value);
                leftSidebar.style.display = 'none';
              };
              listBox.appendChild(opt);
            });
          });
        };

        searchInput.oninput = (ev) => renderSidebarItems(ev.target.value);
        renderSidebarItems('');

leftSidebar.style.display = editingActionIdx >= 0 ? 'none' : 'flex';
if (trigger) {
trigger.onclick = (e) => {
e.stopPropagation();
const isOpen = leftSidebar.style.display !== 'none';
leftSidebar.style.display = isOpen ? 'none' : 'flex';
if (!isOpen) setTimeout(() => searchInput.focus(), 10);
};
}
if (editingActionIdx < 0) {
setTimeout(() => searchInput.focus(), 20);
}
}
}
if (menu) menu.style.display = 'none';
renderActionFields(selectedType, actionData);
modal.style.display = 'flex';
};
const modal = document.getElementById('action-modal');
const closeBtn = document.getElementById('close-action-modal');
const cancelBtn = document.getElementById('cancel-action-btn');
const saveBtn = document.getElementById('save-action-btn');
if (closeBtn) closeBtn.onclick = () => { if (modal) modal.style.display = 'none'; };
if (cancelBtn) cancelBtn.onclick = () => { if (modal) modal.style.display = 'none'; };
if (saveBtn) {
saveBtn.onclick = () => {
const state = getAppState();
const isEvent = activeModalMode === 'event';
const targetIdx = isEvent ? state.selectedEvent : state.selectedCommand;
if (targetIdx === null || targetIdx === undefined || targetIdx < 0) return;
const selectedType = document.getElementById('selected-action-type')?.value || 'send_message';
const foundDef = (window.actionDefinitions || []).find((a) => a.id === selectedType);
const actionLabel = foundDef ? foundDef.name : (document.getElementById('action-dropdown-label')?.textContent || selectedType);
const data = getFormData();
const summary = buildSummary(data);
const targetObj = isEvent ? state.events[targetIdx] : state.commands[targetIdx];
if (!targetObj) return;
if (!Array.isArray(targetObj.actions)) targetObj.actions = [];

      if (selectedType === 'create_full_embed' && editingActionIdx < 0) {
        const presetActions = [
          {
            type: 'create_embed',
            label: 'Create Embed',
            data: {
              channelId: '',
              content: '',
              color: '#2b82d9',
              ephemeral: false
            },
            summary: 'color: #2b82d9'
          },
          {
            type: 'embed_author',
            label: 'Embed Author (Top-Left Logo & Name)',
            data: { name: '', iconUrl: '', url: '' },
            summary: ''
          },
          {
            type: 'embed_title',
            label: 'Embed Title',
            data: { title: '', url: '' },
            summary: ''
          },
          {
            type: 'send_message',
            label: 'Send Message',
            data: { message: '', ephemeral: false },
            summary: ''
          },
          {
            type: 'embed_field',
            label: 'Embed Section / Field',
            data: { name: '', value: '', inline: false },
            summary: ''
          },
          {
            type: 'embed_media',
            label: 'Embed Image / Thumbnail',
            data: { thumbnail: '', image: '' },
            summary: ''
          },
          {
            type: 'embed_footer',
            label: 'Embed Footer',
            data: { text: '', iconUrl: '' },
            summary: ''
          },
          {
            type: 'embed_timestamp',
            label: 'Embed Date & Time Stamp',
            data: { enabled: true },
            summary: 'enabled: true'
          }
        ];
        targetObj.actions.push(...presetActions);

} else {
const actionObj = { type: selectedType, label: actionLabel, data, summary };
if (editingActionIdx >= 0) {
targetObj.actions[editingActionIdx] = actionObj;
} else {
targetObj.actions.push(actionObj);
}
}
if (modal) modal.style.display = 'none';
if (isEvent) {
if (typeof window.renderEventActionTable === 'function') window.renderEventActionTable();
} else {
if (typeof window.renderActionTable === 'function') window.renderActionTable();
if (typeof window.renderActionList === 'function') window.renderActionList();
}
};
}
})();