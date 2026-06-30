// ============================================================
// Enums / Union Types
// ============================================================

export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unhealthy' | 'unknown';

export type NodeCategory =
  | 'azure'
  | 'crm'
  | 'erp'
  | 'integration'
  | 'monitoring'
  | 'onprem'
  | 'external'
  | 'm365';

export type Environment = 'dev' | 'qa' | 'uat' | 'preprod' | 'prod' | null;

export type Protocol =
  | 'REST'
  | 'SOAP'
  | 'gRPC'
  | 'SQL'
  | 'file'
  | 'event'
  | 'webhook'
  | 'SMTP'
  | 'HTTPS'
  | 'TCP';

export type BusinessLayer = string;

export type EntityMode = 'mock' | 'connected' | 'azure' | 'not_connected';

export type FlowMode = 'mock' | 'live' | 'azure' | 'not_connected';

// ============================================================
// Azure Logic App Integration
// ============================================================

export interface LogicAppIntegrationConfig {
  type: 'logicApp';
  logicAppKind: 'consumption' | 'standard';
  subscriptionId?: string;
  resourceGroup: string;
  workflowName: string;
  standardSiteName?: string;
}

export interface AzureLogicAppMetadata {
  workflowName?: string;
  logicAppKind?: string;
  resourceGroup?: string;
  standardSiteName?: string | null;
  lastRunStatus?: string;
  lastCompleted?: string | null;
  runId?: string | null;
  rawRunCount?: number;
  syncedAt?: string;
}

// ============================================================
// Flows
// ============================================================

export interface IndividualFlow {
  id: string;
  name: string;
  protocol: Protocol;
  direction: 'outbound' | 'inbound';
  status: HealthStatus;
  lastTriggered: string;
  volume: string;
  lastError: string | null;
  apiLink?: string;
  mode?: FlowMode;
  description?: string;
  lastHttpStatus?: number;
  avgLatencyMs?: number;
  successRate?: number;
  owner?: string;
  integration?: LogicAppIntegrationConfig;
  azure?: AzureLogicAppMetadata;
}

// ============================================================
// Node Data Shapes
// ============================================================

export interface NodeMetrics {
  lastSync: string | null;
  uptime?: number;
  requestsPerMin?: number;
  avgLatencyMs?: number;
  errorRate?: number;
}

// Marks a node as a monitored platform (Azure / Sales Hub) for up/down checks.
export interface PlatformConfig {
  type: 'azure' | 'salesHub';
  orgUrl?: string; // Sales Hub (Dataverse) org URL, e.g. "https://yourorg.crm.dynamics.com"; optional
}

// Result of the last platform reachability check.
export interface PlatformHealthCheck {
  status: HealthStatus;
  detail: string;
  checkedAt: string;
  lastError?: string | null;
}

export interface SystemNodeData {
  label: string;
  category: NodeCategory;
  environment: Environment;
  mode?: EntityMode;
  health: HealthStatus;
  description: string;
  techStack: string[];
  layers: BusinessLayer[];
  metrics: NodeMetrics;
  flashing?: boolean;
  platform?: PlatformConfig;
  healthCheck?: PlatformHealthCheck;
}

export interface GroupNodeData {
  label: string;
  mode?: EntityMode;
  health?: HealthStatus;
  platform?: PlatformConfig;
  healthCheck?: PlatformHealthCheck;
}

export interface ConnectionNodeData {
  name: string;
  sourceId: string;
  targetId: string;
  health: HealthStatus;
  flows: IndividualFlow[];
  flashing?: boolean;
  metrics?: Record<string, unknown>;
}

// ============================================================
// Edge Data Shape
// ============================================================

export interface EdgeFlowData {
  sourceLabel: string;
  targetLabel: string;
  flowCount: number;
  health: HealthStatus;
  flows: IndividualFlow[];
  name?: string;
  flashing?: boolean;
}

// ============================================================
// Graph Nodes and Edges
// ============================================================

export interface MockNode {
  id: string;
  type: 'systemNode' | 'groupNode' | 'connectionNode';
  position: { x: number; y: number };
  data: SystemNodeData | GroupNodeData | ConnectionNodeData;
  parentId?: string;
  style?: { width?: number; height?: number };
  apiConnections: Record<string, unknown>;
}

export interface MockEdge {
  id: string;
  source: string;
  target: string;
  type: 'flowEdge' | 'connectorEdge';
  sourceHandle?: string;
  targetHandle?: string;
  data: EdgeFlowData;
  apiConnections: Record<string, unknown>;
}

// ============================================================
// Value Streams
// ============================================================

export interface ValueStream {
  id: string;
  label: string;
  color: string;
  nodeIds?: string[];
}

export const DEFAULT_VALUE_STREAMS: ValueStream[] = [
  { id: 'vs-customer', label: 'Customer', color: '#1D9E75' },
  { id: 'vs-order', label: 'Order', color: '#BA7517' },
  { id: 'vs-finance', label: 'Finance', color: '#A32D2D' },
];

// ============================================================
// Business Layers
// ============================================================

export const ALL_BUSINESS_LAYERS: string[] = [
  'CRM Layer',
  'ERP Layer',
  'Integration Layer',
  'Data Layer',
  'API Layer',
  'Azure Cloud',
  'Azure Services',
  'On-Premise',
  'External',
];

export interface LayerFilter {
  layer: string;
  active: boolean;
}
