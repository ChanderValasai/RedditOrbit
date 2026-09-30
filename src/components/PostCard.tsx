import React, { useState } from 'react';
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  ExternalLink,
  Pin,
  AlertTriangle,
  Globe,
  Share2,
  Check,
} from 'lucide-react';
import { RedditPost, StreamDensity } from '../types/orbit';
import { formatNumber, formatTimeAgo } from '../utils/formatters';

interface PostCardProps {
  post: RedditPost;
  density: StreamDensity;
  onSelectPost: (post: RedditPost) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, density, onSelectPost }) => {
  const [voteDelta, setVoteDelta] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVoteDelta((prev) => (prev === 1 ? 0 : 1));
  };

  const handleDownvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVoteDelta((prev) => (prev === -1 ? 0 : -1));
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(post.permalink || post.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const currentScore = post.score + voteDelta;
  const isCompact = density === 'compact';

  return (
    <article
      onClick={() => onSelectPost(post)}
      className="group relative flex items-start gap-2.5 sm:gap-3 p-3 transition-colors duration-150 border-b border-[#151c2a] hover:bg-[#101522] cursor-pointer border-l-2 border-l-transparent hover:border-l-cyan-400"
    >
      {/* Precision Vote Rail */}
      <div
        className="flex flex-col items-center shrink-0 w-8 sm:w-9 pt-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleUpvote}
          aria-label="Upvote"
          className={`p-1 rounded transition-colors cursor-pointer ${
            voteDelta === 1
              ? 'text-cyan-400 bg-cyan-950/70'
              : 'text-slate-400 hover:text-cyan-300 hover:bg-[#172033]'
          }`}
        >
          <ArrowBigUp className="w-4 h-4 fill-current" />
        </button>

        <span
          className={`text-[11px] font-mono font-medium tabular-nums tracking-tight my-0.5 ${
            voteDelta === 1
              ? 'text-cyan-400 font-bold'
              : voteDelta === -1
              ? 'text-rose-400 font-bold'
              : 'text-slate-400'
          }`}
        >
          {formatNumber(currentScore)}
        </span>

        <button
          type="button"
          onClick={handleDownvote}
          aria-label="Downvote"
          className={`p-1 rounded transition-colors cursor-pointer ${
            voteDelta === -1
              ? 'text-rose-400 bg-rose-950/70'
              : 'text-slate-400 hover:text-rose-300 hover:bg-[#172033]'
          }`}
        >
          <ArrowBigDown className="w-4 h-4 fill-current" />
        </button>
      </div>

      {/* Post Content Body */}
      <div className="flex-1 min-w-0">
        {/* Meta Header */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mb-1 leading-none font-mono">
          {post.isPinned && (
            <>
              <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                <Pin className="w-3 h-3" />
                <span>PINNED</span>
              </span>
              <span className="text-slate-700" aria-hidden="true">/</span>
            </>
          )}

          {post.isNsfw && (
            <>
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <AlertTriangle className="w-3 h-3" />
                <span>NSFW</span>
              </span>
              <span className="text-slate-700" aria-hidden="true">/</span>
            </>
          )}

          <span className="text-slate-400 hover:text-slate-200 transition-colors font-sans">
            u/{post.author}
          </span>

          <span className="text-slate-700" aria-hidden="true">·</span>

          <time className="tabular-nums text-slate-400">{formatTimeAgo(post.createdUtc)}</time>

          {post.flair && (
            <>
              <span className="text-slate-700" aria-hidden="true">·</span>
              <span className="text-cyan-300/80 font-mono text-[10px] uppercase tracking-wide">
                [{post.flair}]
              </span>
            </>
          )}
        </div>

        {/* Title with superior contrast & typography */}
        <h2 className="text-[13.5px] sm:text-[14px] font-semibold text-[#f1f5f9] group-hover:text-cyan-100 leading-[1.4] line-clamp-3 mb-1.5 transition-colors tracking-[-0.01em]">
          {post.title}
        </h2>

        {/* Text snippet if available and in editorial mode */}
        {!isCompact && post.selftext && (
          <p className="text-[12px] text-slate-400 line-clamp-2 mb-2 font-normal leading-relaxed">
            {post.selftext}
          </p>
        )}

        {/* Footer info: comments, domain, external link */}
        <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400 pt-0.5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="flex items-center gap-1.5 hover:text-slate-300 transition-colors">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono tabular-nums text-slate-400 font-semibold">
                {formatNumber(post.numComments)}
              </span>
              <span className="text-slate-400 hidden sm:inline">comments</span>
            </span>

            {post.domain && !post.isSelf && (
              <>
                <span className="text-slate-700" aria-hidden="true">·</span>
                <span className="flex items-center gap-1 font-mono text-[10.5px] text-slate-400 truncate max-w-[140px] hover:text-slate-300">
                  <Globe className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate">{post.domain}</span>
                </span>
              </>
            )}
          </div>

          {/* Quick utility actions */}
          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 hover:text-cyan-300 text-slate-400 hover:bg-[#182133] rounded transition-colors cursor-pointer"
              title="Copy share link"
              aria-label="Copy post link"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
            </button>

            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 hover:text-cyan-300 text-slate-400 hover:bg-[#182133] rounded transition-colors"
              title="Open external source"
              aria-label="Open source link"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};
