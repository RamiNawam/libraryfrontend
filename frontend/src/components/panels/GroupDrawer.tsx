import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '../../store/graphStore';
import type { GroupNodeData } from '../../types';

interface GroupDrawerProps {
  nodeId: string;
  onClose: () => void;
}

export function GroupDrawer({ nodeId, onClose }: GroupDrawerProps) {
  const { nodes, patchEntity, deleteEntity } = useGraphStore(useShallow((s) => ({
    nodes: s.nodes,
    patchEntity: s.patchEntity,
    deleteEntity: s.deleteEntity,
  })));

  const node = nodes.find((n) => n.id === nodeId);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!node || node.type !== 'groupNode') return null;

  const data = node.data as GroupNodeData;

  const childNodes = nodes.filter((n) => n.parentId === nodeId);

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
