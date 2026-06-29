import type { MockNode, MockEdge, ValueStream } from '../types';

const BASE_URL =
  (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ??
  'http://localhost:3001';

export interface GraphResponse {
  entities: MockNode[];
  dataflows: MockEdge[];
  bootstrapped: boolean;
  valueStreams: ValueStream[];
  errors?: { workflowName?: string | null; flowId?: string | null; error: string }[];
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    // fetch() throws TypeError("Failed to fetch") when the server is unreachable
    throw new Error(
      `Cannot reach the backend at ${BASE_URL}. Is the backend running? ` +
      `Start it with: cd backend && npm install && node server.js`
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

export function fetchGraph(): Promise<GraphResponse> {
  return request<GraphResponse>('/api/graph');
}

export function bootstrapGraph(
  entities: MockNode[],
  dataflows: MockEdge[],
  valueStreams: ValueStream[]
): Promise<{ ok: boolean; skipped?: boolean }> {
  return request('/api/bootstrap', {
    method: 'POST',
    body: JSON.stringify({ entities, dataflows, valueStreams }),
  });
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export function createEntity(payload: Partial<MockNode>): Promise<MockNode> {
  return request<MockNode>('/api/entities', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function patchEntity(
  id: string,
  patch: Partial<MockNode> & { data?: Partial<MockNode['data']> }
): Promise<MockNode> {
  return request<MockNode>(`/api/entities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function deleteEntity(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/entities/${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Connections (Dataflow Types)
// ---------------------------------------------------------------------------

export function createConnection(
  sourceId: string,
  targetId: string,
  name: string
): Promise<{ connectionNode: MockNode; edges: MockEdge[] }> {
  return request('/api/connections', {
    method: 'POST',
    body: JSON.stringify({ sourceId, targetId, name }),
  });
}

// ---------------------------------------------------------------------------
// Dataflows (direct edges)
// ---------------------------------------------------------------------------

export function createDataflow(payload: Partial<MockEdge>): Promise<MockEdge> {
  return request<MockEdge>('/api/dataflows', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function patchDataflow(
  id: string,
  patch: Partial<MockEdge> & { data?: Partial<MockEdge['data']> }
): Promise<MockEdge> {
  return request<MockEdge>(`/api/dataflows/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function deleteDataflow(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/dataflows/${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Value Streams
// ---------------------------------------------------------------------------

export function createValueStream(vs: Omit<ValueStream, 'id'>): Promise<ValueStream> {
  return request<ValueStream>('/api/valuestreams', {
    method: 'POST',
    body: JSON.stringify(vs),
  });
}

export function patchValueStream(id: string, patch: Record<string, unknown>): Promise<ValueStream> {
  return request<ValueStream>(`/api/valuestreams/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function deleteValueStream(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/valuestreams/${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// DataflowType flow management (auto Logic App health check on backend)
// Each call returns the full updated connectionNode (with live health).
// ---------------------------------------------------------------------------

export function saveFlow(
  connectionNodeId: string,
  flow: Record<string, unknown>
): Promise<MockNode> {
  return request<MockNode>(`/api/dataflow-types/${connectionNodeId}/flows`, {
    method: 'POST',
    body: JSON.stringify(flow),
  });
}

export function updateFlow(
  connectionNodeId: string,
  flowId: string,
  flow: Record<string, unknown>
): Promise<MockNode> {
  return request<MockNode>(`/api/dataflow-types/${connectionNodeId}/flows/${flowId}`, {
    method: 'PATCH',
    body: JSON.stringify(flow),
  });
}

export function deleteFlow(
  connectionNodeId: string,
  flowId: string
): Promise<MockNode> {
  return request<MockNode>(`/api/dataflow-types/${connectionNodeId}/flows/${flowId}`, {
    method: 'DELETE',
  });
}

// ---------------------------------------------------------------------------
// Azure Logic Apps sync
// ---------------------------------------------------------------------------

export function syncAzureLogicAppsToGraph(): Promise<GraphResponse> {
  return request<GraphResponse>('/api/azure/logicapps/sync-graph', {
    method: 'POST',
  });
}
