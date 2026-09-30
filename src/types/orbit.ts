import {
  NormalizedPost,
  RedditSortOption,
  RedditTimeRange,
  PaginationInfo,
} from './reddit';

export type SortOption = RedditSortOption;
export type TimeRange = RedditTimeRange;
export type StreamDensity = 'compact' | 'editorial';

export type RedditPost = NormalizedPost;

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
  afterCursor?: string | null;
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

export interface UserDashboard {
  id: string;
  name: string;
  description?: string;
  streams: SubredditStream[];
  isDefault?: boolean;
  createdAt?: string;
  userId?: string;
}
