import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
} from '@xyflow/react';
import { canvasMousePos } from '../../lib/canvasMousePos';
import '@xyflow/react/dist/style.css';

import { useGraphStore } from '../../store/graphStore';
import { useGraphState } from '../../hooks/useGraphState';
import { useShallow } from 'zustand/react/shallow';

import { SystemNode } from '../nodes/SystemNode';
import { GroupNode } from '../nodes/GroupNode';
import { ConnectionNode } from '../nodes/ConnectionNode';
import { ConnectorEdge } from '../edges/ConnectorEdge';
import { FlowEdge } from '../edges/FlowEdge';
import { MiniMapStyled } from './MiniMapStyled';
import { AddPanel } from '../panels/AddPanel';
import { RefreshControl } from '../panels/RefreshControl';

import type { MockNode, MockEdge } from '../../types';

// ---------------------------------------------------------------------------
// Node / Edge type registrations
// ---------------------------------------------------------------------------
const nodeTypes: NodeTypes = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  systemNode: SystemNode as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  groupNode: GroupNode as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectionNode: ConnectionNode as any,
};

const edgeTypes: EdgeTypes = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flowEdge: FlowEdge as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectorEdge: ConnectorEdge as any,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toRFNode(n: MockNode, dimmed: boolean): Node {
  const baseStyle = n.style ?? (n.type === 'systemNode' ? { width: 140 } : undefined);
  return {
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data as unknown as Record<string, unknown>,
    parentId: n.parentId,
    style: dimmed ? { ...baseStyle, opacity: 0.15 } : baseStyle,
    extent: undefined,
    // Groups render behind everything; container systemNodes behind their children (React Flow stacks children above parent automatically)
    zIndex: n.type === 'groupNode' ? -1 : 0,
  };
}

// Recursively resolve a node's absolute canvas position (handles nested parents)
function getAbsolutePosition(node: Node, allNodes: Node[]): { x: number; y: number } {
  if (!node.parentId) return { x: node.position.x, y: node.position.y };
  const parent = allNodes.find((n) => n.id === node.parentId);
  if (!parent) return { x: node.position.x, y: node.position.y };
  const parentAbs = getAbsolutePosition(parent, allNodes);
  return { x: parentAbs.x + node.position.x, y: parentAbs.y + node.position.y };
}

function toRFEdge(e: MockEdge): Edge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    data: e.data as unknown as Record<string, unknown>,
  };
}

