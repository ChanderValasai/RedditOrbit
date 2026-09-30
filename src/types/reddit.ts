/**
 * Normalized Reddit Domain Types
 * Completely decouples UI components from Reddit's raw internal schema.
 */

export type RedditSortOption = 'hot' | 'new' | 'top' | 'rising';
export type RedditTimeRange = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

export interface PostQueryParams {
  sort?: RedditSortOption;
  timeRange?: RedditTimeRange;
  limit?: number;
  after?: string;
  before?: string;
}

export interface PaginationInfo {
  after: string | null;
  before: string | null;
  count: number;
  limit: number;
  hasMore: boolean;
}

export interface NormalizedPost {
  id: string;
  subreddit: string;
  title: string;
  author: string;
  score: number;
  upvoteRatio: number;
  numComments: number;
  createdUtc: number; // Unix timestamp in seconds
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

export interface NormalizedSubreddit {
  name: string;
  displayName: string;
  title: string;
  tagline: string;
  description: string;
  subscribers: number;
  activeUsers: number;
  iconImg?: string;
  bannerImg?: string;
  isNsfw: boolean;
  createdUtc: number;
}

export type RedditErrorCode =
  | 'NOT_FOUND'
  | 'PRIVATE_COMMUNITY'
  | 'BANNED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'INVALID_DATA'
  | 'SERVER_ERROR';

export interface RedditApiError {
  code: RedditErrorCode;
  message: string;
  status?: number;
  technicalDetails?: string;
}
