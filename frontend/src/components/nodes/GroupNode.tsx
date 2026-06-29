import { memo } from 'react';
import { NodeResizer, type NodeProps, type ResizeDragEvent, type ResizeParams } from '@xyflow/react';
import { useGraphStore } from '../../store/graphStore';
import type { GroupNodeData, SystemNodeData, ConnectionNodeData, HealthStatus } from '../../types';

function groupHealth(id: string, nodes: ReturnType<typeof useGraphStore.getState>['nodes']): HealthStatus {
  const children = nodes.filter((n) => n.parentId === id);
  if (children.length === 0) return 'unknown';

  const statuses = children.map((n) => {
    if (n.type === 'systemNode') {
      const d = n.data as SystemNodeData;
      if (!d.mode || d.mode === 'mock' || d.mode === 'not_connected') return 'unknown';
      return d.health;
    }
    if (n.type === 'connectionNode') return (n.data as ConnectionNodeData).health;
    return 'unknown' as HealthStatus;
  });

  if (statuses.some((s) => s === 'down' || s === 'unhealthy')) return 'down';
  if (statuses.some((s) => s === 'degraded')) return 'degraded';
  if (statuses.some((s) => s === 'healthy')) return 'healthy';
  return 'unknown';
}

function dotColor(h: HealthStatus): string {
  switch (h) {
    case 'healthy':  return '#22c55e';
    case 'degraded': return '#f59e0b';
    case 'down':
    case 'unhealthy': return '#ef4444';
    default:          return '#6b7280';
  }
}

export const GroupNode = memo(function GroupNode({ id, data, selected }: NodeProps) {
  const d           = data as unknown as GroupNodeData;
  const nodes       = useGraphStore((s) => s.nodes);
  const patchEntity = useGraphStore((s) => s.patchEntity);
  const h           = groupHealth(id, nodes);

  function handleResizeEnd(_event: ResizeDragEvent, params: ResizeParams) {
    patchEntity(id, { style: { width: params.width, height: params.height } });
  }

  return (
    <div
      className="w-full h-full"
      style={{
        border: selected ? '1px solid #60a5fa' : '1px dashed #2a2d3e',
        borderRadius: 4,
        background: 'rgba(255,255,255,0.01)',
      }}
    >
      <NodeResizer
        color="#2a2d3e"
        isVisible={selected}
        minWidth={200}
        minHeight={120}
        onResizeEnd={handleResizeEnd}
      />
      <div className="pointer-events-none px-3 pt-2 flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor(h) }}
        />
        <span className="text-[11px] text-gray-400 font-medium select-none tracking-wide">
          {d.label}
        </span>
      </div>
    </div>
  );
});
