import { Request, Response, NextFunction } from 'express';
import { redditBackendService } from '../services/redditService';
import { SortOption, TimeRange } from '../types';

export class SubredditController {
  /**
   * GET /api/subreddits/:name
   * Returns subreddit community information and validation details
   */
  static async getSubreddit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = req.params;
      const subreddit = await redditBackendService.getSubreddit(name);
      res.json({
        success: true,
        data: subreddit,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/subreddits/:name/posts
   * Returns paginated posts with optional sort and time range filtering
   * Query options:
   *  - sort: 'hot' | 'new' | 'top' | 'rising'
   *  - timeRange: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'
   *  - limit: number (1-100)
   *  - after: string
   */
  static async getSubredditPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = req.params;
      const sort = (req.query.sort as SortOption) || 'hot';
      const timeRange = req.query.timeRange as TimeRange | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
      const after = req.query.after as string | undefined;

      const result = await redditBackendService.getSubredditPosts(name, {
        sort,
        timeRange,
        limit,
        after,
      });

      res.json({
        success: true,
        data: {
          subreddit: name,
          sort,
          timeRange: sort === 'top' ? timeRange || 'day' : undefined,
          posts: result.posts,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
