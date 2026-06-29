/**
 * Graph routes
 *   GET  /api/graph      – full graph for React Flow
 *   POST /api/bootstrap  – seed initial data
 */
const express = require('express');
const { loadDb, saveDb } = require('../db');

const router = express.Router();

// GET /api/graph
router.get('/', (_req, res) => {
  const db = loadDb();
  res.json({
    entities:     db.entities,
    dataflows:    db.dataflows,
    valueStreams:  db.valueStreams || [],
    bootstrapped: db.bootstrapped,
  });
});

// POST /api/bootstrap
router.post('/bootstrap', (req, res) => {
  const db    = loadDb();
  const force = req.query.force === '1';

  if (db.bootstrapped && !force) {
    return res.json({ ok: true, skipped: true });
  }

  const { entities, dataflows, valueStreams } = req.body;
  db.entities    = entities    || [];
  db.dataflows   = dataflows   || [];
  db.valueStreams = valueStreams || [];
  db.bootstrapped = true;
  saveDb(db);
  res.json({ ok: true });
});

module.exports = router;
