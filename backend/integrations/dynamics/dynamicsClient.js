// Dynamics 365 (Sales Hub) status client
// Reports "is the Sales Hub org up and can we reach it?" via Microsoft Entra ID.
// Reuses the same app registration (AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET) as the
// Logic Apps client, but acquires a token scoped to the Dataverse org and then makes
// one lightweight WhoAmI call. We only care that the org responds, not what's in it.

const https = require('https');
const querystring = require('querystring');

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
        let parsedBody = null;
        try { parsedBody = JSON.parse(raw); } catch (_) { /* non-JSON */ }
        if (res.statusCode >= 400) {
          const err = new Error(
            (parsedBody && (parsedBody.error_description || parsedBody.error?.message || parsedBody.message)) ||
            `HTTP ${res.statusCode}`
          );
          err.statusCode = res.statusCode;
          return reject(err);
        }
        resolve(parsedBody);
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Token for the Dataverse org (scope = {orgUrl}/.default)
// ---------------------------------------------------------------------------
async function getDataverseToken(orgUrl) {
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
      `${unset.length === 1 ? 'is empty or still a placeholder' : 'are empty or still placeholders'} in backend/.env.`
    );
  }

  const body = querystring.stringify({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: `${orgUrl.replace(/\/+$/, '')}/.default`,
  });

  const data = await httpRequest(
    'POST',
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    body,
    { 'Content-Type': 'application/x-www-form-urlencoded' }
  );
  return data.access_token;
}

// ---------------------------------------------------------------------------
// getDynamicsStatus(config)
//   config.orgUrl – Dataverse org URL, e.g. "https://yourorg.crm.dynamics.com"
//                   falls back to process.env.DYNAMICS_ORG_URL
// ---------------------------------------------------------------------------
async function getDynamicsStatus(config = {}) {
  const checkedAt = new Date().toISOString();
  const orgUrl = (config.orgUrl || process.env.DYNAMICS_ORG_URL || '').replace(/\/+$/, '');

  if (!orgUrl) {
    return {
      status: 'unknown',
      mode: 'not_connected',
      detail: 'No Sales Hub org URL set. Add orgUrl to the node\'s platform config or DYNAMICS_ORG_URL in backend/.env.',
      lastError: 'Missing org URL',
      checkedAt,
    };
  }

  let token;
  try {
    token = await getDataverseToken(orgUrl);
  } catch (err) {
    return {
      status: 'down',
      mode: 'not_connected',
      detail: 'Could not authenticate to Microsoft Entra ID for the Sales Hub org.',
      lastError: err.message,
      checkedAt,
    };
  }

  try {
    const data = await httpRequest(
      'GET',
      `${orgUrl}/api/data/v9.2/WhoAmI`,
      null,
      { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    );
    return {
      status: 'healthy',
      mode: 'connected',
      detail: `Sales Hub reachable — org responded (user ${data?.UserId || 'ok'}).`,
      lastError: null,
      checkedAt,
    };
  } catch (err) {
    // Org answered but rejected us: the org is up, our access isn't.
    if (err.statusCode === 401 || err.statusCode === 403) {
      return {
        status: 'degraded',
        mode: 'connected',
        detail: 'Sales Hub reachable, but the app user lacks access to this org.',
        lastError: err.message,
        checkedAt,
      };
    }
    return {
      status: 'down',
      mode: 'connected',
      detail: 'Could not reach the Sales Hub org.',
      lastError: err.message,
      checkedAt,
    };
  }
}

module.exports = { getDynamicsStatus };
