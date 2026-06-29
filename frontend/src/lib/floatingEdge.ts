import { Position, type InternalNode, type Node } from '@xyflow/react';

// Returns the point on the perimeter of `node` that lies on the line toward `other`.
function getNodeIntersection(node: InternalNode<Node>, other: InternalNode<Node>) {
  const w = (node.measured?.width ?? 0) / 2;
  const h = (node.measured?.height ?? 0) / 2;

  const cx = node.internals.positionAbsolute.x + w;
  const cy = node.internals.positionAbsolute.y + h;
  const ox = other.internals.positionAbsolute.x + (other.measured?.width ?? 0) / 2;
  const oy = other.internals.positionAbsolute.y + (other.measured?.height ?? 0) / 2;

  if (w === 0 || h === 0) return { x: cx, y: cy };

  const xx = (ox - cx) / (2 * w) - (oy - cy) / (2 * h);
  const yy = (ox - cx) / (2 * w) + (oy - cy) / (2 * h);
  const a = 1 / (Math.abs(xx) + Math.abs(yy) || 1);
  const dx = a * xx;
  const dy = a * yy;

  return { x: w * (dx + dy) + cx, y: h * (-dx + dy) + cy };
}

// Which side of the node the intersection point sits on.
function getEdgeSide(node: InternalNode<Node>, point: { x: number; y: number }): Position {
  const nx = node.internals.positionAbsolute.x;
  const ny = node.internals.positionAbsolute.y;
  const nw = node.measured?.width ?? 0;
  const nh = node.measured?.height ?? 0;

  if (Math.round(point.x) <= Math.round(nx) + 1) return Position.Left;
  if (Math.round(point.x) >= Math.round(nx + nw) - 1) return Position.Right;
  if (Math.round(point.y) <= Math.round(ny) + 1) return Position.Top;
  return Position.Bottom;
}

export function getFloatingEdgeParams(
  source: InternalNode<Node>,
  target: InternalNode<Node>
) {
  const sp = getNodeIntersection(source, target);
  const tp = getNodeIntersection(target, source);
  return {
    sx: sp.x,
    sy: sp.y,
    tx: tp.x,
    ty: tp.y,
    sourcePos: getEdgeSide(source, sp),
    targetPos: getEdgeSide(target, tp),
  };
}
