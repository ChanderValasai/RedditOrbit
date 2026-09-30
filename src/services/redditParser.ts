import {
  NormalizedPost,
  NormalizedSubreddit,
  PaginationInfo,
  RedditApiError,
} from '../types/reddit';

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

/**
 * Parses raw Reddit JSON feed (/r/[name]/[sort].json) into normalized structures.
 * Completely shields React components from Reddit's nested data.children structure.
 */
export function parseRedditPostsResponse(rawData: any): {
  posts: NormalizedPost[];
  pagination: PaginationInfo;
} {
  if (!rawData || typeof rawData !== 'object') {
    throw createParseError('INVALID_DATA', 'Received empty or invalid JSON payload from Reddit.');
  }

  // Handle Reddit error objects e.g. { error: 404, message: "Not Found" }
  if (rawData.error) {
    if (rawData.error === 404) {
      throw createParseError('NOT_FOUND', 'Subreddit not found or does not exist.');
    }
    if (rawData.error === 403) {
      throw createParseError('PRIVATE_COMMUNITY', 'This subreddit is private or quarantined.');
    }
    if (rawData.error === 429) {
      throw createParseError('RATE_LIMITED', 'Reddit API rate limit exceeded. Please wait a moment.');
    }
    throw createParseError('SERVER_ERROR', rawData.message || 'Reddit API returned an error.');
  }

  const listingData = rawData.data;
  if (!listingData || !Array.isArray(listingData.children)) {
    throw createParseError('INVALID_DATA', 'Unexpected listing format in Reddit payload.');
  }

  const posts: NormalizedPost[] = listingData.children
    .filter((child: any) => child && child.kind === 't3' && child.data)
    .map((child: any) => {
      const d = child.data;
      const permalink = d.permalink ? `https://reddit.com${d.permalink}` : d.url || '';
      const domain = d.domain || (d.is_self ? `self.${d.subreddit}` : 'reddit.com');

      // Clean thumbnail
      let thumbnail: string | undefined = undefined;
      if (d.thumbnail && d.thumbnail.startsWith('http')) {
        thumbnail = d.thumbnail;
      }

      return {
        id: String(d.id || Math.random().toString(36).slice(2)),
        subreddit: String(d.subreddit || ''),
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
    after: listingData.after || null,
    before: listingData.before || null,
    count: posts.length,
    limit: posts.length,
    hasMore: Boolean(listingData.after),
  };

  return { posts, pagination };
}

/**
 * Parses raw Reddit Subreddit metadata (/r/[name]/about.json)
 */
export function parseSubredditAboutResponse(rawData: any): NormalizedSubreddit {
  if (!rawData || !rawData.data) {
    throw createParseError('NOT_FOUND', 'Could not locate subreddit metadata.');
  }

  const d = rawData.data;

  let iconImg: string | undefined = undefined;
  if (d.community_icon && d.community_icon.startsWith('http')) {
    iconImg = decodeHtml(d.community_icon);
  } else if (d.icon_img && d.icon_img.startsWith('http')) {
    iconImg = decodeHtml(d.icon_img);
  }

  return {
    name: d.display_name || '',
    displayName: d.display_name_prefixed || `r/${d.display_name || ''}`,
    title: decodeHtml(d.title || d.display_name || ''),
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

export function createParseError(
  code: RedditApiError['code'],
  message: string,
  status?: number,
  details?: string
): Error & RedditApiError {
  const err = new Error(message) as Error & RedditApiError;
  err.code = code;
  err.status = status;
  err.technicalDetails = details;
  return err;
}
