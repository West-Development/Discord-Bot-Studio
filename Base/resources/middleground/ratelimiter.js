const limits = new Map();
module.exports = {
    isLimited: (key, limit, window) => {
        const now = Date.now();
        const record = limits.get(key) || { count: 0, reset: now + window };
        if (now > record.reset) { record.count = 0; record.reset = now + window; }
        record.count++;
        limits.set(key, record);
        return record.count > limit;
    }
};