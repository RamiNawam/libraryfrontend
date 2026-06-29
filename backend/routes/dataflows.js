/**
 * Dataflow (edge) routes
 *   POST   /api/dataflows
 *   PATCH  /api/dataflows/:id
 *   DELETE /api/dataflows/:id
 */
const express = require('express');
const { nanoid } = require('nanoid');
const { loadDb, saveDb } = require('../db');

const router = express.Router();

router.post('/', (req, res) => {
  const db       = loadDb();
  const dataflow = { id: nanoid(), apiConnections: {}, ...req.body };
  db.dataflows.push(dataflow);
  saveDb(db);
  res.json(dataflow);
});

router.patch('/:id', (req, res) => {
  const db  = loadDb();
  const idx = db.dataflows.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Dataflow not found' });

  const dataflow = db.dataflows[idx];
  const patch    = req.body;

  if (patch.data           !== undefined) dataflow.data           = { ...dataflow.data,           ...patch.data };
  if (patch.source         !== undefined) dataflow.source         = patch.source;
  if (patch.target         !== undefined) dataflow.target         = patch.target;
  if (patch.apiConnections !== undefined) dataflow.apiConnections = { ...dataflow.apiConnections, ...patch.apiConnections };

  db.dataflows[idx] = dataflow;
  saveDb(db);
  res.json(dataflow);
});

router.delete('/:id', (req, res) => {
  const db = loadDb();
  db.dataflows = db.dataflows.filter((d) => d.id !== req.params.id);
  saveDb(db);
  res.json({ ok: true });
});

module.exports = router;
