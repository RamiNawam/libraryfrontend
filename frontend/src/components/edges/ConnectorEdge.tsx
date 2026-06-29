import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { EdgeFlowData, HealthStatus } from '../../types';

function edgeStyle(health: HealthStatus): { stroke: string; strokeDasharray?: string; strokeWidth: number } {
  switch (health) {
    case 'healthy':
      return { stroke: '#1D9E75', strokeWidth: 2 };
    case 'unhealthy':
    case 'down':
      return { stroke: '#A32D2D', strokeWidth: 2 };
    case 'degraded':
      return { stroke: '#BA7517', strokeWidth: 2 };
    default:
      // mock / unknown => grey dashed
      return { stroke: '#4b5563', strokeDasharray: '6 4', strokeWidth: 1.5 };
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
  const style = edgeStyle(health);

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
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        ...style,
        opacity: selected ? 1 : 0.75,
      }}
    />
  );
});