// ---------------------------------------------------------------------------
// Tracks mouse position in flow coordinates (scoped to canvas element)
// ---------------------------------------------------------------------------
function MouseTracker() {
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    const el = document.querySelector('.react-flow__renderer');
    if (!el) return;
    function onMove(e: MouseEvent) {
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      canvasMousePos.x = p.x;
      canvasMousePos.y = p.y;
    }
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, [screenToFlowPosition]);

  return null;
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------
interface InfraCanvasProps {
  onNodeSelect: (id: string | null, type: string | null) => void;
  onEdgeSelect: (id: string | null) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function InfraCanvas({ onNodeSelect, onEdgeSelect, sidebarOpen, onToggleSidebar }: InfraCanvasProps) {
  useGraphState(); // triggers hydrate()

  const { storeNodes, storeEdges, valueStreams, focusedStreamId, updateNodePosition, setNodeParent, selectNode } =
    useGraphStore(useShallow((s) => ({
      storeNodes:          s.nodes,
      storeEdges:          s.edges,
      valueStreams:        s.valueStreams,
      focusedStreamId:     s.focusedStreamId,
      updateNodePosition:  s.updateNodePosition,
      setNodeParent:       s.setNodeParent,
      selectNode:          s.selectNode,
    })));

  // Determine which node ids belong to the focused stream (null = show all)
  const focusedNodeIds = focusedStreamId
    ? (valueStreams.find((vs) => vs.id === focusedStreamId)?.nodeIds ?? [])
    : null;

  function isDimmed(n: MockNode): boolean {
    if (!focusedNodeIds) return false;
    if (n.type === 'systemNode') return !focusedNodeIds.includes(n.id);
    // Dim connectionNodes whose source AND target are both dimmed
    if (n.type === 'connectionNode') {
      const d = n.data as { sourceId?: string; targetId?: string };
      return !focusedNodeIds.includes(d.sourceId ?? '') && !focusedNodeIds.includes(d.targetId ?? '');
    }
    return false;
  }

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(storeNodes.map((n) => toRFNode(n, isDimmed(n))));
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(storeEdges.map(toRFEdge));

  // Sync store → React Flow
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setRfNodes(storeNodes.map((n) => toRFNode(n, isDimmed(n)))); }, [storeNodes, focusedStreamId, valueStreams, setRfNodes]);
  useEffect(() => { setRfEdges(storeEdges.map(toRFEdge)); }, [storeEdges, setRfEdges]);

  // ---------------------------------------------------------------------------
  // Node drag stop — persist position + optional group parenting
  // ---------------------------------------------------------------------------
  const handleNodeDragStop = useCallback(
    (_event: unknown, node: Node) => {
      // node.position is relative to its parentId (if any), so we need the
      // absolute canvas position for the group hit-test.
      const absPos = getAbsolutePosition(node, rfNodes);

      // Both groupNodes and resized systemNodes can act as containers.
      // systemNodes only qualify if they have an explicit style.height (i.e. were resized).
      const containerNodes = rfNodes.filter(
        (n) =>
          n.id !== node.id &&
          (n.type === 'groupNode' || n.type === 'systemNode') &&
          // a node can't be its own ancestor
          n.parentId !== node.id
      );
      let newParentId: string | undefined;
      let positionToStore = absPos; // default: no parent → store absolute pos

      // Use the center of the dragged node for hit-testing so the user doesn't
      // have to position the top-left corner inside the container.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodeW = Number((node as any).measured?.width  ?? node.style?.width  ?? 140);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodeH = Number((node as any).measured?.height ?? node.style?.height ?? 36);
      const centerX = absPos.x + nodeW / 2;
      const centerY = absPos.y + nodeH / 2;

      // Track the smallest matching container (most specific wins over a large parent)
      let bestArea = Infinity;

      for (const grp of containerNodes) {
        const grpAbs = getAbsolutePosition(grp, rfNodes);
        // Prefer measured (React Flow internal) → style → type-based default
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gw = Number((grp as any).measured?.width  ?? grp.style?.width  ?? (grp.type === 'groupNode' ? 300 : 0));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gh = Number((grp as any).measured?.height ?? grp.style?.height ?? (grp.type === 'groupNode' ? 200 : 0));

        if (gw === 0 || gh === 0) continue; // unresized systemNode — skip

        if (
          centerX >= grpAbs.x &&
          centerX <= grpAbs.x + gw &&
          centerY >= grpAbs.y &&
          centerY <= grpAbs.y + gh
        ) {
          const area = gw * gh;
          if (area < bestArea) {
            bestArea = area;
            newParentId = grp.id;
            positionToStore = { x: absPos.x - grpAbs.x, y: absPos.y - grpAbs.y };
          }
        }
      }

      if (newParentId !== node.parentId) {
        // Parent changed (entering or leaving a group)
        setNodeParent(node.id, newParentId, positionToStore);
      } else if (newParentId) {
        // Same parent — node.position is already in parent-relative coords
        updateNodePosition(node.id, node.position);
      } else {
        // No parent — persist absolute position
        updateNodePosition(node.id, absPos);
      }
    },
    [rfNodes, updateNodePosition, setNodeParent]
  );

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------
  const handleNodeClick = useCallback(
    (_event: unknown, node: Node) => {
      selectNode(node.id);
      onNodeSelect(node.id, node.type ?? null);
    },
    [selectNode, onNodeSelect]
  );

  const handleEdgeClick = useCallback(
    (_event: unknown, edge: Edge) => { onEdgeSelect(edge.id); },
    [onEdgeSelect]
  );

  const handlePaneClick = useCallback(() => {
    selectNode(null);
    onNodeSelect(null, null);
    onEdgeSelect(null);
  }, [selectNode, onNodeSelect, onEdgeSelect]);

  return (
    <div className="w-full h-full relative">
      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-3 py-2 bg-[#0f1117] border-b border-[#2a2d3e]">

        {/* Sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="text-gray-500 hover:text-white text-[11px] px-2 py-1 border border-[#2a2d3e] hover:border-[#3a3d4e] transition-colors"
          style={{ borderRadius: 3 }}
          title={sidebarOpen ? 'Hide panel' : 'Show panel'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        <div className="flex-1" />

        <RefreshControl />
        <AddPanel />
      </div>

      {/* ── React Flow ── */}
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.08}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-[#0f1117]"
        style={{ paddingTop: 44 }}
      >
        <MouseTracker />
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#2a2d3e" />
        <Controls
          showInteractive={false}
          style={{ background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: 4 }}
        />
        <MiniMapStyled />
      </ReactFlow>
    </div>
  );
}

