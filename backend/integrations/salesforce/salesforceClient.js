// Salesforce status client
// Reports "is Salesforce up?" using the public Trust API (api.status.salesforce.com).
// No org credentials required. If an instance key is configured we report that
// instance's precise status; otherwise we probe the Trust API for reachability.

const https = require('https');

// ---------------------------------------------------------------------------
// HTTP helper (GET JSON)
// ---------------------------------------------------------------------------
function getJson(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          let parsedBody = null;
          try { parsedBody = JSON.parse(raw); } catch (_) { /* non-JSON */ }
          if (res.statusCode >= 400) {
            const err = new Error(
              (parsedBody && parsedBody.message) || `HTTP ${res.statusCode}`
            );
            err.statusCode = res.statusCode;
            return reject(err);
          }
          resolve(parsedBody);
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

const TRUST_BASE = 'https://api.status.salesforce.com/v1';

// Map a Trust API instance status string to our health vocabulary.
function instanceStatusToHealth(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'OK') return 'healthy';
  if (s.includes('MAINTENANCE') || s.startsWith('MINOR')) return 'degraded';
  if (s.startsWith('MAJOR') || s.includes('UNAVAILABLE')) return 'unhealthy';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// getSalesforceStatus(config)
//   config.instanceKey  – optional Salesforce instance key (e.g. "USA123")
//                         falls back to process.env.SALESFORCE_INSTANCE_KEY
// ---------------------------------------------------------------------------
async function getSalesforceStatus(config = {}) {
  const checkedAt = new Date().toISOString();
  const instanceKey = config.instanceKey || process.env.SALESFORCE_INSTANCE_KEY || null;

  // Precise per-instance status when a key is known.
  if (instanceKey) {
    try {
      const data = await getJson(`${TRUST_BASE}/instances/${encodeURIComponent(instanceKey)}/status`);
      const status = instanceStatusToHealth(data?.status);
      return {
        status,
        mode: 'connected',
        detail: `Salesforce instance ${instanceKey}: ${data?.status || 'unknown'}.`,
        lastError: status === 'unhealthy' ? `Instance status: ${data?.status}` : null,
        checkedAt,
      };
    } catch (err) {
      return {
        status: 'down',
        mode: 'connected',
        detail: `Could not read status for instance ${instanceKey}.`,
        lastError: err.message,
        checkedAt,
      };
    }
  }

  // No instance key: probe the Trust API for overall reachability + active incidents.
  try {
    const incidents = await getJson(`${TRUST_BASE}/incidents/active`);
    const active = Array.isArray(incidents) ? incidents.length : 0;
    if (active === 0) {
      return {
        status: 'healthy',
        mode: 'connected',
        detail: 'Salesforce reachable — no active incidents reported.',
        lastError: null,
        checkedAt,
      };
    }
    return {
      status: 'degraded',
      mode: 'connected',
      detail: `Salesforce reachable — ${active} active incident${active === 1 ? '' : 's'} reported. Set SALESFORCE_INSTANCE_KEY for your instance's status.`,
      lastError: null,
      checkedAt,
    };
  } catch (err) {
    return {
      status: 'down',
      mode: 'connected',
      detail: 'Could not reach the Salesforce status service.',
      lastError: err.message,
      checkedAt,
    };
  }
}

module.exports = { getSalesforceStatus };
