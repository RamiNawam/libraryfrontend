import { memo } from 'react';
import { Handle, Position, NodeResizer, type NodeProps, type ResizeDragEvent, type ResizeParams } from '@xyflow/react';
import type { SystemNodeData, HealthStatus, EntityMode } from '../../types';
import { useGraphStore } from '../../store/graphStore';

function visualHealth(mode: EntityMode | undefined, health: HealthStatus): HealthStatus {
  if (!mode || mode === 'mock' || mode === 'not_connected') return 'unknown';
  return health;
}

function dotColor(h: HealthStatus): string {
  switch (h) {
    case 'healthy':  return '#3fb950';
    case 'degraded': return '#d29922';
    case 'unhealthy':
    case 'down':     return '#e5534b';
    default:         return '#5a6378';
  }
}

export const SystemNode = memo(function SystemNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as SystemNodeData;
  const health = visualHealth(d.mode, d.health);
  const color  = dotColor(health);
  const patchEntity = useGraphStore((s) => s.patchEntity);
  const nodes       = useGraphStore((s) => s.nodes);

  // Acts as a container when it has been resized (explicit height)
  const node = nodes.find((n) => n.id === id);
  const isContainer = node?.style?.height !== undefined;

  function handleResizeEnd(_event: ResizeDragEvent, params: ResizeParams) {
    patchEntity(id, { style: { width: params.width, height: params.height } });
  }

  return (
    <div
      className="relative w-full h-full cursor-pointer select-none"
      style={{
        background: isContainer ? 'rgba(26,29,39,0.7)' : '#1a1d27',
        border: selected ? '1px solid #60a5fa' : isContainer ? '1px dashed #3a3d4e' : '1px solid #2a2d3e',
        borderRadius: 4,
      }}
    >
      <NodeResizer
        color="#2a2d3e"
        isVisible={selected}
        minWidth={100}
        minHeight={36}
        onResizeEnd={handleResizeEnd}
      />
      <Handle type="target" position={Position.Left}   className="!w-1.5 !h-1.5 !bg-[#2a2d3e] !border-0" />
      <Handle type="source" position={Position.Right}  className="!w-1.5 !h-1.5 !bg-[#2a2d3e] !border-0" />
      <Handle type="target" position={Position.Top}    id="top-t" className="!w-1.5 !h-1.5 !bg-[#2a2d3e] !border-0" />
      <Handle type="source" position={Position.Bottom} id="bot-s" className="!w-1.5 !h-1.5 !bg-[#2a2d3e] !border-0" />

      <div className="flex items-center gap-2 px-3 py-2.5">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-white text-[13px] font-medium truncate leading-none">
          {d.label}
        </span>
      </div>
    </div>
  );
});
