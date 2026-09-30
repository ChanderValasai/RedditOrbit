import React, { useState } from 'react';
import {
  X,
  Sliders,
  Moon,
  Sun,
  Laptop,
  Check,
  Zap,
  Shield,
  Database,
  Radio,
} from 'lucide-react';
import { SortOption, StreamDensity } from '../types/orbit';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  density: StreamDensity;
  onChangeDensity: (density: StreamDensity) => void;
  defaultSort: SortOption;
  onChangeDefaultSort: (sort: SortOption) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  density,
  onChangeDensity,
  defaultSort,
  onChangeDefaultSort,
}) => {
  const [postLimit, setPostLimit] = useState<number>(25);
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(true);
  const [savedNotification, setSavedNotification] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSavedNotification(true);
    setTimeout(() => {
      setSavedNotification(false);
      onClose();
    }, 600);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0e121a] border border-[#222a3d] rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1b2234] bg-[#111624] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs uppercase font-mono tracking-widest font-semibold text-slate-300">
              Orbit Dashboard Settings
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Appearance & Density */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
              Information Density
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChangeDensity('compact')}
                className={`p-3 rounded border text-left transition-colors flex flex-col justify-between ${
                  density === 'compact'
                    ? 'bg-cyan-950/30 border-cyan-500/70 text-white'
                    : 'bg-[#111624] border-[#1d2538] text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">Compact Density</span>
                  {density === 'compact' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <span className="text-[11px] text-slate-400">
                  Maximum posts per vertical inch, titles & key metrics only.
                </span>
              </button>

              <button
                type="button"
                onClick={() => onChangeDensity('editorial')}
                className={`p-3 rounded border text-left transition-colors flex flex-col justify-between ${
                  density === 'editorial'
                    ? 'bg-cyan-950/30 border-cyan-500/70 text-white'
                    : 'bg-[#111624] border-[#1d2538] text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">Editorial Density</span>
                  {density === 'editorial' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <span className="text-[11px] text-slate-400">
                  Generous typography, post excerpts, and rich preview cards.
                </span>
              </button>
            </div>
          </div>

          {/* Default Sorting */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
              Default Stream Sort
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['hot', 'new', 'top', 'rising'] as SortOption[]).map((sort) => (
                <button
                  key={sort}
                  type="button"
                  onClick={() => onChangeDefaultSort(sort)}
                  className={`py-2 px-3 text-xs uppercase font-mono rounded border transition-colors ${
                    defaultSort === sort
                      ? 'bg-cyan-600 text-white border-cyan-500 font-semibold'
                      : 'bg-[#111624] border-[#1d2538] text-slate-400 hover:text-white'
                  }`}
                >
                  {sort}
                </button>
              ))}
            </div>
          </div>

          {/* Post Buffer Limit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Post Buffer Limit
              </label>
              <span className="text-xs font-mono text-cyan-400 tabular-nums">
                {postLimit} posts per stream
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={postLimit}
              onChange={(e) => setPostLimit(Number(e.target.value))}
              className="w-full accent-cyan-500 bg-[#161c2c] h-1.5 rounded cursor-pointer"
            />
          </div>

          {/* Architecture Status Info */}
          <div className="p-3 bg-[#111520] border border-[#1c2334] rounded space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Database className="w-3.5 h-3.5" />
              <span>Storage Mode: Local Browser Workspace</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Anonymous storage mode active. Your configured orbits and stream order persist automatically in local storage.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1b2234] bg-[#0c0f17] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition-colors"
          >
            {savedNotification ? 'Preferences Saved!' : 'Apply Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};
