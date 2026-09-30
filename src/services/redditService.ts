import {
  NormalizedPost,
  NormalizedSubreddit,
  PaginationInfo,
  PostQueryParams,
  RedditApiError,
} from '../types/reddit';
import {
  parseRedditPostsResponse,
  parseSubredditAboutResponse,
  createParseError,
} from './redditParser';

/**
 * Service interface for fetching Reddit data.
 * The application depends ONLY on this interface.
 * When migrating from Client->Reddit to Client->Express API->Reddit,
 * only this service implementation changes; UI components remain untouched.
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

class RedditApiService implements IRedditService {
  private baseUrl = 'https://www.reddit.com';

  /**
   * Helper that attempts direct fetch, and falls back to a public CORS gateway if
   * the client browser encounters cross-origin restrictions from Reddit's servers.
   */
  private async fetchWithFallback(targetUrl: string): Promise<any> {
    const headers = {
      Accept: 'application/json',
    };

    // 1. Primary Attempt: Direct public Reddit JSON endpoint
    try {
      const response = await fetch(targetUrl, { headers });

      if (response.status === 404) {
        throw createParseError('NOT_FOUND', 'Subreddit not found on Reddit network.', 404);
      }
      if (response.status === 403) {
        throw createParseError(
          'PRIVATE_COMMUNITY',
          'Subreddit is private, quarantined, or inaccessible.',
          403
        );
      }
      if (response.status === 429) {
        throw createParseError(
          'RATE_LIMITED',
          'Reddit API rate limit hit. Please wait a few seconds.',
          429
        );
      }
      if (!response.ok) {
        throw createParseError(
          'SERVER_ERROR',
          `Reddit server responded with status ${response.status}`,
          response.status
        );
      }

      const json = await response.json();
      return json;
    } catch (err: any) {
      // If it's already a recognized RedditApiError with a specific status, rethrow
      if (err && err.code && err.code !== 'NETWORK_ERROR') {
        throw err;
      }

      // 2. Secondary Attempt: Fallback CORS Gateway if browser blocked direct cross-origin JSON
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const proxyResponse = await fetch(proxyUrl);
        if (proxyResponse.ok) {
          const proxyJson = await proxyResponse.json();
          return proxyJson;
        }
      } catch {
        // Fallback failed as well, throw original or structured error
      }

      throw createParseError(
        'NETWORK_ERROR',
        err.message || 'Unable to establish carrier connection with Reddit.'
      );
    }
  }

  /**
   * Fetches posts for a subreddit with sorting, time range, and pagination.
   */
  async getSubredditPosts(
    subreddit: string,
    params: PostQueryParams = {}
  ): Promise<{ posts: NormalizedPost[]; pagination: PaginationInfo }> {
    const cleanSub = subreddit.trim().replace(/^r\//i, '').toLowerCase();
    if (!cleanSub) {
      throw createParseError('NOT_FOUND', 'Invalid subreddit identifier provided.');
    }

    const sort = params.sort || 'hot';
    const limit = params.limit || 25;

    let url = `${this.baseUrl}/r/${cleanSub}/${sort}.json?limit=${limit}`;

    if (sort === 'top' && params.timeRange) {
      url += `&t=${params.timeRange}`;
    }

    if (params.after) {
      url += `&after=${encodeURIComponent(params.after)}`;
    }

    const rawData = await this.fetchWithFallback(url);
    return parseRedditPostsResponse(rawData);
  }

  /**
   * Validates subreddit existence and retrieves community metadata.
   */
  async validateSubreddit(
    subreddit: string
  ): Promise<{ exists: boolean; info?: NormalizedSubreddit; error?: string }> {
    const cleanSub = subreddit.trim().replace(/^r\//i, '').toLowerCase();
    if (!cleanSub) {
      return { exists: false, error: 'Subreddit name cannot be empty.' };
    }

    try {
      // First attempt to read about.json for full metadata
      const aboutUrl = `${this.baseUrl}/r/${cleanSub}/about.json`;
      const rawAbout = await this.fetchWithFallback(aboutUrl);
      const info = parseSubredditAboutResponse(rawAbout);
      return { exists: true, info };
    } catch (err: any) {
      // If about.json is protected, check if posts feed returns listings
      try {
        const postsUrl = `${this.baseUrl}/r/${cleanSub}/hot.json?limit=1`;
        const rawPosts = await this.fetchWithFallback(postsUrl);
        const { posts } = parseRedditPostsResponse(rawPosts);

        return {
          exists: true,
          info: {
            name: cleanSub,
            displayName: `r/${cleanSub}`,
            title: `r/${cleanSub}`,
            tagline: `Community feed for r/${cleanSub}`,
            description: '',
            subscribers: 0,
            activeUsers: 0,
            isNsfw: false,
            createdUtc: Math.floor(Date.now() / 1000),
          },
        };
      } catch (fallbackErr: any) {
        const message =
          fallbackErr.code === 'NOT_FOUND'
            ? 'Subreddit not found on Reddit.'
            : fallbackErr.code === 'PRIVATE_COMMUNITY'
            ? 'This community is private or restricted.'
            : fallbackErr.message || 'Validation request failed.';

        return { exists: false, error: message };
      }
    }
  }

  /**
   * Fetches community metadata (/about.json)
   */
  async getSubredditAbout(subreddit: string): Promise<NormalizedSubreddit> {
    const cleanSub = subreddit.trim().replace(/^r\//i, '').toLowerCase();
    const url = `${this.baseUrl}/r/${cleanSub}/about.json`;
    const rawData = await this.fetchWithFallback(url);
    return parseSubredditAboutResponse(rawData);
  }
}

// Export singleton instance conforming to IRedditService
export const redditService: IRedditService = new RedditApiService();
