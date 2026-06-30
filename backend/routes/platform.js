/**
 * Platform health routes — "is the platform up?" reachability checks.
 *   POST /api/platform/health-graph      – check every node tagged with data.platform
 *   POST /api/platform/health/:nodeId    – re-check a single node ("Check now")
 *
 * A node opts in by setting data.platform = { type: 'azure' | 'salesHub', ... }.
 * The result is written to data.health, data.mode and data.healthCheck.
 */
const express = require('express');
const { loadDb, saveDb } = require('../db');
const { getAzureReachability } = require('../integrations/logicApps/logicAppsClient');
const { getDynamicsStatus } = require('../integrations/dynamics/dynamicsClient');

const router = express.Router();

async function runCheck(platform) {
  if (platform.type === 'azure') return getAzureReachability();
  if (platform.type === 'salesHub') return getDynamicsStatus(platform);
  return {
    status: 'unknown',
    mode: 'not_connected',
    detail: `Unknown platform type: ${platform.type}`,
    lastError: `Unsupported platform type: ${platform.type}`,
    checkedAt: new Date().toISOString(),
  };
}

function applyResult(entity, result) {
  entity.data = {
    ...entity.data,
    health: result.status,
    mode: result.mode,
    healthCheck: {
      status: result.status,
      detail: result.detail,
      checkedAt: result.checkedAt,
      lastError: result.lastError || null,
    },
  };
}

// POST /api/platform/health-graph
router.post('/health-graph', async (_req, res) => {
  try {
    const db = loadDb();
    const errors = [];

    for (const entity of db.entities) {
      const platform = entity.data?.platform;
      if (!platform?.type) continue;
      try {
        const result = await runCheck(platform);
        applyResult(entity, result);
        if (result.lastError) {
          errors.push({ nodeId: entity.id, error: result.lastError });
        }
      } catch (e) {
        errors.push({ nodeId: entity.id, error: e.message });
      }
    }

    saveDb(db);
    res.json({
      ok: true,
      entities: db.entities,
      dataflows: db.dataflows,
      valueStreams: db.valueStreams || [],
      bootstrapped: db.bootstrapped,
      errors,
    });
  } catch (err) {
    console.error('[platform] health-graph error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/platform/health/:nodeId
router.post('/health/:nodeId', async (req, res) => {
  try {
    const db = loadDb();
    const entity = db.entities.find((e) => e.id === req.params.nodeId);
    if (!entity) return res.status(404).json({ ok: false, error: 'Node not found' });

    const platform = entity.data?.platform;
    if (!platform?.type) {
      return res.status(400).json({ ok: false, error: 'Node is not tagged with a platform' });
    }

    const result = await runCheck(platform);
    applyResult(entity, result);
    saveDb(db);
    res.json(entity);
  } catch (err) {
    console.error('[platform] health error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
