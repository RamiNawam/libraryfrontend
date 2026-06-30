import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '../../store/graphStore';
import type { GroupNodeData, HealthStatus } from '../../types';

interface GroupDrawerProps {
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

export function GroupDrawer({ nodeId, onClose }: GroupDrawerProps) {
  const { nodes, patchEntity, deleteEntity, checkNodeHealth } = useGraphStore(useShallow((s) => ({
    nodes: s.nodes,
    patchEntity: s.patchEntity,
    deleteEntity: s.deleteEntity,
    checkNodeHealth: s.checkNodeHealth,
  })));

  const node = nodes.find((n) => n.id === nodeId);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  if (!node || node.type !== 'groupNode') return null;

  const data = node.data as GroupNodeData;
  const platform = data.platform;
  const healthCheck = data.healthCheck;
  const vHealth: HealthStatus = data.health ?? 'unknown';

  const childNodes = nodes.filter((n) => n.parentId === nodeId);

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

  async function handleSave() {
    if (!label.trim()) return;
    await patchEntity(nodeId, { data: { label: label.trim() } });
    setEditing(false);
  }

  async function handleDelete() {
    await deleteEntity(nodeId);
    onClose();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2a2d3e] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-gray-400 text-sm">▦</span>
          <span className="text-white font-semibold text-sm truncate">{data.label}</span>
          <span className="text-[11px] px-1.5 py-0.5 bg-[#2a2d3e] text-gray-400 rounded">GROUP</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white ml-2 text-lg leading-none">
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Group Label</label>
              <input
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 bg-[#2a2d3e] text-gray-400 text-sm py-2 rounded hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Health check (monitored platforms only, e.g. Azure) */}
            {platform && (
              <div className="space-y-2">
                <div className="text-xs text-gray-500 uppercase tracking-wider">
                  {platform.type === 'azure' ? 'Azure' : 'Sales Hub'} Health Check
                </div>
                <span
                  className="inline-block text-[12px] font-medium px-2 py-1"
                  style={{ backgroundColor: healthColor(vHealth) + '22', color: healthColor(vHealth), borderRadius: 3 }}
                >
                  {healthLabel(vHealth)}
                </span>
                <div className="bg-[#0f1117] border border-[#2a2d3e] p-2.5 space-y-1.5 rounded">
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

                {/* Full Azure org report */}
                {healthCheck?.report && (
                  <div className="space-y-2">
                    {/* Resource health rollup */}
                    <div className="bg-[#0f1117] border border-[#2a2d3e] p-2.5 rounded space-y-1.5">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                        Resource Health ({healthCheck.report.resourceHealth.total})
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3fb950' }} />
                          <span className="text-[12px] text-gray-300">{healthCheck.report.resourceHealth.available} available</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#d29922' }} />
                          <span className="text-[12px] text-gray-300">{healthCheck.report.resourceHealth.degraded} degraded</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#e5534b' }} />
                          <span className="text-[12px] text-gray-300">{healthCheck.report.resourceHealth.unavailable} unavailable</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#5a6378' }} />
                          <span className="text-[12px] text-gray-300">{healthCheck.report.resourceHealth.unknown} unknown</span>
                        </div>
                      </div>
                    </div>

                    {/* Subscriptions */}
                    <div className="bg-[#0f1117] border border-[#2a2d3e] p-2.5 rounded space-y-1">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                        Subscriptions ({healthCheck.report.subscriptions.length})
                      </div>
                      {healthCheck.report.subscriptions.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between">
                          <span className="text-[12px] text-gray-300 truncate">{sub.name}</span>
                          <span className="text-[10px] text-gray-500 ml-2 flex-shrink-0">{sub.state}</span>
                        </div>
                      ))}
                    </div>

                    {/* Active Service Health incidents */}
                    <div className="bg-[#0f1117] border border-[#2a2d3e] p-2.5 rounded space-y-1.5">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                        Active Incidents ({healthCheck.report.incidents.length})
                      </div>
                      {healthCheck.report.incidents.length === 0 ? (
                        <div className="text-[12px] text-gray-600">No active Service Health events.</div>
                      ) : (
                        healthCheck.report.incidents.map((inc, i) => (
                          <div key={inc.trackingId ?? i} className="border-l-2 border-red-500/50 pl-2 space-y-0.5">
                            <div className="text-[12px] text-gray-200 break-words">{inc.title}</div>
                            <div className="text-[10px] text-gray-500">
                              {inc.eventType}
                              {inc.eventLevel ? ` · ${inc.eventLevel}` : ''} · {inc.subscription}
                            </div>
                            {inc.impactStartTime && (
                              <div className="text-[10px] text-gray-600">
                                Since {new Date(inc.impactStartTime).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {checkError && (
                  <div className="text-[11px] text-red-400 break-words">{checkError}</div>
                )}
                <button
                  onClick={handleCheck}
                  disabled={checking}
                  className="w-full bg-[#2a2d3e] hover:bg-[#3a3d4e] disabled:opacity-50 text-gray-300 text-[12px] py-2 rounded transition-colors"
                >
                  {checking ? 'Checking…' : 'Check now'}
                </button>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Children ({childNodes.length})</div>
              {childNodes.length === 0 ? (
                <div className="text-xs text-gray-600">Drag nodes inside to group them.</div>
              ) : (
                childNodes.map((cn) => (
                  <div key={cn.id} className="text-xs text-gray-300 bg-[#0f1117] rounded px-2 py-1.5">
                    {(cn.data as { label?: string; name?: string }).label ||
                      (cn.data as { label?: string; name?: string }).name ||
                      cn.id}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => { setLabel(data.label); setEditing(true); }}
              className="w-full bg-[#2a2d3e] hover:bg-[#3a3d4e] text-gray-300 text-sm py-2 rounded transition-colors"
            >
              Edit Label
            </button>

            <div className="pt-2 border-t border-[#2a2d3e]">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full text-sm text-red-400 hover:text-red-300 py-2 border border-red-900/40 rounded hover:bg-red-900/10 transition-colors"
                >
                  Delete Group
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-gray-400 text-center">
                    Delete the group container? Nodes inside will remain.
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      className="flex-1 bg-red-700 hover:bg-red-600 text-white text-sm py-2 rounded"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 bg-[#2a2d3e] text-gray-400 text-sm py-2 rounded hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
