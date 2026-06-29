import { create } from 'zustand';
import * as api from '../api/client';
import type { MockNode, MockEdge, ValueStream } from '../types';
import { mockNodes, mockEdges, mockValueStreams } from '../mock/data';
import { canvasMousePos } from '../lib/canvasMousePos';

interface GraphState {
  nodes: MockNode[];
  edges: MockEdge[];
  selectedNodeId: string | null;
  focusedNodeId: string | null;
  focusedStreamId: string | null;
  valueStreams: ValueStream[];
  bootstrapped: boolean;
  isLive: boolean;
  lastUpdated: string;
  refreshIntervalMs: number;
  isSyncing: boolean;
  syncError: string | null;
}

interface GraphActions {
  hydrate: () => Promise<void>;
  addNode: (name: string, layers: string[]) => Promise<void>;
  addGroup: (name: string) => Promise<void>;
  addConnection: (sourceId: string, targetId: string, name: string) => Promise<void>;
  addEdge: (source: string, target: string, name: string, apiLink?: string) => Promise<void>;
  patchEntity: (id: string, patch: Record<string, unknown>) => Promise<void>;
  patchDataflow: (id: string, patch: Record<string, unknown>) => Promise<void>;
  deleteEntity: (id: string) => Promise<void>;
  deleteDataflow: (id: string) => Promise<void>;
  updateNodePosition: (id: string, position: { x: number; y: number }) => Promise<void>;
  setNodeParent: (id: string, parentId: string | undefined, position: { x: number; y: number }) => Promise<void>;
  upsertNode: (node: MockNode) => void;
  upsertValueStream: (vs: ValueStream) => void;
  selectNode: (id: string | null) => void;
  focusNode: (id: string | null) => void;
  setFocusedStream: (id: string | null) => void;
  resetFilters: () => void;
  setRefreshInterval: (ms: number) => void;
  triggerRefresh: () => Promise<void>;
  syncAzureLogicAppsToGraph: () => Promise<void>;
}

type GraphStore = GraphState & GraphActions;

