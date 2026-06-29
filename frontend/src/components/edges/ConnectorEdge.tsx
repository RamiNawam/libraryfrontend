import { memo } from 'react';
import { BaseEdge, getBezierPath, useInternalNode, type EdgeProps } from '@xyflow/react';
import type { ConnectionNodeData, EdgeFlowData, HealthStatus } from '../../types';
import { getFloatingEdgeParams } from '../../lib/floatingEdge';

// Must match triangleFill() in ConnectionNode.tsx so each edge shares the
// color of the triangle (DataflowType) it connects to. Grey = mock.
function edgeColor(health: HealthStatus): string {
  switch (health) {
    case 'healthy':   return '#3fb950';
    case 'unhealthy':
    case 'down':      return '#e5534b';
    case 'degraded':  return '#d29922';
    default:          return '#3a4254'; // grey — mock / not connected
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

  // Color the edge after the triangle (DataflowType) it touches, so the line
  // always matches the triangle. Fall back to the edge's own stored health.
  const triangleNode =
    sourceNode?.type === 'connectionNode'
      ? sourceNode
      : targetNode?.type === 'connectionNode'
        ? targetNode
        : null;
  const triangleHealth = (triangleNode?.data as Partial<ConnectionNodeData> | undefined)?.health;

  const flowData = (data ?? {}) as Partial<EdgeFlowData>;
  const health = triangleHealth ?? flowData.health ?? 'unknown';
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
