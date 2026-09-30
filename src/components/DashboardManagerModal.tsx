import React, { useState } from 'react';
import { UserDashboard, SubredditStream } from '../types/orbit';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  Layout,
  Radio,
  Layers,
  Sparkles,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface DashboardManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboards: UserDashboard[];
  activeDashboardId: string;
  onSelectDashboard: (dashboardId: string) => void;
  onCreateDashboard: (name: string, templateType: 'empty' | 'current' | 'preset') => Promise<void>;
  onRenameDashboard: (dashboardId: string, newName: string) => Promise<void>;
  onDeleteDashboard: (dashboardId: string) => Promise<void>;
  currentStreamCount: number;
}

export const DashboardManagerModal: React.FC<DashboardManagerModalProps> = ({
  isOpen,
  onClose,
  dashboards,
  activeDashboardId,
  onSelectDashboard,
  onCreateDashboard,
  onRenameDashboard,
  onDeleteDashboard,
  currentStreamCount,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckTemplate, setNewDeckTemplate] = useState<'empty' | 'current' | 'preset'>('current');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleStartRename = (dash: UserDashboard) => {
    setEditingId(dash.id);
    setRenameValue(dash.name);
    setError(null);
  };

  const handleSaveRename = async (dashId: string) => {
    if (!renameValue.trim()) {
      setError('Dashboard name cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onRenameDashboard(dashId, renameValue.trim());
      setEditingId(null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to rename dashboard.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) {
      setError('Please provide a name for the new dashboard.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onCreateDashboard(newDeckName.trim(), newDeckTemplate);
      setNewDeckName('');
      setIsCreating(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create dashboard.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (dashId: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onDeleteDashboard(dashId);
      setDeleteConfirmId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete dashboard.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 font-sans"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-[#090d18] border border-[#1e273e] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#060912] border-b border-[#182338] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-100 tracking-wider">
                ORBIT WORKSPACE MANAGER
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Create, customize, rename, and switch dashboard telemetry decks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#141d2e] rounded transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 orbit-scroll">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* New Dashboard Creator Form Toggle */}
          {!isCreating ? (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-950/60 to-indigo-950/60 hover:from-cyan-900/60 hover:to-indigo-900/60 border border-cyan-500/40 rounded flex items-center justify-between text-xs font-mono font-semibold text-cyan-200 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>+ CREATE NEW WORKSPACE</span>
              </div>
              <span className="text-[10px] text-cyan-400/80 uppercase">INITIALIZE DECK →</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="p-4 bg-[#0d1322] border border-cyan-500/40 rounded-lg space-y-3">
              <div className="flex items-center justify-between border-b border-[#1c273e] pb-2">
                <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  INITIALIZE NEW WORKSPACE
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-[11px] font-mono text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="e.g. AI & Robotics Radar"
                  className="w-full px-3 py-2 bg-[#060911] border border-[#1b2537] focus:border-cyan-400 focus:outline-none rounded text-xs text-slate-100 placeholder:text-slate-600 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1.5">
                  Starting Stream Template
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewDeckTemplate('current')}
                    className={`p-2 text-left rounded border text-[11px] font-mono transition-colors ${
                      newDeckTemplate === 'current'
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200'
                        : 'border-[#1f2b42] bg-[#090d18] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold">Copy Current</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{currentStreamCount} streams</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewDeckTemplate('preset')}
                    className={`p-2 text-left rounded border text-[11px] font-mono transition-colors ${
                      newDeckTemplate === 'preset'
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200'
                        : 'border-[#1f2b42] bg-[#090d18] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold">Standard Core</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">3 core feeds</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewDeckTemplate('empty')}
                    className={`p-2 text-left rounded border text-[11px] font-mono transition-colors ${
                      newDeckTemplate === 'empty'
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200'
                        : 'border-[#1f2b42] bg-[#090d18] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold">Empty Canvas</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">0 streams</div>
                  </button>
                </div>
              </div>

              <div className="pt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Workspace</span>
                </button>
              </div>
            </form>
          )}

          {/* Dashboards List */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 px-1">
              ACTIVE WORKSPACES ({dashboards.length})
            </div>

            {dashboards.map((dash) => {
              const isActive = dash.id === activeDashboardId;
              const isEditing = editingId === dash.id;
              const isConfirmingDelete = deleteConfirmId === dash.id;

              return (
                <div
                  key={dash.id}
                  className={`p-3.5 rounded border transition-all ${
                    isActive
                      ? 'bg-cyan-500/10 border-cyan-400/60 shadow-lg shadow-cyan-950/30'
                      : 'bg-[#0c111e] border-[#1a243a] hover:border-slate-600'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="flex-1 px-2.5 py-1 bg-[#060911] border border-cyan-400 focus:outline-none rounded text-xs text-white font-mono"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(dash.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(dash.id)}
                        disabled={isSubmitting}
                        className="p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded cursor-pointer"
                        title="Save rename"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-400 hover:text-white rounded"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Info & click to activate */}
                      <div
                        onClick={() => {
                          onSelectDashboard(dash.id);
                          onClose();
                        }}
                        className="flex-1 min-w-0 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold font-mono text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                            {dash.name}
                          </h3>
                          {isActive && (
                            <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded">
                              ACTIVE
                            </span>
                          )}
                          {dash.isDefault && (
                            <span className="px-1.5 py-0.2 text-[9px] font-mono text-slate-400 bg-[#141b2c] border border-[#212c44] rounded">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-1">
                          <span className="text-cyan-400/90 font-semibold">
                            {(dash.streams || []).length} {(dash.streams || []).length === 1 ? 'stream' : 'streams'}
                          </span>
                          <span>•</span>
                          <span className="truncate max-w-[240px]">
                            {(dash.streams || [])
                              .map((s) => `r/${s.name}`)
                              .slice(0, 4)
                              .join(', ') || 'Empty deck'}
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Switch button if not active */}
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectDashboard(dash.id);
                              onClose();
                            }}
                            className="px-2 py-1 text-[11px] font-mono text-cyan-400 hover:text-white bg-[#101728] hover:bg-cyan-600/30 border border-cyan-500/30 rounded transition-colors cursor-pointer"
                          >
                            Switch
                          </button>
                        )}

                        {/* Rename */}
                        <button
                          type="button"
                          onClick={() => handleStartRename(dash)}
                          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-[#141d30] rounded transition-colors cursor-pointer"
                          title="Rename dashboard"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete button (with confirmation) */}
                        {dashboards.length > 1 && (
                          <>
                            {isConfirmingDelete ? (
                              <div className="flex items-center gap-1 bg-red-950/60 p-0.5 rounded border border-red-500/40">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(dash.id)}
                                  disabled={isSubmitting}
                                  className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-red-600 hover:bg-red-500 text-white rounded cursor-pointer"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="p-0.5 text-slate-400 hover:text-white rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(dash.id)}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded transition-colors cursor-pointer"
                                title="Delete dashboard"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#060912] border-t border-[#182338] flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
          <span>Dashboards auto-save to MongoDB (or local storage in guest mode).</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-[#131b2c] hover:bg-[#19243b] text-slate-300 hover:text-white border border-[#212c44] rounded transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
