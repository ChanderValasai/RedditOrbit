import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Flame,
  Clock,
  TrendingUp,
  Award,
  Trash2,
  Copy,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Radio,
  Sliders,
  Sparkles,
  WifiOff,
  Activity,
  Terminal,
  GripVertical,
} from 'lucide-react';
import { SubredditStream, RedditPost, SortOption, TimeRange, StreamDensity } from '../types/orbit';
import { PostCard } from './PostCard';
import { formatNumber } from '../utils/formatters';

interface StreamLaneProps {
  stream: SubredditStream;
  density: StreamDensity;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onRefresh: () => void;
  onChangeSort: (sort: SortOption) => void;
  onChangeTimeRange?: (timeRange: TimeRange) => void;
  onToggleCollapse: () => void;
  onSelectPost: (post: RedditPost) => void;
  onSimulateState?: (type: 'normal' | 'empty' | 'error') => void;
  streamIndex?: number;
  dragHandleProps?: Record<string, any>;
  isDragOverlay?: boolean;
}

export const StreamLane: React.FC<StreamLaneProps> = ({
  stream,
  density,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  onRemove,
  onDuplicate,
  onRefresh,
  onChangeSort,
  onChangeTimeRange,
  onToggleCollapse,
  onSelectPost,
  onSimulateState,
  streamIndex = 0,
  dragHandleProps,
  isDragOverlay,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const sortTabs: { id: SortOption; label: string; icon: React.ReactNode }[] = [
    { id: 'hot', label: 'HOT', icon: <Flame className="w-3 h-3" /> },
    { id: 'new', label: 'NEW', icon: <Clock className="w-3 h-3" /> },
    { id: 'top', label: 'TOP', icon: <Award className="w-3 h-3" /> },
    { id: 'rising', label: 'RISING', icon: <TrendingUp className="w-3 h-3" /> },
  ];

  // Subtle top accent tint to differentiate streams
  const streamAccents = [
    'border-t-cyan-400',
    'border-t-sky-400',
    'border-t-teal-400',
    'border-t-indigo-400',
    'border-t-emerald-400',
  ];
  const accentClass = streamAccents[streamIndex % streamAccents.length];

  if (stream.isCollapsed) {
    return (
      <div className={`shrink-0 w-16 md:w-18 bg-[#0b0e16] border border-[#1b2234] border-t-2 ${accentClass} ${isDragOverlay ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-2xl shadow-cyan-500/40' : ''} rounded-sm flex flex-col items-center py-4 justify-between select-none h-full max-h-[calc(100vh-125px)]`}>
        <div className="flex flex-col items-center gap-2">
          {dragHandleProps && (
            <button
              type="button"
              {...dragHandleProps}
              className="p-1 text-slate-500 hover:text-cyan-400 hover:bg-[#141b2b] rounded transition-colors cursor-grab active:cursor-grabbing touch-none select-none"
              title="Drag to reorder stream"
              aria-label={`Drag stream ${stream.name} to reorder`}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-[#141b2b] rounded transition-colors cursor-pointer"
            title="Expand stream"
          >
            <ChevronDown className="w-4 h-4 rotate-270" />
          </button>
          <span className="text-[10px] font-mono text-cyan-400 font-bold">
            #{String(streamIndex + 1).padStart(2, '0')}
          </span>
        </div>

        <div className="transform -rotate-90 origin-center whitespace-nowrap text-xs font-mono font-bold text-slate-300 tracking-wider">
          {stream.displayName}
        </div>

        <div className="text-[10px] font-mono text-slate-500 tabular-nums">
          {stream.posts.length}P
        </div>
      </div>
    );
  }

  return (
    <section className={`shrink-0 w-full sm:w-[380px] lg:w-[415px] xl:w-[435px] flex flex-col bg-[#0b0e16] border border-[#1a2133] border-t-2 ${accentClass} ${isDragOverlay ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-2xl shadow-cyan-500/40 opacity-95' : ''} rounded-sm overflow-hidden h-[calc(100vh-120px)] shadow-xl transition-all`}>
      {/* Stream Top Header with Telemetry Bar */}
      <header className="px-3.5 py-2.5 border-b border-[#182032] bg-[#0e121e] select-none">
        <div className="flex items-start justify-between gap-2">
          {/* Identity & Status */}
          <div className="min-w-0 flex-1">
            {/* Telemetry Index Bar */}
            <div className="flex items-center gap-2 mb-1 text-[10px] font-mono text-slate-400">
              <span className="text-cyan-400 font-bold tracking-tight">
                STREAM // {String(streamIndex + 1).padStart(2, '0')}
              </span>
              <span className="text-slate-700" aria-hidden="true">|</span>
              <span className="flex items-center gap-1 text-slate-400 tabular-nums">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-pulse" />
                <span>{formatNumber(stream.subscribers)} READERS</span>
              </span>
            </div>

            <h2 className="text-[15px] font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
              <span className="font-mono text-cyan-400 text-sm">r/</span>
              <span className="truncate">{stream.name}</span>
            </h2>
            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 leading-snug">
              {stream.tagline}
            </p>
          </div>

          {/* Stream Actions */}
          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            {/* Drag Handle */}
            {dragHandleProps && (
              <button
                type="button"
                {...dragHandleProps}
                className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-[#161c2e] rounded transition-colors cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 touch-none select-none"
                title="Drag to reorder stream lane (or use keyboard: Tab, Space, Arrow keys)"
                aria-label={`Drag stream r/${stream.name} to reorder`}
              >
                <GripVertical className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Refresh */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={stream.isLoading}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#161c2e] rounded transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh stream"
            >
              <RotateCcw
                className={`w-3.5 h-3.5 text-slate-400 ${stream.isLoading ? 'animate-spin text-cyan-400' : ''}`}
              />
            </button>

            {/* Collapse */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#161c2e] rounded transition-colors cursor-pointer"
              title="Collapse lane"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>

            {/* Stream Menu Popover */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-[#161c2e] rounded transition-colors cursor-pointer"
                title="Stream options"
                aria-expanded={isMenuOpen}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-[#101422] border border-[#232c42] rounded shadow-2xl py-1 z-50">
                  <div className="px-3 py-1 text-[10px] uppercase font-mono tracking-widest text-slate-400 border-b border-[#182032]">
                    STREAM CONTROLS
                  </div>

                  {/* Reordering */}
                  <div className="px-1 py-1 border-b border-[#182032]">
                    <div className="px-2 py-1 text-[10px] text-slate-400 font-mono">POSITION</div>
                    <div className="flex gap-1 px-2 pb-1">
                      <button
                        type="button"
                        onClick={() => {
                          onMoveLeft();
                          setIsMenuOpen(false);
                        }}
                        disabled={!canMoveLeft}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-[#161d2f] hover:bg-[#1d263d] disabled:opacity-30 disabled:pointer-events-none text-slate-300 rounded font-mono"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        <span>Left</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onMoveRight();
                          setIsMenuOpen(false);
                        }}
                        disabled={!canMoveRight}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-[#161d2f] hover:bg-[#1d263d] disabled:opacity-30 disabled:pointer-events-none text-slate-300 rounded font-mono"
                      >
                        <span>Right</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicate();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-[#161d2f] flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Duplicate Stream</span>
                  </button>

                  {/* State Simulation Demo */}
                  {onSimulateState && (
                    <div className="px-1 py-1 border-t border-[#182032]">
                      <div className="px-2 py-1 text-[10px] text-slate-400 font-mono">SIMULATE STATE</div>
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            onSimulateState('normal');
                            setIsMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 text-[11px] text-slate-300 hover:bg-[#161d2f] rounded font-mono"
                        >
                          ● Live Data
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSimulateState('empty');
                            setIsMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 text-[11px] text-amber-300 hover:bg-[#161d2f] rounded font-mono"
                        >
                          ○ Empty (No Signal)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSimulateState('error');
                            setIsMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 text-[11px] text-rose-300 hover:bg-[#161d2f] rounded font-mono"
                        >
                          ✕ Signal Lost (Error)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Remove stream */}
                  <div className="pt-1 border-t border-[#182032]">
                    <button
                      type="button"
                      onClick={() => {
                        onRemove();
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 font-mono"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Stream</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sorting Tabs - High Contrast Segmented Control */}
        <div className="mt-2 pt-2 border-t border-[#172033] flex items-center justify-between">
          <div className="flex items-center gap-0.5 bg-[#090c14] p-0.5 rounded border border-[#182135]">
            {sortTabs.map((tab) => {
              const isActive = stream.sort === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeSort(tab.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-mono uppercase tracking-wide rounded-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <span className="text-[10px] font-mono text-slate-400 tabular-nums">
            {stream.posts.length} TRANSMISSIONS
          </span>
        </div>

        {/* Top Time Range Selector (shown when Top is active) */}
        {stream.sort === 'top' && (
          <div className="mt-1.5 pt-1.5 border-t border-[#141b2c] flex items-center justify-between text-[10px] font-mono">
            <span className="text-cyan-400 font-bold">RANGE:</span>
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'day', label: 'Day' },
                  { id: 'week', label: 'Week' },
                  { id: 'month', label: 'Month' },
                  { id: 'year', label: 'Year' },
                  { id: 'all', label: 'All' },
                ] as { id: TimeRange; label: string }[]
              ).map((t) => {
                const isSelected = (stream.timeRange || 'day') === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChangeTimeRange && onChangeTimeRange(t.id)}
                    className={`px-1.5 py-0.5 rounded-xs transition-colors uppercase ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Stream Content Area */}
      <div className="flex-1 overflow-y-auto orbit-scroll bg-[#080a10]">
        {/* Radar Scanner Loading Skeleton */}
        {stream.isLoading && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between text-xs text-cyan-400 font-mono pb-2 border-b border-[#141b2a]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>RECEIVING PACKETS...</span>
              </div>
              <span className="text-slate-500 text-[10px]">SCAN // 42%</span>
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-3 border-b border-[#141b29] space-y-2.5 animate-pulse"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-[#172034] rounded w-16" />
                  <div className="h-2 bg-[#141b2b] rounded w-20" />
                </div>
                <div className="h-3.5 bg-[#172034] rounded w-11/12" />
                <div className="h-3.5 bg-[#172034] rounded w-3/4" />
                <div className="flex items-center gap-3 pt-1">
                  <div className="h-2.5 bg-[#141b2b] rounded w-12" />
                  <div className="h-2.5 bg-[#141b2b] rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Technical Error State: SIGNAL LOST */}
        {!stream.isLoading && stream.error && (
          <div className="p-6 text-center flex flex-col items-center justify-center h-full min-h-[320px]">
            <div className="w-12 h-12 rounded-sm bg-rose-950/40 border border-rose-800/60 flex items-center justify-center text-rose-400 mb-3.5">
              <WifiOff className="w-6 h-6" />
            </div>
            <div className="text-[11px] font-mono text-rose-400 uppercase tracking-widest font-semibold">
              TRANSMISSION TIMEOUT
            </div>
            <h3 className="text-base font-bold text-white tracking-tight mt-1 font-mono">
              SIGNAL LOST // 504
            </h3>
            <p className="text-xs text-slate-400 mt-2 max-w-[280px] leading-relaxed">
              Carrier drop detected on <span className="text-rose-300 font-mono font-medium">{stream.displayName}</span>. Subreddit API unresponsive.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={onRefresh}
                className="px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-rose-950/60 hover:bg-rose-900/70 border border-rose-700/60 rounded transition-colors cursor-pointer"
              >
                RE-ESTABLISH SIGNAL
              </button>
            </div>
          </div>
        )}

        {/* Technical Empty State: NO SIGNAL */}
        {!stream.isLoading && !stream.error && stream.posts.length === 0 && (
          <div className="p-6 text-center flex flex-col items-center justify-center h-full min-h-[320px]">
            <div className="w-12 h-12 rounded-sm bg-[#101524] border border-[#1d273f] flex items-center justify-center text-slate-400 mb-3.5">
              <Radio className="w-6 h-6 text-slate-500 animate-pulse" />
            </div>
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
              FREQUENCY IDLE
            </div>
            <h3 className="text-base font-bold text-white tracking-tight mt-1 font-mono">
              NO TRANSMISSIONS
            </h3>
            <p className="text-xs text-slate-400 mt-2 max-w-[280px] leading-relaxed">
              No matching posts found in this orbit channel for sort filter <span className="text-cyan-300 font-mono uppercase">[{stream.sort}]</span>.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-5 px-3.5 py-1.5 text-xs font-mono font-semibold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 rounded transition-colors cursor-pointer"
            >
              SCAN FEED AGAIN
            </button>
          </div>
        )}

        {/* Normal Populated Post Stream */}
        {!stream.isLoading && !stream.error && stream.posts.length > 0 && (
          <div>
            {stream.posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                density={density}
                onSelectPost={onSelectPost}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stream Footer with Telemetry Health */}
      <footer className="px-3.5 py-2 border-t border-[#161e30] bg-[#0a0d16] flex items-center justify-between text-[10.5px] text-slate-400 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>SYNCED LIVE</span>
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors cursor-pointer"
        >
          RE-SYNC
        </button>
      </footer>
    </section>
  );
};
