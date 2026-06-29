import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '../../store/graphStore';

type Tab = 'entity' | 'group' | 'dataflowType';

export function AddPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('entity');

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-medium transition-colors"
        style={{ borderRadius: 3 }}
      >
        <span className="text-base leading-none">+</span>
        Add
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div className="absolute right-0 top-9 z-50 w-72 bg-[#1a1d27] border border-[#2a2d3e] shadow-xl" style={{ borderRadius: 4 }}>
            {/* Tabs */}
            <div className="flex border-b border-[#2a2d3e]">
              {(['entity', 'group', 'dataflowType'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    tab === t
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t === 'entity' ? 'Entity' : t === 'group' ? 'Group' : 'Dataflow Type'}
                </button>
              ))}
            </div>

            <div className="p-4">
              {tab === 'entity' && <AddEntityForm onDone={() => setOpen(false)} />}
              {tab === 'group' && <AddGroupForm onDone={() => setOpen(false)} />}
              {tab === 'dataflowType' && <AddDataflowTypeForm onDone={() => setOpen(false)} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Entity
// ---------------------------------------------------------------------------
function AddEntityForm({ onDone }: { onDone: () => void }) {
  const { addNode, valueStreams } = useGraphStore(useShallow((s) => ({
    addNode: s.addNode,
    valueStreams: s.valueStreams,
  })));
  const [name, setName] = useState('');
  const [streamIds, setStreamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleStream(id: string) {
    setStreamIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  }

  async function handleAdd() {
    if (!name.trim()) { setError('Name is required'); return; }
    setError('');
    setLoading(true);
    try {
      await addNode(name.trim(), [], streamIds);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-400 block mb-1">Name *</label>
        <input
          className="w-full bg-[#0f1117] border border-[#2a2d3e] px-3 py-2 text-[12px] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          placeholder="Entity name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          autoFocus
        />
        {error && <div className="text-xs text-red-400 mt-1">{error}</div>}
      </div>

      {valueStreams.length > 0 && (
        <div>
          <label className="text-xs text-gray-400 block mb-1">Value Streams</label>
          <div className="max-h-32 overflow-y-auto space-y-1 border border-[#2a2d3e] rounded p-2 bg-[#0f1117]">
            {valueStreams.map((vs) => (
              <label
                key={vs.id}
                className="flex items-center gap-2 text-[12px] text-gray-300 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={streamIds.includes(vs.id)}
                  onChange={() => toggleStream(vs.id)}
                  className="accent-blue-500"
                />
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: vs.color }}
                />
                <span className="truncate">{vs.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[12px] font-medium py-2 transition-colors"
      >
        {loading ? 'Adding...' : 'Add Entity'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Group
// ---------------------------------------------------------------------------
function AddGroupForm({ onDone }: { onDone: () => void }) {
  const addGroup = useGraphStore((s) => s.addGroup);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd() {
    if (!name.trim()) { setError('Group label is required'); return; }
    setError('');
    setLoading(true);
    try {
      await addGroup(name.trim());
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-400 block mb-1">Group Label *</label>
        <input
          className="w-full bg-[#0f1117] border border-[#2a2d3e] px-3 py-2 text-[12px] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          autoFocus
        />
        {error && <div className="text-xs text-red-400 mt-1">{error}</div>}
      </div>
      <button
        onClick={handleAdd}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[12px] font-medium py-2 transition-colors"
      >
        {loading ? 'Adding...' : 'Add Group'}
      </button>
    </div>
  );
}

const DATAFLOW_TYPE_OPTIONS = ['Logic Apps', 'ODS'];

// ---------------------------------------------------------------------------
// Add Dataflow Type (creates connectionNode triangle)
// ---------------------------------------------------------------------------
function AddDataflowTypeForm({ onDone }: { onDone: () => void }) {
  const { addConnection, nodes } = useGraphStore(useShallow((s) => ({
    addConnection: s.addConnection,
    nodes: s.nodes,
  })));

  const systemNodes = nodes.filter((n) => n.type === 'systemNode');

  const [type, setType] = useState('');
  const [name, setName] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd() {
    if (!type) { setError('Type is required'); return; }
    if (!name.trim()) { setError('Name is required'); return; }
    if (!sourceId) { setError('Source entity is required'); return; }
    if (!targetId) { setError('Target entity is required'); return; }
    if (sourceId === targetId) { setError('Source and target must be different'); return; }
    setError('');
    setLoading(true);
    try {
      await addConnection(sourceId, targetId, name.trim());
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-400 block mb-1">Type *</label>
        <select
          className="w-full bg-[#0f1117] border border-[#2a2d3e] px-3 py-2 text-[12px] text-white"
          value={type}
          onChange={(e) => setType(e.target.value)}
          autoFocus
        >
          <option value="">Select type...</option>
          {DATAFLOW_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Name *</label>
        <input
          className="w-full bg-[#0f1117] border border-[#2a2d3e] px-3 py-2 text-[12px] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          placeholder="Dataflow type name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Source Entity *</label>
        <select
          className="w-full bg-[#0f1117] border border-[#2a2d3e] px-3 py-2 text-[12px] text-white"
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
        >
          <option value="">Select source...</option>
          {systemNodes.map((n) => (
            <option key={n.id} value={n.id}>
              {(n.data as { label?: string }).label || n.id}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Target Entity *</label>
        <select
          className="w-full bg-[#0f1117] border border-[#2a2d3e] px-3 py-2 text-[12px] text-white"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">Select target...</option>
          {systemNodes
            .filter((n) => n.id !== sourceId)
            .map((n) => (
              <option key={n.id} value={n.id}>
                {(n.data as { label?: string }).label || n.id}
              </option>
            ))}
        </select>
      </div>

      {error && <div className="text-xs text-red-400">{error}</div>}

      <button
        onClick={handleAdd}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[12px] font-medium py-2 transition-colors"
      >
        {loading ? 'Adding...' : 'Add Dataflow Type'}
      </button>
    </div>
  );
}
