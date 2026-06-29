import { memo } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import type { EdgeFlowData, HealthStatus } from '../../types';

function edgeColor(health: HealthStatus): string {
  switch (health) {
    case 'healthy':   return '#3fb950';
    case 'unhealthy':
    case 'down':      return '#e5534b';
    case 'degraded':  return '#d29922';
    default:          return '#5a6378';
  }
}

export const FlowEdge = memo(function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const flowData = (data ?? {}) as Partial<EdgeFlowData>;
  const health = flowData.health ?? 'unknown';
  const name = flowData.name;
  const color = edgeColor(health);
  const isLive = health !== 'unknown';

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: 2,
          strokeDasharray: isLive ? undefined : '5 5',
          opacity: isLive ? (selected ? 0.5 : 0.32) : selected ? 0.8 : 0.55,
        }}
      />
      {isLive && (
        <path
          d={edgePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          className="edge-river"
          style={{ color, opacity: selected ? 1 : 0.85 }}
        />
      )}
      {name && selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="bg-[#1a1d27] border border-[#2a2d3e] text-gray-300 text-[10px] px-2 py-0.5 rounded"
          >
            {name}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
