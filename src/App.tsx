/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  INITIAL_STREAMS,
  PRESET_DASHBOARDS,
} from './data/mockStreams';
import { SubredditStream, RedditPost, SortOption, TimeRange, StreamDensity } from './types/orbit';
import { Header } from './components/Header';
import { DashboardStatus } from './components/DashboardStatus';
import { StreamLane } from './components/StreamLane';
import { AddStreamModal } from './components/AddStreamModal';
import { PostDetailModal } from './components/PostDetailModal';
import { SearchModal } from './components/SearchModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { SyncOrbitModal } from './components/SyncOrbitModal';
import {
  dashboardSyncService,
  SyncAnalysisResult,
  SyncDecision,
} from './services/dashboardSyncService';
import { useAuth } from './context/AuthContext';
import { Plus, Radio, ArrowLeft, ArrowRight } from 'lucide-react';
import { redditService } from './services/redditService';
import { NormalizedSubreddit } from './types/reddit';

export default function App() {
  const { user, token, isAuthenticated, loginEvent, clearLoginEvent } = useAuth();

  const [streams, setStreams] = useState<SubredditStream[]>(() => {
    const saved = localStorage.getItem('reddit_orbit_streams');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_STREAMS;
  });

  const [currentDashboardId, setCurrentDashboardId] = useState<string>('core-engineering');
  const [density, setDensity] = useState<StreamDensity>('editorial');
  const [defaultSort, setDefaultSort] = useState<SortOption>('hot');

  // Modals & Synchronization state
  const [isAddStreamOpen, setIsAddStreamOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null);

  // Sync state
  const [activeCloudDashboardId, setActiveCloudDashboardId] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [pendingSyncAnalysis, setPendingSyncAnalysis] = useState<SyncAnalysisResult | null>(null);

  // Status & mobile navigation
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [activeMobileStreamId, setActiveMobileStreamId] = useState<string>(
    INITIAL_STREAMS[0]?.id || ''
  );

  const streamsContainerRef = useRef<HTMLDivElement>(null);

  // Core Data Fetching via clean redditService abstraction
  const fetchStreamData = async (
    streamId: string,
    subName: string,
    sort: SortOption = 'hot',
    timeRange: TimeRange = 'day'
  ) => {
    setStreams((prev) =>
      prev.map((s) => (s.id === streamId ? { ...s, isLoading: true, error: null } : s))
    );

    try {
      const result = await redditService.getSubredditPosts(subName, {
        sort,
        timeRange,
        limit: 25,
      });

      setStreams((prev) =>
        prev.map((s) => {
          if (s.id !== streamId) return s;
          return {
            ...s,
            sort,
            timeRange,
            posts: result.posts,
            afterCursor: result.pagination.after,
            isLoading: false,
            error: null,
            lastSynced: Math.floor(Date.now() / 1000),
          };
        })
      );
    } catch (err: any) {
      setStreams((prev) =>
        prev.map((s) => {
          if (s.id !== streamId) return s;
          return {
            ...s,
            isLoading: false,
            error: err.message || 'Signal lost during transmission',
          };
        })
      );
    }
  };

  // Initial Fetch on load for all active streams
  useEffect(() => {
    streams.forEach((s) => {
      fetchStreamData(s.id, s.name, s.sort, s.timeRange || 'day');
    });
  }, []);

  // Sync to localStorage for anonymous session resilience
  useEffect(() => {
    localStorage.setItem('reddit_orbit_streams', JSON.stringify(streams));
  }, [streams]);

  // When an anonymous user logs in or registers: detect local config, fetch cloud, detect conflicts, prompt decision
  useEffect(() => {
    if (loginEvent && loginEvent.token) {
      const handleLoginSync = async () => {
        try {
          const analysis = await dashboardSyncService.analyzeSync(streams, loginEvent.token);
          if (analysis.hasConflict) {
            setPendingSyncAnalysis(analysis);
            setIsSyncModalOpen(true);
          } else {
            // No conflict: link cloud dashboard and sync seamlessly
            if (analysis.cloudStreams.length > 0) {
              setStreams(analysis.cloudStreams);
              setActiveCloudDashboardId(analysis.cloudDashboardId);
              analysis.cloudStreams.forEach((s) => {
                fetchStreamData(s.id, s.name, s.sort, s.timeRange || 'day');
              });
            } else if (streams.length > 0) {
              const dashId = await dashboardSyncService.saveCloudDashboard(
                analysis.cloudDashboardId,
                analysis.cloudDashboardName,
                streams,
                loginEvent.token
              );
              setActiveCloudDashboardId(dashId);
            }
          }
        } catch (err: any) {
          console.warn('[SYNC] Error during login sync analysis:', err.message);
        } finally {
          clearLoginEvent();
        }
      };

      handleLoginSync();
    }
  }, [loginEvent, streams, clearLoginEvent]);

  // Handle user decision from SyncOrbitModal
  const handleResolveSync = async (decision: SyncDecision) => {
    if (!pendingSyncAnalysis || !token) return;
    const { finalStreams, dashboardId } = await dashboardSyncService.resolveSync(
      decision,
      pendingSyncAnalysis,
      token
    );
    setActiveCloudDashboardId(dashboardId);
    setStreams(finalStreams);
    setIsSyncModalOpen(false);
    setPendingSyncAnalysis(null);

    // Fetch live posts for streams that need them
    finalStreams.forEach((s) => {
      if (!s.posts || s.posts.length === 0) {
        fetchStreamData(s.id, s.name, s.sort, s.timeRange || 'day');
      }
    });
  };

  // Manual sync trigger available in UI
  const handleManualSyncCheck = async () => {
    if (!token) return;
    try {
      const analysis = await dashboardSyncService.analyzeSync(streams, token);
      setPendingSyncAnalysis(analysis);
      setIsSyncModalOpen(true);
    } catch (err: any) {
      console.warn('[SYNC] Manual sync check error:', err.message);
    }
  };

  // Auto-persist changes to MongoDB Atlas for authenticated users
  useEffect(() => {
    if (isAuthenticated && token && activeCloudDashboardId) {
      const timer = setTimeout(() => {
        dashboardSyncService
          .saveCloudDashboard(activeCloudDashboardId, 'My Orbital Deck', streams, token)
          .catch((err) => console.warn('[SYNC] Auto-save error:', err.message));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [streams, isAuthenticated, token, activeCloudDashboardId]);

  // Global keyboard shortcuts (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update active mobile stream if current one gets removed
  useEffect(() => {
    if (!streams.some((s) => s.id === activeMobileStreamId) && streams.length > 0) {
      setActiveMobileStreamId(streams[0].id);
    }
  }, [streams, activeMobileStreamId]);

  // Handle Preset Switching
  const handleSelectDashboard = (presetId: string) => {
    setCurrentDashboardId(presetId);
    const preset = PRESET_DASHBOARDS.find((p) => p.id === presetId);
    if (!preset) return;

    // Filter or re-populate matching streams
    const matched = INITIAL_STREAMS.filter((s) => preset.streamNames.includes(s.name));
    const newStreamsList = matched.length > 0 ? matched : INITIAL_STREAMS;
    setStreams(newStreamsList);

    // Fetch live posts for newly selected preset streams
    newStreamsList.forEach((s) => {
      fetchStreamData(s.id, s.name, s.sort, s.timeRange || 'day');
    });
  };

  // Reordering streams
  const handleMoveStream = (index: number, direction: 'left' | 'right') => {
    const newStreams = [...streams];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newStreams.length) return;

    const temp = newStreams[index];
    newStreams[index] = newStreams[targetIndex];
    newStreams[targetIndex] = temp;
    setStreams(newStreams);
  };

  // Refresh single stream
  const handleRefreshStream = (streamId: string) => {
    const stream = streams.find((s) => s.id === streamId);
    if (!stream) return;
    fetchStreamData(stream.id, stream.name, stream.sort, stream.timeRange || 'day');
  };

  // Refresh all streams
  const handleRefreshAll = async () => {
    setIsRefreshingAll(true);
    await Promise.all(
      streams.map((s) => fetchStreamData(s.id, s.name, s.sort, s.timeRange || 'day'))
    );
    setIsRefreshingAll(false);
  };

  // Change stream sort (Hot, New, Top, Rising)
  const handleChangeSort = (streamId: string, sort: SortOption) => {
    const stream = streams.find((s) => s.id === streamId);
    if (!stream) return;
    fetchStreamData(streamId, stream.name, sort, stream.timeRange || 'day');
  };

  // Change Top time range (day, week, month, year, all)
  const handleChangeTimeRange = (streamId: string, timeRange: TimeRange) => {
    const stream = streams.find((s) => s.id === streamId);
    if (!stream) return;
    fetchStreamData(streamId, stream.name, 'top', timeRange);
  };

  // Toggle Collapse
  const handleToggleCollapse = (streamId: string) => {
    setStreams((prev) =>
      prev.map((s) => (s.id === streamId ? { ...s, isCollapsed: !s.isCollapsed } : s))
    );
  };

  // Remove stream
  const handleRemoveStream = (streamId: string) => {
    setStreams((prev) => prev.filter((s) => s.id !== streamId));
  };

  // Duplicate stream
  const handleDuplicateStream = (stream: SubredditStream) => {
    const duplicated: SubredditStream = {
      ...stream,
      id: `stream-${stream.name}-${Date.now()}`,
      displayName: `${stream.displayName} (Copy)`,
    };
    setStreams((prev) => [...prev, duplicated]);
    fetchStreamData(duplicated.id, stream.name, stream.sort, stream.timeRange || 'day');
  };

  // State Simulation Demo (Empty, Error, Normal)
  const handleSimulateState = (streamId: string, type: 'normal' | 'empty' | 'error') => {
    setStreams((prev) =>
      prev.map((s) => {
        if (s.id !== streamId) return s;
        if (type === 'empty') {
          return { ...s, error: null, posts: [] };
        }
        if (type === 'error') {
          return { ...s, error: 'Carrier drop: feed timeout (504)', posts: [] };
        }
        return s;
      })
    );
    if (type === 'normal') {
      const stream = streams.find((s) => s.id === streamId);
      if (stream) {
        fetchStreamData(streamId, stream.name, stream.sort, stream.timeRange || 'day');
      }
    }
  };

  // Add new stream (connected to real reddit data)
  const handleAddStream = (name: string, info?: NormalizedSubreddit) => {
    const now = Math.floor(Date.now() / 1000);
    const newStreamId = `stream-${name}-${Date.now()}`;

    const newStream: SubredditStream = {
      id: newStreamId,
      name,
      displayName: info?.displayName || `r/${name}`,
      tagline: info?.title || `Subreddit stream for r/${name}`,
      subscribers: info?.subscribers || 0,
      activeUsers: info?.activeUsers || 0,
      avatarUrl: info?.iconImg,
      sort: 'hot',
      timeRange: 'day',
      postLimit: 25,
      posts: [],
      isCollapsed: false,
      isLoading: true,
      error: null,
      lastSynced: now,
    };

    setStreams((prev) => [...prev, newStream]);
    fetchStreamData(newStreamId, name, 'hot', 'day');
  };

  // Jump to stream from search modal
  const handleJumpToStream = (streamId: string) => {
    setActiveMobileStreamId(streamId);
    const element = document.getElementById(`stream-lane-${streamId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', inline: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-[#e2e8f0] command-grid-bg selection:bg-cyan-500/25 selection:text-cyan-200">
      {/* 1. Header with sync trigger */}
      <Header
        currentDashboardId={currentDashboardId}
        onSelectDashboard={handleSelectDashboard}
        onOpenAddStream={() => setIsAddStreamOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        density={density}
        onToggleDensity={() => setDensity(density === 'compact' ? 'editorial' : 'compact')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onTriggerSync={handleManualSyncCheck}
      />

      {/* 2. Dashboard Status Area */}
      <DashboardStatus
        streams={streams}
        onRefreshAll={handleRefreshAll}
        onOpenAddStream={() => setIsAddStreamOpen(true)}
        isRefreshingAll={isRefreshingAll}
      />

      {/* 3. Mobile Stream Tab Switcher (< 1024px) */}
      <div className="lg:hidden px-3.5 py-2 border-b border-[#161e30] bg-[#090d16] flex items-center gap-1.5 overflow-x-auto orbit-scroll">
        <span className="text-[10px] uppercase font-mono text-cyan-400 font-bold shrink-0">
          ORBIT:
        </span>
        {streams.map((stream, idx) => (
          <button
            key={stream.id}
            type="button"
            onClick={() => setActiveMobileStreamId(stream.id)}
            className={`px-2.5 py-1 text-xs font-mono rounded whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeMobileStreamId === stream.id
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200 bg-[#0e1322] border border-[#1b253b]'
            }`}
          >
            <span>{stream.displayName}</span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({stream.posts ? stream.posts.length : 0})
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsAddStreamOpen(true)}
          className="px-2 py-1 text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 rounded hover:bg-cyan-900/40 flex items-center gap-1 shrink-0"
        >
          <Plus className="w-3 h-3" />
          <span>Add</span>
        </button>
      </div>

      {/* 4. Multi-Stream Canvas / Horizontal Lane Rail */}
      <main
        ref={streamsContainerRef}
        className="flex-1 w-full overflow-x-auto overflow-y-hidden p-3.5 sm:p-5 orbit-scroll"
      >
        {streams.length === 0 ? (
          <div className="h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center p-8 border border-dashed border-[#1c263c] rounded-lg bg-[#080c16]/50 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 animate-pulse">
              <Radio className="w-7 h-7" />
            </div>
            <h3 className="text-base font-mono font-bold text-slate-200 uppercase tracking-wider">
              No Subreddit Frequencies Configured
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mt-2 font-mono leading-relaxed">
              Your command center has no active observation streams. Add a community or load an
              orbital preset to begin telemetry monitoring.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsAddStreamOpen(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold rounded transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/40"
              >
                <Plus className="w-4 h-4" />
                <span>+ ADD FIRST STREAM</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectDashboard('core-engineering')}
                className="px-4 py-2 bg-[#121929] hover:bg-[#182338] border border-[#212f4c] text-cyan-300 text-xs font-mono rounded transition-colors cursor-pointer"
              >
                Load Core Engineering
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[calc(100vh-140px)] flex">
            {/* Desktop: Horizontal Lane Rail | Mobile: Selected Stream Only */}
            <div className="flex gap-4 sm:gap-5 w-full items-stretch">
              {streams.map((stream, index) => {
                const isMobileVisible = stream.id === activeMobileStreamId;

                return (
                  <div
                    key={stream.id}
                    id={`stream-lane-${stream.id}`}
                    className={`h-[calc(100vh-120px)] transition-all duration-200 ${
                      isMobileVisible ? 'flex flex-1 lg:flex-none' : 'hidden lg:flex'
                    }`}
                  >
                    <StreamLane
                      stream={stream}
                      density={density}
                      onRefresh={() => handleRefreshStream(stream.id)}
                      onChangeSort={(sort) => handleChangeSort(stream.id, sort)}
                      onChangeTimeRange={(time) => handleChangeTimeRange(stream.id, time)}
                      onToggleCollapse={() => handleToggleCollapse(stream.id)}
                      onMoveLeft={() => handleMoveStream(index, 'left')}
                      onMoveRight={() => handleMoveStream(index, 'right')}
                      onRemove={() => handleRemoveStream(stream.id)}
                      onDuplicate={() => handleDuplicateStream(stream)}
                      onSelectPost={(post) => setSelectedPost(post)}
                      onSimulateState={(type) => handleSimulateState(stream.id, type)}
                      canMoveLeft={index > 0}
                      canMoveRight={index < streams.length - 1}
                    />
                  </div>
                );
              })}

              {/* Add Stream Column Placeholder at End of Lanes */}
              <div className="hidden lg:flex shrink-0 w-64 h-[calc(100vh-120px)] rounded-sm border border-dashed border-[#1a2336] hover:border-cyan-500/50 bg-[#090c14]/40 hover:bg-[#0c101c] flex-col items-center justify-center p-6 text-center transition-colors group cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => setIsAddStreamOpen(true)}
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                >
                  <div className="w-11 h-11 rounded bg-[#101524] group-hover:bg-cyan-950/60 border border-[#1f283c] group-hover:border-cyan-500/50 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 mb-3 transition-colors">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono uppercase tracking-widest font-bold text-slate-300 group-hover:text-white">
                    + NEW ORBIT
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 max-w-[170px] leading-relaxed">
                    Connect additional subreddit frequencies to your workspace.
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 5. Modals & Drawers */}
      <AddStreamModal
        isOpen={isAddStreamOpen}
        onClose={() => setIsAddStreamOpen(false)}
        onAddStream={handleAddStream}
        existingStreamNames={streams.map((s) => s.name.toLowerCase())}
      />

      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        streams={streams}
        onSelectPost={(post) => setSelectedPost(post)}
        onJumpToStream={handleJumpToStream}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        density={density}
        onChangeDensity={(d) => setDensity(d)}
        defaultSort={defaultSort}
        onChangeDefaultSort={(s) => setDefaultSort(s)}
      />

      <AuthModal />

      {/* 6. Anonymous to Authenticated Synchronization Modal */}
      <SyncOrbitModal
        isOpen={isSyncModalOpen}
        analysis={pendingSyncAnalysis}
        onResolve={handleResolveSync}
      />
    </div>
  );
}
