import {
  NormalizedPost,
  NormalizedSubreddit,
  PaginationInfo,
  PostQueryParams,
  RedditApiError,
  RedditErrorCode,
} from '../types/reddit';

/**
 * Service interface for fetching Reddit data via our Express API.
 * The application depends ONLY on this interface.
 * UI components are completely isolated from backend and Reddit implementation details.
 */
export interface IRedditService {
  getSubredditPosts(
    subreddit: string,
    params?: PostQueryParams
  ): Promise<{ posts: NormalizedPost[]; pagination: PaginationInfo }>;

  validateSubreddit(
    subreddit: string
  ): Promise<{ exists: boolean; info?: NormalizedSubreddit; error?: string }>;

  getSubredditAbout(subreddit: string): Promise<NormalizedSubreddit>;
}

function mapErrorCode(code: string): RedditErrorCode {
  switch (code) {
    case 'NOT_FOUND':
      return 'NOT_FOUND';
    case 'PRIVATE_COMMUNITY':
      return 'PRIVATE_COMMUNITY';
    case 'RATE_LIMITED':
      return 'RATE_LIMITED';
    case 'BAD_REQUEST':
      return 'INVALID_DATA';
    case 'UPSTREAM_ERROR':
    case 'INTERNAL_ERROR':
    default:
      return 'SERVER_ERROR';
  }
}

class OrbitBackendApiService implements IRedditService {
  private apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '') + '/api';

  /**
   * Safe fetch utility that parses Express API responses and unifies error reporting
   */
  private async fetchApi<T>(path: string): Promise<T> {
    const url = `${this.apiBase}${path}`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      let payload: any;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.success) {
        const errorInfo = payload?.error || {};
        const code: RedditErrorCode = mapErrorCode(errorInfo.code || '');
        const message: string =
          errorInfo.message || `Request failed with status ${response.status}`;

        const apiError: RedditApiError = {
          code,
          message,
          status: response.status,
          technicalDetails: errorInfo.details ? JSON.stringify(errorInfo.details) : undefined,
        };
        throw apiError;
      }

      return payload.data as T;
    } catch (err: any) {
      if (err.code && err.message) {
        throw err;
      }
      const networkError: RedditApiError = {
        code: 'NETWORK_ERROR',
        message: err.message || 'Unable to establish connection to Reddit Orbit backend service.',
      };
      throw networkError;
    }
  }

  /**
   * Fetches posts for a subreddit through our Express API
   * GET /api/subreddits/:name/posts
   */
  async getSubredditPosts(
    subreddit: string,
    params: PostQueryParams = {}
  ): Promise<{ posts: NormalizedPost[]; pagination: PaginationInfo }> {
    const cleanSub = subreddit.trim().replace(/^r\//i, '').toLowerCase();
    if (!cleanSub) {
      const err: RedditApiError = {
        code: 'INVALID_DATA',
        message: 'Invalid or empty subreddit identifier provided.',
      };
      throw err;
    }

    const query = new URLSearchParams();
    if (params.sort) query.set('sort', params.sort);
    if (params.timeRange && params.sort === 'top') query.set('timeRange', params.timeRange);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.after) query.set('after', params.after);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const data = await this.fetchApi<{
      subreddit: string;
      sort: string;
      timeRange?: string;
      posts: NormalizedPost[];
      pagination: PaginationInfo;
    }>(`/subreddits/${encodeURIComponent(cleanSub)}/posts${queryString}`);

    return {
      posts: data.posts,
      pagination: data.pagination,
    };
  }

  /**
   * Validates subreddit existence and returns community info
   * GET /api/subreddits/:name
   */
  async validateSubreddit(
    subreddit: string
  ): Promise<{ exists: boolean; info?: NormalizedSubreddit; error?: string }> {
    const cleanSub = subreddit.trim().replace(/^r\//i, '').toLowerCase();
    if (!cleanSub) {
      return { exists: false, error: 'Subreddit name cannot be empty.' };
    }

    try {
      const info = await this.getSubredditAbout(cleanSub);
      return { exists: true, info };
    } catch (err: any) {
      const errorMsg =
        err.code === 'NOT_FOUND'
          ? `Community r/${cleanSub} does not exist.`
          : err.code === 'PRIVATE_COMMUNITY'
          ? `r/${cleanSub} is private or restricted.`
          : err.message || 'Validation request failed.';
      return { exists: false, error: errorMsg };
    }
  }

  /**
   * Fetches community metadata (/api/subreddits/:name)
   */
  async getSubredditAbout(subreddit: string): Promise<NormalizedSubreddit> {
    const cleanSub = subreddit.trim().replace(/^r\//i, '').toLowerCase();
    return this.fetchApi<NormalizedSubreddit>(`/subreddits/${encodeURIComponent(cleanSub)}`);
  }
}

// Export singleton instance conforming to IRedditService
export const redditService: IRedditService = new OrbitBackendApiService();
