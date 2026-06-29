import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '../../store/graphStore';
import type { EdgeFlowData, HealthStatus } from '../../types';

interface EdgeDrawerProps {
  edgeId: string;
  onClose: () => void;
}

function healthColor(h: HealthStatus): string {
  switch (h) {
    case 'healthy': return '#3fb950';
    case 'unhealthy':
    case 'down': return '#e5534b';
    case 'degraded': return '#d29922';
    default: return '#5a6378';
  }
}

export function EdgeDrawer({ edgeId, onClose }: EdgeDrawerProps) {
  const { edges, deleteDataflow } = useGraphStore(useShallow((s) => ({
    edges: s.edges,
    deleteDataflow: s.deleteDataflow,
  })));

  const edge = edges.find((e) => e.id === edgeId);
  if (!edge) return null;

  const data = edge.data as EdgeFlowData;
  const h = data.health ?? 'unknown';

  async function handleDelete() {
    await deleteDataflow(edgeId);
    onClose();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-[#2a2d3e] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: healthColor(h) }}
          />
          <div className="min-w-0">
            <div className="text-white font-semibold text-sm truncate">
              {data.name || 'Connection'}
            </div>
            <div className="text-gray-500 text-xs truncate">
              {data.sourceLabel} → {data.targetLabel}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white ml-2 text-lg leading-none">
          ✕
        </button>
      </div>

      <div className="p-4 space-y-3">
        <Row label="Type" value={edge.type} />
        <Row label="Flow count" value={String(data.flowCount)} />
        <Row label="Health" value={h} />

        <div className="pt-3 border-t border-[#2a2d3e]">
          <button
            onClick={handleDelete}
            className="w-full text-sm text-red-400 hover:text-red-300 py-2 border border-red-900/40 rounded hover:bg-red-900/10 transition-colors"
          >
            Delete Edge
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-gray-500 w-24 flex-shrink-0">{label}</span>
      <span className="text-gray-300">{value}</span>
    </div>
  );
}
