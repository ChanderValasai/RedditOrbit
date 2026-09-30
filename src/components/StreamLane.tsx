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
import { formatNumber, formatTimeAgo } from '../utils/formatters';

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
    { id: 'hot', label: 'Hot', icon: <Flame className="w-3 h-3" /> },
    { id: 'new', label: 'New', icon: <Clock className="w-3 h-3" /> },
    { id: 'top', label: 'Top', icon: <Award className="w-3 h-3" /> },
    { id: 'rising', label: 'Rising', icon: <TrendingUp className="w-3 h-3" /> },
  ];

  // Subtle top accent tint to differentiate streams (calm hairline)
  const streamAccents = [
    'border-t-cyan-500/70',
    'border-t-sky-500/70',
    'border-t-indigo-500/70',
    'border-t-teal-500/70',
    'border-t-slate-400/70',
  ];
  const accentClass = streamAccents[streamIndex % streamAccents.length];

  if (stream.isCollapsed) {
    return (
      <div
        className={`shrink-0 w-16 md:w-18 bg-[#0a0d16] border border-[#182133] border-t-2 ${accentClass} ${
          isDragOverlay ? 'ring-1 ring-cyan-400 border-cyan-400 shadow-xl' : ''
        } rounded-xs flex flex-col items-center py-3.5 justify-between select-none h-full max-h-[calc(100vh-125px)] transition-all`}
      >
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
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#141b2b] rounded transition-colors cursor-pointer"
            title="Expand stream lane"
          >
            <ChevronDown className="w-4 h-4 rotate-270" />
          </button>
          <span className="text-[10px] font-mono text-cyan-400 font-semibold">
            {String(streamIndex + 1).padStart(2, '0')}
          </span>
        </div>

        <div className="transform -rotate-90 origin-center whitespace-nowrap text-xs font-mono font-medium text-slate-300 tracking-wide">
          {stream.displayName}
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-400 tabular-nums">
            {stream.posts.length}P
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              stream.error ? 'bg-rose-400' : 'bg-emerald-400'
            }`}
          />
        </div>
      </div>
    );
  }

  return (
    <section
      className={`shrink-0 w-full sm:w-[380px] lg:w-[410px] xl:w-[430px] flex flex-col bg-[#090c15] border border-[#161f30] border-t-2 ${accentClass} ${
        isDragOverlay ? 'ring-1 ring-cyan-400/80 border-cyan-400 shadow-2xl opacity-95' : ''
      } rounded-xs overflow-hidden h-[calc(100vh-120px)] shadow-lg transition-all`}
    >
      {/* Stream Top Header */}
      <header className="px-3.5 py-2.5 border-b border-[#151d2d] bg-[#0c101a] select-none">
        <div className="flex items-start justify-between gap-2">
          {/* Identity & Technical Metadata */}
          <div className="min-w-0 flex-1">
            {/* Telemetry Index & Status line */}
            <div className="flex items-center gap-2 mb-1 text-[10.5px] font-mono text-slate-400">
              <span className="text-slate-300 font-semibold tracking-tight">
                FEED {String(streamIndex + 1).padStart(2, '0')}
              </span>
              <span className="text-slate-700" aria-hidden="true">·</span>
              <span className="flex items-center gap-1 text-slate-400 tabular-nums">
                <span
                  className={`w-1.5 h-1.5 rounded-full inline-block ${
                    stream.error
                      ? 'bg-rose-400'
                      : stream.isLoading
                      ? 'bg-cyan-400 animate-pulse'
                      : 'bg-emerald-400'
                  }`}
                />
                <span className="text-[10px]">
                  {stream.error ? 'DISCONNECTED' : stream.isLoading ? 'SYNCING' : 'LIVE'}
                </span>
              </span>
              <span className="text-slate-700" aria-hidden="true">·</span>
              <span className="text-slate-400 tabular-nums text-[10.5px]">
                {formatNumber(stream.subscribers)} readers
              </span>
            </div>

            <h2 className="text-[15px] font-bold text-slate-100 tracking-tight flex items-center gap-1 truncate">
              <span className="font-mono text-cyan-400/90 text-sm">r/</span>
              <span className="truncate">{stream.name}</span>
            </h2>
            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 leading-snug">
              {stream.tagline}
            </p>
          </div>

          {/* Stream Actions */}
          <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
            {/* Drag Handle */}
            {dragHandleProps && (
              <button
                type="button"
                {...dragHandleProps}
                className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-[#131b2c] rounded transition-colors cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 touch-none select-none"
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
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#131b2c] rounded transition-colors disabled:opacity-50 cursor-pointer"
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
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#131b2c] rounded transition-colors cursor-pointer"
              title="Collapse lane into compact pillar"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>

            {/* Stream Menu Popover */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-[#131b2c] rounded transition-colors cursor-pointer"
                title="Stream options"
                aria-expanded={isMenuOpen}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-[#0e1320] border border-[#212b40] rounded shadow-2xl py-1 z-50 divide-y divide-[#172033]">
                  <div className="px-3 py-1 text-[10px] uppercase font-mono tracking-widest text-slate-400">
                    STREAM OPTIONS
                  </div>

                  {/* Reordering */}
                  <div className="px-2 py-1.5">
                    <div className="text-[10px] text-slate-400 font-mono mb-1">POSITION</div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onMoveLeft();
                          setIsMenuOpen(false);
                        }}
                        disabled={!canMoveLeft}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-[#141b2a] hover:bg-[#1a2336] disabled:opacity-30 disabled:pointer-events-none text-slate-300 rounded font-mono"
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
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-[#141b2a] hover:bg-[#1a2336] disabled:opacity-30 disabled:pointer-events-none text-slate-300 rounded font-mono"
                      >
                        <span>Right</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Duplicate */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        onDuplicate();
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-[#141b2a] flex items-center gap-2 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Duplicate Stream</span>
                    </button>
                  </div>

                  {/* Simulation demo */}
                  {onSimulateState && (
                    <div className="px-2 py-1.5">
                      <div className="text-[10px] text-slate-400 font-mono mb-1">PREVIEW STATE</div>
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            onSimulateState('normal');
                            setIsMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 text-[11px] text-slate-300 hover:bg-[#141b2a] rounded font-mono"
                        >
                          ● Normal Feed
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSimulateState('empty');
                            setIsMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 text-[11px] text-amber-300 hover:bg-[#141b2a] rounded font-mono"
                        >
                          ○ Empty Feed
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSimulateState('error');
                            setIsMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 text-[11px] text-rose-300 hover:bg-[#141b2a] rounded font-mono"
                        >
                          ✕ Carrier Timeout
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Remove stream */}
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        onRemove();
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/40 rounded flex items-center gap-2 font-mono cursor-pointer"
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

        {/* Sorting Tabs - Clean Segmented Control */}
        <div className="mt-2 pt-2 border-t border-[#141b29] flex items-center justify-between">
          <div className="flex items-center gap-0.5 bg-[#080b13] p-0.5 rounded border border-[#161f30]">
            {sortTabs.map((tab) => {
              const isActive = stream.sort === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeSort(tab.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-mono tracking-tight rounded-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#151e30] text-cyan-300 font-semibold shadow-xs'
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
            {stream.posts.length} {stream.posts.length === 1 ? 'post' : 'posts'}
          </span>
        </div>

        {/* Top Time Range Selector */}
        {stream.sort === 'top' && (
          <div className="mt-1.5 pt-1.5 border-t border-[#141b29] flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-500 uppercase">TIME RANGE:</span>
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
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
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

      {/* Loading Hairline Indicator */}
      {stream.isLoading && (
        <div className="h-0.5 w-full bg-[#121927] overflow-hidden">
          <div className="h-full bg-cyan-400/80 w-1/3 animate-[scanline_2s_ease-in-out_infinite]" />
        </div>
      )}

      {/* Stream Content Body */}
      <div className="flex-1 overflow-y-auto orbit-scroll bg-[#070911]">
        {/* Loading Skeletons */}
        {stream.isLoading && stream.posts.length === 0 && (
          <div className="p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono pb-2 border-b border-[#141b29]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Connecting to r/{stream.name}...</span>
              </div>
              <span className="text-slate-500 text-[10px]">Buffered 0</span>
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 border-b border-[#121826] space-y-2 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-[#141b2b] rounded w-16" />
                  <div className="h-2 bg-[#111724] rounded w-20" />
                </div>
                <div className="h-3.5 bg-[#141b2b] rounded w-11/12" />
                <div className="h-3.5 bg-[#141b2b] rounded w-3/4" />
                <div className="flex items-center gap-3 pt-1">
                  <div className="h-2.5 bg-[#111724] rounded w-12" />
                  <div className="h-2.5 bg-[#111724] rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {stream.error && (
          <div className="p-6 text-center flex flex-col items-center justify-center h-full min-h-[300px]">
            <div className="w-10 h-10 rounded bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-400 mb-3">
              <WifiOff className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 tracking-tight font-sans">
              Unable to Load Stream
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 max-w-[260px] leading-relaxed">
              Connection to <span className="font-mono text-slate-300">r/{stream.name}</span> timed out. Reddit servers may be under heavy load.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-4 px-3 py-1.5 text-xs font-mono font-medium text-white bg-rose-950/60 hover:bg-rose-900/70 border border-rose-700/50 rounded transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Empty State */}
        {!stream.isLoading && !stream.error && stream.posts.length === 0 && (
          <div className="p-6 text-center flex flex-col items-center justify-center h-full min-h-[300px]">
            <div className="w-10 h-10 rounded bg-[#0d121e] border border-[#1a2337] flex items-center justify-center text-slate-400 mb-3">
              <Radio className="w-5 h-5 text-slate-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 tracking-tight font-sans">
              No Posts Found
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 max-w-[260px] leading-relaxed">
              No entries currently match the <span className="font-mono uppercase text-cyan-300">[{stream.sort}]</span> filter in r/{stream.name}.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-4 px-3 py-1.5 text-xs font-mono font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/50 rounded transition-colors cursor-pointer"
            >
              Refresh Stream
            </button>
          </div>
        )}

        {/* Populated Post Stream */}
        {!stream.error && stream.posts.length > 0 && (
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

      {/* Stream Footer */}
      <footer className="px-3.5 py-1.5 border-t border-[#131a29] bg-[#090c14] flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/90" />
          <span>Synced live</span>
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
        >
          Refresh
        </button>
      </footer>
    </section>
  );
};
