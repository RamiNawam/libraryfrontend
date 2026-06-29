import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '../../store/graphStore';

const INTERVALS = [
  { label: '5 min', ms: 5 * 60 * 1000 },
  { label: '30 min', ms: 30 * 60 * 1000 },
  { label: '1 hour', ms: 60 * 60 * 1000 },
];

export function RefreshControl() {
  const { isSyncing, syncError, refreshIntervalMs, setRefreshInterval, syncAzureLogicAppsToGraph } =
    useGraphStore(useShallow((s) => ({
      isSyncing: s.isSyncing,
      syncError: s.syncError,
      refreshIntervalMs: s.refreshIntervalMs,
      setRefreshInterval: s.setRefreshInterval,
      syncAzureLogicAppsToGraph: s.syncAzureLogicAppsToGraph,
    })));

  const [showIntervals, setShowIntervals] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleRefresh() {
    setLocalError(null);
    try {
      await syncAzureLogicAppsToGraph();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Refresh failed');
    }
  }

  const currentInterval = INTERVALS.find((i) => i.ms === refreshIntervalMs);

  return (
    <div className="flex items-center gap-2">
      {/* Refresh now button */}
      <button
        onClick={handleRefresh}
        disabled={isSyncing}
        style={{ borderRadius: 3 }}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border transition-colors ${
          isSyncing
            ? 'border-[#2a2d3e] text-blue-400 cursor-wait bg-transparent'
            : 'border-[#2a2d3e] hover:border-[#3a3d4e] text-gray-400 hover:text-white bg-transparent'
        }`}
        title="Sync Azure Logic Apps"
      >
        <span className={`text-base leading-none ${isSyncing ? 'animate-spin' : ''}`}>↻</span>
        {isSyncing ? 'Refreshing Azure...' : 'Refresh'}
      </button>

      {/* Interval picker */}
      <div className="relative">
        <button
          onClick={() => setShowIntervals((o) => !o)}
          className="px-2 py-1 text-[11px] text-gray-400 hover:text-white border border-[#2a2d3e] hover:border-[#3a3d4e] transition-colors"
          style={{ borderRadius: 3 }}
          title="Set auto-refresh interval"
        >
          {currentInterval?.label ?? 'Auto'} ▾
        </button>
        {showIntervals && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowIntervals(false)} />
            <div className="absolute right-0 top-9 z-50 bg-[#1a1d27] border border-[#2a2d3e] shadow-xl overflow-hidden" style={{ borderRadius: 4 }}>
              {INTERVALS.map((interval) => (
                <button
                  key={interval.ms}
                  onClick={() => { setRefreshInterval(interval.ms); setShowIntervals(false); }}
                  className={`block w-full text-left px-4 py-2 text-xs transition-colors ${
                    refreshIntervalMs === interval.ms
                      ? 'text-blue-400 bg-blue-900/20'
                      : 'text-gray-400 hover:text-white hover:bg-[#2a2d3e]'
                  }`}
                >
                  {interval.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {(syncError || localError) && (
        <span className="text-[11px] text-red-400 truncate max-w-[140px]" title={syncError || localError || ''}>
          {syncError || localError}
        </span>
      )}
    </div>
  );
}
