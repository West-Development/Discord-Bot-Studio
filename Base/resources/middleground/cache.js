const cache = new Map();
module.exports = {
    set: (key, value, ttl = 60000) => cache.set(key, { value, expires: Date.now() + ttl }),
    get: (key) => {
        const item = cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expires) { cache.delete(key); return null; }
        return item.value;
    }
};