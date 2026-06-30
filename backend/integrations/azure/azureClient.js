// Azure org-health client
// Reports a full health report for the tenant's Azure:
//   Body  : resource-health rollup (Available / Degraded / Unavailable counts)
//           across every subscription, via Microsoft.ResourceHealth.
//   Status: driven by active Service Health incidents ONLY —
//           an active ServiceIssue => unhealthy, other active events => degraded,
//           none => healthy.
// Authenticates with the same Entra app (AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET)
// as the Logic Apps client, scoped to Azure Resource Manager.

const https = require('https');
const querystring = require('querystring');

const RESOURCE_HEALTH_API = '2022-10-01';
const MAX_AVAILABILITY_PAGES = 20; // safety cap when following nextLink

// ---------------------------------------------------------------------------
// Token cache (ARM scope)
// ---------------------------------------------------------------------------
let _tokenCache = null;
let _tokenExpiresAt = 0;

// A value is "unset" if it's empty or still a scaffold placeholder.
function looksUnset(v) {
  const s = String(v || '').trim();
  return !s || /^your[-_]/i.test(s) || /^x{4,}/i.test(s);
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
function httpRequest(method, url, body, headers) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Length': body ? Buffer.byteLength(body) : 0,
        ...headers,
      },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try {
          const parsedBody = JSON.parse(raw);
          if (res.statusCode >= 400) {
            const err = new Error(
              parsedBody.error_description ||
              parsedBody.error?.message ||
              parsedBody.message ||
              `HTTP ${res.statusCode}`
            );
            err.statusCode = res.statusCode;
            err.body = parsedBody;
            return reject(err);
          }
          resolve(parsedBody);
        } catch (_) {
          resolve(raw);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getToken() {
  if (_tokenCache && Date.now() < _tokenExpiresAt) return _tokenCache;

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  const unset = [];
  if (looksUnset(tenantId))     unset.push('AZURE_TENANT_ID');
  if (looksUnset(clientId))     unset.push('AZURE_CLIENT_ID');
  if (looksUnset(clientSecret)) unset.push('AZURE_CLIENT_SECRET');
  if (unset.length) {
    throw new Error(
      `Azure credentials not configured: ${unset.join(', ')} ` +
      `${unset.length === 1 ? 'is empty or still a placeholder' : 'are empty or still placeholders'} ` +
      `in backend/.env. Set the real values (use the client secret VALUE, not its ID) and restart the backend.`
    );
  }

  const body = querystring.stringify({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://management.azure.com/.default',
  });

  const data = await httpRequest(
    'POST',
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    body,
    { 'Content-Type': 'application/x-www-form-urlencoded' }
  );

  _tokenCache = data.access_token;
  _tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return _tokenCache;
}

// ---------------------------------------------------------------------------
// getAzureOrgHealth() - full org health report for the tenant.
// ---------------------------------------------------------------------------
async function getAzureOrgHealth() {
  const checkedAt = new Date().toISOString();

  let token;
  try {
    token = await getToken();
  } catch (err) {
    return {
      status: 'down',
      mode: 'not_connected',
      detail: 'Could not authenticate to Microsoft Entra ID.',
      lastError: err.message,
      checkedAt,
    };
  }

  const authGet = (url) =>
    httpRequest('GET', url, null, {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

  // 1. Subscriptions (also needed to iterate)
  let subscriptions = [];
  try {
    const data = await authGet('https://management.azure.com/subscriptions?api-version=2020-01-01');
    subscriptions = (data?.value || []).map((s) => ({
      id: s.subscriptionId,
      name: s.displayName || s.subscriptionId,
      state: s.state || 'Unknown',
    }));
  } catch (err) {
    if (err.statusCode === 401 || err.statusCode === 403) {
      return {
        status: 'degraded',
        mode: 'azure',
        detail: 'Azure reachable, but the app lacks permission to list subscriptions.',
        lastError: err.message,
        checkedAt,
      };
    }
    return {
      status: 'down',
      mode: 'azure',
      detail: 'Could not reach Azure Resource Manager.',
      lastError: err.message,
      checkedAt,
    };
  }

  // 2. Resource-health rollup + 3. active Service Health incidents, per subscription
  const rollup = { available: 0, degraded: 0, unavailable: 0, unknown: 0, total: 0 };
  const incidents = [];
  const softErrors = [];

  for (const sub of subscriptions) {
    // 2. Resource Health availability statuses (paginated via nextLink)
    try {
      let url =
        `https://management.azure.com/subscriptions/${sub.id}` +
        `/providers/Microsoft.ResourceHealth/availabilityStatuses?api-version=${RESOURCE_HEALTH_API}`;
      let pages = 0;
      while (url && pages < MAX_AVAILABILITY_PAGES) {
        const page = await authGet(url);
        for (const item of page?.value || []) {
          const state = String(item?.properties?.availabilityState || 'Unknown').toLowerCase();
          rollup.total++;
          if (state === 'available') rollup.available++;
          else if (state === 'degraded') rollup.degraded++;
          else if (state === 'unavailable') rollup.unavailable++;
          else rollup.unknown++;
        }
        url = page?.nextLink || null;
        pages++;
      }
    } catch (err) {
      softErrors.push(`${sub.name}: resource health — ${err.message}`);
    }

    // 3. Service Health events (active incidents only)
    try {
      const events = await authGet(
        `https://management.azure.com/subscriptions/${sub.id}` +
        `/providers/Microsoft.ResourceHealth/events?api-version=${RESOURCE_HEALTH_API}`
      );
      for (const e of events?.value || []) {
        const p = e?.properties || {};
        if (String(p.status || '').toLowerCase() !== 'active') continue;
        incidents.push({
          subscription: sub.name,
          title: p.title || 'Service Health event',
          eventType: p.eventType || 'Unknown',
          eventLevel: p.eventLevel || p.level || null,
          trackingId: p.trackingId || null,
          impactStartTime: p.impactStartTime || null,
        });
      }
    } catch (err) {
      softErrors.push(`${sub.name}: service health — ${err.message}`);
    }
  }

  // Status: incidents only
  const serviceIssues = incidents.filter((i) => /serviceissue/i.test(i.eventType));
  let status;
  if (serviceIssues.length > 0) status = 'unhealthy';
  else if (incidents.length > 0) status = 'degraded';
  else status = 'healthy';

  const detail =
    `${subscriptions.length} subscription${subscriptions.length === 1 ? '' : 's'}; ` +
    `resources — ${rollup.available} available, ${rollup.degraded} degraded, ${rollup.unavailable} unavailable` +
    (rollup.unknown ? `, ${rollup.unknown} unknown` : '') +
    `. ` +
    (incidents.length
      ? `${incidents.length} active Service Health event${incidents.length === 1 ? '' : 's'}` +
        (serviceIssues.length
          ? ` (${serviceIssues.length} service issue${serviceIssues.length === 1 ? '' : 's'}).`
          : '.')
      : 'No active Service Health events.');

  return {
    status,
    mode: 'azure',
    detail,
    lastError: softErrors.length ? softErrors.join('; ') : null,
    checkedAt,
    report: { subscriptions, resourceHealth: rollup, incidents },
  };
}

module.exports = { getAzureOrgHealth };