export const useGraphStore = create<GraphStore>((set, get) => ({
  // ---- State ----
  nodes: [],
  edges: [],
  selectedNodeId: null,
  focusedNodeId: null,
  focusedStreamId: null,
  valueStreams: [],
  bootstrapped: false,
  isLive: false,
  lastUpdated: '',
  refreshIntervalMs: 5 * 60 * 1000,
  isSyncing: false,
  syncError: null,

  // ---- hydrate ----
  hydrate: async () => {
    try {
      const graph = await api.fetchGraph();

      // If backend has no data, bootstrap from mock
      if (!graph.bootstrapped || graph.entities.length === 0) {
        await api.bootstrapGraph(mockNodes, mockEdges, mockValueStreams);
        const seeded = await api.fetchGraph();
        set({
          nodes: seeded.entities,
          edges: seeded.dataflows,
          valueStreams: seeded.valueStreams,
          bootstrapped: true,
          lastUpdated: new Date().toISOString(),
        });
      } else {
        set({
          nodes: graph.entities,
          edges: graph.dataflows,
          valueStreams: graph.valueStreams,
          bootstrapped: graph.bootstrapped,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('[graphStore] hydrate failed:', err);
      // Fall back to mock data for offline development
      set({
        nodes: mockNodes,
        edges: mockEdges,
        valueStreams: mockValueStreams,
        bootstrapped: true,
        lastUpdated: new Date().toISOString(),
      });
    }
  },

  // ---- addNode (entity / system node) ----
  addNode: async (name, layers) => {
    const node = await api.createEntity({
      type: 'systemNode',
      position: { x: canvasMousePos.x, y: canvasMousePos.y },
      data: {
        label: name,
        category: 'integration',
        environment: null,
        mode: 'mock',
        health: 'unknown',
        description: '',
        techStack: [],
        layers,
        metrics: { lastSync: null },
      },
    });
    set((s) => ({ nodes: [...s.nodes, node] }));
  },

  // ---- addGroup ----
  addGroup: async (name) => {
    const node = await api.createEntity({
      type: 'groupNode',
      position: { x: canvasMousePos.x, y: canvasMousePos.y },
      data: { label: name },
      style: { width: 500, height: 300 },
    });
    set((s) => ({ nodes: [...s.nodes, node] }));
  },

  // ---- addConnection (Dataflow Type triangle) ----
  addConnection: async (sourceId, targetId, name) => {
    const result = await api.createConnection(sourceId, targetId, name);
    set((s) => ({
      nodes: [...s.nodes, result.connectionNode],
      edges: [...s.edges, ...result.edges],
    }));
  },

  // ---- addEdge (direct flow edge) ----
  addEdge: async (source, target, name, apiLink) => {
    const sourceNode = get().nodes.find((n) => n.id === source);
    const targetNode = get().nodes.find((n) => n.id === target);
    const sourceLabel = (sourceNode?.data as { label?: string })?.label || source;
    const targetLabel = (targetNode?.data as { label?: string })?.label || target;

    const edge = await api.createDataflow({
      source,
      target,
      type: 'flowEdge',
      data: {
        sourceLabel,
        targetLabel,
        flowCount: 1,
        health: 'unknown',
        flows: [],
        name,
      },
    });
    set((s) => ({ edges: [...s.edges, edge] }));
  },

  // ---- patchEntity ----
  patchEntity: async (id, patch) => {
    const updated = await api.patchEntity(id, patch as Parameters<typeof api.patchEntity>[1]);
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? updated : n)),
    }));
  },

  // ---- patchDataflow ----
  patchDataflow: async (id, patch) => {
    const updated = await api.patchDataflow(id, patch as Parameters<typeof api.patchDataflow>[1]);
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? updated : e)),
    }));
  },

  // ---- deleteEntity ----
  deleteEntity: async (id) => {
    await api.deleteEntity(id);
    set((s) => {
      const removedNode = s.nodes.find((n) => n.id === id);
      let nodesToRemove = new Set([id]);

      // If removing a system node, also remove orphaned connection nodes
      if (removedNode?.type === 'systemNode') {
        s.nodes.forEach((n) => {
          if (
            n.type === 'connectionNode' &&
            (
              (n.data as { sourceId?: string; targetId?: string }).sourceId === id ||
              (n.data as { sourceId?: string; targetId?: string }).targetId === id
            )
          ) {
            nodesToRemove.add(n.id);
          }
        });
      }

      return {
        nodes: s.nodes.filter((n) => !nodesToRemove.has(n.id)),
        edges: s.edges.filter(
          (e) => !nodesToRemove.has(e.source) && !nodesToRemove.has(e.target)
        ),
        selectedNodeId: nodesToRemove.has(s.selectedNodeId || '') ? null : s.selectedNodeId,
      };
    });
  },

  // ---- deleteDataflow ----
  deleteDataflow: async (id) => {
    await api.deleteDataflow(id);
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id) }));
  },

  // ---- updateNodePosition ----
  updateNodePosition: async (id, position) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, position } : n)),
    }));
    await api.patchEntity(id, { position });
  },

  // ---- setNodeParent ----
  setNodeParent: async (id, parentId, position) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, parentId, position } : n
      ),
    }));
    await api.patchEntity(id, { parentId, position });
  },

  // ---- upsertNode — replace or append a node in local state (no API call) ----
  upsertNode: (node) =>
    set((s) => ({
      nodes: s.nodes.some((n) => n.id === node.id)
        ? s.nodes.map((n) => (n.id === node.id ? node : n))
        : [...s.nodes, node],
    })),

  // ---- upsertValueStream — replace or append a value stream ----
  upsertValueStream: (vs) =>
    set((s) => ({
      valueStreams: s.valueStreams.some((v) => v.id === vs.id)
        ? s.valueStreams.map((v) => (v.id === vs.id ? vs : v))
        : [...s.valueStreams, vs],
    })),

  // ---- selectNode ----
  selectNode: (id) => set({ selectedNodeId: id }),

  // ---- focusNode ----
  focusNode: (id) => set({ focusedNodeId: id }),

  // ---- setFocusedStream ----
  setFocusedStream: (id) => set({ focusedStreamId: id }),

  // ---- resetFilters ----
  resetFilters: () => set({ focusedNodeId: null, focusedStreamId: null }),

  // ---- setRefreshInterval ----
  setRefreshInterval: (ms) => set({ refreshIntervalMs: ms }),

  // ---- triggerRefresh ----
  triggerRefresh: async () => {
    await get().syncAzureLogicAppsToGraph();
  },

  // ---- syncAzureLogicAppsToGraph ----
  syncAzureLogicAppsToGraph: async () => {
    set({ isSyncing: true, syncError: null });
    try {
      const graph = await api.syncAzureLogicAppsToGraph();
      set({
        nodes: graph.entities,
        edges: graph.dataflows,
        valueStreams: graph.valueStreams,
        lastUpdated: new Date().toISOString(),
        isSyncing: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      set({ isSyncing: false, syncError: msg });
      throw err;
    }
  },
}));
