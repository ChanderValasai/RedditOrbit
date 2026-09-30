import React from 'react';
import { RefreshCw, Plus, Radio, Layers, Activity, Cpu, ArrowUpRight } from 'lucide-react';
import { SubredditStream } from '../types/orbit';

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
  const activeStreamsCount = streams.filter((s) => !s.isCollapsed).length;
  const totalPostsCount = streams.reduce((acc, s) => acc + s.posts.length, 0);

  return (
    <section className="border-b border-[#161d2d] bg-[#090d16] px-3.5 sm:px-6 py-2.5">
      <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Command Ribbon Telemetry Gauge */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 sm:gap-x-6 text-xs">
          {/* Signal Status */}
          <div className="flex items-center gap-2 pr-2 border-r border-[#1a2336]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono tracking-widest text-slate-400 font-semibold uppercase leading-none">
                SPACE TELEMETRY
              </span>
              <span className="text-[11px] font-mono text-cyan-300 font-medium mt-0.5">
                ACTIVE ORBITS
              </span>
            </div>
          </div>

          {/* Micro Telemetry Metrics */}
          <div className="flex items-center gap-4 sm:gap-6 font-mono text-[11px]">
            {/* Active Streams */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 uppercase text-[10px]">STREAMS:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-semibold tabular-nums text-xs">
                  {String(activeStreamsCount).padStart(2, '0')}
                </span>
                <div className="hidden sm:flex items-center gap-0.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-2.5 w-1 rounded-xs ${
                        i < activeStreamsCount ? 'bg-cyan-400' : 'bg-[#182133]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <span className="text-slate-800" aria-hidden="true">|</span>

            {/* Posts Buffered */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 uppercase text-[10px]">BUFFER:</span>
              <span className="text-white font-semibold tabular-nums text-xs">
                {String(totalPostsCount).padStart(3, '0')}
              </span>
              <span className="text-slate-400 text-[10px] hidden sm:inline">PACKETS</span>
            </div>

            <span className="text-slate-800 hidden sm:inline" aria-hidden="true">|</span>

            {/* Stream Protocol Latency */}
            <div className="hidden lg:flex items-center gap-1.5 text-slate-400 text-[11px]">
              <span className="uppercase text-[10px]">LATENCY:</span>
              <span className="text-emerald-400 font-semibold tabular-nums">14ms</span>
              <span className="text-slate-500 font-mono text-[10px]">P99</span>
            </div>
          </div>
        </div>

        {/* Right: Technical Command Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs">
          <button
            type="button"
            onClick={onRefreshAll}
            disabled={isRefreshingAll}
            className="flex items-center gap-1.5 px-2.5 py-1 text-slate-300 hover:text-white bg-[#0e1422] hover:bg-[#151c2e] border border-[#1e273a] hover:border-cyan-500/40 rounded transition-colors disabled:opacity-50 cursor-pointer"
            title="Synchronize all streams"
          >
            <RefreshCw
              className={`w-3 h-3 text-cyan-400 ${isRefreshingAll ? 'animate-spin' : ''}`}
            />
            <span>{isRefreshingAll ? 'SYNCING...' : 'SYNC ALL'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddStream}
            className="flex items-center gap-1.5 px-2.5 py-1 text-cyan-300 hover:text-cyan-100 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-700/50 hover:border-cyan-500/80 rounded transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>ADD STREAM</span>
          </button>
        </div>
      </div>
    </section>
  );
};
