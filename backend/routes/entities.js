/**
 * Entity routes (systemNode, groupNode, connectionNode)
 *   POST   /api/entities
 *   PATCH  /api/entities/:id
 *   DELETE /api/entities/:id
 *
 * For smart dataflowType (connectionNode) flow management with Logic App
 * auto-check, use /api/dataflow-types instead.
 */
const express = require('express');
const { nanoid } = require('nanoid');
const { loadDb, saveDb } = require('../db');

const router = express.Router();

// POST /api/entities
router.post('/', (req, res) => {
  const db     = loadDb();
  const entity = { id: nanoid(), apiConnections: {}, ...req.body };
  db.entities.push(entity);
  saveDb(db);
  res.json(entity);
});

// PATCH /api/entities/:id
router.patch('/:id', (req, res) => {
  const db  = loadDb();
  const idx = db.entities.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Entity not found' });

  const entity = db.entities[idx];
  const patch  = req.body;

  if (patch.position       !== undefined) entity.position       = patch.position;
  if (patch.style          !== undefined) entity.style          = patch.style;
  if (patch.parentId       !== undefined) entity.parentId       = patch.parentId;
  if (patch.data           !== undefined) entity.data           = { ...entity.data, ...patch.data };
  if (patch.apiConnections !== undefined) entity.apiConnections = { ...entity.apiConnections, ...patch.apiConnections };

  db.entities[idx] = entity;
  saveDb(db);
  res.json(entity);
});

// DELETE /api/entities/:id
router.delete('/:id', (req, res) => {
  const db     = loadDb();
  const entity = db.entities.find((e) => e.id === req.params.id);
  if (!entity) return res.status(404).json({ error: 'Entity not found' });

  db.entities = db.entities.filter((e) => e.id !== req.params.id);

  // Remove edges directly touching this entity
  db.dataflows = db.dataflows.filter(
    (d) => d.source !== req.params.id && d.target !== req.params.id
  );

  // If it was a systemNode, also remove orphaned connectionNodes + their edges
  if (entity.type === 'systemNode') {
    const orphanIds = db.entities
      .filter(
        (e) =>
          e.type === 'connectionNode' &&
          (e.data?.sourceId === req.params.id || e.data?.targetId === req.params.id)
      )
      .map((e) => e.id);

    if (orphanIds.length > 0) {
      db.entities  = db.entities.filter((e) => !orphanIds.includes(e.id));
      db.dataflows = db.dataflows.filter(
        (d) => !orphanIds.includes(d.source) && !orphanIds.includes(d.target)
      );
    }
  }

  // Drop stale references to this entity from value streams
  db.valueStreams = (db.valueStreams || []).map((vs) =>
    vs.nodeIds
      ? { ...vs, nodeIds: vs.nodeIds.filter((nid) => nid !== req.params.id) }
      : vs
  );

  saveDb(db);
  res.json({ ok: true });
});

module.exports = router;
