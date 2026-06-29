/**
 * Azure Logic Apps routes
 *   GET  /api/azure/logicapps/health          – read-only health check
 *   GET  /api/azure/logicapps/sync-graph      – sync (browser-friendly GET)
 *   POST /api/azure/logicapps/sync-graph      – sync (called by Refresh button)
 */
const express = require('express');
const { loadDb, saveDb } = require('../db');
const { getLogicAppHealth, getAllWorkflowHealth } = require('../integrations/logicApps/logicAppsClient');
const { computeConnectionHealth, propagateHealthToEdges } = require('../services/health');

const router = express.Router();

// GET /api/azure/logicapps/health
router.get('/logicapps/health', async (_req, res) => {
  try {
    const results = await getAllWorkflowHealth();
    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET + POST /api/azure/logicapps/sync-graph
router.get('/logicapps/sync-graph',  handleSync);
router.post('/logicapps/sync-graph', handleSync);

async function handleSync(_req, res) {
  try {
    const graph = await syncLogicAppsToGraph();
    res.json({ ok: true, ...graph });
  } catch (err) {
    console.error('[sync] error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}

// ---------------------------------------------------------------------------
// Sync logic
// ---------------------------------------------------------------------------
async function syncLogicAppsToGraph() {
  const db = loadDb();

  // 1. Legacy .env workflow list
  let legacyResults = [];
  try { legacyResults = await getAllWorkflowHealth(); } catch (e) {
    console.error('[sync] Legacy workflow health failed:', e.message);
  }

  // 2. Scan connectionNode flows for Logic App integrations
  const graphResults = [];
  for (const entity of db.entities) {
    if (entity.type !== 'connectionNode') continue;
    for (const flow of entity.data?.flows || []) {
      if (flow.integration?.type === 'logicApp') {
        try {
          graphResults.push(await getLogicAppHealth({ ...flow.integration, flowId: flow.id }));
        } catch (e) {
          console.error(`[sync] Flow ${flow.id} failed:`, e.message);
        }
      }
    }
  }

  // 3. Scan connector edges for Logic App integrations
  for (const df of db.dataflows) {
    for (const flow of df.data?.flows || []) {
      if (flow.integration?.type === 'logicApp') {
        try {
          graphResults.push(await getLogicAppHealth({ ...flow.integration, flowId: flow.id }));
        } catch (e) {
          console.error(`[sync] Edge flow ${flow.id} failed:`, e.message);
        }
      }
    }
  }

  const allResults = [...legacyResults, ...graphResults];

  // 4. Apply results to connectionNode flows
  for (const entity of db.entities) {
    if (entity.type !== 'connectionNode') continue;
    const flows   = entity.data?.flows || [];
    let   changed = false;

    for (let i = 0; i < flows.length; i++) {
      const flow = flows[i];
      let match  = allResults.find((r) => r.flowId && r.flowId === flow.id);

      if (!match) {
        const normFlow = (flow.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        match = allResults.find((r) => {
          const wn = (r.workflowName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return wn && (normFlow.includes(wn) || wn.includes(normFlow));
        });
      }

      if (match) {
        flows[i] = {
          ...flow,
          status:        match.status,
          mode:          match.mode,
          lastTriggered: match.lastTriggered || flow.lastTriggered,
          lastError:     match.lastError     || null,
          azure: {
            workflowName:     match.workflowName,
            logicAppKind:     match.logicAppKind,
            resourceGroup:    match.resourceGroup,
            standardSiteName: match.standardSiteName,
            lastRunStatus:    match.lastRunStatus,
            lastCompleted:    match.lastCompleted,
            runId:            match.runId,
            rawRunCount:      match.rawRunCount,
            syncedAt:         new Date().toISOString(),
          },
        };
        changed = true;
      }
    }

    if (changed) {
      entity.data.flows  = flows;
      entity.data.health = computeConnectionHealth(flows);
      propagateHealthToEdges(db, entity.id, entity.data.health);
    }
  }

  saveDb(db);

  return {
    entities:     db.entities,
    dataflows:    db.dataflows,
    valueStreams:  db.valueStreams || [],
    bootstrapped: db.bootstrapped,
  };
}

module.exports = router;
