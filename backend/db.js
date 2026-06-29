// File-based JSON persistence layer.
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

const EMPTY_DB = {
  bootstrapped: false,
  entities: [],
  dataflows: [],
  valueStreams: [],
};

function loadDb() {
  try {
    if (!fs.existsSync(DB_PATH)) return JSON.parse(JSON.stringify(EMPTY_DB));
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      bootstrapped: Boolean(parsed.bootstrapped),
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      dataflows: Array.isArray(parsed.dataflows) ? parsed.dataflows : [],
      valueStreams: Array.isArray(parsed.valueStreams) ? parsed.valueStreams : [],
    };
  } catch (err) {
    console.error('[db] Failed to load db.json, starting empty:', err.message);
    return JSON.parse(JSON.stringify(EMPTY_DB));
  }
}

function saveDb(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[db] Failed to write db.json:', err.message);
  }
}

module.exports = { loadDb, saveDb };
