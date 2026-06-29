/**
 * Connection routes – create a DataflowType triangle + its two connector edges.
 *   POST /api/connections
 */
const express = require('express');
const { nanoid } = require('nanoid');
const { loadDb, saveDb } = require('../db');

const router = express.Router();

router.post('/', (req, res) => {
  const db = loadDb();
  const { sourceId, targetId, name } = req.body;

  if (!sourceId || !targetId || !name) {
    return res.status(400).json({ error: 'sourceId, targetId, and name are required' });
  }

  const sourceEntity = db.entities.find((e) => e.id === sourceId);
  const targetEntity = db.entities.find((e) => e.id === targetId);
  if (!sourceEntity) return res.status(400).json({ error: 'Source entity not found' });
  if (!targetEntity) return res.status(400).json({ error: 'Target entity not found' });

  const sourceLabel = sourceEntity.data?.label || sourceId;
  const targetLabel = targetEntity.data?.label || targetId;

  // Position the triangle midway between source and target
  const sx = sourceEntity.position?.x || 0;
  const sy = sourceEntity.position?.y || 0;
  const tx = targetEntity.position?.x || 300;
  const ty = targetEntity.position?.y || 0;

  const connId = nanoid();
  const connectionNode = {
    id:   connId,
    type: 'connectionNode',
    position: { x: (sx + tx) / 2, y: (sy + ty) / 2 },
    data: {
      name,
      sourceId,
      targetId,
      health: 'unknown',
      flows:  [],
    },
    apiConnections: {},
  };

  const edge1 = {
    id:     nanoid(),
    source: sourceId,
    target: connId,
    type:   'connectorEdge',
    data:   { sourceLabel, targetLabel: name, flowCount: 0, health: 'unknown', flows: [] },
    apiConnections: {},
  };

  const edge2 = {
    id:     nanoid(),
    source: connId,
    target: targetId,
    type:   'connectorEdge',
    data:   { sourceLabel: name, targetLabel, flowCount: 0, health: 'unknown', flows: [] },
    apiConnections: {},
  };

  db.entities.push(connectionNode);
  db.dataflows.push(edge1, edge2);
  saveDb(db);

  res.json({ connectionNode, edges: [edge1, edge2] });
});

module.exports = router;
