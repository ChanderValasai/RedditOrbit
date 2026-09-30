/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  INITIAL_STREAMS,
  PRESET_DASHBOARDS,
  MOCK_POSTS_PROGRAMMING,
  MOCK_POSTS_JAVASCRIPT,
  MOCK_POSTS_WEBDEV,
  MOCK_POSTS_ML,
} from './data/mockStreams';
import { SubredditStream, RedditPost, SortOption, StreamDensity } from './types/orbit';
import { Header } from './components/Header';
import { DashboardStatus } from './components/DashboardStatus';
import { StreamLane } from './components/StreamLane';
import { AddStreamModal } from './components/AddStreamModal';
import { PostDetailModal } from './components/PostDetailModal';
import { SearchModal } from './components/SearchModal';
import { SettingsModal } from './components/SettingsModal';
import { Plus, Radio, ArrowLeft, ArrowRight } from 'lucide-react';

export default function App() {
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

  // Modals
  const [isAddStreamOpen, setIsAddStreamOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null);

  // Status & mobile navigation
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [activeMobileStreamId, setActiveMobileStreamId] = useState<string>(
    INITIAL_STREAMS[0]?.id || ''
  );

  const streamsContainerRef = useRef<HTMLDivElement>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('reddit_orbit_streams', JSON.stringify(streams));
  }, [streams]);

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
    setStreams(matched.length > 0 ? matched : INITIAL_STREAMS);
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
    setStreams((prev) =>
      prev.map((s) => (s.id === streamId ? { ...s, isLoading: true, error: null } : s))
    );

    setTimeout(() => {
      setStreams((prev) =>
        prev.map((s) => {
          if (s.id !== streamId) return s;
          return {
            ...s,
            isLoading: false,
            lastSynced: Math.floor(Date.now() / 1000),
          };
        })
      );
    }, 550);
  };

  // Refresh all streams
  const handleRefreshAll = () => {
    setIsRefreshingAll(true);
    setStreams((prev) => prev.map((s) => ({ ...s, isLoading: true, error: null })));

    setTimeout(() => {
      setStreams((prev) =>
        prev.map((s) => ({
          ...s,
          isLoading: false,
          lastSynced: Math.floor(Date.now() / 1000),
        }))
      );
      setIsRefreshingAll(false);
    }, 700);
  };

  // Change stream sort
  const handleChangeSort = (streamId: string, sort: SortOption) => {
    setStreams((prev) =>
      prev.map((s) => {
        if (s.id !== streamId) return s;
        // Simulate sorting posts
        const sortedPosts = [...s.posts];
        if (sort === 'top') {
          sortedPosts.sort((a, b) => b.score - a.score);
        } else if (sort === 'new') {
          sortedPosts.sort((a, b) => b.createdUtc - a.createdUtc);
        } else if (sort === 'rising') {
          sortedPosts.sort((a, b) => b.numComments - a.numComments);
        } else {
          // Hot
          sortedPosts.sort((a, b) => b.score * 0.7 + b.numComments * 0.3 - (a.score * 0.7 + a.numComments * 0.3));
        }
        return {
          ...s,
          sort,
          posts: sortedPosts,
        };
      })
    );
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
          return { ...s, error: 'Network timeout', posts: [] };
        }
        // normal restore
        const sourcePosts =
          s.name === 'programming'
            ? MOCK_POSTS_PROGRAMMING
            : s.name === 'javascript'
            ? MOCK_POSTS_JAVASCRIPT
            : s.name === 'webdev'
            ? MOCK_POSTS_WEBDEV
            : MOCK_POSTS_ML;
        return { ...s, error: null, posts: sourcePosts };
      })
    );
  };

  // Add new stream
  const handleAddStream = (name: string) => {
    const now = Math.floor(Date.now() / 1000);
    const newStream: SubredditStream = {
      id: `stream-${name}-${Date.now()}`,
      name,
      displayName: `r/${name}`,
      tagline: `Community discussions, links and news from r/${name}`,
      subscribers: 850000,
      activeUsers: 950,
      sort: defaultSort,
      postLimit: 25,
      isCollapsed: false,
      lastSynced: now,
      posts: [
        {
          id: `${name}-1`,
          subreddit: name,
          title: `Welcome to the r/${name} information stream in Reddit Orbit`,
          author: 'orbit_curator',
          score: 1420,
          upvoteRatio: 0.98,
          numComments: 112,
          createdUtc: now - 3600,
          permalink: `https://reddit.com/r/${name}`,
          url: `https://reddit.com/r/${name}`,
          selftext: `This stream is now connected to your dashboard workspace. Orbit will monitor r/${name} in real-time.`,
          isSelf: true,
          domain: `self.${name}`,
          flair: 'Announce',
          isPinned: true,
        },
        {
          id: `${name}-2`,
          subreddit: name,
          title: `Architectural trends and best engineering practices for r/${name} in 2026`,
          author: 'senior_eng',
          score: 890,
          upvoteRatio: 0.95,
          numComments: 84,
          createdUtc: now - 7200,
          permalink: `https://reddit.com/r/${name}`,
          url: `https://reddit.com/r/${name}`,
          selftext: 'Comparing runtime overhead, memory profiles, and ecosystem maturity across the latest releases.',
          isSelf: true,
          domain: `self.${name}`,
          flair: 'Guide',
        },
      ],
    };

    setStreams((prev) => [...prev, newStream]);
    setActiveMobileStreamId(newStream.id);
  };

  // Jump to stream from search
  const handleJumpToStream = (streamId: string) => {
    setActiveMobileStreamId(streamId);
    const elem = document.getElementById(`lane-${streamId}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-[#e2e8f0] command-grid-bg selection:bg-cyan-500/25 selection:text-cyan-200">
      {/* 1. Header */}
      <Header
        currentDashboardId={currentDashboardId}
        onSelectDashboard={handleSelectDashboard}
        onOpenAddStream={() => setIsAddStreamOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        density={density}
        onToggleDensity={() => setDensity(density === 'compact' ? 'editorial' : 'compact')}
        onOpenSettings={() => setIsSettingsOpen(true)}
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
            className={`px-2.5 py-1 text-xs font-mono rounded-xs whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeMobileStreamId === stream.id
                ? 'bg-cyan-600 text-white font-bold shadow-sm'
                : 'bg-[#0f1422] text-slate-400 hover:text-white border border-[#1b2338]'
            }`}
          >
            <span>#{idx + 1}</span>
            <span>{stream.displayName}</span>
            <span className="text-[10px] opacity-75 tabular-nums">({stream.posts.length})</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsAddStreamOpen(true)}
          className="px-2 py-1 text-xs font-mono text-cyan-400 hover:text-white bg-[#0e1422] border border-cyan-800/50 rounded-xs flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>ADD</span>
        </button>
      </div>

      {/* 4. Main Streams Workspace */}
      <main className="flex-1 flex flex-col min-h-0">
        {streams.length === 0 ? (
          /* Empty Dashboard State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[500px]">
            <div className="w-16 h-16 rounded-md bg-[#0e1320] border border-[#1e273a] flex items-center justify-center text-cyan-400 mb-4 shadow-2xl">
              <Radio className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-bold mb-1">
              ORBIT CONSOLE // DISCONNECTED
            </div>
            <h2 className="text-lg font-mono font-bold uppercase tracking-tight text-white mb-2">
              NO ACTIVE INFORMATION STREAMS
            </h2>
            <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
              Your personal information space has no active frequency channels locked. Connect subreddit orbits to begin transmission monitoring.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsAddStreamOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition-colors shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>CONNECT STREAM</span>
              </button>
              <button
                type="button"
                onClick={() => setStreams(INITIAL_STREAMS)}
                className="px-4 py-2 text-xs font-mono font-medium text-slate-300 hover:text-white bg-[#0f1422] hover:bg-[#161e30] border border-[#20293d] rounded transition-colors cursor-pointer"
              >
                LOAD DEFAULT FREQUENCIES
              </button>
            </div>
          </div>
        ) : (
          /* Populated Streams Workspace */
          <div
            ref={streamsContainerRef}
            className="flex-1 overflow-x-auto orbit-scroll p-3 sm:p-5 md:p-6"
          >
            {/* Desktop Horizontal View & Mobile Single-Column Responsive Switch */}
            <div className="flex items-start gap-4 h-full">
              {streams.map((stream, index) => {
                const isMobileVisible = activeMobileStreamId === stream.id;
                return (
                  <div
                    key={stream.id}
                    id={`lane-${stream.id}`}
                    className={`h-full ${
                      isMobileVisible ? 'block w-full' : 'hidden lg:block'
                    }`}
                  >
                    <StreamLane
                      stream={stream}
                      density={density}
                      streamIndex={index}
                      canMoveLeft={index > 0}
                      canMoveRight={index < streams.length - 1}
                      onMoveLeft={() => handleMoveStream(index, 'left')}
                      onMoveRight={() => handleMoveStream(index, 'right')}
                      onRemove={() => handleRemoveStream(stream.id)}
                      onDuplicate={() => handleDuplicateStream(stream)}
                      onRefresh={() => handleRefreshStream(stream.id)}
                      onChangeSort={(sort) => handleChangeSort(stream.id, sort)}
                      onToggleCollapse={() => handleToggleCollapse(stream.id)}
                      onSelectPost={(post) => setSelectedPost(post)}
                      onSimulateState={(type) => handleSimulateState(stream.id, type)}
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
    </div>
  );
}
