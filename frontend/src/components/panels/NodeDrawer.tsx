import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '../../store/graphStore';
import * as api from '../../api/client';
import type { SystemNodeData, ConnectionNodeData, HealthStatus, EntityMode } from '../../types';

interface NodeDrawerProps {
  nodeId: string;
  onClose: () => void;
}

function healthLabel(h: HealthStatus): string {
  switch (h) {
    case 'healthy':  return 'Healthy';
    case 'degraded': return 'Degraded';
    case 'down':
    case 'unhealthy': return 'Down';
    default:          return 'Unknown';
  }
}

function healthColor(h: HealthStatus): string {
  switch (h) {
    case 'healthy':   return '#3fb950';
    case 'degraded':  return '#d29922';
    case 'down':
    case 'unhealthy': return '#e5534b';
    default:          return '#5a6378';
  }
}

function visualHealth(mode: EntityMode | undefined, health: HealthStatus): HealthStatus {
  if (!mode || mode === 'mock' || mode === 'not_connected') return 'unknown';
  return health;
}

export function NodeDrawer({ nodeId, onClose }: NodeDrawerProps) {
  const { nodes, valueStreams, deleteEntity, upsertValueStream, checkNodeHealth } = useGraphStore(useShallow((s) => ({
    nodes: s.nodes,
    valueStreams: s.valueStreams,
    deleteEntity: s.deleteEntity,
    upsertValueStream: s.upsertValueStream,
    checkNodeHealth: s.checkNodeHealth,
  })));

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const node = nodes.find((n) => n.id === nodeId);
  if (!node || node.type !== 'systemNode') return null;

  const data = node.data as SystemNodeData;
  const vHealth = visualHealth(data.mode, data.health);
  const color = healthColor(vHealth);
  const platform = data.platform;
  const healthCheck = data.healthCheck;

  // Children: any node whose parentId === this node
  const childNodes = nodes.filter((n) => n.parentId === nodeId);

  async function handleDelete() {
    await deleteEntity(nodeId);
    onClose();
  }

  async function handleCheck() {
    setChecking(true);
    setCheckError(null);
    try {
      await checkNodeHealth(nodeId);
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Check failed');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2a2d3e] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-white font-semibold text-sm truncate">{data.label}</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white ml-2 text-lg leading-none">✕</button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status */}
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Status</div>
          <span
            className="text-[12px] font-medium px-2 py-1"
            style={{ backgroundColor: color + '22', color, borderRadius: 3 }}
          >
            {healthLabel(vHealth)}
          </span>
        </div>

        {/* Health check (monitored platforms only) */}
        {platform && (
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
              {platform.type === 'azure' ? 'Azure' : 'Salesforce'} Health Check
            </div>
            <div className="bg-[#0f1117] border border-[#2a2d3e] p-2.5 space-y-1.5" style={{ borderRadius: 3 }}>
              <div className="text-[12px] text-gray-300">
                {healthCheck?.detail ?? 'Not checked yet.'}
              </div>
              {healthCheck?.lastError && (
                <div className="text-[11px] text-red-400 break-words">{healthCheck.lastError}</div>
              )}
              {healthCheck?.checkedAt && (
                <div className="text-[10px] text-gray-600">
                  Checked {new Date(healthCheck.checkedAt).toLocaleString()}
                </div>
              )}
            </div>
            {checkError && (
              <div className="text-[11px] text-red-400 mt-1.5 break-words">{checkError}</div>
            )}
            <button
              onClick={handleCheck}
              disabled={checking}
              className="w-full mt-2 bg-[#2a2d3e] hover:bg-[#3a3d4e] disabled:opacity-50 text-gray-300 text-[12px] py-2 transition-colors"
              style={{ borderRadius: 3 }}
            >
              {checking ? 'Checking…' : 'Check now'}
            </button>
          </div>
        )}

        {/* Children */}
        {childNodes.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
              Contains ({childNodes.length})
            </div>
            <div className="space-y-1">
              {childNodes.map((child) => {
                const childLabel =
                  child.type === 'systemNode'
                    ? (child.data as SystemNodeData).label
                    : child.type === 'connectionNode'
                    ? (child.data as ConnectionNodeData).name
                    : (child.data as { label?: string }).label ?? child.id;

                const typeLabel =
                  child.type === 'systemNode' ? 'Entity'
                  : child.type === 'connectionNode' ? 'Dataflow Type'
                  : 'Group';

                return (
                  <div
                    key={child.id}
                    className="flex items-center justify-between px-2 py-1.5 bg-[#0f1117] border border-[#2a2d3e]"
                    style={{ borderRadius: 3 }}
                  >
                    <span className="text-[12px] text-white truncate">{childLabel}</span>
                    <span className="text-[10px] text-gray-500 ml-2 flex-shrink-0">{typeLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Value Streams */}
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Value Streams</div>
          {valueStreams.length === 0 ? (
            <span className="text-[12px] text-gray-600">No value streams defined.</span>
          ) : (
            <div className="space-y-1">
              {valueStreams.map((vs) => {
                const checked = vs.nodeIds?.includes(nodeId) ?? false;
                async function toggle() {
                  const newIds = checked
                    ? (vs.nodeIds ?? []).filter((id) => id !== nodeId)
                    : [...(vs.nodeIds ?? []), nodeId];
                  const updated = await api.patchValueStream(vs.id, { nodeIds: newIds });
                  upsertValueStream(updated);
                }
                return (
                  <label
                    key={vs.id}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[#1e2130] transition-colors"
                    style={{ borderRadius: 3 }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={toggle}
                      className="accent-blue-500"
                    />
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: vs.color }}
                    />
                    <span className="text-[12px] text-gray-300">{vs.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete */}
        <div className="pt-2 border-t border-[#2a2d3e]">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full text-[12px] text-red-400 hover:text-red-300 py-2 border border-red-900/40 hover:bg-red-900/10 transition-colors"
              style={{ borderRadius: 3 }}
            >
              Delete Entity
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-gray-400 text-center">
                Also removes connected dataflow types. Are you sure?
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-700 hover:bg-red-600 text-white text-[12px] py-2 transition-colors"
                  style={{ borderRadius: 3 }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 bg-[#2a2d3e] text-gray-400 text-[12px] py-2 hover:text-white transition-colors"
                  style={{ borderRadius: 3 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
