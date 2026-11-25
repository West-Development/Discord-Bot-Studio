const fs = require('fs');
const path = require('path');

let currentLocale = 'en';
let translations = {};

function loadLocale(locale) {
    const filePath = path.join(__dirname, `../locales/${locale}.json`);
    if (fs.existsSync(filePath)) {
        translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        currentLocale = locale;
    }
}

function t(key, params = {}) {
    let str = translations[key] || key;
    for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, v);
    }
    return str;
}

module.exports = { loadLocale, t };