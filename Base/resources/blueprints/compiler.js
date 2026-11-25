const EMBED_CHILD_TYPES = ['embed_author', 'embed_title', 'send_message', 'embed_field', 'embed_media', 'embed_footer', 'embed_timestamp'];

function compileEmbedContainer(flatActions, startIndex, indent, isEvent) {
  const d = flatActions[startIndex].data || {};
  let out = `${indent}{\n`;
  out += `${indent}  const __safeUrl = (u) => { const s = String(u || '').trim(); return /^https?:\\/\\//i.test(s) ? s : undefined; };\n`;
  out += `${indent}  const __embed = new EmbedBuilder().setColor(${JSON.stringify(d.color || '#2b82d9')});\n`;
  out += `${indent}  let __hasEmbedBody = false;\n`;

  let j = startIndex + 1;
  while (j < flatActions.length && EMBED_CHILD_TYPES.includes(flatActions[j].type)) {
    const child = flatActions[j];
    const cd = child.data || {};
    if (child.type === 'embed_author') {
      out += `${indent}  {\n`;
      out += `${indent}    const __aName = await __formatText(${JSON.stringify(cd.name || '')});\n`;
      out += `${indent}    const __aIcon = __safeUrl(await __formatText(${JSON.stringify(cd.iconUrl || '')}));\n`;
      out += `${indent}    const __aUrl = __safeUrl(await __formatText(${JSON.stringify(cd.url || '')}));\n`;
      out += `${indent}    if (__aName || __aIcon) __embed.setAuthor({ name: __aName || '\\u200B', iconURL: __aIcon, url: __aUrl });\n`;
      out += `${indent}  }\n`;
    } else if (child.type === 'embed_title') {
      out += `${indent}  {\n`;
      out += `${indent}    const __tStr = await __formatText(${JSON.stringify(cd.title || '')});\n`;
      out += `${indent}    if (__tStr) __embed.setTitle(__tStr);\n`;
      out += `${indent}    const __tUrl = __safeUrl(await __formatText(${JSON.stringify(cd.url || '')}));\n`;
      out += `${indent}    if (__tUrl) __embed.setURL(__tUrl);\n`;
      out += `${indent}  }\n`;
    } else if (child.type === 'send_message') {
      out += `${indent}  __hasEmbedBody = true;\n`;
      out += `${indent}  __embed.setDescription((await __formatText(${JSON.stringify(cd.message || '')})) || '\\u200B');\n`;
    } else if (child.type === 'embed_field') {
      out += `${indent}  __hasEmbedBody = true;\n`;
      out += `${indent}  __embed.addFields({ name: (await __formatText(${JSON.stringify(cd.name || '\u200B')})) || '\\u200B', value: (await __formatText(${JSON.stringify(cd.value || '\u200B')})) || '\\u200B', inline: Boolean(${!!cd.inline}) });\n`;
    } else if (child.type === 'embed_media') {
      if (cd.thumbnail) out += `${indent}  { const __th = __safeUrl(await __formatText(${JSON.stringify(cd.thumbnail)})); if (__th) __embed.setThumbnail(__th); }\n`;
      if (cd.image) out += `${indent}  { const __im = __safeUrl(await __formatText(${JSON.stringify(cd.image)})); if (__im) __embed.setImage(__im); }\n`;
    } else if (child.type === 'embed_footer') {
      out += `${indent}  {\n`;
      out += `${indent}    const __fTxt = await __formatText(${JSON.stringify(cd.text || '')});\n`;
      out += `${indent}    const __fIcon = __safeUrl(await __formatText(${JSON.stringify(cd.iconUrl || '')}));\n`;
      out += `${indent}    if (__fTxt || __fIcon) __embed.setFooter({ text: __fTxt || '\\u200B', iconURL: __fIcon });\n`;
      out += `${indent}  }\n`;
    }
 else if (child.type === 'embed_timestamp') {
      out += `${indent}  __embed.setTimestamp();\n`;
    }
    j++;
  }

  out += `${indent}  if (!__hasEmbedBody) __embed.setDescription('\\u200B');\n`;
  out += `${indent}  const __opts = { embeds: [__embed], allowedMentions: { parse: ['users', 'roles'] } };\n`;
  if (d.content) out += `${indent}  __opts.content = await __formatText(${JSON.stringify(d.content)});\n`;
  if (d.ephemeral && !isEvent) out += `${indent}  __opts.flags = MessageFlags.Ephemeral;\n`;

  out += `${indent}  const __targetChId = await __formatText(${JSON.stringify(d.channelId || '')});\n`;
  out += `${indent}  if (__targetChId) {\n`;
  out += `${indent}    const __ch = guild ? guild.channels.cache.get(__targetChId) : client?.channels?.cache?.get(__targetChId);\n`;
  out += `${indent}    if (__ch && __ch.send) await __ch.send(__opts).catch(() => null);\n`;
  out += `${indent}  } else {\n`;
  if (isEvent) {
    out += `${indent}    const __evCh = message?.channel || (arg1?.channelId ? (guild?.channels?.cache?.get(arg1.channelId) || client?.channels?.cache?.get(arg1.channelId)) : null);\n`;
    out += `${indent}    if (__evCh && __evCh.send) await __evCh.send(__opts).catch(() => null);\n`;
  } else {
    out += `${indent}    if (interaction) {\n`;
    out += `${indent}      if (interaction.deferred && !interaction.replied) await interaction.editReply(__opts);\n`;
    out += `${indent}      else if (interaction.replied) await interaction.followUp(__opts);\n`;
    out += `${indent}      else await (interaction.deferred && !interaction.replied ? interaction.editReply : interaction.reply).call(interaction, __opts);\n`;
    out += `${indent}    } else if (message) await message.reply(__opts);\n`;
  }
  out += `${indent}  }\n`;
  out += `${indent}}\n`;

  return { code: out, nextIndex: j - 1 };
}

function compileDmContainer(flatActions, startIndex, indent) {
  let out = `${indent}{\n`;
  out += `${indent}  const __dmUid = lastAffectedUserId || targetUserId || executorMember?.id;\n`;
  out += `${indent}  const __dmUser = __dmUid ? await client.users.fetch(__dmUid).catch(() => null) : null;\n`;
  out += `${indent}  if (__dmUser) {\n`;

  let j = startIndex + 1;
  while (j < flatActions.length) {
    const child = flatActions[j];
    const cd = child.data || {};

    if (child.type === 'send_message') {
      out += `${indent}    const __dmMsg = await __formatText(${JSON.stringify(cd.message || '')});\n`;
      out += `${indent}    if (__dmMsg) await __dmUser.send({ content: __dmMsg }).catch(() => null);\n`;
      j++;
    } else if (child.type === 'create_embed') {
      out += `${indent}    {\n`;
      out += `${indent}      const __embed = new EmbedBuilder().setColor(${JSON.stringify(cd.color || '#2b82d9')});\n`;
      out += `${indent}      let __hasEmbedBody = false;\n`;
      let k = j + 1;
      while (k < flatActions.length && EMBED_CHILD_TYPES.includes(flatActions[k].type)) {
        const sub = flatActions[k];
        const sd = sub.data || {};
        if (sub.type === 'embed_title') {
          out += `${indent}      __embed.setTitle(await __formatText(${JSON.stringify(sd.title || '')}));\n`;
          if (sd.url) out += `${indent}      __embed.setURL(${JSON.stringify(sd.url)});\n`;
        } else if (sub.type === 'send_message') {
          out += `${indent}      __hasEmbedBody = true;\n`;
          out += `${indent}      __embed.setDescription(await __formatText(${JSON.stringify(sd.message || '')}));\n`;
        } else if (sub.type === 'embed_field') {
          out += `${indent}      __hasEmbedBody = true;\n`;
          out += `${indent}      __embed.addFields({ name: await __formatText(${JSON.stringify(sd.name || '\u200B')}), value: await __formatText(${JSON.stringify(sd.value || '\u200B')}), inline: Boolean(${!!sd.inline}) });\n`;
        } else if (sub.type === 'embed_media') {
          if (sd.thumbnail) out += `${indent}      __embed.setThumbnail(await __formatText(${JSON.stringify(sd.thumbnail)}));\n`;
          if (sd.image) out += `${indent}      __embed.setImage(await __formatText(${JSON.stringify(sd.image)}));\n`;
        } else if (sub.type === 'embed_footer') {
          out += `${indent}      __embed.setFooter({ text: await __formatText(${JSON.stringify(sd.text || '\u200B')}), iconURL: await __formatText(${JSON.stringify(sd.iconUrl || '')}) || undefined });\n`;
        } else if (sub.type === 'embed_timestamp') {
          out += `${indent}      __embed.setTimestamp();\n`;
        }
        k++;
      }
      out += `${indent}      if (!__hasEmbedBody) __embed.setDescription('\\u200B');\n`;
      out += `${indent}      const __dmOpts = { embeds: [__embed] };\n`;
      if (cd.content) out += `${indent}      __dmOpts.content = await __formatText(${JSON.stringify(cd.content)});\n`;
      out += `${indent}      await __dmUser.send(__dmOpts).catch(() => null);\n`;
      out += `${indent}    }\n`;
      j = k;
    } else {
      break;
    }
  }

  out += `${indent}  }\n`;
  out += `${indent}}\n`;
  return { code: out, nextIndex: j - 1 };
}

