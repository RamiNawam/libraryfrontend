import { useState } from 'react'; // still used by AddLayerButton
import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '../../store/graphStore';
import type { ConnectionNodeData } from '../../types';
import * as api from '../../api/client';

// ─── Main Sidebar ─────────────────────────────────────────────
export function Sidebar() {
  const { nodes, valueStreams, hydrate, focusedStreamId, setFocusedStream } = useGraphStore(useShallow((s) => ({
    nodes: s.nodes,
    valueStreams: s.valueStreams,
    hydrate: s.hydrate,
    focusedStreamId: s.focusedStreamId,
    setFocusedStream: s.setFocusedStream,
  })));

  const connNodes = nodes.filter((n) => n.type === 'connectionNode');
  const allFlows  = connNodes.flatMap((n) => (n.data as ConnectionNodeData).flows ?? []);

  return (
    <div className="flex flex-col h-full select-none">
      {/* Title */}
      <div className="px-4 py-3 border-b border-[#2a2d3e]">
        <div className="text-white text-sm font-semibold">Digital Twin</div>
      </div>

      {/* Layers */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">Layers</span>
          <AddLayerButton onAdded={hydrate} />
        </div>

        <LayerRow
          color="#60a5fa"
          label="All"
          count={allFlows.length}
          active={focusedStreamId === null}
          onClick={() => setFocusedStream(null)}
          onDelete={null}
        />

        {valueStreams.map((vs) => (
          <LayerRow
            key={vs.id}
            color={vs.color}
            label={vs.label}
            count={vs.nodeIds?.length ?? 0}
            active={focusedStreamId === vs.id}
            onClick={() => setFocusedStream(focusedStreamId === vs.id ? null : vs.id)}
            onDelete={async () => {
              await api.deleteValueStream(vs.id);
              await hydrate();
              if (focusedStreamId === vs.id) setFocusedStream(null);
            }}
          />
        ))}

        {valueStreams.length === 0 && (
          <div className="text-[11px] text-gray-600 mt-2 px-1">No layers yet.</div>
        )}
      </div>

    </div>
  );
}

// ─── Layer row ────────────────────────────────────────────────
function LayerRow({
  color, label, count, active, onClick, onDelete,
}: {
  color: string; label: string; count: number; active: boolean;
  onClick: () => void; onDelete: (() => void) | null;
}) {
  return (
    <div
      className={`group flex items-center justify-between px-2 py-1.5 mb-px transition-colors ${
        active ? 'bg-[#2a2d3e]' : 'hover:bg-[#1e2130]'
      }`}
    >
      <button className="flex items-center gap-2 flex-1 text-left" onClick={onClick}>
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[12px] text-gray-300">{label}</span>
      </button>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-gray-500">{count}</span>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-[11px] leading-none transition-opacity px-0.5"
            title="Delete layer"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Add layer button ─────────────────────────────────────────
function AddLayerButton({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#60a5fa');
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!label.trim()) return;
    setLoading(true);
    try {
      await api.createValueStream({ label: label.trim(), color });
      await onAdded();
      setLabel('');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a2d3e] text-gray-500 hover:text-white transition-colors"
      >
        + Add
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1a1d27] border border-[#2a2d3e] p-4 w-64 space-y-3 shadow-2xl" style={{ borderRadius: 4 }}>
        <div className="text-sm font-semibold text-white">Add Value Stream</div>
        <input
          autoFocus
          className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          placeholder="Value stream name"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm py-1.5 rounded"
          >
            {loading ? '...' : 'Add'}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="flex-1 bg-[#2a2d3e] text-gray-400 text-sm py-1.5 rounded hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
