/**
 * Health computation helpers shared across routes.
 */

/**
 * Computes the aggregate health of a DataflowType from its individual flows.
 * Only flows with mode='azure' or mode='not_connected' count toward health.
 */
function computeConnectionHealth(flows) {
  const liveFlows = flows.filter((f) => f.mode === 'azure' || f.mode === 'not_connected');
  if (liveFlows.length === 0) return 'unknown';

  const hasUnhealthy    = liveFlows.some((f) => f.status === 'unhealthy' || f.status === 'down');
  const hasDegraded     = liveFlows.some((f) => f.status === 'degraded');
  const hasHealthy      = liveFlows.some((f) => f.status === 'healthy');
  const hasNotConnected = liveFlows.some((f) => f.mode === 'not_connected');

  if (hasUnhealthy)    return 'unhealthy'; // red   — Logic App failed last run
  if (hasDegraded)     return 'degraded';  // orange — Logic App running but degraded
  if (hasHealthy)      return 'healthy';   // green  — Logic App last run succeeded
  if (hasNotConnected) return 'degraded';  // orange — credentials set but can't reach Azure
  return 'unknown';
}

/**
 * After updating a DataflowType's health, propagate it to the two connector
 * edges (source→triangle, triangle→target) so edge colors update on the canvas.
 */
function propagateHealthToEdges(db, connectionNodeId, health) {
  for (const df of db.dataflows) {
    if (
      df.type === 'connectorEdge' &&
      (df.source === connectionNodeId || df.target === connectionNodeId)
    ) {
      df.data = { ...(df.data || {}), health };
    }
  }
}

module.exports = { computeConnectionHealth, propagateHealthToEdges };
