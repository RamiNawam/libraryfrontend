import { useState } from 'react';
import { nanoid } from 'nanoid';
import type {
  IndividualFlow,
  HealthStatus,
  LogicAppIntegrationConfig,
  FlowMode,
} from '../../types';
import { timeAgo } from '../../lib/timeAgo';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function newFlowId(): string {
  return `flow-${nanoid(8)}`;
}

export function emptyFlow(): IndividualFlow {
  return {
    id: newFlowId(),
    name: '',
    protocol: 'REST',
    direction: 'outbound',
    status: 'unknown',
    lastTriggered: 'Never',
    volume: '0',
    lastError: null,
    mode: 'mock',
    description: '',
    apiLink: '',
  };
}

// ---------------------------------------------------------------------------
// FlowModeBadge
// ---------------------------------------------------------------------------

export function FlowModeBadge({ mode }: { mode?: FlowMode }) {
  switch (mode) {
    case 'azure':
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900 text-blue-300 font-medium">
          AZURE
        </span>
      );
    case 'live':
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900 text-green-300 font-medium">
          LIVE
        </span>
      );
    case 'not_connected':
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 font-medium">
          NOT CONNECTED
        </span>
      );
    default:
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 font-medium">
          MOCK
        </span>
      );
  }
}

function healthDot(status: HealthStatus) {
  const colors: Record<HealthStatus, string> = {
    healthy: '#3fb950',
    degraded: '#d29922',
    down: '#e5534b',
    unhealthy: '#e5534b',
    unknown: '#5a6378',
  };
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
      style={{ backgroundColor: colors[status] ?? colors.unknown }}
    />
  );
}

// ---------------------------------------------------------------------------
// FlowRow
// ---------------------------------------------------------------------------

interface FlowRowProps {
  flow: IndividualFlow;
  onEdit: (flow: IndividualFlow) => void;
  onDelete: (id: string) => void;
}

