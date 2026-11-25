const sessions = new Map();
module.exports = {
    set: (id, data) => sessions.set(id, data),
    get: (id) => sessions.get(id)
};