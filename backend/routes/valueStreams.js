/**
 * Value Stream routes
 *   GET    /api/valuestreams
 *   POST   /api/valuestreams
 *   DELETE /api/valuestreams/:id
 */
const express = require('express');
const { nanoid } = require('nanoid');
const { loadDb, saveDb } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const db = loadDb();
  res.json(db.valueStreams || []);
});

router.post('/', (req, res) => {
  const db = loadDb();
  const vs = { id: nanoid(), ...req.body };
  db.valueStreams = db.valueStreams || [];
  db.valueStreams.push(vs);
  saveDb(db);
  res.json(vs);
});

router.patch('/:id', (req, res) => {
  const db = loadDb();
  db.valueStreams = db.valueStreams || [];
  const idx = db.valueStreams.findIndex((v) => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.valueStreams[idx] = { ...db.valueStreams[idx], ...req.body };
  saveDb(db);
  res.json(db.valueStreams[idx]);
});

router.delete('/:id', (req, res) => {
  const db = loadDb();
  db.valueStreams = (db.valueStreams || []).filter((v) => v.id !== req.params.id);
  saveDb(db);
  res.json({ ok: true });
});

module.exports = router;
