import { Request, Response, NextFunction } from 'express';
import { AppError, SortOption, TimeRange } from '../types';

const ALLOWED_SORTS: SortOption[] = ['hot', 'new', 'top', 'rising'];
const ALLOWED_TIME_RANGES: TimeRange[] = ['hour', 'day', 'week', 'month', 'year', 'all'];

export function validateSubredditParams(req: Request, res: Response, next: NextFunction) {
  const { name } = req.params;

  if (!name || typeof name !== 'string') {
    return next(new AppError(400, 'BAD_REQUEST', 'Subreddit name parameter is required.'));
  }

  const cleanName = name.replace(/^r\//i, '').trim();

  // Reddit community name rules: 2 to 24 chars, alphanumeric + underscores
  const validPattern = /^[a-zA-Z0-9_]{2,30}$/;
  if (!validPattern.test(cleanName)) {
    return next(
      new AppError(
        400,
        'BAD_REQUEST',
        'Invalid subreddit name. Subreddit names must be 2-30 alphanumeric characters.'
      )
    );
  }

  req.params.name = cleanName;
  next();
}

export function validatePostsQuery(req: Request, res: Response, next: NextFunction) {
  const { sort, timeRange, limit } = req.query;

  if (sort && !ALLOWED_SORTS.includes(sort as SortOption)) {
    return next(
      new AppError(
        400,
        'BAD_REQUEST',
        `Invalid sort option '${sort}'. Allowed values: ${ALLOWED_SORTS.join(', ')}`
      )
    );
  }

  if (timeRange && !ALLOWED_TIME_RANGES.includes(timeRange as TimeRange)) {
    return next(
      new AppError(
        400,
        'BAD_REQUEST',
        `Invalid timeRange '${timeRange}'. Allowed values: ${ALLOWED_TIME_RANGES.join(', ')}`
      )
    );
  }

  if (limit) {
    const parsedLimit = parseInt(limit as string, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return next(
        new AppError(400, 'BAD_REQUEST', 'Limit must be a positive integer between 1 and 100.')
      );
    }
  }

  next();
}