function compileExtraAction(a, indent, isEvent) {
  const d = a.data || {};
  switch (a.type) {
    case 'create_ticket_channel': {
      const chType = String(d.channelType || 'text').toLowerCase() === 'voice' ? 'ChannelType.GuildVoice' : 'ChannelType.GuildText';
      const staffIds = String(d.staffRoleIds || '').split(',').map((s) => s.trim()).filter(Boolean);
      let out = `${indent}{\n`;
      out += `${indent}  const __name = await __formatText(${JSON.stringify(d.channelName || 'ticket-{target.name}')}).toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, 90) || 'ticket';\n`;
      out += `${indent}  const __catId = await __formatText(${JSON.stringify(d.categoryId || '')}) || undefined;\n`;
      out += `${indent}  const __uid = lastAffectedUserId || targetUserId || executorMember?.id;\n`;
      out += `${indent}  const __overwrites = [];\n`;
      out += `${indent}  if (guild?.roles?.everyone) __overwrites.push({ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] });\n`;
      out += `${indent}  if (__uid) __overwrites.push({ id: __uid, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] });\n`;
      out += `${indent}  if (client?.user?.id) __overwrites.push({ id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] });\n`;
      out += `${indent}  for (const __rid of ${JSON.stringify(staffIds)}) {\n`;
      out += `${indent}    if (guild?.roles?.cache?.has(__rid)) __overwrites.push({ id: __rid, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] });\n`;
      out += `${indent}  }\n`;
      out += `${indent}  if (guild) {\n`;
      out += `${indent}    const __created = await guild.channels.create({ name: __name, type: ${chType}, parent: __catId, topic: await __formatText(${JSON.stringify(d.topic || '')}) || undefined, permissionOverwrites: __overwrites }).catch(() => null);\n`;
      out += `${indent}    if (__created) resolvedOptions['created_channel_id'] = __created.id;\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
      case 'db_lookup_row': {
      const tbl = String(d.table || 'users').replace(/[^a-zA-Z0-9_]/g, '');
      const col = String(d.matchColumn || 'discord_id').replace(/[^a-zA-Z0-9_]/g, '');
      const nfTpl = d.notFoundMsg || 'No matching record was found in the database.';
      let out = `${indent}{\n`;
      if (!isEvent) {
        out += `${indent}  if (typeof interaction !== 'undefined' && interaction && !interaction.deferred && !interaction.replied) await interaction.deferReply().catch(() => null);\n`;
      }
      out += `${indent}  const __mVal = await __formatText(${JSON.stringify(d.matchValue || '{target.id}')});\n`;
      out += `${indent}  const __res = await dbMiddleware.query(\`SELECT * FROM \\\`${tbl}\\\` WHERE \\\`${col}\\\` = ? LIMIT 1\`, [__mVal]);\n`;
      out += `${indent}  const __row = (Array.isArray(__res?.rows) && __res.rows.length > 0) ? __res.rows[0] : null;\n`;
      out += `${indent}  if (!__row) {\n`;
      if (!isEvent) {
        out += `${indent}    const __nf = await __formatText(${JSON.stringify(nfTpl)});\n`;
        out += `${indent}    if (typeof interaction !== 'undefined' && interaction) {\n`;
        out += `${indent}      if (interaction.deferred || interaction.replied) await interaction.editReply({ content: __nf }).catch(() => null);\n`;
        out += `${indent}      else await (interaction.deferred && !interaction.replied ? interaction.editReply : interaction.reply).call(interaction, { content: __nf, flags: MessageFlags.Ephemeral }).catch(() => null);\n`;
        out += `${indent}    } else if (message) await message.reply(__nf).catch(() => null);\n`;
      }
      out += `${indent}    return;\n`;
      out += `${indent}  }\n`;
      out += `${indent}  const __cacheUid = lastAffectedUserId || targetUserId || executorMember?.id || __mVal;\n`;
      out += `${indent}  __dbRowCache[\`${tbl}:\${__cacheUid}\`] = __row;\n`;

      out += `${indent}  for (const [__k, __v] of Object.entries(__row)) {\n`;
      out += `${indent}    resolvedOptions[\`database.${tbl}.\${__k}\`] = (__v !== null && __v !== undefined) ? String(__v) : 'None';\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'delete_channel': {
      const delayMs = (Number(d.delaySeconds) || 0) * 1000;
      let out = `${indent}{\n`;
      out += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')}) || ${isEvent ? 'message?.channelId || arg1?.channelId' : 'interaction?.channelId || message?.channelId'};\n`;
      out += `${indent}  const __ch = __chId ? (guild?.channels?.cache?.get(__chId) || client?.channels?.cache?.get(__chId)) : null;\n`;
      if (delayMs > 0) out += `${indent}  await new Promise((r) => setTimeout(r, ${delayMs}));\n`;
      out += `${indent}  if (__ch && __ch.delete) await __ch.delete().catch(() => null);\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'rename_channel': {
      let out = `${indent}{\n`;
      out += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')}) || ${isEvent ? 'message?.channelId' : 'interaction?.channelId || message?.channelId'};\n`;
      out += `${indent}  const __ch = __chId ? (guild?.channels?.cache?.get(__chId) || client?.channels?.cache?.get(__chId)) : null;\n`;
      out += `${indent}  const __newName = await __formatText(${JSON.stringify(d.newName || '')});\n`;
      out += `${indent}  if (__ch && __ch.setName && __newName) await __ch.setName(__newName).catch(() => null);\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'set_slowmode': {
      const secs = Math.max(0, Math.min(21600, Number(d.seconds) || 0));
      let out = `${indent}{\n`;
      out += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')}) || ${isEvent ? 'message?.channelId' : 'interaction?.channelId || message?.channelId'};\n`;
      out += `${indent}  const __ch = __chId ? (guild?.channels?.cache?.get(__chId) || client?.channels?.cache?.get(__chId)) : null;\n`;
      out += `${indent}  if (__ch && __ch.setRateLimitPerUser) await __ch.setRateLimitPerUser(${secs}).catch(() => null);\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'create_thread': {
      const archive = [60, 1440, 4320, 10080].includes(Number(d.autoArchiveMinutes)) ? Number(d.autoArchiveMinutes) : 1440;
      let out = `${indent}{\n`;
      out += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')}) || ${isEvent ? 'message?.channelId' : 'interaction?.channelId || message?.channelId'};\n`;
      out += `${indent}  const __ch = __chId ? (guild?.channels?.cache?.get(__chId) || client?.channels?.cache?.get(__chId)) : null;\n`;
      out += `${indent}  const __tName = await __formatText(${JSON.stringify(d.threadName || 'Discussion')}).slice(0, 100);\n`;
      out += `${indent}  if (__ch && __ch.threads?.create) {\n`;
      out += `${indent}    const __th = await __ch.threads.create({ name: __tName, autoArchiveDuration: ${archive} }).catch(() => null);\n`;
      out += `${indent}    if (__th) resolvedOptions['created_thread_id'] = __th.id;\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'delete_trigger_message': {
      return `${indent}if (message && message.deletable) await message.delete().catch(() => null);\n`;
    }
    case 'add_reactions': {
      const emojis = String(d.emojis || '').split(',').map((s) => s.trim()).filter(Boolean);
      let out = `${indent}{\n`;
      out += `${indent}  const __targetMsg = message || (typeof interaction !== 'undefined' && interaction?.replied ? await interaction.fetchReply().catch(() => null) : null);\n`;
      out += `${indent}  if (__targetMsg && __targetMsg.react) {\n`;
      out += `${indent}    for (const __em of ${JSON.stringify(emojis)}) await __targetMsg.react(__em).catch(() => null);\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'set_bot_status': {
      const status = String(d.status || 'online').toLowerCase();
      const actType = String(d.activityType || 'Playing').toLowerCase();
      const actMap = { playing: 'ActivityType.Playing', watching: 'ActivityType.Watching', listening: 'ActivityType.Listening', competing: 'ActivityType.Competing' };
      let out = `${indent}if (client?.user) {\n`;
      out += `${indent}  const __actText = await __formatText(${JSON.stringify(d.activityText || '')});\n`;
      out += `${indent}  client.user.setPresence({ status: ${JSON.stringify(status)}, activities: __actText ? [{ name: __actText, type: ${actMap[actType] || 'ActivityType.Playing'} }] : [] });\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'console_log': {
      return `${indent}console.log('[Bot Log]: ' + await __formatText(${JSON.stringify(d.text || '')}));\n`;
    }
    case 'pin_message': {
      let out = `${indent}{\n`;
      out += `${indent}  const __targetMsg = message || (typeof interaction !== 'undefined' && interaction?.replied ? await interaction.fetchReply().catch(() => null) : null);\n`;
      out += `${indent}  if (__targetMsg && __targetMsg.pin) await __targetMsg.pin().catch(() => null);\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'send_webhook': {
      let out = `${indent}{\n`;
      out += `${indent}  const __url = await __formatText(${JSON.stringify(d.webhookUrl || '')});\n`;
      out += `${indent}  if (__url) {\n`;
      out += `${indent}    const __wh = new WebhookClient({ url: __url });\n`;
      out += `${indent}    const __whOpts = {};\n`;
      if (d.username) out += `${indent}    __whOpts.username = await __formatText(${JSON.stringify(d.username)});\n`;
      if (d.avatarUrl) out += `${indent}    __whOpts.avatarURL = await __formatText(${JSON.stringify(d.avatarUrl)});\n`;
      if (d.title) {
        out += `${indent}    const __eb = new EmbedBuilder().setColor(${JSON.stringify(d.color || '#2b82d9')}).setTitle(await __formatText(${JSON.stringify(d.title)})).setDescription(await __formatText(${JSON.stringify(d.message || '')}) || '\\u200B').setTimestamp();\n`;
        out += `${indent}    __whOpts.embeds = [__eb];\n`;
      } else {
        out += `${indent}    __whOpts.content = await __formatText(${JSON.stringify(d.message || '')});\n`;
      }
      out += `${indent}    await __wh.send(__whOpts).catch(() => null);\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'move_voice_member': {
      let out = `${indent}{\n`;
      out += `${indent}  const __vcId = await __formatText(${JSON.stringify(d.channelId || '')});\n`;
      out += `${indent}  const __m = (lastAffectedUserId && guild ? await guild.members.fetch(lastAffectedUserId).catch(() => null) : null) || executorMember;\n`;
      out += `${indent}  if (__m && __m.voice?.channel && __vcId) await __m.voice.setChannel(__vcId).catch(() => null);\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'disconnect_voice_member': {
      let out = `${indent}{\n`;
      out += `${indent}  const __m = (lastAffectedUserId && guild ? await guild.members.fetch(lastAffectedUserId).catch(() => null) : null) || executorMember;\n`;
      out += `${indent}  if (__m && __m.voice?.channel) await __m.voice.disconnect().catch(() => null);\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'voice_mute_deafen': {
      const mVal = String(d.mute || 'skip').trim().toLowerCase();
      const dVal = String(d.deafen || 'skip').trim().toLowerCase();
      let out = `${indent}{\n`;
      out += `${indent}  const __m = (lastAffectedUserId && guild ? await guild.members.fetch(lastAffectedUserId).catch(() => null) : null) || executorMember;\n`;
      out += `${indent}  if (__m && __m.voice?.channel) {\n`;
      if (mVal === 'true' || mVal === 'false') out += `${indent}    await __m.voice.setMute(${mVal === 'true'}).catch(() => null);\n`;
      if (dVal === 'true' || dVal === 'false') out += `${indent}    await __m.voice.setDeaf(${dVal === 'true'}).catch(() => null);\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'temp_role': {
      let out = `${indent}{\n`;
      out += `${indent}  const __rawRole = await __formatText(${JSON.stringify(d.roleId || '')});\n`;
      out += `${indent}  const __rId = __rawRole.replace(/[<@&>]/g, '').trim() || targetRoleId;\n`;
      out += `${indent}  const __rawDur = (await __formatText(${JSON.stringify(d.duration || '10m')})).trim();\n`;
      out += `${indent}  const __dm = __rawDur.match(/^(\\d+(?:\\.\\d+)?)\\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|week|weeks)?$/i);\n`;
      out += `${indent}  const __dNum = __dm ? parseFloat(__dm[1]) : 10;\n`;
      out += `${indent}  const __dUnit = (__dm?.[2] || 'm').toLowerCase();\n`;
      out += `${indent}  const __dMult = __dUnit.startsWith('s') ? 1000 : __dUnit.startsWith('h') ? 3600000 : __dUnit.startsWith('d') ? 86400000 : __dUnit.startsWith('w') ? 604800000 : 60000;\n`;
      out += `${indent}  const __ms = Math.max(1000, Math.round(__dNum * __dMult));\n`;
      out += `${indent}  lastAffectedRoleId = __rId;\n`;
      out += `${indent}  const __m = (lastAffectedUserId && guild ? await guild.members.fetch(lastAffectedUserId).catch(() => null) : null) || executorMember;\n`;
      out += `${indent}  if (__m && __rId) {\n`;
      out += `${indent}    await __m.roles.add(__rId).catch(() => null);\n`;
      out += `${indent}    setTimeout(async () => {\n`;
      out += `${indent}      const __fresh = await guild.members.fetch(__m.id).catch(() => null);\n`;
      out += `${indent}      if (__fresh && __fresh.roles.cache.has(__rId)) await __fresh.roles.remove(__rId, 'Temporary role expired').catch(() => null);\n`;
      out += `${indent}    }, __ms);\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'create_role': {
      let out = `${indent}if (guild) {\n`;
      out += `${indent}  const __r = await guild.roles.create({ name: await __formatText(${JSON.stringify(d.roleName || 'New Role')}), color: ${JSON.stringify(d.color || '#2b82d9')}, hoist: ${Boolean(d.hoist)}, mentionable: ${Boolean(d.mentionable)} }).catch(() => null);\n`;
      out += `${indent}  if (__r) { resolvedOptions['created_role_id'] = __r.id; lastAffectedRoleId = __r.id; }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'delete_role': {
      let out = `${indent}{\n`;
      out += `${indent}  const __rId = await __formatText(${JSON.stringify(d.roleId || '')});\n`;
      out += `${indent}  const __r = __rId && guild ? (guild.roles.cache.get(__rId) || await guild.roles.fetch(__rId).catch(() => null)) : null;\n`;
      out += `${indent}  if (__r) await __r.delete().catch(() => null);\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'set_variable': {
      const vName = String(d.varName || '').trim();
      if (!vName) return '';
      return `${indent}resolvedOptions[${JSON.stringify(vName)}] = await __formatText(${JSON.stringify(d.value || '')});\n`;
    }
    case 'math_operation': {
      const vName = String(d.varName || 'result').trim();
      const op = String(d.operation || 'add').trim().toLowerCase();
      let out = `${indent}{\n`;
      out += `${indent}  const __a = parseFloat(await __formatText(${JSON.stringify(d.num1 || '0')})) || 0;\n`;
      out += `${indent}  const __b = parseFloat(await __formatText(${JSON.stringify(d.num2 || '0')})) || 0;\n`;
      out += `${indent}  let __res = 0;\n`;
      if (op === 'subtract') out += `${indent}  __res = __a - __b;\n`;
      else if (op === 'multiply') out += `${indent}  __res = __a * __b;\n`;
      else if (op === 'divide') out += `${indent}  __res = __b !== 0 ? (__a / __b) : 0;\n`;
      else if (op === 'random') out += `${indent}  __res = Math.floor(Math.random() * (Math.max(__a, __b) - Math.min(__a, __b) + 1)) + Math.min(__a, __b);\n`;
      else out += `${indent}  __res = __a + __b;\n`;
      out += `${indent}  resolvedOptions[${JSON.stringify(vName)}] = String(__res);\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'if_condition': {
      const op = String(d.operator || 'equals').trim().toLowerCase();
      let out = `${indent}{\n`;
      out += `${indent}  const __l = await __formatText(${JSON.stringify(d.leftValue || '')});\n`;
      out += `${indent}  const __r = await __formatText(${JSON.stringify(d.rightValue || '')});\n`;
      out += `${indent}  let __pass = false;\n`;
      if (op === 'not_equals') out += `${indent}  __pass = __l !== __r;\n`;
      else if (op === 'contains') out += `${indent}  __pass = __l.toLowerCase().includes(__r.toLowerCase());\n`;
      else if (op === 'greater_than') out += `${indent}  __pass = (parseFloat(__l) || 0) > (parseFloat(__r) || 0);\n`;
      else if (op === 'less_than') out += `${indent}  __pass = (parseFloat(__l) || 0) < (parseFloat(__r) || 0);\n`;
      else out += `${indent}  __pass = __l === __r;\n`;
      out += `${indent}  if (!__pass) {\n`;
      if (!isEvent && d.failMessage) {
        out += `${indent}    const __fMsg = await __formatText(${JSON.stringify(d.failMessage)});\n`;
        out += `${indent}    if (typeof interaction !== 'undefined' && interaction) await (interaction.deferred && !interaction.replied ? interaction.editReply : interaction.reply).call(interaction, { content: __fMsg, flags: MessageFlags.Ephemeral }).catch(() => null);\n`;
        out += `${indent}    else if (message) await message.reply(__fMsg).catch(() => null);\n`;
      }
      out += `${indent}    return;\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'cooldown_check': {
      const secs = Math.max(1, Number(d.seconds) || 10);
      const msg = d.cooldownMsg || 'Please wait {remaining}s before using this command again.';
      let out = `${indent}{\n`;
      out += `${indent}  client.__cooldowns = client.__cooldowns || new Map();\n`;
      out += `${indent}  const __cdKey = \`\${module.exports.name}:\${executorMember?.id || 'global'}\`;\n`;
      out += `${indent}  const __expires = client.__cooldowns.get(__cdKey) || 0;\n`;
      out += `${indent}  if (Date.now() < __expires) {\n`;
      out += `${indent}    resolvedOptions['remaining'] = String(Math.ceil((__expires - Date.now()) / 1000));\n`;
      out += `${indent}    const __cdText = await __formatText(${JSON.stringify(msg)});\n`;
      out += `${indent}    if (typeof interaction !== 'undefined' && interaction) await (interaction.deferred && !interaction.replied ? interaction.editReply : interaction.reply).call(interaction, { content: __cdText, flags: MessageFlags.Ephemeral }).catch(() => null);\n`;
      out += `${indent}    else if (message) await message.reply(__cdText).catch(() => null);\n`;
      out += `${indent}    return;\n`;
      out += `${indent}  }\n`;
      out += `${indent}  client.__cooldowns.set(__cdKey, Date.now() + ${secs * 1000});\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'set_bot_status': {
      const status = String(d.status || 'online').toLowerCase();
      const actType = String(d.activityType || 'Playing').toLowerCase();
      const actMap = { playing: 'ActivityType.Playing', watching: 'ActivityType.Watching', listening: 'ActivityType.Listening', competing: 'ActivityType.Competing' };
      let out = `${indent}if (client?.user) {\n`;
      out += `${indent}  const __actText = await __formatText(${JSON.stringify(d.activityText || '')});\n`;
      out += `${indent}  client.user.setPresence({ status: ${JSON.stringify(status)}, activities: __actText ? [{ name: __actText, type: ${actMap[actType] || 'ActivityType.Playing'} }] : [] });\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'send_role_buttons': {
      let out = `${indent}{\n`;
      out += `${indent}  const __rawBtns = String(${JSON.stringify(d.buttons || '')}).split(',').map(s => s.trim()).filter(Boolean);\n`;
      out += `${indent}  const __rows = [];\n`;
      out += `${indent}  let __row = new ActionRowBuilder();\n`;
      out += `${indent}  const __styleMap = { primary: ButtonStyle.Primary, blue: ButtonStyle.Primary, secondary: ButtonStyle.Secondary, gray: ButtonStyle.Secondary, grey: ButtonStyle.Secondary, success: ButtonStyle.Success, green: ButtonStyle.Success, danger: ButtonStyle.Danger, red: ButtonStyle.Danger };\n`;
      out += `${indent}  __rawBtns.forEach((entry, idx) => {\n`;
      out += `${indent}    const [lbl, rId, st] = entry.split(':').map(x => x.trim());\n`;
      out += `${indent}    if (!lbl || !rId) return;\n`;
      out += `${indent}    if (__row.components.length >= 5) { __rows.push(__row); __row = new ActionRowBuilder(); }\n`;
      out += `${indent}    __row.addComponents(new ButtonBuilder().setCustomId(\`dbm_role_btn:\${rId}:\${idx}\`).setLabel(await __formatText(lbl)).setStyle(__styleMap[(st || 'primary').toLowerCase()] || ButtonStyle.Primary));\n`;
      out += `${indent}  });\n`;
      out += `${indent}  if (__row.components.length > 0) __rows.push(__row);\n`;
      out += `${indent}  const __panelTitle = await __formatText(${JSON.stringify(d.title || '')});\n`;
      out += `${indent}  const __embed = new EmbedBuilder().setColor(${JSON.stringify(d.color || '#2b82d9')});\n`;
      out += `${indent}  if (__panelTitle) __embed.setTitle(__panelTitle);\n`;
      out += `${indent}  __embed.setDescription(await __formatText(${JSON.stringify(d.message || 'Click a button below to toggle your roles.')}));\n`;
      out += `${indent}  const __payload = { embeds: [__embed], components: __rows };\n`;
      out += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')});\n`;
      out += `${indent}  if (__chId) {\n`;
      out += `${indent}    const __ch = guild?.channels?.cache?.get(__chId) || client?.channels?.cache?.get(__chId) || await client?.channels?.fetch(__chId).catch(() => null);\n`;
      out += `${indent}    if (__ch && __ch.send) {\n`;
      out += `${indent}      let __alreadyExists = false;\n`;
      out += `${indent}      if (__ch.messages?.fetch) {\n`;
      out += `${indent}        const __recent = await __ch.messages.fetch({ limit: 30 }).catch(() => null);\n`;
      out += `${indent}        if (__recent) {\n`;
      out += `${indent}          __alreadyExists = __recent.some((m) => m.author?.id === client.user?.id && Array.isArray(m.components) && m.components.some((r) => r.components?.some((c) => c.customId?.startsWith('dbm_role_btn:'))) && (!__panelTitle || m.embeds?.[0]?.title === __panelTitle));\n`;
      out += `${indent}        }\n`;
      out += `${indent}      }\n`;
      out += `${indent}      if (!__alreadyExists) await __ch.send(__payload).catch(() => null);\n`;
      out += `${indent}    }\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'send_role_dropdown': {
      let out = `${indent}{\n`;
      out += `${indent}  const __rawOpts = String(${JSON.stringify(d.options || '')}).split(',').map(s => s.trim()).filter(Boolean);\n`;
      out += `${indent}  const __menuOpts = __rawOpts.map((entry, idx) => {\n`;
      out += `${indent}    const [lbl, rId, desc] = entry.split(':').map(x => x.trim());\n`;
      out += `${indent}    if (!lbl || !rId) return null;\n`;
      out += `${indent}    const o = { label: await __formatText(lbl).slice(0, 100), value: \`\${rId}:\${idx}\` };\n`;
      out += `${indent}    if (desc) o.description = await __formatText(desc).slice(0, 100);\n`;
      out += `${indent}    return o;\n`;
      out += `${indent}  }).filter(Boolean).slice(0, 25);\n`;
      out += `${indent}  const __menu = new StringSelectMenuBuilder().setCustomId('dbm_role_select').setPlaceholder(await __formatText(${JSON.stringify(d.placeholder || 'Select a role...')})).setMinValues(1).setMaxValues(Math.max(1, __menuOpts.length)).addOptions(__menuOpts);\n`;
      out += `${indent}  const __row = new ActionRowBuilder().addComponents(__menu);\n`;
      out += `${indent}  const __panelTitle = await __formatText(${JSON.stringify(d.title || '')});\n`;
      out += `${indent}  const __embed = new EmbedBuilder().setColor(${JSON.stringify(d.color || '#2b82d9')});\n`;
      out += `${indent}  if (__panelTitle) __embed.setTitle(__panelTitle);\n`;
      out += `${indent}  __embed.setDescription(await __formatText(${JSON.stringify(d.message || 'Use the dropdown below to toggle your roles.')}));\n`;
      out += `${indent}  const __payload = { embeds: [__embed], components: [__row] };\n`;
      out += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')});\n`;
      out += `${indent}  if (__chId) {\n`;
      out += `${indent}    const __ch = guild?.channels?.cache?.get(__chId) || client?.channels?.cache?.get(__chId) || await client?.channels?.fetch(__chId).catch(() => null);\n`;
      out += `${indent}    if (__ch && __ch.send) {\n`;
      out += `${indent}      let __alreadyExists = false;\n`;
      out += `${indent}      if (__ch.messages?.fetch) {\n`;
      out += `${indent}        const __recent = await __ch.messages.fetch({ limit: 30 }).catch(() => null);\n`;
      out += `${indent}        if (__recent) {\n`;
      out += `${indent}          __alreadyExists = __recent.some((m) => m.author?.id === client.user?.id && Array.isArray(m.components) && m.components.some((r) => r.components?.some((c) => c.customId === 'dbm_role_select')) && (!__panelTitle || m.embeds?.[0]?.title === __panelTitle));\n`;
      out += `${indent}        }\n`;
      out += `${indent}      }\n`;
      out += `${indent}      if (!__alreadyExists) await __ch.send(__payload).catch(() => null);\n`;
      out += `${indent}    }\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'strip_roles': {
      let out = `${indent}{\n`;
      out += `${indent}  const __m = (lastAffectedUserId && guild ? await guild.members.fetch(lastAffectedUserId).catch(() => null) : null) || executorMember;\n`;
      out += `${indent}  const __reason = await __formatText(${JSON.stringify(d.reason || 'Roles stripped by staff')});\n`;
      out += `${indent}  if (__m && guild) {\n`;
      out += `${indent}    const __botHighest = guild.members?.me?.roles?.highest?.position ?? 999;\n`;
      out += `${indent}    const __removable = __m.roles.cache.filter((r) => r.id !== guild.id && !r.managed && r.position < __botHighest);\n`;
      out += `${indent}    if (__removable.size > 0) await __m.roles.remove(__removable, __reason).catch(() => null);\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'store_variable': {
      const scope = String(d.scope || 'temp');
      const vName = String(d.varName || '').trim();
      const op = String(d.operation || 'set');
      if (!vName) return '';
      let out = `${indent}{\n`;
      out += `${indent}  const __rawVal = await __formatText(${JSON.stringify(d.value || '')});\n`;
      out += `${indent}  const __getCur = () => {\n`;
      if (scope === 'temp') {
        out += `${indent}    return resolvedOptions[${JSON.stringify(vName)}] ?? '';\n`;
      } else if (scope === 'server') {
        out += `${indent}    return guild ? dbMiddleware.get('server_vars', \`\${guild.id}:${vName}\`, '') : '';\n`;
      } else {
        out += `${indent}    const __uid = lastAffectedUserId || targetUserId || executorMember?.id || '';\n`;
        out += `${indent}    return (guild && __uid) ? dbMiddleware.get('user_vars', \`\${guild.id}:\${__uid}:${vName}\`, '') : '';\n`;
      }
      out += `${indent}  };\n`;
      out += `${indent}  let __nextVal = __rawVal;\n`;
      if (op === 'add') out += `${indent}  __nextVal = String((parseFloat(__getCur()) || 0) + (parseFloat(__rawVal) || 0));\n`;
      else if (op === 'subtract') out += `${indent}  __nextVal = String((parseFloat(__getCur()) || 0) - (parseFloat(__rawVal) || 0));\n`;
      else if (op === 'multiply') out += `${indent}  __nextVal = String((parseFloat(__getCur()) || 0) * (parseFloat(__rawVal) || 0));\n`;
      else if (op === 'append') out += `${indent}  __nextVal = String(__getCur() || '') + String(__rawVal || '');\n`;
      if (scope === 'temp') {
        out += `${indent}  resolvedOptions[${JSON.stringify(vName)}] = __nextVal;\n`;
      } else if (scope === 'server') {
        out += `${indent}  if (guild) dbMiddleware.set('server_vars', \`\${guild.id}:${vName}\`, __nextVal, 'set');\n`;
      } else {
        out += `${indent}  const __uid = lastAffectedUserId || targetUserId || executorMember?.id || '';\n`;
        out += `${indent}  if (guild && __uid) dbMiddleware.set('user_vars', \`\${guild.id}:\${__uid}:${vName}\`, __nextVal, 'set');\n`;
      }
      out += `${indent}}\n`;
      return out;
    }
    case 'load_variable': {
      const scope = String(d.scope || 'user');
      const vName = String(d.varName || '').trim();
      const saveAs = String(d.saveAs || vName || 'loaded_var').trim();
      if (!vName) return '';
      let out = `${indent}{\n`;
      out += `${indent}  const __def = await __formatText(${JSON.stringify(d.defaultValue || '')});\n`;
      if (scope === 'server') {
        out += `${indent}  resolvedOptions[${JSON.stringify(saveAs)}] = guild ? dbMiddleware.get('server_vars', \`\${guild.id}:${vName}\`, __def) : __def;\n`;
      } else {
        out += `${indent}  const __uid = lastAffectedUserId || targetUserId || executorMember?.id || '';\n`;
        out += `${indent}  resolvedOptions[${JSON.stringify(saveAs)}] = (guild && __uid) ? dbMiddleware.get('user_vars', \`\${guild.id}:\${__uid}:${vName}\`, __def) : __def;\n`;
      }
      out += `${indent}}\n`;
      return out;
    }
    case 'check_variable': {
      const op = String(d.operator || 'equals');
      let out = `${indent}{\n`;
      out += `${indent}  const __l = await __formatText(${JSON.stringify(d.leftValue || '')});\n`;
      out += `${indent}  const __r = await __formatText(${JSON.stringify(d.rightValue || '')});\n`;
      out += `${indent}  let __ok = false;\n`;
      if (op === 'not_equals') out += `${indent}  __ok = __l !== __r;\n`;
      else if (op === 'greater_than') out += `${indent}  __ok = (parseFloat(__l) || 0) > (parseFloat(__r) || 0);\n`;
      else if (op === 'greater_or_equal') out += `${indent}  __ok = (parseFloat(__l) || 0) >= (parseFloat(__r) || 0);\n`;
      else if (op === 'less_than') out += `${indent}  __ok = (parseFloat(__l) || 0) < (parseFloat(__r) || 0);\n`;
      else if (op === 'less_or_equal') out += `${indent}  __ok = (parseFloat(__l) || 0) <= (parseFloat(__r) || 0);\n`;
      else if (op === 'contains') out += `${indent}  __ok = __l.toLowerCase().includes(__r.toLowerCase());\n`;
      else if (op === 'is_empty') out += `${indent}  __ok = __l.trim() === '';\n`;
      else out += `${indent}  __ok = __l === __r;\n`;
      out += `${indent}  if (!__ok) {\n`;
      if (!isEvent && d.failMessage) {
        out += `${indent}    const __fMsg = await __formatText(${JSON.stringify(d.failMessage)});\n`;
        out += `${indent}    if (typeof interaction !== 'undefined' && interaction && !interaction.replied && !interaction.deferred) await (interaction.deferred && !interaction.replied ? interaction.editReply : interaction.reply).call(interaction, { content: __fMsg, flags: MessageFlags.Ephemeral }).catch(() => null);\n`;
        out += `${indent}    else if (message) await message.reply(__fMsg).catch(() => null);\n`;
      }
      out += `${indent}    return;\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'delete_variable': {
      const scope = String(d.scope || 'user');
      const vName = String(d.varName || '').trim();
      if (!vName) return '';
      if (scope === 'temp') return `${indent}delete resolvedOptions[${JSON.stringify(vName)}];\n`;
      if (scope === 'server') return `${indent}if (guild) dbMiddleware.delete('server_vars', \`\${guild.id}:${vName}\`);\n`;
      return `${indent}{ const __uid = lastAffectedUserId || targetUserId || executorMember?.id || ''; if (guild && __uid) dbMiddleware.delete('user_vars', \`\${guild.id}:\${__uid}:${vName}\`); }\n`;
    }
    case 'db_export_table': {
      const tbl = String(d.table || 'user_vars').trim();
      const chId = String(d.channelId || '').trim();
      const saveAs = String(d.saveAs || '').trim();
      let out = `${indent}{\n`;
      out += `${indent}  const __fs = require('fs');\n`;
      out += `${indent}  const __path = require('path');\n`;
      out += `${indent}  const __dbFile = __path.join(__dirname, '..', 'data', 'database.json');\n`;
      out += `${indent}  let __tableObj = {};\n`;
      out += `${indent}  if (__fs.existsSync(__dbFile)) {\n`;
      out += `${indent}    try { const __all = JSON.parse(__fs.readFileSync(__dbFile, 'utf8')); __tableObj = __all[${JSON.stringify(tbl)}] || {}; } catch (_) {}\n`;
      out += `${indent}  }\n`;
      out += `${indent}  const __jsonStr = JSON.stringify(__tableObj, null, 2);\n`;
      if (saveAs) out += `${indent}  resolvedOptions[${JSON.stringify(saveAs)}] = __jsonStr.slice(0, 1900);\n`;
      if (chId) {
        out += `${indent}  const __targetCh = await __formatText(${JSON.stringify(chId)});\n`;
        out += `${indent}  const __ch = guild?.channels?.cache?.get(__targetCh) || client?.channels?.cache?.get(__targetCh);\n`;
        out += `${indent}  if (__ch && __ch.send) {\n`;
        out += `${indent}    await __ch.send({ content: \`**Database Export (\`${JSON.stringify(tbl)}\`)**\`, files: [{ attachment: Buffer.from(__jsonStr, 'utf8'), name: \`${tbl}_backup.json\` }] }).catch(() => null);\n`;
        out += `${indent}  }\n`;
      }
      out += `${indent}}\n`;
      return out;
    }
    case 'http_request': {
      const method = String(d.method || 'GET').toUpperCase();
      const saveAs = String(d.saveAs || 'api_result').trim();
      const jsonPath = String(d.jsonPath || '').trim();
      let out = `${indent}{\n`;
      out += `${indent}  const __url = await __formatText(${JSON.stringify(d.url || '')});\n`;
      out += `${indent}  if (__url) {\n`;
      out += `${indent}    let __hdrs = { 'User-Agent': 'DiscordBotStudio/1.0' };\n`;
      if (d.headers) {
        out += `${indent}    try { Object.assign(__hdrs, JSON.parse(await __formatText(${JSON.stringify(d.headers)}))); } catch (_) {}\n`;
      }
      out += `${indent}    const __fetchOpts = { method: ${JSON.stringify(method)}, headers: __hdrs };\n`;
      if (d.body && method !== 'GET') {
        out += `${indent}    __fetchOpts.body = await __formatText(${JSON.stringify(d.body)});\n`;
        out += `${indent}    if (!__hdrs['Content-Type']) __hdrs['Content-Type'] = 'application/json';\n`;
      }
      out += `${indent}    const __resp = await fetch(__url, __fetchOpts).catch(() => null);\n`;
      out += `${indent}    if (__resp) {\n`;
      out += `${indent}      const __rawTxt = await __resp.text().catch(() => '');\n`;
      out += `${indent}      let __extracted = __rawTxt;\n`;
      if (jsonPath) {
        out += `${indent}      try {\n`;
        out += `${indent}        let __cur = JSON.parse(__rawTxt);\n`;
        out += `${indent}        for (const __seg of ${JSON.stringify(jsonPath)}.split('.')) { if (__cur != null) __cur = __cur[__seg]; }\n`;
        out += `${indent}        __extracted = typeof __cur === 'object' ? JSON.stringify(__cur) : String(__cur ?? '');\n`;
        out += `${indent}      } catch (_) {}\n`;
      }
      out += `${indent}      resolvedOptions[${JSON.stringify(saveAs)}] = String(__extracted);\n`;
      out += `${indent}    }\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'fetch_other_server': {
      let out = `${indent}{\n`;
      out += `${indent}  const __gid = await __formatText(${JSON.stringify(d.guildId || '')});\n`;
      out += `${indent}  const __lg = __gid ? (client.guilds.cache.get(__gid) || await client.guilds.fetch(__gid).catch(() => null)) : null;\n`;
      out += `${indent}  if (__lg) {\n`;
      out += `${indent}    resolvedOptions['__linked_name'] = __lg.name || '';\n`;
      out += `${indent}    resolvedOptions['__linked_id'] = __lg.id || '';\n`;
      out += `${indent}    resolvedOptions['__linked_members'] = String(__lg.memberCount || 0);\n`;
      out += `${indent}    resolvedOptions['__linked_boosts'] = String(__lg.premiumSubscriptionCount || 0);\n`;
      out += `${indent}    resolvedOptions['__linked_icon'] = __lg.iconURL?.({ dynamic: true }) || '';\n`;
      out += `${indent}    resolvedOptions['__linked_owner'] = __lg.ownerId ? \`<@\${__lg.ownerId}>\` : '';\n`;
      out += `${indent}    const __chkUid = lastAffectedUserId || targetUserId || executorMember?.id || '';\n`;
      out += `${indent}    const __inLinked = __chkUid ? await __lg.members.fetch(__chkUid).then(() => 'Yes').catch(() => 'No') : 'No';\n`;
      out += `${indent}    resolvedOptions['__linked_has_member'] = __inLinked;\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'console_log': {
      return `${indent}console.log(await __formatText(${JSON.stringify(d.text || '')}));\n`;
    }
    case 'show_modal': {
      const mTitle = JSON.stringify(d.title || 'Modal Form');
      const mId = JSON.stringify(d.customId || 'dbm_modal');
      const inputs = [
        { label: d.input1Label, ph: d.input1Placeholder, id: 'field_1' },
        { label: d.input2Label, ph: d.input2Placeholder, id: 'field_2' },
        { label: d.input3Label, ph: d.input3Placeholder, id: 'field_3' },
        { label: d.input4Label, ph: d.input4Placeholder, id: 'field_4' },
        { label: d.input5Label, ph: d.input5Placeholder, id: 'field_5' }
      ].filter((x) => x.label);
      if (!inputs.length) return '';
      let out = `${indent}{\n`;
      out += `${indent}  const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');\n`;
      out += `${indent}  if (typeof interaction !== 'undefined' && interaction && interaction.showModal && !interaction.replied && !interaction.deferred) {\n`;
      out += `${indent}    const __modal = new ModalBuilder().setCustomId(await __formatText(${mId})).setTitle(await __formatText(${mTitle}).slice(0, 45));\n`;
      for (const inp of inputs) {
        out += `${indent}    __modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(${JSON.stringify(inp.id)}).setLabel(await __formatText(${JSON.stringify(inp.label)}).slice(0, 45)).setPlaceholder(await __formatText(${JSON.stringify(inp.ph || '')}).slice(0, 100)).setStyle(TextInputStyle.Short).setRequired(false)));\n`;
      }
      out += `${indent}    await interaction.showModal(__modal).catch(() => null);\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'edit_bot_message':
    case 'edit_event_message': {
      let out = `${indent}{\n`;
      out += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')}) || interaction?.channelId || message?.channelId;\n`;
      out += `${indent}  const __msgId = await __formatText(${JSON.stringify(d.messageId || '')}) || message?.id;\n`;
      out += `${indent}  const __ch = __chId ? (guild?.channels?.cache?.get(__chId) || client?.channels?.cache?.get(__chId)) : null;\n`;
      out += `${indent}  const __newTxt = await __formatText(${JSON.stringify(d.newText || '')});\n`;
      out += `${indent}  if (__ch && __msgId && __newTxt) {\n`;
      out += `${indent}    const __m = await __ch.messages.fetch(__msgId).catch(() => null);\n`;
      out += `${indent}    if (__m && __m.author?.id === client.user?.id) await __m.edit({ content: __newTxt }).catch(() => null);\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'delete_bot_reply': {
      const secs = Math.max(1, Number(d.seconds) || 5);
      let out = `${indent}setTimeout(async () => {\n`;
      out += `${indent}  if (typeof interaction !== 'undefined' && interaction?.replied) await interaction.deleteReply().catch(() => null);\n`;
      out += `${indent}}, ${secs * 1000});\n`;
      return out;
    }
    case 'delete_message_by_id': {
      let out = `${indent}{\n`;
      out += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')}) || interaction?.channelId || message?.channelId;\n`;
      out += `${indent}  const __msgId = await __formatText(${JSON.stringify(d.messageId || '')});\n`;
      out += `${indent}  const __ch = __chId ? (guild?.channels?.cache?.get(__chId) || client?.channels?.cache?.get(__chId)) : null;\n`;
      out += `${indent}  if (__ch && __msgId) {\n`;
      out += `${indent}    const __m = await __ch.messages.fetch(__msgId).catch(() => null);\n`;
      out += `${indent}    if (__m && __m.deletable) await __m.delete().catch(() => null);\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'clone_channel': {
      let out = `${indent}{\n`;
      out += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')}) || interaction?.channelId || message?.channelId;\n`;
      out += `${indent}  const __src = __chId ? (guild?.channels?.cache?.get(__chId) || client?.channels?.cache?.get(__chId)) : null;\n`;
      out += `${indent}  if (__src && __src.clone) {\n`;
      out += `${indent}    const __cloned = await __src.clone({ reason: await __formatText(${JSON.stringify(d.reason || 'Cloned channel')}) }).catch(() => null);\n`;
      out += `${indent}    if (__cloned) resolvedOptions['created_channel_id'] = __cloned.id;\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'create_category': {
      let out = `${indent}if (guild) {\n`;
      out += `${indent}  const __cat = await guild.channels.create({ name: await __formatText(${JSON.stringify(d.name || 'New Category')}), type: ChannelType.GuildCategory, reason: await __formatText(${JSON.stringify(d.reason || '')}) || undefined }).catch(() => null);\n`;
      out += `${indent}  if (__cat) resolvedOptions['created_category_id'] = __cat.id;\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'move_channel_category': {
      let out = `${indent}{\n`;
      out += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')}) || interaction?.channelId || message?.channelId;\n`;
      out += `${indent}  const __catId = await __formatText(${JSON.stringify(d.categoryId || '')});\n`;
      out += `${indent}  const __ch = __chId ? guild?.channels?.cache?.get(__chId) : null;\n`;
      out += `${indent}  if (__ch && __catId && __ch.setParent) await __ch.setParent(__catId).catch(() => null);\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'set_channel_permissions': {
      const allowList = String(d.permissions || '').split(',').map((s) => s.trim()).filter(Boolean);
      const denyList = String(d.denyPermissions || '').split(',').map((s) => s.trim()).filter(Boolean);
      let out = `${indent}{\n`;
      out += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')}) || interaction?.channelId || message?.channelId;\n`;
      out += `${indent}  const __tid = await __formatText(${JSON.stringify(d.targetId || '')});\n`;
      out += `${indent}  const __ch = __chId ? guild?.channels?.cache?.get(__chId) : null;\n`;
      out += `${indent}  if (__ch && __ch.permissionOverwrites && __tid) {\n`;
      out += `${indent}    const __perms = {};\n`;
      for (const p of allowList) out += `${indent}    if (PermissionFlagsBits[${JSON.stringify(p)}] !== undefined) __perms[${JSON.stringify(p)}] = true;\n`;
      for (const p of denyList) out += `${indent}    if (PermissionFlagsBits[${JSON.stringify(p)}] !== undefined) __perms[${JSON.stringify(p)}] = false;\n`;
      out += `${indent}    await __ch.permissionOverwrites.edit(__tid, __perms).catch(() => null);\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'create_invite': {
      const maxUses = Number(d.maxUses) || 0;
      const maxAge = (Number(d.maxAgeHours) || 0) * 3600;
      let out = `${indent}{\n`;
      out += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')}) || interaction?.channelId || message?.channelId;\n`;
      out += `${indent}  const __ch = __chId ? guild?.channels?.cache?.get(__chId) : null;\n`;
      out += `${indent}  if (__ch && __ch.createInvite) {\n`;
      out += `${indent}    const __inv = await __ch.createInvite({ maxUses: ${maxUses}, maxAge: ${maxAge}, temporary: ${Boolean(d.temporary)} }).catch(() => null);\n`;
      out += `${indent}    if (__inv) resolvedOptions['invite_url'] = __inv.url;\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'create_scheduled_event': {
      let out = `${indent}if (guild) {\n`;
      out += `${indent}  const __rawStart = await __formatText(${JSON.stringify(d.startTime || '')});\n`;
      out += `${indent}  const __startDate = (!__rawStart || /^\\d+$/.test(__rawStart)) ? new Date(Date.now() + (Number(__rawStart || 60) * 60000)) : new Date(__rawStart);\n`;
      out += `${indent}  const __vcId = await __formatText(${JSON.stringify(d.channelId || '')}) || undefined;\n`;
      out += `${indent}  await guild.scheduledEvents.create({\n`;
      out += `${indent}    name: await __formatText(${JSON.stringify(d.name || 'Server Event')}),\n`;
      out += `${indent}    description: await __formatText(${JSON.stringify(d.description || '')}) || undefined,\n`;
      out += `${indent}    scheduledStartTime: __startDate,\n`;
      out += `${indent}    scheduledEndTime: __vcId ? undefined : new Date(__startDate.getTime() + 7200000),\n`;
      out += `${indent}    privacyLevel: 2,\n`;
      out += `${indent}    entityType: __vcId ? 2 : 3,\n`;
      out += `${indent}    channel: __vcId,\n`;
      out += `${indent}    entityMetadata: __vcId ? undefined : { location: await __formatText(${JSON.stringify(d.externalLocation || 'Discord')}) }\n`;
      out += `${indent}  }).catch(() => null);\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'edit_role': {
      let out = `${indent}{\n`;
      out += `${indent}  const __rId = await __formatText(${JSON.stringify(d.roleId || '')});\n`;
      out += `${indent}  const __r = (__rId && guild) ? (guild.roles.cache.get(__rId) || await guild.roles.fetch(__rId).catch(() => null)) : null;\n`;
      out += `${indent}  if (__r) {\n`;
      out += `${indent}    const __upd = {};\n`;
      if (d.newName) out += `${indent}    __upd.name = await __formatText(${JSON.stringify(d.newName)});\n`;
      if (d.color) out += `${indent}    __upd.color = await __formatText(${JSON.stringify(d.color)});\n`;
      out += `${indent}    __upd.hoist = ${Boolean(d.hoist)};\n`;
      out += `${indent}    __upd.mentionable = ${Boolean(d.mentionable)};\n`;
      out += `${indent}    await __r.edit(__upd).catch(() => null);\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'role_all_members': {
      const tType = String(d.targetType || 'humans');
      const op = String(d.operation || 'add') === 'remove' ? 'remove' : 'add';
      let out = `${indent}{\n`;
      out += `${indent}  const __rId = await __formatText(${JSON.stringify(d.roleId || '')});\n`;
      out += `${indent}  if (guild && __rId) {\n`;
      out += `${indent}    const __all = await guild.members.fetch().catch(() => guild.members.cache);\n`;
      out += `${indent}    for (const [, __m] of __all) {\n`;
      if (tType === 'humans') out += `${indent}      if (__m.user.bot) continue;\n`;
      else if (tType === 'bots') out += `${indent}      if (!__m.user.bot) continue;\n`;
      out += `${indent}      await __m.roles.${op}(__rId).catch(() => null);\n`;
      out += `${indent}    }\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'move_all_voice': {
      let out = `${indent}{\n`;
      out += `${indent}  const __fromId = await __formatText(${JSON.stringify(d.fromChannelId || '')});\n`;
      out += `${indent}  const __toId = await __formatText(${JSON.stringify(d.toChannelId || '')});\n`;
      out += `${indent}  const __fromCh = __fromId ? guild?.channels?.cache?.get(__fromId) : null;\n`;
      out += `${indent}  if (__fromCh?.members && __toId) {\n`;
      out += `${indent}    for (const [, __m] of __fromCh.members) await __m.voice.setChannel(__toId).catch(() => null);\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'fetch_audit_log': {
      let out = `${indent}if (guild) {\n`;
      out += `${indent}  const { AuditLogEvent } = require('discord.js');\n`;
      out += `${indent}  const __tMap = { MEMBER_BAN_ADD: AuditLogEvent.MemberBanAdd, MEMBER_KICK: AuditLogEvent.MemberKick, MESSAGE_DELETE: AuditLogEvent.MessageDelete };\n`;
      out += `${indent}  const __logs = await guild.fetchAuditLogs({ type: __tMap[${JSON.stringify(d.actionType || 'MEMBER_BAN_ADD')}] || AuditLogEvent.MemberBanAdd, limit: 1 }).catch(() => null);\n`;
      out += `${indent}  const __entry = __logs?.entries?.first();\n`;
      out += `${indent}  if (__entry) {\n`;
      out += `${indent}    resolvedOptions['audit_moderator'] = __entry.executor?.id ? \`<@\${__entry.executor.id}>\` : 'Unknown';\n`;
      out += `${indent}    resolvedOptions['audit_reason'] = __entry.reason || 'No reason provided';\n`;
      out += `${indent}  }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'text_transform': {
      const op = String(d.operation || 'uppercase');
      let out = `${indent}{\n`;
      out += `${indent}  const __inp = await __formatText(${JSON.stringify(d.inputText || '')});\n`;
      if (op === 'lowercase') out += `${indent}  resolvedOptions['result'] = __inp.toLowerCase();\n`;
      else if (op === 'trim') out += `${indent}  resolvedOptions['result'] = __inp.trim();\n`;
      else if (op === 'length') out += `${indent}  resolvedOptions['result'] = String(__inp.length);\n`;
      else if (op === 'replace') out += `${indent}  resolvedOptions['result'] = __inp.split(await __formatText(${JSON.stringify(d.replaceFrom || '')})).join(await __formatText(${JSON.stringify(d.replaceTo || '')}));\n`;
      else if (op === 'substring') out += `${indent}  resolvedOptions['result'] = __inp.slice(${Number(d.startIndex) || 0}, ${Number(d.endIndex) || 9999});\n`;
      else out += `${indent}  resolvedOptions['result'] = __inp.toUpperCase();\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'random_choice': {
      let out = `${indent}{\n`;
      out += `${indent}  const __opts = await __formatText(${JSON.stringify(d.options || '')}).split(',').map(s => s.trim()).filter(Boolean);\n`;
      out += `${indent}  resolvedOptions['choice'] = __opts.length ? __opts[Math.floor(Math.random() * __opts.length)] : '';\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'db_leaderboard': {
      const key = String(d.varKey || 'coins').trim();
      const topN = Math.max(1, Number(d.topN) || 10);
      let out = `${indent}if (guild) {\n`;
      out += `${indent}  const __fs = require('fs');\n`;
      out += `${indent}  const __path = require('path');\n`;
      out += `${indent}  const __dbFile = __path.join(__dirname, '..', 'data', 'database.json');\n`;
      out += `${indent}  let __uVars = {};\n`;
      out += `${indent}  if (__fs.existsSync(__dbFile)) { try { __uVars = JSON.parse(__fs.readFileSync(__dbFile, 'utf8')).user_vars || {}; } catch (_) {} }\n`;
      out += `${indent}  const __prefix = \`\${guild.id}:\`;\n`;
      out += `${indent}  const __suffix = \`:${key}\`;\n`;
      out += `${indent}  const __rows = Object.entries(__uVars).filter(([k]) => k.startsWith(__prefix) && k.endsWith(__suffix)).map(([k, v]) => ({ uid: k.slice(__prefix.length, -__suffix.length), val: Number(v) || 0 })).sort((a, b) => b.val - a.val).slice(0, ${topN});\n`;
      out += `${indent}  resolvedOptions['leaderboard'] = __rows.length ? __rows.map((r, i) => \`**#\${i + 1}** <@\${r.uid}> — **\${r.val}**\`).join('\\n') : 'No entries yet.';\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'list_manager': {
      const lName = String(d.listName || 'items').trim();
      const op = String(d.operation || 'add');
      let out = `${indent}{\n`;
      out += `${indent}  const __lKey = \`\${guild?.id || 'global'}:${lName}\`;\n`;
      out += `${indent}  const __item = await __formatText(${JSON.stringify(d.itemValue || '')});\n`;
      out += `${indent}  let __arr = dbMiddleware.get('lists', __lKey, []);\n`;
      out += `${indent}  if (!Array.isArray(__arr)) __arr = [];\n`;
      if (op === 'add') out += `${indent}  if (__item && !__arr.includes(__item)) { __arr.push(__item); dbMiddleware.set('lists', __lKey, __arr, 'set'); }\n`;
      else if (op === 'remove') out += `${indent}  __arr = __arr.filter(x => x !== __item); dbMiddleware.set('lists', __lKey, __arr, 'set');\n`;
      else if (op === 'check') out += `${indent}  resolvedOptions['list_exists'] = __arr.includes(__item) ? 'Yes' : 'No';\n`;
      else if (op === 'pick') out += `${indent}  resolvedOptions['list_winner'] = __arr.length ? String(__arr[Math.floor(Math.random() * __arr.length)]) : '';\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'automod_filter': {
      const words = String(d.bannedWords || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      const blockInv = Boolean(d.blockInvites);
      const maxCaps = Number(d.maxCapsPercent) || 0;
      const punish = String(d.punishAction || 'delete_warn');
      let out = `${indent}if (message && !message.author?.bot) {\n`;
      out += `${indent}  const __txt = String(message.content || '');\n`;
      out += `${indent}  const __low = __txt.toLowerCase();\n`;
      out += `${indent}  let __flagged = ${JSON.stringify(words)}.some(w => __low.includes(w));\n`;
      if (blockInv) out += `${indent}  if (/(discord\\.gg\\/|discord\\.com\\/invite\\/)/i.test(__txt)) __flagged = true;\n`;
      if (maxCaps > 0) out += `${indent}  { const __letters = __txt.replace(/[^a-zA-Z]/g, ''); const __caps = __txt.replace(/[^A-Z]/g, ''); if (__letters.length >= 8 && (__caps.length / __letters.length) * 100 >= ${maxCaps}) __flagged = true; }\n`;
      out += `${indent}  if (__flagged) {\n`;
      out += `${indent}    if (message.deletable) await message.delete().catch(() => null);\n`;
      if (punish === 'kick') out += `${indent}    if (executorMember?.kickable) await executorMember.kick(await __formatText(${JSON.stringify(d.punishReason || 'Auto-Mod violation')})).catch(() => null);\n`;
      else if (punish === 'ban') out += `${indent}    if (executorMember?.bannable) await executorMember.ban({ reason: await __formatText(${JSON.stringify(d.punishReason || 'Auto-Mod violation')}) }).catch(() => null);\n`;
      out += `${indent}  } else { return; }\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'reaction_threshold': {
      const req = Math.max(1, Number(d.requiredCount) || 3);
      let out = `${indent}{\n`;
      out += `${indent}  const __cnt = arg1?.count ?? 0;\n`;
      out += `${indent}  resolvedOptions['reaction_count'] = String(__cnt);\n`;
      out += `${indent}  if (__cnt < ${req}) return;\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'check_voice_empty': {
      let out = `${indent}{\n`;
      out += `${indent}  const __vcId = await __formatText(${JSON.stringify(d.channelId || '')}) || arg1?.channelId;\n`;
      out += `${indent}  const __vc = __vcId ? guild?.channels?.cache?.get(__vcId) : null;\n`;
      out += `${indent}  if (!__vc || (__vc.members && __vc.members.size > 0)) return;\n`;
      out += `${indent}}\n`;
      return out;
    }
    case 'repeat_loop':
    case 'attachment_argument': {
      return '';
    }
    default:
      return '';
  }
}

function compileButtonPanelContainer(flatActions, startIndex, indent, isEvent) {
  const d = flatActions[startIndex].data || {};
  const stopTypes = new Set([
    'slash_command', 'prefix_command', 'send_role_buttons', 'ui_button',
    'guildMemberAdd', 'guildMemberRemove', 'guildMemberUpdate',
    'guildBanAdd', 'guildBanRemove', 'messageCreate', 'messageUpdate',
    'messageDelete', 'channelCreate', 'channelDelete', 'roleCreate',
    'roleDelete', 'voiceStateUpdate', 'guildBoost', 'guildBoostRemove',
    'ready', 'buttonClick', 'dropdownSelect'
  ]);
  const buttons = [];
  let j = startIndex + 1;

  while (j < flatActions.length && flatActions[j].type === 'ui_button') {
    const btnAction = flatActions[j];
    const btnChildren = [];
    let k = j + 1;
    while (k < flatActions.length && !stopTypes.has(flatActions[k].type)) {
      btnChildren.push(flatActions[k]);
      k++;
    }
    buttons.push({ btn: btnAction, children: btnChildren, idx: buttons.length });
    j = k;
  }

  let out = `${indent}{\n`;
  out += `${indent}  const __styleMap = { primary: ButtonStyle.Primary, blue: ButtonStyle.Primary, secondary: ButtonStyle.Secondary, gray: ButtonStyle.Secondary, grey: ButtonStyle.Secondary, success: ButtonStyle.Success, green: ButtonStyle.Success, danger: ButtonStyle.Danger, red: ButtonStyle.Danger };\n`;
  out += `${indent}  const __rows = [];\n`;
  out += `${indent}  let __row = new ActionRowBuilder();\n`;
  out += `${indent}  client.__customButtons = client.__customButtons || new Map();\n`;

  for (const b of buttons) {
    const bd = b.btn.data || {};
    const cid = `dbm_btn_${(d.title || 'panel').toLowerCase().replace(/[^a-z0-9]/g, '')}_${b.idx}`;
    out += `${indent}  if (__row.components.length >= 5) { __rows.push(__row); __row = new ActionRowBuilder(); }\n`;
    out += `${indent}  {\n`;
    out += `${indent}    const __btn = new ButtonBuilder().setCustomId(${JSON.stringify(cid)}).setLabel(await __formatText(${JSON.stringify(bd.label || 'Button')})).setStyle(__styleMap[${JSON.stringify((bd.style || 'primary').toLowerCase())}] || ButtonStyle.Primary);\n`;
    if (bd.emoji) out += `${indent}    __btn.setEmoji(${JSON.stringify(bd.emoji)});\n`;
    out += `${indent}    __row.addComponents(__btn);\n`;
    out += `${indent}  }\n`;

    out += `${indent}  client.__customButtons.set(${JSON.stringify(cid)}, async (btnInteraction) => {\n`;
    out += `${indent}    const guild = btnInteraction.guild;\n`;
    out += `${indent}    const executorMember = btnInteraction.member;\n`;
    out += `${indent}    let targetUserId = btnInteraction.user.id;\n`;
    out += `${indent}    let lastAffectedUserId = targetUserId;\n`;
    out += `${indent}    let targetRoleId = null;\n`;
    out += `${indent}    let lastAffectedRoleId = null;\n`;
    out += `${indent}    const resolvedOptions = {};\n`;
    out += `${indent}    const interaction = btnInteraction;\n`;
    out += `${indent}    const message = null;\n`;
    out += `${indent}    const arg1 = btnInteraction;\n`;
    out += buildFormatTextCode(true);

    for (const child of b.children) {
      const cd = child.data || {};
      if (child.type === 'toggle_role') {
        const addTpl = cd.addMsg || cd.replyMsg || 'Added {role} to yourself!';
        const remTpl = cd.removeMsg || cd.replyMsg || 'Removed {role} from yourself!';
        out += `${indent}    {\n`;
        out += `${indent}      const __rId = await __formatText(${JSON.stringify(cd.roleId || '')});\n`;
        out += `${indent}      lastAffectedRoleId = __rId;\n`;
        out += `${indent}      if (executorMember && __rId) {\n`;
        out += `${indent}        const __hadRole = executorMember.roles.cache.has(__rId);\n`;
        out += `${indent}        if (__hadRole) await executorMember.roles.remove(__rId).catch(() => null);\n`;
        out += `${indent}        else await executorMember.roles.add(__rId).catch(() => null);\n`;
        out += `${indent}        const __replyStr = await __formatText(__hadRole ? ${JSON.stringify(remTpl)} : ${JSON.stringify(addTpl)});\n`;
        out += `${indent}        if (!btnInteraction.replied && !btnInteraction.deferred) await btnInteraction.reply({ content: __replyStr, allowedMentions: { parse: [] }, flags: MessageFlags.Ephemeral }).catch(() => null);\n`;
        out += `${indent}      }\n`;
        out += `${indent}    }\n`;
      }
 else if (child.type === 'add_role' || child.type === 'remove_role') {
        const op = child.type === 'add_role' ? 'add' : 'remove';
        out += `${indent}    {\n`;
        out += `${indent}      const __rId = await __formatText(${JSON.stringify(cd.roleId || '')});\n`;
        out += `${indent}      lastAffectedRoleId = __rId;\n`;
        out += `${indent}      if (executorMember && __rId) await executorMember.roles.${op}(__rId).catch(() => null);\n`;
        out += `${indent}    }\n`;
      } else if (child.type === 'send_message') {
        out += `${indent}    if (!btnInteraction.replied && !btnInteraction.deferred) await btnInteraction.reply({ content: await __formatText(${JSON.stringify(cd.message || '')}), flags: MessageFlags.Ephemeral }).catch(() => null);\n`;
      }
    }

    out += `${indent}    if (!btnInteraction.replied && !btnInteraction.deferred) await btnInteraction.reply({ content: 'Updated!', flags: MessageFlags.Ephemeral }).catch(() => null);\n`;
    out += `${indent}  });\n`;
  }

  out += `${indent}  if (__row.components.length > 0) __rows.push(__row);\n`;
  out += `${indent}  const __panelTitle = await __formatText(${JSON.stringify(d.title || '')});\n`;
  out += `${indent}  const __embed = new EmbedBuilder().setColor(${JSON.stringify(d.color || '#2b82d9')});\n`;
  out += `${indent}  if (__panelTitle) __embed.setTitle(__panelTitle);\n`;
  out += `${indent}  __embed.setDescription(await __formatText(${JSON.stringify(d.message || 'Click a button below!')}) || '\\u200B');\n`;
  out += `${indent}  const __payload = { embeds: [__embed], components: __rows };\n`;
  out += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')});\n`;
  out += `${indent}  if (__chId) {\n`;
  out += `${indent}    const __ch = guild?.channels?.cache?.get(__chId) || client?.channels?.cache?.get(__chId) || await client?.channels?.fetch(__chId).catch(() => null);\n`;
  out += `${indent}    if (__ch && __ch.send) {\n`;
  out += `${indent}      let __existingMsg = null;\n`;
  out += `${indent}      if (__ch.messages?.fetch) {\n`;
  out += `${indent}        const __recent = await __ch.messages.fetch({ limit: 50 }).catch(() => null);\n`;
  out += `${indent}        const __panelPrefix = ${JSON.stringify(`dbm_btn_${(d.title || 'panel').toLowerCase().replace(/[^a-z0-9]/g, '')}_`)};\n`;
  out += `${indent}        if (__recent) {\n`;
  out += `${indent}          __existingMsg = __recent.find((m) => m.author?.id === client.user?.id && Array.isArray(m.components) && m.components.some((r) => r.components?.some((c) => c.customId?.startsWith(__panelPrefix) || c.customId?.startsWith('dbm_btn_'))));\n`;
  out += `${indent}        }\n`;
  out += `${indent}      }\n`;
  out += `${indent}      if (__existingMsg) await __existingMsg.edit(__payload).catch(() => null);\n`;
  out += `${indent}      else await __ch.send(__payload).catch(() => null);\n`;
  out += `${indent}    }\n`;
  out += `${indent}  }
 else if (typeof interaction !== 'undefined' && interaction) {\n`;
  out += `${indent}    if (interaction.deferred || interaction.replied) await interaction.followUp(__payload);\n`;
  out += `${indent}    else await (interaction.deferred && !interaction.replied ? interaction.editReply : interaction.reply).call(interaction, __payload);\n`;
  out += `${indent}  }\n`;
  out += `${indent}}\n`;

  return { code: out, nextIndex: j - 1 };
}




function buildFormatTextCode(isEvent) {
  let c = '';
  c += "    const __dbRowCache = {};\n";
  c += "    const __formatText = async (text) => {\n";
  c += "      if (!text) return '';\n";
  c += "      const __aMem = executorMember || message?.member || null;\n";
  c += "      const __aUsr = __aMem?.user || interaction?.user || message?.author || arg1?.user || null;\n";
  c += "      const __tId = lastAffectedUserId || targetUserId || __aUsr?.id || '';\n";
  c += "      const __tMem = (guild?.members?.cache?.get(__tId)) || __aMem || null;\n";
  c += "      const __tUsr = __tMem?.user || (__tId === __aUsr?.id ? __aUsr : null);\n";
  c += "      const __rId = lastAffectedRoleId || targetRoleId || '';\n";
  c += "      const __role = (__rId && guild ? guild.roles.cache.get(__rId) : null) || arg1?.role || (arg1?.permissions && arg1?.color !== undefined ? arg1 : null);\n";
  c += "      const __ch = interaction?.channel || message?.channel || arg1?.channel || (arg1?.type !== undefined && arg1?.id ? arg1 : null);\n";
  c += "      const __fmtDate = (d) => d ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown';\n";
  c += "      const __fmtDateTime = (d) => d ? d.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', ' @') : 'Unknown';\n";
  c += "      const __roleList = (m) => m ? (m.roles.cache.filter(r => r.id !== guild?.id).map(r => `<@&${r.id}>`).join(', ') || 'None') : 'None';\n";
  c += "      let res = String(text)\n";
  c += "        .replace(/\\{date\\}/g, __fmtDate(new Date()))\n";
  c += "        .replace(/\\{time\\}/g, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))\n";
  c += "        .replace(/\\{timestamp\\}/g, `<t:${Math.floor(Date.now() / 1000)}:R>`)\n";
  // Author
  c += "        .replace(/\\{author\\.id\\}/g, __aUsr?.id || '')\n";
  c += "        .replace(/\\{author\\.name\\}/g, __aUsr?.username || 'Unknown')\n";
  c += "        .replace(/\\{author\\.tag\\}/g, __aUsr?.globalName || __aUsr?.username || 'Unknown')\n";
  c += "        .replace(/\\{author\\.nickname\\}/g, __aMem?.displayName || __aUsr?.username || 'None')\n";
  c += "        .replace(/\\{author\\.avatar\\}/g, __aMem?.displayAvatarURL?.({ dynamic: true }) || __aUsr?.displayAvatarURL?.({ dynamic: true }) || '')\n";
  c += "        .replace(/\\{author\\.created\\}/g, __fmtDateTime(__aUsr?.createdAt))\n";
  c += "        .replace(/\\{author\\.joined\\}/g, __fmtDateTime(__aMem?.joinedAt))\n";
  c += "        .replace(/\\{author\\.roles\\}/g, __roleList(__aMem))\n";
  c += "        .replace(/\\{author\\.highest_role\\}/g, __aMem?.roles?.highest && __aMem.roles.highest.id !== guild?.id ? `<@&${__aMem.roles.highest.id}>` : 'None')\n";
  c += "        .replace(/\\{author\\}/g, __aUsr?.id ? `<@${__aUsr.id}>` : '')\n";
  // Target / User
  c += "        .replace(/\\{target\\.id\\}/g, __tId)\n";
  c += "        .replace(/\\{target\\.name\\}/g, __tUsr?.username || 'Unknown')\n";
  c += "        .replace(/\\{target\\.nickname\\}/g, __tMem?.displayName || __tUsr?.username || 'None')\n";
  c += "        .replace(/\\{target\\.avatar\\}/g, __tMem?.displayAvatarURL?.({ dynamic: true }) || __tUsr?.displayAvatarURL?.({ dynamic: true }) || '')\n";
  c += "        .replace(/\\{target\\.created\\}/g, __fmtDateTime(__tUsr?.createdAt))\n";
  c += "        .replace(/\\{target\\.joined\\}/g, __fmtDateTime(__tMem?.joinedAt))\n";
  c += "        .replace(/\\{target\\.roles\\}/g, __roleList(__tMem))\n";
  c += "        .replace(/\\{target\\.highest_role\\}/g, __tMem?.roles?.highest && __tMem.roles.highest.id !== guild?.id ? `<@&${__tMem.roles.highest.id}>` : 'None')\n";
  c += "        .replace(/\\{target\\.voice_channel\\}/g, __tMem?.voice?.channelId ? `<#${__tMem.voice.channelId}>` : 'None')\n";
  c += "        .replace(/\\{target\\}|\\{user\\}/g, __tId ? `<@${__tId}>` : '')\n";
  // Role
  c += "        .replace(/\\{role\\.id\\}/g, __role?.id || __rId || '')\n";
  c += "        .replace(/\\{role\\.name\\}/g, __role?.name || '')\n";
  c += "        .replace(/\\{role\\.color\\}/g, __role?.hexColor || '#000000')\n";
  c += "        .replace(/\\{role\\.position\\}/g, __role?.position !== undefined ? String(__role.position) : '')\n";
  c += "        .replace(/\\{role\\.members\\}/g, __role?.members ? String(__role.members.size) : '0')\n";
  c += "        .replace(/\\{role\\.mentionable\\}/g, __role?.mentionable ? 'Yes' : 'No')\n";
  c += "        .replace(/\\{role\\.hoisted\\}/g, __role?.hoist ? 'Yes' : 'No')\n";
  c += "        .replace(/\\{role\\}/g, (__role?.id || __rId) ? `<@&${__role?.id || __rId}>` : '')\n";
  // Channel & Message
  c += "        .replace(/\\{channel\\.id\\}/g, __ch?.id || '')\n";
  c += "        .replace(/\\{channel\\.name\\}/g, __ch?.name || '')\n";
  c += "        .replace(/\\{channel\\.topic\\}/g, __ch?.topic || 'None')\n";
  c += "        .replace(/\\{channel\\.category\\}/g, __ch?.parent?.name || 'None')\n";
  c += "        .replace(/\\{channel\\.slowmode\\}/g, String(__ch?.rateLimitPerUser ?? 0))\n";
  c += "        .replace(/\\{channel\\}/g, __ch?.id ? `<#${__ch.id}>` : '')\n";
  c += "        .replace(/\\{message\\.content\\}/g, message?.content || '')\n";
  c += "        .replace(/\\{message\\.id\\}/g, message?.id || '')\n";
  c += "        .replace(/\\{message\\.url\\}/g, message?.url || '')\n";
  // Server
  c += "        .replace(/\\{server\\.id\\}/g, guild?.id || '')\n";
  c += "        .replace(/\\{server\\.owner_id\\}/g, guild?.ownerId || '')\n";
  c += "        .replace(/\\{server\\.owner\\}/g, guild?.ownerId ? `<@${guild.ownerId}>` : '')\n";
  c += "        .replace(/\\{server\\.members\\}/g, String(guild?.memberCount || ''))\n";
  c += "        .replace(/\\{server\\.humans\\}/g, guild?.members?.cache ? String(guild.members.cache.filter(m => !m.user.bot).size) : '')\n";
  c += "        .replace(/\\{server\\.bots\\}/g, guild?.members?.cache ? String(guild.members.cache.filter(m => m.user.bot).size) : '')\n";
  c += "        .replace(/\\{server\\.roles_count\\}/g, guild?.roles?.cache ? String(guild.roles.cache.size) : '')\n";
  c += "        .replace(/\\{server\\.channels_count\\}/g, guild?.channels?.cache ? String(guild.channels.cache.size) : '')\n";
  c += "        .replace(/\\{server\\.boosts\\}/g, String(guild?.premiumSubscriptionCount || '0'))\n";
  c += "        .replace(/\\{server\\.boost_tier\\}/g, String(guild?.premiumTier || '0'))\n";
  c += "        .replace(/\\{server\\.created\\}/g, __fmtDate(guild?.createdAt))\n";
  c += "        .replace(/\\{server\\.icon\\}/g, guild?.iconURL?.({ dynamic: true }) || '')\n";
  c += "        .replace(/\\{server\\}/g, guild?.name || '')\n";
  // Bot
  c += "        .replace(/\\{bot\\.id\\}/g, client?.user?.id || '')\n";
  c += "        .replace(/\\{bot\\.name\\}/g, client?.user?.username || '')\n";
  c += "        .replace(/\\{bot\\.avatar\\}/g, client?.user?.displayAvatarURL?.({ dynamic: true }) || '')\n";
  c += "        .replace(/\\{bot\\.ping\\}/g, String(Math.max(1, Math.round(client?.ws?.ping ?? 0))))\n";
  c += "        .replace(/\\{bot\\.health\\}/g, (() => { const p = Math.round(client?.ws?.ping ?? 0); return p < 120 ? '\\uD83D\\uDFE2 Running Good' : (p < 250 ? '\\uD83D\\uDFE1 Moderate Latency' : '\\uD83D\\uDD34 Running Slow'); })())\n";
  c += "        .replace(/\\{bot\\.uptime\\}/g, (() => { const s = Math.floor((client?.uptime || 0) / 1000); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return `${h}h ${m}m ${s % 60}s`; })())\n";
  c += "        .replace(/\\{bot\\.servers\\}/g, String(client?.guilds?.cache?.size ?? 1))\n";
  c += "        .replace(/\\{bot\\}/g, client?.user?.id ? `<@${client.user.id}>` : '')\n";
  c += "        .replace(/\\{datetime\\}/g, __fmtDateTime(new Date()))\n";
  c += "        .replace(/\\{unix\\}/g, String(Math.floor(Date.now() / 1000)))\n";
  c += "        .replace(/\\{timestamp\\.full\\}/g, `<t:${Math.floor(Date.now() / 1000)}:F>`)\n";
  c += "        .replace(/\\{timestamp\\.short\\}/g, `<t:${Math.floor(Date.now() / 1000)}:t>`)\n";
  c += "        .replace(/\\{random\\.100\\}/g, String(Math.floor(Math.random() * 100) + 1))\n";
  c += "        .replace(/\\{random\\.1000\\}/g, String(Math.floor(Math.random() * 1000) + 1))\n";
  c += "        .replace(/\\{random\\.dice\\}/g, String(Math.floor(Math.random() * 6) + 1))\n";
  c += "        .replace(/\\{random\\.coin\\}/g, Math.random() < 0.5 ? 'Heads' : 'Tails')\n";
  c += "        .replace(/\\{author\\.created_unix\\}/g, __aUsr?.createdTimestamp ? `<t:${Math.floor(__aUsr.createdTimestamp / 1000)}:R>` : 'Unknown')\n";
  c += "        .replace(/\\{author\\.joined_unix\\}/g, __aMem?.joinedTimestamp ? `<t:${Math.floor(__aMem.joinedTimestamp / 1000)}:R>` : 'Unknown')\n";
  c += "        .replace(/\\{author\\.roles_count\\}/g, __aMem ? String(Math.max(0, __aMem.roles.cache.size - 1)) : '0')\n";
  c += "        .replace(/\\{author\\.color\\}/g, __aMem?.displayHexColor || '#000000')\n";
  c += "        .replace(/\\{author\\.voice_channel\\}/g, __aMem?.voice?.channelId ? `<#${__aMem.voice.channelId}>` : 'None')\n";
  c += "        .replace(/\\{author\\.is_bot\\}/g, __aUsr?.bot ? 'Yes' : 'No')\n";
  c += "        .replace(/\\{target\\.tag\\}/g, __tUsr?.globalName || __tUsr?.username || 'Unknown')\n";
  c += "        .replace(/\\{target\\.created_unix\\}/g, __tUsr?.createdTimestamp ? `<t:${Math.floor(__tUsr.createdTimestamp / 1000)}:R>` : 'Unknown')\n";
  c += "        .replace(/\\{target\\.joined_unix\\}/g, __tMem?.joinedTimestamp ? `<t:${Math.floor(__tMem.joinedTimestamp / 1000)}:R>` : 'Unknown')\n";
  c += "        .replace(/\\{target\\.roles_count\\}/g, __tMem ? String(Math.max(0, __tMem.roles.cache.size - 1)) : '0')\n";
  c += "        .replace(/\\{target\\.color\\}/g, __tMem?.displayHexColor || '#000000')\n";
  c += "        .replace(/\\{target\\.is_bot\\}/g, __tUsr?.bot ? 'Yes' : 'No')\n";
  c += "        .replace(/\\{role\\.managed\\}/g, __role?.managed ? 'Yes' : 'No')\n";
  c += "        .replace(/\\{channel\\.nsfw\\}/g, __ch?.nsfw ? 'Yes' : 'No')\n";
  c += "        .replace(/\\{channel\\.position\\}/g, __ch?.position !== undefined ? String(__ch.position) : '0')\n";
  c += "        .replace(/\\{message\\.attachments\\}/g, message?.attachments?.size ? message.attachments.map(a => a.url).join(' ') : 'None')\n";
  c += "        .replace(/\\{server\\.emojis_count\\}/g, guild?.emojis?.cache ? String(guild.emojis.cache.size) : '0')\n";
  c += "        .replace(/\\{server\\.stickers_count\\}/g, guild?.stickers?.cache ? String(guild.stickers.cache.size) : '0')\n";
  c += "        .replace(/\\{server\\.vanity\\}/g, guild?.vanityURLCode ? `discord.gg/${guild.vanityURLCode}` : 'None')\n";
  c += "        .replace(/\\{server\\.banner\\}/g, guild?.bannerURL?.({ size: 1024 }) || '')\n";
  c += "        .replace(/\\{bot\\.memory\\}/g, `${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB`)\n";
  c += "        .replace(/\\{bot\\.users\\}/g, String(client?.users?.cache?.size ?? guild?.memberCount ?? 1))\n";
  c += "        .replace(/\\{@&(\\d+)\\}/g, '<@&$1>')\n";
  c += "        .replace(/\\{@(\\d+)\\}/g, '<@$1>')\n";
  c += "        .replace(/\\{#(\\d+)\\}/g, '<#$1>');\n";
  c += "      res = res.replace(/\\{temp\\.([a-zA-Z0-9_-]+)\\}/g, (_, k) => resolvedOptions[k] !== undefined ? String(resolvedOptions[k]) : '');\n";
  c += "      res = res.replace(/\\{server_var\\.([a-zA-Z0-9_-]+)\\}/g, (_, k) => guild ? String(dbMiddleware.get('server_vars', `${guild.id}:${k}`, '')) : '');\n";
  c += "      res = res.replace(/\\{user_var\\.([a-zA-Z0-9_-]+)\\}/g, (_, k) => (guild && __tId) ? String(dbMiddleware.get('user_vars', `${guild.id}:${__tId}:${k}`, '')) : '');\n";
  c += "      res = res.replace(/\\{db\\.([a-zA-Z0-9_-]+)\\.([a-zA-Z0-9_.:-]+)\\}/g, (_, tbl, k) => String(dbMiddleware.get(tbl, k, '')));\n";
  c += "      const __dbMatches = [...res.matchAll(/\\{database\\.([a-zA-Z0-9_]+)\\.([a-zA-Z0-9_]+)\\}/g)];\n";
  c += "      if (__dbMatches.length > 0 && __tId) {\n";
  c += "        const __tables = [...new Set(__dbMatches.map(m => m[1]))];\n";
  c += "        for (const __tbl of __tables) {\n";
  c += "          const __cacheKey = `${__tbl}:${__tId}`;\n";
  c += "          if (!Object.prototype.hasOwnProperty.call(__dbRowCache, __cacheKey)) {\n";
  c += "            const __q = await dbMiddleware.query(`SELECT * FROM \\`${__tbl}\\` WHERE discord_id = ? LIMIT 1`, [__tId]).catch(() => null);\n";
  c += "            __dbRowCache[__cacheKey] = (Array.isArray(__q?.rows) && __q.rows[0]) ? __q.rows[0] : null;\n";
  c += "          }\n";
  c += "        }\n";
  c += "        res = res.replace(/\\{database\\.([a-zA-Z0-9_]+)\\.([a-zA-Z0-9_]+)\\}/g, (_, tbl, col) => {\n";
  c += "          const __row = __dbRowCache[`${tbl}:${__tId}`];\n";
  c += "          return (__row && __row[col] !== undefined && __row[col] !== null) ? String(__row[col]) : 'Not Found';\n";
  c += "        });\n";
  c += "      }\n";
  c += "      res = res.replace(/\\{linked_server\\.name\\}/g, resolvedOptions['__linked_name'] || '');\n";
  c += "      res = res.replace(/\\{linked_server\\.id\\}/g, resolvedOptions['__linked_id'] || '');\n";
  c += "      res = res.replace(/\\{linked_server\\.members\\}/g, resolvedOptions['__linked_members'] || '0');\n";
  c += "      res = res.replace(/\\{linked_server\\.boosts\\}/g, resolvedOptions['__linked_boosts'] || '0');\n";
  c += "      res = res.replace(/\\{linked_server\\.icon\\}/g, resolvedOptions['__linked_icon'] || '');\n";
  c += "      res = res.replace(/\\{linked_server\\.owner\\}/g, resolvedOptions['__linked_owner'] || '');\n";
  c += "      res = res.replace(/\\{linked_server\\.has_member\\}/g, resolvedOptions['__linked_has_member'] || 'No');\n";
  c += "      return res.replace(/\\{([a-zA-Z0-9_.-]+)\\}/g, (_, k) => {\n";
  c += "        const val = resolvedOptions[k];\n";
  c += "        if (val === undefined || val === null || val === '') return '';\n";
  c += `        if (${!isEvent} && k.toLowerCase().includes('user')) return \`<@\${val}>\`;\n`;
  c += `        if (${!isEvent} && k.toLowerCase().includes('role')) return \`<@&\${val}>\`;\n`;
  c += "        return String(val);\n";
  c += "      });\n";
  c += "    };\n\n";
  return c;
}



function compileCommandToJS(cmd) {
  const actions = Array.isArray(cmd.actions) ? cmd.actions : [];
  let triggerName = (cmd.name || 'command').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  let prefix = '!';
  let description = cmd.description || 'Custom bot command';
  let type = 'slash';
  const dbMiddleware = require('../middleground/database.js');

  // Flatten top-level and nested actions into one ordered execution list
  const flatActions = [];
  const flatten = (arr) => {
    for (const a of arr) {
      flatActions.push(a);
      if (a.children) flatten(a.children);
    }
  };
  flatten(cmd.actions || []);

  function __formatText(tpl, resolvedOptions, executorMember, targetUserId, guild) {
    if (typeof tpl !== 'string') return tpl;
    return tpl
      .replace(/{author\.id}/g, executorMember?.id || '')
      .replace(/{target\.id}/g, targetUserId || '')
      .replace(/{server\.id}/g, guild?.id || '')
      .replace(/{author}/g, `<@${executorMember?.id}>`)
      .replace(/{user}/g, `<@${targetUserId || executorMember?.id}>`)
      .replace(/{role}/g, resolvedOptions['role'] ? `<@&${resolvedOptions['role']}>` : '')
      .replace(/{channel}/g, `<#${guild?.id}>`)
      .replace(/{server}/g, guild?.name || '')
      .replace(/{server\.members}/g, String(guild?.memberCount || ''))
      .replace(/{date}/g, new Date().toLocaleDateString())
      .replace(/{time}/g, new Date().toLocaleTimeString())
      .replace(/{datetime}/g, new Date().toLocaleString())
      .replace(/{server\.icon}/g, guild?.iconURL?.() || '')
      .replace(/{bot\.avatar}/g, '')
      .replace(/{author\.avatar}/g, executorMember?.displayAvatarURL?.() || '')
      .replace(/{target\.avatar}/g, '');
  }

  // Extract trigger settings and slash options (sort required options before optional options per Discord API rules)
  const requiredOptionBuilders = [];
  const optionalOptionBuilders = [];

  for (const a of flatActions) {
    const d = a.data || {};
    if (a.type === 'slash_command') {
      type = 'slash';
      if (d.triggerName) triggerName = d.triggerName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      if (d.description) description = d.description;
    } else if (a.type === 'prefix_command') {
      type = 'prefix';
      if (d.prefix) prefix = d.prefix;
      if (d.triggerName) triggerName = d.triggerName.trim();
    } else if (a.type === 'user_argument') {
      const rawOptName = d.optionName || 'user';
      const optName = rawOptName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const optDesc = d.description || 'Select a user';
      const req = Boolean(d.required);
      const b = `.addUserOption(opt => opt.setName(${JSON.stringify(optName)}).setDescription(${JSON.stringify(optDesc)}).setRequired(${req}))`;
      (req ? requiredOptionBuilders : optionalOptionBuilders).push(b);
    } else if (a.type === 'role_argument') {
      const rawOptName = d.optionName || 'role';
      const optName = rawOptName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const optDesc = d.description || 'Select a role';
      const req = Boolean(d.required);
      const b = `.addRoleOption(opt => opt.setName(${JSON.stringify(optName)}).setDescription(${JSON.stringify(optDesc)}).setRequired(${req}))`;
      (req ? requiredOptionBuilders : optionalOptionBuilders).push(b);
    } else if (a.type === 'number_argument') {
      const rawOptName = d.optionName || 'number';
      const optName = rawOptName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const optDesc = d.description || 'Enter a number';
      const req = Boolean(d.required);
      const b = `.addNumberOption(opt => opt.setName(${JSON.stringify(optName)}).setDescription(${JSON.stringify(optDesc)}).setRequired(${req}))`;
      (req ? requiredOptionBuilders : optionalOptionBuilders).push(b);
    } else if (a.type === 'time_argument') {
      const optName = (d.optionName || 'duration').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const optDesc = d.description || 'Duration (e.g. 30s, 10m, 2h, 1d)';
      const req = Boolean(d.required);
      const b = `.addStringOption(opt => opt.setName(${JSON.stringify(optName)}).setDescription(${JSON.stringify(optDesc)}).setRequired(${req}))`;
      (req ? requiredOptionBuilders : optionalOptionBuilders).push(b);
    } else if (a.type === 'channel_argument') {
      const rawOptName = d.optionName || 'channel';
      const optName = rawOptName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const optDesc = d.description || 'Select a channel';
      const req = Boolean(d.required);
      const b = `.addChannelOption(opt => opt.setName(${JSON.stringify(optName)}).setDescription(${JSON.stringify(optDesc)}).setRequired(${req}))`;
      (req ? requiredOptionBuilders : optionalOptionBuilders).push(b);
    } else if (a.type === 'text_argument' || a.type === 'choice_argument') {
      const rawOptName = d.optionName || 'text';
      const optName = rawOptName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const optDesc = d.description || 'Enter text';
      const req = Boolean(d.required);
      let builder = `.addStringOption(opt => opt.setName(${JSON.stringify(optName)}).setDescription(${JSON.stringify(optDesc)}).setRequired(${req})`;
      if (d.choices) {
        const choicePairs = String(d.choices).split(',').map(s => s.trim()).filter(Boolean);
        for (const pair of choicePairs) {
          const [label, value] = pair.includes(':') ? pair.split(':') : [pair, pair];
          builder += `.addChoices({ name: ${JSON.stringify(label.trim())}, value: ${JSON.stringify(value.trim())} })`;
        }
      }
      builder += ')';
      (req ? requiredOptionBuilders : optionalOptionBuilders).push(builder);
    }
  }

  const slashOptionBuilders = [...requiredOptionBuilders, ...optionalOptionBuilders];

  let code = '';
    code += "const { EmbedBuilder, SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits, ChannelType, WebhookClient, ActivityType } = require('discord.js');\n";
  code += "const rolesMiddleware = require('../resources/middleground/roles.js');\n";
  code += "const dbMiddleware = require('../resources/middleground/database.js');\n\n";
  code += "module.exports = {\n";
  code += `  data: new SlashCommandBuilder().setName(${JSON.stringify(triggerName)}).setDescription(${JSON.stringify(description || 'No description')})${slashOptionBuilders.join('')},\n`;
  code += `  name: ${JSON.stringify(triggerName)},\n`;
  code += `  prefix: ${JSON.stringify(prefix)},\n`;
  code += `  type: ${JSON.stringify(type)},\n`;
  code += `  description: ${JSON.stringify(description)},\n`;
  code += "  async execute({ interaction, message, client }) {\n";
  code += "    const guild = interaction?.guild || message?.guild;\n";
  code += "    const executorMember = interaction?.member || message?.member;\n";
  code += "    const rawArgs = interaction?.options ? [] : (message?.content?.trim().split(/\\s+/).slice(1) || []);\n";
  code += "    const resolvedOptions = {};\n";
  code += "    let targetUserId = null;\n";
  code += "    let targetRoleId = null;\n";
  code += "    let lastAffectedRoleId = null;\n";
  code += "    let lastAffectedUserId = null;\n";
  code += "    const arg1 = null;\n";
  code += buildFormatTextCode(false);

  let prefixArgIndex = 0;

  for (let i = 0; i < flatActions.length; i++) {
    const a = flatActions[i];
    const d = a.data || {};
    const indent = '    ';

    switch (a.type) {
      case 'send_poll': {
        const question = JSON.stringify(d.question || 'Poll Question');
        const answersRaw = JSON.stringify(String(d.answers || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 5));
        const duration = Number(d.duration || 24);
        const multi = Boolean(d.allowMultiselect);
        code += `${indent}const __pollOpts = { question: { text: await __formatText(${question}) }, allowMultiselect: ${multi}, duration: ${duration}, answers: ${answersRaw}.map(t => ({ text: await __formatText(t) })) };\n`;
        code += `${indent}if (interaction) await (interaction.deferred && !interaction.replied ? interaction.editReply : interaction.reply).call(interaction, { poll: __pollOpts });\n`;
        code += `${indent}else if (message) await message.reply({ poll: __pollOpts });\n`;
        break;
      }

      case 'random_number_gen': {
        const min = Number(d.min || 0);
        const max = Number(d.max || 100);
        code += `${indent}resolvedOptions[${JSON.stringify(d.varName || 'rand')}] = String(Math.floor(Math.random() * (${max} - ${min} + 1)) + ${min});\n`;
        break;
      }

      case 'time_argument': {
        const optName = (d.optionName || 'duration').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        code += `${indent}{\n`;
        code += `${indent}  const __rawDur = String(interaction?.options?.getString(${JSON.stringify(optName)}) || rawArgs[${prefixArgIndex}] || '10m').trim();\n`;
        code += `${indent}  const __m = __rawDur.match(/^(\\d+(?:\\.\\d+)?)\\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|week|weeks)?$/i);\n`;
        code += `${indent}  const __num = __m ? parseFloat(__m[1]) : 10;\n`;
        code += `${indent}  const __unit = (__m?.[2] || 'm').toLowerCase();\n`;
        code += `${indent}  const __mult = __unit.startsWith('s') ? 1 : __unit.startsWith('h') ? 3600 : __unit.startsWith('d') ? 86400 : __unit.startsWith('w') ? 604800 : 60;\n`;
        code += `${indent}  const __secs = Math.max(1, Math.round(__num * __mult));\n`;
        code += `${indent}  resolvedOptions[${JSON.stringify(optName)}] = __rawDur;\n`;
        code += `${indent}  resolvedOptions['duration_text'] = __rawDur;\n`;
        code += `${indent}  resolvedOptions['duration_seconds'] = String(__secs);\n`;
        code += `${indent}  resolvedOptions['duration_minutes'] = String(Math.max(1, Math.round(__secs / 60)));\n`;
        code += `${indent}  resolvedOptions['duration_ms'] = String(__secs * 1000);\n`;
        code += `${indent}}\n`;
        prefixArgIndex++;
        break;
      }

      case 'attachment_argument': {
        const optName = (d.attachmentName || 'attachment').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        code += `${indent}resolvedOptions['attachment'] = interaction?.options?.getAttachment(${JSON.stringify(optName)})?.url || message?.attachments?.first()?.url || '';\n`;
        break;
      }

      case 'role_permission': {
        const ids = String(d.roleIds || '').split(',').map((s) => s.trim()).filter(Boolean);
        const errMsg = d.errorMsg || 'You do not have permission to use this command.';
        code += `${indent}const __allowedRoles = ${JSON.stringify(ids)};\n`;
        code += `${indent}if (__allowedRoles.length > 0) { lastAffectedRoleId = __allowedRoles[0]; if (!targetRoleId) targetRoleId = __allowedRoles[0]; }\n`;
        code += `${indent}const __hasPerm = typeof rolesMiddleware === 'function' ? rolesMiddleware(executorMember, __allowedRoles) : (rolesMiddleware.hasAnyRole ? rolesMiddleware.hasAnyRole(executorMember, __allowedRoles) : __allowedRoles.some(id => executorMember?.roles?.cache?.has(id)));\n`;
        code += `${indent}if (!__hasPerm) {\n`;
        code += `${indent}  const __rolesMentions = __allowedRoles.map(id => \`<@&\${id}>\`).join(' or ');\n`;
        code += `${indent}  const __err = await __formatText(${JSON.stringify(errMsg)}.replace(/\\{roles\\}/g, __rolesMentions));\n`;
        code += `${indent}  if (interaction) await (interaction.deferred && !interaction.replied ? interaction.editReply : interaction.reply).call(interaction, { content: __err, allowedMentions: { parse: [] }, flags: MessageFlags.Ephemeral });\n`;
        code += `${indent}  else if (message) await message.reply({ content: __err, allowedMentions: { parse: [] } });\n`;
        code += `${indent}  return;\n`;
        code += `${indent}}\n`;
        break;
      }

      case 'user_argument': {
        const optName = (d.optionName || 'user').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        code += `${indent}const __userArg_${optName} = interaction?.options?.getUser(${JSON.stringify(optName)})?.id || (rawArgs[${prefixArgIndex}] || '').replace(/[<@!>]/g, '');\n`;
        code += `${indent}resolvedOptions[${JSON.stringify(optName)}] = __userArg_${optName};\n`;
        code += `${indent}if (__userArg_${optName}) { targetUserId = __userArg_${optName}; lastAffectedUserId = __userArg_${optName}; }\n`;
        prefixArgIndex++;
        break;
      }

      case 'role_argument': {
        const optName = (d.optionName || 'role').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        code += `${indent}const __roleArg_${optName} = interaction?.options?.getRole(${JSON.stringify(optName)})?.id || (rawArgs[${prefixArgIndex}] || '').replace(/[<@&>]/g, '');\n`;
        code += `${indent}resolvedOptions[${JSON.stringify(optName)}] = __roleArg_${optName};\n`;
        code += `${indent}if (__roleArg_${optName}) { targetRoleId = __roleArg_${optName}; lastAffectedRoleId = __roleArg_${optName}; }\n`;
        prefixArgIndex++;
        break;
      }

      case 'channel_argument': {
        const optName = (d.optionName || 'channel').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        code += `${indent}resolvedOptions[${JSON.stringify(optName)}] = interaction?.options?.getChannel(${JSON.stringify(optName)})?.id || (rawArgs[${prefixArgIndex}] || '').replace(/[<#>]/g, '');\n`;
        prefixArgIndex++;
        break;
      }

      case 'number_argument': {
        const optName = (d.optionName || 'number').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        code += `${indent}resolvedOptions[${JSON.stringify(optName)}] = String(interaction?.options?.getNumber(${JSON.stringify(optName)}) ?? rawArgs[${prefixArgIndex}] ?? '');\n`;
        prefixArgIndex++;
        break;
      }

      case 'text_argument':
      case 'choice_argument': {
        const optName = (d.optionName || 'text').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        code += `${indent}resolvedOptions[${JSON.stringify(optName)}] = interaction?.options?.getString(${JSON.stringify(optName)}) || rawArgs.slice(${prefixArgIndex}).join(' ');\n`;
        prefixArgIndex++;
        break;
      }

      case 'add_role':
      case 'remove_role': {
        const rawRole = String(d.roleId || '').trim().replace(/^\{|\}$/g, '');
        const op = a.type === 'add_role' ? 'add' : 'remove';
        code += `${indent}{\n`;
        code += `${indent}  const __roleId = (resolvedOptions[${JSON.stringify(rawRole)}] || ${JSON.stringify(rawRole)}) || targetRoleId;\n`;
        code += `${indent}  lastAffectedRoleId = __roleId;\n`;
        code += `${indent}  const __roleObj = guild ? await guild.roles.fetch(__roleId).catch(() => null) : null;\n`;
        code += `${indent}  if (__roleObj && guild?.members?.me && __roleObj.position >= guild.members.me.roles.highest.position) {\n`;
        code += `${indent}    if (interaction) await (interaction.deferred && !interaction.replied ? interaction.editReply : interaction.reply).call(interaction, { content: 'My bot role must be positioned above that role in Server Settings → Roles.', flags: MessageFlags.Ephemeral });\n`;
        code += `${indent}    return;\n`;
        code += `${indent}  }\n`;
        code += `${indent}  const __maxPermPos = Math.max(...__allowedRoles.map(id => executorMember?.roles?.cache?.get(id)?.position ?? -1));\n`;
        code += `${indent}  if (__roleObj && __maxPermPos >= 0 && __roleObj.position >= __maxPermPos) {\n`;
        code += `${indent}    if (interaction) await (interaction.deferred && !interaction.replied ? interaction.editReply : interaction.reply).call(interaction, { content: 'You cannot manage a role equal to or higher than your required permission role.', flags: MessageFlags.Ephemeral });\n`;
        code += `${indent}    return;\n`;
        code += `${indent}  }\n`;
        code += `${indent}  const __targetMember = targetUserId && guild ? await guild.members.fetch(targetUserId).catch(() => null) : executorMember;\n`;
        code += `${indent}  if (__targetMember && __roleId) await __targetMember.roles.${op}(__roleId);\n`;
        code += `${indent}}\n`;
        break;
      }

      case 'send_message': {
        const msgTemplate = d.message || '';
        const ephemeral = Boolean(d.ephemeral);
        code += `${indent}{\n`;
        code += `${indent}  let __msg = await __formatText(${JSON.stringify(msgTemplate)});\n`;
        code += `${indent}  if (interaction) {\n`;
        code += `${indent}    const __opts = { content: __msg };\n`;
        code += `${indent}    if (${ephemeral}) __opts.flags = MessageFlags.Ephemeral;\n`;
        code += `${indent}    if (interaction.deferred || interaction.replied) await interaction.followUp(__opts);\n`;
        code += `${indent}    else await (interaction.deferred && !interaction.replied ? interaction.editReply : interaction.reply).call(interaction, __opts);\n`;
        code += `${indent}  } else if (message) {\n`;
        code += `${indent}    await message.reply(__msg);\n`;
        code += `${indent}  }\n`;
        code += `${indent}}\n`;
        break;
      }

      case 'create_embed': {
        const res = compileEmbedContainer(flatActions, i, indent, false);
        code += res.code;
        i = res.nextIndex;
        break;
      }

      case 'global_ban':
      case 'global_kick': {
        const guildIds = String(d.guildIds || '');
        const reason = d.reason || 'No reason provided';
        const deleteDays = parseInt(d.deleteDays || 0);
        const op = a.type === 'global_ban' ? 'ban' : 'kick';
        code += `${indent}{\n`;
        code += `${indent}  const __userId = targetUserId || resolvedOptions['user'];\n`;
        code += `${indent}  let __affected = 0;\n`;
        code += `${indent}  const __targets = (${JSON.stringify(guildIds)} === 'all') ? client.guilds.cache.map(g => g.id) : ${JSON.stringify(guildIds)}.split(',').map(s => s.trim()).filter(Boolean);\n`;
        code += `${indent}  for (const gid of __targets) {\n`;
        code += `${indent}    const __g = client.guilds.cache.get(gid);\n`;
        code += `${indent}    if (__g) {\n`;
        code += `${indent}      const __m = await __g.members.fetch(__userId).catch(() => null);\n`;
        code += `${indent}      if (__m) { await __m[${JSON.stringify(op)}]( { reason: ${JSON.stringify(reason)} ${a.type === 'global_ban' ? ', deleteMessageDays: ' + deleteDays : ''} } ).catch(() => null); __affected++; }\n`;
        code += `${indent}    }\n`;
        code += `${indent}  }\n`;
        code += `${indent}  resolvedOptions['affected_servers'] = __affected;\n`;
        code += `${indent}}\n`;
        break;
      }
      case 'global_unban': {
        const userId = String(d.userId || '').trim();
        const guildIds = String(d.guildIds || '');
        const reason = d.reason || 'Global unban';
        code += `${indent}{\n`;
        code += `${indent}  const __rawUid = await __formatText(${JSON.stringify(userId)}) || targetUserId || resolvedOptions['user_id'] || resolvedOptions['userid'] || resolvedOptions['id'] || resolvedOptions['user'] || '';\n`;
        code += `${indent}  const __userId = String(__rawUid).replace(/[<@!>]/g, '').trim();\n`;
        code += `${indent}  if (__userId) { targetUserId = __userId; lastAffectedUserId = __userId; }\n`;
        code += `${indent}  const __reason = await __formatText(${JSON.stringify(reason)});\n`;
        code += `${indent}  let __affected = 0;\n`;
        code += `${indent}  const __targets = (${JSON.stringify(guildIds)}.trim().toLowerCase() === 'all') ? client.guilds.cache.map(g => g.id) : ${JSON.stringify(guildIds)}.split(',').map(s => s.trim()).filter(Boolean);\n`;
        code += `${indent}  for (const gid of __targets) {\n`;
        code += `${indent}    const __g = client.guilds.cache.get(gid) || await client.guilds.fetch(gid).catch(() => null);\n`;
        code += `${indent}    if (__g && __userId) {\n`;
        code += `${indent}      const __ok = await __g.bans.remove(__userId, __reason).then(() => true).catch(() => false);\n`;
        code += `${indent}      if (__ok) __affected++;\n`;
        code += `${indent}    }\n`;
        code += `${indent}  }\n`;
        code += `${indent}  resolvedOptions['affected_servers'] = String(__affected);\n`;
        code += `${indent}}\n`;
        break;
      }

      case 'unban_member': {
        const userId = d.userId || '';
        const reason = d.reason || 'No reason';
        code += `${indent}{\n`;
        code += `${indent}  const __uid = ${JSON.stringify(userId)} || targetUserId || resolvedOptions['user'];\n`;
        code += `${indent}  if (guild && __uid) await guild.bans.remove(__uid, ${JSON.stringify(reason)}).catch(() => null);\n`;
        code += `${indent}}\n`;
        break;
      }
      case 'timeout_member': {
        const minutes = parseInt(d.minutes || 0);
        const reason = d.reason || 'No reason';
        code += `${indent}{\n`;
        code += `${indent}  const __m = targetUserId && guild ? await guild.members.fetch(targetUserId).catch(() => null) : null;\n`;
        code += `${indent}  if (__m) await __m.timeout(minutes * 60 * 1000, ${JSON.stringify(reason)}).catch(() => null);\n`;
        code += `${indent}}\n`;
        break;
      }
      case 'purge_messages': {
        const amount = parseInt(d.amount || 1);
        code += `${indent}{\n`;
        code += `${indent}  if (channel) await channel.bulkDelete(${amount}, true).catch(() => null);\n`;
        code += `${indent}}\n`;
        break;
      }
      case 'set_nickname': {
        const nick = d.nickname || null;
        code += `${indent}{\n`;
        code += `${indent}  const __m = targetUserId && guild ? await guild.members.fetch(targetUserId).catch(() => null) : executorMember;\n`;
        code += `${indent}  if (__m) await __m.setNickname(${JSON.stringify(nick)}).catch(() => null);\n`;
        code += `${indent}}\n`;
        break;
      }
      case 'db_set': {
        code += `${indent}dbMiddleware.set(${JSON.stringify(d.table)}, await __formatText(${JSON.stringify(d.key)}), await __formatText(${JSON.stringify(d.value)}), ${JSON.stringify(d.mode)});\n`;
        break;
      }
      case 'db_get': {
        code += `${indent}resolvedOptions[${JSON.stringify(d.varName)}] = dbMiddleware.get(${JSON.stringify(d.table)}, await __formatText(${JSON.stringify(d.key)}), ${JSON.stringify(d.defaultValue)});\n`;
        break;
      }
      case 'db_delete': {
        code += `${indent}dbMiddleware.delete(${JSON.stringify(d.table)}, await __formatText(${JSON.stringify(d.key)}));\n`;
        break;
      }
      case 'db_sql_query': {
        const vName = String(d.varName || 'sql_row').trim();
        code += `${indent}{\n`;
        code += `${indent}  const __params = ${JSON.stringify(d.params || '')} ? ${JSON.stringify(d.params || '')}.split(',').map(s => await __formatText(s.trim())) : [];\n`;
        code += `${indent}  const __res = await dbMiddleware.query(await __formatText(${JSON.stringify(d.query)}), __params);\n`;
        code += `${indent}  const __first = Array.isArray(__res?.rows) ? (__res.rows[0] || null) : null;\n`;
        code += `${indent}  resolvedOptions[${JSON.stringify(vName)}] = __first ? JSON.stringify(__first) : '';\n`;
        code += `${indent}  if (__first && typeof __first === 'object') {\n`;
        code += `${indent}    for (const [__col, __val] of Object.entries(__first)) {\n`;
        code += `${indent}      resolvedOptions[\`${vName}.\${__col}\`] = __val !== null && __val !== undefined ? String(__val) : 'None';\n`;
        code += `${indent}    }\n`;
        code += `${indent}  }\n`;
        code += `${indent}}\n`;
        break;
      }
      case 'send_dm': {
        const res = compileDmContainer(flatActions, i, indent);
        code += res.code;
        i = res.nextIndex;
        break;
      }
      case 'send_channel_message': {
        code += `${indent}{\n`;
        code += `${indent}  const __c = guild?.channels?.cache?.get(await __formatText(${JSON.stringify(d.channelId || '')})) || client.channels.cache.get(await __formatText(${JSON.stringify(d.channelId || '')}));\n`;
        code += `${indent}  if (__c && __c.send) await __c.send(await __formatText(${JSON.stringify(d.message || '')})).catch(() => null);\n`;
        code += `${indent}}\n`;
        break;
      }
      case 'discord_permission': {
        code += `${indent}if (!executorMember.permissions.has(${JSON.stringify(d.permission)})) {\n`;
        code += `${indent}  if (interaction) await (interaction.deferred && !interaction.replied ? interaction.editReply : interaction.reply).call(interaction, { content: ${JSON.stringify(d.errorMsg)}, flags: MessageFlags.Ephemeral });\n`;
        code += `${indent}  return;\n`;
        code += `${indent}}\n`;
        break;
      }
      case 'kick_member':
      case 'ban_member': {
        const reason = d.reason || 'No reason provided';
        const method = a.type === 'kick_member' ? 'kick' : 'ban';
        code += `${indent}{\n`;
        code += `${indent}  const __targetMember = targetUserId && guild ? await guild.members.fetch(targetUserId).catch(() => null) : null;\n`;
        code += `${indent}  if (__targetMember) await __targetMember.${method}(${a.type === 'ban_member' ? `{ reason: ${JSON.stringify(reason)} }` : JSON.stringify(reason)});\n`;
        code += `${indent}}\n`;
        break;
      }
      case 'send_role_buttons': {
        const res = compileButtonPanelContainer(flatActions, i, indent, false);
        code += res.code;
        i = res.nextIndex;
        break;
      }

      case 'send_role_dropdown': {
        code += `${indent}{\n`;
        code += `${indent}  const __rawOpts = String(${JSON.stringify(d.options || '')}).split(',').map(s => s.trim()).filter(Boolean);\n`;
        code += `${indent}  const __menuOpts = __rawOpts.map((entry, idx) => {\n`;
        code += `${indent}    const [lbl, rId, desc] = entry.split(':').map(x => x.trim());\n`;
        code += `${indent}    if (!lbl || !rId) return null;\n`;
        code += `${indent}    const o = { label: await __formatText(lbl).slice(0, 100), value: \`\${rId}:\${idx}\` };\n`;
        code += `${indent}    if (desc) o.description = await __formatText(desc).slice(0, 100);\n`;
        code += `${indent}    return o;\n`;
        code += `${indent}  }).filter(Boolean).slice(0, 25);\n`;
        code += `${indent}  const __menu = new StringSelectMenuBuilder().setCustomId('dbm_role_select').setPlaceholder(await __formatText(${JSON.stringify(d.placeholder || 'Select a role...')})).setMinValues(1).setMaxValues(Math.max(1, __menuOpts.length)).addOptions(__menuOpts);\n`;
        code += `${indent}  const __row = new ActionRowBuilder().addComponents(__menu);\n`;
        code += `${indent}  const __embed = new EmbedBuilder().setColor(${JSON.stringify(d.color || '#2b82d9')});\n`;
        if (d.title) code += `${indent}  __embed.setTitle(await __formatText(${JSON.stringify(d.title)}));\n`;
        code += `${indent}  __embed.setDescription(await __formatText(${JSON.stringify(d.message || 'Use the dropdown below to toggle your roles.')}));\n`;
        code += `${indent}  const __payload = { embeds: [__embed], components: [__row] };\n`;
        code += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')});\n`;
        code += `${indent}  if (__chId) {\n`;
        code += `${indent}    const __ch = guild?.channels?.cache?.get(__chId) || client.channels.cache.get(__chId);\n`;
        code += `${indent}    if (__ch && __ch.send) await __ch.send(__payload);\n`;
        code += `${indent}    if (interaction && !interaction.replied && !interaction.deferred) await (interaction.deferred && !interaction.replied ? interaction.editReply : interaction.reply).call(interaction, { content: 'Role dropdown menu sent!', flags: MessageFlags.Ephemeral });\n`;
        code += `${indent}  } else if (interaction) {\n`;
        code += `${indent}    if (interaction.deferred || interaction.replied) await interaction.followUp(__payload);\n`;
        code += `${indent}    else await (interaction.deferred && !interaction.replied ? interaction.editReply : interaction.reply).call(interaction, __payload);\n`;
        code += `${indent}  } else if (message) await message.channel.send(__payload);\n`;
        code += `${indent}}\n`;
        break;
      }

      case 'lock_channel': {
        const mins = Number(d.minutes) || 0;
        code += `${indent}{\n`;
        code += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')}) || interaction?.channelId || message?.channelId;\n`;
        code += `${indent}  const __ch = guild?.channels?.cache?.get(__chId) || (guild && __chId ? await guild.channels.fetch(__chId).catch(() => null) : null);\n`;
        code += `${indent}  const __reason = await __formatText(${JSON.stringify(d.reason || 'Channel locked by staff')});\n`;
        code += `${indent}  if (__ch && __ch.permissionOverwrites && guild?.roles?.everyone) {\n`;
        code += `${indent}    await __ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false, SendMessagesInThreads: false, AddReactions: false, Connect: false, Speak: false }, { reason: __reason }).catch(() => null);\n`;
        if (mins > 0) {
          code += `${indent}    setTimeout(async () => {\n`;
          code += `${indent}      await __ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null, SendMessagesInThreads: null, AddReactions: null, Connect: null, Speak: null }, { reason: 'Lockdown timer expired' }).catch(() => null);\n`;
          code += `${indent}      if (__ch.send) await __ch.send('🔓 **Lockdown has ended.**').catch(() => null);\n`;
          code += `${indent}    }, ${mins * 60000});\n`;
        }
        code += `${indent}  }\n`;
        code += `${indent}}\n`;
        break;
      }

      case 'unlock_channel': {
        code += `${indent}{\n`;
        code += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')}) || interaction?.channelId || message?.channelId;\n`;
        code += `${indent}  const __ch = guild?.channels?.cache?.get(__chId) || (guild && __chId ? await guild.channels.fetch(__chId).catch(() => null) : null);\n`;
        code += `${indent}  const __reason = await __formatText(${JSON.stringify(d.reason || 'Channel unlocked by staff')});\n`;
        code += `${indent}  if (__ch && __ch.permissionOverwrites && guild?.roles?.everyone) {\n`;
        code += `${indent}    await __ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null, SendMessagesInThreads: null, AddReactions: null, Connect: null, Speak: null }, { reason: __reason }).catch(() => null);\n`;
        code += `${indent}  }\n`;
        code += `${indent}}\n`;
        break;
      }

      case 'wait': {
        const ms = (Number(d.seconds) || 1) * 1000;
        code += `${indent}await new Promise((r) => setTimeout(r, ${ms}));\n`;
        break;
      }

      default:
        code += compileExtraAction(a, indent, false);
        break;
    }
  }

  code += "  }\n";
  code += "};\n";
  return code;
}

function compileEventToJS(evt) {
  const flatActions = [];
  const flatten = (arr) => {
    for (const a of arr || []) {
      flatActions.push(a);
      if (a.children) flatten(a.children);
    }
  };
  flatten(evt.actions || []);

  const eventTriggers = new Set([
    'guildMemberAdd', 'guildMemberRemove', 'guildMemberUpdate',
    'guildBanAdd', 'guildBanRemove', 'messageCreate', 'messageUpdate',
    'messageDelete', 'channelCreate', 'channelDelete', 'roleCreate',
    'roleDelete', 'voiceStateUpdate', 'guildBoost', 'guildBoostRemove', 'ready',
    'buttonClick', 'dropdownSelect'
  ]);

  let eventType = evt.trigger || 'guildMemberAdd';
  let containsFilter = '';
  let customIdFilter = '';
  for (const a of flatActions) {
    if (eventTriggers.has(a.type)) {
      eventType = a.type;
      if (a.data?.contains) containsFilter = a.data.contains;
      if (a.data?.customIdFilter) customIdFilter = a.data.customIdFilter;
      break;
    }
  }

  let code = '';
  code += "const { EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits, ChannelType, WebhookClient, ActivityType } = require('discord.js');\n";
  code += "const rolesMiddleware = require('../resources/middleground/roles.js');\n";
  code += "const dbMiddleware = require('../resources/middleground/database.js');\n\n";
  code += "module.exports = {\n";
  code += `  name: ${JSON.stringify(evt.name || 'event')},\n`;
  code += `  event: ${JSON.stringify(eventType)},\n`;
  code += "  async execute(arg1, arg2, client) {\n";
  if (eventType === 'guildBoost') {
    code += "    if (arg1?.premiumSince || !arg2?.premiumSince) return;\n";
  } else if (eventType === 'guildBoostRemove') {
    code += "    if (!arg1?.premiumSince || arg2?.premiumSince) return;\n";
  }
  code += "    const interaction = arg1?.isMessageComponent?.() ? arg1 : null;\n";
  code += "    const member = interaction?.member || (arg2?.user && arg2?.guild ? arg2 : (arg1?.user && arg1?.guild ? arg1 : null));\n";
  code += "    const message = arg1?.content !== undefined || arg1?.author ? arg1 : (arg2?.content !== undefined ? arg2 : null);\n";
  code += "    const guild = interaction?.guild || arg1?.guild || arg2?.guild || (arg1?.members && arg1?.channels ? arg1 : null);\n";
  code += "    const executorMember = member || message?.member || null;\n";
  code += "    let targetUserId = interaction?.user?.id || member?.id || message?.author?.id || arg1?.user?.id || arg1?.id || null;\n";
  code += "    let targetRoleId = arg1?.role?.id || (arg1?.permissions && arg1?.color !== undefined ? arg1.id : null);\n";
  code += "    let lastAffectedRoleId = targetRoleId;\n";
  code += "    let lastAffectedUserId = targetUserId;\n";
  code += "    const resolvedOptions = {};\n";
  code += "    if (interaction) {\n";
  code += "      resolvedOptions['custom_id'] = interaction.customId || '';\n";
  code += "      resolvedOptions['button_label'] = interaction.component?.label || '';\n";
  code += "      resolvedOptions['selected_values'] = Array.isArray(interaction.values) ? interaction.values.join(', ') : '';\n";
  code += "    }\n";

  if (containsFilter) {
    code += `    if (message?.content && !message.content.toLowerCase().includes(${JSON.stringify(containsFilter.toLowerCase())})) return;\n`;
  }
  code += buildFormatTextCode(true);

  for (let i = 0; i < flatActions.length; i++) {
    const a = flatActions[i];
    if (eventTriggers.has(a.type)) continue;
    const d = a.data || {};
    const indent = '    ';

    switch (a.type) {
      case 'role_permission': {
        const ids = String(d.roleIds || '').split(',').map((s) => s.trim()).filter(Boolean);
        code += `${indent}if (!${JSON.stringify(ids)}.some(id => executorMember?.roles?.cache?.has(id))) return;\n`;
        break;
      }
      case 'add_role':
      case 'remove_role': {
        const op = a.type === 'add_role' ? 'add' : 'remove';
        const targetGuildId = String(d.guildId || '').trim();
        code += `${indent}{\n`;
        if (targetGuildId) {
          code += `${indent}  if (guild?.id === ${JSON.stringify(targetGuildId)}) {\n`;
          code += `${indent}    const __roleId = await __formatText(${JSON.stringify(d.roleId || '')}) || targetRoleId;\n`;
          code += `${indent}    lastAffectedRoleId = __roleId;\n`;
          code += `${indent}    const __m = executorMember || (targetUserId && guild ? await guild.members.fetch(targetUserId).catch(() => null) : null);\n`;
          code += `${indent}    if (__m && __roleId) await __m.roles.${op}(__roleId).catch(() => null);\n`;
          code += `${indent}  }\n`;
        } else {
          code += `${indent}  const __roleId = await __formatText(${JSON.stringify(d.roleId || '')}) || targetRoleId;\n`;
          code += `${indent}  lastAffectedRoleId = __roleId;\n`;
          code += `${indent}  const __m = executorMember || (targetUserId && guild ? await guild.members.fetch(targetUserId).catch(() => null) : null);\n`;
          code += `${indent}  if (__m && __roleId) await __m.roles.${op}(__roleId).catch(() => null);\n`;
        }
        code += `${indent}}\n`;
        break;
      }
       case 'sticky_message': {
        code += `${indent}{\n`;
        code += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')});\n`;
        code += `${indent}  const __body = await __formatText(${JSON.stringify(d.message || '')});\n`;
        code += `${indent}  const __isBoot = Boolean(arg1?.user && arg1?.channels);\n`;
        code += `${indent}  if (!__isBoot && (!message || message.author?.bot || message.channelId !== __chId)) return;\n`;
        code += `${indent}  if (__chId && __body) {\n`;
        code += `${indent}    client.__handledStickies = client.__handledStickies || new Set();\n`;
        code += `${indent}    const __dedupKey = __isBoot ? \`boot:\${__chId}\` : \`msg:\${message.id}:\${__chId}\`;\n`;
        code += `${indent}    if (client.__handledStickies.has(__dedupKey)) return;\n`;
        code += `${indent}    client.__handledStickies.add(__dedupKey);\n`;
        code += `${indent}    const __ch = guild ? guild.channels.cache.get(__chId) : (client?.channels?.cache?.get(__chId) || await client?.channels?.fetch(__chId).catch(() => null));\n`;
        code += `${indent}    if (__ch && __ch.send) {\n`;
        code += `${indent}      client.__stickyMessages = client.__stickyMessages || new Map();\n`;
        code += `${indent}      const __prevId = client.__stickyMessages.get(__chId);\n`;
        code += `${indent}      if (__prevId) await __ch.messages.delete(__prevId).catch(() => null);\n`;
        code += `${indent}      if (__ch.messages?.fetch) {\n`;
        code += `${indent}        const __recent = await __ch.messages.fetch({ limit: 15 }).catch(() => null);\n`;
        code += `${indent}        if (__recent) {\n`;
        code += `${indent}          for (const [, __m] of __recent) {\n`;
        code += `${indent}            if (__m.author?.id === client.user?.id && __m.content?.includes('Sticky Message**')) {\n`;
        code += `${indent}              await __m.delete().catch(() => null);\n`;
        code += `${indent}            }\n`;
        code += `${indent}          }\n`;
        code += `${indent}        }\n`;
        code += `${indent}      }\n`;
        code += `${indent}      const __sent = await __ch.send({ content: \`**\\uD83D\\uDCCC Sticky Message**\\n\\n\${__body}\`, allowedMentions: { parse: ['users', 'roles'] } }).catch(() => null);\n`;
        code += `${indent}      if (__sent) client.__stickyMessages.set(__chId, __sent.id);\n`;
        code += `${indent}    }\n`;
        code += `${indent}  }\n`;
        code += `${indent}}\n`;
        break;
      }
      case 'send_channel_message':
      case 'send_message': {
        code += `${indent}{\n`;
        code += `${indent}  const __msg = await __formatText(${JSON.stringify(d.message || '')});\n`;
        code += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')}) || message?.channelId;\n`;
        code += `${indent}  const __ch = __chId ? (guild ? guild.channels.cache.get(__chId) : client?.channels?.cache?.get(__chId)) : null;\n`;
        code += `${indent}  if (__ch && __ch.send && __msg) await __ch.send({ content: __msg, allowedMentions: { parse: ['users', 'roles'] } }).catch(() => null);\n`;
        code += `${indent}}\n`;
        break;
      }
      case 'send_dm': {
        const res = compileDmContainer(flatActions, i, indent);
        code += res.code;
        i = res.nextIndex;
        break;
      }
      case 'send_role_buttons': {
        const res = compileButtonPanelContainer(flatActions, i, indent, true);
        code += res.code;
        i = res.nextIndex;
        break;
      }
      case 'create_embed': {
        const res = compileEmbedContainer(flatActions, i, indent, true);
        code += res.code;
        i = res.nextIndex;
        break;
      }
      case 'kick_member':
      case 'ban_member': {
        const method = a.type === 'kick_member' ? 'kick' : 'ban';
        code += `${indent}{\n`;
        code += `${indent}  const __m = executorMember || (targetUserId && guild ? await guild.members.fetch(targetUserId).catch(() => null) : null);\n`;
        code += `${indent}  if (__m) await __m.${method}(${a.type === 'ban_member' ? `{ reason: ${JSON.stringify(d.reason || 'Event trigger')} }` : JSON.stringify(d.reason || 'Event trigger')}).catch(() => null);\n`;
        code += `${indent}}\n`;
        break;
      }

      case 'timeout_member': {
        code += `${indent}if (executorMember) await executorMember.timeout(${(Number(d.minutes) || 1) * 60000}, ${JSON.stringify(d.reason || 'Event trigger')}).catch(() => null);\n`;
        break;
      }
      case 'set_nickname': {
        code += `${indent}if (executorMember) await executorMember.setNickname(${JSON.stringify(d.nickname || null)}).catch(() => null);\n`;
        break;
      }
      case 'db_set': {
        code += `${indent}dbMiddleware.set(${JSON.stringify(d.table)}, await __formatText(${JSON.stringify(d.key)}), await __formatText(${JSON.stringify(d.value)}), ${JSON.stringify(d.mode)});\n`;
        break;
      }
      case 'db_get': {
        code += `${indent}resolvedOptions[${JSON.stringify(d.varName)}] = dbMiddleware.get(${JSON.stringify(d.table)}, await __formatText(${JSON.stringify(d.key)}), ${JSON.stringify(d.defaultValue)});\n`;
        break;
      }
      case 'toggle_role': {
        const addTpl = d.addMsg || d.replyMsg || 'Added {role} to yourself!';
        const remTpl = d.removeMsg || d.replyMsg || 'Removed {role} from yourself!';
        code += `${indent}{\n`;
        code += `${indent}  const __roleId = await __formatText(${JSON.stringify(d.roleId || '')}) || targetRoleId;\n`;
        code += `${indent}  lastAffectedRoleId = __roleId;\n`;
        code += `${indent}  const __m = executorMember || (targetUserId && guild ? await guild.members.fetch(targetUserId).catch(() => null) : null);\n`;
        code += `${indent}  if (__m && __roleId) {\n`;
        code += `${indent}    const __had = __m.roles.cache.has(__roleId);\n`;
        code += `${indent}    if (__had) await __m.roles.remove(__roleId).catch(() => null);\n`;
        code += `${indent}    else await __m.roles.add(__roleId).catch(() => null);\n`;
        code += `${indent}    if (interaction && !interaction.replied && !interaction.deferred) {\n`;
        code += `${indent}      const __replyStr = await __formatText(__had ? ${JSON.stringify(remTpl)} : ${JSON.stringify(addTpl)});\n`;
        code += `${indent}      await (interaction.deferred && !interaction.replied ? interaction.editReply : interaction.reply).call(interaction, { content: __replyStr, allowedMentions: { parse: [] }, flags: MessageFlags.Ephemeral }).catch(() => null);\n`;
        code += `${indent}    }\n`;
        code += `${indent}  }\n`;
        code += `${indent}}\n`;
        break;
      }
      case 'lock_channel': {
        const mins = Number(d.minutes) || 0;
        code += `${indent}{\n`;
        code += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')}) || message?.channelId;\n`;
        code += `${indent}  const __ch = guild?.channels?.cache?.get(__chId) || (guild && __chId ? await guild.channels.fetch(__chId).catch(() => null) : null);\n`;
        code += `${indent}  const __reason = await __formatText(${JSON.stringify(d.reason || 'Channel locked')});\n`;
        code += `${indent}  if (__ch && __ch.permissionOverwrites && guild?.roles?.everyone) {\n`;
        code += `${indent}    await __ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false, SendMessagesInThreads: false, AddReactions: false, Connect: false, Speak: false }, { reason: __reason }).catch(() => null);\n`;
        if (mins > 0) {
          code += `${indent}    setTimeout(async () => {\n`;
          code += `${indent}      await __ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null, SendMessagesInThreads: null, AddReactions: null, Connect: null, Speak: null }, { reason: 'Lockdown timer expired' }).catch(() => null);\n`;
          code += `${indent}      if (__ch.send) await __ch.send('🔓 **Lockdown has ended.**').catch(() => null);\n`;
          code += `${indent}    }, ${mins * 60000});\n`;
        }
        code += `${indent}  }\n`;
        code += `${indent}}\n`;
        break;
      }
      case 'unlock_channel': {
        code += `${indent}{\n`;
        code += `${indent}  const __chId = await __formatText(${JSON.stringify(d.channelId || '')}) || message?.channelId;\n`;
        code += `${indent}  const __ch = guild?.channels?.cache?.get(__chId) || (guild && __chId ? await guild.channels.fetch(__chId).catch(() => null) : null);\n`;
        code += `${indent}  const __reason = await __formatText(${JSON.stringify(d.reason || 'Channel unlocked')});\n`;
        code += `${indent}  if (__ch && __ch.permissionOverwrites && guild?.roles?.everyone) {\n`;
        code += `${indent}    await __ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null, SendMessagesInThreads: null, AddReactions: null, Connect: null, Speak: null }, { reason: __reason }).catch(() => null);\n`;
        code += `${indent}  }\n`;
        code += `${indent}}\n`;
        break;
      }
      case 'db_sql_query': {
        code += `${indent}const __res = dbMiddleware.query(await __formatText(${JSON.stringify(d.query)}), ${JSON.stringify(d.params || '')}.split(',').map(s => await __formatText(s.trim())).filter(Boolean));\n`;
        code += `${indent}if (${JSON.stringify(d.varName)}) resolvedOptions[${JSON.stringify(d.varName)}] = __res.rows;\n`;
        break;
      }
      case 'db_delete': {
        code += `${indent}dbMiddleware.delete(${JSON.stringify(d.table)}, await __formatText(${JSON.stringify(d.key)}));\n`;
        break;
      }
      case 'wait': {
        code += `${indent}await new Promise((r) => setTimeout(r, ${(Number(d.seconds) || 1) * 1000}));\n`;
        break;
      }
      default:
        code += compileExtraAction(a, indent, true);
        break;
    }
}
code += "  }\n";
code += "};\n";
return code;
}
module.exports = { compileCommandToJS, compileEventToJS };

