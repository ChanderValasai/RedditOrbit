export type SortOption = 'hot' | 'new' | 'top' | 'rising';

export type TimeRange = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

export type StreamDensity = 'compact' | 'editorial';

export interface RedditPost {
  id: string;
  subreddit: string;
  title: string;
  author: string;
  score: number;
  upvoteRatio: number;
  numComments: number;
  createdUtc: number; // timestamp in seconds
  permalink: string;
  url: string;
  selftext?: string;
  isSelf: boolean;
  thumbnail?: string;
  domain: string;
  flair?: string;
  isNsfw?: boolean;
  isPinned?: boolean;
}

export interface SubredditStream {
  id: string;
  name: string; // e.g. "programming"
  displayName: string; // "r/programming"
  tagline: string;
  subscribers: number;
  activeUsers: number;
  avatarUrl?: string;
  sort: SortOption;
  timeRange?: TimeRange;
  postLimit: number;
  isCollapsed?: boolean;
  isLoading?: boolean;
  error?: string | null;
  posts: RedditPost[];
  lastSynced: number;
}

export interface DashboardPreset {
  id: string;
  name: string;
  description: string;
  streamNames: string[];
}
