import { useState, useCallback } from 'react';
import { InfraCanvas } from './components/canvas/InfraCanvas';
import { Sidebar } from './components/panels/Sidebar';
import { ConnectionDrawer } from './components/panels/ConnectionDrawer';
import { NodeDrawer } from './components/panels/NodeDrawer';
import { GroupDrawer } from './components/panels/GroupDrawer';
import { EdgeDrawer } from './components/panels/EdgeDrawer';

type DrawerState =
  | { kind: 'none' }
  | { kind: 'connection'; id: string }
  | { kind: 'node'; id: string }
  | { kind: 'group'; id: string }
  | { kind: 'edge'; id: string };

export default function App() {
  const [drawer, setDrawer]         = useState<DrawerState>({ kind: 'none' });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleNodeSelect = useCallback((id: string | null, type: string | null) => {
    if (!id) { setDrawer({ kind: 'none' }); return; }
    if (type === 'connectionNode') setDrawer({ kind: 'connection', id });
    else if (type === 'groupNode') setDrawer({ kind: 'group', id });
    else setDrawer({ kind: 'node', id });
  }, []);

  const handleEdgeSelect = useCallback((id: string | null) => {
    if (!id) { setDrawer({ kind: 'none' }); return; }
    setDrawer({ kind: 'edge', id });
  }, []);

  const closeDrawer = useCallback(() => setDrawer({ kind: 'none' }), []);
  const hasDrawer   = drawer.kind !== 'none';

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#0f1117]">

      {/* ── Left sidebar ── */}
      {sidebarOpen && (
        <div className="flex-shrink-0 w-[210px] h-full bg-[#13151f] border-r border-[#2a2d3e] overflow-hidden flex flex-col z-10">
          <Sidebar />
        </div>
      )}

      {/* ── Canvas area ── */}
      <div
        className="flex-1 h-full overflow-hidden"
        style={{ marginRight: hasDrawer ? 380 : 0 }}
      >
        <InfraCanvas
          onNodeSelect={handleNodeSelect}
          onEdgeSelect={handleEdgeSelect}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
        />
      </div>

      {/* ── Right drawer ── */}
      {hasDrawer && (
        <div className="fixed right-0 top-0 bottom-0 w-[380px] bg-[#1a1d27] border-l border-[#2a2d3e] z-20 shadow-2xl overflow-hidden flex flex-col">
          {drawer.kind === 'connection' && (
            <ConnectionDrawer nodeId={drawer.id} onClose={closeDrawer} />
          )}
          {drawer.kind === 'node' && (
            <NodeDrawer nodeId={drawer.id} onClose={closeDrawer} />
          )}
          {drawer.kind === 'group' && (
            <GroupDrawer nodeId={drawer.id} onClose={closeDrawer} />
          )}
          {drawer.kind === 'edge' && (
            <EdgeDrawer edgeId={drawer.id} onClose={closeDrawer} />
          )}
        </div>
      )}
    </div>
  );
}
