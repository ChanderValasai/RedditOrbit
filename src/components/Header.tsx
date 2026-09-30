import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  Activity,
  Terminal,
  LogOut,
  User,
  Shield,
  LogIn,
  RefreshCw,
  Layers,
  Layout,
} from 'lucide-react';
import { OrbitLogo } from './OrbitLogo';
import { PRESET_DASHBOARDS } from '../data/mockStreams';
import { StreamDensity, UserDashboard } from '../types/orbit';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentDashboardId: string;
  dashboards?: UserDashboard[];
  onSelectDashboard: (presetId: string) => void;
  onOpenDashboardManager?: () => void;
  onOpenAddStream: () => void;
  onOpenSearch: () => void;
  density: StreamDensity;
  onToggleDensity: () => void;
  onOpenSettings: () => void;
  onTriggerSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDashboardId,
  dashboards = [],
  onSelectDashboard,
  onOpenDashboardManager,
  onOpenAddStream,
  onOpenSearch,
  density,
  onToggleDensity,
  onOpenSettings,
  onTriggerSync,
}) => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const availableDashboards: Array<{ id: string; name: string; description?: string; streamCount?: number }> =
    dashboards.length > 0
      ? dashboards.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description || `${(d.streams || []).length} streams`,
          streamCount: (d.streams || []).length,
        }))
      : PRESET_DASHBOARDS.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          streamCount: p.streamNames.length,
        }));

  const activeDashboard =
    availableDashboards.find((d) => d.id === currentDashboardId) ||
    availableDashboards[0] || { id: 'default', name: 'Workspace', streamCount: 0 };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsPresetsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute user initials
  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'ORB';

  return (
    <header className="sticky top-0 z-40 w-full h-13 bg-[#080b12]/95 backdrop-blur-md border-b border-[#181f2f] px-3.5 sm:px-6 flex items-center justify-between">
      {/* Zone 1: Brand & Logo with technical system breadcrumb */}
      <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded-sm"
        >
          <OrbitLogo size="md" />
        </a>

        {/* Technical Divider */}
        <div className="hidden sm:block h-4 w-px bg-[#1e273a]" />

        {/* Dashboard Workspace Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsPresetsOpen(!isPresetsOpen)}
            className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono text-slate-300 bg-[#0f1422] hover:bg-[#141b2e] border border-[#20293d] hover:border-cyan-500/40 rounded transition-colors group cursor-pointer"
            aria-expanded={isPresetsOpen}
            aria-haspopup="true"
          >
            <span className="text-cyan-400 text-[10px] font-bold">WORKSPACE:</span>
            <span className="truncate max-w-[130px] sm:max-w-[170px] text-slate-200 font-medium font-sans">
              {activeDashboard.name}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform ${isPresetsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isPresetsOpen && (
            <div className="absolute left-0 mt-1.5 w-80 bg-[#0e1320] border border-[#242e44] rounded shadow-2xl py-1 z-50 divide-y divide-[#171f30]">
              <div className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-widest text-slate-400 flex items-center justify-between">
                <span>ORBIT WORKSPACES</span>
                <span className="text-cyan-400 font-mono text-[9px]">
                  {availableDashboards.length} DECKS
                </span>
              </div>

              <div className="py-1 max-h-64 overflow-y-auto orbit-scroll">
                {availableDashboards.map((dash) => (
                  <button
                    key={dash.id}
                    onClick={() => {
                      onSelectDashboard(dash.id);
                      setIsPresetsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex flex-col group cursor-pointer ${
                      dash.id === currentDashboardId
                        ? 'bg-cyan-500/10 text-cyan-300 font-semibold border-l-2 border-l-cyan-400'
                        : 'text-slate-300 hover:bg-[#141b2c] hover:text-white border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate max-w-[190px]">{dash.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-500">
                          {dash.streamCount} {dash.streamCount === 1 ? 'stream' : 'streams'}
                        </span>
                        {dash.id === currentDashboardId && (
                          <span className="text-[9px] font-mono text-cyan-400 px-1 bg-cyan-950/80 rounded border border-cyan-500/30">
                            ACTIVE
                          </span>
                        )}
                      </div>
                    </div>
                    {dash.description && (
                      <span className="text-[11px] text-slate-400 truncate mt-0.5">
                        {dash.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Manage / Create New Workspace Button */}
              {onOpenDashboardManager && (
                <div className="p-1.5 bg-[#090d16]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPresetsOpen(false);
                      onOpenDashboardManager();
                    }}
                    className="w-full py-1.5 px-3 text-left text-xs font-mono text-cyan-300 hover:text-white hover:bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400 rounded transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>MANAGE WORKSPACES</span>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-mono">+ NEW</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Zone 2: Command Search trigger */}
      <div className="flex-1 max-w-sm lg:max-w-md mx-3 sm:mx-6 hidden md:block">
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-[#0c101a] hover:bg-[#111726] border border-[#1b2336] hover:border-cyan-500/40 rounded text-xs text-slate-400 transition-colors group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            <span className="text-slate-400 group-hover:text-slate-200 transition-colors font-mono text-[11.5px]">
              Query posts, channels, flairs...
            </span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-cyan-300/80 bg-[#141b2a] border border-[#222d44] rounded">
              ⌘K
            </kbd>
          </div>
        </button>
      </div>

      {/* Zone 3: Actions, Auth & Controls */}
      <div className="flex items-center gap-2">
        {/* Telemetry Operational Status beacon (Desktop) */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 text-[11px] font-mono text-slate-400 bg-[#0e1320] border border-[#1d263a] rounded">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span className="text-slate-400">SYS:</span>
          <span className="text-emerald-400 font-semibold">ONLINE</span>
        </div>

        {/* Mobile Search trigger */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-[#131929] border border-transparent rounded transition-colors"
          title="Search"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Stream Density Toggle */}
        <button
          type="button"
          onClick={onToggleDensity}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-[#131929] border border-[#1e273c] rounded transition-colors font-mono"
          title={`Switch density (currently ${density})`}
        >
          <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
          <span className="capitalize">{density}</span>
        </button>

        {/* Add Stream Button */}
        <button
          type="button"
          onClick={onOpenAddStream}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 rounded transition-colors shadow-sm cursor-pointer whitespace-nowrap font-mono tracking-tight"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ STREAM</span>
        </button>

        {/* Authentication State / User Menu */}
        {isAuthenticated && user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 text-slate-300 hover:text-white hover:bg-[#131929] border border-[#1e273c] hover:border-cyan-500/40 rounded transition-colors cursor-pointer"
              title={`Pilot: ${user.displayName}`}
              aria-label="User profile menu"
            >
              <div className="w-6 h-6 rounded bg-gradient-to-tr from-cyan-900 to-indigo-900 border border-cyan-500/40 flex items-center justify-center text-[10px] font-mono font-bold text-cyan-200">
                {initials}
              </div>
              <span className="hidden lg:inline text-xs font-mono font-medium max-w-[100px] truncate text-slate-200">
                {user.displayName.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden lg:inline" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-[#0c101c] border border-[#222d44] rounded shadow-2xl py-1 z-50 divide-y divide-[#182236]">
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-slate-200 truncate">{user.displayName}</p>
                  <p className="text-[11px] font-mono text-cyan-400 truncate mt-0.5">{user.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-[9px] font-mono rounded">
                      <Shield className="w-2.5 h-2.5" />
                      {user.role.toUpperCase()}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">ATLAS SYNCED</span>
                  </div>
                </div>

                <div className="py-1">
                  {onOpenDashboardManager && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenDashboardManager();
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-[#141d2e] flex items-center gap-2 transition-colors cursor-pointer font-mono"
                    >
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Workspace Manager</span>
                    </button>
                  )}
                  {onTriggerSync && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onTriggerSync();
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-cyan-300 hover:text-white hover:bg-[#141d2e] flex items-center gap-2 transition-colors cursor-pointer font-mono"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Sync Orbit With Cloud</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-[#141d2e] flex items-center gap-2 transition-colors"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    <span>Display Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsUserMenuOpen(false);
                      await logout();
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-cyan-300 hover:text-white bg-[#0e1424] hover:bg-[#141e34] border border-cyan-500/30 hover:border-cyan-400/60 rounded transition-colors cursor-pointer"
              title="Sign in to save personal dashboards"
            >
              <LogIn className="w-3 h-3 text-cyan-400" />
              <span>SIGN IN</span>
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1 text-slate-400 hover:text-white hover:bg-[#131929] border border-[#1e273c] rounded transition-colors"
              title="Telemetry & Layout Settings"
              aria-label="Settings"
            >
              <div className="w-6 h-6 rounded bg-[#131b2c] border border-[#25324d] flex items-center justify-center text-[10px] font-mono font-bold text-cyan-400">
                ORB
              </div>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
