// Azure Logic Apps Client
// Authenticates via Microsoft Entra ID client credentials and queries
// Azure Resource Manager for Logic App workflow run status.

const https = require('https');
const querystring = require('querystring');

// ---------------------------------------------------------------------------
// Token cache
// ---------------------------------------------------------------------------
let _tokenCache = null;
let _tokenExpiresAt = 0;

// A value is "unset" if it's empty or still a scaffold placeholder (your-..., xxxx...)
function looksUnset(v) {
  const s = String(v || '').trim();
  return !s || /^your[-_]/i.test(s) || /^x{4,}/i.test(s);
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

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const data = await httpRequest('POST', url, body, {
    'Content-Type': 'application/x-www-form-urlencoded',
  });

  _tokenCache = data.access_token;
  _tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return _tokenCache;
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
function httpRequest(method, url, body, headers) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'Content-Length': body ? Buffer.byteLength(body) : 0,
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode >= 400) {
            const err = new Error(
              parsed.error_description ||
              parsed.error?.message ||
              parsed.message ||
              `HTTP ${res.statusCode}`
            );
            err.statusCode = res.statusCode;
            err.body = parsed;
            return reject(err);
          }
          resolve(parsed);
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

async function armGet(urlPath) {
  const token = await getToken();
  const url = `https://management.azure.com${urlPath}`;
  return httpRequest('GET', url, null, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------
function runStatusToHealth(runStatus) {
  if (!runStatus) return 'unknown';
  const s = runStatus.toLowerCase();
  if (s === 'succeeded') return 'healthy';
  if (s === 'failed' || s === 'timedout' || s === 'aborted' || s === 'cancelled') return 'unhealthy';
  if (s === 'running' || s === 'waiting') return 'degraded';
  return 'unknown';
}

function errToMode(err) {
  const code = err.statusCode;
  const bodyErrCode = err.body?.error?.code || '';
  if (
    code === 401 ||
    code === 403 ||
    bodyErrCode === 'AuthorizationFailed' ||
    bodyErrCode === 'invalid_client'
  ) {
    return 'not_connected';
  }
  return 'not_connected';
}

// ---------------------------------------------------------------------------
// Consumption Logic App runs
// ---------------------------------------------------------------------------
async function getConsumptionRuns(subscriptionId, resourceGroup, workflowName) {
  const p =
    `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}` +
    `/providers/Microsoft.Logic/workflows/${workflowName}/runs` +
    `?api-version=2016-06-01&$top=1`;
  return armGet(p);
}

// ---------------------------------------------------------------------------
// Standard Logic App runs (hosted inside a Logic App Standard site)
// ---------------------------------------------------------------------------
async function getStandardRuns(subscriptionId, resourceGroup, standardSiteName, workflowName) {
  const p =
    `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}` +
    `/providers/Microsoft.Web/sites/${standardSiteName}` +
    `/hostruntime/runtime/webhooks/workflow/api/management/workflows/${workflowName}/runs` +
    `?api-version=2022-03-01&$top=1`;
  return armGet(p);
}

// ---------------------------------------------------------------------------
// getLogicAppHealth(config)
// ---------------------------------------------------------------------------
async function getLogicAppHealth(config) {
  const {
    flowId,
    logicAppKind = 'consumption',
    resourceGroup,
    workflowName,
    standardSiteName,
    subscriptionId: configSubId,
  } = config || {};

  const subscriptionId = configSubId || process.env.AZURE_SUBSCRIPTION_ID;
  const rg = resourceGroup || process.env.AZURE_RESOURCE_GROUP;

  const base = {
    flowId,
    workflowName,
    logicAppKind,
    resourceGroup: rg,
    standardSiteName: standardSiteName || null,
  };

  if (!subscriptionId || !rg || !workflowName) {
    return {
      ...base,
      status: 'unknown',
      mode: 'not_connected',
      lastRunStatus: null,
      lastTriggered: 'Never',
      lastCompleted: null,
      runId: null,
      rawRunCount: 0,
      lastError: 'Missing required config: subscriptionId, resourceGroup, or workflowName',
    };
  }

  try {
    let runsData;
    if (logicAppKind === 'standard') {
      if (!standardSiteName) {
        return {
          ...base,
          status: 'unknown',
          mode: 'not_connected',
          lastRunStatus: null,
          lastTriggered: 'Never',
          lastCompleted: null,
          runId: null,
          rawRunCount: 0,
          lastError: 'Standard Logic App requires standardSiteName',
        };
      }
      runsData = await getStandardRuns(subscriptionId, rg, standardSiteName, workflowName);
    } else {
      runsData = await getConsumptionRuns(subscriptionId, rg, workflowName);
    }

    const runs = runsData?.value || [];
    const latestRun = runs[0];

    if (!latestRun) {
      return {
        ...base,
        status: 'unknown',
        mode: 'azure',
        lastRunStatus: 'NoRuns',
        lastTriggered: 'Never',
        lastCompleted: null,
        runId: null,
        rawRunCount: 0,
        lastError: null,
      };
    }

    const lastRunStatus = latestRun.properties?.status || 'Unknown';
    const startTime = latestRun.properties?.startTime || null;
    const endTime = latestRun.properties?.endTime || null;
    const runId = latestRun.name || null;
    const health = runStatusToHealth(lastRunStatus);

    return {
      ...base,
      status: health,
      mode: 'azure',
      lastRunStatus,
      lastTriggered: startTime || 'Unknown',
      lastCompleted: endTime || null,
      runId,
      rawRunCount: runs.length,
      lastError: health === 'unhealthy' ? `Last run: ${lastRunStatus}` : null,
    };
  } catch (err) {
    const mode = errToMode(err);
    console.error(`[logicApps] Error fetching ${workflowName}:`, err.message);
    return {
      ...base,
      status: 'unknown',
      mode,
      lastRunStatus: null,
      lastTriggered: 'Never',
      lastCompleted: null,
      runId: null,
      rawRunCount: 0,
      lastError: err.message,
    };
  }
}

// ---------------------------------------------------------------------------
// getAllWorkflowHealth() - legacy .env-driven workflow list
// ---------------------------------------------------------------------------
async function getAllWorkflowHealth() {
  const workflowsEnv = process.env.LOGIC_APP_WORKFLOWS || '';
  if (!workflowsEnv.trim()) return [];

  const rawEntries = workflowsEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const logicAppKind = process.env.LOGIC_APP_TYPE || 'consumption';
  const defaultResourceGroup = process.env.AZURE_RESOURCE_GROUP;
  const standardSiteName = process.env.LOGIC_APP_STD_NAME || undefined;

  const results = await Promise.all(
    rawEntries.map(async (entry) => {
      // Support "WorkflowName|resource-group" format
      const parts = entry.split('|').map((s) => s.trim());
      const workflowName = parts[0];
      const resourceGroup = parts[1] || defaultResourceGroup;

      try {
        return await getLogicAppHealth({
          logicAppKind,
          resourceGroup,
          workflowName,
          standardSiteName,
        });
      } catch (err) {
        console.error(`[logicApps] getAllWorkflowHealth failed for ${workflowName}:`, err.message);
        return {
          workflowName,
          logicAppKind,
          resourceGroup,
          standardSiteName: standardSiteName || null,
          status: 'unknown',
          mode: 'not_connected',
          lastRunStatus: null,
          lastTriggered: 'Never',
          lastCompleted: null,
          runId: null,
          rawRunCount: 0,
          lastError: err.message,
        };
      }
    })
  );

  return results;
}

module.exports = { getLogicAppHealth, getAllWorkflowHealth };
