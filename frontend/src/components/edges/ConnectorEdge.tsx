import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { EdgeFlowData, HealthStatus } from '../../types';

function edgeColor(health: HealthStatus): string {
  switch (health) {
    case 'healthy':   return '#3fb950';
    case 'unhealthy':
    case 'down':      return '#e5534b';
    case 'degraded':  return '#d29922';
    default:          return '#5a6378'; // muted slate — not connected
  }
}

export const ConnectorEdge = memo(function ConnectorEdge({
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
  const color = edgeColor(health);
  const isLive = health !== 'unknown';

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      {/* Base channel — the still water */}
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
      {/* Flowing current — only on connected (live) lines */}
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
    </>
  );
});
