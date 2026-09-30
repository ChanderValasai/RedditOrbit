import React, { useState } from 'react';
import {
  X,
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  ExternalLink,
  Share2,
  Check,
  Pin,
  AlertTriangle,
  Globe,
  Radio,
} from 'lucide-react';
import { RedditPost } from '../types/orbit';
import { formatNumber, formatTimeAgo } from '../utils/formatters';

interface PostDetailModalProps {
  post: RedditPost | null;
  onClose: () => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({ post, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [voteDelta, setVoteDelta] = useState<number>(0);

  if (!post) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(post.permalink || post.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentScore = post.score + voteDelta;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-[#0c101a] border border-[#1f283d] rounded-md shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <header className="px-5 py-3 border-b border-[#1b2336] bg-[#0f1422] flex items-center justify-between select-none">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <span className="font-bold">r/{post.subreddit}</span>
            <span className="text-slate-600" aria-hidden="true">/</span>
            <span className="text-slate-300 font-semibold tracking-wider text-[11px]">TRANSMISSION DETAIL</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#161d2e] rounded transition-colors cursor-pointer"
              title="Copy share link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#161d2e] rounded transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Modal Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto orbit-scroll p-6 space-y-5 bg-[#090d16]">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
            {post.isPinned && (
              <>
                <span className="flex items-center gap-1 text-cyan-400 font-bold">
                  <Pin className="w-3.5 h-3.5" />
                  <span>PINNED</span>
                </span>
                <span className="text-slate-700" aria-hidden="true">/</span>
              </>
            )}

            {post.isNsfw && (
              <>
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>NSFW</span>
                </span>
                <span className="text-slate-700" aria-hidden="true">/</span>
              </>
            )}

            <span className="text-slate-200 font-sans font-medium">u/{post.author}</span>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-400">{formatTimeAgo(post.createdUtc)}</span>

            {post.flair && (
              <>
                <span className="text-slate-700" aria-hidden="true">·</span>
                <span className="font-mono text-[10.5px] text-cyan-300 font-bold uppercase tracking-wider">
                  [{post.flair}]
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h1
            id="post-detail-title"
            className="text-lg sm:text-xl font-bold text-white leading-snug tracking-tight"
          >
            {post.title}
          </h1>

          {/* Main Content Body */}
          {post.selftext ? (
            <div className="text-sm text-slate-300 leading-relaxed bg-[#0c101a] border border-[#1b2336] p-4 rounded whitespace-pre-wrap font-sans">
              {post.selftext}
            </div>
          ) : (
            <div className="p-4 bg-[#0c101a] border border-[#1b2336] rounded flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">External Destination:</span>
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 underline font-mono truncate max-w-sm"
              >
                <span>{post.domain}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          )}

          {/* Discussion Preview / Comments section */}
          <div className="pt-4 border-t border-[#182030]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span>COMMUNITY REACTION ({formatNumber(post.numComments)})</span>
              </h3>
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono"
              >
                <span>Open in Reddit</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Simulated editorial comments */}
            <div className="space-y-3">
              <div className="p-3 bg-[#0c101a] border border-[#1a2336] rounded text-xs">
                <div className="flex items-center gap-2 text-slate-400 mb-1 font-mono text-[11px]">
                  <span className="text-slate-200 font-medium font-sans">u/core_reviewer</span>
                  <span>·</span>
                  <span className="tabular-nums">2h ago</span>
                  <span>·</span>
                  <span className="text-cyan-400 font-bold">+142</span>
                </div>
                <p className="text-slate-300 leading-relaxed font-sans">
                  The benchmarks match our internal staging environment. When hash joins don't spill to disk, memory pressure drops dramatically. Glad to see this documented clearly.
                </p>
              </div>

              <div className="p-3 bg-[#0c101a] border border-[#1a2336] rounded text-xs ml-4 border-l-2 border-l-cyan-400">
                <div className="flex items-center gap-2 text-slate-400 mb-1 font-mono text-[11px]">
                  <span className="text-slate-200 font-medium font-sans">u/system_architect</span>
                  <span>·</span>
                  <span className="tabular-nums">1h ago</span>
                  <span>·</span>
                  <span className="text-cyan-400 font-bold">+38</span>
                </div>
                <p className="text-slate-300 leading-relaxed font-sans">
                  Seconding this. We migrated last week and query latency percentiles (p99) improved by 28%.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <footer className="px-5 py-3 border-t border-[#1b2336] bg-[#0c101a] flex items-center justify-between">
          {/* Vote control */}
          <div className="flex items-center gap-1.5 bg-[#0f1422] border border-[#1d263a] rounded px-2 py-1">
            <button
              type="button"
              onClick={() => setVoteDelta((prev) => (prev === 1 ? 0 : 1))}
              className={`p-1 rounded transition-colors cursor-pointer ${
                voteDelta === 1 ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
              aria-label="Upvote"
            >
              <ArrowBigUp className="w-4 h-4 fill-current" />
            </button>

            <span className="text-xs font-mono font-bold tabular-nums text-slate-200 px-1">
              {formatNumber(currentScore)}
            </span>

            <button
              type="button"
              onClick={() => setVoteDelta((prev) => (prev === -1 ? 0 : -1))}
              className={`p-1 rounded transition-colors cursor-pointer ${
                voteDelta === -1 ? 'text-rose-400' : 'text-slate-400 hover:text-white'
              }`}
              aria-label="Downvote"
            >
              <ArrowBigDown className="w-4 h-4 fill-current" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition-colors"
            >
              <span>SOURCE LINK</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};
