import React from 'react';
import { RefreshCw, Plus, Wifi, Layers, Activity } from 'lucide-react';
import { SubredditStream } from '../types/orbit';
import { formatNumber } from '../utils/formatters';

interface DashboardStatusProps {
  streams: SubredditStream[];
  onRefreshAll: () => void;
  onOpenAddStream: () => void;
  isRefreshingAll: boolean;
}

export const DashboardStatus: React.FC<DashboardStatusProps> = ({
  streams,
  onRefreshAll,
  onOpenAddStream,
  isRefreshingAll,
}) => {
  const activeStreams = streams.filter((s) => !s.isCollapsed);
  const activeStreamsCount = activeStreams.length;
  const totalPostsCount = streams.reduce((acc, s) => acc + s.posts.length, 0);
  const totalReadersCount = streams.reduce((acc, s) => acc + (s.subscribers || 0), 0);

  return (
    <section className="border-b border-[#151c2c] bg-[#080b13] px-3.5 sm:px-6 py-2 select-none">
      <div className="max-w-[1920px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left: Real Technical Stream Telemetry */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
          {/* Live Carrier Bead */}
          <div className="flex items-center gap-2 pr-3 border-r border-[#1a2336]">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 animate-carrier" />
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="font-semibold text-slate-200 tracking-tight">ORBIT MONITOR</span>
              <span className="text-slate-600">/</span>
              <span className="text-emerald-400 font-medium">LIVE</span>
            </div>
          </div>

          {/* Metric: Active Streams with Tick Meters */}
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-500 uppercase text-[10px]">FEEDS:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-200 font-semibold tabular-nums text-xs">
                {String(activeStreamsCount).padStart(2, '0')}
              </span>
              <span className="text-slate-500 text-[10px]">/ {String(streams.length).padStart(2, '0')}</span>
              {/* Channel ticks */}
              <div className="hidden sm:flex items-center gap-0.5 ml-1">
                {streams.slice(0, 8).map((s, i) => (
                  <span
                    key={s.id || i}
                    title={`Feed #${i + 1}: r/${s.name} (${s.isCollapsed ? 'Collapsed' : 'Active'})`}
                    className={`h-2.5 w-1 rounded-xs transition-colors ${
                      s.isCollapsed
                        ? 'bg-[#1b253b]'
                        : s.isLoading
                        ? 'bg-cyan-400/50 animate-pulse'
                        : 'bg-cyan-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <span className="text-slate-700 hidden sm:inline" aria-hidden="true">·</span>

          {/* Metric: Total Posts Loaded */}
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-slate-500 uppercase text-[10px]">BUFFERED:</span>
            <span className="text-slate-200 font-semibold tabular-nums">
              {formatNumber(totalPostsCount)}
            </span>
            <span className="text-slate-500 text-[10px]">posts</span>
          </div>

          {totalReadersCount > 0 && (
            <>
              <span className="text-slate-700 hidden md:inline" aria-hidden="true">·</span>
              {/* Metric: Connected Readers */}
              <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-slate-500 uppercase text-[10px]">AUDIENCE:</span>
                <span className="text-slate-200 font-semibold tabular-nums">
                  {formatNumber(totalReadersCount)}
                </span>
                <span className="text-slate-500 text-[10px]">readers</span>
              </div>
            </>
          )}
        </div>

        {/* Right: Technical Command Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
          {/* Sync All Button */}
          <button
            type="button"
            onClick={onRefreshAll}
            disabled={isRefreshingAll}
            className="flex items-center gap-1.5 px-2.5 py-1 text-slate-300 hover:text-white bg-[#0e1422] hover:bg-[#141d30] border border-[#1d273c] hover:border-cyan-500/40 rounded transition-colors disabled:opacity-50 cursor-pointer text-[11px]"
            title="Fetch live updates across all active subreddit streams"
          >
            <RefreshCw
              className={`w-3 h-3 text-cyan-400 ${isRefreshingAll ? 'animate-spin' : ''}`}
            />
            <span>{isRefreshingAll ? 'SYNCING...' : 'SYNC FEEDS'}</span>
          </button>

          {/* Add Stream Button */}
          <button
            type="button"
            onClick={onOpenAddStream}
            className="flex items-center gap-1.5 px-2.5 py-1 text-cyan-300 hover:text-cyan-100 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-700/50 hover:border-cyan-500/80 rounded transition-colors cursor-pointer text-[11px] font-semibold"
          >
            <Plus className="w-3 h-3" />
            <span>+ FEED</span>
          </button>
        </div>
      </div>
    </section>
  );
};
