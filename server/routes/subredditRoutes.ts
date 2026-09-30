import { Router } from 'express';
import { SubredditController } from '../controllers/subredditController';
import {
  validateSubredditParams,
  validatePostsQuery,
} from '../middleware/validateRequest';

const router = Router();

/**
 * Subreddit feed routes:
 * GET /api/subreddits/:name/posts
 * Supports query: ?sort=hot|new|top|rising&timeRange=day|week|month|year|all&limit=25&after=t3_xxx
 */
router.get(
  '/:name/posts',
  validateSubredditParams,
  validatePostsQuery,
  SubredditController.getSubredditPosts
);

/**
 * Subreddit metadata route:
 * GET /api/subreddits/:name
 */
router.get(
  '/:name',
  validateSubredditParams,
  SubredditController.getSubreddit
);

export default router;
