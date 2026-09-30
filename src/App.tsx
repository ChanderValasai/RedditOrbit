/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  INITIAL_STREAMS,
  PRESET_DASHBOARDS,
} from './data/mockStreams';
import {
  SubredditStream,
  RedditPost,
  SortOption,
  TimeRange,
  StreamDensity,
  UserDashboard,
} from './types/orbit';
import { Header } from './components/Header';
import { DashboardStatus } from './components/DashboardStatus';
import { StreamLane } from './components/StreamLane';
import { SortableStreamLane } from './components/SortableStreamLane';
import { AddStreamModal } from './components/AddStreamModal';
import { PostDetailModal } from './components/PostDetailModal';
import { SearchModal } from './components/SearchModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { SyncOrbitModal } from './components/SyncOrbitModal';
import { DashboardManagerModal } from './components/DashboardManagerModal';
import {
  dashboardSyncService,
  SyncAnalysisResult,
  SyncDecision,
} from './services/dashboardSyncService';
import { dashboardManagerService } from './services/dashboardManagerService';
import { useAuth } from './context/AuthContext';
import { Plus, Radio } from 'lucide-react';
import { redditService } from './services/redditService';
import { NormalizedSubreddit } from './types/reddit';

export default function App() {
  const { user, token, isAuthenticated, loginEvent, clearLoginEvent } = useAuth();

  // Multi-Dashboard State
  const [dashboards, setDashboards] = useState<UserDashboard[]>([]);
  const [currentDashboardId, setCurrentDashboardId] = useState<string>('core-engineering');
  const [isDashboardManagerOpen, setIsDashboardManagerOpen] = useState(false);

  // Active Streams State
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

  const [density, setDensity] = useState<StreamDensity>('editorial');
  const [defaultSort, setDefaultSort] = useState<SortOption>('hot');

  // Modals & Synchronization state
  const [isAddStreamOpen, setIsAddStreamOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null);

  // Drag and drop state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

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
  const streamsRef = useRef<SubredditStream[]>(streams);

  useEffect(() => {
    streamsRef.current = streams;
  }, [streams]);

  // Configure DnD Sensors for Mouse, Touch, and Keyboard navigation
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px drag intent prevents intercepting button clicks
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 150ms long press allows fluid touch scrolling
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load Dashboards on initial mount and when authentication changes
  useEffect(() => {
    let isMounted = true;
    async function loadDashboards() {
      const list = await dashboardManagerService.listDashboards(token);
      if (isMounted) {
        setDashboards(list);
        const storedActiveId = dashboardManagerService.getActiveDashboardId();
        const found = list.find((d) => d.id === storedActiveId) || list[0];
        if (found) {
          setCurrentDashboardId(found.id);
          if (found.streams && found.streams.length > 0) {
            setStreams(found.streams);
            found.streams.forEach((s) => {
              fetchStreamData(s.id, s.name, s.sort, s.timeRange || 'day');
            });
          }
        }
      }
    }
    loadDashboards();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Reset cloud dashboard tracking on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setActiveCloudDashboardId(null);
    }
  }, [isAuthenticated]);

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

  // When an anonymous user logs in: analyze sync, prompt conflict resolution if detected
  useEffect(() => {
    if (loginEvent && loginEvent.token) {
      const handleLoginSync = async () => {
        try {
          const localStreams =
            streamsRef.current.length > 0
              ? streamsRef.current
              : dashboardSyncService.getLocalStreams();
          const analysis = await dashboardSyncService.analyzeSync(localStreams, loginEvent.token);
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
            } else if (localStreams.length > 0) {
              const dashId = await dashboardSyncService.saveCloudDashboard(
                analysis.cloudDashboardId,
                analysis.cloudDashboardName,
                localStreams,
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
  }, [loginEvent, clearLoginEvent]);

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

    // Refresh dashboards list
    const updatedList = await dashboardManagerService.listDashboards(token);
    setDashboards(updatedList);

    // Fetch live posts for streams that need them
    finalStreams.forEach((s) => {
      if (!s.posts || s.posts.length === 0) {
        fetchStreamData(s.id, s.name, s.sort, s.timeRange || 'day');
      }
    });
  };

  // Drag and Drop Handlers using dnd-kit
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = streams.findIndex((s) => s.id === active.id);
    const newIndex = streams.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newStreams = arrayMove(streams, oldIndex, newIndex);
    setStreams(newStreams);

    // Persist stream ordering immediately to localStorage and MongoDB
    dashboardSyncService.saveLocalStreams(newStreams);
    await dashboardManagerService.updateDashboard(
      currentDashboardId,
      { streams: newStreams },
      token
    );

    setDashboards((prev) =>
      prev.map((d) => (d.id === currentDashboardId ? { ...d, streams: newStreams } : d))
    );
  };

  // Collapse / Expand stream with immediate persistence
  const handleToggleCollapse = async (streamId: string) => {
    const newStreams = streams.map((s) =>
      s.id === streamId ? { ...s, isCollapsed: !s.isCollapsed } : s
    );
    setStreams(newStreams);

    // Persist collapse state immediately
    dashboardSyncService.saveLocalStreams(newStreams);
    await dashboardManagerService.updateDashboard(
      currentDashboardId,
      { streams: newStreams },
      token
    );

    setDashboards((prev) =>
      prev.map((d) => (d.id === currentDashboardId ? { ...d, streams: newStreams } : d))
    );
  };

  // Switch between dashboards
  const handleSelectDashboard = async (dashboardId: string) => {
    setCurrentDashboardId(dashboardId);
    dashboardManagerService.setActiveDashboardId(dashboardId);

    const target = dashboards.find((d) => d.id === dashboardId);
    if (target && target.streams && target.streams.length > 0) {
      setStreams(target.streams);
      target.streams.forEach((s) => {
        fetchStreamData(s.id, s.name, s.sort, s.timeRange || 'day');
      });
    } else {
      // Check preset
      const preset = PRESET_DASHBOARDS.find((p) => p.id === dashboardId);
      if (preset) {
        const matched = INITIAL_STREAMS.filter((s) => preset.streamNames.includes(s.name));
        const newStreamsList = matched.length > 0 ? matched : INITIAL_STREAMS;
        setStreams(newStreamsList);
        newStreamsList.forEach((s) => {
          fetchStreamData(s.id, s.name, s.sort, s.timeRange || 'day');
        });
      }
    }
  };

  // Create multiple dashboards
  const handleCreateDashboard = async (
    name: string,
    templateType: 'empty' | 'current' | 'preset'
  ) => {
    let startingStreams: SubredditStream[] = [];
    if (templateType === 'current') {
      startingStreams = [...streams];
    } else if (templateType === 'preset') {
      startingStreams = INITIAL_STREAMS.slice(0, 3);
    }

    const created = await dashboardManagerService.createDashboard(name, startingStreams, token);
    setDashboards((prev) => [...prev, created]);
    handleSelectDashboard(created.id);
  };

  // Rename dashboards
  const handleRenameDashboard = async (dashboardId: string, newName: string) => {
    const updated = await dashboardManagerService.updateDashboard(
      dashboardId,
      { name: newName },
      token
    );
    setDashboards((prev) =>
      prev.map((d) => (d.id === dashboardId ? { ...d, name: updated.name } : d))
    );
  };

  // Delete dashboards
  const handleDeleteDashboard = async (dashboardId: string) => {
    await dashboardManagerService.deleteDashboard(dashboardId, token);
    const remaining = dashboards.filter((d) => d.id !== dashboardId);
    setDashboards(remaining);

    // If active dashboard was deleted, switch to the next available
    if (currentDashboardId === dashboardId) {
      const nextDash = remaining[0];
      if (nextDash) {
        handleSelectDashboard(nextDash.id);
      }
    }
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

  // Global keyboard shortcuts (Cmd+K / Ctrl+K for search, Cmd+M / Ctrl+M for dashboard manager)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        setIsDashboardManagerOpen(true);
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

  // Reordering streams via step buttons (accessible alternative to drag-and-drop)
  const handleMoveStream = async (index: number, direction: 'left' | 'right') => {
    const newStreams = [...streams];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newStreams.length) return;

    const temp = newStreams[index];
    newStreams[index] = newStreams[targetIndex];
    newStreams[targetIndex] = temp;
    setStreams(newStreams);

    // Persist reordering
    dashboardSyncService.saveLocalStreams(newStreams);
    await dashboardManagerService.updateDashboard(
      currentDashboardId,
      { streams: newStreams },
      token
    );
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
  const handleChangeSort = async (streamId: string, sort: SortOption) => {
    const newStreams = streams.map((s) => (s.id === streamId ? { ...s, sort } : s));
    setStreams(newStreams);
    fetchStreamData(streamId, newStreams.find((s) => s.id === streamId)?.name || '', sort, 'day');

    await dashboardManagerService.updateDashboard(
      currentDashboardId,
      { streams: newStreams },
      token
    );
  };

  // Change Top time range (day, week, month, year, all)
  const handleChangeTimeRange = async (streamId: string, timeRange: TimeRange) => {
    const newStreams = streams.map((s) => (s.id === streamId ? { ...s, timeRange } : s));
    setStreams(newStreams);
    fetchStreamData(streamId, newStreams.find((s) => s.id === streamId)?.name || '', 'top', timeRange);

    await dashboardManagerService.updateDashboard(
      currentDashboardId,
      { streams: newStreams },
      token
    );
  };

  // Remove stream
  const handleRemoveStream = async (streamId: string) => {
    const newStreams = streams.filter((s) => s.id !== streamId);
    setStreams(newStreams);

    dashboardSyncService.saveLocalStreams(newStreams);
    await dashboardManagerService.updateDashboard(
      currentDashboardId,
      { streams: newStreams },
      token
    );
  };

  // Duplicate stream
  const handleDuplicateStream = async (stream: SubredditStream) => {
    const duplicated: SubredditStream = {
      ...stream,
      id: `stream-${stream.name}-${Date.now()}`,
      displayName: `${stream.displayName} (Copy)`,
    };
    const newStreams = [...streams, duplicated];
    setStreams(newStreams);

    dashboardSyncService.saveLocalStreams(newStreams);
    await dashboardManagerService.updateDashboard(
      currentDashboardId,
      { streams: newStreams },
      token
    );
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
  const handleAddStream = async (name: string, info?: NormalizedSubreddit) => {
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

    const newStreams = [...streams, newStream];
    setStreams(newStreams);

    dashboardSyncService.saveLocalStreams(newStreams);
    await dashboardManagerService.updateDashboard(
      currentDashboardId,
      { streams: newStreams },
      token
    );

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

  const activeDragStream = activeDragId ? streams.find((s) => s.id === activeDragId) : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-[#e2e8f0] command-grid-bg selection:bg-cyan-500/25 selection:text-cyan-200">
      {/* 1. Header with workspace manager and switcher */}
      <Header
        currentDashboardId={currentDashboardId}
        dashboards={dashboards}
        onSelectDashboard={handleSelectDashboard}
        onOpenDashboardManager={() => setIsDashboardManagerOpen(true)}
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
        {streams.map((stream) => (
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

      {/* 4. Multi-Stream Canvas / Horizontal Lane Rail with dnd-kit Drag-and-Drop */}
      <main
        ref={streamsContainerRef}
        className="flex-1 w-full overflow-x-auto overflow-y-hidden p-3.5 sm:p-5 orbit-scroll"
      >
        {/* Technical Information Stream Rail */}
        {streams.length > 0 && (
          <div className="hidden lg:flex items-center justify-between mb-3 px-1 text-[11px] font-mono text-slate-500 select-none border-b border-[#141c2c] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-carrier" />
              <span className="text-slate-200 font-semibold tracking-wide text-xs">
                INFORMATION RAIL
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-slate-400">
                {streams.length} {streams.length === 1 ? 'feed connected' : 'feeds connected'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[10.5px]">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="text-slate-500">Reorder:</span>
                <span className="text-slate-300">Grip handle / Tab+Space</span>
              </span>
              <span className="text-slate-700">·</span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="text-slate-500">Mode:</span>
                <span className="capitalize text-cyan-300 font-medium">{density}</span>
              </span>
            </div>
          </div>
        )}

        {streams.length === 0 ? (
          <div className="h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center p-8 border border-dashed border-[#1c263c] rounded-lg bg-[#080c16]/50 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 animate-pulse">
              <Radio className="w-7 h-7" />
            </div>
            <h3 className="text-base font-mono font-bold text-slate-200 uppercase tracking-wider">
              No Subreddit Frequencies Configured
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mt-2 font-mono leading-relaxed">
              Your command center has no active observation streams in this workspace. Add a community or load an orbital preset to begin telemetry monitoring.
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={streams.map((s) => s.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="h-full min-h-[calc(100vh-140px)] flex">
                {/* Horizontal Stream Rail with Sortable Lanes */}
                <div className="flex gap-4 sm:gap-5 w-full items-stretch">
                  {streams.map((stream, index) => {
                    const isMobileVisible = stream.id === activeMobileStreamId;

                    return (
                      <SortableStreamLane
                        key={stream.id}
                        stream={stream}
                        density={density}
                        canMoveLeft={index > 0}
                        canMoveRight={index < streams.length - 1}
                        onMoveLeft={() => handleMoveStream(index, 'left')}
                        onMoveRight={() => handleMoveStream(index, 'right')}
                        onRemove={() => handleRemoveStream(stream.id)}
                        onDuplicate={() => handleDuplicateStream(stream)}
                        onRefresh={() => handleRefreshStream(stream.id)}
                        onChangeSort={(sort) => handleChangeSort(stream.id, sort)}
                        onChangeTimeRange={(time) => handleChangeTimeRange(stream.id, time)}
                        onToggleCollapse={() => handleToggleCollapse(stream.id)}
                        onSelectPost={(post) => setSelectedPost(post)}
                        onSimulateState={(type) => handleSimulateState(stream.id, type)}
                        streamIndex={index}
                        isMobileVisible={isMobileVisible}
                      />
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
            </SortableContext>

            {/* Tactical High-Tech Drag Overlay */}
            <DragOverlay dropAnimation={null}>
              {activeDragStream ? (
                <div className="h-[calc(100vh-120px)] flex pointer-events-none">
                  <StreamLane
                    stream={activeDragStream}
                    density={density}
                    canMoveLeft={false}
                    canMoveRight={false}
                    onMoveLeft={() => {}}
                    onMoveRight={() => {}}
                    onRemove={() => {}}
                    onDuplicate={() => {}}
                    onRefresh={() => {}}
                    onChangeSort={() => {}}
                    onToggleCollapse={() => {}}
                    onSelectPost={() => {}}
                    isDragOverlay={true}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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

      {/* 7. Multiple Dashboards Manager Modal */}
      <DashboardManagerModal
        isOpen={isDashboardManagerOpen}
        onClose={() => setIsDashboardManagerOpen(false)}
        dashboards={dashboards}
        activeDashboardId={currentDashboardId}
        onSelectDashboard={handleSelectDashboard}
        onCreateDashboard={handleCreateDashboard}
        onRenameDashboard={handleRenameDashboard}
        onDeleteDashboard={handleDeleteDashboard}
        currentStreamCount={streams.length}
      />
    </div>
  );
}