export function FlowRow({ flow, onEdit, onDelete }: FlowRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[#2a2d3e] rounded-lg overflow-hidden mb-2">
      {/* Main row */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#22253a] transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        {healthDot(flow.status)}
        <span className="text-white text-sm font-medium flex-1 truncate">{flow.name || '(unnamed)'}</span>
        <FlowModeBadge mode={flow.mode} />
        <span className="text-gray-500 text-xs ml-1">{flow.direction}</span>
        <button
          className="text-gray-500 hover:text-blue-400 text-xs px-1"
          onClick={(e) => { e.stopPropagation(); onEdit(flow); }}
          title="Edit flow"
        >
          ✎
        </button>
        <button
          className="text-gray-500 hover:text-red-400 text-xs px-1"
          onClick={(e) => { e.stopPropagation(); onDelete(flow.id); }}
          title="Delete flow"
        >
          ✕
        </button>
        <span className="text-gray-600 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 bg-[#13151f] border-t border-[#2a2d3e] space-y-1">
          <Detail label="Protocol" value={flow.protocol} />
          <Detail label="Volume" value={flow.volume} />
          <Detail label="Last triggered" value={timeAgo(flow.lastTriggered)} />
          {flow.lastHttpStatus !== undefined && (
            <Detail label="HTTP status" value={String(flow.lastHttpStatus)} />
          )}
          {flow.avgLatencyMs !== undefined && (
            <Detail label="Avg latency" value={`${flow.avgLatencyMs}ms`} />
          )}
          {flow.successRate !== undefined && (
            <Detail label="Success rate" value={`${flow.successRate}%`} />
          )}
          {flow.owner && <Detail label="Owner" value={flow.owner} />}
          {flow.description && <Detail label="Description" value={flow.description} />}
          {flow.apiLink && (
            <div className="flex gap-2 text-xs">
              <span className="text-gray-500 w-28 flex-shrink-0">API link</span>
              <span className="text-blue-400 break-all">{flow.apiLink}</span>
            </div>
          )}
          {flow.lastError && (
            <div className="mt-1 p-2 bg-red-900/20 border border-red-900/40 rounded text-xs text-red-300">
              {flow.lastError}
            </div>
          )}
          {/* Azure metadata */}
          {flow.azure && (
            <div className="mt-2 border-t border-[#2a2d3e] pt-2 space-y-1">
              <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Azure</span>
              {flow.azure.lastRunStatus && (
                <Detail label="Last run" value={flow.azure.lastRunStatus} />
              )}
              {flow.azure.lastCompleted && (
                <Detail label="Completed" value={timeAgo(flow.azure.lastCompleted)} />
              )}
              {flow.azure.workflowName && (
                <Detail label="Workflow" value={flow.azure.workflowName} />
              )}
              {flow.azure.resourceGroup && (
                <Detail label="Resource group" value={flow.azure.resourceGroup} />
              )}
              {flow.azure.logicAppKind && (
                <Detail label="Kind" value={flow.azure.logicAppKind} />
              )}
              {flow.azure.syncedAt && (
                <Detail label="Synced" value={timeAgo(flow.azure.syncedAt)} />
              )}
            </div>
          )}
          {/* Integration config */}
          {flow.integration && (
            <div className="mt-2 border-t border-[#2a2d3e] pt-2 space-y-1">
              <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">
                Integration Config
              </span>
              <Detail label="Type" value={flow.integration.type} />
              <Detail label="Kind" value={flow.integration.logicAppKind} />
              <Detail label="Resource group" value={flow.integration.resourceGroup} />
              <Detail label="Workflow" value={flow.integration.workflowName} />
              {flow.integration.standardSiteName && (
                <Detail label="Site name" value={flow.integration.standardSiteName} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-gray-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-gray-300 break-all">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FlowEditForm
// ---------------------------------------------------------------------------

interface FlowEditFormProps {
  initial?: IndividualFlow;
  onSave: (flow: IndividualFlow) => void;
  onCancel: () => void;
}

type ConnectionType = 'none' | 'logicApp' | 'ods';

const inputCls = 'w-full bg-[#0f1117] border border-[#2a2d3e] px-3 py-1.5 text-[12px] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500';
const selectCls = 'w-full bg-[#0f1117] border border-[#2a2d3e] px-3 py-1.5 text-[12px] text-white focus:outline-none focus:border-blue-500';
const labelCls = 'text-[11px] text-gray-400 block mb-1';
const errCls = 'text-[11px] text-red-400 mt-0.5';

export function FlowEditForm({ initial, onSave, onCancel }: FlowEditFormProps) {
  const [name, setName]                   = useState(initial?.name ?? '');
  const [connType, setConnType]           = useState<ConnectionType>(
    initial?.integration?.type === 'logicApp' ? 'logicApp' : 'none'
  );
  const [logicAppKind, setLogicAppKind]   = useState<'consumption' | 'standard'>(
    initial?.integration?.logicAppKind ?? 'consumption'
  );
  const [subscriptionId, setSubscriptionId] = useState(initial?.integration?.subscriptionId ?? '');
  const [resourceGroup, setResourceGroup] = useState(initial?.integration?.resourceGroup ?? '');
  const [workflowName, setWorkflowName]   = useState(initial?.integration?.workflowName ?? '');
  const [standardSite, setStandardSite]   = useState(initial?.integration?.standardSiteName ?? '');
  const [error, setError]                 = useState('');

  function handleSave() {
    if (!name.trim()) { setError('Dataflow name is required'); return; }
    if (connType === 'logicApp') {
      if (!resourceGroup.trim()) { setError('Resource group is required'); return; }
      if (!workflowName.trim()) { setError('Workflow name is required'); return; }
      if (logicAppKind === 'standard' && !standardSite.trim()) {
        setError('Standard site name is required'); return;
      }
    }
    setError('');

    const integration: LogicAppIntegrationConfig | undefined =
      connType === 'logicApp'
        ? {
            type: 'logicApp',
            logicAppKind,
            subscriptionId: subscriptionId.trim() || undefined,
            resourceGroup: resourceGroup.trim(),
            workflowName: workflowName.trim(),
            standardSiteName: logicAppKind === 'standard' ? standardSite.trim() : undefined,
          }
        : undefined;

    onSave({
      ...(initial ?? emptyFlow()),
      name: name.trim(),
      mode: 'mock',
      status: 'unknown',
      integration,
    });
  }

  return (
    <div className="space-y-3">
      {/* Connection type */}
      <div>
        <label className={labelCls}>Connection Type</label>
        <select
          className={selectCls}
          value={connType}
          onChange={(e) => setConnType(e.target.value as ConnectionType)}
        >
          <option value="none">None / Mock</option>
          <option value="logicApp">Logic App</option>
          <option value="ods">ODS</option>
        </select>
      </div>

      {/* Logic App fields */}
      {connType === 'logicApp' && (
        <>
          <div>
            <label className={labelCls}>Logic App Type</label>
            <select
              className={selectCls}
              value={logicAppKind}
              onChange={(e) => setLogicAppKind(e.target.value as 'consumption' | 'standard')}
            >
              <option value="consumption">Consumption</option>
              <option value="standard">Standard</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Subscription ID</label>
            <input
              className={inputCls}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={subscriptionId}
              onChange={(e) => setSubscriptionId(e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Resource Group *</label>
            <input
              className={inputCls}
              placeholder="rg-your-resource-group"
              value={resourceGroup}
              onChange={(e) => setResourceGroup(e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Workflow Name *</label>
            <input
              className={inputCls}
              placeholder="MyWorkflowName"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
            />
          </div>

          {logicAppKind === 'standard' && (
            <div>
              <label className={labelCls}>Standard Site Name *</label>
              <input
                className={inputCls}
                placeholder="logic-app-standard-site"
                value={standardSite}
                onChange={(e) => setStandardSite(e.target.value)}
              />
            </div>
          )}
        </>
      )}

      {/* Dataflow name */}
      <div>
        <label className={labelCls}>Dataflow Name *</label>
        <input
          className={inputCls}
          placeholder="Dataflow name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      {error && <div className={errCls}>{error}</div>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-medium py-2 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-[#2a2d3e] hover:bg-[#3a3d4e] text-gray-300 text-[12px] py-2 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

