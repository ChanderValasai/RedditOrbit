import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Radio, ArrowRight, MessageSquare, ArrowBigUp } from 'lucide-react';
import { SubredditStream, RedditPost } from '../types/orbit';
import { formatNumber } from '../utils/formatters';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  streams: SubredditStream[];
  onSelectPost: (post: RedditPost) => void;
  onJumpToStream: (streamId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  streams,
  onSelectPost,
  onJumpToStream,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();

  // Find matching streams
  const matchedStreams = streams.filter(
    (s) =>
      s.name.toLowerCase().includes(trimmed) ||
      s.displayName.toLowerCase().includes(trimmed) ||
      s.tagline.toLowerCase().includes(trimmed)
  );

  // Find matching posts
  const allPosts = streams.flatMap((s) => s.posts);
  const matchedPosts = trimmed
    ? allPosts.filter(
        (p) =>
          p.title.toLowerCase().includes(trimmed) ||
          p.author.toLowerCase().includes(trimmed) ||
          p.subreddit.toLowerCase().includes(trimmed) ||
          (p.flair && p.flair.toLowerCase().includes(trimmed))
      )
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0e121a] border border-[#222a3d] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-[#1b2336] bg-[#0c101a] flex items-center gap-3">
          <Search className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all active orbit streams and posts..."
            className="w-full bg-transparent border-none text-white text-sm focus:outline-none placeholder:text-slate-500 font-mono"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto orbit-scroll p-4 space-y-4">
          {/* Subreddit streams matching */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">
              ACTIVE ORBIT STREAMS ({matchedStreams.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {matchedStreams.map((stream) => (
                <button
                  key={stream.id}
                  type="button"
                  onClick={() => {
                    onJumpToStream(stream.id);
                    onClose();
                  }}
                  className="p-2.5 bg-[#0f1422] hover:bg-[#141b2e] border border-[#1c2538] hover:border-cyan-500/50 rounded-sm text-left transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-mono font-bold text-white group-hover:text-cyan-300">
                      {stream.displayName}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate font-mono">
                      {stream.posts.length} packets buffered
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Posts matching */}
          {trimmed && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">
                MATCHING TRANSMISSIONS ({matchedPosts.length})
              </div>
              {matchedPosts.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 font-mono">
                  No transmissions found matching "{query}"
                </div>
              ) : (
                <div className="space-y-1.5">
                  {matchedPosts.slice(0, 8).map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => {
                        onSelectPost(post);
                        onClose();
                      }}
                      className="w-full p-2.5 bg-[#0e1320] hover:bg-[#141a2a] border border-[#1a2336] hover:border-cyan-500/40 rounded-sm text-left transition-colors flex items-start gap-3 group cursor-pointer border-l-2 border-l-transparent hover:border-l-cyan-400"
                    >
                      <div className="flex flex-col items-center shrink-0 pt-0.5 text-cyan-400 font-mono text-[11px] tabular-nums font-bold">
                        <ArrowBigUp className="w-3.5 h-3.5 fill-current" />
                        <span>{formatNumber(post.score)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mb-0.5">
                          <span className="text-cyan-400 font-semibold">r/{post.subreddit}</span>
                          <span>·</span>
                          <span>u/{post.author}</span>
                        </div>
                        <div className="text-xs text-slate-200 group-hover:text-cyan-100 line-clamp-2 font-medium">
                          {post.title}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#1b2336] bg-[#090d16] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>PRESS ESC TO DISMISS</span>
          <span className="text-cyan-400">{streams.length} ORBITS MONITORED</span>
        </div>
      </div>
    </div>
  );
};
