const plugins = new Map();

function register(name, plugin) {
    plugins.set(name, plugin);
}

function get(name) {
    return plugins.get(name);
}

function all() {
    return Array.from(plugins.values());
}

module.exports = { register, get, all };  
