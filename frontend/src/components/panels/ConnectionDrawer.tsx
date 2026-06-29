import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '../../store/graphStore';
import * as api from '../../api/client';
import type { ConnectionNodeData, IndividualFlow, HealthStatus, FlowMode } from '../../types';
import { FlowRow, FlowEditForm, emptyFlow, newFlowId } from './flowDetail';

interface ConnectionDrawerProps {
  nodeId: string;
  onClose: () => void;
}

function healthColor(h: HealthStatus): string {
  switch (h) {
    case 'healthy':   return '#22c55e';
    case 'unhealthy':
    case 'down':      return '#ef4444';
    case 'degraded':  return '#f59e0b';
    default:          return '#6b7280';
  }
}

export function ConnectionDrawer({ nodeId, onClose }: ConnectionDrawerProps) {
  const { nodes, upsertNode, deleteEntity } = useGraphStore(useShallow((s) => ({
    nodes:        s.nodes,
    upsertNode:   s.upsertNode,
    deleteEntity: s.deleteEntity,
  })));

  const [editingFlow,   setEditingFlow]   = useState<IndividualFlow | null>(null);
  const [isAddingFlow,  setIsAddingFlow]  = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [azureNotice,   setAzureNotice]   = useState<{ mode: FlowMode; error: string | null } | null>(null);

  const node = nodes.find((n) => n.id === nodeId);
  if (!node || node.type !== 'connectionNode') return null;

  const data        = node.data as ConnectionNodeData;
  const flows       = data.flows || [];
  const sourceNode  = nodes.find((n) => n.id === data.sourceId);
  const targetNode  = nodes.find((n) => n.id === data.targetId);
  const sourceLabel = (sourceNode?.data as { label?: string })?.label || data.sourceId;
  const targetLabel = (targetNode?.data as { label?: string })?.label || data.targetId;

  async function handleSaveFlow(flow: IndividualFlow) {
    setSaving(true);
    setSaveError('');
    setAzureNotice(null);
    try {
      const isExisting = flows.some((f) => f.id === flow.id);
      const updatedNode = isExisting
        ? await api.updateFlow(nodeId, flow.id, flow as unknown as Record<string, unknown>)
        : await api.saveFlow(nodeId, flow as unknown as Record<string, unknown>);
      upsertNode(updatedNode);

      // Surface Azure connection attempt result so user can see if the API was reached
      if (flow.integration?.type === 'logicApp') {
        const savedFlow = (updatedNode.data as ConnectionNodeData).flows.find((f) => f.id === flow.id);
        if (savedFlow) {
          setAzureNotice({ mode: savedFlow.mode ?? 'not_connected', error: savedFlow.lastError ?? null });
        }
      }

      setEditingFlow(null);
      setIsAddingFlow(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteFlow(flowId: string) {
    try {
      const updatedNode = await api.deleteFlow(nodeId, flowId);
      upsertNode(updatedNode);
    } catch (err) {
      console.error('Failed to delete flow:', err);
    }
  }

  async function handleDeleteConnection() {
    await deleteEntity(nodeId);
    onClose();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-[#2a2d3e] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: healthColor(data.health) }} />
          <div className="min-w-0">
            <div className="text-white font-semibold text-sm truncate">{data.name}</div>
            <div className="text-gray-500 text-xs truncate">{sourceLabel} → {targetLabel}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white ml-2 flex-shrink-0 text-lg leading-none">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(editingFlow !== null || isAddingFlow) ? (
          <div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {isAddingFlow ? 'Add Dataflow' : 'Edit Dataflow'}
            </div>
            {saving && (
              <div className="text-[11px] text-blue-400 mb-2">Connecting to Azure…</div>
            )}
            {saveError && <div className="text-[11px] text-red-400 mb-2">{saveError}</div>}
            <FlowEditForm
              initial={editingFlow ?? { ...emptyFlow(), id: newFlowId() }}
              onSave={handleSaveFlow}
              onCancel={() => { setEditingFlow(null); setIsAddingFlow(false); setSaveError(''); }}
            />
          </div>
        ) : (
          <>
            {/* Azure connection attempt result */}
            {azureNotice && (
              <div
                className={`p-3 text-[11px] border mb-1 ${
                  azureNotice.mode === 'azure'
                    ? 'bg-green-900/20 border-green-800 text-green-300'
                    : 'bg-orange-900/20 border-orange-800/50 text-orange-300'
                }`}
                style={{ borderRadius: 3 }}
              >
                <div className="font-semibold mb-0.5">
                  {azureNotice.mode === 'azure' ? 'Azure connected' : 'Azure connection attempt'}
                </div>
                {azureNotice.error ? (
                  <div className="text-[11px] opacity-90 break-all">{azureNotice.error}</div>
                ) : (
                  <div className="text-[11px] opacity-90">Successfully reached Azure.</div>
                )}
                <button
                  onClick={() => setAzureNotice(null)}
                  className="mt-1 text-[10px] opacity-60 hover:opacity-100 underline"
                >
                  dismiss
                </button>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Dataflows ({flows.length})
                </span>
                <button
                  onClick={() => { setIsAddingFlow(true); setAzureNotice(null); }}
                  className="text-[11px] px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                  style={{ borderRadius: 3 }}
                >
                  + Add Dataflow
                </button>
              </div>
              {flows.length === 0 ? (
                <div className="text-center py-6 text-gray-600 text-[12px]">
                  No dataflows yet. Add one to connect to Azure Logic Apps or ODS.
                </div>
              ) : (
                flows.map((flow) => (
                  <FlowRow key={flow.id} flow={flow} onEdit={(f) => setEditingFlow(f)} onDelete={handleDeleteFlow} />
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#2a2d3e]">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full text-[12px] text-red-400 hover:text-red-300 py-2 border border-red-900/40 hover:bg-red-900/10 transition-colors"
                  style={{ borderRadius: 3 }}
                >
                  Delete Dataflow Type
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-gray-400 text-center">
                    This removes the triangle and all its edges. Are you sure?
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleDeleteConnection} className="flex-1 bg-red-700 hover:bg-red-600 text-white text-[12px] py-2 transition-colors" style={{ borderRadius: 3 }}>Delete</button>
                    <button onClick={() => setConfirmDelete(false)} className="flex-1 bg-[#2a2d3e] text-gray-400 text-[12px] py-2 hover:text-white transition-colors" style={{ borderRadius: 3 }}>Cancel</button>
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
