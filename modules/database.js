const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/database.json');

function ensureDataDir() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function loadData() {
    ensureDataDir();
    try {
        if (!fs.existsSync(DB_PATH)) {
            const initial = { warnings: {}, groups: {}, banned: [] };
            fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
            return initial;
        }
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (error) {
        console.error('❌ Database read error:', error.message);
        return { warnings: {}, groups: {}, banned: [] };
    }
}

function saveData(data) {
    ensureDataDir();
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Database write error:', error.message);
        return false;
    }
}

module.exports = { loadData, saveData };
