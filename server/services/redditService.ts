import { config } from '../config/env';
import { cacheService } from './cacheService';
import {
  AppError,
  NormalizedPost,
  NormalizedSubreddit,
  PaginationInfo,
  PostQueryParams,
} from '../types';

function decodeHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/');
}

export class RedditBackendService {
  /**
   * Safe fetch with timeout and headers
   */
  private async fetchRedditJson(endpoint: string): Promise<any> {
    const url = `${config.reddit.baseUrl}${endpoint}`;
    console.log(`[REDDIT REQUEST] GET ${endpoint}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.reddit.requestTimeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': config.reddit.userAgent,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (response.status === 404) {
        throw new AppError(404, 'NOT_FOUND', 'Subreddit does not exist or was removed.');
      }
      if (response.status === 403) {
        throw new AppError(403, 'PRIVATE_COMMUNITY', 'Subreddit is private or restricted by Reddit network policy.');
      }
      if (response.status === 429) {
        throw new AppError(429, 'RATE_LIMITED', 'Reddit upstream API rate limit exceeded.');
      }
      if (!response.ok) {
        throw new AppError(
          502,
          'UPSTREAM_ERROR',
          `Reddit returned upstream status ${response.status}`
        );
      }

      const json = await response.json();
      return json;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (err.name === 'AbortError') {
        throw new AppError(504, 'UPSTREAM_ERROR', 'Request to Reddit timed out.');
      }
      throw new AppError(502, 'UPSTREAM_ERROR', err.message || 'Failed to connect to Reddit.');
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Fallback fetch from public Reddit archive/mirror (arctic-shift.photon-reddit.com)
   * used when Reddit network blocks cloud datacenter IP addresses.
   */
  private async fetchFromMirror(subreddit: string, limit: number): Promise<any[]> {
    const mirrorUrl = `https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=${encodeURIComponent(subreddit)}&limit=${limit}`;
    console.log(`[REDDIT REQUEST] Fallback mirror query for r/${subreddit} (limit=${limit})`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch(mirrorUrl, {
        headers: {
          'User-Agent': 'reddit-orbit/1.0',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json?.data) ? json.data : [];
    } catch {
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Retrieve subreddit community metadata with cache-aside pattern
   */
  async getSubreddit(name: string): Promise<NormalizedSubreddit> {
    const cleanName = name.trim().replace(/^r\//i, '').toLowerCase();
    const cacheKey = cacheService.generateSubredditKey(cleanName);

    // 1. Cache lookup
    const cached = await cacheService.get<NormalizedSubreddit>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Upstream retrieval: Try direct Reddit /about.json
    let communityData: NormalizedSubreddit | null = null;
    try {
      const rawData = await this.fetchRedditJson(`/r/${cleanName}/about.json`);
      if (rawData && rawData.data) {
        const d = rawData.data;
        let iconImg: string | undefined = undefined;
        if (d.community_icon && d.community_icon.startsWith('http')) {
          iconImg = decodeHtml(d.community_icon);
        } else if (d.icon_img && d.icon_img.startsWith('http')) {
          iconImg = decodeHtml(d.icon_img);
        }

        communityData = {
          name: d.display_name || cleanName,
          displayName: d.display_name_prefixed || `r/${d.display_name || cleanName}`,
          title: decodeHtml(d.title || d.display_name || cleanName),
          tagline: decodeHtml(d.public_description || d.title || ''),
          description: decodeHtml(d.description || ''),
          subscribers: typeof d.subscribers === 'number' ? d.subscribers : 0,
          activeUsers: typeof d.active_user_count === 'number' ? d.active_user_count : 0,
          iconImg,
          bannerImg: d.banner_background_image ? decodeHtml(d.banner_background_image) : undefined,
          isNsfw: Boolean(d.over18),
          createdUtc: typeof d.created_utc === 'number' ? Math.floor(d.created_utc) : 0,
        };
      }
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') {
        throw err;
      }
      // If blocked by datacenter policy or 403, proceed to fallback lookup
    }

    // 3. Fallback: verify via mirror
    if (!communityData) {
      const mirrorPosts = await this.fetchFromMirror(cleanName, 5);
      if (mirrorPosts && mirrorPosts.length > 0) {
        const first = mirrorPosts[0];
        const subscribers = first.subreddit_subscribers || 0;
        communityData = {
          name: cleanName,
          displayName: `r/${cleanName}`,
          title: `r/${cleanName}`,
          tagline: `Community transmissions from r/${cleanName}`,
          description: `Orbital feed for r/${cleanName}`,
          subscribers: typeof subscribers === 'number' ? subscribers : 0,
          activeUsers: Math.round(subscribers * 0.005) || 120,
          isNsfw: Boolean(first.over_18),
          createdUtc: typeof first.created_utc === 'number' ? first.created_utc : Math.floor(Date.now() / 1000),
        };
      }
    }

    if (!communityData) {
      throw new AppError(404, 'NOT_FOUND', `Subreddit r/${cleanName} not found.`);
    }

    // 4. Save to cache
    await cacheService.set(cacheKey, communityData, config.cache.aboutTtlSeconds);
    return communityData;
  }

  /**
   * Retrieve posts for a subreddit with cache-aside pattern
   */
  async getSubredditPosts(
    name: string,
    params: PostQueryParams = {}
  ): Promise<{ posts: NormalizedPost[]; pagination: PaginationInfo }> {
    const cleanName = name.trim().replace(/^r\//i, '').toLowerCase();
    const sort = params.sort || 'hot';
    const limit = Math.min(params.limit || config.reddit.defaultLimit, config.reddit.maxLimit);

    // 1. Cache lookup
    const cacheKey = cacheService.generatePostsKey(cleanName, {
      sort,
      timeRange: params.timeRange,
      limit,
      after: params.after,
      before: params.before,
    });

    const cached = await cacheService.get<{ posts: NormalizedPost[]; pagination: PaginationInfo }>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Upstream retrieval: Try direct Reddit JSON endpoint
    let result: { posts: NormalizedPost[]; pagination: PaginationInfo } | null = null;
    let queryPath = `/r/${cleanName}/${sort}.json?limit=${limit}`;
    if (sort === 'top' && params.timeRange) {
      queryPath += `&t=${encodeURIComponent(params.timeRange)}`;
    }
    if (params.after) {
      queryPath += `&after=${encodeURIComponent(params.after)}`;
    }

    try {
      const rawData = await this.fetchRedditJson(queryPath);
      if (rawData && rawData.data && Array.isArray(rawData.data.children)) {
        const listing = rawData.data;
        const posts: NormalizedPost[] = listing.children
          .filter((child: any) => child && child.kind === 't3' && child.data)
          .map((child: any) => {
            const d = child.data;
            const permalink = d.permalink ? `https://reddit.com${d.permalink}` : d.url || '';
            const domain = d.domain || (d.is_self ? `self.${d.subreddit}` : 'reddit.com');

            let thumbnail: string | undefined = undefined;
            if (d.thumbnail && d.thumbnail.startsWith('http')) {
              thumbnail = d.thumbnail;
            }

            return {
              id: String(d.id || Math.random().toString(36).slice(2)),
              subreddit: String(d.subreddit || cleanName),
              title: decodeHtml(d.title || 'Untitled Post'),
              author: String(d.author || '[deleted]'),
              score: typeof d.score === 'number' ? d.score : 0,
              upvoteRatio: typeof d.upvote_ratio === 'number' ? d.upvote_ratio : 1,
              numComments: typeof d.num_comments === 'number' ? d.num_comments : 0,
              createdUtc: typeof d.created_utc === 'number' ? Math.floor(d.created_utc) : Math.floor(Date.now() / 1000),
              permalink,
              url: d.url || permalink,
              selftext: decodeHtml(d.selftext),
              isSelf: Boolean(d.is_self),
              thumbnail,
              domain,
              flair: decodeHtml(d.link_flair_text) || undefined,
              isNsfw: Boolean(d.over_18),
              isPinned: Boolean(d.stickied),
            };
          });

