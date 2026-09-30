import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Radio,
  Layers,
  ArrowRight,
  Terminal,
  Activity,
  Cpu,
} from 'lucide-react';
import { SUGGESTED_SUBREDDITS } from '../data/mockStreams';
import { SubredditStream } from '../types/orbit';

interface AddStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStream: (name: string) => void;
  existingStreamNames: string[];
}

type ValidationState = 'idle' | 'checking' | 'found' | 'error' | 'success';

export const AddStreamModal: React.FC<AddStreamModalProps> = ({
  isOpen,
  onClose,
  onAddStream,
  existingStreamNames,
}) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ValidationState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setStatus('idle');
      setStatusMessage('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cleanName = query.trim().replace(/^r\//i, '').toLowerCase();

  const handleValidateAndAdd = (targetName?: string) => {
    const nameToAdd = (targetName || cleanName).trim().toLowerCase();
    if (!nameToAdd) return;

    if (existingStreamNames.includes(nameToAdd)) {
      setStatus('error');
      setStatusMessage(`STREAM CONFLICT: r/${nameToAdd} is already locked in active orbit.`);
      return;
    }

    const knownSubreddits = [
      'programming',
      'javascript',
      'webdev',
      'machinelearning',
      'rust',
      'datascience',
      'reactjs',
      'linux',
      'sysadmin',
      'devops',
      'python',
      'typescript',
      'golang',
      'compsci',
      'technology',
    ];

    setStatus('checking');
    setStatusMessage('SCANNING ORBIT SPECTRUM // VERIFYING COMMUNITY ENDPOINT...');

    setTimeout(() => {
      if (!knownSubreddits.includes(nameToAdd) && nameToAdd.length < 3) {
        setStatus('error');
        setStatusMessage('SPECTRUM NOT FOUND: Verify spelling or specify another active community.');
        return;
      }

      setStatus('found');
      setStatusMessage(`COMMUNITY DETECTED: r/${nameToAdd} · BUFFERING FEED PACKETS...`);

      setTimeout(() => {
        setStatus('success');
        setStatusMessage(`ORBIT LOCKED: Added r/${nameToAdd} to your information space!`);
        setTimeout(() => {
          onAddStream(nameToAdd);
          onClose();
        }, 550);
      }, 650);
    }, 550);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && status !== 'checking' && status !== 'found') {
      handleValidateAndAdd();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-stream-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-lg bg-[#0c101a] border border-[#232c42] rounded-md shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#1b2336] flex items-center justify-between bg-[#0f1422]">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <h2 id="add-stream-title" className="text-xs uppercase font-mono tracking-widest font-bold text-slate-200">
              CONNECT INFORMATION STREAM
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="subreddit-input" className="block text-xs font-mono uppercase tracking-wider text-slate-400">
                Community Frequency / Subreddit
              </label>
              <span className="text-[10px] font-mono text-cyan-400">PREFIX: r/</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-cyan-400 font-bold select-none">
                r/
              </span>
              <input
                id="subreddit-input"
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (status === 'error') setStatus('idle');
                }}
                placeholder="rust, typescript, datascience..."
                disabled={status === 'checking' || status === 'found'}
                className="w-full pl-9 pr-4 py-2 bg-[#080b12] border border-[#20293d] focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded text-sm text-white font-mono placeholder:text-slate-600 transition-colors"
              />
            </div>
          </div>

          {/* Validation Status Feedback */}
          {status !== 'idle' && (
            <div
              className={`p-3 rounded border text-xs font-mono flex items-center gap-2.5 transition-all ${
                status === 'checking'
                  ? 'bg-cyan-950/40 border-cyan-700/60 text-cyan-300'
                  : status === 'found'
                  ? 'bg-sky-950/40 border-sky-700/60 text-sky-300'
                  : status === 'success'
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-700/60 text-rose-300'
              }`}
            >
              {status === 'checking' && (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
              )}
              {status === 'found' && (
                <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse shrink-0" />
              )}
              {status === 'success' && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              {status === 'error' && (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span className="leading-snug">{statusMessage}</span>
            </div>
          )}

          {/* Suggestions */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2 flex items-center justify-between">
              <span>PRE-INDEXED TECH CHANNELS</span>
              <span className="text-slate-600 font-mono">CLICK TO CONNECT</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED_SUBREDDITS.map((sub) => {
                const isAdded = existingStreamNames.includes(sub.name.toLowerCase());
                return (
                  <button
                    key={sub.name}
                    type="button"
                    disabled={isAdded || status === 'checking'}
                    onClick={() => {
                      setQuery(sub.name);
                      handleValidateAndAdd(sub.name);
                    }}
                    className={`p-2.5 text-left border rounded transition-colors flex flex-col justify-between ${
                      isAdded
                        ? 'opacity-40 bg-[#080b12] border-[#182030] cursor-not-allowed'
                        : 'bg-[#0f1422] hover:bg-[#141b2e] border-[#1d263a] hover:border-cyan-500/50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-white">
                        r/{sub.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {sub.subscribers}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 line-clamp-1 mt-1 font-sans">
                      {sub.tagline}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#1b2336] bg-[#090d16] flex items-center justify-between font-mono text-xs">
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            DISMISS
          </button>

          <button
            type="button"
            onClick={() => handleValidateAndAdd()}
            disabled={!cleanName || status === 'checking' || status === 'found'}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold text-white bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 disabled:pointer-events-none rounded transition-colors shadow-sm cursor-pointer"
          >
            <span>{status === 'checking' ? 'HANDSHAKE...' : 'LOCK STREAM'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
