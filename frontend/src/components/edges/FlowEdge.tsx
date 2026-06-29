import { memo } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
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
      return { stroke: '#4b5563', strokeDasharray: '6 4', strokeWidth: 1.5 };
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
  const style = edgeStyle(health);

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
          ...style,
          opacity: selected ? 1 : 0.75,
        }}
      />
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
