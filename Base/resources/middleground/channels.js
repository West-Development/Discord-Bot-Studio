module.exports = {
    send: async (channel, content) => await channel.send(content),
    get: (guild, id) => guild.channels.cache.get(id)
};