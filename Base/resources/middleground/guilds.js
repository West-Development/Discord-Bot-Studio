module.exports = {
    get: (client, id) => client.guilds.cache.get(id)
};