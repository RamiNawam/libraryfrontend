import { memo } from 'react';
import { BaseEdge, getBezierPath, useInternalNode, type EdgeProps } from '@xyflow/react';
import type { EdgeFlowData, HealthStatus } from '../../types';
import { getFloatingEdgeParams } from '../../lib/floatingEdge';

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
  source,
  target,
  data,
  selected,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const flowData = (data ?? {}) as Partial<EdgeFlowData>;
  const health = flowData.health ?? 'unknown';
  const color = edgeColor(health);
  const isLive = health !== 'unknown';

  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty, sourcePos, targetPos } = getFloatingEdgeParams(sourceNode, targetNode);
  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
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
