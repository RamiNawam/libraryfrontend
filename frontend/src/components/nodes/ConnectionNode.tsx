import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ConnectionNodeData, HealthStatus } from '../../types';

function triangleFill(health: HealthStatus): string {
  switch (health) {
    case 'healthy':  return '#3fb950';
    case 'degraded': return '#d29922';
    case 'unhealthy':
    case 'down':     return '#e5534b';
    default:         return '#3a4254';
  }
}

export const ConnectionNode = memo(function ConnectionNode({ data, selected }: NodeProps) {
  const d    = data as unknown as ConnectionNodeData;
  const fill = triangleFill(d.health);

  const W = 72;
  const H = 62;
  // upward-pointing triangle: tip at top-center, base at bottom
  const points = `${W / 2},2 2,${H - 2} ${W - 2},${H - 2}`;

  return (
    <div
      className="relative select-none cursor-pointer"
      style={{ width: W, height: H + 26 }}
      title={d.name}
    >
      {/* handles sit at the base corners */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ left: 4, top: H - 8, bottom: 'auto', transform: 'none' }}
        className="!w-1.5 !h-1.5 !bg-transparent !border-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ right: 4, top: H - 8, bottom: 'auto', transform: 'none' }}
        className="!w-1.5 !h-1.5 !bg-transparent !border-0"
      />

      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block' }}
      >
        <polygon
          points={points}
          fill={fill}
          stroke={selected ? '#60a5fa' : 'rgba(255,255,255,0.12)'}
          strokeWidth={selected ? 1.5 : 0.5}
        />
      </svg>

      {/* name label below triangle */}
      <div
        className="absolute left-0 right-0 text-center"
        style={{ top: H + 4, width: W + 40, marginLeft: -20 }}
      >
        <span className="text-[10px] text-gray-300 leading-tight block truncate px-1">
          {d.name}
        </span>
      </div>
    </div>
  );
});
