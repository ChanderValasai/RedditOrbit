import React, { useState } from 'react';
import { SyncAnalysisResult, SyncDecision } from '../services/dashboardSyncService';
import { RefreshCw, HardDrive, Cloud, GitMerge, Check, AlertCircle, ArrowRight } from 'lucide-react';

interface SyncOrbitModalProps {
  isOpen: boolean;
  analysis: SyncAnalysisResult | null;
  onResolve: (decision: SyncDecision) => Promise<void>;
}

export const SyncOrbitModal: React.FC<SyncOrbitModalProps> = ({
  isOpen,
  analysis,
  onResolve,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<SyncDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !analysis) return null;

  const handleChoose = async (decision: SyncDecision) => {
    setSelectedDecision(decision);
    setIsSubmitting(true);
    setError(null);
    try {
      await onResolve(decision);
    } catch (err: any) {
      setError(err.message || 'Failed to sync dashboard to cloud database.');
      setIsSubmitting(false);
      setSelectedDecision(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 font-sans"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-[#090d18] border border-cyan-500/40 rounded-lg shadow-2xl shadow-cyan-950/50 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 bg-[#060912] border-b border-[#182338] flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
            <RefreshCw className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-mono tracking-wider text-slate-100">
                SYNC YOUR ORBIT
              </h2>
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded">
                CONFLICT DETECTED
              </span>
            </div>
            <p className="text-[11.5px] text-slate-400 font-mono mt-0.5">
              Choose how to harmonize your guest session with your cloud workspace.
            </p>
          </div>
        </div>

        {/* Conflict Comparison Cards */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Local Column */}
            <div className="p-4 rounded bg-[#0d1322] border border-[#1b273e] hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  Local Workspace
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300 px-1.5 py-0.5 bg-cyan-950/60 rounded border border-cyan-500/20">
                  {analysis.localSummary.count} {analysis.localSummary.count === 1 ? 'stream' : 'streams'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-300 space-y-1">
                <div className="flex flex-wrap gap-1 mt-2">
                  {analysis.localSummary.subreddits.slice(0, 6).map((sub) => (
                    <span
                      key={sub}
                      className="px-1.5 py-0.5 text-[10px] bg-[#141d30] border border-[#23314a] rounded text-slate-300"
                    >
                      r/{sub}
                    </span>
                  ))}
                  {analysis.localSummary.subreddits.length > 6 && (
                    <span className="px-1.5 py-0.5 text-[10px] text-slate-500 font-mono">
                      +{analysis.localSummary.subreddits.length - 6} more
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-mono">
                Active in this browser session
              </p>
            </div>

            {/* Cloud Column */}
            <div className="p-4 rounded bg-[#0d1322] border border-[#1b273e] hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                  Cloud Workspace
                </span>
                <span className="text-xs font-mono font-bold text-indigo-300 px-1.5 py-0.5 bg-indigo-950/60 rounded border border-indigo-500/20">
                  {analysis.cloudSummary.count} {analysis.cloudSummary.count === 1 ? 'stream' : 'streams'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-300 space-y-1">
                <div className="flex flex-wrap gap-1 mt-2">
                  {analysis.cloudSummary.subreddits.slice(0, 6).map((sub) => (
                    <span
                      key={sub}
                      className="px-1.5 py-0.5 text-[10px] bg-[#141d30] border border-[#23314a] rounded text-slate-300"
                    >
                      r/{sub}
                    </span>
                  ))}
                  {analysis.cloudSummary.subreddits.length === 0 && (
                    <span className="text-[11px] text-slate-500 italic">No cloud streams</span>
                  )}
                  {analysis.cloudSummary.subreddits.length > 6 && (
                    <span className="px-1.5 py-0.5 text-[10px] text-slate-500 font-mono">
                      +{analysis.cloudSummary.subreddits.length - 6} more
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-mono">
                Persisted in MongoDB Atlas
              </p>
            </div>
          </div>

          {/* Merge Decision Action Buttons */}
          <div className="pt-2 space-y-2.5">
            {/* 1. [Use Local] */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleChoose('use_local')}
              className="w-full py-2.5 px-4 rounded bg-[#101728] hover:bg-[#141e33] active:bg-[#0c1220] border border-[#22304c] hover:border-cyan-500/50 disabled:opacity-50 text-slate-200 font-mono text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-cyan-300">
                  {isSubmitting && selectedDecision === 'use_local' ? 'SAVING LOCAL...' : '[Use Local]'}
                </span>
                <span className="text-[11px] text-slate-400 font-normal font-sans hidden sm:inline">
                  — Keep local ({analysis.localSummary.count} {analysis.localSummary.count === 1 ? 'stream' : 'streams'}) and save to Cloud
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 transition-colors" />
            </button>

            {/* 2. [Use Cloud] */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleChoose('use_cloud')}
              className="w-full py-2.5 px-4 rounded bg-[#101728] hover:bg-[#141e33] active:bg-[#0c1220] border border-[#22304c] hover:border-indigo-500/50 disabled:opacity-50 text-slate-200 font-mono text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Cloud className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-indigo-300">
                  {isSubmitting && selectedDecision === 'use_cloud' ? 'LOADING CLOUD...' : '[Use Cloud]'}
                </span>
                <span className="text-[11px] text-slate-400 font-normal font-sans hidden sm:inline">
                  — Use cloud ({analysis.cloudSummary.count} {analysis.cloudSummary.count === 1 ? 'stream' : 'streams'}) and replace local
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-300 transition-colors" />
            </button>

            {/* 3. [Merge] */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleChoose('merge')}
              className="w-full py-3 px-4 rounded bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 active:from-cyan-700 active:to-indigo-700 disabled:opacity-50 text-white font-mono text-xs font-semibold flex items-center justify-between transition-all cursor-pointer shadow-lg shadow-cyan-950/50 group border border-cyan-400/40"
            >
              <div className="flex items-center gap-2.5">
                <GitMerge className="w-4 h-4 text-cyan-200" />
                <span className="text-left font-bold tracking-wide">
                  {isSubmitting && selectedDecision === 'merge' ? 'MERGING...' : '[Merge]'}
                </span>
                <span className="text-[11px] text-cyan-100 font-normal font-sans hidden sm:inline">
                  — Combine unique streams from both without duplicates
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-200 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Footer info note */}
        <div className="px-6 py-3 bg-[#060912] border-t border-[#182338] flex items-center justify-between">
          <span className="text-[10.5px] text-slate-400 font-mono">
            Safety Guarantee: Final configuration is persisted directly to MongoDB Atlas.
          </span>
        </div>
      </div>
    </div>
  );
};