        const pagination: PaginationInfo = {
          after: listing.after || null,
          before: listing.before || null,
          count: posts.length,
          limit,
          hasMore: Boolean(listing.after),
        };

        result = { posts, pagination };
      }
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') {
        throw err;
      }
      // If blocked by datacenter network policy or 403, proceed to fallback mirror
    }

    // 3. Fallback to public Reddit mirror
    if (!result) {
      const mirrorItems = await this.fetchFromMirror(cleanName, Math.max(limit, 30));
      if (!mirrorItems || mirrorItems.length === 0) {
        throw new AppError(404, 'NOT_FOUND', `Subreddit r/${cleanName} does not exist or has no active transmissions.`);
      }

      let posts: NormalizedPost[] = mirrorItems.map((d: any) => {
        const permalink = d.permalink ? (d.permalink.startsWith('http') ? d.permalink : `https://reddit.com${d.permalink}`) : (d.url || '');
        const domain = d.domain || (d.is_self ? `self.${d.subreddit}` : 'reddit.com');

        let thumbnail: string | undefined = undefined;
        if (d.thumbnail && d.thumbnail.startsWith('http')) {
          thumbnail = d.thumbnail;
        }

        return {
          id: String(d.id || Math.random().toString(36).slice(2)),
          subreddit: String(d.subreddit || cleanName),
          title: decodeHtml(d.title || 'Untitled Post'),
          author: String(d.author || '[deleted]'),
          score: typeof d.score === 'number' ? d.score : 0,
          upvoteRatio: typeof d.upvote_ratio === 'number' ? d.upvote_ratio : 1,
          numComments: typeof d.num_comments === 'number' ? d.num_comments : 0,
          createdUtc: typeof d.created_utc === 'number' ? Math.floor(d.created_utc) : Math.floor(Date.now() / 1000),
          permalink,
          url: d.url || permalink,
          selftext: decodeHtml(d.selftext),
          isSelf: Boolean(d.is_self),
          thumbnail,
          domain,
          flair: decodeHtml(d.link_flair_text) || undefined,
          isNsfw: Boolean(d.over_18),
          isPinned: Boolean(d.stickied),
        };
      });

      // Apply client-side sorting semantics if retrieved from mirror
      if (sort === 'top') {
        posts.sort((a, b) => b.score - a.score);
      } else if (sort === 'new') {
        posts.sort((a, b) => b.createdUtc - a.createdUtc);
      } else if (sort === 'rising') {
        posts.sort((a, b) => (b.score + b.numComments * 2) - (a.score + a.numComments * 2));
      }

      posts = posts.slice(0, limit);

      const pagination: PaginationInfo = {
        after: posts.length > 0 ? posts[posts.length - 1].id : null,
        before: null,
        count: posts.length,
        limit,
        hasMore: mirrorItems.length > limit,
      };

      result = { posts, pagination };
    }

    // 4. Save to cache
    await cacheService.set(cacheKey, result, config.cache.postsTtlSeconds);
    return result;
  }
}

export const redditBackendService = new RedditBackendService();
