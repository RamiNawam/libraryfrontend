/**
 * DataflowType routes – smart CRUD for connectionNodes and their individual flows.
 *
 * When a flow is saved with integration.type === 'logicApp', the backend
 * immediately tries to connect to Azure and fetches the latest run status.
 * The response contains the updated connectionNode with live health data,
 * so the triangle and edges update color automatically.
 *
 *   GET    /api/dataflow-types/:id            – get one connectionNode
 *   POST   /api/dataflow-types/:id/flows      – add a flow (auto-checks Logic App)
 *   PATCH  /api/dataflow-types/:id/flows/:fid – update a flow (auto-checks Logic App)
 *   DELETE /api/dataflow-types/:id/flows/:fid – delete a flow
 */
const express = require('express');
const { nanoid } = require('nanoid');
const { loadDb, saveDb } = require('../db');
const { computeConnectionHealth, propagateHealthToEdges } = require('../services/health');
const { getLogicAppHealth } = require('../integrations/logicApps/logicAppsClient');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/dataflow-types/:id
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  const db   = loadDb();
  const node = db.entities.find((e) => e.id === req.params.id && e.type === 'connectionNode');
  if (!node) return res.status(404).json({ error: 'DataflowType not found' });
  res.json(node);
});

// ---------------------------------------------------------------------------
// POST /api/dataflow-types/:id/flows
// ---------------------------------------------------------------------------
router.post('/:id/flows', async (req, res) => {
  const db   = loadDb();
  const idx  = db.entities.findIndex((e) => e.id === req.params.id && e.type === 'connectionNode');
  if (idx === -1) return res.status(404).json({ error: 'DataflowType not found' });

  const node  = db.entities[idx];
  const flow  = { id: nanoid(), ...req.body };

  // Auto-check Logic App status if credentials provided
  if (flow.integration?.type === 'logicApp') {
    flow.mode = 'not_connected';
    try {
      const result = await getLogicAppHealth({ ...flow.integration, flowId: flow.id });
      flow.status        = result.status;
      flow.mode          = result.mode;
      flow.lastTriggered = result.lastTriggered || 'Never';
      flow.lastError     = result.lastError     || null;
      flow.azure         = {
        workflowName:    result.workflowName,
        logicAppKind:    result.logicAppKind,
        resourceGroup:   result.resourceGroup,
        standardSiteName: result.standardSiteName || null,
        lastRunStatus:   result.lastRunStatus,
        lastCompleted:   result.lastCompleted,
        runId:           result.runId,
        rawRunCount:     result.rawRunCount,
        syncedAt:        new Date().toISOString(),
      };
    } catch (err) {
      console.error(`[dataflowTypes] Logic App check failed for ${flow.integration.workflowName}:`, err.message);
      flow.status    = 'unknown';
      flow.lastError = err.message;
    }
  }

  node.data.flows = [...(node.data.flows || []), flow];
  node.data.health = computeConnectionHealth(node.data.flows);
  propagateHealthToEdges(db, node.id, node.data.health);

  db.entities[idx] = node;
  saveDb(db);
  res.json(node); // return full updated connectionNode
});

// ---------------------------------------------------------------------------
// PATCH /api/dataflow-types/:id/flows/:fid
// ---------------------------------------------------------------------------
router.patch('/:id/flows/:fid', async (req, res) => {
  const db   = loadDb();
  const idx  = db.entities.findIndex((e) => e.id === req.params.id && e.type === 'connectionNode');
  if (idx === -1) return res.status(404).json({ error: 'DataflowType not found' });

  const node   = db.entities[idx];
  const flows  = node.data.flows || [];
  const flowIdx = flows.findIndex((f) => f.id === req.params.fid);
  if (flowIdx === -1) return res.status(404).json({ error: 'Flow not found' });

  let flow = { ...flows[flowIdx], ...req.body, id: req.params.fid };

  // Auto-check Logic App if credentials changed
  if (flow.integration?.type === 'logicApp') {
    flow.mode = 'not_connected';
    try {
      const result = await getLogicAppHealth({ ...flow.integration, flowId: flow.id });
      flow.status        = result.status;
      flow.mode          = result.mode;
      flow.lastTriggered = result.lastTriggered || 'Never';
      flow.lastError     = result.lastError     || null;
      flow.azure         = {
        workflowName:     result.workflowName,
        logicAppKind:     result.logicAppKind,
        resourceGroup:    result.resourceGroup,
        standardSiteName: result.standardSiteName || null,
        lastRunStatus:    result.lastRunStatus,
        lastCompleted:    result.lastCompleted,
        runId:            result.runId,
        rawRunCount:      result.rawRunCount,
        syncedAt:         new Date().toISOString(),
      };
    } catch (err) {
      console.error(`[dataflowTypes] Logic App check failed for ${flow.integration.workflowName}:`, err.message);
      flow.status    = 'unknown';
      flow.lastError = err.message;
    }
  }

  flows[flowIdx]   = flow;
  node.data.flows  = flows;
  node.data.health = computeConnectionHealth(flows);
  propagateHealthToEdges(db, node.id, node.data.health);

  db.entities[idx] = node;
  saveDb(db);
  res.json(node);
});

// ---------------------------------------------------------------------------
// DELETE /api/dataflow-types/:id/flows/:fid
// ---------------------------------------------------------------------------
router.delete('/:id/flows/:fid', (req, res) => {
  const db   = loadDb();
  const idx  = db.entities.findIndex((e) => e.id === req.params.id && e.type === 'connectionNode');
  if (idx === -1) return res.status(404).json({ error: 'DataflowType not found' });

  const node = db.entities[idx];
  node.data.flows  = (node.data.flows || []).filter((f) => f.id !== req.params.fid);
  node.data.health = computeConnectionHealth(node.data.flows);
  propagateHealthToEdges(db, node.id, node.data.health);

  db.entities[idx] = node;
  saveDb(db);
  res.json(node);
});

module.exports = router;
