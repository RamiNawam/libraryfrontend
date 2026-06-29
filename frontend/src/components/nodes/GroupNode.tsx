import { memo } from 'react';
import { NodeResizer, type NodeProps, type ResizeDragEvent, type ResizeParams } from '@xyflow/react';
import { useGraphStore } from '../../store/graphStore';
import type { GroupNodeData, HealthStatus } from '../../types';

function dotColor(h: HealthStatus): string {
  switch (h) {
    case 'healthy':  return '#3fb950';
    case 'degraded': return '#d29922';
    case 'unhealthy':
    case 'down':     return '#e5534b';
    default:         return '#5a6378';
  }
}

export const GroupNode = memo(function GroupNode({ id, data, selected }: NodeProps) {
  const d           = data as unknown as GroupNodeData;
  const patchEntity = useGraphStore((s) => s.patchEntity);

  // A monitored group (e.g. Azure) shows its reachability; others stay neutral.
  const statusColor = d.platform ? dotColor(d.health ?? 'unknown') : '#5a6378';

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
          style={{ backgroundColor: statusColor }}
        />
        <span className="text-[11px] text-gray-400 font-medium select-none tracking-wide">
          {d.label}
        </span>
      </div>
    </div>
  );
});
