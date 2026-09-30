export type SortOption = 'hot' | 'new' | 'top' | 'rising';
export type TimeRange = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

export interface PostQueryParams {
  sort?: SortOption;
  timeRange?: TimeRange;
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
  createdUtc: number;
  permalink: string;
  url: string;
  selftext?: string;
  isSelf: boolean;
  thumbnail?: string;
  domain: string;
  flair?: string;
  isNsfw: boolean;
  isPinned: boolean;
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

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'PRIVATE_COMMUNITY'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public statusCode: number;
  public code: ErrorCode;
  public details?: any;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
